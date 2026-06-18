pub mod agent_policy_service;
pub mod model_compatibility_service;
pub mod model_discovery_service;
pub mod model_probe_service;
pub mod model_recovery_service;
pub mod provider_health_service;
pub mod provider_runtime_registry;

pub use agent_policy_service::{
    evaluate_policy_for_model, get_policy_for_agent, load_agent_policies as get_agent_policies,
    rank_models_for_agent, AgentModelAllowance,
};
pub use model_compatibility_service::{
    get_model_compatibility_scores, pick_best_local_model, ScoreOptions,
};
pub use model_discovery_service::discover_installed_models;
pub use model_probe_service::run_model_probe;
pub use model_recovery_service::{
    evaluate_recovery, get_model_support_metrics, get_recovery_event_log, record_recovery_event,
    RecoveryEvent,
};
pub use provider_health_service::{check_all_provider_health, check_provider_health};
pub use provider_runtime_registry::{load_provider_runtimes, runtime_by_id};
