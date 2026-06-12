pub mod model_compatibility_service;
pub mod model_discovery_service;
pub mod model_probe_service;
pub mod provider_health_service;
pub mod provider_runtime_registry;

pub use model_compatibility_service::{
    ScoreOptions, get_model_compatibility_scores, pick_best_local_model,
};
pub use model_discovery_service::discover_installed_models;
pub use model_probe_service::run_model_probe;
pub use provider_health_service::{check_all_provider_health, check_provider_health};
pub use provider_runtime_registry::{load_provider_runtimes, runtime_by_id};
