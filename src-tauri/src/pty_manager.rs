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

    let primary_shell = shell.clone().unwrap_or_default();
    let has_custom_shell = !primary_shell.is_empty();

    let spawn_result = if has_custom_shell {
        let cmd = CommandBuilder::new(&primary_shell);
        pair.slave.spawn_command(cmd)
    } else {
        let cmd_name = if cfg!(target_os = "windows") {
            "powershell.exe"
        } else {
            "/bin/bash"
        };
        let cmd = CommandBuilder::new(cmd_name);
        pair.slave.spawn_command(cmd)
    };

    let mut _child = match spawn_result {
        Ok(c) => c,
        Err(_) => {
            let default_shell = if cfg!(target_os = "windows") {
                "powershell.exe"
            } else {
                "/bin/bash"
            };

            let spawn_fallback_1 = if has_custom_shell {
                let cmd = CommandBuilder::new(default_shell);
                pair.slave.spawn_command(cmd)
            } else {
                Err(anyhow::Error::msg("skip default shell"))
            };

            match spawn_fallback_1 {
                Ok(c) => c,
                Err(_) => {
                    let standard_shell = if cfg!(target_os = "windows") {
                        "cmd.exe"
                    } else {
                        "/bin/sh"
                    };
                    let cmd = CommandBuilder::new(standard_shell);
                    pair.slave.spawn_command(cmd).map_err(to_string_err)?
                }
            }
        }
    };

    let writer = pair.master.take_writer().map_err(to_string_err)?;
    let mut reader = pair.master.try_clone_reader().map_err(to_string_err)?;

    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();

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
                data: text,
            });
        }
        let _ = app_handle_clone.emit("pty_exit", id_clone);
    });

    let mut sessions = state.sessions.lock().unwrap();
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
    let mut sessions = state.sessions.lock().unwrap();
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
    let sessions = state.sessions.lock().unwrap();
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
    let mut sessions = state.sessions.lock().unwrap();
    if sessions.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}
