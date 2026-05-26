use crate::llm::GeminiProvider;
use crate::*;
use neurodeck_core::ipc::{Intent, StatePatch};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::atomic::Ordering;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

#[tauri::command]
pub fn get_game_context() -> HashMap<String, String> {
    let (name, app_id, is_running) = detect_game();
    let mut map = HashMap::new();
    let (_, notes) = get_game_details(&app_id, &name);
    map.insert("name".to_string(), name);
    map.insert("app_id".to_string(), app_id);
    map.insert("is_running".to_string(), is_running.to_string());
    map.insert("notes".to_string(), notes);
    map
}

#[tauri::command]
pub fn get_initial_state(state: State<'_, Mutex<AppState>>) -> HashMap<String, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut initial = HashMap::new();

    let model_name = if app.config.llm.default_provider == "gemini" {
        &app.config.llm.gemini_model
    } else {
        &app.config.llm.ollama_model
    };

    initial.insert("model".to_string(), model_name.clone());
    initial.insert(
        "provider".to_string(),
        app.config.llm.default_provider.clone(),
    );
    initial.insert(
        "active_agent_id".to_string(),
        app.config.llm.active_agent_id.clone(),
    );
    initial.insert("session_id".to_string(), app.session_id.clone());
    initial.insert("exec_auth_token".to_string(), app.exec_auth_token.clone());
    initial.insert("active_persona".to_string(), app.active_persona.clone());
    initial.insert(
        "memory_status".to_string(),
        if app.mem_db.is_some() {
            "Stable"
        } else {
            "Offline"
        }
        .to_string(),
    );
    initial.insert("tool_status".to_string(), "Idle".to_string());
    initial.insert(
        "boot_health_status".to_string(),
        app.boot_self_heal.status.clone(),
    );
    initial.insert(
        "boot_health_summary".to_string(),
        app.boot_self_heal.summary(),
    );
    initial.insert(
        "boot_health_recovered_count".to_string(),
        app.boot_self_heal.recovered_count.to_string(),
    );
    initial.insert(
        "boot_health_warning_count".to_string(),
        app.boot_self_heal.warning_count.to_string(),
    );

    let (game_name, game_id, game_running) = detect_game();
    initial.insert("game_name".to_string(), game_name);
    initial.insert("game_app_id".to_string(), game_id);
    initial.insert("game_running".to_string(), game_running.to_string());

    initial
}

#[tauri::command]
pub async fn execute_command(
    cmd_str: String,
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "terminal-shell")?;
    }
    crate::security::validate_terminal_command(&cmd_str, "terminal-shell")?;

    Ok(tokio::task::spawn_blocking(move || {
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
    })
    .await
    .unwrap_or_else(|e| format!("Error: spawn_blocking panicked: {}", e)))
}

#[cfg(debug_assertions)]
#[tauri::command]
pub async fn execute_lua(
    code: String,
    exec_token: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    {
        let state = app_handle.state::<Mutex<AppState>>();
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "lua-exec")?;
    }
    crate::security::validate_script_payload(&code, "lua", "lua-exec")?;

    let app_handle_clone = app_handle.clone();
    tokio::task::spawn_blocking(move || {
        let lua_state = app_handle_clone.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap_or_else(|e| e.into_inner());
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
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn execute_command_stream(
    cmd_str: String,
    exec_token: String,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "terminal-shell")?;
    }
    crate::security::validate_terminal_command(&cmd_str, "terminal-shell")?;

    // 1. Kill any existing running process.
    let proc_id = {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
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
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
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
            let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
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
            let mut app = app_state_mutex.lock().unwrap_or_else(|e| e.into_inner());
            if app.active_process_id == proc_id {
                app.process_stdin_tx = None;
                app.kill_tx = None;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn write_to_process(
    input: String,
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "terminal-stdin")?;
    }
    crate::security::validate_terminal_command(&input, "terminal-stdin")?;

    let tx = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.process_stdin_tx.clone()
    };

    if let Some(tx) = tx {
        tx.send(input)
            .await
            .map_err(|e| format!("Failed to send to stdin channel: {}", e))?;
        Ok(())
    } else {
        Err("No active process running to write to".to_string())
    }
}

#[tauri::command]
pub async fn kill_process(
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "terminal-kill")?;
    }

    let tx = {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
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
pub fn start_recording(state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());

    if cfg!(target_os = "linux") {
        let wav_path = user_config_dir().join("temp_record.wav");
        let wav_str = wav_path.to_string_lossy().to_string();
        match std::process::Command::new("arecord")
            .arg("-f")
            .arg("cd")
            .arg("-t")
            .arg("wav")
            .arg(&wav_str)
            .spawn()
        {
            Ok(child) => {
                app.record_child = Some(child);
                "Recording started...".to_string()
            }
            Err(e) => format!("Error starting recording: {}", e),
        }
    } else {
        "Voice recording is only supported on Linux/SteamOS. Use Whisper STT with a pre-recorded WAV, or configure a Gemini API key for cloud transcription.".to_string()
    }
}

#[tauri::command]
pub fn set_whisper_config(
    state: State<'_, Mutex<AppState>>,
    binary: String,
    model: String,
) -> Result<(), String> {
    // SECURITY: Validate binary path to prevent arbitrary command execution.
    // Only allow known whisper binary names or absolute paths that exist and are files.
    if !binary.is_empty() {
        let file_name = std::path::Path::new(&binary)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        let allowed_names = ["whisper", "whisper-cli", "whisper.cpp", "main"];
        if !allowed_names.contains(&file_name) {
            // Allow absolute paths that point to an existing file
            let path = std::path::Path::new(&binary);
            if !path.is_absolute() || !path.is_file() {
                return Err("Invalid whisper binary: must be 'whisper', 'whisper-cli', 'whisper.cpp', 'main', or an absolute path to an existing file.".into());
            }
        }
    }
    // SECURITY: Validate model path to prevent command injection via model arg.
    if !model.is_empty() {
        let model_path = std::path::Path::new(&model);
        let model_name = model_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        if model_name.is_empty()
            || model.contains(';')
            || model.contains('&')
            || model.contains('|')
            || model.contains('$')
            || model.contains('`')
        {
            return Err("Invalid whisper model path: contains dangerous characters.".into());
        }
    }
    let mut app = state.lock().map_err(|_| "State lock error".to_string())?;
    app.whisper_binary = binary.clone();
    app.whisper_model = model.clone();
    app.config.stt.whisper_binary = binary;
    app.config.stt.whisper_model = model;
    let config = app.config.clone();
    drop(app);
    let path = get_config_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    config::save_config(&path, &config)
}

#[tauri::command]
pub fn get_whisper_status(state: State<'_, Mutex<AppState>>) -> serde_json::Value {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let model_exists =
        !app.whisper_model.is_empty() && std::path::Path::new(&app.whisper_model).exists();
    let available = whisper::is_available(&app.whisper_binary);
    serde_json::json!({
        "configured": model_exists && available,
        "binary": &app.whisper_binary,
        "model": &app.whisper_model,
        "model_exists": model_exists,
        "binary_found": available,
    })
}

#[tauri::command]
pub async fn transcribe_audio_whisper(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let (binary, model) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        (app.whisper_binary.clone(), app.whisper_model.clone())
    };
    if model.is_empty() {
        return Err(
            "Whisper model path not set. Configure it in Settings → Whisper STT.".to_string(),
        );
    }
    let wav_str = user_config_dir()
        .join("temp_record.wav")
        .to_string_lossy()
        .to_string();
    tokio::task::spawn_blocking(move || whisper::transcribe(&wav_str, &binary, &model))
        .await
        .map_err(|e| format!("Thread error: {}", e))?
}

#[tauri::command]
pub async fn stop_recording(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let record_child = {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.record_child.take()
    };

    if let Some(mut child) = record_child {
        let _ = child.kill();
        let _ = child.wait();
    }

    let wav_path = user_config_dir().join("temp_record.wav");
    let audio_data = std::fs::read(&wav_path);
    if let Ok(data) = audio_data {
        // Try whisper.cpp first if model is configured and file exists
        let (whisper_binary, whisper_model) = {
            let app = state.lock().unwrap_or_else(|e| e.into_inner());
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
            let app = state.lock().unwrap_or_else(|e| e.into_inner());
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

/// Download a GGML whisper model from HuggingFace into ~/.local/share/neurodeck/models/.
/// Emits `whisper_download_progress` events: { done, pct, downloaded?, total?, path?, file? }
#[tauri::command]
pub async fn download_whisper_model(
    model: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    const VALID: &[&str] = &[
        "tiny.en",
        "base.en",
        "small.en",
        "medium.en",
        "tiny",
        "base",
        "small",
        "medium",
    ];
    if !VALID.contains(&model.as_str()) {
        return Err(format!(
            "Unknown model '{}'. Valid: tiny.en, base.en, small.en, medium.en",
            model
        ));
    }

    let models_dir = get_home_dir()
        .ok_or("Cannot determine home dir")?
        .join(".local")
        .join("share")
        .join("neurodeck")
        .join("models");
    std::fs::create_dir_all(&models_dir).map_err(|e| format!("mkdir: {}", e))?;

    let filename = format!("ggml-{}.bin", model);
    let target = models_dir.join(&filename);

    if target.exists() {
        let path_str = target.to_string_lossy().to_string();
        let _ = app_handle.emit(
            "whisper_download_progress",
            serde_json::json!({ "done": true, "pct": 100, "path": &path_str, "skipped": true }),
        );
        return Ok(path_str);
    }

    let url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
        model
    );

    let _ = app_handle.emit(
        "whisper_download_progress",
        serde_json::json!({ "done": false, "pct": 0, "file": &filename }),
    );

    let app2 = app_handle.clone();
    let target2 = target.clone();
    let file2 = filename.clone();

    tokio::task::spawn_blocking(move || -> Result<String, String> {
        use std::io::{Read, Write};

        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(600))
            .user_agent("neurodeck/1.1")
            .build()
            .map_err(|e| format!("HTTP client: {}", e))?;

        let mut resp = client.get(&url).send()
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}: cannot download {}", resp.status(), file2));
        }

        let total = resp.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;
        let mut file = std::fs::File::create(&target2)
            .map_err(|e| format!("Create file: {}", e))?;

        let mut buf = [0u8; 65536];
        loop {
            let n = resp.read(&mut buf).map_err(|e| format!("Read: {}", e))?;
            if n == 0 { break; }
            file.write_all(&buf[..n]).map_err(|e| format!("Write: {}", e))?;
            downloaded += n as u64;
            let pct = if total > 0 { ((downloaded * 100) / total) as u8 } else { 0 };
            let _ = app2.emit("whisper_download_progress",
                serde_json::json!({ "done": false, "pct": pct, "downloaded": downloaded, "total": total }));
        }

        let path_str = target2.to_string_lossy().to_string();
        let _ = app2.emit("whisper_download_progress",
            serde_json::json!({ "done": true, "pct": 100, "path": &path_str }));
        Ok(path_str)
    })
    .await
    .map_err(|e| format!("Task: {}", e))?
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| format!("mkdir {}: {}", dst.display(), e))?;
    for entry in std::fs::read_dir(src).map_err(|e| format!("readdir {}: {}", src.display(), e))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| {
                format!(
                    "copy {} → {}: {}",
                    src_path.display(),
                    dst_path.display(),
                    e
                )
            })?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn install_bmad_to_dir(
    app_handle: AppHandle,
    target_dir: String,
) -> Result<String, String> {
    let _ = app_handle.emit(
        "bmad_install_progress",
        serde_json::json!({ "stage": "start", "target": &target_dir }),
    );

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("Cannot resolve resource dir: {}", e))?;

    let bmad_source = resource_dir.join("bmad-bundle");

    // Dev fallback: look relative to project root
    let bmad_source = if bmad_source.exists() {
        bmad_source
    } else {
        let dev_path = std::path::PathBuf::from("../assets/bmad-bundle");
        if dev_path.exists() {
            dev_path
        } else {
            let _ = app_handle.emit(
                "bmad_install_progress",
                serde_json::json!({ "stage": "error", "reason": "bundle_not_found" }),
            );
            return Err("BMAD bundle not found. Please reinstall NEURODECK.".to_string());
        }
    };

    let target = std::path::PathBuf::from(&target_dir);
    if !target.exists() {
        let _ = app_handle.emit(
            "bmad_install_progress",
            serde_json::json!({ "stage": "error", "reason": "target_missing" }),
        );
        return Err(format!("Target directory does not exist: {}", target_dir));
    }

    copy_dir_recursive(&bmad_source, &target).map_err(|e| format!("BMAD install failed: {}", e))?;

    let _ = app_handle.emit(
        "bmad_install_progress",
        serde_json::json!({ "stage": "done", "target": &target_dir }),
    );

    Ok(format!(
        "BMAD installed to {}  (_bmad/ + .claude/skills/ with 44 skill sets)",
        target_dir
    ))
}

#[derive(serde::Serialize, Clone)]
pub struct MemoryRecordFrontend {
    pub id: String,
    pub content: String,
    pub metadata: std::collections::HashMap<String, String>,
}

#[tauri::command]
pub fn memory_list_all(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<MemoryRecordFrontend>, String> {
    let mem_db = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.mem_db.clone()
    };
    let db = mem_db.ok_or("Memory database not initialized")?;
    let records = db.list_all()?;
    Ok(records
        .into_iter()
        .map(|r| MemoryRecordFrontend {
            id: r.id,
            content: r.content,
            metadata: r.metadata,
        })
        .collect())
}

#[tauri::command]
pub fn memory_delete(id: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mem_db = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.mem_db.clone()
    };
    let db = mem_db.ok_or("Memory database not initialized")?;
    db.delete_record(&id)
}

#[tauri::command]
pub fn memory_pin(
    id: String,
    pinned: bool,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let mem_db = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.mem_db.clone()
    };
    let db = mem_db.ok_or("Memory database not initialized")?;
    db.set_pinned(&id, pinned)
}

#[tauri::command]
pub fn memory_add_fact(
    content: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    if content.trim().is_empty() {
        return Err("Fact content cannot be empty".to_string());
    }
    let mem_db = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.mem_db.clone()
    };
    let db = mem_db.ok_or("Memory database not initialized")?;
    let id = format!("fact-{}", chrono::Utc::now().format("%Y%m%d%H%M%S%3f"));
    db.add_fact(id.clone(), content)?;
    Ok(id)
}

#[tauri::command]
pub async fn start_oauth_flow(
    state: State<'_, Mutex<AppState>>,
) -> Result<neurodeck_infrastructure::oauth::DeviceAuthResponse, String> {
    let client_id = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.config.llm.google_client_id.clone()
    };
    if client_id.is_empty() {
        return Err("google_client_id is not set in llm-term.toml. Add google_client_id = \"your-client-id\" under [llm].".to_string());
    }
    let config = neurodeck_infrastructure::oauth::OAuthConfig {
        client_id,
        ..neurodeck_infrastructure::oauth::OAuthConfig::default()
    };
    neurodeck_infrastructure::oauth::request_device_code(&config).await
}

#[tauri::command]
pub async fn poll_oauth_token(
    device_code: String,
    interval: u64,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let client_id = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.config.llm.google_client_id.clone()
    };
    let config = if client_id.is_empty() {
        neurodeck_infrastructure::oauth::OAuthConfig::default()
    } else {
        neurodeck_infrastructure::oauth::OAuthConfig {
            client_id,
            ..neurodeck_infrastructure::oauth::OAuthConfig::default()
        }
    };
    let token =
        neurodeck_infrastructure::oauth::poll_for_token(&config, &device_code, interval).await?;

    // Save to OS Keychain
    neurodeck_infrastructure::secrets::save_gemini_api_key(&token)?;

    // Update active provider using the key directly — never mutate the global env var
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.provider = Arc::new(GeminiProvider::new_with_key(
        app.config.llm.gemini_model.clone(),
        token.clone(),
    ));

    Ok(())
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

#[tauri::command]
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
            // On Windows check for any audio input device via PowerShell
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
            // Check for arecord (ALSA) or pactl (PulseAudio/PipeWire)
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
            .map(|o| o.status.success() || !o.stderr.is_empty()) // ssh -V writes to stderr
            .unwrap_or(false);

        if found {
            // Try to get version string
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
            // Windows has built-in SAPI TTS — always available
            (true, "Windows SAPI TTS available".to_string())
        }
        #[cfg(target_os = "macos")]
        {
            // macOS has `say` built in
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
            // Linux: check espeak-ng or espeak
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

#[derive(serde::Serialize)]
pub struct ContextStats {
    pub active_model: String,
    pub active_provider: String,
    pub memory_records_count: usize,
    pub memory_pinned_count: usize,
    pub memory_last_store: String,
    pub session_id: String,
    pub session_messages_count: usize,
    pub session_created: String,
    pub active_persona: String,
    pub ram_available: String,
}

#[tauri::command]
pub fn get_context_stats(state: State<'_, Mutex<AppState>>) -> Result<ContextStats, String> {
    // Scope the lock so it is released before the blocking OS RAM query below.
    let (
        active_provider,
        active_model,
        memory_records_count,
        memory_pinned_count,
        memory_last_store,
        session_id,
        session_messages_count,
        session_created,
        active_persona,
    ) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());

        let active_provider = app.config.llm.default_provider.clone();
        let active_model = if active_provider == "gemini" {
            app.config.llm.gemini_model.clone()
        } else {
            app.config.llm.ollama_model.clone()
        };

        let mut memory_records_count = 0;
        let mut memory_pinned_count = 0;
        let mut memory_last_store = "Never".to_string();

        if let Some(ref db) = app.mem_db {
            if let Ok(records) = db.list_all() {
                memory_records_count = records.len();
                memory_pinned_count = records
                    .iter()
                    .filter(|r| r.metadata.get("pinned") == Some(&"true".to_string()))
                    .count();
                if memory_records_count > 0 {
                    memory_last_store = "Connected".to_string();
                }
            }
        }

        let session_id = app.session_id.clone();
        let session_messages_count = app.messages.len();
        let session_created = if session_id.len() >= 15 {
            let date = &session_id[0..8];
            let time = &session_id[9..15];
            format!(
                "{}-{}-{} {}:{}:{}",
                &date[0..4],
                &date[4..6],
                &date[6..8],
                &time[0..2],
                &time[2..4],
                &time[4..6]
            )
        } else {
            "N/A".to_string()
        };

        let active_persona = app.active_persona.clone();
        (
            active_provider,
            active_model,
            memory_records_count,
            memory_pinned_count,
            memory_last_store,
            session_id,
            session_messages_count,
            session_created,
            active_persona,
        )
    }; // AppState lock released here — RAM query below does not block other commands

    let ram_available = if cfg!(target_os = "windows") {
        let output = std::process::Command::new("cmd")
            .args([
                "/c",
                "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value",
            ])
            .output();
        if let Ok(out) = output {
            let res = String::from_utf8_lossy(&out.stdout);
            let mut free_kb = 0u64;
            let mut total_kb = 0u64;
            for line in res.lines() {
                let trimmed = line.trim();
                if let Some(stripped) = trimmed.strip_prefix("FreePhysicalMemory=") {
                    free_kb = stripped.trim().parse().unwrap_or(0);
                } else if let Some(stripped) = trimmed.strip_prefix("TotalVisibleMemorySize=") {
                    total_kb = stripped.trim().parse().unwrap_or(0);
                }
            }
            if total_kb > 0 {
                format!("{}MB / {}MB", free_kb / 1024, total_kb / 1024)
            } else {
                "Unknown".to_string()
            }
        } else {
            "Unknown".to_string()
        }
    } else {
        let output = std::process::Command::new("sh")
            .arg("-c")
            .arg("free -m | grep Mem")
            .output();
        if let Ok(out) = output {
            let res = String::from_utf8_lossy(&out.stdout);
            let parts: Vec<&str> = res.split_whitespace().collect();
            if parts.len() >= 4 {
                let total = parts[1];
                let available = parts[parts.len() - 1]; // available is the last column
                format!("{}MB / {}MB", available, total)
            } else {
                "Unknown".to_string()
            }
        } else {
            "Unknown".to_string()
        }
    };

    Ok(ContextStats {
        active_model,
        active_provider,
        memory_records_count,
        memory_pinned_count,
        memory_last_store,
        session_id,
        session_messages_count,
        session_created,
        active_persona,
        ram_available,
    })
}

/// Explains a generated prompt in Just Plain English (JPE).
#[tauri::command]
pub async fn generate_jpe_explanation(
    prompt_text: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    if prompt_text.trim().is_empty() {
        return Ok(String::new());
    }

    let system_prompt = "You are a prompt engineering expert. Your task is to explain the intent of the following prompt in Just Plain English (JPE), so that anyone can understand it. Use simple, grade-8 reading level language. Summarize the role, the task, the constraints, and the expected format concisely. Do not evaluate the prompt, just explain what it asks the AI to do.";
    let query = format!(
        "Explain the following prompt in simple English, step by step:\n\n{}",
        prompt_text
    );

    let result = provider
        .chat_with_image(&query, system_prompt, None, None)
        .await?;
    Ok(result.trim().to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct PromptSchema {
    pub persona: String,
    pub task: String,
    pub context: String,
    pub tone: String,
    pub constraints: String,
    pub format: String,
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn assemble_prompt_via_lua_cmd(
    persona: String,
    task: String,
    context: String,
    tone: String,
    constraints: String,
    format: String,
    examples: String,
    formula: String,
    lua_state: State<'_, LuaState>,
) -> Result<String, String> {
    let engine = lua_state.0.lock().unwrap_or_else(|e| e.into_inner());
    engine.assemble_prompt(
        &persona,
        &task,
        &context,
        &tone,
        &constraints,
        &format,
        &examples,
        &formula,
    )
}

#[tauri::command]
pub async fn optimize_raw_prompt(
    raw_text: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<PromptSchema, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    if raw_text.trim().is_empty() {
        return Err("Input draft cannot be empty".to_string());
    }

    let system_prompt = "You are an expert prompt engineer. The user will provide a rough draft of a task or prompt. Your job is to decompose it into a structured prompt schema.\n\
Return ONLY a valid JSON object matching this schema, with no other text, markdown formatting, or explanations. If a field cannot be inferred, return an empty string.\n\n\
JSON Schema:\n\
{\n\
  \"persona\": \"the assumed persona or role of the AI (e.g. 'You are a senior python engineer')\",\n\
  \"task\": \"the core objective or query (e.g. 'write a python function to merge lists')\",\n\
  \"context\": \"any background context, target audience, or domain specific details\",\n\
  \"tone\": \"the tone/style (e.g. 'concise', 'educational')\",\n\
  \"constraints\": \"specific constraints, rules, limits (e.g. 'no third party libraries', 'max 100 words')\",\n\
  \"format\": \"the expected output structure or format (e.g. 'markdown table', 'code block')\"\n\
}";

    let result = provider
        .chat_with_image(&raw_text, system_prompt, None, None)
        .await?;

    // Clean JSON markdown codeblocks if returned
    let cleaned = result
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let schema: PromptSchema = serde_json::from_str(cleaned).map_err(|e| {
        format!(
            "Failed to parse LLM response into prompt schema: {}. Raw response: {}",
            e, result
        )
    })?;

    Ok(schema)
}

#[tauri::command]
pub async fn generate_jpe_explanation_with_level(
    prompt_text: String,
    reading_level: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    if prompt_text.trim().is_empty() {
        return Ok(String::new());
    }

    let tone_instruction = match reading_level.to_lowercase().as_str() {
        "grade8" => "simple, grade-8 reading level language suitable for children or non-experts",
        "grade12" => "clear, standard grade-12 reading level language",
        "executive" => "high-level, executive business summary style, focusing on outcomes and ROI",
        "technical" => "highly technical and analytical language, dissecting parameter weights and prompt structure details",
        _ => "simple, grade-8 reading level language",
    };

    let system_prompt = format!(
        "You are a prompt engineering expert. Your task is to explain the intent of the following prompt in Just Plain English (JPE), so that anyone can understand it. Use {}. Summarize the role, the task, the constraints, and the expected format concisely. Do not evaluate the prompt, just explain what it asks the AI to do.",
        tone_instruction
    );

    let query = format!(
        "Explain the following prompt in simple English, step by step:\n\n{}",
        prompt_text
    );

    let result = provider
        .chat_with_image(&query, &system_prompt, None, None)
        .await?;
    Ok(result.trim().to_string())
}

#[tauri::command]
pub fn save_prompt_preset(name: String, schema_json: String) -> Result<(), String> {
    let data_dir = user_config_dir().join("data");
    let _ = std::fs::create_dir_all(&data_dir);
    let path = data_dir.join("prompt_presets.json");

    let mut presets = if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<std::collections::HashMap<String, String>>(&content)
            .unwrap_or_default()
    } else {
        std::collections::HashMap::new()
    };

    presets.insert(name, schema_json);

    let serialized = serde_json::to_string_pretty(&presets).map_err(|e| e.to_string())?;
    std::fs::write(&path, serialized).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_prompt_presets() -> Result<std::collections::HashMap<String, String>, String> {
    let path = user_config_dir().join("data/prompt_presets.json");
    if !path.exists() {
        return Ok(std::collections::HashMap::new());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let presets = serde_json::from_str::<std::collections::HashMap<String, String>>(&content)
        .unwrap_or_default();
    Ok(presets)
}

/// AI-powered terminal autocomplete.
/// Takes the current terminal input buffer and returns suggested completion suffix.
#[tauri::command]
pub async fn shell_autocomplete(
    buffer: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    if buffer.trim().is_empty() {
        return Ok(String::new());
    }

    let system_prompt = "You are a Unix/Linux shell autocomplete daemon. The user has partially typed a shell command. You must return ONLY the remaining characters needed to complete the most likely command — nothing else. No explanations, no punctuation, no newlines. If the input already looks complete or you cannot determine a sensible completion, return an empty string.";

    let prompt = format!("Complete this shell command: {}", buffer);

    // Use chat_with_image (text-only, no image) for a single-shot non-streaming response
    let result = provider
        .chat_with_image(&prompt, system_prompt, None, None)
        .await?;

    // Clean the result: strip any leading text the model may have added
    let completion = result.trim().to_string();

    // Safety check: completion should be short and not contain the original buffer
    if completion.len() > 200 || completion.contains('\n') {
        return Ok(String::new());
    }

    Ok(completion)
}

/// Read the most recent screenshot from Steam or system Pictures directories.
/// Returns a map with keys: `path`, `data` (base64), `mime`.
#[tauri::command]
pub async fn read_last_screenshot() -> Result<HashMap<String, String>, String> {
    let mut candidate_dirs: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let home_path = PathBuf::from(&home);

            // SteamOS screenshot dirs: ~/.local/share/Steam/userdata/*/760/remote/*/screenshots/
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

            // XDG Pictures/Screenshots
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
        // On Windows: %USERPROFILE%\Pictures\Screenshots
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let p = PathBuf::from(&userprofile).join("Pictures\\Screenshots");
            if p.is_dir() {
                candidate_dirs.push(p);
            }
        }
        // Steam on Windows
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

    // Find the most recently modified image file across all candidate dirs
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

    use base64::prelude::*;
    let b64 = BASE64_STANDARD.encode(&data);

    let mut result = HashMap::new();
    result.insert("path".to_string(), path.to_string_lossy().to_string());
    result.insert("data".to_string(), b64);
    result.insert("mime".to_string(), mime.to_string());

    Ok(result)
}

/// AI-powered shell history search.
/// Reads local shell history, deduplicates, and asks the LLM to rank/filter by relevance.
#[tauri::command]
pub async fn search_history_ai(
    query: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<String>, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    // Collect history from common shell history files
    let mut history_lines: Vec<String> = Vec::new();

    let history_files = {
        let mut files: Vec<PathBuf> = Vec::new();

        #[cfg(target_os = "linux")]
        {
            if let Ok(home) = std::env::var("HOME") {
                let home_path = PathBuf::from(&home);
                for rel in &[
                    ".bash_history",
                    ".zsh_history",
                    ".local/share/fish/fish_history",
                ] {
                    let p = home_path.join(rel);
                    if p.exists() {
                        files.push(p);
                    }
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            // PowerShell history
            if let Ok(appdata) = std::env::var("APPDATA") {
                let ps_history = PathBuf::from(&appdata)
                    .join("Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt");
                if ps_history.exists() {
                    files.push(ps_history);
                }
            }
        }

        files
    };

    for file in &history_files {
        if let Ok(content) = std::fs::read_to_string(file) {
            for line in content.lines() {
                let trimmed = line.trim();
                // Skip zsh history metadata lines (": 1234567890:0;")
                if trimmed.is_empty() || trimmed.starts_with(": ") {
                    continue;
                }
                // For zsh history, extract the actual command after the semicolon
                let cmd = if let Some(semi) = trimmed.find(';') {
                    trimmed[semi + 1..].trim().to_string()
                } else {
                    trimmed.to_string()
                };
                if !cmd.is_empty() {
                    history_lines.push(cmd);
                }
            }
        }
    }

    if history_lines.is_empty() {
        return Ok(Vec::new());
    }

    // Deduplicate while preserving order (most recent wins)
    history_lines.reverse();
    let mut seen = std::collections::HashSet::new();
    history_lines.retain(|line| seen.insert(line.clone()));

    // Take at most 150 entries to keep the prompt manageable
    let history_sample: Vec<String> = history_lines.into_iter().take(150).collect();

    let history_text = history_sample.join("\n");
    let system_prompt = "You are a shell history search assistant. The user provides a natural-language search query and a list of past shell commands. You must return ONLY the 10 most relevant commands from the list, ordered from most to least relevant. Return exactly one command per line, with no numbering, commentary, or extra text. If fewer than 10 commands are relevant, return only the relevant ones.";
    let prompt = format!(
        "Search query: \"{}\"\n\nShell history:\n{}",
        query, history_text
    );

    let raw = provider
        .chat_with_image(&prompt, system_prompt, None, None)
        .await?;

    let results: Vec<String> = raw
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .take(10)
        .collect();

    Ok(results)
}

fn collect_text_files(dir: &Path, collected: &mut Vec<PathBuf>, max: usize) {
    let extensions = [
        "txt", "md", "rs", "py", "js", "ts", "json", "toml", "yaml", "yml", "csv", "log",
    ];
    if collected.len() >= max {
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        if collected.len() >= max {
            break;
        }
        let path = entry.path();
        if path.is_dir() {
            // Skip hidden directories
            if path
                .file_name()
                .map(|n| n.to_string_lossy().starts_with('.'))
                .unwrap_or(false)
            {
                continue;
            }
            collect_text_files(&path, collected, max);
        } else if path.is_file() {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
                .unwrap_or_default();
            if extensions.contains(&ext.as_str()) {
                // Skip files > 100 KB
                if let Ok(meta) = std::fs::metadata(&path) {
                    if meta.len() <= 102_400 {
                        collected.push(path);
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn index_directory(
    path: String,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<usize, String> {
    let (provider, mem_db) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        (app.provider.clone(), app.mem_db.clone())
    };
    let db = mem_db.ok_or("Memory database not initialized")?;
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }
    let canonical_dir = dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize directory: {}", e))?;
    let mut safe = false;
    if let Some(home) = crate::get_home_dir() {
        if let Ok(canonical_home) = home.canonicalize() {
            if canonical_dir.starts_with(&canonical_home) {
                safe = true;
            }
        }
    }
    if !safe {
        if let Ok(current_dir) = std::env::current_dir() {
            if let Ok(canonical_current) = current_dir.canonicalize() {
                if canonical_dir.starts_with(&canonical_current) {
                    safe = true;
                }
            }
        }
    }
    if !safe {
        return Err("Access denied: path escapes the permitted directories sandbox (home directory or current workspace)".to_string());
    }

    let mut files: Vec<PathBuf> = Vec::new();
    collect_text_files(&canonical_dir, &mut files, 500);

    let total = files.len();
    let _ = app_handle.emit(
        "doc_index_progress",
        serde_json::json!({ "indexed": 0, "total": total }),
    );

    let mut indexed = 0usize;
    for file in files {
        let content = match std::fs::read_to_string(&file) {
            Ok(c) if !c.trim().is_empty() => c,
            _ => continue,
        };
        let snippet: String = content.chars().take(4096).collect();
        let file_path_str = file.to_string_lossy().to_string();

        if let Ok(embedding) = provider.generate_embedding(&snippet).await {
            let mut metadata = HashMap::new();
            metadata.insert("namespace".to_string(), "docs".to_string());
            metadata.insert("file".to_string(), file_path_str.clone());
            metadata.insert("role".to_string(), "document".to_string());
            let id = format!("doc::{}", file_path_str);
            let _ = db.store_message(id, snippet, embedding, metadata);
            indexed += 1;
        }
        let _ = app_handle.emit(
            "doc_index_progress",
            serde_json::json!({ "indexed": indexed, "total": total }),
        );
    }

    let _ = app_handle.emit(
        "doc_index_progress",
        serde_json::json!({ "indexed": indexed, "total": total, "done": true }),
    );
    Ok(indexed)
}

#[tauri::command]
pub fn get_doc_count(state: State<'_, Mutex<AppState>>) -> Result<usize, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref db) = app.mem_db {
        db.count_by_namespace("docs")
    } else {
        Ok(0)
    }
}

#[tauri::command]
pub fn clear_doc_index(state: State<'_, Mutex<AppState>>) -> Result<usize, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref db) = app.mem_db {
        db.delete_by_namespace("docs")
    } else {
        Ok(0)
    }
}

fn game_notes_path(app_id: &str) -> PathBuf {
    user_config_dir()
        .join("data/game_notes")
        .join(format!("{}.md", app_id.replace(['/', '\\', '.', ':'], "_")))
}

#[tauri::command]
pub fn get_game_notes(app_id: String) -> Result<String, String> {
    let path = game_notes_path(&app_id);
    if path.exists() {
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read notes: {}", e))
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn save_game_note(app_id: String, content: String) -> Result<(), String> {
    let path = game_notes_path(&app_id);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write notes: {}", e))
}

#[tauri::command]
pub async fn start_mcp_server(
    port: u16,
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<serde_json::Value, String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "mcp-start")?;
    }

    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        if app.mcp_abort.is_some() {
            return Err(format!(
                "MCP server is already running on port {}. Stop it first.",
                app.mcp_port
            ));
        }
        app.provider.clone()
    };

    let (bound_port, abort_handle, token) = mcp::start(port, provider).await?;

    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.mcp_abort = Some(abort_handle);
        app.mcp_port = bound_port;
        app.mcp_token = Some(token.clone());
    }

    Ok(serde_json::json!({
        "url": format!("http://127.0.0.1:{}", bound_port),
        "token": token
    }))
}

#[tauri::command]
pub async fn stop_mcp_server(
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "mcp-stop")?;
    }

    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(handle) = app.mcp_abort.take() {
        handle.abort();
        let port = app.mcp_port;
        app.mcp_port = 13337;
        Ok(format!("MCP server on port {} stopped.", port))
    } else {
        Err("MCP server is not running.".to_string())
    }
}

#[tauri::command]
pub fn get_mcp_status(
    exec_token: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<HashMap<String, String>, String> {
    {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        crate::security::require_exec_token(&app, &exec_token, "mcp-status")?;
    }

    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut result = HashMap::new();
    if app.mcp_abort.is_some() {
        result.insert("running".to_string(), "true".to_string());
        result.insert("port".to_string(), app.mcp_port.to_string());
        result.insert(
            "url".to_string(),
            format!("http://127.0.0.1:{}", app.mcp_port),
        );
        // SECURITY: Do not expose the bearer token to the frontend.
        // The token is stored server-side only and validated on incoming requests.
    } else {
        result.insert("running".to_string(), "false".to_string());
        result.insert("port".to_string(), app.mcp_port.to_string());
    }
    Ok(result)
}

#[tauri::command]
pub async fn canvas_collab_host(
    port: u16,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<u16, String> {
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(abort) = s.collab_abort.take() {
            abort.abort();
        }
        s.collab_tx = None;
        s.collab_mode = None;
        s.collab_addr = None;
        s.collab_peer_count = None;
    }

    let (bound_port, session) = canvas_collab::host(port, app).await?;

    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.collab_abort = Some(session.abort_handle);
    s.collab_tx = Some(session.tx);
    s.collab_mode = Some("host".to_string());
    s.collab_addr = Some(format!("0.0.0.0:{}", bound_port));
    s.collab_peer_count = Some(session.peer_count);

    Ok(bound_port)
}

#[tauri::command]
pub async fn canvas_collab_join(
    addr: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(abort) = s.collab_abort.take() {
            abort.abort();
        }
        s.collab_tx = None;
        s.collab_mode = None;
        s.collab_addr = None;
        s.collab_peer_count = None;
    }

    let session = canvas_collab::join(&addr, app).await?;

    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    s.collab_abort = Some(session.abort_handle);
    s.collab_tx = Some(session.tx);
    s.collab_mode = Some("guest".to_string());
    s.collab_addr = Some(addr);
    s.collab_peer_count = Some(session.peer_count);

    Ok(())
}

#[tauri::command]
pub async fn canvas_collab_send(
    code: String,
    lang: String,
    sender: Option<String>,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let tx = {
        let s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.collab_tx.clone()
    };
    if let Some(tx) = tx {
        let payload = serde_json::json!({
            "type": "sync",
            "code": code,
            "lang": lang,
            "sender": sender.unwrap_or_default()
        });
        tx.send(payload.to_string())
            .await
            .map_err(|_| "Collab channel closed".to_string())?;
        Ok(())
    } else {
        Err("No active collab session".to_string())
    }
}

#[tauri::command]
pub async fn canvas_collab_broadcast(
    payload: serde_json::Value,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let tx = {
        let s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.collab_tx.clone()
    };
    if let Some(tx) = tx {
        tx.send(payload.to_string())
            .await
            .map_err(|_| "Collab channel closed".to_string())?;
        Ok(())
    } else {
        Err("No active collab session".to_string())
    }
}

#[tauri::command]
pub fn canvas_collab_stop(state: State<'_, Mutex<AppState>>) {
    let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(abort) = s.collab_abort.take() {
        abort.abort();
    }
    s.collab_tx = None;
    s.collab_mode = None;
    s.collab_addr = None;
    s.collab_peer_count = None;
}

#[tauri::command]
pub fn canvas_collab_status(state: State<'_, Mutex<AppState>>) -> HashMap<String, String> {
    let s = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut result = HashMap::new();
    result.insert("active".to_string(), s.collab_abort.is_some().to_string());
    result.insert(
        "mode".to_string(),
        s.collab_mode.clone().unwrap_or_else(|| "idle".to_string()),
    );
    result.insert(
        "addr".to_string(),
        s.collab_addr.clone().unwrap_or_default(),
    );
    let peers = s
        .collab_peer_count
        .as_ref()
        .map(|count| count.load(Ordering::SeqCst))
        .unwrap_or(0);
    result.insert("peers".to_string(), peers.to_string());
    result
}

#[tauri::command]
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

#[tauri::command]
pub async fn close_splashscreen(window: tauri::Window) {
    if let Some(splashscreen) = window.get_webview_window("splashscreen") {
        splashscreen.close().unwrap_or_default();
    }
    if let Some(main_window) = window.get_webview_window("main") {
        main_window.show().unwrap_or_default();
    }
}

#[tauri::command]
pub async fn set_kiosk_mode(window: tauri::Window, enabled: bool) -> Result<(), String> {
    let main = window
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    main.set_fullscreen(enabled)
        .map_err(|e| format!("Failed to set fullscreen: {}", e))?;
    main.set_decorations(!enabled)
        .map_err(|e| format!("Failed to set decorations: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_window_mode(window: tauri::Window) -> Result<serde_json::Value, String> {
    let main = window
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    let fullscreen = main
        .is_fullscreen()
        .map_err(|e| format!("Failed to query fullscreen: {}", e))?;
    let decorations = main
        .is_decorated()
        .map_err(|e| format!("Failed to query decorations: {}", e))?;
    Ok(serde_json::json!({
        "fullscreen": fullscreen,
        "decorations": decorations,
        "kiosk": fullscreen && !decorations,
    }))
}

#[tauri::command]
pub async fn dispatch_action(
    action: Intent,
    app_handle: AppHandle,
    _state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    tracing::info!("Received Intent: {:?}", action);

    match action {
        Intent::StartTerminal { id, shell } => {
            tracing::info!("StartTerminal called for id {} with shell {:?}", id, shell);
            let patch = StatePatch::TerminalOutput {
                id: id.clone(),
                data: format!("Initializing terminal {}...\n", id),
            };
            let _ = app_handle.emit("state_patch", patch);
        }
        _ => {
            tracing::warn!(
                "Intent not fully handled yet in backend migration: {:?}",
                action
            );
        }
    }

    Ok(())
}
