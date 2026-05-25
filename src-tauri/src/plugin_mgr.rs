use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::LuaState;

const PLUGINS_DIR: &str = "./plugins";
const REGISTRY_URL: &str = "https://raw.githubusercontent.com/khaoticdev62/neurodeck-plugins/main/registry.json";

#[derive(Serialize, Debug, Clone)]
pub struct PluginInfo {
    pub name: String,
    pub file_name: String,
    pub enabled: bool,
    pub id: Option<String>,
    pub author: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub marketplace: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PluginRegistry {
    #[serde(default)]
    pub plugins: Vec<MarketplacePlugin>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MarketplacePlugin {
    pub id: String,
    pub name: String,
    pub author: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub download_url: String,
    pub lua_file: String,
    #[serde(default)]
    pub installed: bool,
    #[serde(default)]
    pub enabled: bool,
}

#[tauri::command]
pub async fn list_plugins() -> Result<Vec<PluginInfo>, String> {
    let mut local = list_local_plugins()?;
    if let Ok(registry) = fetch_registry_raw().await {
        let by_file: HashMap<String, MarketplacePlugin> = registry
            .plugins
            .into_iter()
            .flat_map(|plugin| {
                let enabled_name = plugin.lua_file.clone();
                let disabled_name = format!("{}.disabled", plugin.lua_file);
                [(enabled_name, plugin.clone()), (disabled_name, plugin)]
            })
            .collect();

        for plugin in &mut local {
            if let Some(meta) = by_file.get(&plugin.file_name) {
                plugin.id = Some(meta.id.clone());
                plugin.author = Some(meta.author.clone());
                plugin.version = Some(meta.version.clone());
                plugin.description = Some(meta.description.clone());
                plugin.tags = meta.tags.clone();
                plugin.marketplace = true;
            }
        }
    }

    Ok(local)
}

#[tauri::command]
pub async fn fetch_plugin_registry() -> Result<PluginRegistry, String> {
    let mut registry = fetch_registry_raw().await?;
    let local = list_local_plugins()?;
    for plugin in &mut registry.plugins {
        let enabled_name = plugin.lua_file.as_str();
        let disabled_name = format!("{}.disabled", plugin.lua_file);
        plugin.installed = local.iter().any(|p| p.file_name == enabled_name || p.file_name == disabled_name);
        plugin.enabled = local.iter().any(|p| p.file_name == enabled_name && p.enabled);
    }
    Ok(registry)
}

#[tauri::command]
pub fn toggle_plugin(file_name: String, enabled: bool) -> Result<(), String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let plugins_dir = Path::new(PLUGINS_DIR);
    let src_path = plugins_dir.join(&file_name);
    if !src_path.exists() {
        return Err(format!("Plugin file '{}' does not exist", file_name));
    }

    let dest_file_name = if enabled {
        if file_name.ends_with(".lua.disabled") {
            file_name[..file_name.len() - 9].to_string()
        } else {
            return Ok(());
        }
    } else if file_name.ends_with(".lua") {
        format!("{}.disabled", file_name)
    } else {
        return Ok(());
    };

    validate_safe_lua_file_name(&dest_file_name, true)?;
    fs::rename(src_path, plugins_dir.join(dest_file_name))
        .map_err(|e| format!("Failed to rename plugin: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn install_plugin(url: String) -> Result<(), String> {
    let parsed_url = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let file_name = file_name_from_url(&parsed_url)?;
    download_plugin_file(&parsed_url, &file_name).await
}

#[tauri::command]
pub async fn install_plugin_from_registry(plugin_id: String, app_handle: AppHandle) -> Result<(), String> {
    validate_plugin_id(&plugin_id)?;
    let registry = fetch_registry_raw().await?;
    let plugin = registry
        .plugins
        .into_iter()
        .find(|p| p.id == plugin_id)
        .ok_or_else(|| format!("Plugin '{}' was not found in the marketplace registry", plugin_id))?;

    validate_safe_lua_file_name(&plugin.lua_file, false)?;
    let parsed_url = reqwest::Url::parse(&plugin.download_url)
        .map_err(|e| format!("Invalid plugin download URL: {}", e))?;
    validate_marketplace_download_url(&parsed_url)?;
    download_plugin_file(&parsed_url, &plugin.lua_file).await?;
    reload_plugins(app_handle).await
}

#[tauri::command]
pub async fn uninstall_plugin(plugin_id: String, app_handle: AppHandle) -> Result<(), String> {
    validate_plugin_id(&plugin_id)?;
    let registry = fetch_registry_raw().await.unwrap_or_default();
    let mut candidates = Vec::new();

    if let Some(plugin) = registry.plugins.iter().find(|p| p.id == plugin_id) {
        validate_safe_lua_file_name(&plugin.lua_file, false)?;
        candidates.push(plugin.lua_file.clone());
        candidates.push(format!("{}.disabled", plugin.lua_file));
    }

    candidates.push(format!("{}.lua", plugin_id));
    candidates.push(format!("{}.lua.disabled", plugin_id));

    let plugins_dir = Path::new(PLUGINS_DIR);
    let mut removed = false;
    for file_name in candidates {
        validate_safe_lua_file_name(&file_name, true)?;
        let path = plugins_dir.join(file_name);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Failed to remove plugin: {}", e))?;
            removed = true;
        }
    }

    if !removed {
        return Err(format!("Plugin '{}' is not installed", plugin_id));
    }

    reload_plugins(app_handle).await
}

#[tauri::command]
pub fn read_plugin(file_name: String) -> Result<String, String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let path = Path::new(PLUGINS_DIR).join(&file_name);
    if !path.exists() {
        return Err("Plugin file does not exist".to_string());
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read plugin file: {}", e))
}

#[tauri::command]
pub fn save_plugin(file_name: String, content: String) -> Result<(), String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let path = Path::new(PLUGINS_DIR).join(&file_name);
    fs::write(path, content).map_err(|e| format!("Failed to save plugin file: {}", e))
}

#[tauri::command]
pub async fn reload_plugins(app_handle: AppHandle) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let lua_state = app_handle.state::<LuaState>();
        let mut engine = lua_state.0.lock().map_err(|e| format!("Mutex lock failed: {}", e))?;

        let new_engine = crate::lua::LuaEngine::new(app_handle.clone())
            .map_err(|e| format!("Failed to create new Lua engine: {}", e))?;

        new_engine.load_plugins(PLUGINS_DIR)?;

        *engine = new_engine;
        Ok(())
    }).await.map_err(|e| format!("Task join error: {}", e))?
}

fn list_local_plugins() -> Result<Vec<PluginInfo>, String> {
    let plugins_dir = Path::new(PLUGINS_DIR);
    if !plugins_dir.exists() {
        fs::create_dir_all(plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;
    }

    let mut list = Vec::new();
    let entries = fs::read_dir(plugins_dir).map_err(|e| format!("Failed to read plugins dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(file_name_str) = path.file_name().and_then(|f| f.to_str()) else {
            continue;
        };

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
                id: None,
                author: None,
                version: None,
                description: None,
                tags: Vec::new(),
                marketplace: false,
            });
        }
    }

    list.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(list)
}

async fn fetch_registry_raw() -> Result<PluginRegistry, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("NEURODECK/1.2 (plugin-manager)")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(REGISTRY_URL)
        .send()
        .await
        .map_err(|e| format!("Network error fetching plugin registry: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        // Treat 404 as "registry not yet populated" — return empty rather than hard error
        if status.as_u16() == 404 {
            return Ok(PluginRegistry::default());
        }
        return Err(format!("Plugin registry returned HTTP {}", status));
    }

    response
        .json::<PluginRegistry>()
        .await
        .map_err(|e| format!("Failed to parse plugin registry: {}", e))
}

async fn download_plugin_file(url: &reqwest::Url, file_name: &str) -> Result<(), String> {
    if url.scheme() != "https" {
        return Err("Plugin downloads must use HTTPS".to_string());
    }
    validate_safe_lua_file_name(file_name, false)?;

    let plugins_dir = Path::new(PLUGINS_DIR);
    if !plugins_dir.exists() {
        fs::create_dir_all(plugins_dir).map_err(|e| format!("Failed to create plugins dir: {}", e))?;
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let response = client
        .get(url.clone())
        .send()
        .await
        .map_err(|e| format!("Failed to fetch plugin: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Plugin download returned HTTP {}", response.status()));
    }

    let body = response.text().await.map_err(|e| format!("Failed to read plugin content: {}", e))?;
    if body.len() > 512 * 1024 {
        return Err("Plugin file is too large; marketplace plugins must be under 512KB".to_string());
    }

    fs::write(plugins_dir.join(file_name), body)
        .map_err(|e| format!("Failed to save downloaded plugin: {}", e))
}

fn file_name_from_url(url: &reqwest::Url) -> Result<String, String> {
    if url.scheme() != "https" {
        return Err("Plugin downloads must use HTTPS".to_string());
    }

    let mut path_segments = url.path_segments().ok_or("URL has no path segments")?;
    let last_segment = path_segments.next_back().unwrap_or("plugin.lua");
    let mut file_name = if last_segment.is_empty() {
        "plugin.lua".to_string()
    } else {
        last_segment.to_string()
    };

    if !file_name.ends_with(".lua") && !file_name.ends_with(".lua.disabled") {
        file_name.push_str(".lua");
    }

    let sanitized_name: String = file_name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-' || *c == '.')
        .collect();

    validate_safe_lua_file_name(&sanitized_name, true)?;
    Ok(sanitized_name)
}

fn validate_plugin_id(plugin_id: &str) -> Result<(), String> {
    if plugin_id.is_empty()
        || plugin_id.len() > 80
        || !plugin_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("Invalid plugin ID".to_string());
    }
    Ok(())
}

fn validate_marketplace_download_url(url: &reqwest::Url) -> Result<(), String> {
    if url.scheme() != "https" {
        return Err("Marketplace plugin downloads must use HTTPS".to_string());
    }
    let host = url.host_str().unwrap_or_default();
    let allowed = host == "raw.githubusercontent.com" || host == "github.com";
    if !allowed {
        return Err("Marketplace plugin downloads must come from GitHub-hosted URLs".to_string());
    }
    Ok(())
}

fn validate_safe_lua_file_name(file_name: &str, allow_disabled: bool) -> Result<(), String> {
    let valid_suffix = file_name.ends_with(".lua") || (allow_disabled && file_name.ends_with(".lua.disabled"));
    if file_name.is_empty()
        || !valid_suffix
        || file_name.contains("..")
        || file_name.contains('/')
        || file_name.contains('\\')
        || !file_name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err("Invalid plugin file name".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsafe_lua_file_names() {
        assert!(validate_safe_lua_file_name("../bad.lua", false).is_err());
        assert!(validate_safe_lua_file_name("bad/path.lua", false).is_err());
        assert!(validate_safe_lua_file_name("bad.txt", false).is_err());
    }

    #[test]
    fn accepts_safe_lua_file_names() {
        assert!(validate_safe_lua_file_name("weather.lua", false).is_ok());
        assert!(validate_safe_lua_file_name("weather.lua.disabled", true).is_ok());
        assert!(validate_safe_lua_file_name("weather.lua.disabled", false).is_err());
    }

    #[test]
    fn extracts_safe_file_name_from_https_url() {
        let url = reqwest::Url::parse("https://raw.githubusercontent.com/org/repo/main/weather.lua").unwrap();
        assert_eq!(file_name_from_url(&url).unwrap(), "weather.lua");
    }

    #[test]
    fn marketplace_downloads_are_github_only() {
        let good = reqwest::Url::parse("https://raw.githubusercontent.com/org/repo/main/weather.lua").unwrap();
        let bad = reqwest::Url::parse("https://example.com/weather.lua").unwrap();
        assert!(validate_marketplace_download_url(&good).is_ok());
        assert!(validate_marketplace_download_url(&bad).is_err());
    }
}
