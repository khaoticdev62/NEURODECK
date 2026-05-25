use crate::*;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use futures_util::StreamExt;
use crate::llm::{LlmProvider, GeminiProvider, OllamaProvider};

#[tauri::command]
pub fn set_config(key: String, value: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut config = app.config.clone();

    match key.as_str() {
        "llm.default_provider" => config.llm.default_provider = value,
        "llm.ollama_model" => config.llm.ollama_model = value,
        "llm.gemini_model" => config.llm.gemini_model = value,
        "llm.ollama_base_url" => config.llm.ollama_base_url = value,
        "llm.google_client_id" => config.llm.google_client_id = value,
        "sync.api_base_url" => config.sync.api_base_url = value,
        _ => return Err(format!("Unknown config key: {}", key)),
    }

    let path = get_config_path();
    config::save_config(&path, &config)?;
    
    // Update state and recreate provider
    app.config = config.clone();
    app.provider = create_provider(&config);
    Ok(())
}

#[tauri::command]
pub fn get_config(state: State<'_, Mutex<AppState>>) -> Result<config::Config, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    Ok(app.config.clone())
}

#[tauri::command]
pub fn save_gemini_api_key(key: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    
    // Phase 4: OS keychain secret management
    neurodeck_infrastructure::secrets::save_gemini_api_key(&key)?;
    
    // Keep it in env for legacy provider compat during transition
    std::env::set_var("GEMINI_API_KEY", &key);
    app.provider = create_provider(&app.config);
    Ok(())
}

#[tauri::command]
pub fn get_gemini_api_key() -> Result<String, String> {
    // Phase 4: OS keychain secret management
    match neurodeck_infrastructure::secrets::get_gemini_api_key() {
        Ok(key) => Ok(key),
        Err(_) => Ok(std::env::var("GEMINI_API_KEY").unwrap_or_default()) // fallback to env
    }
}

#[tauri::command]
pub async fn test_llm_connection(
    provider: String,
    model: String,
    url: String,
    key: Option<String>,
) -> Result<String, String> {
    if provider == "gemini" {
        let api_key = match key {
            Some(ref k) if !k.is_empty() => k.clone(),
            _ => std::env::var("GEMINI_API_KEY").map_err(|_| "Gemini API key is required but not set".to_string())?,
        };

        // Use the key directly rather than mutating the global env var, which
        // would race with concurrent send_command / embedding calls on other threads.
        let test_provider = GeminiProvider::new_with_key(model, api_key);
        let mut stream = test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
        let first_chunk = stream.next().await;

        match first_chunk {
            Some(Ok(_)) => Ok("Gemini Connection Successful!".to_string()),
            Some(Err(e)) => Err(format!("Gemini Connection Failed: {}", e)),
            None => Err("Gemini Connection Failed: Empty response".to_string()),
        }
    } else {
        let test_provider = OllamaProvider::new(model, url);
        let mut stream = test_provider.stream_response("Say 'success' in 1 word", "Test instruction");
        let first_chunk = stream.next().await;

        match first_chunk {
            Some(Ok(_)) => Ok("Ollama Connection Successful!".to_string()),
            Some(Err(e)) => Err(format!("Ollama Connection Failed: {}", e)),
            None => Err("Ollama Connection Failed: Empty response".to_string()),
        }
    }
}

#[tauri::command]
pub fn get_personas(state: State<'_, Mutex<AppState>>) -> Vec<String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut list: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
    for cp in &app.custom_personas {
        list.push(cp.name.clone());
    }
    list
}

#[tauri::command]
pub fn get_themes() -> Vec<String> {
    THEMES.iter().map(|t| t.name.clone()).collect()
}

#[tauri::command]
pub fn set_persona(name: String, state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    let is_valid = PERSONAS.iter().any(|p| p.0 == name) || app.custom_personas.iter().any(|p| p.name == name);
    if is_valid {
        app.active_persona = name.clone();
        format!("Persona set to {}", name)
    } else {
        "Persona not found".to_string()
    }
}

#[tauri::command]
pub fn list_custom_personas(state: State<'_, Mutex<AppState>>) -> Result<Vec<CustomPersona>, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    Ok(app.custom_personas.clone())
}

#[tauri::command]
pub fn add_custom_persona(name: String, prompt: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let name_trimmed = name.trim().to_string();
    let prompt_trimmed = prompt.trim().to_string();

    if name_trimmed.is_empty() || prompt_trimmed.is_empty() {
        return Err("Name and prompt cannot be empty".to_string());
    }

    if name_trimmed.len() > 30 {
        return Err("Persona name must be under 30 characters".to_string());
    }

    if !name_trimmed.chars().all(|c| c.is_alphanumeric() || c == ' ' || c == '_' || c == '-') {
        return Err("Persona name can only contain letters, numbers, spaces, underscores, and hyphens".to_string());
    }

    if PERSONAS.iter().any(|p| p.0.to_lowercase() == name_trimmed.to_lowercase()) {
        return Err(format!("Persona '{}' clashes with a built-in persona", name_trimmed));
    }

    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());

    if app.custom_personas.iter().any(|p| p.name.to_lowercase() == name_trimmed.to_lowercase()) {
        return Err(format!("Persona '{}' already exists", name_trimmed));
    }

    app.custom_personas.push(CustomPersona {
        name: name_trimmed,
        prompt: prompt_trimmed,
    });

    let json_data = serde_json::to_string_pretty(&app.custom_personas)
        .map_err(|e| format!("Failed to serialize custom personas: {}", e))?;
    
    std::fs::write("./data/personas.json", json_data)
        .map_err(|e| format!("Failed to save custom personas file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_custom_persona(name: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());

    let initial_len = app.custom_personas.len();
    app.custom_personas.retain(|p| p.name != name);

    if app.custom_personas.len() == initial_len {
        return Err(format!("Custom persona '{}' not found", name));
    }

    let json_data = serde_json::to_string_pretty(&app.custom_personas)
        .map_err(|e| format!("Failed to serialize custom personas: {}", e))?;
    
    std::fs::write("./data/personas.json", json_data)
        .map_err(|e| format!("Failed to save custom personas file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn set_theme(name: String) -> Option<HashMap<String, String>> {
    if let Some(t) = THEMES.iter().find(|theme| theme.name == name) {
        let mut map = HashMap::new();
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
#[tauri::command]
pub fn save_profiles(key: String, data: String) -> Result<(), String> {
    let allowed = ["ssh", "ftp", "sftp"];
    if !allowed.contains(&key.as_str()) {
        return Err(format!("Invalid profile key: {}", key));
    }
    let dir = std::path::Path::new("./data/profiles");
    std::fs::create_dir_all(dir).map_err(|e| format!("Cannot create profiles dir: {}", e))?;
    let path = dir.join(format!("{}.json", key));
    std::fs::write(&path, &data).map_err(|e| format!("Cannot save profiles: {}", e))
}

/// Load a profile list from `./data/profiles/<key>.json`.
/// Returns `"[]"` if the file does not exist.
#[tauri::command]
pub fn load_profiles(key: String) -> String {
    let allowed = ["ssh", "ftp", "sftp"];
    if !allowed.contains(&key.as_str()) {
        return "[]".to_string();
    }
    let path = std::path::Path::new("./data/profiles").join(format!("{}.json", key));
    std::fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string())
}

/// Persist custom themes to `./data/themes/custom.json`.
#[tauri::command]
pub fn save_custom_themes(data: String) -> Result<(), String> {
    let dir = std::path::Path::new("./data/themes");
    std::fs::create_dir_all(dir).map_err(|e| format!("Cannot create themes dir: {}", e))?;
    std::fs::write(dir.join("custom.json"), &data)
        .map_err(|e| format!("Cannot save themes: {}", e))
}

/// Load custom themes from disk. Returns `"[]"` if not found.
#[tauri::command]
pub fn load_custom_themes() -> String {
    std::fs::read_to_string("./data/themes/custom.json")
        .unwrap_or_else(|_| "[]".to_string())
}

#[tauri::command]
pub fn save_ssh_credential(profile_name: String, password: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::save_ssh_credential(&profile_name, &password)
}

#[tauri::command]
pub fn get_ssh_credential(profile_name: String) -> Result<String, String> {
    neurodeck_infrastructure::secrets::get_ssh_credential(&profile_name)
}

#[tauri::command]
pub fn delete_ssh_credential(profile_name: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::delete_ssh_credential(&profile_name)
}

#[tauri::command]
pub fn save_sftp_credential(profile_name: String, password: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::save_sftp_credential(&profile_name, &password)
}

#[tauri::command]
pub fn get_sftp_credential(profile_name: String) -> Result<String, String> {
    neurodeck_infrastructure::secrets::get_sftp_credential(&profile_name)
}

#[tauri::command]
pub fn delete_sftp_credential(profile_name: String) -> Result<(), String> {
    neurodeck_infrastructure::secrets::delete_sftp_credential(&profile_name)
}
