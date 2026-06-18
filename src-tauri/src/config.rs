use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// A named agent profile — a saved combination of provider + model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    pub provider: String, // "gemini" | "ollama" | "huggingface"
    pub model: String,
    #[serde(default = "default_ollama_base_url")]
    pub base_url: String,
    #[serde(default)]
    pub embed_model: String,
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
    /// Name of the currently-active preset theme (e.g. "Blacksite").
    /// Used by the frontend to hydrate the correct theme on boot.
    #[serde(default)]
    pub active_theme_name: Option<String>,
}

fn default_primary_color() -> String {
    "#00F0FF".to_string()
}
fn default_secondary_color() -> String {
    "#FF0055".to_string()
}
fn default_bg_color() -> String {
    "#050505".to_string()
}
fn default_foreground_color() -> String {
    "#D9F7FF".to_string()
}
fn default_response_color() -> String {
    "#00FF88".to_string()
}

impl Default for ThemeConfig {
    fn default() -> Self {
        Self {
            primary_color: default_primary_color(),
            secondary_color: default_secondary_color(),
            bg_color: default_bg_color(),
            foreground_color: default_foreground_color(),
            response_color: default_response_color(),
            active_theme_name: None,
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
    #[serde(default = "default_lm_studio_base_url")]
    pub lm_studio_base_url: String,
    #[serde(default = "default_llamacpp_base_url")]
    pub llamacpp_base_url: String,
    #[serde(default = "default_hf_model")]
    pub hf_model: String,
    #[serde(default)]
    pub hf_api_key: String,
    #[serde(default = "default_hf_base_url")]
    pub hf_base_url: String,
    #[serde(default = "default_kimi_model")]
    pub kimi_model: String,
    #[serde(default = "default_kimi_base_url")]
    pub kimi_base_url: String,
    /// OpenAI-compatible endpoint — base URL (e.g. https://api.groq.com/openai/v1)
    #[serde(default)]
    pub openai_compat_base_url: String,
    /// OpenAI-compatible model name (e.g. llama-3.3-70b-versatile, gpt-4o-mini)
    #[serde(default = "default_openai_compat_model")]
    pub openai_compat_model: String,
    /// Cleared on save — stored in OS keychain via save_openai_compat_api_key
    #[serde(default)]
    pub openai_compat_api_key: String,
    /// Google OAuth2 client ID for device flow (Gemini API key auth).
    /// Register at console.cloud.google.com → APIs & Services → Credentials.
    #[serde(default)]
    pub google_client_id: String,
    /// Embedding model for Ollama (e.g. nomic-embed-text).
    #[serde(default = "default_ollama_embed_model")]
    pub ollama_embed_model: String,
    /// Embedding model for HuggingFace (e.g. sentence-transformers/all-MiniLM-L6-v2).
    #[serde(default = "default_hf_embed_model")]
    pub hf_embed_model: String,
    /// ID of the currently-active named agent profile.
    #[serde(default)]
    pub active_agent_id: String,
    /// Named agent profiles (provider + model combos).
    #[serde(default)]
    pub agents: Vec<AgentConfig>,
}

fn default_provider() -> String {
    "ollama".to_string()
}
fn default_ollama_model() -> String {
    "llama3.2:1b".to_string()
}
fn default_gemini_model() -> String {
    "gemini-1.5-flash".to_string()
}
fn default_ollama_base_url() -> String {
    "http://localhost:11434".to_string()
}
fn default_lm_studio_base_url() -> String {
    "http://127.0.0.1:1234".to_string()
}
fn default_llamacpp_base_url() -> String {
    "http://127.0.0.1:8080".to_string()
}
fn default_hf_model() -> String {
    "meta-llama/Llama-3.2-1B-Instruct".to_string()
}
fn default_hf_base_url() -> String {
    "https://api-inference.huggingface.co".to_string()
}
fn default_kimi_model() -> String {
    "kimi-k2.5".to_string()
}
fn default_kimi_base_url() -> String {
    "https://api.moonshot.ai/v1".to_string()
}
fn default_openai_compat_model() -> String {
    "gpt-4o-mini".to_string()
}
fn default_ollama_embed_model() -> String {
    "nomic-embed-text".to_string()
}
fn default_hf_embed_model() -> String {
    "sentence-transformers/all-MiniLM-L6-v2".to_string()
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            default_provider: default_provider(),
            ollama_model: default_ollama_model(),
            gemini_model: default_gemini_model(),
            ollama_base_url: default_ollama_base_url(),
            lm_studio_base_url: default_lm_studio_base_url(),
            llamacpp_base_url: default_llamacpp_base_url(),
            hf_model: default_hf_model(),
            hf_api_key: String::new(),
            hf_base_url: default_hf_base_url(),
            kimi_model: default_kimi_model(),
            kimi_base_url: default_kimi_base_url(),
            openai_compat_base_url: String::new(),
            openai_compat_model: default_openai_compat_model(),
            openai_compat_api_key: String::new(),
            ollama_embed_model: default_ollama_embed_model(),
            hf_embed_model: default_hf_embed_model(),
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

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefsConfig {
    /// Minimize to system tray on window close instead of quitting (default: true)
    #[serde(default = "default_true")]
    pub minimize_to_tray_on_close: bool,
}

impl Default for PrefsConfig {
    fn default() -> Self {
        Self {
            minimize_to_tray_on_close: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SecurityConfig {
    #[serde(default)]
    pub agent_workspace_only: bool,
    #[serde(default = "default_agent_workspace_path")]
    pub agent_workspace_path: String,
    #[serde(default)]
    pub permission_registry: crate::permissions::PermissionRegistry,
}

fn default_agent_workspace_path() -> String {
    "~/.neurodeck_workspace".to_string()
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
    #[serde(default)]
    pub prefs: PrefsConfig,
    #[serde(default)]
    pub security: SecurityConfig,
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

fn default_sync_memory() -> bool {
    true
}
fn default_sync_sessions() -> bool {
    true
}
fn default_sync_device_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

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

impl Config {
    pub fn get_resolved_workspace(&self) -> Option<std::path::PathBuf> {
        if self.security.agent_workspace_only {
            let raw = &self.security.agent_workspace_path;
            if raw.starts_with("~/") || raw.starts_with("~\\") {
                crate::get_home_dir()
                    .map(|mut h| {
                        h.push(&raw[2..]);
                        h
                    })
                    .or_else(|| Some(std::path::PathBuf::from(raw)))
            } else {
                Some(std::path::PathBuf::from(raw))
            }
        } else {
            None
        }
    }
}

pub fn load_config<P: AsRef<Path>>(path: P) -> Config {
    let path_ref = path.as_ref();
    if let Ok(content) = fs::read_to_string(path_ref) {
        if let Ok(mut cfg) = toml::from_str::<Config>(&content) {
            if !cfg.llm.hf_api_key.trim().is_empty() {
                let _ = neurodeck_infrastructure::secrets::save_hf_api_key(&cfg.llm.hf_api_key);
                cfg.llm.hf_api_key.clear();
                let _ = save_config(path_ref, &cfg);
            }
            if !cfg.llm.openai_compat_api_key.trim().is_empty() {
                let _ = neurodeck_infrastructure::secrets::save_openai_compat_api_key(
                    &cfg.llm.openai_compat_api_key,
                );
                cfg.llm.openai_compat_api_key.clear();
                let _ = save_config(path_ref, &cfg);
            }
            return cfg;
        }
    }
    Config::default()
}

pub fn save_config<P: AsRef<Path>>(path: P, config: &Config) -> Result<(), String> {
    let mut sanitized = config.clone();
    sanitized.llm.hf_api_key.clear();
    sanitized.llm.openai_compat_api_key.clear();
    let content = toml::to_string_pretty(&sanitized)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Failed to write config file: {}", e))?;
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
        assert_eq!(config.llm.ollama_model, "llama3.2:1b");
        assert_eq!(config.llm.gemini_model, "gemini-1.5-flash");
        assert_eq!(config.llm.ollama_base_url, "http://localhost:11434");
    }

    #[test]
    fn test_load_nonexistent_config() {
        let config = load_config("nonexistent_file.toml");
        assert_eq!(config.theme.primary_color, "#00F0FF");
    }
}
