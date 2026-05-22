mod config;
mod llm;
mod memory;
mod storage;
mod lua;
mod pty_manager;
mod tunnel;
mod transfer;


use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager, State};
use chrono::Utc;
use futures_util::StreamExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::llm::{LlmProvider, GeminiProvider, OllamaProvider};
use crate::memory::MemoryDB;
use crate::storage::{Session, load_session};

#[derive(Clone, serde::Serialize)]
struct Theme {
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

    static ref THEMES: Vec<Theme> = vec![
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

pub struct AppState {
    provider: Arc<dyn LlmProvider>,
    config: config::Config,
    session_id: String,
    messages: Vec<String>,
    active_persona: String,
    mem_db: Option<MemoryDB>,
    record_child: Option<std::process::Child>,
    process_stdin_tx: Option<tokio::sync::mpsc::Sender<String>>,
    kill_tx: Option<tokio::sync::oneshot::Sender<()>>,
    active_process_id: u64,
    cancel_stream_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

/// Returns the Steam library steamapps directories to scan, ordered by platform.
fn steam_library_paths() -> Vec<PathBuf> {
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
fn parse_acf(path: &Path) -> Option<(String, String, u64)> {
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
fn detect_running_game_linux() -> Option<(String, String)> {
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
fn detect_game() -> (String, String, bool) {
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

#[tauri::command]
fn get_game_context() -> HashMap<String, String> {
    let (name, app_id, is_running) = detect_game();
    let mut map = HashMap::new();
    map.insert("name".to_string(), name);
    map.insert("app_id".to_string(), app_id);
    map.insert("is_running".to_string(), is_running.to_string());
    map
}

#[tauri::command]
fn get_initial_state(state: State<'_, Mutex<AppState>>) -> HashMap<String, String> {
    let app = state.lock().unwrap();
    let mut initial = HashMap::new();
    
    let model_name = if app.config.llm.default_provider == "gemini" {
        &app.config.llm.gemini_model
    } else {
        &app.config.llm.ollama_model
    };

    initial.insert("model".to_string(), model_name.clone());
    initial.insert("session_id".to_string(), app.session_id.clone());
    initial.insert("active_persona".to_string(), app.active_persona.clone());
    initial.insert(
        "memory_status".to_string(),
        if app.mem_db.is_some() { "Stable" } else { "Offline" }.to_string(),
    );
    initial.insert("tool_status".to_string(), "Idle".to_string());

    let (game_name, game_id, game_running) = detect_game();
    initial.insert("game_name".to_string(), game_name);
    initial.insert("game_app_id".to_string(), game_id);
    initial.insert("game_running".to_string(), game_running.to_string());

    initial
}

#[tauri::command]
async fn execute_command(cmd_str: String) -> String {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = std::process::Command::new("cmd.exe");
        c.arg("/c").arg(&cmd_str);
        c
    } else {
        let mut c = std::process::Command::new("sh");
        c.arg("-c").arg(&cmd_str);
        c
    };

    match cmd.output() {
        Ok(output) => {
            let combined = [output.stdout, output.stderr].concat();
            String::from_utf8_lossy(&combined).into_owned()
        }
        Err(e) => format!("Error: {}", e),
    }
}

#[tauri::command]
async fn execute_lua(
    code: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let app_handle_clone = app_handle.clone();
    tokio::task::spawn_blocking(move || {
        let lua_state = app_handle_clone.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        match engine.run_script(&code) {
            Ok(_) => {
                let _ = app_handle_clone.emit("command_exit", 0);
                Ok(())
            }
            Err(e) => {
                let _ = app_handle_clone.emit("command_stderr", format!("{}\n", e));
                let _ = app_handle_clone.emit("command_exit", 1);
                Err(e)
            }
        }
    }).await.map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
async fn execute_command_stream(
    cmd_str: String,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    // 1. Kill any existing running process.
    let proc_id = {
        let mut app = state.lock().unwrap();
        if let Some(kill_tx) = app.kill_tx.take() {
            let _ = kill_tx.send(());
        }
        app.process_stdin_tx = None;
        app.active_process_id += 1;
        app.active_process_id
    };

    // 2. Setup channels for stdin writing and killing.
    let (stdin_tx, mut stdin_rx) = tokio::sync::mpsc::channel::<String>(100);
    let (kill_tx, mut kill_rx) = tokio::sync::oneshot::channel::<()>();

    // Store them in AppState
    {
        let mut app = state.lock().unwrap();
        app.process_stdin_tx = Some(stdin_tx);
        app.kill_tx = Some(kill_tx);
    }

    // 3. Spawn child process
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = tokio::process::Command::new("cmd.exe");
        c.arg("/c").arg(&cmd_str);
        c
    } else {
        let mut c = tokio::process::Command::new("sh");
        c.arg("-c").arg(&cmd_str);
        c
    };

    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => {
            let err_msg = format!("Failed to spawn process: {}", e);
            let _ = app_handle.emit("command_stderr", format!("{}\n", err_msg));
            let _ = app_handle.emit("command_exit", 1);
            let mut app = state.lock().unwrap();
            if app.active_process_id == proc_id {
                app.process_stdin_tx = None;
                app.kill_tx = None;
            }
            return Err(err_msg);
        }
    };

    let mut stdin = child.stdin.take().ok_or("Failed to open stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    let app_handle_clone1 = app_handle.clone();
    let app_handle_clone2 = app_handle.clone();

    // Spawn stdout reader task
    let mut stdout_reader = BufReader::new(stdout).lines();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            let _ = app_handle_clone1.emit("command_stdout", line);
        }
    });

    // Spawn stderr reader task
    let mut stderr_reader = BufReader::new(stderr).lines();
    tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            let _ = app_handle_clone2.emit("command_stderr", line);
        }
    });

    // Spawn main control loop task that manages stdin writing, killing, and waiting for exit.
    let app_handle_exit = app_handle.clone();
    tokio::spawn(async move {
        let mut exit_status = None;
        loop {
            tokio::select! {
                // Handle stdin inputs sent from the frontend
                Some(input) = stdin_rx.recv() => {
                    let formatted_input = if input.ends_with('\n') {
                        input
                    } else {
                        format!("{}\n", input)
                    };
                    if let Err(e) = stdin.write_all(formatted_input.as_bytes()).await {
                        let _ = app_handle_exit.emit("command_stderr", format!("Failed to write to stdin: {}\n", e));
                    }
                    let _ = stdin.flush().await;
                }
                // Handle kill signal
                _ = &mut kill_rx => {
                    let _ = child.kill().await;
                    let _ = child.wait().await;
                    let _ = app_handle_exit.emit("command_stderr", "Process terminated by user.\n".to_string());
                    break;
                }
                // Wait for the process to exit
                status = child.wait() => {
                    match status {
                        Ok(s) => {
                            exit_status = s.code();
                        }
                        Err(e) => {
                            let _ = app_handle_exit.emit("command_stderr", format!("Error waiting for process: {}\n", e));
                        }
                    }
                    break;
                }
            }
        }

        // Emit exit code
        let code = exit_status.unwrap_or(-1);
        let _ = app_handle_exit.emit("command_exit", code);

        // Clean state if it's still our process
        if let Some(app_state_mutex) = app_handle_exit.try_state::<Mutex<AppState>>() {
            let mut app = app_state_mutex.lock().unwrap();
            if app.active_process_id == proc_id {
                app.process_stdin_tx = None;
                app.kill_tx = None;
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn write_to_process(input: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let tx = {
        let app = state.lock().unwrap();
        app.process_stdin_tx.clone()
    };

    if let Some(tx) = tx {
        tx.send(input).await.map_err(|e| format!("Failed to send to stdin channel: {}", e))?;
        Ok(())
    } else {
        Err("No active process running to write to".to_string())
    }
}

#[tauri::command]
async fn kill_process(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let tx = {
        let mut app = state.lock().unwrap();
        app.kill_tx.take()
    };

    if let Some(tx) = tx {
        let _ = tx.send(());
        Ok(())
    } else {
        Err("No active process running to kill".to_string())
    }
}

#[tauri::command]
fn start_recording(state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap();
    
    if cfg!(target_os = "linux") {
        match std::process::Command::new("arecord")
            .arg("-f")
            .arg("cd")
            .arg("-t")
            .arg("wav")
            .arg("record.wav")
            .spawn() 
        {
            Ok(child) => {
                app.record_child = Some(child);
                "Recording started...".to_string()
            }
            Err(e) => format!("Error starting recording: {}", e),
        }
    } else {
        "Recording simulated on Windows.".to_string()
    }
}

#[tauri::command]
async fn stop_recording(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let record_child = {
        let mut app = state.lock().unwrap();
        app.record_child.take()
    };

    if let Some(mut child) = record_child {
        let _ = child.kill();
        let _ = child.wait();
    }

    let audio_data = std::fs::read("record.wav");
    if let Ok(data) = audio_data {
        let provider = {
            let app = state.lock().unwrap();
            app.provider.clone()
        };

        match provider.transcribe_audio(&data).await {
            Ok(text) => Ok(text),
            Err(e) => Err(format!("Error transcribing: {}", e)),
        }
    } else {
        // Simulated voice output on Windows
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        Ok("Hello AI, how are you today? (Simulated)".to_string())
    }
}

#[tauri::command]
fn get_personas() -> Vec<String> {
    PERSONAS.iter().map(|p| p.0.clone()).collect()
}

#[tauri::command]
fn get_themes() -> Vec<String> {
    THEMES.iter().map(|t| t.name.clone()).collect()
}

#[tauri::command]
fn set_persona(name: String, state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap();
    if PERSONAS.iter().any(|p| p.0 == name) {
        app.active_persona = name.clone();
        format!("Persona set to {}", name)
    } else {
        "Persona not found".to_string()
    }
}

#[tauri::command]
fn set_theme(name: String) -> Option<HashMap<String, String>> {
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

#[tauri::command]
fn save_session(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let app = state.lock().unwrap();
    let session = Session {
        id: app.session_id.clone(),
        created_at: Utc::now(),
        messages: app.messages.clone(),
    };

    storage::save_session("./sessions", &session)?;
    Ok(format!("Session saved as {}", app.session_id))
}

#[tauri::command]
fn export_session_markdown(id: String) -> Result<String, String> {
    let path = Path::new("./sessions").join(format!("{}.json", id));
    if !path.exists() {
        return Err(format!("Session {} does not exist on disk", id));
    }
    let session = storage::load_session(&path)?;
    
    let export_dir = Path::new("./exports");
    std::fs::create_dir_all(export_dir).map_err(|e| format!("Failed to create exports directory: {}", e))?;
    
    let file_path = export_dir.join(format!("{}.md", id));
    storage::export_to_markdown(&file_path, &session)?;
    
    Ok(format!("Session exported to {}", file_path.to_string_lossy()))
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/c", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn load_latest_session(state: State<'_, Mutex<AppState>>) -> Result<HashMap<String, serde_json::Value>, String> {
    let read_dir = std::fs::read_dir("./sessions")
        .map_err(|e| format!("Error reading sessions dir: {}", e))?;

    let mut latest_file = PathBuf::new();
    let mut latest_name = String::new();

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            let name = path.file_name().unwrap().to_string_lossy().into_owned();
            if latest_name.is_empty() || name > latest_name {
                latest_name = name;
                latest_file = path;
            }
        }
    }

    if latest_name.is_empty() {
        return Err("No saved sessions found".to_string());
    }

    let session = load_session(latest_file)?;
    
    let mut app = state.lock().unwrap();
    app.messages = session.messages.clone();
    app.session_id = session.id.clone();

    let mut result = HashMap::new();
    result.insert("session_id".to_string(), serde_json::Value::String(session.id));
    result.insert(
        "messages".to_string(),
        serde_json::to_value(session.messages).unwrap(),
    );

    Ok(result)
}

#[tauri::command]
fn list_sessions() -> Result<Vec<String>, String> {
    let mut sessions = Vec::new();
    let dir = Path::new("./sessions");
    if !dir.exists() {
        return Ok(sessions);
    }
    let read_dir = std::fs::read_dir(dir)
        .map_err(|e| format!("Error reading sessions dir: {}", e))?;

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            if let Some(stem) = path.file_stem() {
                sessions.push(stem.to_string_lossy().into_owned());
            }
        }
    }
    
    // Sort reverse to have latest sessions first
    sessions.sort_by(|a, b| b.cmp(a));
    Ok(sessions)
}

#[tauri::command]
fn load_session_by_id(id: String, state: State<'_, Mutex<AppState>>) -> Result<HashMap<String, serde_json::Value>, String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }

    let file_path = Path::new("./sessions").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err(format!("Session {} does not exist", id));
    }

    let session = load_session(file_path)?;
    
    let mut app = state.lock().unwrap();
    app.messages = session.messages.clone();
    app.session_id = session.id.clone();

    let mut result = HashMap::new();
    result.insert("session_id".to_string(), serde_json::Value::String(session.id));
    result.insert(
        "messages".to_string(),
        serde_json::to_value(session.messages).unwrap(),
    );

    Ok(result)
}

#[tauri::command]
fn delete_session(id: String) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }

    let file_path = Path::new("./sessions").join(format!("{}.json", id));
    if file_path.exists() {
        std::fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn new_session(state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap();
    let new_id = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    app.session_id = new_id.clone();
    app.messages.clear();
    new_id
}

#[tauri::command]
async fn speak_text(text: String) -> Result<(), String> {
    let sanitized: String = text.chars()
        .filter(|c| (c.is_alphanumeric() || *c == ' ' || *c == '.' || *c == ',' || *c == '?' || *c == '!')
            && *c != '\'' && *c != '"' && *c != '`' && *c != '$' && *c != ';' && *c != '|' && *c != '&' && *c != '<' && *c != '>')
        .collect();

    if sanitized.is_empty() {
        return Ok(());
    }

    tokio::task::spawn_blocking(move || {
        if cfg!(target_os = "windows") {
            let ps_cmd = format!(
                "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{}')",
                sanitized.replace('\'', "''")
            );
            let _ = std::process::Command::new("powershell")
                .arg("-Command")
                .arg(&ps_cmd)
                .output();
        } else {
            let _ = std::process::Command::new("espeak")
                .arg(&sanitized)
                .output();
        }
    }).await.map_err(|e| format!("Failed to run speech synthesis: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn cancel_generation(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let tx = {
        let mut app = state.lock().unwrap();
        app.cancel_stream_tx.take()
    };
    if let Some(tx) = tx {
        let _ = tx.send(());
    }
    Ok(())
}

#[tauri::command]
async fn send_command(
    prompt: String,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    // Run hooks
    let mut prompt = prompt;
    {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        if let Ok(modified) = engine.trigger_hook("onMessage", prompt.clone()) {
            prompt = modified;
        }
    }

    // Check for registered Lua custom commands
    let trimmed_prompt = prompt.trim();
    let (cmd_name, cmd_args) = if trimmed_prompt.starts_with('/') {
        let mut parts = trimmed_prompt[1..].splitn(2, ' ');
        (parts.next().unwrap_or(""), parts.next().unwrap_or(""))
    } else {
        let mut parts = trimmed_prompt.splitn(2, ' ');
        (parts.next().unwrap_or(""), parts.next().unwrap_or(""))
    };

    let is_lua_cmd = {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        engine.is_command_registered(cmd_name)
    };

    if is_lua_cmd {
        let result = {
            let lua_state = app_handle.state::<LuaState>();
            let engine = lua_state.0.lock().unwrap();
            engine.call_command(cmd_name, cmd_args)
        };
        match result {
            Ok(Some(out)) => {
                let response = format!("System: Command '{}' executed successfully.\nOutput:\n{}", cmd_name, out);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                
                // Trigger onAIResponse hook
                let lua_state = app_handle.state::<LuaState>();
                let engine = lua_state.0.lock().unwrap();
                let _ = engine.trigger_hook("onAIResponse", out);
                
                return Ok(());
            }
            Ok(None) => {
                let response = format!("System: Command '{}' executed.", cmd_name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
            Err(e) => {
                let response = format!("System: Command '{}' failed:\n{}", cmd_name, e);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
        }
    }

    // 1. Gather variables from state
    let (provider, active_persona, messages_len, session_id, mem_db) = {
        let mut app = state.lock().unwrap();
        app.messages.push(format!("User: {}", prompt));
        (
            app.provider.clone(),
            app.active_persona.clone(),
            app.messages.len(),
            app.session_id.clone(),
            app.mem_db.clone(),
        )
    };

    // Store user message in vector DB if stable
    if let Some(ref db) = mem_db {
        let msg_id = format!("{}-{}", session_id, messages_len);
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "user".to_string());
        
        let db_clone = db.clone();
        let prompt_clone = prompt.clone();
        let provider_clone = provider.clone();
        tokio::spawn(async move {
            if let Ok(embedding) = provider_clone.generate_embedding(&prompt_clone).await {
                let _ = db_clone.store_message(msg_id, prompt_clone, embedding, metadata);
            }
        });
    }

    // Determine system prompt based on active persona
    let mut system_prompt = PERSONAS
        .iter()
        .find(|p| p.0 == active_persona)
        .map(|p| p.1.clone())
        .unwrap_or_else(|| "You are a helpful assistant.".to_string());

    // Add game context if available
    let (game_name, game_id, game_running) = detect_game();
    if !game_name.is_empty() {
        let state_label = if game_running { "currently playing" } else { "recently played" };
        let id_note = if game_id.is_empty() { String::new() } else { format!(" (Steam AppID: {})", game_id) };
        system_prompt.push_str(&format!(
            " The user is {} the game: {}{}.{}",
            state_label, game_name, id_note,
            " Provide game-relevant tips or context when appropriate."
        ));
    }

    // Add OS context
    system_prompt.push_str(&format!(
        " The user is on operating system: {}.",
        std::env::consts::OS
    ));

    // RAG: Search memory for relevant messages
    if let Some(ref db) = mem_db {
        if let Ok(query_embed) = provider.generate_embedding(&prompt).await {
            if let Ok(results) = db.search(&query_embed, 3) {
                if !results.is_empty() {
                    system_prompt.push_str("\n\nRelevant past context:\n");
                    for res in results {
                        system_prompt.push_str(&format!("- {}\n", res.content));
                    }
                }
            }
        }
    }

    // Handle @file:path pattern
    let mut full_prompt = prompt.clone();
    let re = regex::Regex::new(r"@file:([^\s]+)").unwrap();
    if let Some(caps) = re.captures(&prompt) {
        let file_path = caps.get(1).unwrap().as_str();
        if let Ok(content) = std::fs::read_to_string(file_path) {
            let _ = app_handle.emit(
                "stream_chunk",
                format!("System: Read file {} ({} bytes)\n", file_path, content.len()),
            );
            full_prompt = format!(
                "User mentioned file: {}\n```\n{}\n```\n\n{}",
                file_path, content, prompt
            );
        } else {
            let _ = app_handle.emit(
                "stream_chunk",
                format!("System: Error reading file {}: File not found or unreadable\n", file_path),
            );
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        }
    }

    // Check for persona change command
    if prompt.trim().starts_with("/persona") {
        let parts: Vec<&str> = prompt.trim().split_whitespace().collect();
        if parts.len() == 1 {
            let available_personas: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
            let active = {
                let app = state.lock().unwrap();
                app.active_persona.clone()
            };
            let response = format!(
                "System: Available personas: {}\nActive persona: {}",
                available_personas.join(", "),
                active
            );
            let _ = app_handle.emit("stream_chunk", response);
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        } else {
            let name = parts[1..].join(" ");
            let mut app = state.lock().unwrap();
            if PERSONAS.iter().any(|p| p.0 == name) {
                app.active_persona = name.clone();
                let _ = app_handle.emit("persona_changed", name.clone());
                let response = format!("System: Persona set to {}", name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            } else {
                let response = format!("System: Persona '{}' not found.", name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
        }
    }

    // Check for roundtable discussion command
    if prompt.trim().starts_with("/discuss") {
        let re_discuss = regex::Regex::new(r"^/discuss\s+(\w+)\s+(\w+)\s+(.+)$").unwrap();
        if let Some(caps) = re_discuss.captures(prompt.trim()) {
            let p1 = caps.get(1).unwrap().as_str().to_string();
            let p2 = caps.get(2).unwrap().as_str().to_string();
            let topic = caps.get(3).unwrap().as_str().to_string();

            let has_p1 = PERSONAS.iter().any(|p| p.0 == p1);
            let has_p2 = PERSONAS.iter().any(|p| p.0 == p2);

            if !has_p1 || !has_p2 {
                let available: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
                let error_msg = format!(
                    "System: Invalid personas specified. Available personas: {}\nUsage: `/discuss <persona1> <persona2> <topic>`",
                    available.join(", ")
                );
                let _ = app_handle.emit("stream_chunk", error_msg);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }

            let mut discussion_history = format!(
                "We are holding a roundtable discussion/debate on the topic: \"{}\".\nParticipants: {} and {}.\n\n",
                topic, p1, p2
            );

            let mut current_speaker = p1.clone();
            let mut next_speaker = p2.clone();

            let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
            {
                let mut app = state.lock().unwrap();
                app.cancel_stream_tx = Some(cancel_tx);
            }

            for turn in 1..=4 {
                if cancel_rx.try_recv().is_ok() {
                    let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
                    let _ = app_handle.emit("stream_done", ());
                    {
                        let mut app = state.lock().unwrap();
                        app.cancel_stream_tx = None;
                    }
                    return Ok(());
                }

                let speaker_system_prompt = PERSONAS
                    .iter()
                    .find(|p| p.0 == current_speaker)
                    .map(|p| p.1.clone())
                    .unwrap_or_default();

                let full_system_prompt = format!(
                    "{} You are participating in a roundtable debate. Keep your responses short (under 100 words), engaging, and directly address the previous points. You are speaking as {}.",
                    speaker_system_prompt, current_speaker
                );

                let header = format!("\n\n**[{}]**: ", current_speaker);
                let _ = app_handle.emit("stream_chunk", header);

                let prompt_for_turn = format!(
                    "{}\n\nIt is now your turn, {}. Please respond to the debate history above on the topic of \"{}\".",
                    discussion_history, current_speaker, topic
                );

                let mut turn_response = String::new();
                let mut stream = provider.stream_response(&prompt_for_turn, &full_system_prompt);
                while let Some(chunk_res) = stream.next().await {
                    if cancel_rx.try_recv().is_ok() {
                        let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
                        let _ = app_handle.emit("stream_done", ());
                        {
                            let mut app = state.lock().unwrap();
                            app.cancel_stream_tx = None;
                        }
                        return Ok(());
                    }
                    match chunk_res {
                        Ok(chunk) => {
                            turn_response.push_str(&chunk);
                            let _ = app_handle.emit("stream_chunk", chunk);
                        }
                        Err(e) => {
                            let _ = app_handle.emit("stream_error", format!("Error in debate turn {}: {}", turn, e));
                            {
                                let mut app = state.lock().unwrap();
                                app.cancel_stream_tx = None;
                            }
                            return Ok(());
                        }
                    }
                }

                discussion_history.push_str(&format!("{}: {}\n\n", current_speaker, turn_response));

                {
                    let mut app = state.lock().unwrap();
                    app.messages.push(format!("{}: {}", current_speaker, turn_response));
                }

                std::mem::swap(&mut current_speaker, &mut next_speaker);
            }

            {
                let mut app = state.lock().unwrap();
                app.cancel_stream_tx = None;
            }
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        } else {
            let response = "System: Invalid debate command format.\nUsage: `/discuss <persona1> <persona2> <topic>`\nExample: `/discuss Developer Cyberpunk Should we write Rust?`".to_string();
            let _ = app_handle.emit("stream_chunk", response);
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        }
    }

    // Check for helper commands
    if prompt == "/help" || prompt == "help" {
        let mut help_msg = "System: Available commands:\n".to_string();
        help_msg.push_str("- help or /help: Display this help message\n");
        help_msg.push_str("- /persona <name>: Change active agent persona\n");
        help_msg.push_str("- /discuss <persona1> <persona2> <topic>: Run a 4-turn roundtable debate between two personas\n");
        help_msg.push_str("- @file:path: Mention a file and include its content in the prompt\n\n");
        help_msg.push_str("Keyboard Shortcuts:\n");
        help_msg.push_str("- Enter: Send message\n");
        help_msg.push_str("- Ctrl+B: Execute pending Lua script (last Lua block in chat)\n");
        help_msg.push_str("- Ctrl+R: Toggle microphone voice recording\n");
        help_msg.push_str("- Ctrl+M: Toggle Text-to-Speech mute state\n");
        help_msg.push_str("- Ctrl+P: Cycle to next agent persona\n");
        help_msg.push_str("- Ctrl+N: Start new chat session\n");
        help_msg.push_str("- Ctrl+S: Save current session\n\n");
        help_msg.push_str("Lua Scripting:\n");
        help_msg.push_str("- Any Lua code block in chat gets an 'Execute' button\n");
        help_msg.push_str("- Plugins placed in the plugins/ folder are auto-loaded\n");
        help_msg.push_str("- Lua globals: print(), execute(cmd), registerCommand(name, fn), registerHook(event, fn)\n");
        help_msg.push_str("- Events: onMessage, onAIResponse\n");
        
        let _ = app_handle.emit("stream_chunk", help_msg);
        let _ = app_handle.emit("stream_done", ());
        return Ok(());
    }

    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut app = state.lock().unwrap();
        app.cancel_stream_tx = Some(cancel_tx);
    }

    // Start streaming
    let mut stream = provider.stream_response(&full_prompt, &system_prompt);
    let mut full_response = String::new();

    while let Some(chunk_res) = stream.next().await {
        if cancel_rx.try_recv().is_ok() {
            let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
            break;
        }
        match chunk_res {
            Ok(chunk) => {
                full_response.push_str(&chunk);
                let _ = app_handle.emit("stream_chunk", chunk);
            }
            Err(e) => {
                let _ = app_handle.emit("stream_error", e);
                {
                    let mut app = state.lock().unwrap();
                    app.cancel_stream_tx = None;
                }
                return Ok(());
            }
        }
    }

    // Clean up cancel channel
    {
        let mut app = state.lock().unwrap();
        app.cancel_stream_tx = None;
    }

    // Append AI response to state
    {
        let mut app = state.lock().unwrap();
        app.messages.push(format!("AI: {}", full_response));
    }

    // Store AI response in vector DB if stable
    if let Some(ref db) = mem_db {
        let msg_id = format!("{}-ai-{}", session_id, messages_len + 1);
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "ai".to_string());
        
        let db_clone = db.clone();
        let resp_clone = full_response.clone();
        let provider_clone = provider.clone();
        tokio::spawn(async move {
            if let Ok(embedding) = provider_clone.generate_embedding(&resp_clone).await {
                let _ = db_clone.store_message(msg_id, resp_clone, embedding, metadata);
            }
        });
    }

    // Trigger onAIResponse hook
    {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        let _ = engine.trigger_hook("onAIResponse", full_response.clone());
    }

    let _ = app_handle.emit("stream_done", ());
    Ok(())
}

// =============================================================================
// AUTONOMOUS CODING AGENT
// =============================================================================

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
struct AgentHistoryEntry {
    role: String,    // "step" | "output"
    content: String,
}

/// Call the LLM with the agent system prompt, collect the full response, and
/// return the raw text. The frontend parses the JSON step from the text.
#[tauri::command]
async fn agent_step(
    task: String,
    history: Vec<AgentHistoryEntry>,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap();
        app.provider.clone()
    };

    let os_name = std::env::consts::OS;
    let preferred_lang = if os_name == "windows" { "python or powershell" } else { "python or bash" };

    let system_prompt = format!(
        r#"You are an autonomous coding agent running on {os}. Your job is to complete the user's programming task by iteratively writing and executing code.

RESPONSE FORMAT — always output ONLY valid JSON with these exact fields, no markdown fences, no surrounding text:
{{
  "thought": "reasoning about what to do",
  "code": "executable code (empty string if done)",
  "lang": "python|bash|javascript|powershell",
  "action": "run_code|done|error",
  "summary": "one-line description of this step"
}}

RULES:
- Respond with JSON only. No markdown, no explanation outside the JSON object.
- Keep each code block self-contained and directly executable.
- After seeing execution output, analyze errors and iterate to fix them.
- When the task is fully complete, set action to "done" and summarize in "summary".
- If the task is impossible or you run out of ideas, set action to "error".
- Prefer {lang} for code execution on this platform.
- Max 5 iterations total — be efficient."#,
        os = os_name,
        lang = preferred_lang
    );

    // Build the prompt: task + history context
    let mut prompt = format!("Task: {}", task);
    if !history.is_empty() {
        prompt.push_str("\n\nExecution history so far:\n");
        for (i, entry) in history.iter().enumerate() {
            match entry.role.as_str() {
                "step" => prompt.push_str(&format!("\n[Step {}] Agent response:\n{}\n", i / 2 + 1, entry.content)),
                "output" => prompt.push_str(&format!("\n[Step {}] Execution output:\n{}\n", i / 2 + 1, entry.content)),
                _ => {}
            }
        }
        prompt.push_str("\nBased on the above history, what is your next step?");
    }

    // Collect full streaming response
    let mut stream = provider.stream_response(&prompt, &system_prompt);
    let mut full_response = String::new();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(text) => full_response.push_str(&text),
            Err(e) => return Err(format!("LLM error: {}", e)),
        }
    }

    Ok(full_response)
}

/// Execute agent-generated code in a sandboxed subprocess with a 30-second
/// timeout. Returns stdout + stderr combined.
#[tauri::command]
async fn agent_exec_code(code: String, lang: String) -> Result<String, String> {
    let (program, args): (&str, Vec<&str>) = match lang.to_lowercase().as_str() {
        "python" | "python3" => {
            if cfg!(target_os = "windows") {
                ("python", vec!["-c", &code])
            } else {
                ("python3", vec!["-c", &code])
            }
        }
        "bash" | "sh" | "shell" => {
            if cfg!(target_os = "windows") {
                ("powershell", vec!["-Command", &code])
            } else {
                ("bash", vec!["-c", &code])
            }
        }
        "powershell" => ("powershell", vec!["-Command", &code]),
        "javascript" | "js" | "node" => ("node", vec!["-e", &code]),
        _ => return Err(format!("Unsupported language: {}", lang)),
    };

    let program_owned = program.to_string();
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::task::spawn_blocking(move || {
            let output = std::process::Command::new(&program_owned)
                .args(args_owned.iter().map(|s| s.as_str()).collect::<Vec<_>>())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();

            match output {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    let mut combined = String::new();
                    if !stdout.is_empty() {
                        combined.push_str(&stdout);
                    }
                    if !stderr.is_empty() {
                        if !combined.is_empty() { combined.push('\n'); }
                        combined.push_str("[stderr]\n");
                        combined.push_str(&stderr);
                    }
                    if combined.is_empty() {
                        combined = "(no output)".to_string();
                    }
                    Ok(combined)
                }
                Err(e) => Err(format!("Failed to spawn process: {}", e)),
            }
        }),
    )
    .await;

    match result {
        Ok(Ok(inner)) => inner,
        Ok(Err(join_err)) => Err(format!("Task panicked: {}", join_err)),
        Err(_) => Err("Execution timed out (30s limit exceeded)".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    if args.contains(&"--tunnel".to_string()) || args.contains(&"--daemon".to_string()) {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        if let Err(e) = rt.block_on(tunnel::run_tunnel_server_headless()) {
            eprintln!("Tunnel server error: {}", e);
            std::process::exit(1);
        }
        std::process::exit(0);
    }

    let config = config::load_config("llm-term.toml");
    
    let provider: Arc<dyn LlmProvider> = if std::env::var("GEMINI_API_KEY").is_ok()
        || config.llm.default_provider == "gemini" 
    {
        Arc::new(GeminiProvider::new(config.llm.gemini_model.clone()))
    } else {
        Arc::new(OllamaProvider::new(
            config.llm.ollama_model.clone(),
            config.llm.ollama_base_url.clone(),
        ))
    };

    let mem_db = match MemoryDB::init("./data/memory") {
        Ok(db) => Some(db),
        Err(e) => {
            println!("Error initializing memory: {}", e);
            None
        }
    };

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
    };

    tauri::Builder::default()
        .manage(Mutex::new(app_state))
        .manage(pty_manager::PtyState { sessions: Mutex::new(HashMap::new()) })
        .manage(transfer::SharedTransferState(Arc::new(Mutex::new(transfer::TransferState::new()))))
        .setup(|app| {
            // Start file transfer services
            let transfer_state = app.state::<transfer::SharedTransferState>().0.clone();
            transfer::start_transfer_services(app.handle().clone(), transfer_state);

            // Initialize Lua state
            let lua_engine = lua::LuaEngine::new(app.handle().clone())
                .expect("Failed to initialize Lua engine");
            
            // Create directories if they don't exist
            let _ = std::fs::create_dir_all("./plugins");
            let _ = std::fs::create_dir_all("./scripts");

            // Load plugins on startup
            if let Err(e) = lua_engine.load_plugins("./plugins") {
                println!("Error loading plugins: {}", e);
            }

            // Manage LuaState
            app.manage(LuaState(Mutex::new(lua_engine)));

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
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
            execute_lua,
            export_session_markdown,
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
            open_external,
            get_game_context,
            agent_step,
            agent_exec_code
        ])
        .run(tauri::generate_context!())

        .expect("error while running tauri application");
}
