use crate::paths::user_config_dir;
use crate::AppState;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

use crate::plugin_mgr;
use crate::whisper;

// ─────────────────────────────────────────────────────────────────────────────
// Audio Recording & Whisper STT
// ─────────────────────────────────────────────────────────────────────────────

pub fn start_recording(state: Arc<Mutex<AppState>>) -> Result<String, String> {
    let mut app = state.lock().map_err(|e| e.to_string())?;

    let wav_path = user_config_dir().join("temp_record.wav");

    if cfg!(target_os = "linux") {
        match crate::audio_recorder::start_arecord(&wav_path) {
            Ok(child) => {
                app.record_child = Some(child);
                Ok("Recording started...".to_string())
            }
            Err(e) => Err(e),
        }
    } else {
        match crate::audio_recorder::start_cpal_recording(&wav_path) {
            Ok(stop_flag) => {
                app.record_stop_flag = Some(stop_flag);
                Ok("Recording started...".to_string())
            }
            Err(e) => Err(e),
        }
    }
}

pub async fn transcribe_audio_whisper(state: Arc<Mutex<AppState>>) -> Result<String, String> {
    let (binary, model) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        (app.whisper_binary.clone(), app.whisper_model.clone())
    };
    if model.is_empty() {
        return Err(
            "Whisper model path not set. Go to Settings → Voice to download a model or set an existing one.".to_string(),
        );
    }
    if !std::path::Path::new(&model).exists() {
        return Err(format!(
            "Whisper model not found at '{}'. Go to Settings → Voice to download it.",
            model
        ));
    }
    let wav_str = user_config_dir()
        .join("temp_record.wav")
        .to_string_lossy()
        .to_string();
    tokio::task::spawn_blocking(move || whisper::transcribe(&wav_str, &binary, &model))
        .await
        .map_err(|e| format!("Thread error: {}", e))?
}

pub async fn stop_recording(state: Arc<Mutex<AppState>>) -> Result<String, String> {
    let (record_child, record_stop_flag) = {
        let mut app = state.lock().map_err(|e| e.to_string())?;
        (app.record_child.take(), app.record_stop_flag.take())
    };

    if let Some(mut child) = record_child {
        let _ = child.kill();
        let _ = child.wait();
    }

    if let Some(flag) = record_stop_flag {
        flag.store(true, Ordering::Relaxed);
        // Give cpal a moment to flush the WAV file.
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }

    let wav_path = user_config_dir().join("temp_record.wav");
    let audio_data = std::fs::read(&wav_path);
    if let Ok(data) = audio_data {
        // Try whisper.cpp first if model is configured and file exists
        let (whisper_binary, whisper_model) = {
            let app = state.lock().map_err(|e| e.to_string())?;
            (app.whisper_binary.clone(), app.whisper_model.clone())
        };
        if !whisper_model.is_empty() && std::path::Path::new(&whisper_model).exists() {
            let bin = whisper_binary.clone();
            let mdl = whisper_model.clone();
            let wav_str = wav_path.to_string_lossy().to_string();
            let result = tokio::task::spawn_blocking(move || {
                crate::whisper::transcribe(&wav_str, &bin, &mdl)
            })
            .await;
            if let Ok(Ok(text)) = result {
                return Ok(text);
            }
        }

        let provider = {
            let app = state.lock().map_err(|e| e.to_string())?;
            app.provider.clone()
        };
        match provider.transcribe_audio(&data).await {
            Ok(text) => Ok(text),
            Err(e) => Err(format!("Error transcribing: {}", e)),
        }
    } else {
        Err("No audio recording found. Start recording first with the mic button, or configure Whisper STT in Settings.".to_string())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Collaboration & Network
// ─────────────────────────────────────────────────────────────────────────────

/// Discover canvas collab peers on the local network via mDNS.
/// Browses for `_neurodeck-canvas._tcp` services for ~2.5 seconds.
pub fn discover_canvas_peers() -> Result<Vec<serde_json::Value>, String> {
    let daemon = mdns_sd::ServiceDaemon::new().map_err(|e| e.to_string())?;
    let service_type = "_neurodeck-canvas._tcp.local.";
    let receiver = daemon.browse(service_type).map_err(|e| e.to_string())?;

    let mut peers = Vec::new();
    let start = std::time::Instant::now();
    while start.elapsed() < std::time::Duration::from_millis(2500) {
        match receiver.recv_timeout(std::time::Duration::from_millis(200)) {
            Ok(mdns_sd::ServiceEvent::ServiceResolved(info)) => {
                let hostname = info.get_hostname().to_string();
                let port = info.get_port();
                let props = info.get_properties();
                let display_name = props
                    .get_property_val_str("hostname")
                    .unwrap_or(&hostname)
                    .to_string();
                // Extract IP address from hostname or use a heuristic
                let ip = info
                    .get_addresses()
                    .iter()
                    .next()
                    .map(|a| a.to_string())
                    .unwrap_or_else(|| {
                        // Fallback: try to resolve .local hostname
                        hostname.trim_end_matches(".local.").to_string()
                    });
                peers.push(serde_json::json!({
                    "name": display_name,
                    "hostname": hostname,
                    "ip": ip,
                    "port": port,
                    "addr": format!("{}:{}", ip, port)
                }));
            }
            Ok(mdns_sd::ServiceEvent::SearchStopped(_)) => break,
            _ => {}
        }
    }

    // Deduplicate by address
    peers.sort_by(|a, b| a["addr"].as_str().cmp(&b["addr"].as_str()));
    peers.dedup_by(|a, b| a["addr"].as_str() == b["addr"].as_str());

    Ok(peers)
}

pub fn get_lan_ip() -> String {
    match std::net::UdpSocket::bind("0.0.0.0:0") {
        Ok(sock) => {
            if sock.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = sock.local_addr() {
                    return addr.ip().to_string();
                }
            }
            "unknown".to_string()
        }
        Err(_) => "unknown".to_string(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Observability: Support Bundle + System Health
// ─────────────────────────────────────────────────────────────────────────────

pub fn redact_line(line: &str) -> String {
    let mut out = line.to_string();
    // Simple textual redaction — not regex-based to avoid an extra crate.
    // Replace literal token-like strings using heuristic substrings.
    for redaction in [
        ("AIza", "[REDACTED_API_KEY]"),
        ("GOCSPX-", "[REDACTED_OAUTH_SECRET]"),
        ("Bearer ", "Bearer [REDACTED_TOKEN]"),
    ] {
        if let Some(pos) = out.find(redaction.0) {
            // Replace the marker and the token that follows it. The token
            // ends at the next whitespace or quote boundary.
            let prefix = &out[..pos];
            let rest = &out[pos..];
            let marker_len = redaction.0.len();
            let token_end = marker_len
                + rest[marker_len..]
                    .find(|c: char| c.is_whitespace() || c == '"' || c == '\'')
                    .unwrap_or(rest.len() - marker_len);
            out = format!("{}{}{}", prefix, redaction.1, &rest[token_end..]);
        }
    }
    // Redact passwords/secrets in toml-style `key = "value"` lines
    let lower = out.to_lowercase();
    if lower.contains("password") || lower.contains("secret") || lower.contains("api_key") {
        if let Some(eq_pos) = out.find('=') {
            let key_part = &out[..=eq_pos];
            out = format!("{} [REDACTED]", key_part.trim_end());
        }
    }
    out
}

/// Collect the tail of a log file (last `max_lines` lines), redacting secrets.
fn collect_log_tail(path: &Path, max_lines: usize) -> Vec<String> {
    let Ok(content) = std::fs::read_to_string(path) else {
        return vec!["[could not read log file]".to_string()];
    };
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    lines[start..].iter().map(|l| redact_line(l)).collect()
}

#[derive(serde::Serialize)]
pub struct SupportBundleResult {
    pub path: String,
    pub size_bytes: u64,
    pub sections: Vec<String>,
}

/// Generate a redacted support bundle in `user_config_dir()/exports/`.
pub fn generate_support_bundle(state: Arc<Mutex<AppState>>) -> Result<SupportBundleResult, String> {
    let config_dir = user_config_dir();
    let exports_dir = config_dir.join("exports");
    std::fs::create_dir_all(&exports_dir).map_err(|e| format!("exports dir: {}", e))?;

    let timestamp = {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    };
    let bundle_path = exports_dir.join(format!("support_bundle_{}.txt", timestamp));
    let mut sections: Vec<String> = Vec::new();
    let mut buf = String::new();

    // ── Section: header ──────────────────────────────────────────────────────
    buf.push_str(&format!(
        "NEURODECK Support Bundle\nGenerated: {} (Unix seconds)\n{}\n\n",
        timestamp,
        "=".repeat(60)
    ));
    sections.push("header".to_string());

    // ── Section: platform ────────────────────────────────────────────────────
    buf.push_str("## PLATFORM\n");
    buf.push_str(&format!("OS:           {}\n", std::env::consts::OS));
    buf.push_str(&format!("Arch:         {}\n", std::env::consts::ARCH));
    buf.push_str(&format!("Config dir:   {}\n", config_dir.display()));
    buf.push_str(&format!(
        "Safe mode:    {}\n",
        std::env::var("NEURODECK_SAFE_MODE").is_ok()
    ));

    // Disk space at config dir (best-effort)
    #[cfg(target_os = "linux")]
    {
        if let Ok(stat) = nix::sys::statvfs::statvfs(&config_dir) {
            let free_mb = stat.blocks_free() * stat.block_size() / 1024 / 1024;
            buf.push_str(&format!("Free disk:    {} MB\n", free_mb));
        }
    }
    buf.push('\n');
    sections.push("platform".to_string());

    // ── Section: version / KFMS ──────────────────────────────────────────────
    buf.push_str("## VERSION\n");
    let meta_path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("infra/meta/meta.json");
    if let Ok(meta_str) = std::fs::read_to_string(&meta_path) {
        if let Ok(meta_val) = serde_json::from_str::<serde_json::Value>(&meta_str) {
            let version = meta_val
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let codename = meta_val
                .pointer("/codename/name")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            buf.push_str(&format!("KFMS version: {} ({})\n", version, codename));
        }
    } else {
        buf.push_str("KFMS meta: not found\n");
    }
    buf.push('\n');
    sections.push("version".to_string());

    // ── Section: config summary ──────────────────────────────────────────────
    buf.push_str("## CONFIG SUMMARY (secrets redacted)\n");
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        buf.push_str(&format!(
            "Provider:     {}\n",
            app.config.llm.default_provider
        ));
        buf.push_str(&format!("Gemini model: {}\n", app.config.llm.gemini_model));
        buf.push_str(&format!("Ollama model: {}\n", app.config.llm.ollama_model));
        buf.push_str(&format!(
            "Ollama URL:   {}\n",
            app.config.llm.ollama_base_url
        ));
        let key_env = std::env::var("GEMINI_API_KEY").is_ok();
        buf.push_str(&format!(
            "Gemini key:   {}\n",
            if key_env {
                "[SET via env]"
            } else {
                "[keychain or unset]"
            }
        ));
    }
    buf.push('\n');
    sections.push("config".to_string());

    // ── Section: plugins ─────────────────────────────────────────────────────
    buf.push_str("## PLUGINS\n");
    let plugins_dir = plugin_mgr::plugins_dir();
    if plugins_dir.is_dir() {
        let mut plugin_count = 0usize;
        let mut disabled_count = 0usize;
        if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".lua") {
                    plugin_count += 1;
                    buf.push_str(&format!("  [active]   {}\n", name));
                } else if name.ends_with(".lua.disabled") {
                    disabled_count += 1;
                    buf.push_str(&format!("  [disabled] {}\n", name));
                }
            }
        }
        buf.push_str(&format!(
            "Total: {} active, {} disabled\n",
            plugin_count, disabled_count
        ));
    } else {
        buf.push_str("Plugins directory not found\n");
    }
    buf.push('\n');
    sections.push("plugins".to_string());

    // ── Section: memory stats ────────────────────────────────────────────────
    buf.push_str("## MEMORY DB\n");
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(ref db) = app.mem_db {
            let doc_count = db.list_all().map(|v| v.len()).unwrap_or(0);
            buf.push_str(&format!("Status:  ready\nDocs:    {}\n", doc_count));
        } else {
            buf.push_str("Status:  not initialized\n");
        }
    }
    buf.push('\n');
    sections.push("memory".to_string());

    // ── Section: logs ────────────────────────────────────────────────────────
    buf.push_str("## LOGS (last 150 lines each, secrets redacted)\n");
    let logs_dir = config_dir.join("logs");
    if logs_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&logs_dir) {
            let mut log_files: Vec<PathBuf> = entries
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("log"))
                .collect();
            log_files.sort();
            for log_path in &log_files {
                let name = log_path.file_name().unwrap_or_default().to_string_lossy();
                buf.push_str(&format!("\n### {}\n", name));
                for line in collect_log_tail(log_path, 150) {
                    buf.push_str(&line);
                    buf.push('\n');
                }
                sections.push(format!("log:{}", name));
            }
        }
    } else {
        buf.push_str("Logs directory not found\n");
    }
    buf.push('\n');

    // ── Section: audit log ───────────────────────────────────────────────────
    let audit_path = plugin_mgr::audit_log_path();
    if audit_path.exists() {
        buf.push_str("## PLUGIN AUDIT LOG (last 50 lines)\n");
        for line in collect_log_tail(&audit_path, 50) {
            buf.push_str(&line);
            buf.push('\n');
        }
        buf.push('\n');
        sections.push("plugin_audit".to_string());
    }

    // ── Write bundle ─────────────────────────────────────────────────────────
    std::fs::write(&bundle_path, &buf).map_err(|e| format!("write bundle: {}", e))?;
    let size_bytes = std::fs::metadata(&bundle_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(SupportBundleResult {
        path: bundle_path.to_string_lossy().to_string(),
        size_bytes,
        sections,
    })
}

#[derive(serde::Serialize)]
pub struct SystemHealthReport {
    pub status: String, // "healthy" | "degraded" | "critical"
    pub safe_mode: bool,
    pub provider: String,
    pub model: String,
    pub memory_db_ready: bool,
    pub memory_doc_count: usize,
    pub plugin_count: usize,
    pub plugin_disabled_count: usize,
    pub config_valid: bool,
    pub kfms_version: String,
    pub issues: Vec<String>,
}

/// Extended health check returning structured diagnostics.
pub fn get_system_health(state: Arc<Mutex<AppState>>) -> SystemHealthReport {
    let mut issues: Vec<String> = Vec::new();

    // Safe mode
    let safe_mode = std::env::var("NEURODECK_SAFE_MODE").is_ok();

    // Provider / config
    let (provider, model, key_set, config_valid) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        let provider = app.config.llm.default_provider.clone();
        let model = if provider == "gemini" {
            app.config.llm.gemini_model.clone()
        } else {
            app.config.llm.ollama_model.clone()
        };
        let key_set = std::env::var("GEMINI_API_KEY").is_ok();
        (provider, model, key_set, true)
    };

    if provider == "gemini" && !key_set {
        issues.push("Gemini provider selected but API key is not set".to_string());
    }

    // Memory DB
    let (mem_ready, mem_count) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(ref db) = app.mem_db {
            let count = db.list_all().map(|v| v.len()).unwrap_or(0);
            (true, count)
        } else {
            issues.push("Memory database not initialized".to_string());
            (false, 0)
        }
    };

    // Plugins
    let plugins_dir = plugin_mgr::plugins_dir();
    let (plugin_count, plugin_disabled) = if plugins_dir.is_dir() {
        let mut active = 0usize;
        let mut disabled = 0usize;
        if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".lua") {
                    active += 1;
                } else if name.ends_with(".lua.disabled") {
                    disabled += 1;
                }
            }
        }
        (active, disabled)
    } else {
        (0, 0)
    };

    // KFMS version
    let kfms_version = {
        let meta_path = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("infra/meta/meta.json");
        std::fs::read_to_string(&meta_path)
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| {
                v.get("version")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "unknown".to_string())
    };

    if safe_mode {
        issues.push("Running in safe mode — plugins are disabled".to_string());
    }

    let status = if issues
        .iter()
        .any(|i| i.contains("database") || i.contains("critical"))
    {
        "critical"
    } else if issues.is_empty() {
        "healthy"
    } else {
        "degraded"
    }
    .to_string();

    SystemHealthReport {
        status,
        safe_mode,
        provider,
        model,
        memory_db_ready: mem_ready,
        memory_doc_count: mem_count,
        plugin_count,
        plugin_disabled_count: plugin_disabled,
        config_valid,
        kfms_version,
        issues,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Backup
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize)]
pub struct NdmemEnvelope {
    pub ndmem_version: String,
    pub exported_at: String,
    pub record_count: usize,
    pub records: Vec<crate::memory::MemoryRecord>,
}

fn memory_backup_dir() -> PathBuf {
    user_config_dir()
        .join("data")
        .join("memory")
        .join("backups")
}

pub fn run_memory_backup(db: &crate::memory::MemoryDB) -> Result<String, String> {
    let records = db.export_all_records()?;
    let backup_dir = memory_backup_dir();
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("Cannot create backup dir: {}", e))?;

    let envelope = NdmemEnvelope {
        ndmem_version: "1.0".into(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        record_count: records.len(),
        records,
    };
    let json = serde_json::to_string_pretty(&envelope)
        .map_err(|e| format!("Serialization error: {}", e))?;

    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("backup_{}.ndmem", ts);
    let dest = backup_dir.join(&filename);
    std::fs::write(&dest, &json).map_err(|e| format!("Failed to write backup: {}", e))?;

    // Prune: keep only the 5 most recent backups
    if let Ok(entries) = std::fs::read_dir(&backup_dir) {
        let mut files: Vec<std::path::PathBuf> = entries
            .flatten()
            .filter(|e| e.path().extension().map(|x| x == "ndmem").unwrap_or(false))
            .map(|e| e.path())
            .collect();
        files.sort();
        if files.len() > 5 {
            for old in &files[..files.len() - 5] {
                let _ = std::fs::remove_file(old);
            }
        }
    }

    Ok(dest.to_string_lossy().into_owned())
}

#[derive(serde::Serialize)]
pub struct DiagnosticResult {
    pub pty_ok: bool,
    pub pty_details: String,
    pub network_ok: bool,
    pub network_details: String,
    pub keychain_ok: bool,
    pub keychain_details: String,
    pub audio_ok: bool,
    pub audio_details: String,
    pub ssh_ok: bool,
    pub ssh_details: String,
    pub tts_ok: bool,
    pub tts_details: String,
}

pub async fn run_onboarding_diagnostics() -> Result<DiagnosticResult, String> {
    // 1. Check PTY access
    let pty_ok = std::panic::catch_unwind(|| {
        let pty_system = portable_pty::native_pty_system();
        pty_system
            .openpty(portable_pty::PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .is_ok()
    })
    .unwrap_or(false);

    let pty_details = if pty_ok {
        let shell = if cfg!(target_os = "windows") {
            "powershell.exe"
        } else {
            "bash"
        };
        format!("Shell Subsystem active (Default: {})", shell)
    } else {
        "Failed to open PTY device".to_string()
    };

    // 2. Check Network status
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let network_res = client
        .get("https://generativelanguage.googleapis.com/")
        .send()
        .await;

    let (network_ok, network_details) = match network_res {
        Ok(_) => (true, "Gemini API endpoint reachable".to_string()),
        Err(e) => {
            if client.get("https://www.google.com").send().await.is_ok() {
                (
                    true,
                    "Internet active, but Gemini endpoint restricted".to_string(),
                )
            } else {
                (false, format!("Network unreachable: {}", e))
            }
        }
    };

    // 3. Check Keychain access
    let keychain_res =
        std::panic::catch_unwind(neurodeck_infrastructure::secrets::test_keychain_access);

    let (keychain_ok, keychain_details) = match keychain_res {
        Ok(Ok(())) => (true, "Secure credential storage active".to_string()),
        Ok(Err(e)) => (false, format!("Keychain error: {}", e)),
        Err(_) => (false, "Panic while accessing keyring".to_string()),
    };

    // 4. Check Audio (arecord on Linux, check audio device on Windows)
    let (audio_ok, audio_details) = tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            let out = std::process::Command::new("powershell")
                .args(["-NoProfile", "-Command",
                    "Get-PnpDevice -Class AudioEndpoint -Status OK | Where-Object { $_.FriendlyName -match 'Microphone|Input|Capture' } | Measure-Object | Select-Object -ExpandProperty Count"])
                .output();
            match out {
                Ok(o) if o.status.success() => {
                    let count_str = String::from_utf8_lossy(&o.stdout).trim().to_string();
                    let count: u32 = count_str.parse().unwrap_or(0);
                    if count > 0 {
                        (true, format!("{} audio input device(s) found", count))
                    } else {
                        (false, "No audio input devices detected".to_string())
                    }
                }
                _ => (false, "Could not query audio devices".to_string()),
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            if std::process::Command::new("which").arg("arecord").output()
                .map(|o| o.status.success()).unwrap_or(false)
            {
                (true, "ALSA audio (arecord) available".to_string())
            } else if std::process::Command::new("which").arg("pactl").output()
                .map(|o| o.status.success()).unwrap_or(false)
            {
                (true, "PulseAudio/PipeWire (pactl) available".to_string())
            } else {
                (false, "No audio tools found (arecord/pactl)".to_string())
            }
        }
    }).await.unwrap_or((false, "Audio check panicked".to_string()));

    // 5. Check SSH binary availability
    let (ssh_ok, ssh_details) = tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        let ssh_bin = "ssh.exe";
        #[cfg(not(target_os = "windows"))]
        let ssh_bin = "ssh";

        let found = std::process::Command::new(ssh_bin)
            .arg("-V")
            .output()
            .map(|o| o.status.success() || !o.stderr.is_empty())
            .unwrap_or(false);

        if found {
            let ver = std::process::Command::new(ssh_bin)
                .arg("-V")
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stderr).trim().to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "SSH binary found".to_string());
            (true, ver)
        } else {
            (false, "SSH binary not found in PATH".to_string())
        }
    })
    .await
    .unwrap_or((false, "SSH check panicked".to_string()));

    // 6. Check TTS binary availability
    let (tts_ok, tts_details) = tokio::task::spawn_blocking(|| {
        #[cfg(target_os = "windows")]
        {
            (true, "Windows SAPI TTS available".to_string())
        }
        #[cfg(target_os = "macos")]
        {
            let found = std::process::Command::new("say")
                .arg("--version")
                .output()
                .map(|_| true)
                .unwrap_or(false);
            if found {
                (true, "macOS `say` TTS available".to_string())
            } else {
                (false, "`say` command not found".to_string())
            }
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            if std::process::Command::new("which")
                .arg("espeak-ng")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                (true, "espeak-ng TTS available".to_string())
            } else if std::process::Command::new("which")
                .arg("espeak")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                (true, "espeak TTS available".to_string())
            } else {
                (false, "No TTS engine found (install espeak-ng)".to_string())
            }
        }
    })
    .await
    .unwrap_or((false, "TTS check panicked".to_string()));

    Ok(DiagnosticResult {
        pty_ok,
        pty_details,
        network_ok,
        network_details,
        keychain_ok,
        keychain_details,
        audio_ok,
        audio_details,
        ssh_ok,
        ssh_details,
        tts_ok,
        tts_details,
    })
}

/// Read the most recent screenshot from Steam or system Pictures directories.
/// Returns a map with keys: `path`, `data` (base64), `mime`.
pub async fn read_last_screenshot() -> Result<HashMap<String, String>, String> {
    let mut candidate_dirs: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let home_path = PathBuf::from(&home);

            let userdata = home_path.join(".local/share/Steam/userdata");
            if let Ok(entries) = std::fs::read_dir(&userdata) {
                for entry in entries.flatten() {
                    let remote_760 = entry.path().join("760/remote");
                    if let Ok(game_entries) = std::fs::read_dir(&remote_760) {
                        for game_entry in game_entries.flatten() {
                            let ss_dir = game_entry.path().join("screenshots");
                            if ss_dir.is_dir() {
                                candidate_dirs.push(ss_dir);
                            }
                        }
                    }
                }
            }

            for rel in &["Pictures/Screenshots", "Pictures"] {
                let p = home_path.join(rel);
                if p.is_dir() {
                    candidate_dirs.push(p);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let p = PathBuf::from(&userprofile).join("Pictures\\Screenshots");
            if p.is_dir() {
                candidate_dirs.push(p);
            }
        }
        for steam_root in &[
            r"C:\Program Files (x86)\Steam\userdata",
            r"C:\Program Files\Steam\userdata",
        ] {
            let steam_path = PathBuf::from(steam_root);
            if let Ok(entries) = std::fs::read_dir(&steam_path) {
                for entry in entries.flatten() {
                    let remote_760 = entry.path().join("760\\remote");
                    if let Ok(game_entries) = std::fs::read_dir(&remote_760) {
                        for game_entry in game_entries.flatten() {
                            let ss_dir = game_entry.path().join("screenshots");
                            if ss_dir.is_dir() {
                                candidate_dirs.push(ss_dir);
                            }
                        }
                    }
                }
            }
        }
    }

    if candidate_dirs.is_empty() {
        return Err("No screenshot directories found".to_string());
    }

    let image_extensions = ["png", "jpg", "jpeg", "webp", "bmp"];
    let mut best_path: Option<PathBuf> = None;
    let mut best_modified = std::time::SystemTime::UNIX_EPOCH;

    for dir in &candidate_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_lowercase())
                    .unwrap_or_default();
                if !image_extensions.contains(&ext.as_str()) {
                    continue;
                }
                if let Ok(meta) = std::fs::metadata(&path) {
                    if let Ok(modified) = meta.modified() {
                        if modified > best_modified {
                            best_modified = modified;
                            best_path = Some(path);
                        }
                    }
                }
            }
        }
    }

    let path = best_path.ok_or_else(|| "No screenshot files found".to_string())?;

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_else(|| "png".to_string());

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    };

    let data = std::fs::read(&path).map_err(|e| format!("Failed to read screenshot: {}", e))?;

    use base64::Engine as _;
    let b64 = base64::prelude::BASE64_STANDARD.encode(&data);

    let mut result = HashMap::new();
    result.insert("path".to_string(), path.to_string_lossy().to_string());
    result.insert("data".to_string(), b64);
    result.insert("mime".to_string(), mime.to_string());

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{get_lan_ip, redact_line};

    #[test]
    fn lan_ip_returns_non_empty() {
        let ip = get_lan_ip();
        assert!(!ip.is_empty());
        assert!(
            ip == "unknown" || ip.contains('.'),
            "get_lan_ip should return an IP or 'unknown', got: {}",
            ip
        );
    }

    #[test]
    fn redact_line_scrubs_gemini_key() {
        let line = "model endpoint key: AIzaSyD-1234567890abcdefg";
        let out = redact_line(line);
        assert!(out.contains("[REDACTED_API_KEY]"), "got: {}", out);
        assert!(!out.contains("AIzaSyD"));
    }

    #[test]
    fn redact_line_scrubs_oauth_secret() {
        // A line explicitly containing "secret" is fully redacted by the
        // generic password/secret rule before the OAuth marker is reached.
        let line = "client_secret = GOCSPX-abc123def456";
        let out = redact_line(line);
        assert!(out.contains("client_secret = [REDACTED]"), "got: {}", out);
        assert!(!out.contains("GOCSPX-abc"));
    }

    #[test]
    fn redact_line_scrubs_bearer_token() {
        let line = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        let out = redact_line(line);
        assert!(out.contains("Bearer [REDACTED_TOKEN]"), "got: {}", out);
        assert!(!out.contains("eyJhbGci"));
    }

    #[test]
    fn redact_line_scrubs_config_api_key_value() {
        let line = r#"api_key = "AIzaSyD-1234567890abcdefg""#;
        let out = redact_line(line);
        assert!(out.contains("api_key = [REDACTED]"), "got: {}", out);
        assert!(!out.contains("AIzaSyD"));
    }

    #[test]
    fn redact_line_scrubs_password_value() {
        let line = r#"password = "super_secret_123""#;
        let out = redact_line(line);
        assert!(out.contains("password = [REDACTED]"), "got: {}", out);
        assert!(!out.contains("super_secret_123"));
    }

    #[test]
    fn redact_line_leaves_innocuous_lines_intact() {
        let line = r#"provider = "ollama""#;
        assert_eq!(redact_line(line), line);
    }
}
