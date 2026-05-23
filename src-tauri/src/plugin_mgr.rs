use std::fs;
use std::path::Path;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use crate::LuaState;

#[derive(Serialize, Debug)]
pub struct PluginInfo {
    pub name: String,
    pub file_name: String,
    pub enabled: bool,
}

#[tauri::command]
pub fn list_plugins() -> Result<Vec<PluginInfo>, String> {
    let plugins_dir = Path::new("./plugins");
    if !plugins_dir.exists() {
        fs::create_dir_all(plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;
    }

    let mut list = Vec::new();
    let entries = fs::read_dir(plugins_dir).map_err(|e| format!("Failed to read plugins dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(file_name_str) = path.file_name().and_then(|f| f.to_str()) {
                let is_lua = file_name_str.ends_with(".lua");
                let is_disabled = file_name_str.ends_with(".lua.disabled");

                if is_lua || is_disabled {
                    let name = if is_lua {
                        file_name_str[..file_name_str.len() - 4].to_string()
                    } else {
                        file_name_str[..file_name_str.len() - 13].to_string()
                    };

                    list.push(PluginInfo {
                        name,
                        file_name: file_name_str.to_string(),
                        enabled: is_lua,
                    });
                }
            }
        }
    }

    // Sort by name for consistent UI list
    list.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(list)
}

#[tauri::command]
pub fn toggle_plugin(file_name: String, enabled: bool) -> Result<(), String> {
    // Sanitize file name to prevent directory traversal
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid file name".to_string());
    }

    let plugins_dir = Path::new("./plugins");
    let src_path = plugins_dir.join(&file_name);
    if !src_path.exists() {
        return Err(format!("Plugin file '{}' does not exist", file_name));
    }

    let dest_file_name = if enabled {
        if file_name.ends_with(".lua.disabled") {
            file_name[..file_name.len() - 9].to_string() // strip ".disabled"
        } else {
            return Ok(()); // already enabled / normal name
        }
    } else {
        if file_name.ends_with(".lua") {
            format!("{}.disabled", file_name)
        } else {
            return Ok(()); // already disabled
        }
    };

    let dest_path = plugins_dir.join(dest_file_name);
    fs::rename(src_path, dest_path).map_err(|e| format!("Failed to rename plugin: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn install_plugin(url: String) -> Result<(), String> {
    let parsed_url = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    
    // Extract filename from URL
    let path_segments = parsed_url.path_segments().ok_or("URL has no path segments")?;
    let last_segment = path_segments.last().unwrap_or("plugin.lua");
    let mut file_name = if last_segment.is_empty() { "plugin.lua".to_string() } else { last_segment.to_string() };
    
    if !file_name.ends_with(".lua") && !file_name.ends_with(".lua.disabled") {
        file_name.push_str(".lua");
    }

    // Sanitize file name
    let sanitized_name: String = file_name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-' || *c == '.')
        .collect();

    if sanitized_name.is_empty() || sanitized_name.contains("..") || sanitized_name.contains('/') || sanitized_name.contains('\\') {
        return Err("Invalid or unsafe filename extracted from URL".to_string());
    }

    let plugins_dir = Path::new("./plugins");
    if !plugins_dir.exists() {
        fs::create_dir_all(plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;
    }

    // Download content
    let response = reqwest::get(parsed_url).await.map_err(|e| format!("Failed to fetch URL: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("Server returned error status: {}", response.status()));
    }

    let body = response.text().await.map_err(|e| format!("Failed to read response content: {}", e))?;
    let dest_path = plugins_dir.join(sanitized_name);

    fs::write(dest_path, body).map_err(|e| format!("Failed to save downloaded plugin: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn read_plugin(file_name: String) -> Result<String, String> {
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid file name".to_string());
    }

    let path = Path::new("./plugins").join(&file_name);
    if !path.exists() {
        return Err("Plugin file does not exist".to_string());
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read plugin file: {}", e))
}

#[tauri::command]
pub fn save_plugin(file_name: String, content: String) -> Result<(), String> {
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("Invalid file name".to_string());
    }

    if !file_name.ends_with(".lua") && !file_name.ends_with(".lua.disabled") {
        return Err("File name must end with .lua or .lua.disabled".to_string());
    }

    let path = Path::new("./plugins").join(&file_name);
    fs::write(path, content).map_err(|e| format!("Failed to save plugin file: {}", e))
}

#[tauri::command]
pub async fn reload_plugins(app_handle: AppHandle) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let lua_state = app_handle.state::<LuaState>();
        let mut engine = lua_state.0.lock().map_err(|e| format!("Mutex lock failed: {}", e))?;
        
        let new_engine = crate::lua::LuaEngine::new(app_handle.clone())
            .map_err(|e| format!("Failed to create new Lua engine: {}", e))?;
        
        new_engine.load_plugins("./plugins")?;
        
        *engine = new_engine;
        Ok(())
    }).await.map_err(|e| format!("Task join error: {}", e))?
}
