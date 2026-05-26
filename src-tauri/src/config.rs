use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// A named agent profile — a saved combination of provider + model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    pub provider: String,  // "gemini" | "ollama" | "huggingface"
    pub model: String,
    #[serde(default = "default_ollama_base_url")]
    pub base_url: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    #[serde(default = "default_primary_color")]
    pub primary_color: String,
    #[serde(default = "default_secondary_color")]
    pub secondary_color: String,
    #[serde(default = "default_bg_color")]
    pub bg_color: String,
    #[serde(default = "default_foreground_color")]
    pub foreground_color: String,
    #[serde(default = "default_response_color")]
    pub response_color: String,
}

fn default_primary_color() -> String { "#00F0FF".to_string() }
fn default_secondary_color() -> String { "#FF0055".to_string() }
fn default_bg_color() -> String { "#050505".to_string() }
fn default_foreground_color() -> String { "#D9F7FF".to_string() }
fn default_response_color() -> String { "#00FF88".to_string() }

impl Default for ThemeConfig {
    fn default() -> Self {
        Self {
            primary_color: default_primary_color(),
            secondary_color: default_secondary_color(),
            bg_color: default_bg_color(),
            foreground_color: default_foreground_color(),
            response_color: default_response_color(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    #[serde(default = "default_provider")]
    pub default_provider: String,
    #[serde(default = "default_ollama_model")]
    pub ollama_model: String,
    #[serde(default = "default_gemini_model")]
    pub gemini_model: String,
    #[serde(default = "default_ollama_base_url")]
    pub ollama_base_url: String,
    #[serde(default = "default_hf_model")]
    pub hf_model: String,
    #[serde(default)]
    pub hf_api_key: String,
    #[serde(default = "default_hf_base_url")]
    pub hf_base_url: String,
    /// Google OAuth2 client ID for device flow (Gemini API key auth).
    /// Register at console.cloud.google.com → APIs & Services → Credentials.
    #[serde(default)]
    pub google_client_id: String,
    /// ID of the currently-active named agent profile.
    #[serde(default)]
    pub active_agent_id: String,
    /// Named agent profiles (provider + model combos).
    #[serde(default)]
    pub agents: Vec<AgentConfig>,
}

fn default_provider() -> String { "ollama".to_string() }
fn default_ollama_model() -> String { "llama2".to_string() }
fn default_gemini_model() -> String { "gemini-1.5-flash".to_string() }
fn default_ollama_base_url() -> String { "http://localhost:11434".to_string() }
fn default_hf_model() -> String { "meta-llama/Llama-3.2-1B-Instruct".to_string() }
fn default_hf_base_url() -> String { "https://api-inference.huggingface.co".to_string() }

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            default_provider: default_provider(),
            ollama_model: default_ollama_model(),
            gemini_model: default_gemini_model(),
            ollama_base_url: default_ollama_base_url(),
            hf_model: default_hf_model(),
            hf_api_key: String::new(),
            hf_base_url: default_hf_base_url(),
            google_client_id: String::new(),
            active_agent_id: String::new(),
            agents: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SttConfig {
    /// Path to whisper-cli binary, or empty to auto-detect from PATH.
    #[serde(default)]
    pub whisper_binary: String,
    /// Absolute path to GGML model file (e.g. ggml-base.en.bin).
    #[serde(default)]
    pub whisper_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub theme: ThemeConfig,
    #[serde(default)]
    pub llm: LlmConfig,
    #[serde(default)]
    pub stt: SttConfig,
    #[serde(default)]
    pub sync: SyncConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_sync_memory")]
    pub sync_memory: bool,
    #[serde(default = "default_sync_sessions")]
    pub sync_sessions: bool,
    #[serde(default)]
    pub api_base_url: String,
    #[serde(default)]
    pub last_sync_at: Option<String>,
    #[serde(default = "default_sync_device_id")]
    pub device_id: String,
}

fn default_sync_memory() -> bool { true }
fn default_sync_sessions() -> bool { true }
fn default_sync_device_id() -> String { uuid::Uuid::new_v4().to_string() }

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            sync_memory: default_sync_memory(),
            sync_sessions: default_sync_sessions(),
            api_base_url: String::new(),
            last_sync_at: None,
            device_id: default_sync_device_id(),
        }
    }
}

pub fn load_config<P: AsRef<Path>>(path: P) -> Config {
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(cfg) = toml::from_str(&content) {
            return cfg;
        }
    }
    Config::default()
}

pub fn save_config<P: AsRef<Path>>(path: P, config: &Config) -> Result<(), String> {
    let content = toml::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.theme.primary_color, "#00F0FF");
        assert_eq!(config.theme.secondary_color, "#FF0055");
        assert_eq!(config.llm.default_provider, "ollama");
        assert_eq!(config.llm.ollama_model, "llama2");
        assert_eq!(config.llm.gemini_model, "gemini-1.5-flash");
        assert_eq!(config.llm.ollama_base_url, "http://localhost:11434");
    }

    #[test]
    fn test_load_nonexistent_config() {
        let config = load_config("nonexistent_file.toml");
        assert_eq!(config.theme.primary_color, "#00F0FF");
    }
}
