use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::AppHandle;

const REGISTRY_URL: &str =
    "https://raw.githubusercontent.com/khaoticdev62/neurodeck-plugins/main/registry.json";

const AUDIT_LOG_FILE: &str = "plugin_audit.log";

/// Returns the canonical plugins directory under `user_config_dir()/plugins/`.
/// Falls back to `./plugins` only during development when the config dir is unavailable.
pub fn plugins_dir() -> PathBuf {
    let p = crate::user_config_dir().join("plugins");
    if let Err(e) = fs::create_dir_all(&p) {
        tracing::warn!("Could not create plugins dir at {}: {}", p.display(), e);
    }
    p
}

pub fn audit_log_path() -> PathBuf {
    crate::user_config_dir().join("logs").join(AUDIT_LOG_FILE)
}

/// Metadata parsed directly from a Lua plugin file's header comment block.
/// Lines of the form `-- @key value` are extracted.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PluginManifest {
    pub name: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub permissions: Vec<String>,
}

impl PluginManifest {
    /// Parse manifest annotations from the top of a Lua source string.
    /// Reads up to the first 40 lines to find `-- @key value` entries.
    pub fn parse(source: &str) -> Self {
        let mut m = PluginManifest::default();
        for line in source.lines().take(40) {
            let line = line.trim();
            if !line.starts_with("--") {
                break;
            }
            let rest = line.trim_start_matches('-').trim();
            if let Some(kv) = rest.strip_prefix('@') {
                let (key, val) = kv.split_once(' ').unwrap_or((kv, ""));
                let val = val.trim().to_string();
                match key.to_ascii_lowercase().as_str() {
                    "name" => m.name = Some(val),
                    "version" => m.version = Some(val),
                    "author" => m.author = Some(val),
                    "description" => m.description = Some(val),
                    "permissions" => {
                        m.permissions = val.split(',').map(|s| s.trim().to_string()).collect();
                    }
                    _ => {}
                }
            }
        }
        m
    }
}

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
    pub permissions: Vec<String>,
}

/// Result of the plugin QA validation pass.
#[derive(Serialize, Debug, Clone)]
pub struct PluginQaReport {
    pub file_name: String,
    pub passed: bool,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

/// Blocked Lua globals / patterns that indicate a plugin may be unsafe.
const UNSAFE_PATTERNS: &[&str] = &[
    "os.execute",
    "io.popen",
    "require(\"socket\")",
    "dofile",
    "loadfile",
    "package.loadlib",
    "debug.getinfo",
    "debug.sethook",
];

/// Static QA pass: checks Lua source for unsafe patterns and metadata completeness.
pub fn validate_plugin(file_name: &str) -> Result<PluginQaReport, String> {
    validate_safe_lua_file_name(file_name, true)?;
    let path = plugins_dir().join(file_name);
    let source = fs::read_to_string(&path)
        .map_err(|e| format!("Cannot read plugin '{}': {}", file_name, e))?;

    let mut warnings = Vec::new();
    let mut errors = Vec::new();

    let manifest = PluginManifest::parse(&source);
    if manifest.name.is_none() {
        warnings.push("Missing @name annotation".into());
    }
    if manifest.version.is_none() {
        warnings.push("Missing @version annotation".into());
    }
    if manifest.author.is_none() {
        warnings.push("Missing @author annotation".into());
    }

    for pattern in UNSAFE_PATTERNS {
        if source.contains(pattern) {
            warnings.push(format!("Uses potentially unsafe API: {}", pattern));
        }
    }

    // Size guard: > 512 KB is abnormal for a Lua plugin
    if source.len() > 512 * 1024 {
        errors.push(format!(
            "Plugin is too large: {} bytes (max 512 KB)",
            source.len()
        ));
    }

    let passed = errors.is_empty();
    Ok(PluginQaReport {
        file_name: file_name.to_string(),
        passed,
        warnings,
        errors,
    })
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
    /// Optional SHA-256 hex digest for integrity verification.
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default)]
    pub installed: bool,
    #[serde(default)]
    pub enabled: bool,
    /// Plugin category: "ai" | "productivity" | "system" | "integration" | "gaming" | "utility"
    #[serde(default)]
    pub category: Option<String>,
    /// Version string of the installed copy (for update detection)
    #[serde(default)]
    pub installed_version: Option<String>,
}

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
                // Prefer manifest-parsed values; fall back to registry values.
                if plugin.author.is_none() {
                    plugin.author = Some(meta.author.clone());
                }
                if plugin.version.is_none() {
                    plugin.version = Some(meta.version.clone());
                }
                if plugin.description.is_none() {
                    plugin.description = Some(meta.description.clone());
                }
                plugin.tags = meta.tags.clone();
                plugin.marketplace = true;
            }
        }
    }

    Ok(local)
}

pub async fn fetch_plugin_registry() -> Result<PluginRegistry, String> {
    let mut registry = fetch_registry_raw().await?;
    let local = list_local_plugins()?;
    for plugin in &mut registry.plugins {
        let enabled_name = plugin.lua_file.as_str();
        let disabled_name = format!("{}.disabled", plugin.lua_file);
        plugin.installed = local
            .iter()
            .any(|p| p.file_name == enabled_name || p.file_name == disabled_name);
        plugin.enabled = local
            .iter()
            .any(|p| p.file_name == enabled_name && p.enabled);
    }
    Ok(registry)
}

pub fn toggle_plugin(file_name: String, enabled: bool) -> Result<(), String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let dir = plugins_dir();
    let src_path = dir.join(&file_name);
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
    fs::rename(src_path, dir.join(&dest_file_name))
        .map_err(|e| format!("Failed to rename plugin: {}", e))?;
    write_audit_entry(&file_name, if enabled { "enabled" } else { "disabled" });
    Ok(())
}

pub async fn install_plugin(
    url: String,
    lua: std::sync::Arc<std::sync::Mutex<crate::lua::LuaEngine>>,
    app_state: std::sync::Arc<std::sync::Mutex<crate::AppState>>,
    broadcaster: crate::bridge::WsBroadcaster,
) -> Result<(), String> {
    let parsed_url = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let file_name = file_name_from_url(&parsed_url)?;
    download_plugin_file(&parsed_url, &file_name, None).await?;
    write_audit_entry(&file_name, "installed_from_url");
    reload_plugins_bridge(lua, app_state, broadcaster).await
}

pub async fn install_plugin_from_registry(
    plugin_id: String,
    lua: std::sync::Arc<std::sync::Mutex<crate::lua::LuaEngine>>,
    app_state: std::sync::Arc<std::sync::Mutex<crate::AppState>>,
    broadcaster: crate::bridge::WsBroadcaster,
) -> Result<(), String> {
    validate_plugin_id(&plugin_id)?;
    let registry = fetch_registry_raw().await?;
    let plugin = registry
        .plugins
        .into_iter()
        .find(|p| p.id == plugin_id)
        .ok_or_else(|| {
            format!(
                "Plugin '{}' was not found in the marketplace registry",
                plugin_id
            )
        })?;

    validate_safe_lua_file_name(&plugin.lua_file, false)?;
    let parsed_url = reqwest::Url::parse(&plugin.download_url)
        .map_err(|e| format!("Invalid plugin download URL: {}", e))?;
    validate_marketplace_download_url(&parsed_url)?;
    download_plugin_file(&parsed_url, &plugin.lua_file, plugin.sha256.as_deref()).await?;
    write_audit_entry(&plugin.lua_file, "installed_from_registry");
    reload_plugins_bridge(lua, app_state, broadcaster).await
}

pub async fn uninstall_plugin(plugin_id: String) -> Result<(), String> {
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

    let dir = plugins_dir();
    let mut removed = false;
    for file_name in candidates {
        validate_safe_lua_file_name(&file_name, true)?;
        let path = dir.join(&file_name);
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Failed to remove plugin: {}", e))?;
            removed = true;
        }
    }

    if !removed {
        return Err(format!("Plugin '{}' is not installed", plugin_id));
    }

    write_audit_entry(&plugin_id, "uninstalled");
    Ok(())
}

pub fn read_plugin(file_name: String) -> Result<String, String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let path = plugins_dir().join(&file_name);
    if !path.exists() {
        return Err("Plugin file does not exist".to_string());
    }

    fs::read_to_string(path).map_err(|e| format!("Failed to read plugin file: {}", e))
}

pub fn save_plugin(file_name: String, content: String) -> Result<(), String> {
    validate_safe_lua_file_name(&file_name, true)?;

    let path = plugins_dir().join(&file_name);
    fs::write(path, content).map_err(|e| format!("Failed to save plugin file: {}", e))?;
    write_audit_entry(&file_name, "saved");
    Ok(())
}

/// Reload the Lua plugin runtime using the bridge's `Arc<Mutex<LuaEngine>>` and broadcaster.
/// This is the production reload path for the bridge architecture.
pub async fn reload_plugins_bridge(
    lua: std::sync::Arc<std::sync::Mutex<crate::lua::LuaEngine>>,
    app_state: std::sync::Arc<std::sync::Mutex<crate::AppState>>,
    broadcaster: crate::bridge::WsBroadcaster,
) -> Result<(), String> {
    broadcaster.emit("plugin_reload_start", ());
    let dir = plugins_dir();
    let bc = broadcaster.clone();
    let result: Result<(), String> = tokio::task::spawn_blocking(move || {
        let new_engine = crate::lua::LuaEngine::new(app_state, bc)
            .map_err(|e| format!("Failed to create new Lua engine: {}", e))?;
        new_engine.load_plugins(&dir)?;
        let mut engine = lua
            .lock()
            .map_err(|e| format!("Lua mutex lock failed: {}", e))?;
        *engine = new_engine;
        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(()) => {
            write_audit_entry("*", "reload_done");
            broadcaster.emit("plugin_reload_done", ());
        }
        Err(err) => {
            broadcaster.emit("plugin_reload_error", err.clone());
        }
    }
    result
}

/// Legacy reload path kept for callers that still hold an `AppHandle` stub.
/// In the bridge architecture this is a no-op; use `reload_plugins_bridge` instead.
pub async fn reload_plugins(_app_handle: AppHandle) -> Result<(), String> {
    Err("reload_plugins: use reload_plugins_bridge in the bridge architecture".to_string())
}

/// Scan the plugins directory and return metadata for every `.lua` / `.lua.disabled` file.
/// Parses the plugin manifest header to populate name/version/author/description/permissions.
pub fn list_local_plugins() -> Result<Vec<PluginInfo>, String> {
    let dir = plugins_dir();

    let mut list = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read plugins dir: {}", e))?;

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
            let stem = if is_lua {
                file_name_str[..file_name_str.len() - 4].to_string()
            } else {
                file_name_str[..file_name_str.len() - 13].to_string()
            };

            // Parse manifest from the file header.
            let manifest = fs::read_to_string(&path)
                .map(|src| PluginManifest::parse(&src))
                .unwrap_or_default();

            list.push(PluginInfo {
                name: manifest.name.unwrap_or_else(|| stem.clone()),
                file_name: file_name_str.to_string(),
                enabled: is_lua,
                id: None,
                author: manifest.author,
                version: manifest.version,
                description: manifest.description,
                tags: Vec::new(),
                marketplace: false,
                permissions: manifest.permissions,
            });
        }
    }

    list.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(list)
}

/// Append a timestamped entry to the plugin audit log.
fn write_audit_entry(plugin: &str, action: &str) {
    use std::io::Write;
    let log_path = audit_log_path();
    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let ts = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ");
        let _ = writeln!(f, "{} plugin={} action={}", ts, plugin, action);
    }
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

async fn download_plugin_file(
    url: &reqwest::Url,
    file_name: &str,
    expected_sha256: Option<&str>,
) -> Result<(), String> {
    if url.scheme() != "https" {
        return Err("Plugin downloads must use HTTPS".to_string());
    }
    validate_safe_lua_file_name(file_name, false)?;

    let dir = plugins_dir();

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
        return Err(format!(
            "Plugin download returned HTTP {}",
            response.status()
        ));
    }

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read plugin content: {}", e))?;
    if body.len() > 512 * 1024 {
        return Err(
            "Plugin file is too large; marketplace plugins must be under 512KB".to_string(),
        );
    }

    // SECURITY: Verify SHA-256 integrity if the registry publishes a hash.
    if let Some(expected) = expected_sha256 {
        let expected = expected.trim().to_ascii_lowercase();
        if !expected.is_empty() {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(&body);
            let actual: String = hash.iter().map(|b| format!("{:02x}", b)).collect();
            if actual != expected {
                return Err(format!(
                    "Plugin integrity check failed. Expected SHA-256 {} but got {}. The plugin may have been tampered with.",
                    expected, actual
                ));
            }
        }
    }

    fs::write(dir.join(file_name), body)
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
        || !plugin_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
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
    let valid_suffix =
        file_name.ends_with(".lua") || (allow_disabled && file_name.ends_with(".lua.disabled"));
    if file_name.is_empty()
        || !valid_suffix
        || file_name.contains("..")
        || file_name.contains('/')
        || file_name.contains('\\')
        || !file_name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
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
        let url =
            reqwest::Url::parse("https://raw.githubusercontent.com/org/repo/main/weather.lua")
                .unwrap();
        assert_eq!(file_name_from_url(&url).unwrap(), "weather.lua");
    }

    #[test]
    fn marketplace_downloads_are_github_only() {
        let good =
            reqwest::Url::parse("https://raw.githubusercontent.com/org/repo/main/weather.lua")
                .unwrap();
        let bad = reqwest::Url::parse("https://example.com/weather.lua").unwrap();
        assert!(validate_marketplace_download_url(&good).is_ok());
        assert!(validate_marketplace_download_url(&bad).is_err());
    }
}
