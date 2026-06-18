use super::provider_health_service::ProviderConnectionState;
use super::provider_runtime_registry::{resolve_base_url, runtime_by_id};
use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Instant;

const TINY_PROMPT: &str = "Say 'pong' exactly.";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelProbeResult {
    pub runtime_id: String,
    pub model_id: String,
    pub state: ProviderConnectionState,
    pub response: String,
    pub latency_ms: u64,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAiChatResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAiChoice {
    message: OpenAiMessage,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct OpenAiMessage {
    content: String,
}

fn api_key(runtime_id: &str, config: &LlmConfig) -> Option<String> {
    let env_key = |name: &str| std::env::var(name).ok().filter(|k| !k.is_empty());
    let keychain_key = || match runtime_id {
        "gemini-cloud" => neurodeck_infrastructure::secrets::get_gemini_api_key().ok(),
        "huggingface-inference" => neurodeck_infrastructure::secrets::get_hf_api_key().ok(),
        "openai-compatible-remote" => {
            neurodeck_infrastructure::secrets::get_openai_compat_api_key().ok()
        }
        _ => None,
    };

    match runtime_id {
        "gemini-cloud" => env_key("GEMINI_API_KEY").or_else(keychain_key),
        "huggingface-inference" => env_key("HF_API_KEY")
            .or_else(|| {
                if config.hf_api_key.is_empty() {
                    None
                } else {
                    Some(config.hf_api_key.clone())
                }
            })
            .or_else(keychain_key),
        "openai-compatible-remote" => env_key("OPENAI_API_KEY")
            .or_else(|| {
                if config.openai_compat_api_key.is_empty() {
                    None
                } else {
                    Some(config.openai_compat_api_key.clone())
                }
            })
            .or_else(keychain_key),
        "kimi-cloud" => env_key("KIMI_API_KEY"),
        _ => None,
    }
}

pub async fn run_model_probe(
    runtime_id: &str,
    model_id: &str,
    config: &LlmConfig,
) -> ModelProbeResult {
    let start = Instant::now();
    let Some(runtime) = runtime_by_id(runtime_id) else {
        return ModelProbeResult {
            runtime_id: runtime_id.to_string(),
            model_id: model_id.to_string(),
            state: ProviderConnectionState::Error,
            response: String::new(),
            latency_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("Runtime '{}' not found in registry", runtime_id)),
        };
    };

    let Some(base_url) = resolve_base_url(&runtime, config) else {
        return ModelProbeResult {
            runtime_id: runtime_id.to_string(),
            model_id: model_id.to_string(),
            state: ProviderConnectionState::NotConfigured,
            response: String::new(),
            latency_ms: start.elapsed().as_millis() as u64,
            error: Some("Base URL not configured".into()),
        };
    };

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let (url, body) = match runtime.runtime_type.as_str() {
        "ollama" => {
            let url = format!("{}/api/generate", base_url.trim_end_matches('/'));
            let body = json!({
                "model": model_id,
                "prompt": TINY_PROMPT,
                "stream": false,
                "options": { "temperature": 0.0 }
            });
            (url, body)
        }
        "openai_compatible_local" | "openai_compatible_remote" | "llama_cpp_server" => {
            let chat_path = runtime
                .endpoints
                .chat
                .as_deref()
                .unwrap_or("/v1/chat/completions");
            let url = format!("{}{}", base_url.trim_end_matches('/'), chat_path);
            let body = json!({
                "model": model_id,
                "messages": [{"role": "user", "content": TINY_PROMPT}],
                "temperature": 0.0,
                "max_tokens": 20
            });
            (url, body)
        }
        _ => {
            return ModelProbeResult {
                runtime_id: runtime_id.to_string(),
                model_id: model_id.to_string(),
                state: ProviderConnectionState::NotConfigured,
                response: String::new(),
                latency_ms: start.elapsed().as_millis() as u64,
                error: Some(format!(
                    "Tiny prompt probe not implemented for runtime type '{}'",
                    runtime.runtime_type
                )),
            };
        }
    };

    let mut request = client.post(&url).json(&body);
    if let Some(key) = api_key(runtime_id, config) {
        let header_name = runtime
            .auth
            .header_name
            .as_deref()
            .unwrap_or("Authorization");
        if header_name == "Authorization" {
            request = request.header(header_name, format!("Bearer {}", key));
        } else {
            request = request.header(header_name, key);
        }
    }

    let response = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            return ModelProbeResult {
                runtime_id: runtime_id.to_string(),
                model_id: model_id.to_string(),
                state: if e.is_connect() || e.is_timeout() {
                    ProviderConnectionState::Offline
                } else {
                    ProviderConnectionState::Error
                },
                response: String::new(),
                latency_ms: start.elapsed().as_millis() as u64,
                error: Some(e.to_string()),
            };
        }
    };

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let state = match status.as_u16() {
            401 => ProviderConnectionState::AuthFailed,
            429 => ProviderConnectionState::RateLimited,
            503 => ProviderConnectionState::Offline,
            _ => ProviderConnectionState::Error,
        };
        return ModelProbeResult {
            runtime_id: runtime_id.to_string(),
            model_id: model_id.to_string(),
            state,
            response: String::new(),
            latency_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("HTTP {}: {}", status, body)),
        };
    }

    let text = match response.text().await {
        Ok(t) => t,
        Err(e) => {
            return ModelProbeResult {
                runtime_id: runtime_id.to_string(),
                model_id: model_id.to_string(),
                state: ProviderConnectionState::Degraded,
                response: String::new(),
                latency_ms: start.elapsed().as_millis() as u64,
                error: Some(format!("Failed to read response body: {}", e)),
            };
        }
    };

    let extracted = if runtime.runtime_type == "ollama" {
        serde_json::from_str::<OllamaGenerateResponse>(&text)
            .map(|r| r.response.trim().to_string())
            .unwrap_or_else(|_| text.trim().to_string())
    } else {
        serde_json::from_str::<OpenAiChatResponse>(&text)
            .map(|r| {
                r.choices
                    .first()
                    .map(|c| c.message.content.trim().to_string())
                    .unwrap_or_default()
            })
            .unwrap_or_else(|_| text.trim().to_string())
    };

    let ok = !extracted.is_empty();
    ModelProbeResult {
        runtime_id: runtime_id.to_string(),
        model_id: model_id.to_string(),
        state: if ok {
            ProviderConnectionState::Connected
        } else {
            ProviderConnectionState::Degraded
        },
        response: extracted,
        latency_ms: start.elapsed().as_millis() as u64,
        error: if ok {
            None
        } else {
            Some("Empty probe response".into())
        },
    }
}
