use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
}

fn default_provider() -> String { "ollama".to_string() }
fn default_ollama_model() -> String { "llama2".to_string() }
fn default_gemini_model() -> String { "gemini-1.5-flash".to_string() }
fn default_ollama_base_url() -> String { "http://localhost:11434".to_string() }

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            default_provider: default_provider(),
            ollama_model: default_ollama_model(),
            gemini_model: default_gemini_model(),
            ollama_base_url: default_ollama_base_url(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub theme: ThemeConfig,
    #[serde(default)]
    pub llm: LlmConfig,
}

pub fn load_config<P: AsRef<Path>>(path: P) -> Config {
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(cfg) = toml::from_str(&content) {
            return cfg;
        }
    }
    Config::default()
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
