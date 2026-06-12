use super::provider_runtime_registry::{resolve_base_url, ProviderRuntimeProfile};
use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderConnectionState {
    Unknown,
    NotConfigured,
    Starting,
    Connecting,
    Connected,
    Degraded,
    Offline,
    MissingBinary,
    MissingModel,
    AuthFailed,
    RateLimited,
    Crashed,
    Blocked,
    Error,
    Recovering,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProviderHealth {
    pub runtime_id: String,
    pub runtime_type: String,
    pub label: String,
    pub state: ProviderConnectionState,
    pub base_url: Option<String>,
    pub latency_ms: u64,
    pub models: Vec<String>,
    pub error: Option<String>,
    pub checked_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAiModel {
    id: String,
}

fn keychain_key(runtime_id: &str) -> Option<String> {
    let key = match runtime_id {
        "gemini-cloud" => neurodeck_infrastructure::secrets::get_gemini_api_key(),
        "huggingface-inference" => neurodeck_infrastructure::secrets::get_hf_api_key(),
        "openai-compatible-remote" => {
            neurodeck_infrastructure::secrets::get_openai_compat_api_key()
        }
        _ => return None,
    };
    key.ok().filter(|k| !k.is_empty())
}

fn has_required_auth(runtime: &ProviderRuntimeProfile, config: &LlmConfig) -> bool {
    if !runtime.auth.required {
        return true;
    }
    for env_var in &runtime.auth.env_vars {
        if std::env::var(env_var)
            .map(|v| !v.is_empty())
            .unwrap_or(false)
        {
            return true;
        }
    }
    if keychain_key(&runtime.id).is_some() {
        return true;
    }
    // Fallback to config-stored keys (present before save/keychain migration).
    match runtime.id.as_str() {
        "huggingface-inference" => !config.hf_api_key.is_empty(),
        "openai-compatible-remote" => !config.openai_compat_api_key.is_empty(),
        _ => false,
    }
}

fn api_key(runtime: &ProviderRuntimeProfile, config: &LlmConfig) -> Option<String> {
    for env_var in &runtime.auth.env_vars {
        if let Ok(key) = std::env::var(env_var) {
            if !key.is_empty() {
                return Some(key);
            }
        }
    }
    if let Some(key) = keychain_key(&runtime.id) {
        return Some(key);
    }
    match runtime.id.as_str() {
        "huggingface-inference" if !config.hf_api_key.is_empty() => Some(config.hf_api_key.clone()),
        "openai-compatible-remote" if !config.openai_compat_api_key.is_empty() => {
            Some(config.openai_compat_api_key.clone())
        }
        _ => None,
    }
}

pub async fn check_provider_health(
    runtime: &ProviderRuntimeProfile,
    config: &LlmConfig,
) -> ProviderHealth {
    let start = Instant::now();
    let checked_at = chrono::Utc::now().to_rfc3339();

    if !has_required_auth(runtime, config) {
        return ProviderHealth {
            runtime_id: runtime.id.clone(),
            runtime_type: runtime.runtime_type.clone(),
            label: runtime.label.clone(),
            state: ProviderConnectionState::NotConfigured,
            base_url: resolve_base_url(runtime, config),
            latency_ms: start.elapsed().as_millis() as u64,
            models: vec![],
            error: Some("API key or required environment variable missing".into()),
            checked_at,
        };
    }

    let Some(base_url) = resolve_base_url(runtime, config) else {
        return ProviderHealth {
            runtime_id: runtime.id.clone(),
            runtime_type: runtime.runtime_type.clone(),
            label: runtime.label.clone(),
            state: ProviderConnectionState::NotConfigured,
            base_url: None,
            latency_ms: start.elapsed().as_millis() as u64,
            models: vec![],
            error: Some("Base URL not configured".into()),
            checked_at,
        };
    };

    if !runtime.supports.model_listing {
        return ProviderHealth {
            runtime_id: runtime.id.clone(),
            runtime_type: runtime.runtime_type.clone(),
            label: runtime.label.clone(),
            state: ProviderConnectionState::NotConfigured,
            base_url: Some(base_url),
            latency_ms: start.elapsed().as_millis() as u64,
            models: vec![],
            error: Some("Runtime does not support model listing".into()),
            checked_at,
        };
    }

    let endpoint = runtime
        .endpoints
        .list_models
        .as_deref()
        .or(runtime.endpoints.health.as_deref())
        .unwrap_or("/");
    let url = format!("{}{}", base_url.trim_end_matches('/'), endpoint);

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut request = client.get(&url);
    if let Some(key) = api_key(runtime, config) {
        if let Some(header) = runtime.auth.header_name.as_deref() {
            request = request.header(header, key);
        } else {
            request = request.header("Authorization", format!("Bearer {}", key));
        }
    }

    let response = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            let state = if e.is_connect() || e.is_timeout() {
                ProviderConnectionState::Offline
            } else {
                ProviderConnectionState::Error
            };
            return ProviderHealth {
                runtime_id: runtime.id.clone(),
                runtime_type: runtime.runtime_type.clone(),
                label: runtime.label.clone(),
                state,
                base_url: Some(base_url),
                latency_ms: start.elapsed().as_millis() as u64,
                models: vec![],
                error: Some(e.to_string()),
                checked_at,
            };
        }
    };

    let status = response.status();
    if !status.is_success() {
        let state = match status.as_u16() {
            401 => ProviderConnectionState::AuthFailed,
            429 => ProviderConnectionState::RateLimited,
            503 => ProviderConnectionState::Offline,
            _ => ProviderConnectionState::Error,
        };
        let body = response.text().await.unwrap_or_default();
        return ProviderHealth {
            runtime_id: runtime.id.clone(),
            runtime_type: runtime.runtime_type.clone(),
            label: runtime.label.clone(),
            state,
            base_url: Some(base_url),
            latency_ms: start.elapsed().as_millis() as u64,
            models: vec![],
            error: Some(format!("HTTP {}: {}", status, body)),
            checked_at,
        };
    }

    let models: Vec<String> = if runtime.runtime_type == "ollama" {
        response
            .json::<OllamaTagsResponse>()
            .await
            .map(|r| r.models.into_iter().map(|m| m.name).collect())
            .unwrap_or_default()
    } else {
        response
            .json::<OpenAiModelsResponse>()
            .await
            .map(|r| r.data.into_iter().map(|m| m.id).collect())
            .unwrap_or_default()
    };

    ProviderHealth {
        runtime_id: runtime.id.clone(),
        runtime_type: runtime.runtime_type.clone(),
        label: runtime.label.clone(),
        state: if models.is_empty() {
            ProviderConnectionState::Degraded
        } else {
            ProviderConnectionState::Connected
        },
        base_url: Some(base_url),
        latency_ms: start.elapsed().as_millis() as u64,
        models,
        error: None,
        checked_at,
    }
}

pub async fn check_all_provider_health(config: &LlmConfig) -> Vec<ProviderHealth> {
    let runtimes = super::provider_runtime_registry::load_provider_runtimes();
    let mut results = Vec::with_capacity(runtimes.len());
    for runtime in runtimes {
        results.push(check_provider_health(&runtime, config).await);
    }
    results
}
