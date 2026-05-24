use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::oneshot;

use crate::AppState;

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentTask {
    pub id: String,
    pub role: String,
    pub goal: String,
    pub depends_on: Vec<String>,
    pub status: String, // "pending" | "running" | "done" | "error"
    pub result: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OrchestratorPlan {
    pub goal: String,
    pub tasks: Vec<AgentTask>,
}

#[derive(Serialize, Clone, Debug)]
pub struct OrchestratorStatus {
    pub running: bool,
    pub goal: String,
    pub tasks: Vec<AgentTask>,
}

// ── Managed state ─────────────────────────────────────────────────────────────

pub struct OrchestratorManaged {
    pub state: Arc<Mutex<OrchestratorState>>,
}

pub struct OrchestratorState {
    pub running: bool,
    pub plan: Option<OrchestratorPlan>,
    pub abort_tx: Option<oneshot::Sender<()>>,
}

impl OrchestratorManaged {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(OrchestratorState {
                running: false,
                plan: None,
                abort_tx: None,
            })),
        }
    }
}

// ── Commands ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_orchestrated_task(
    goal: String,
    app_handle: AppHandle,
    app_state: State<'_, Mutex<AppState>>,
    orch: State<'_, OrchestratorManaged>,
) -> Result<(), String> {
    {
        let mut s = orch.state.lock().unwrap_or_else(|e| e.into_inner());
        if s.running {
            return Err("Orchestrator is already running".to_string());
        }
        s.running = true;
        s.plan = None;
    }

    let provider = {
        let s = app_state.lock().unwrap_or_else(|e| e.into_inner());
        Arc::clone(&s.provider)
    };

    let (abort_tx, mut abort_rx) = oneshot::channel::<()>();
    {
        let mut s = orch.state.lock().unwrap_or_else(|e| e.into_inner());
        s.abort_tx = Some(abort_tx);
    }

    let state_arc = Arc::clone(&orch.state);
    let goal_clone = goal.clone();

    tauri::async_runtime::spawn(async move {
        let _ = _run_orchestration(goal_clone, provider, app_handle, state_arc, &mut abort_rx).await;
    });

    Ok(())
}

#[tauri::command]
pub fn get_orchestration_status(orch: State<'_, OrchestratorManaged>) -> OrchestratorStatus {
    let s = orch.state.lock().unwrap_or_else(|e| e.into_inner());
    OrchestratorStatus {
        running: s.running,
        goal: s.plan.as_ref().map(|p| p.goal.clone()).unwrap_or_default(),
        tasks: s.plan.as_ref().map(|p| p.tasks.clone()).unwrap_or_default(),
    }
}

#[tauri::command]
pub fn stop_orchestration(orch: State<'_, OrchestratorManaged>) -> Result<(), String> {
    let mut s = orch.state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tx) = s.abort_tx.take() {
        let _ = tx.send(());
    }
    s.running = false;
    Ok(())
}

// ── Orchestration engine ───────────────────────────────────────────────────────

async fn _run_orchestration(
    goal: String,
    provider: Arc<dyn crate::llm::LlmProvider>,
    app: AppHandle,
    state: Arc<Mutex<OrchestratorState>>,
    abort_rx: &mut oneshot::Receiver<()>,
) -> Result<(), String> {
    macro_rules! aborted {
        () => {
            if abort_rx.try_recv().is_ok() {
                _set_done(&state);
                return Ok(());
            }
        };
    }

    // ── 1. Generate plan ──────────────────────────────────────────────────────
    let plan_prompt = format!(
        "You are an AI orchestrator. Decompose this goal into 2-4 specialized agent tasks.\n\
         Output ONLY valid JSON — no markdown, no explanation:\n\
         {{\"tasks\":[{{\"id\":\"t1\",\"role\":\"ROLE\",\"goal\":\"SPECIFIC_GOAL\",\"depends_on\":[]}}]}}\n\
         Rules:\n\
         - Roles: Researcher, Developer, Analyst, Writer, Reviewer, Tester\n\
         - depends_on lists ids of tasks that must finish first\n\
         - 2-4 tasks maximum, each goal specific and achievable\n\
         Goal: {}",
        goal
    );

    aborted!();
    let plan_raw = provider.generate_oneshot(&plan_prompt, 512).await
        .map_err(|e| format!("Plan generation failed: {}", e))?;

    let plan_json = _extract_json(&plan_raw);
    let parsed: serde_json::Value = serde_json::from_str(&plan_json)
        .map_err(|e| format!("Plan JSON parse error: {} — raw: {}", e, &plan_json[..plan_json.len().min(200)]))?;

    let raw_tasks: Vec<AgentTask> = parsed["tasks"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|t| AgentTask {
            id:         t["id"].as_str().unwrap_or("t?").to_string(),
            role:       t["role"].as_str().unwrap_or("Agent").to_string(),
            goal:       t["goal"].as_str().unwrap_or("").to_string(),
            depends_on: t["depends_on"].as_array().unwrap_or(&vec![])
                            .iter().filter_map(|v| v.as_str().map(str::to_string)).collect(),
            status:     "pending".to_string(),
            result:     None,
            error:      None,
        })
        .collect();

    if raw_tasks.is_empty() {
        _set_done(&state);
        return Err("Orchestrator returned no tasks".to_string());
    }

    let plan = OrchestratorPlan { goal: goal.clone(), tasks: raw_tasks };
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.plan = Some(plan.clone());
    }
    let _ = app.emit("orchestrator_plan_ready", &plan);

    aborted!();

    // ── 2. Execute tasks in dependency order ──────────────────────────────────
    let mut results: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let task_ids: Vec<String> = plan.tasks.iter().map(|t| t.id.clone()).collect();

    // Simple topo sort: keep executing tasks whose deps are all done
    let mut remaining: Vec<AgentTask> = plan.tasks.clone();
    let mut iterations = 0;

    while !remaining.is_empty() && iterations < 20 {
        iterations += 1;
        aborted!();

        // Find ready tasks (all deps resolved)
        let ready: Vec<AgentTask> = remaining.iter()
            .filter(|t| t.depends_on.iter().all(|dep| results.contains_key(dep)))
            .cloned()
            .collect();

        if ready.is_empty() { break; } // Cycle guard

        // Mark ready tasks as running
        {
            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref mut p) = s.plan {
                for task in &ready {
                    if let Some(pt) = p.tasks.iter_mut().find(|t| t.id == task.id) {
                        pt.status = "running".to_string();
                    }
                }
            }
        }
        for task in &ready {
            let _ = app.emit("agent_task_started", serde_json::json!({
                "id": task.id, "role": task.role
            }));
        }

        // Execute all ready tasks in parallel
        let mut handles = Vec::new();
        for task in ready.clone() {
            let dep_context: String = task.depends_on.iter()
                .filter_map(|dep| results.get(dep).map(|r| format!("[{}]:\n{}", dep, r)))
                .collect::<Vec<_>>()
                .join("\n\n");

            let prov = Arc::clone(&provider);
            let tgoal = task.goal.clone();
            let trole = task.role.clone();

            let exec_prompt = if dep_context.is_empty() {
                format!(
                    "You are a {} agent. Complete this task:\n{}\n\n\
                     Be specific and thorough. Output your result directly.",
                    trole, tgoal
                )
            } else {
                format!(
                    "You are a {} agent. Complete this task:\n{}\n\n\
                     Context from previous agents:\n{}\n\n\
                     Use the context above. Output your result directly.",
                    trole, tgoal, dep_context
                )
            };

            handles.push(tokio::spawn(async move {
                (task.id.clone(), prov.generate_oneshot(&exec_prompt, 800).await)
            }));
        }

        for handle in handles {
            aborted!();
            if let Ok((id, outcome)) = handle.await {
                let task = ready.iter().find(|t| t.id == id).unwrap();
                match outcome {
                    Ok(result) => {
                        results.insert(id.clone(), result.clone());
                        {
                            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                            if let Some(ref mut p) = s.plan {
                                if let Some(pt) = p.tasks.iter_mut().find(|t| t.id == id) {
                                    pt.status = "done".to_string();
                                    pt.result = Some(result.clone());
                                }
                            }
                        }
                        let _ = app.emit("agent_task_done", serde_json::json!({
                            "id": id, "role": task.role,
                            "result": &result[..result.len().min(300)]
                        }));
                    }
                    Err(e) => {
                        {
                            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                            if let Some(ref mut p) = s.plan {
                                if let Some(pt) = p.tasks.iter_mut().find(|t| t.id == id) {
                                    pt.status = "error".to_string();
                                    pt.error = Some(e.clone());
                                }
                            }
                        }
                        let _ = app.emit("agent_task_done", serde_json::json!({
                            "id": id, "role": task.role, "error": e
                        }));
                        // Continue — other agents can still finish
                    }
                }
            }
        }

        remaining.retain(|t| !ready.iter().any(|r| r.id == t.id));
    }

    aborted!();

    // ── 3. Synthesis ─────────────────────────────────────────────────────────
    if results.is_empty() {
        _set_done(&state);
        let _ = app.emit("orchestration_complete", serde_json::json!({
            "goal": goal, "summary": "No results produced.",
            "task_count": task_ids.len()
        }));
        return Ok(());
    }

    let agent_outputs = task_ids.iter()
        .filter_map(|id| {
            let task = plan.tasks.iter().find(|t| &t.id == id)?;
            results.get(id).map(|r| format!("**{} ({})**:\n{}", task.role, id, r))
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    let synthesis_prompt = format!(
        "You are a coordinator. Synthesize the results from {} specialized agents.\n\
         Goal: {}\n\n{}\n\n\
         Provide a clear, unified summary that integrates all contributions. \
         Be direct — no agent attribution needed in the summary.",
        results.len(), goal, agent_outputs
    );

    let summary = provider.generate_oneshot(&synthesis_prompt, 600).await
        .unwrap_or_else(|_| agent_outputs.clone());

    _set_done(&state);
    let _ = app.emit("orchestration_complete", serde_json::json!({
        "goal": goal,
        "summary": summary,
        "task_count": task_ids.len()
    }));

    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn _set_done(state: &Arc<Mutex<OrchestratorState>>) {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.running = false;
    s.abort_tx = None;
}

/// Extract the first JSON object/array from a string (strips markdown fences)
fn _extract_json(raw: &str) -> String {
    let s = raw.trim();
    // Strip ```json ... ``` fences
    let inner = if let Some(start) = s.find("```") {
        let after = &s[start + 3..];
        let after = if after.starts_with("json") { &after[4..] } else { after };
        if let Some(end) = after.find("```") { &after[..end] } else { after }
    } else {
        s
    };
    // Find first { or [
    let trimmed = inner.trim();
    let start = trimmed.find(|c| c == '{' || c == '[').unwrap_or(0);
    trimmed[start..].to_string()
}
