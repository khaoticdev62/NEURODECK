mod config;
mod llm;
pub mod memory;
mod storage;
mod lua;
mod pty_manager;
mod tunnel;
mod transfer;
mod ftp;
mod sftp;
mod ollama_mgr;
mod plugin_mgr;
mod computer_use;
mod mcp;
mod whisper;
mod canvas_collab;
mod remote_control;
mod autocomplete;
mod doc_indexer;
mod torrent;
pub mod sync;
pub mod commands;
use crate::commands::*;

use std::collections::HashMap;
use std::sync::atomic::AtomicUsize;
use std::sync::{Arc, Mutex};
use std::path::{Path, PathBuf};
use tauri::Manager;
use chrono::Utc;

use crate::llm::{LlmProvider, GeminiProvider, OllamaProvider};
use crate::memory::MemoryDB;

#[derive(Clone, serde::Serialize)]
pub(crate) struct Theme {
    name: String,
    color: String,
    pulse: Vec<String>,
    background: String,
    foreground: String,
    accent: String,
    response: String,
    warning: String,
    error: String,
}

lazy_static::lazy_static! {
    pub static ref PERSONAS: Vec<(String, String)> = vec![
        ("Default".to_string(), "You are a helpful assistant.".to_string()),
        ("Developer".to_string(), "You are an expert software developer. Give concise code answers.".to_string()),
        ("Cyberpunk".to_string(), "You are an AI construct in a cyberpunk world. Use terminal lingo and be edgy.".to_string()),
        ("John".to_string(), "You are John, the Product Manager. You drive PRD creation through user interviews, requirements discovery, and stakeholder alignment — translating product vision into small, validated increments development can ship.".to_string()),
        ("Sally".to_string(), "You are Sally, the UX Designer. You design clean, premium, and highly responsive user interfaces. You focus on visual elegance, intuitive workflows, HSL tailored colors, and micro-animations.".to_string()),
        ("Winston".to_string(), "You are Winston, the System Architect. You design technical architectures, outline modular systems, choose optimal libraries/dependencies, and establish robust design patterns.".to_string()),
        ("Amelia".to_string(), "You are Amelia, the Senior Developer. You write clean, performant, and secure Rust and Javascript code, and build comprehensive unit and E2E tests.".to_string()),
        ("Paige".to_string(), "You are Paige, the Technical Writer. You write clear, complete, and well-structured markdown documentation, user guides, API docs, and project wikis.".to_string()),
        ("Mary".to_string(), "You are Mary, the Business Analyst. You analyze market requirements, align product features with business goals, and write detailed user stories, epics, and acceptance criteria.".to_string()),
    ];

    pub(crate) static ref THEMES: Vec<Theme> = vec![
        Theme {
            name: "BLACKSITE".to_string(),
            color: "#00F0FF".to_string(),
            pulse: vec![
                "#00F0FF".to_string(), "#00D0DD".to_string(), "#00B0BB".to_string(),
                "#009099".to_string(), "#007077".to_string(), "#005055".to_string(),
                "#007077".to_string(), "#009099".to_string(), "#00B0BB".to_string(),
                "#00D0DD".to_string()
            ],
            background: "#050505".to_string(),
            foreground: "#D9F7FF".to_string(),
            accent: "#00F0FF".to_string(),
            response: "#00FF88".to_string(),
            warning: "#FFB000".to_string(),
            error: "#FF3C5A".to_string(),
        },
        Theme {
            name: "TERMINAL_GHOST".to_string(),
            color: "#00FFCC".to_string(),
            pulse: vec![
                "#00FFCC".to_string(), "#00DDCC".to_string(), "#00BBCC".to_string(),
                "#0099CC".to_string(), "#0077CC".to_string(), "#0055CC".to_string(),
                "#0077CC".to_string(), "#0099CC".to_string(), "#00BBCC".to_string(),
                "#00DDCC".to_string()
            ],
            background: "#000000".to_string(),
            foreground: "#00FF66".to_string(),
            accent: "#00FFCC".to_string(),
            response: "#88FFAA".to_string(),
            warning: "#FFD166".to_string(),
            error: "#EF476F".to_string(),
        },
        Theme {
            name: "SYNTH_GRID".to_string(),
            color: "#FF00FF".to_string(),
            pulse: vec![
                "#FF00FF".to_string(), "#DD00DD".to_string(), "#BB00BB".to_string(),
                "#990099".to_string(), "#770077".to_string(), "#550055".to_string(),
                "#770077".to_string(), "#990099".to_string(), "#BB00BB".to_string(),
                "#DD00DD".to_string()
            ],
            background: "#0F0A1A".to_string(),
            foreground: "#E0E0FF".to_string(),
            accent: "#FF00FF".to_string(),
            response: "#00FFFF".to_string(),
            warning: "#FFC857".to_string(),
            error: "#FF006E".to_string(),
        },
        Theme {
            name: "DECK_BLUE".to_string(),
            color: "#00C0FF".to_string(),
            pulse: vec![
                "#00C0FF".to_string(), "#00A8E0".to_string(), "#0090C0".to_string(),
                "#0078A0".to_string(), "#006080".to_string(), "#004860".to_string(),
                "#006080".to_string(), "#0078A0".to_string(), "#0090C0".to_string(),
                "#00A8E0".to_string()
            ],
            background: "#0A0F1D".to_string(),
            foreground: "#D5F2FF".to_string(),
            accent: "#00C0FF".to_string(),
            response: "#00FFCC".to_string(),
            warning: "#FFAA00".to_string(),
            error: "#FF3B30".to_string(),
        },
        Theme {
            name: "AMBER_CRT".to_string(),
            color: "#FFB000".to_string(),
            pulse: vec![
                "#FFB000".to_string(), "#E69E00".to_string(), "#CC8C00".to_string(),
                "#B37B00".to_string(), "#996900".to_string(), "#805800".to_string(),
                "#996900".to_string(), "#B37B00".to_string(), "#CC8C00".to_string(),
                "#E69E00".to_string()
            ],
            background: "#110A00".to_string(),
            foreground: "#FFCC00".to_string(),
            accent: "#FFB000".to_string(),
            response: "#FFD700".to_string(),
            warning: "#FF8C00".to_string(),
            error: "#FF3300".to_string(),
        },
        Theme {
            name: "CYBER_PUNK".to_string(),
            color: "#FF007F".to_string(),
            pulse: vec![
                "#FF007F".to_string(), "#E60072".to_string(), "#CC0065".to_string(),
                "#B30059".to_string(), "#99004C".to_string(), "#800040".to_string(),
                "#99004C".to_string(), "#B30059".to_string(), "#CC0065".to_string(),
                "#E60072".to_string()
            ],
            background: "#0C0614".to_string(),
            foreground: "#00FFFF".to_string(),
            accent: "#FF007F".to_string(),
            response: "#00FFFF".to_string(),
            warning: "#FFFF00".to_string(),
            error: "#FF0055".to_string(),
        },
        Theme {
            name: "MATRIX".to_string(),
            color: "#00FF00".to_string(),
            pulse: vec![
                "#00FF00".to_string(), "#00E600".to_string(), "#00CC00".to_string(),
                "#00B300".to_string(), "#009900".to_string(), "#008000".to_string(),
                "#009900".to_string(), "#00B300".to_string(), "#00CC00".to_string(),
                "#00E600".to_string()
            ],
            background: "#000000".to_string(),
            foreground: "#33FF33".to_string(),
            accent: "#00FF00".to_string(),
            response: "#88FF88".to_string(),
            warning: "#AABB22".to_string(),
            error: "#FF3333".to_string(),
        },
        Theme {
            name: "SOLARIZED".to_string(),
            color: "#268BD2".to_string(),
            pulse: vec![
                "#268BD2".to_string(), "#227DBE".to_string(), "#1E6FAA".to_string(),
                "#1A6196".to_string(), "#165382".to_string(), "#12456E".to_string(),
                "#165382".to_string(), "#1A6196".to_string(), "#1E6FAA".to_string(),
                "#227DBE".to_string()
            ],
            background: "#002B36".to_string(),
            foreground: "#839496".to_string(),
            accent: "#268BD2".to_string(),
            response: "#859900".to_string(),
            warning: "#CB4B16".to_string(),
            error: "#DC322F".to_string(),
        },
        Theme {
            name: "GLITCH_RED".to_string(),
            color: "#FF3333".to_string(),
            pulse: vec![
                "#FF3333".to_string(), "#E62E2E".to_string(), "#CC2929".to_string(),
                "#B32424".to_string(), "#991F1F".to_string(), "#801A1A".to_string(),
                "#991F1F".to_string(), "#B32424".to_string(), "#CC2929".to_string(),
                "#E62E2E".to_string()
            ],
            background: "#140000".to_string(),
            foreground: "#FFCCCC".to_string(),
            accent: "#FF3333".to_string(),
            response: "#FF6666".to_string(),
            warning: "#FF9900".to_string(),
            error: "#FF0000".to_string(),
        },
    ];
}
pub struct LuaState(pub Mutex<lua::LuaEngine>);

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct CustomPersona {
    pub name: String,
    pub prompt: String,
}

pub struct AppState {
    pub(crate) provider: Arc<dyn LlmProvider>,
    pub(crate) config: config::Config,
    pub(crate) session_id: String,
    pub(crate) messages: Vec<String>,
    pub(crate) active_persona: String,
    pub(crate) mem_db: Option<MemoryDB>,
    pub(crate) record_child: Option<std::process::Child>,
    pub(crate) process_stdin_tx: Option<tokio::sync::mpsc::Sender<String>>,
    pub(crate) kill_tx: Option<tokio::sync::oneshot::Sender<()>>,
    pub(crate) active_process_id: u64,
    pub(crate) cancel_stream_tx: Option<tokio::sync::oneshot::Sender<()>>,
    pub custom_personas: Vec<CustomPersona>,
    pub(crate) mcp_abort: Option<tokio::task::AbortHandle>,
    pub(crate) mcp_port: u16,
    // P17 — Whisper.cpp offline STT
    pub(crate) whisper_binary: String,
    pub(crate) whisper_model: String,
    // P19 — Live Canvas Collab
    pub(crate) collab_abort: Option<tokio::task::AbortHandle>,
    pub(crate) collab_tx: Option<tokio::sync::mpsc::Sender<String>>,
    pub(crate) collab_mode: Option<String>,
    pub(crate) collab_addr: Option<String>,
    pub(crate) collab_peer_count: Option<Arc<AtomicUsize>>,
    // Canvas streaming execution cancellation.
    pub(crate) canvas_exec_cancel_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

/// Returns the Steam library steamapps directories to scan, ordered by platform.
pub(crate) fn steam_library_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            for rel in &[
                ".steam/steam/steamapps",
                ".local/share/Steam/steamapps",
                "snap/steam/common/.local/share/Steam/steamapps",
            ] {
                let p = Path::new(&home).join(rel);
                if p.exists() {
                    paths.push(p);
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files (x86)\Steam\steamapps",
            r"C:\Program Files\Steam\steamapps",
        ];
        for c in &candidates {
            let p = PathBuf::from(c);
            if p.exists() {
                paths.push(p);
            }
        }
        if let Ok(pf) = std::env::var("PROGRAMFILES(X86)") {
            let p = Path::new(&pf).join(r"Steam\steamapps");
            if p.exists() && !paths.contains(&p) {
                paths.push(p);
            }
        }
    }

    paths
}

/// Parse a single appmanifest_*.acf file into (name, app_id, last_played).
pub(crate) fn parse_acf(path: &Path) -> Option<(String, String, u64)> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut name = String::new();
    let mut app_id = String::new();
    let mut last_played: u64 = 0;

    for line in content.lines() {
        let parts: Vec<&str> = line.split('"').collect();
        if parts.len() < 4 {
            continue;
        }
        match parts[1] {
            "name"       => name       = parts[3].to_string(),
            "appid"      => app_id     = parts[3].to_string(),
            "LastPlayed" => last_played = parts[3].parse().unwrap_or(0),
            _ => {}
        }
    }

    if name.is_empty() {
        None
    } else {
        Some((name, app_id, last_played))
    }
}

/// On Linux, scan /proc for a process whose cmdline path passes through
/// "steamapps/common/", indicating an actively running Steam game.
#[cfg(target_os = "linux")]
pub(crate) fn detect_running_game_linux() -> Option<(String, String)> {
    let proc_entries = std::fs::read_dir("/proc").ok()?;

    for entry in proc_entries.flatten() {
        let fname = entry.file_name();
        let pid_str = fname.to_string_lossy();
        if !pid_str.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let cmdline_path = entry.path().join("cmdline");
        let cmdline = match std::fs::read(cmdline_path) {
            Ok(b) => String::from_utf8_lossy(&b).replace('\0', " ").to_string(),
            Err(_) => continue,
        };
        if !cmdline.contains("steamapps/common/") {
            continue;
        }
        // Skip the Steam client itself
        let lower = cmdline.to_lowercase();
        if lower.contains("steam.sh") || lower.contains("/steam ") {
            continue;
        }
        if let Some(start) = cmdline.find("steamapps/common/") {
            let rest = &cmdline[start + "steamapps/common/".len()..];
            let game_name = rest.split('/').next().unwrap_or("").trim().to_string();
            if !game_name.is_empty() {
                return Some((game_name, String::new()));
            }
        }
    }
    None
}

/// Returns (game_name, app_id, is_running).
/// Prefers an actively-running process over the most-recently-played manifest.
pub(crate) fn detect_game() -> (String, String, bool) {
    // 1. Active process detection (Linux only — most accurate)
    #[cfg(target_os = "linux")]
    if let Some((name, id)) = detect_running_game_linux() {
        return (name, id, true);
    }

    // 2. Fall back: find the appmanifest with the highest LastPlayed timestamp
    let mut best_name  = String::new();
    let mut best_id    = String::new();
    let mut best_ts: u64 = 0;

    for lib in steam_library_paths() {
        let entries = match std::fs::read_dir(&lib) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let fname = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if !fname.starts_with("appmanifest_") || !fname.ends_with(".acf") {
                continue;
            }
            if let Some((name, id, ts)) = parse_acf(&path) {
                if ts > best_ts {
                    best_ts   = ts;
                    best_name = name;
                    best_id   = id;
                }
            }
        }
    }

    if best_name.is_empty() {
        (String::new(), String::new(), false)
    } else {
        (best_name, best_id, false)
    }
}

pub(crate) fn get_game_details(app_id: &str, name: &str) -> (String, String) {
    match app_id {
        "1091500" => ("Cyberpunk 2077".to_string(), "Action RPG. Recommended Settings: Steam Deck Preset, FSR Enabled (Quality), cap at 30 or 40FPS. Common tweaks: Use Proton Experimental to resolve audio crackling or crash-on-launch issues.".to_string()),
        "1174180" => ("Red Dead Redemption 2".to_string(), "Action-Adventure. Recommended Settings: Medium/Low mix, FSR Ultra Quality. Common tweaks: Switch from Vulkan to DX12 API in graphics settings if experiencing graphics memory leak crashes.".to_string()),
        "1887720" => ("Hades II".to_string(), "Action Rogue-like. Recommended Settings: High settings, Native resolution. Extremely well optimized (90FPS+ on Steam Deck OLED). No special troubleshooting needed.".to_string()),
        "1145360" => ("Hades".to_string(), "Action Rogue-like. Recommended Settings: Native resolution. Extremely well optimized. No special troubleshooting needed.".to_string()),
        "1245620" => ("Elden Ring".to_string(), "Action RPG / Souls-like. Recommended Settings: Medium settings, 800p, Lock at 30FPS for visual stability. Common tweaks: Use Proton Experimental and enable CryoUtilities swap file increase to resolve open world stutters.".to_string()),
        "228970" => ("SteamOS / Desktop".to_string(), "Steam Deck OS interface and Desktop utility tools.".to_string()),
        _ => {
            if name.is_empty() {
                ("Unknown Game".to_string(), "No specific Steam Deck settings profile found. Use default Proton settings.".to_string())
            } else {
                (name.to_string(), "Steam Deck settings recommendations: Match resolution to 1280x800, use FSR if framerate drops below 30, and run with Proton Experimental if startup issues occur.".to_string())
            }
        }
    }
}









// ──────────────────────────────────────────────
// P17 — Whisper.cpp offline STT
// ──────────────────────────────────────────────



// Transcribe `record.wav` (the last recorded audio) using whisper.cpp.
// Falls back gracefully with an error if not configured.





























// =============================================================================
// MEMORY UI COMMANDS
// =============================================================================







// =============================================================================
// AUTONOMOUS CODING AGENT
// =============================================================================





// Call the LLM with the agent system prompt, collect the full response, and
// return the raw text. The frontend parses the JSON step from the text.

// Execute agent-generated code in a sandboxed subprocess with a 30-second
// timeout. Returns stdout + stderr combined.

pub(crate) fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").map(PathBuf::from).ok()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").map(PathBuf::from).ok()
    }
}

pub(crate) fn load_env_file() {
    if let Some(home) = get_home_dir() {
        let env_path = home.join(".config").join("neurodeck").join("env");
        if env_path.exists() {
            if let Ok(content) = std::fs::read_to_string(env_path) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        continue;
                    }
                    if let Some((key, val)) = trimmed.split_once('=') {
                        let k = key.trim();
                        let v = val.trim().trim_matches('"').trim_matches('\'');
                        std::env::set_var(k, v);
                    }
                }
            }
        }
    }
}

pub(crate) fn get_config_path() -> PathBuf {
    // Resolution order:
    // 1. ../llm-term.toml  — tauri dev (working dir = src-tauri/)
    // 2. ./llm-term.toml   — deployed binary next to config
    // 3. ~/.config/neurodeck/llm-term.toml — user config dir (production install)
    let candidates: &[PathBuf] = &[
        PathBuf::from("../llm-term.toml"),
        PathBuf::from("./llm-term.toml"),
        user_config_dir().join("llm-term.toml"),
    ];
    for p in candidates {
        if p.exists() {
            return p.clone();
        }
    }
    // Default for a fresh install — will be created on first save
    user_config_dir().join("llm-term.toml")
}

pub(crate) fn user_config_dir() -> PathBuf {
    // Use the OS-conventional config directory so the path works correctly
    // on Windows (%APPDATA%), macOS (~/Library/Application Support), and
    // Linux/SteamOS (~/.config — XDG standard).
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return PathBuf::from(appdata).join("neurodeck");
        }
        if let Ok(up) = std::env::var("USERPROFILE") {
            return PathBuf::from(up).join("AppData").join("Roaming").join("neurodeck");
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("neurodeck");
        }
    }
    // Linux / SteamOS: XDG_CONFIG_HOME → ~/.config/neurodeck
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg).join("neurodeck");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".config").join("neurodeck");
    }
    PathBuf::from(".")
}

pub(crate) fn create_provider(config: &config::Config) -> Arc<dyn LlmProvider> {
    // User-configured default_provider takes precedence over env vars.
    // The GEMINI_API_KEY env var is only a key source, not a provider selector.
    if config.llm.default_provider == "gemini" {
        Arc::new(GeminiProvider::new(config.llm.gemini_model.clone()))
    } else {
        Arc::new(OllamaProvider::new(
            config.llm.ollama_model.clone(),
            config.llm.ollama_base_url.clone(),
        ))
    }
}

/// Build a provider Arc directly from an AgentConfig.
pub(crate) fn provider_from_agent(agent: &config::AgentConfig) -> Arc<dyn LlmProvider> {
    if agent.provider == "gemini" {
        Arc::new(GeminiProvider::new(agent.model.clone()))
    } else {
        Arc::new(OllamaProvider::new(agent.model.clone(), agent.base_url.clone()))
    }
}

/// Seed default agent profiles when none exist in config.
pub(crate) fn default_agents() -> Vec<config::AgentConfig> {
    let ollama_url = "http://localhost:11434".to_string();
    vec![
        config::AgentConfig {
            id: "gemini-flash-lite".into(),
            name: "Flash Lite".into(),
            provider: "gemini".into(),
            model: "gemini-2.0-flash-lite".into(),
            base_url: String::new(),
            description: "Fastest cloud model — best for quick chat and low-latency tasks.".into(),
        },
        config::AgentConfig {
            id: "gemini-flash".into(),
            name: "Flash".into(),
            provider: "gemini".into(),
            model: "gemini-2.0-flash".into(),
            base_url: String::new(),
            description: "Best all-around cloud model — code, analysis, multi-step reasoning.".into(),
        },
        config::AgentConfig {
            id: "gemini-pro".into(),
            name: "Pro".into(),
            provider: "gemini".into(),
            model: "gemini-1.5-pro".into(),
            base_url: String::new(),
            description: "Highest intelligence — complex research, long context (1M tokens).".into(),
        },
        config::AgentConfig {
            id: "local-gemma2b".into(),
            name: "Gemma 2B".into(),
            provider: "ollama".into(),
            model: "gemma2:2b".into(),
            base_url: ollama_url.clone(),
            description: "Best quality-per-RAM local model. ~20-30 tok/s on Steam Deck. Offline.".into(),
        },
        config::AgentConfig {
            id: "local-llama1b".into(),
            name: "Llama 1B".into(),
            provider: "ollama".into(),
            model: "llama3.2:1b".into(),
            base_url: ollama_url.clone(),
            description: "Ultra-fast local. ~50 tok/s on Steam Deck. Basic tasks. Offline.".into(),
        },
        config::AgentConfig {
            id: "local-phi35".into(),
            name: "Phi 3.5 Mini".into(),
            provider: "ollama".into(),
            model: "phi3.5:mini".into(),
            base_url: ollama_url,
            description: "Microsoft compact reasoning model. Strong for code. Offline.".into(),
        },
    ]
}












// ============================================================
// CATEGORY B COMMANDS
// ============================================================

// Explains a generated prompt in Just Plain English (JPE).









// AI-powered terminal autocomplete.
// Takes the current terminal input buffer and returns suggested completion suffix.

// Read the most recent screenshot from Steam or system Pictures directories.
// Returns a map with keys: `path`, `data` (base64), `mime`.

// AI-powered shell history search.
// Reads local shell history, deduplicates, and asks the LLM to rank/filter by relevance.

// ──────────────────────────────────────────────────────────────────────────
// P18: Local Document RAG
// ──────────────────────────────────────────────────────────────────────────






// ──────────────────────────────────────────────────────────────────────────
// P20: Game Session Notes
// ──────────────────────────────────────────────────────────────────────────





// ──────────────────────────────────────────────────────────────────────────
// MCP Server commands
// ──────────────────────────────────────────────────────────────────────────




// ──────────────────────────────────────────────
// §4 Production — Profile & Theme Persistence
// ──────────────────────────────────────────────

// Persist a profile list to `./data/profiles/<key>.json`.
// `key` must be one of: "ssh", "ftp", "sftp"

// Load a profile list from `./data/profiles/<key>.json`.
// Returns `"[]"` if the file does not exist.

// Persist custom themes to `./data/themes/custom.json`.

// Load custom themes from disk. Returns `"[]"` if not found.

// Return this machine's primary LAN IP address (best-effort).

// ──────────────────────────────────────────────
// P19 — Live Canvas Collaboration
// ──────────────────────────────────────────────

// Start the host collab session. Returns the actual bound port.

// Connect to a host's collab session. `addr` = "IP:port", e.g. "192.168.1.5:13338".

// Broadcast the current canvas state to the connected peer.




// Stop the active collab session.


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing
    let log_dir = user_config_dir().join("logs");
    let _ = std::fs::create_dir_all(&log_dir);
    let file_appender = tracing_appender::rolling::daily(log_dir, "neurodeck.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_ansi(false)
        .init();
    tracing::info!("Starting NEURODECK...");

    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--tunnel".to_string()) || args.contains(&"--daemon".to_string()) {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        if let Err(e) = rt.block_on(tunnel::run_tunnel_server_headless()) {
            eprintln!("Tunnel server error: {}", e);
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    // Load env file variables (e.g. GEMINI_API_KEY from ~/.config/neurodeck/env)
    load_env_file();

    let config_path = get_config_path();
    let mut config = config::load_config(&config_path);

    // Seed default agent profiles on first run
    if config.llm.agents.is_empty() {
        config.llm.agents = default_agents();
        // Set active agent to match the current configured provider/model
        let target_provider = config.llm.default_provider.clone();
        let target_model = if target_provider == "gemini" {
            config.llm.gemini_model.clone()
        } else {
            config.llm.ollama_model.clone()
        };
        config.llm.active_agent_id = config.llm.agents.iter()
            .find(|a| a.provider == target_provider && a.model == target_model)
            .map(|a| a.id.clone())
            .unwrap_or_else(|| config.llm.agents[0].id.clone());
        let _ = config::save_config(&config_path, &config);
    } else if config.llm.active_agent_id.is_empty() {
        config.llm.active_agent_id = config.llm.agents
            .first().map(|a| a.id.clone()).unwrap_or_default();
        let _ = config::save_config(&config_path, &config);
    }

    let provider = create_provider(&config);

    let data_dir = user_config_dir().join("data");
    let _ = std::fs::create_dir_all(&data_dir);

    let mem_db = match MemoryDB::init(data_dir.join("memory")) {
        Ok(db) => Some(db),
        Err(e) => {
            println!("Error initializing memory: {}", e);
            None
        }
    };

    let custom_personas = match std::fs::read_to_string(data_dir.join("personas.json")) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    let whisper_binary = config.stt.whisper_binary.clone();
    let whisper_model  = config.stt.whisper_model.clone();
    let torrent_download_root = data_dir.join("torrents/downloads");
    let _ = std::fs::create_dir_all(&torrent_download_root);

    let app_state = AppState {
        provider,
        config,
        session_id: Utc::now().format("%Y%m%d-%H%M%S").to_string(),
        messages: Vec::new(),
        active_persona: "Default".to_string(),
        mem_db,
        record_child: None,
        process_stdin_tx: None,
        kill_tx: None,
        active_process_id: 0,
        cancel_stream_tx: None,
        custom_personas,
        mcp_abort: None,
        mcp_port: 13337,
        whisper_binary,
        whisper_model,
        collab_abort: None,
        collab_tx: None,
        collab_mode: None,
        collab_addr: None,
        collab_peer_count: None,
        canvas_exec_cancel_tx: None,
    };

    tauri::Builder::default()
        .manage(Mutex::new(app_state))
        .manage(pty_manager::PtyState {
            sessions: Mutex::new(HashMap::new()),
            remote_tx: Mutex::new(None),
        })
        .manage(remote_control::RemoteControlState::default())
        .manage(transfer::SharedTransferState(Arc::new(Mutex::new(transfer::TransferState::new()))))
        .manage(torrent::TorrentState::new(torrent_download_root))
        .setup(|app| {
            // Start file transfer services
            let transfer_state = app.state::<transfer::SharedTransferState>().0.clone();
            transfer::start_transfer_services(app.handle().clone(), transfer_state);

            // Initialize Lua state
            let lua_engine = lua::LuaEngine::new(app.handle().clone())
                .expect("Failed to initialize Lua engine");

            // Resolve plugins dir: resource_dir (installed) → ./plugins (dev)
            let plugins_dir = app.path().resource_dir()
                .map(|p| p.join("plugins"))
                .unwrap_or_else(|_| std::path::PathBuf::from("./plugins"));
            let plugins_dir = if plugins_dir.exists() {
                plugins_dir
            } else {
                std::path::PathBuf::from("./plugins")
            };

            // Create directories if they don't exist
            let _ = std::fs::create_dir_all(&plugins_dir);
            let _ = std::fs::create_dir_all("./scripts");

            // Load plugins on startup
            if let Err(e) = lua_engine.load_plugins(&plugins_dir) {
                println!("Error loading plugins: {}", e);
            }

            // Manage LuaState
            app.manage(LuaState(Mutex::new(lua_engine)));

            // if cfg!(debug_assertions) {
            //     app.handle().plugin(
            //         tauri_plugin_log::Builder::default()
            //             .level(log::LevelFilter::Info)
            //             .build(),
            //     )?;
            // }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_state,
            execute_command,
            execute_command_stream,
            write_to_process,
            kill_process,
            start_recording,
            stop_recording,
            get_personas,
            get_themes,
            set_persona,
            set_theme,
            save_session,
            load_latest_session,
            list_sessions,
            load_session_by_id,
            delete_session,
            new_session,
            send_command,
            speak_text,
            cancel_generation,
            #[cfg(debug_assertions)]
            execute_lua,
            export_session_markdown,
            autocomplete::get_terminal_autocomplete,
            doc_indexer::get_indexed_docs,
            doc_indexer::search_docs_semantic,
            doc_indexer::remove_indexed_doc,
            pty_manager::pty_spawn,
            pty_manager::pty_write,
            pty_manager::pty_resize,
            pty_manager::pty_kill,
            tunnel::start_tunnel_server,
            tunnel::stop_tunnel_server,
            tunnel::send_tunnel_request,
            transfer::start_file_transfer,
            transfer::respond_to_transfer,
            transfer::get_discovered_peers,
            transfer::get_active_transfers,
            transfer::cancel_transfer,
            transfer::set_group_code,
            transfer::get_group_code,
            torrent::torrent_get_status,
            torrent::torrent_list,
            torrent::torrent_add,
            torrent::torrent_pause,
            torrent::torrent_resume,
            torrent::torrent_get_download_root,
            open_external,
            browser_open,
            browser_navigate,
            browser_hide,
            browser_show,
            browser_get_url,
            browser_exec,
            browser_open_session,
            browser_navigate_session,
            browser_get_content,
            browser_click,
            browser_fill,
            browser_screenshot,
            browser_evaluate_js,
            browser_close_session,
            install_bmad_to_dir,
            get_game_context,
            agent_step,
            agent_exec_code,
            agent::exec_code_stream,
            agent::cancel_exec,
            ai_edit_code,
            list_agents,
            get_active_agent_id,
            switch_agent,
            add_agent,
            delete_agent,
            get_recommended_models,
            memory_list_all,
            memory_delete,
            memory_pin,
            memory_add_fact,
            ftp::ftp_list_dir,
            ftp::ftp_download_file,
            ftp::ftp_upload_file,
            ftp::ftp_test_connection,
            sftp::sftp_list_dir,
            sftp::sftp_download_file,
            sftp::sftp_upload_file,
            sftp::sftp_test_connection,
            ollama_mgr::ollama_list_models,
            ollama_mgr::ollama_pull_model,
            ollama_mgr::ollama_delete_model,
            set_config,
            get_config,
            save_gemini_api_key,
            get_gemini_api_key,
            save_ssh_credential,
            get_ssh_credential,
            delete_ssh_credential,
            save_sftp_credential,
            get_sftp_credential,
            delete_sftp_credential,
            test_llm_connection,
            get_context_stats,
            list_custom_personas,
            add_custom_persona,
            delete_custom_persona,
            plugin_mgr::list_plugins,
            plugin_mgr::fetch_plugin_registry,
            plugin_mgr::toggle_plugin,
            plugin_mgr::install_plugin,
            plugin_mgr::install_plugin_from_registry,
            plugin_mgr::uninstall_plugin,
            plugin_mgr::read_plugin,
            plugin_mgr::save_plugin,
            plugin_mgr::reload_plugins,
            computer_use::computer_screenshot,
            computer_use::computer_mouse_move,
            computer_use::computer_mouse_click,
            computer_use::computer_type,
            computer_use::computer_key,
            computer_use::computer_find_text,
            shell_autocomplete,
            read_last_screenshot,
            search_history_ai,
            generate_jpe_explanation,
            index_directory,
            get_doc_count,
            clear_doc_index,
            get_game_notes,
            save_game_note,
            start_mcp_server,
            stop_mcp_server,
            get_mcp_status,
            set_whisper_config,
            get_whisper_status,
            transcribe_audio_whisper,
            download_whisper_model,
            canvas_collab_host,
            canvas_collab_join,
            canvas_collab_send,
            canvas_collab_broadcast,
            canvas_collab_status,
            canvas_collab_stop,
            save_profiles,
            load_profiles,
            dispatch_action,
            save_custom_themes,
            load_custom_themes,
            get_lan_ip,
            close_splashscreen,
            start_oauth_flow,
            poll_oauth_token,
            run_onboarding_diagnostics,
            assemble_prompt_via_lua_cmd,
            optimize_raw_prompt,
            generate_jpe_explanation_with_level,
            save_prompt_preset,
            load_prompt_presets,
            remote_control::start_remote_server,
            remote_control::stop_remote_server,
            remote_control::get_remote_server_info,
            remote_control::remote_send_to_clients,
            sync::start_sync,
            sync::get_sync_status,
            sync::sync_now,
            sync::configure_sync,
        ])
        .run(tauri::generate_context!())

        .expect("error while running tauri application");
}
