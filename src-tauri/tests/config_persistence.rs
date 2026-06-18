//! Integration test: config write → read roundtrip.
//!
//! Validates that `save_config` serializes correctly and `load_config`
//! deserializes back to the same values. Also verifies that sensitive
//! fields (API keys) are sanitized on save.

use app_lib::config::{load_config, save_config, Config};
use std::path::PathBuf;

fn temp_config_path(suffix: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "neurodeck_test_config_{}_{}.toml",
        std::process::id(),
        suffix
    ))
}

#[test]
fn config_roundtrip() {
    let path = temp_config_path("roundtrip");
    let _ = std::fs::remove_file(&path);

    let mut config = Config::default();
    config.llm.default_provider = "gemini".to_string();
    config.llm.gemini_model = "gemini-2.0-flash".to_string();
    config.llm.ollama_model = "llama3.2:1b".to_string();
    config.llm.active_agent_id = "agent-1".to_string();

    save_config(&path, &config).expect("save_config should succeed");

    let loaded = load_config(&path);
    assert_eq!(loaded.llm.default_provider, "gemini");
    assert_eq!(loaded.llm.gemini_model, "gemini-2.0-flash");
    assert_eq!(loaded.llm.ollama_model, "llama3.2:1b");
    assert_eq!(loaded.llm.active_agent_id, "agent-1");

    // Defaults that were not touched should remain intact
    assert_eq!(loaded.llm.ollama_base_url, "http://localhost:11434");
    assert_eq!(loaded.theme.primary_color, "#00F0FF");

    let _ = std::fs::remove_file(&path);
}

#[test]
fn config_sanitizes_api_keys_on_save() {
    let path = temp_config_path("sanitize");
    let _ = std::fs::remove_file(&path);

    let mut config = Config::default();
    config.llm.hf_api_key = "super-secret-hf".to_string();
    config.llm.openai_compat_api_key = "super-secret-openai".to_string();

    save_config(&path, &config).expect("save_config should succeed");

    // Read the raw TOML
    let raw = std::fs::read_to_string(&path).expect("config file should exist");
    assert!(
        !raw.contains("super-secret-hf"),
        "HF API key should be stripped from saved config"
    );
    assert!(
        !raw.contains("super-secret-openai"),
        "OpenAI-compat API key should be stripped from saved config"
    );

    // When loaded back, the sanitized fields should be empty
    let loaded = load_config(&path);
    assert!(loaded.llm.hf_api_key.is_empty());
    assert!(loaded.llm.openai_compat_api_key.is_empty());

    let _ = std::fs::remove_file(&path);
}

#[test]
fn config_handles_missing_file() {
    let path = std::env::temp_dir().join(format!(
        "neurodeck_nonexistent_config_{}_xyz.toml",
        std::process::id()
    ));
    let _ = std::fs::remove_file(&path);

    let loaded = load_config(&path);
    // Should return defaults
    assert_eq!(loaded.llm.default_provider, "ollama");
    assert_eq!(loaded.theme.primary_color, "#00F0FF");
}

#[test]
fn config_persists_active_theme_name() {
    let path = temp_config_path("theme");
    let _ = std::fs::remove_file(&path);

    let mut config = Config::default();
    config.theme.active_theme_name = Some("Blacksite".to_string());

    save_config(&path, &config).expect("save_config should succeed");

    let loaded = load_config(&path);
    assert_eq!(
        loaded.theme.active_theme_name,
        Some("Blacksite".to_string())
    );

    let _ = std::fs::remove_file(&path);
}
