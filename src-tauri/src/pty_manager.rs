use portable_pty::{native_pty_system, PtySize, CommandBuilder, MasterPty};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, serde::Serialize)]
struct PtyOutputPayload {
    id: String,
    data: String,
}

pub struct PtySession {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
}

pub struct PtyState {
    pub sessions: Mutex<HashMap<String, PtySession>>,
    /// Broadcast sender wired to the remote-control WebSocket fan-out.
    /// Set by `start_remote_server`, cleared by `stop_remote_server`.
    pub remote_tx: Mutex<Option<tokio::sync::broadcast::Sender<String>>>,
}

fn to_string_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
pub fn pty_spawn(
    id: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
    args: Option<Vec<String>>,
    app_handle: AppHandle,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(to_string_err)?;

    let requested_shell = shell.clone().unwrap_or_default();

    // Build a prioritised list of candidates to try in order.
    // On Windows, POSIX paths are mapped to WSL / Git-Bash / busybox equivalents
    // so the user's selection is honoured rather than silently overriding it.
    let candidates: Vec<String> = if cfg!(target_os = "windows") {
        match requested_shell.as_str() {
            // Default: prefer pwsh (modern), fall back to powershell, then cmd
            "" => vec![
                "pwsh.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            // POSIX bash → WSL bash → Git-for-Windows bash → pwsh → cmd
            "/bin/bash" => vec![
                "wsl.exe".into(),           // wsl.exe launches the default distro's bash
                r"C:\Program Files\Git\bin\bash.exe".into(),
                r"C:\Program Files\Git\usr\bin\bash.exe".into(),
                "bash.exe".into(),          // in PATH (MSYS2, Cygwin, etc.)
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            // POSIX zsh → WSL zsh → standalone zsh builds
            "/bin/zsh" => vec![
                "zsh.exe".into(),
                r"C:\Program Files\Git\usr\bin\zsh.exe".into(),
                "wsl.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            // Fish → WSL fish → MSYS2 fish
            "/bin/fish" => vec![
                "fish.exe".into(),
                r"C:\msys64\usr\bin\fish.exe".into(),
                "wsl.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            // /bin/sh → busybox / git sh / wsl
            "/bin/sh" => vec![
                r"C:\Program Files\Git\bin\sh.exe".into(),
                "sh.exe".into(),
                "wsl.exe".into(),
                "cmd.exe".into(),
            ],
            // powershell / cmd / pwsh passed explicitly → honour as-is
            other => vec![other.to_string(), "powershell.exe".into(), "cmd.exe".into()],
        }
    } else {
        // Non-Windows: use exactly what was requested, fall back to bash then sh
        if requested_shell.is_empty() {
            vec!["/bin/bash".into(), "/bin/sh".into()]
        } else {
            vec![requested_shell.clone(), "/bin/bash".into(), "/bin/sh".into()]
        }
    };

    // Try each candidate until one spawns successfully
    let mut _child = {
        let mut result = Err(anyhow::Error::msg("no shell candidates"));
        for candidate in &candidates {
            let mut cmd = CommandBuilder::new(candidate);
            if candidate == &candidates[0] {
                // Only pass user-supplied args to the primary candidate
                if let Some(ref arg_list) = args {
                    for arg in arg_list { cmd.arg(arg); }
                }
            }
            match pair.slave.spawn_command(cmd) {
                Ok(child) => { result = Ok(child); break; }
                Err(_) => continue,
            }
        }
        result.map_err(|_| format!(
            "Could not launch any shell for '{}'. Tried: {}",
            requested_shell,
            candidates.join(", ")
        ))?
    };

    let writer = pair.master.take_writer().map_err(to_string_err)?;
    let mut reader = pair.master.try_clone_reader().map_err(to_string_err)?;

    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();

    // Snapshot the remote broadcast sender (if active) before entering the thread.
    let remote_tx_snap: Option<tokio::sync::broadcast::Sender<String>> = {
        state.remote_tx.lock().unwrap_or_else(|e| e.into_inner()).clone()
    };

    // Spawn reader thread
    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        while let Ok(n) = reader.read(&mut buffer) {
            if n == 0 {
                break;
            }
            let text = String::from_utf8_lossy(&buffer[..n]).to_string();
            let _ = app_handle_clone.emit("pty_output", PtyOutputPayload {
                id: id_clone.clone(),
                data: text.clone(),
            });
            // Forward PTY output to any connected remote clients
            if let Some(ref tx) = remote_tx_snap {
                let payload = serde_json::json!({"type":"pty_output","data": text}).to_string();
                let _ = tx.send(payload);
            }
        }
        // Reap the child process on exit
        let _ = _child.wait();
        let _ = app_handle_clone.emit("pty_exit", id_clone);
    });

    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    sessions.insert(id, PtySession {
        writer,
        master: pair.master,
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(
    id: String,
    data: String,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(&id) {
        session.writer.write_all(data.as_bytes()).map_err(to_string_err)?;
        session.writer.flush().map_err(to_string_err)?;
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}

#[tauri::command]
pub fn pty_resize(
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get(&id) {
        session.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(to_string_err)?;
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}

#[tauri::command]
pub fn pty_kill(
    id: String,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if sessions.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}
