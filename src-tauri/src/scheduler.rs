use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio_cron_scheduler::{Job, JobScheduler};

use crate::bridge::EventEmitter;
use crate::AppHandle;

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub cron: String,
    pub goal: String,
    pub enabled: bool,
    pub last_run: Option<String>,
    pub created_at: String,
}

/// Maps task_id → scheduler job UUID so we can remove jobs by task ID.
pub type JobMap = Arc<Mutex<HashMap<String, uuid::Uuid>>>;

// ── Managed state ─────────────────────────────────────────────────────────────

pub struct SchedulerManaged {
    pub tasks: Mutex<Vec<ScheduledTask>>,
    pub tasks_path: PathBuf,
    pub scheduler: tokio::sync::Mutex<Option<JobScheduler>>,
    pub job_map: JobMap,
}

impl SchedulerManaged {
    pub fn new() -> Self {
        let tasks_path = crate::user_config_dir().join("data/scheduler/tasks.json");
        let tasks = load_tasks(&tasks_path);
        Self {
            tasks: Mutex::new(tasks),
            tasks_path,
            scheduler: tokio::sync::Mutex::new(None),
            job_map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start<E: EventEmitter>(
        &self,
        emitter: E,
        app_state: Arc<Mutex<crate::AppState>>,
    ) -> Result<(), String> {
        let sched = JobScheduler::new().await.map_err(|e| e.to_string())?;
        let tasks = self.tasks.lock().unwrap_or_else(|e| e.into_inner()).clone();
        for task in tasks {
            if task.enabled {
                let _ = register_task(
                    &sched,
                    &task,
                    self.job_map.clone(),
                    emitter.clone(),
                    app_state.clone(),
                )
                .await;
            }
        }
        sched.start().await.map_err(|e| e.to_string())?;
        let mut guard = self.scheduler.lock().await;
        *guard = Some(sched);
        Ok(())
    }
}

// ── Persistence ───────────────────────────────────────────────────────────────

fn load_tasks(path: &PathBuf) -> Vec<ScheduledTask> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_tasks(path: &PathBuf, tasks: &[ScheduledTask]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let s = serde_json::to_string_pretty(tasks).map_err(|e| e.to_string())?;
    std::fs::write(path, s).map_err(|e| e.to_string())
}

// ── Scheduler helpers ─────────────────────────────────────────────────────────

/// Convert standard 5-field cron (minutes) to 6-field (seconds first) for
/// tokio-cron-scheduler which requires a leading seconds field.
fn to_six_field(cron: &str) -> String {
    let parts: Vec<&str> = cron.split_whitespace().collect();
    if parts.len() == 5 {
        format!("0 {}", cron.trim())
    } else {
        cron.trim().to_string()
    }
}

/// Add a cron job for `task` to the scheduler. Emits `scheduled_task_started`
/// on each fire. Returns the scheduler-assigned job UUID.
pub async fn register_task<E: EventEmitter>(
    scheduler: &JobScheduler,
    task: &ScheduledTask,
    job_map: JobMap,
    emitter: E,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<uuid::Uuid, String> {
    let cron_str = to_six_field(&task.cron);
    let task_id = task.id.clone();
    let task_name = task.name.clone();
    let task_goal = task.goal.clone();

    let job = Job::new_async(cron_str.as_str(), move |_uuid, _lock| {
        let app = emitter.clone();
        let state = app_state.clone();
        let id = task_id.clone();
        let name = task_name.clone();
        let goal = task_goal.clone();
        Box::pin(async move {
            app.emit(
                "scheduled_task_started",
                serde_json::json!({
                    "id": id,
                    "name": name,
                    "goal": goal,
                    "triggered_at": chrono::Utc::now().to_rfc3339(),
                }),
            );
            // Trigger workflow execution if goal starts with "workflow:"
            if let Some(workflow_name) = goal.strip_prefix("workflow:") {
                let wf_name = workflow_name.trim().to_string();
                if !wf_name.is_empty() {
                    let json_result = crate::workflow::workflow_run(wf_name.clone());
                    if let Ok(json_str) = json_result {
                        if let Ok(doc) = crate::workflow_engine::parse_workflow(&json_str) {
                            let broadcaster = app.clone();
                            let state2 = state.clone();
                            broadcaster.emit(
                                "workflow_started",
                                serde_json::json!({
                                    "name": &wf_name,
                                    "triggered_by": "scheduler",
                                    "task_id": &id,
                                }),
                            );
                            tokio::spawn(async move {
                                let run_state = crate::workflow_engine::execute_workflow(
                                    &wf_name,
                                    &doc,
                                    state2,
                                    broadcaster,
                                )
                                .await;
                                if let Err(e) =
                                    crate::workflow_engine::save_run_history(&wf_name, &run_state)
                                {
                                    tracing::warn!("Failed to save workflow run history: {}", e);
                                }
                            });
                        } else {
                            tracing::warn!(
                                "Scheduled task '{}' references invalid workflow '{}'",
                                name,
                                wf_name
                            );
                        }
                    } else {
                        tracing::warn!(
                            "Scheduled task '{}' references missing workflow '{}'",
                            name,
                            wf_name
                        );
                    }
                }
            }
        })
    })
    .map_err(|e| e.to_string())?;

    let job_id = scheduler.add(job).await.map_err(|e| e.to_string())?;
    job_map
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(task.id.clone(), job_id);
    Ok(job_id)
}

/// Remove a cron job from the scheduler by task ID.
pub async fn unregister_task(
    scheduler: &JobScheduler,
    task_id: &str,
    job_map: &JobMap,
) -> Result<(), String> {
    let uuid = {
        let map = job_map.lock().unwrap_or_else(|e| e.into_inner());
        map.get(task_id).copied()
    };
    if let Some(uuid) = uuid {
        scheduler.remove(&uuid).await.map_err(|e| e.to_string())?;
        job_map
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(task_id);
    }
    Ok(())
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

pub fn list_scheduled_tasks(state: Arc<SchedulerManaged>) -> Vec<ScheduledTask> {
    state
        .tasks
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

pub async fn add_scheduled_task(
    state: Arc<SchedulerManaged>,
    app_handle: AppHandle,
    name: String,
    cron: String,
    goal: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<ScheduledTask, String> {
    // Validate cron by attempting to create a dummy job
    let six_cron = to_six_field(&cron);
    if Job::new_async(six_cron.as_str(), |_uuid, _lock| Box::pin(async {})).is_err() {
        return Err("Invalid cron expression".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let task = ScheduledTask {
        id,
        name,
        cron,
        goal,
        enabled: true,
        last_run: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    {
        let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.push(task.clone());
        let _ = save_tasks(&state.tasks_path, &tasks);
    }

    let scheduler = state.scheduler.lock().await;
    if let Some(s) = scheduler.as_ref() {
        let _ = register_task(s, &task, state.job_map.clone(), app_handle, app_state).await;
    }

    Ok(task)
}

pub async fn delete_scheduled_task(state: Arc<SchedulerManaged>, id: String) -> Result<(), String> {
    {
        let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.retain(|t| t.id != id);
        let _ = save_tasks(&state.tasks_path, &tasks);
    }

    let scheduler = state.scheduler.lock().await;
    if let Some(s) = scheduler.as_ref() {
        let _ = unregister_task(s, &id, &state.job_map).await;
    }

    Ok(())
}

pub async fn toggle_scheduled_task(
    state: Arc<SchedulerManaged>,
    app_handle: AppHandle,
    id: String,
    enabled: bool,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    let task = {
        let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        let mut found = None;
        if let Some(t) = tasks.iter_mut().find(|t| t.id == id) {
            t.enabled = enabled;
            found = Some(t.clone());
        }
        if found.is_some() {
            let _ = save_tasks(&state.tasks_path, &tasks);
        }
        found
    };

    if let Some(task) = task {
        let scheduler = state.scheduler.lock().await;
        if let Some(s) = scheduler.as_ref() {
            if enabled {
                let _ = register_task(s, &task, state.job_map.clone(), app_handle, app_state).await;
            } else {
                let _ = unregister_task(s, &id, &state.job_map).await;
            }
        }
    }

    Ok(())
}

pub fn run_task_now(
    state: Arc<SchedulerManaged>,
    app_handle: AppHandle,
    id: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    let task = {
        let tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.iter().find(|t| t.id == id).cloned()
    };

    if let Some(task) = task {
        let goal = task.goal.clone();
        let _ = crate::bridge::EventEmitter::emit(
            &app_handle,
            "scheduled_task_started",
            serde_json::json!({
                "id": task.id,
                "name": task.name,
                "goal": &goal,
                "triggered_at": chrono::Utc::now().to_rfc3339(),
                "manual": true,
            }),
        );
        if let Some(workflow_name) = goal.strip_prefix("workflow:") {
            let wf_name = workflow_name.trim().to_string();
            if !wf_name.is_empty() {
                let json_result = crate::workflow::workflow_run(wf_name.clone());
                if let Ok(json_str) = json_result {
                    if let Ok(doc) = crate::workflow_engine::parse_workflow(&json_str) {
                        let broadcaster = app_handle.clone();
                        let state2 = app_state.clone();
                        let _ = broadcaster.emit(
                            "workflow_started",
                            serde_json::json!({
                                "name": &wf_name,
                                "triggered_by": "manual",
                            }),
                        );
                        tokio::spawn(async move {
                            let run_state = crate::workflow_engine::execute_workflow(
                                &wf_name,
                                &doc,
                                state2,
                                broadcaster,
                            )
                            .await;
                            if let Err(e) =
                                crate::workflow_engine::save_run_history(&wf_name, &run_state)
                            {
                                tracing::warn!("Failed to save workflow run history: {}", e);
                            }
                        });
                    }
                }
            }
        }
        Ok(())
    } else {
        Err("Task not found".to_string())
    }
}
