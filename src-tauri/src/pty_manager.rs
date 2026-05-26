use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

const SPAWN_TIMEOUT_SECS: u64 = 15;

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

fn build_shell_candidates(requested_shell: &str) -> Vec<String> {
    if cfg!(target_os = "windows") {
        match requested_shell {
            "" => vec!["pwsh.exe".into(), "powershell.exe".into(), "cmd.exe".into()],
            "/bin/bash" => vec![
                "wsl.exe".into(),
                r"C:\Program Files\Git\bin\bash.exe".into(),
                r"C:\Program Files\Git\usr\bin\bash.exe".into(),
                "bash.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            "/bin/zsh" => vec![
                "zsh.exe".into(),
                r"C:\Program Files\Git\usr\bin\zsh.exe".into(),
                "wsl.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            "/bin/fish" => vec![
                "fish.exe".into(),
                r"C:\msys64\usr\bin\fish.exe".into(),
                "wsl.exe".into(),
                "powershell.exe".into(),
                "cmd.exe".into(),
            ],
            "/bin/sh" => vec![
                r"C:\Program Files\Git\bin\sh.exe".into(),
                "sh.exe".into(),
                "wsl.exe".into(),
                "cmd.exe".into(),
            ],
            other => vec![other.to_string(), "powershell.exe".into(), "cmd.exe".into()],
        }
    } else if requested_shell.is_empty() {
        vec!["/bin/bash".into(), "/bin/sh".into()]
    } else {
        vec![
            requested_shell.to_string(),
            "/bin/bash".into(),
            "/bin/sh".into(),
        ]
    }
}

type SpawnParts = (
    Box<dyn Write + Send>,
    Box<dyn Read + Send>,
    Box<dyn MasterPty + Send>,
    Box<dyn portable_pty::Child + Send + Sync>,
);

/// Launches the PTY and shell process in a dedicated thread, returning the
/// master writer/reader and child handle. Times out after SPAWN_TIMEOUT_SECS
/// so a stalled shell binary (e.g. WSL cold start) does not hold the thread
/// indefinitely.
fn spawn_pty_with_timeout(
    cols: u16,
    rows: u16,
    candidates: Vec<String>,
    args: Option<Vec<String>>,
    shell_name: String,
) -> Result<SpawnParts, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Result<SpawnParts, String>>();

    std::thread::spawn(move || {
        let result = (|| -> Result<SpawnParts, String> {
            let pty_system = native_pty_system();
            let pair = pty_system
                .openpty(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(to_string_err)?;

            let mut child_opt: Option<Box<dyn portable_pty::Child + Send + Sync>> = None;
            for (i, candidate) in candidates.iter().enumerate() {
                let mut cmd = CommandBuilder::new(candidate);
                if i == 0 {
                    if let Some(ref arg_list) = args {
                        for arg in arg_list {
                            cmd.arg(arg);
                        }
                    }
                }
                if let Ok(child) = pair.slave.spawn_command(cmd) {
                    child_opt = Some(child);
                    break;
                }
            }

            let child = child_opt.ok_or_else(|| {
                format!(
                    "Could not launch any shell for '{}'. Tried: {}",
                    shell_name,
                    candidates.join(", ")
                )
            })?;

            let writer = pair.master.take_writer().map_err(to_string_err)?;
            let reader = pair.master.try_clone_reader().map_err(to_string_err)?;
            Ok((writer, reader, pair.master, child))
        })();

        let _ = tx.send(result);
    });

    rx.recv_timeout(std::time::Duration::from_secs(SPAWN_TIMEOUT_SECS))
        .map_err(|_| {
            format!(
                "Shell spawn timed out after {}s — shell binary may be missing or stalled (WSL cold start?)",
                SPAWN_TIMEOUT_SECS
            )
        })?
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
    let requested_shell = shell.unwrap_or_default();
    let candidates = build_shell_candidates(&requested_shell);

    let remote_tx_snap: Option<tokio::sync::broadcast::Sender<String>> = {
        state
            .remote_tx
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    };

    let (writer, mut reader, master, mut child) =
        spawn_pty_with_timeout(cols, rows, candidates, args, requested_shell)?;

    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();

    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        while let Ok(n) = reader.read(&mut buffer) {
            if n == 0 {
                break;
            }
            let text = String::from_utf8_lossy(&buffer[..n]).to_string();
            let _ = app_handle_clone.emit(
                "pty_output",
                PtyOutputPayload {
                    id: id_clone.clone(),
                    data: text.clone(),
                },
            );
            if let Some(ref tx) = remote_tx_snap {
                let payload = serde_json::json!({"type":"pty_output","data": text}).to_string();
                let _ = tx.send(payload);
            }
        }
        let _ = child.wait();
        let _ = app_handle_clone.emit("pty_exit", id_clone);
    });

    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    // Drop any existing session for this ID before inserting.  Dropping the
    // PtySession closes the writer and master fd, which causes the old reader
    // thread's read() to return an error and exit — preventing a thread leak.
    sessions.remove(&id);
    sessions.insert(id, PtySession { writer, master });

    Ok(())
}

#[tauri::command]
pub fn pty_write(id: String, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(session) = sessions.get_mut(&id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(to_string_err)?;
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
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(to_string_err)?;
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}

#[tauri::command]
pub fn pty_kill(id: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if sessions.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}
