use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderRuntimeProfile {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub runtime_type: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(rename = "localOnly")]
    pub local_only: bool,
    #[serde(rename = "steamDeckRecommended")]
    pub steam_deck_recommended: bool,
    pub endpoints: ProviderEndpoints,
    pub auth: ProviderAuth,
    pub supports: ProviderSupports,
    #[serde(rename = "selfHealing")]
    pub self_healing: ProviderSelfHealing,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderEndpoints {
    pub health: Option<String>,
    #[serde(rename = "listModels")]
    pub list_models: Option<String>,
    pub chat: Option<String>,
    pub generate: Option<String>,
    #[serde(rename = "embeddings")]
    pub embeddings: Option<String>,
    pub ps: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderAuth {
    pub required: bool,
    #[serde(rename = "envVars")]
    pub env_vars: Vec<String>,
    #[serde(rename = "headerName")]
    pub header_name: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderSupports {
    #[serde(rename = "modelListing")]
    pub model_listing: bool,
    pub chat: bool,
    pub streaming: bool,
    pub embeddings: bool,
    pub tools: bool,
    pub vision: bool,
    pub cancellation: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderSelfHealing {
    #[serde(rename = "canRestartService")]
    pub can_restart_service: bool,
    #[serde(rename = "canReloadModel")]
    pub can_reload_model: bool,
    #[serde(rename = "canRetryRequest")]
    pub can_retry_request: bool,
    #[serde(rename = "canFailover")]
    pub can_failover: bool,
    #[serde(rename = "maxRecoveryAttempts")]
    pub max_recovery_attempts: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(dead_code)]
struct ProviderRuntimeRegistry {
    runtimes: Vec<ProviderRuntimeProfile>,
}

pub fn load_provider_runtimes() -> Vec<ProviderRuntimeProfile> {
    let path = crate::model_registry::registry_path("provider-runtimes.json");
    if !path.exists() {
        tracing::warn!("Provider runtime registry not found at {}", path.display());
        return Vec::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(val) => {
                let entries = val
                    .get("runtimes")
                    .and_then(|r| r.as_array())
                    .cloned()
                    .unwrap_or_default();
                entries
                    .into_iter()
                    .filter_map(|entry| {
                        match serde_json::from_value::<ProviderRuntimeProfile>(entry) {
                            Ok(p) => Some(p),
                            Err(e) => {
                                tracing::warn!("Dropping invalid provider runtime profile: {}", e);
                                None
                            }
                        }
                    })
                    .collect()
            }
            Err(e) => {
                tracing::warn!("Failed to parse provider runtime registry: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!("Failed to read provider runtime registry: {}", e);
            Vec::new()
        }
    }
}

pub fn runtime_by_id(id: &str) -> Option<ProviderRuntimeProfile> {
    load_provider_runtimes().into_iter().find(|r| r.id == id)
}

/// Resolve the effective base URL for a runtime, honoring user config overrides.
pub fn resolve_base_url(runtime: &ProviderRuntimeProfile, config: &LlmConfig) -> Option<String> {
    let configured = match runtime.id.as_str() {
        "ollama-local" if !config.ollama_base_url.is_empty() => Some(config.ollama_base_url.clone()),
        "lm-studio-local" if !config.lm_studio_base_url.is_empty() => {
            Some(config.lm_studio_base_url.clone())
        }
        "llama-cpp-server-local" if !config.llamacpp_base_url.is_empty() => {
            Some(config.llamacpp_base_url.clone())
        }
        "huggingface-inference" if !config.hf_base_url.is_empty() => Some(config.hf_base_url.clone()),
        "kimi-cloud" if !config.kimi_base_url.is_empty() => Some(config.kimi_base_url.clone()),
        "openai-compatible-remote" if !config.openai_compat_base_url.is_empty() => {
            Some(config.openai_compat_base_url.clone())
        }
        _ => None,
    };

    configured
        .or_else(|| {
            let url = runtime.base_url.trim();
            if url.is_empty() {
                None
            } else {
                Some(url.to_string())
            }
        })
}

#[allow(dead_code)]
pub fn list_local_runtimes() -> Vec<ProviderRuntimeProfile> {
    load_provider_runtimes()
        .into_iter()
        .filter(|r| r.local_only)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_loads_at_least_ollama() {
        let runtimes = load_provider_runtimes();
        assert!(
            runtimes.iter().any(|r| r.id == "ollama-local"),
            "expected ollama-local runtime"
        );
    }

    #[test]
    fn resolve_base_url_uses_config_for_ollama() {
        let runtime = runtime_by_id("ollama-local").expect("ollama runtime");
        let config = LlmConfig {
            ollama_base_url: "http://deck:11434".to_string(),
            ..Default::default()
        };
        assert_eq!(
            resolve_base_url(&runtime, &config),
            Some("http://deck:11434".to_string())
        );
    }

    #[test]
    fn resolve_base_url_falls_back_to_registry_default() {
        let runtime = runtime_by_id("lm-studio-local").expect("lm-studio runtime");
        let config = LlmConfig::default();
        assert_eq!(
            resolve_base_url(&runtime, &config),
            Some("http://127.0.0.1:1234".to_string())
        );
    }
}
