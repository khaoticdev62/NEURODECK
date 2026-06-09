use crate::llm::{
    GeminiProvider, HuggingFaceProvider, LlmProvider, OllamaProvider, OpenAICompatProvider,
};
use crate::*;
use futures_util::StreamExt;
use std::collections::HashMap;

fn validate_config_url(value: &str, field: &str) -> Result<(), String> {
    let parsed =
        reqwest::Url::parse(value).map_err(|e| format!("Invalid URL for {}: {}", field, e))?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err(format!("{} must use http or https", field)),
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(format!(
            "{} must not embed credentials in the URL; store secrets separately",
            field
        ));
    }
    if parsed.host_str().unwrap_or_default().is_empty() {
        return Err(format!("{} must include a host", field));
    }
    Ok(())
}

pub fn get_gemini_api_key() -> Result<String, String> {
    // Phase 4: OS keychain secret management
    match neurodeck_infrastructure::secrets::get_gemini_api_key() {
        Ok(key) => Ok(key),
        Err(_) => Ok(std::env::var("GEMINI_API_KEY").unwrap_or_default()), // fallback to env
    }
}

pub fn get_hf_api_key() -> Result<String, String> {
    match neurodeck_infrastructure::secrets::get_hf_api_key() {
        Ok(key) => Ok(key),
        Err(_) => Ok(std::env::var("HF_API_KEY").unwrap_or_default()),
    }
}

pub fn get_kimi_api_key() -> Result<String, String> {
    match neurodeck_infrastructure::secrets::get_kimi_api_key() {
        Ok(key) => Ok(key),
        Err(_) => Ok(std::env::var("KIMI_API_KEY").unwrap_or_default()),
    }
}

pub fn get_openai_compat_api_key() -> Result<String, String> {
    neurodeck_infrastructure::secrets::get_openai_compat_api_key().or_else(|_| Ok(String::new()))
}

pub async fn test_llm_connection(
    provider: String,
    model: String,
    url: String,
    key: Option<String>,
) -> Result<String, String> {
    if !url.trim().is_empty() {
        validate_config_url(&url, "connection test URL")?;
    }
    match provider.as_str() {
        "gemini" => {
            let api_key = match key {
                Some(ref k) if !k.is_empty() => k.clone(),
                _ => std::env::var("GEMINI_API_KEY")
                    .map_err(|_| "Gemini API key is required but not set".to_string())?,
            };

            // Use the key directly rather than mutating the global env var, which
            // would race with concurrent send_command / embedding calls on other threads.
            let test_provider = GeminiProvider::new_with_key(model, api_key);
            let mut stream =
                test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
            let first_chunk = stream.next().await;

            match first_chunk {
                Some(Ok(_)) => Ok("Gemini Connection Successful!".to_string()),
                Some(Err(e)) => Err(format!("Gemini Connection Failed: {}", e)),
                None => Err("Gemini Connection Failed: Empty response".to_string()),
            }
        }
        "huggingface" => {
            let api_key = match key {
                Some(ref k) if !k.is_empty() => Some(k.clone()),
                _ => std::env::var("HF_API_KEY").ok().filter(|k| !k.is_empty()),
            };
            let test_provider = HuggingFaceProvider::new(model, api_key, url, "".to_string());
            let mut stream =
                test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
            let first_chunk = stream.next().await;

            match first_chunk {
                Some(Ok(_)) => Ok("Hugging Face Connection Successful!".to_string()),
                Some(Err(e)) => Err(format!("Hugging Face Connection Failed: {}", e)),
                None => Err("Hugging Face Connection Failed: Empty response".to_string()),
            }
        }
        "kimi" => {
            let api_key = match key {
                Some(ref k) if !k.is_empty() => k.clone(),
                _ => std::env::var("KIMI_API_KEY")
                    .map_err(|_| "Kimi API key is required but not set".to_string())?,
            };
            let test_provider = KimiProvider::new_with_key(model, url, api_key);
            let mut stream =
                test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
            let first_chunk = stream.next().await;

            match first_chunk {
                Some(Ok(_)) => Ok("Kimi Connection Successful!".to_string()),
                Some(Err(e)) => Err(format!("Kimi Connection Failed: {}", e)),
                None => Err("Kimi Connection Failed: Empty response".to_string()),
            }
        }
        "openai_compat" => {
            let api_key = match key {
                Some(ref k) if !k.is_empty() => k.clone(),
                _ => neurodeck_infrastructure::secrets::get_openai_compat_api_key()
                    .unwrap_or_default(),
            };
            let test_provider = OpenAICompatProvider::new(url, model, api_key);
            let mut stream = test_provider.stream_response("Say 'success' in 1 word", "");
            let first_chunk = stream.next().await;
            match first_chunk {
                Some(Ok(_)) => Ok("OpenAI-Compatible Connection Successful!".to_string()),
                Some(Err(e)) => Err(format!("OpenAI-compat Connection Failed: {}", e)),
                None => Err("OpenAI-compat Connection Failed: Empty response".to_string()),
            }
        }
        _ => {
            let test_provider = OllamaProvider::new(model, url, "".to_string());
            let mut stream =
                test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
            let first_chunk = stream.next().await;

            match first_chunk {
                Some(Ok(_)) => Ok("Ollama Connection Successful!".to_string()),
                Some(Err(e)) => Err(format!("Ollama Connection Failed: {}", e)),
                None => Err("Ollama Connection Failed: Empty response".to_string()),
            }
        }
    }
}

pub fn get_themes() -> Vec<String> {
    THEMES.iter().map(|t| t.name.clone()).collect()
}

pub fn set_theme(name: String) -> Option<HashMap<String, String>> {
    if let Some(t) = THEMES.iter().find(|theme| theme.name == name) {
        let mut map = HashMap::new();
        map.insert("Name".to_string(), t.name.clone());
        map.insert("Color".to_string(), t.color.clone());
        map.insert(
            "Pulse".to_string(),
            serde_json::to_string(&t.pulse).unwrap_or_default(),
        );
        map.insert("Background".to_string(), t.background.clone());
        map.insert("Foreground".to_string(), t.foreground.clone());
        map.insert("Accent".to_string(), t.accent.clone());
        map.insert("Response".to_string(), t.response.clone());
        map.insert("Warning".to_string(), t.warning.clone());
        map.insert("Error".to_string(), t.error.clone());
        Some(map)
    } else {
        None
    }
}

/// Persist a profile list to `./data/profiles/<key>.json`.
/// `key` must be one of: "ssh", "ftp", "sftp"
pub fn save_profiles(key: String, data: String) -> Result<(), String> {
    let allowed = ["ssh", "ftp", "sftp"];
    if !allowed.contains(&key.as_str()) {
        return Err(format!("Invalid profile key: {}", key));
    }
    let dir = user_config_dir().join("data/profiles");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create profiles dir: {}", e))?;
    let path = dir.join(format!("{}.json", key));
    std::fs::write(&path, &data).map_err(|e| format!("Cannot save profiles: {}", e))
}

/// Load a profile list from `./data/profiles/<key>.json`.
/// Returns `"[]"` if the file does not exist.
pub fn load_profiles(key: String) -> String {
    let allowed = ["ssh", "ftp", "sftp"];
    if !allowed.contains(&key.as_str()) {
        return "[]".to_string();
    }
    let path = user_config_dir()
        .join("data/profiles")
        .join(format!("{}.json", key));
    std::fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string())
}

/// Persist custom themes to `./data/themes/custom.json`.
pub fn save_custom_themes(data: String) -> Result<(), String> {
    let dir = user_config_dir().join("data/themes");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create themes dir: {}", e))?;
    std::fs::write(dir.join("custom.json"), &data).map_err(|e| format!("Cannot save themes: {}", e))
}

/// Load custom themes from disk. Returns `"[]"` if not found.
pub fn load_custom_themes() -> String {
    std::fs::read_to_string(user_config_dir().join("data/themes/custom.json"))
        .unwrap_or_else(|_| "[]".to_string())
}

pub fn save_ssh_credential(profile_name: String, password: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::save_ssh_credential(&profile_name, &password)
}

pub fn get_ssh_credential(profile_name: String) -> Result<String, String> {
    neurodeck_infrastructure::secrets::get_ssh_credential(&profile_name)
}

pub fn delete_ssh_credential(profile_name: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::delete_ssh_credential(&profile_name)
}

pub fn save_sftp_credential(profile_name: String, password: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::save_sftp_credential(&profile_name, &password)
}

pub fn get_sftp_credential(profile_name: String) -> Result<String, String> {
    neurodeck_infrastructure::secrets::get_sftp_credential(&profile_name)
}

pub fn delete_sftp_credential(profile_name: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::delete_sftp_credential(&profile_name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{PERSONAS, THEMES};

    #[test]
    fn get_themes_returns_all_theme_names() {
        let themes = get_themes();
        assert_eq!(themes.len(), THEMES.len());
        assert!(themes.contains(&"BLACKSITE".to_string()));
        assert!(themes.contains(&"MATRIX".to_string()));
    }

    #[test]
    fn get_themes_contains_known_themes() {
        let themes = get_themes();
        let expected = vec![
            "BLACKSITE",
            "TERMINAL_GHOST",
            "SYNTH_GRID",
            "DECK_BLUE",
            "AMBER_CRT",
            "CYBER_PUNK",
            "MATRIX",
            "SOLARIZED",
            "GLITCH_RED",
        ];
        for name in expected {
            assert!(
                themes.contains(&name.to_string()),
                "Expected theme {} to be present",
                name
            );
        }
    }

    #[test]
    fn personas_list_contains_default() {
        let names: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
        assert!(names.contains(&"Default".to_string()));
        assert!(names.contains(&"Developer".to_string()));
    }

    #[test]
    fn persona_prompt_not_empty() {
        for (_, prompt) in PERSONAS.iter() {
            assert!(!prompt.is_empty(), "Persona prompt should not be empty");
        }
    }
}
