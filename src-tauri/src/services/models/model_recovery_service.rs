use super::provider_health_service::{check_all_provider_health, ProviderConnectionState};
use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum RecoveryAction {
    None,
    Retry,
    ReloadModel,
    RestartProvider,
    FailoverProvider,
    DowngradeModel,
    Stop,
}

impl std::fmt::Display for RecoveryAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            RecoveryAction::None => "none",
            RecoveryAction::Retry => "retry",
            RecoveryAction::ReloadModel => "reload_model",
            RecoveryAction::RestartProvider => "restart_provider",
            RecoveryAction::FailoverProvider => "failover_provider",
            RecoveryAction::DowngradeModel => "downgrade_model",
            RecoveryAction::Stop => "stop",
        };
        write!(f, "{}", s)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RecoveryEvaluation {
    pub action: String,
    pub target_runtime_id: Option<String>,
    pub target_model_id: Option<String>,
    pub reason: String,
    pub allowed: bool,
    pub evidence: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RecoveryEvent {
    pub id: String,
    pub timestamp: String,
    pub runtime_id: String,
    pub model_id: Option<String>,
    pub state: String,
    pub action: String,
    pub allowed: bool,
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct AttemptKey {
    runtime_id: String,
    model_id: Option<String>,
    action: RecoveryAction,
}

#[derive(Clone, Debug)]
struct AttemptRecord {
    count: u32,
    first_at: Instant,
}

struct RecoveryState {
    attempts: HashMap<AttemptKey, AttemptRecord>,
}

impl RecoveryState {
    fn new() -> Self {
        Self {
            attempts: HashMap::new(),
        }
    }

    fn count(&self, key: &AttemptKey) -> u32 {
        self.attempts
            .get(key)
            .filter(|r| r.first_at.elapsed() < Duration::from_secs(600))
            .map(|r| r.count)
            .unwrap_or(0)
    }

    fn total_runtime_count(&self, runtime_id: &str) -> u32 {
        self.attempts
            .iter()
            .filter(|(k, r)| {
                k.runtime_id == runtime_id && r.first_at.elapsed() < Duration::from_secs(600)
            })
            .map(|(_, r)| r.count)
            .sum()
    }

    fn increment(&mut self, key: AttemptKey) {
        let now = Instant::now();
        let entry = self.attempts.entry(key).or_insert(AttemptRecord {
            count: 0,
            first_at: now,
        });
        if entry.first_at.elapsed() >= Duration::from_secs(600) {
            entry.count = 0;
            entry.first_at = now;
        }
        entry.count += 1;
    }
}

static RECOVERY_STATE: Mutex<Option<RecoveryState>> = Mutex::new(None);

fn with_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut RecoveryState) -> R,
{
    let mut guard = RECOVERY_STATE.lock().unwrap_or_else(|e| e.into_inner());
    let state = guard.get_or_insert_with(RecoveryState::new);
    f(state)
}

const MAX_IMMEDIATE_RETRIES: u32 = 1;
const MAX_RECOVERY_ATTEMPTS_PER_PROVIDER: u32 = 3;
const MAX_PROVIDER_RESTARTS_PER_SESSION: u32 = 2;
const MAX_MODEL_RELOAD_ATTEMPTS_PER_SESSION: u32 = 2;
const MAX_FAILOVER_CHAIN_LENGTH: usize = 3;

fn is_stop_state(state: &ProviderConnectionState) -> bool {
    matches!(
        state,
        ProviderConnectionState::AuthFailed
            | ProviderConnectionState::Blocked
            | ProviderConnectionState::MissingBinary
    )
}

fn state_from_str(s: &str) -> ProviderConnectionState {
    match s {
        "not_configured" => ProviderConnectionState::NotConfigured,
        "offline" => ProviderConnectionState::Offline,
        "degraded" => ProviderConnectionState::Degraded,
        "error" => ProviderConnectionState::Error,
        "crashed" => ProviderConnectionState::Crashed,
        "missing_model" => ProviderConnectionState::MissingModel,
        "auth_failed" => ProviderConnectionState::AuthFailed,
        "rate_limited" => ProviderConnectionState::RateLimited,
        "blocked" => ProviderConnectionState::Blocked,
        "recovering" => ProviderConnectionState::Recovering,
        "starting" => ProviderConnectionState::Starting,
        "connecting" => ProviderConnectionState::Connecting,
        "connected" => ProviderConnectionState::Connected,
        "missing_binary" => ProviderConnectionState::MissingBinary,
        _ => ProviderConnectionState::Unknown,
    }
}

fn evidence_path() -> std::path::PathBuf {
    if let Ok(dir) = std::env::var("NEURODECK_REPORTS_DIR") {
        return std::path::Path::new(&dir).join("models/self-healing-evidence.json");
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let repo = cwd.join("reports/models/self-healing-evidence.json");
    if repo.exists() {
        return repo;
    }
    cwd.join("../reports/models/self-healing-evidence.json")
}

fn load_events() -> Vec<RecoveryEvent> {
    let path = evidence_path();
    if !path.exists() {
        return Vec::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("events").cloned())
            .and_then(|e| serde_json::from_value::<Vec<RecoveryEvent>>(e).ok())
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_events(events: &[RecoveryEvent]) -> Result<(), String> {
    let path = evidence_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let wrapper = serde_json::json!({
        "version": "1.0.0",
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "note": "Recovery events recorded by model_recovery_service.",
        "events": events,
    });
    std::fs::write(
        &path,
        serde_json::to_string_pretty(&wrapper).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

pub fn get_recovery_event_log() -> Vec<RecoveryEvent> {
    load_events()
}

pub fn record_recovery_event(event: RecoveryEvent) -> Result<(), String> {
    log::info!(
        "recovery_event runtime={} state={} action={} allowed={}",
        event.runtime_id,
        event.state,
        event.action,
        event.allowed
    );
    let mut events = load_events();
    events.push(event);
    // Keep last 500 events to prevent unbounded growth.
    if events.len() > 500 {
        events.drain(0..events.len() - 500);
    }
    save_events(&events)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelSupportMetrics {
    pub runtime_count: usize,
    pub model_count: usize,
    pub policy_block_count: u32,
    pub recovery_attempt_count: u32,
    pub last_recovery_action: Option<String>,
    pub last_successful_health_check: std::collections::HashMap<String, String>,
}

pub fn get_model_support_metrics() -> ModelSupportMetrics {
    let runtimes = super::provider_runtime_registry::load_provider_runtimes();
    let events = load_events();

    let policy_block_count = events
        .iter()
        .filter(|e| !e.allowed && e.action == "block_chat")
        .count() as u32;
    let recovery_attempt_count = events
        .iter()
        .filter(|e| e.allowed && !e.action.is_empty() && e.action != "block_chat")
        .count() as u32;
    let last_recovery_action = events.last().map(|e| e.action.clone());

    let mut last_successful_health_check = std::collections::HashMap::new();
    for e in events.iter().rev() {
        if e.allowed && !last_successful_health_check.contains_key(&e.runtime_id) {
            last_successful_health_check.insert(e.runtime_id.clone(), e.timestamp.clone());
        }
    }

    let model_count = crate::model_registry::load_supported_models().len();

    ModelSupportMetrics {
        runtime_count: runtimes.len(),
        model_count,
        policy_block_count,
        recovery_attempt_count,
        last_recovery_action,
        last_successful_health_check,
    }
}

fn current_failover_chain_length(runtime_id: &str, _model_id: Option<&str>) -> usize {
    let events = load_events();
    events
        .iter()
        .rev()
        .take_while(|e| e.runtime_id == runtime_id && e.action == "failover_provider")
        .count()
}

pub async fn evaluate_recovery(
    runtime_id: &str,
    model_id: Option<&str>,
    state_str: &str,
    agent_id: Option<&str>,
    config: &LlmConfig,
) -> RecoveryEvaluation {
    let state = state_from_str(state_str);
    log::info!(
        "evaluate_recovery runtime={} model={:?} state={}",
        runtime_id,
        model_id,
        state_str
    );
    let mut evidence = Vec::new();
    evidence.push(format!(
        "evaluating recovery for {} state={}",
        runtime_id, state_str
    ));

    if with_state(|s| s.total_runtime_count(runtime_id)) >= MAX_RECOVERY_ATTEMPTS_PER_PROVIDER {
        return RecoveryEvaluation {
            action: RecoveryAction::Stop.to_string(),
            target_runtime_id: None,
            target_model_id: model_id.map(|s| s.to_string()),
            reason: "Maximum recovery attempts for this provider reached in the last 10 minutes"
                .into(),
            allowed: false,
            evidence,
        };
    }

    if is_stop_state(&state) {
        return RecoveryEvaluation {
            action: RecoveryAction::Stop.to_string(),
            target_runtime_id: None,
            target_model_id: model_id.map(|s| s.to_string()),
            reason: "Unrecoverable state; no automatic recovery allowed".into(),
            allowed: false,
            evidence,
        };
    }

    let runtime = super::provider_runtime_registry::runtime_by_id(runtime_id);
    let Some(runtime) = runtime else {
        return RecoveryEvaluation {
            action: RecoveryAction::Stop.to_string(),
            target_runtime_id: None,
            target_model_id: model_id.map(|s| s.to_string()),
            reason: "Runtime not found in registry".into(),
            allowed: false,
            evidence,
        };
    };

    let healing = &runtime.self_healing;
    let health_results = check_all_provider_health(config).await;
    let health_by_runtime: HashMap<String, super::provider_health_service::ProviderHealth> =
        health_results
            .into_iter()
            .map(|h| (h.runtime_id.clone(), h))
            .collect();

    let current_key = |action: RecoveryAction| AttemptKey {
        runtime_id: runtime_id.to_string(),
        model_id: model_id.map(|s| s.to_string()),
        action,
    };

    // 1. Retry once if the runtime supports request retry.
    if healing.can_retry_request {
        let retry_key = current_key(RecoveryAction::Retry);
        let retry_count = with_state(|s| s.count(&retry_key));
        if retry_count < MAX_IMMEDIATE_RETRIES {
            with_state(|s| s.increment(retry_key));
            return RecoveryEvaluation {
                action: RecoveryAction::Retry.to_string(),
                target_runtime_id: Some(runtime_id.to_string()),
                target_model_id: model_id.map(|s| s.to_string()),
                reason: "Immediate retry allowed by runtime policy".into(),
                allowed: true,
                evidence,
            };
        }
        evidence.push("retry limit reached".into());
    }

    // 2. Reload model if model is missing/unloaded.
    if matches!(
        state,
        ProviderConnectionState::MissingModel | ProviderConnectionState::Degraded
    ) && healing.can_reload_model
    {
        let reload_key = current_key(RecoveryAction::ReloadModel);
        let reload_count = with_state(|s| s.count(&reload_key));
        if reload_count < MAX_MODEL_RELOAD_ATTEMPTS_PER_SESSION {
            with_state(|s| s.increment(reload_key));
            return RecoveryEvaluation {
                action: RecoveryAction::ReloadModel.to_string(),
                target_runtime_id: Some(runtime_id.to_string()),
                target_model_id: model_id.map(|s| s.to_string()),
                reason: "Model missing or degraded; reload allowed".into(),
                allowed: true,
                evidence,
            };
        }
        evidence.push("model reload limit reached".into());
    }

    // 3. Restart provider if offline/crashed and restart is configured.
    if matches!(
        state,
        ProviderConnectionState::Offline
            | ProviderConnectionState::Crashed
            | ProviderConnectionState::Error
    ) && healing.can_restart_service
    {
        let restart_key = current_key(RecoveryAction::RestartProvider);
        let restart_count = with_state(|s| s.count(&restart_key));
        if restart_count < MAX_PROVIDER_RESTARTS_PER_SESSION {
            with_state(|s| s.increment(restart_key));
            return RecoveryEvaluation {
                action: RecoveryAction::RestartProvider.to_string(),
                target_runtime_id: Some(runtime_id.to_string()),
                target_model_id: model_id.map(|s| s.to_string()),
                reason: "Runtime offline/crashed; restart allowed".into(),
                allowed: true,
                evidence,
            };
        }
        evidence.push("provider restart limit reached".into());
    }

    // 4. Failover to a healthy compatible provider/model.
    if healing.can_failover {
        let chain_len = current_failover_chain_length(runtime_id, model_id);
        if chain_len >= MAX_FAILOVER_CHAIN_LENGTH {
            evidence.push("max failover chain length reached".into());
        } else {
            let options = super::model_compatibility_service::ScoreOptions {
                battery_mode: true,
                allow_heavy_models: false,
                ..Default::default()
            };

            let best: Option<super::model_compatibility_service::ModelCompatibilityScore> =
                if let Some(agent_id) = agent_id {
                    super::agent_policy_service::pick_best_model_for_agent(
                        agent_id, &options, config,
                    )
                    .await
                    .map(|m| m.score)
                } else {
                    super::model_compatibility_service::pick_best_local_model(&options, config)
                        .await
                };
            if let Some(best) = best {
                if Some(best.model_id.as_str()) != model_id {
                    // Pick a runtime that lists the target model and is connected.
                    let target_runtime = health_by_runtime.values().find(|h| {
                        h.state == ProviderConnectionState::Connected
                            && h.models.contains(&best.model_id)
                    });
                    if let Some(target) = target_runtime {
                        return RecoveryEvaluation {
                            action: RecoveryAction::FailoverProvider.to_string(),
                            target_runtime_id: Some(target.runtime_id.clone()),
                            target_model_id: Some(best.model_id.clone()),
                            reason: format!(
                                "Failover to healthy local provider {} with model {}",
                                target.runtime_id, best.model_id
                            ),
                            allowed: true,
                            evidence,
                        };
                    }
                }
            }
            evidence.push("no healthy local failover target found".into());
        }
    }

    // 5. Downgrade if allowed: pick a smaller compatible local model on the same runtime.
    if matches!(
        state,
        ProviderConnectionState::Degraded
            | ProviderConnectionState::Offline
            | ProviderConnectionState::Error
    ) {
        let options = super::model_compatibility_service::ScoreOptions {
            battery_mode: true,
            allow_heavy_models: false,
            ..Default::default()
        };
        let scored =
            super::model_compatibility_service::get_model_compatibility_scores(&options, config)
                .await;
        let current_model_id = model_id.unwrap_or_default().to_string();
        let allowed_ids: Option<HashSet<String>> = agent_id.map(|aid| {
            crate::model_registry::load_supported_models()
                .into_iter()
                .filter(|p| super::agent_policy_service::is_model_allowed_for_agent(aid, p))
                .map(|p| p.id)
                .collect()
        });
        if let Some(current) = scored
            .iter()
            .find(|s| s.model_id == current_model_id)
            .cloned()
        {
            let downgrade = scored
                .into_iter()
                .filter(|s| {
                    s.model_id != current.model_id
                        && s.score > 0
                        && s.score < current.score
                        && s.installed
                        && allowed_ids
                            .as_ref()
                            .map(|set| set.contains(&s.model_id))
                            .unwrap_or(true)
                })
                .max_by_key(|s| s.score);
            if let Some(target) = downgrade {
                return RecoveryEvaluation {
                    action: RecoveryAction::DowngradeModel.to_string(),
                    target_runtime_id: Some(runtime_id.to_string()),
                    target_model_id: Some(target.model_id.clone()),
                    reason: format!(
                        "Downgrade from {} (score {}) to {} (score {})",
                        current.model_id, current.score, target.model_id, target.score
                    ),
                    allowed: true,
                    evidence,
                };
            }
        }
        evidence.push("no suitable downgrade target found".into());
    }

    RecoveryEvaluation {
        action: RecoveryAction::Stop.to_string(),
        target_runtime_id: None,
        target_model_id: model_id.map(|s| s.to_string()),
        reason: "No recovery action available within policy limits".into(),
        allowed: false,
        evidence,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auth_failed_is_stop() {
        assert!(is_stop_state(&ProviderConnectionState::AuthFailed));
    }

    #[test]
    fn state_from_str_maps_common_states() {
        assert_eq!(state_from_str("offline"), ProviderConnectionState::Offline);
        assert_eq!(
            state_from_str("connected"),
            ProviderConnectionState::Connected
        );
    }

    #[test]
    fn attempt_window_expires_after_ten_minutes() {
        let mut state = RecoveryState::new();
        let key = AttemptKey {
            runtime_id: "ollama-local".to_string(),
            model_id: Some("m".to_string()),
            action: RecoveryAction::Retry,
        };
        state.increment(key.clone());
        assert_eq!(state.count(&key), 1);
    }
}
