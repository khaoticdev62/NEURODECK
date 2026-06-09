#![allow(dead_code)]

use crate::{AppHandle, State};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const SPAWN_TIMEOUT_SECS: u64 = 15;
/// Maximum lifetime for a PTY session before it is force-killed (2 hours).
const MAX_SESSION_LIFETIME_SECS: u64 = 7200;
/// Watchdog wake interval (60 seconds).
const WATCHDOG_INTERVAL_SECS: u64 = 60;

#[derive(Clone, serde::Serialize)]
struct PtyOutputPayload {
    id: String,
    data: String,
}

pub struct PtySession {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub spawned_at: Instant,
}

pub struct PtyState {
    pub sessions: Arc<Mutex<HashMap<String, PtySession>>>,
    /// Broadcast sender wired to the remote-control WebSocket fan-out.
    /// Set by `start_remote_server`, cleared by `stop_remote_server`.
    pub remote_tx: Arc<Mutex<Option<tokio::sync::broadcast::Sender<String>>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            remote_tx: Arc::new(Mutex::new(None)),
        }
    }
}

impl PtyState {
    pub fn new() -> Self {
        let state = Self::default();

        // Spawn session TTL watchdog thread
        let sessions_weak = Arc::downgrade(&state.sessions);
        std::thread::spawn(move || {
            let interval = Duration::from_secs(WATCHDOG_INTERVAL_SECS);
            let max_lifetime = Duration::from_secs(MAX_SESSION_LIFETIME_SECS);
            loop {
                std::thread::sleep(interval);
                let Some(sessions_arc) = sessions_weak.upgrade() else {
                    break; // PtyState dropped, exit watchdog
                };
                let mut sessions = sessions_arc.lock().unwrap_or_else(|e| e.into_inner());
                let now = Instant::now();
                let expired: Vec<String> = sessions
                    .iter()
                    .filter(|(_, session)| now.duration_since(session.spawned_at) > max_lifetime)
                    .map(|(id, _)| id.clone())
                    .collect();
                for id in expired {
                    sessions.remove(&id);
                    // Dropping the PtySession closes the writer/master FDs,
                    // causing the reader thread to exit.
                }
            }
        });

        state
    }
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
    workspace_path: Option<std::path::PathBuf>,
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

                if let Some(ref wp) = workspace_path {
                    cmd.cwd(wp);
                }

                let bin_dir = crate::user_bin_dir();
                let bin_str = bin_dir.to_string_lossy().to_string();
                if let Some(existing_path) = std::env::var_os("PATH") {
                    let new_path = if cfg!(target_os = "windows") {
                        format!("{};{}", bin_str, existing_path.to_string_lossy())
                    } else {
                        format!("{}:{}", bin_str, existing_path.to_string_lossy())
                    };
                    cmd.env("PATH", new_path);
                } else {
                    cmd.env("PATH", bin_str);
                }

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

pub fn pty_spawn(
    id: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
    args: Option<Vec<String>>,
    app_handle: AppHandle,
    state: State<'_, PtyState>,
    app_state: State<'_, std::sync::Mutex<crate::AppState>>,
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

    let workspace_path = {
        let app = app_state.lock().unwrap_or_else(|e| e.into_inner());
        app.config.get_resolved_workspace()
    };

    let (writer, mut reader, master, mut child) = spawn_pty_with_timeout(
        cols,
        rows,
        candidates,
        args,
        requested_shell,
        workspace_path,
    )?;

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
    sessions.insert(
        id,
        PtySession {
            writer,
            master,
            spawned_at: Instant::now(),
        },
    );

    Ok(())
}

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

pub fn pty_kill(id: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    if sessions.remove(&id).is_some() {
        Ok(())
    } else {
        Err(format!("PTY Session {} not found", id))
    }
}

#[cfg(test)]
mod tests {
    use super::build_shell_candidates;
    #[test]
    fn empty_shell_defaults_to_platform_defaults() {
        let candidates = build_shell_candidates("");
        assert!(!candidates.is_empty());
        if cfg!(target_os = "windows") {
            assert_eq!(candidates[0], "pwsh.exe");
        } else {
            assert_eq!(candidates[0], "/bin/bash");
        }
    }

    #[test]
    fn bash_shell_includes_bash_candidates() {
        let candidates = build_shell_candidates("/bin/bash");
        assert!(candidates.iter().any(|c| c.contains("bash")));
        assert!(!candidates.is_empty());
    }

    #[test]
    fn zsh_shell_includes_zsh_candidates() {
        let candidates = build_shell_candidates("/bin/zsh");
        assert!(candidates.iter().any(|c| c.contains("zsh")));
    }

    #[test]
    fn fish_shell_includes_fish_candidates() {
        let candidates = build_shell_candidates("/bin/fish");
        assert!(candidates.iter().any(|c| c.contains("fish")));
    }

    #[test]
    fn sh_shell_includes_sh_candidates() {
        let candidates = build_shell_candidates("/bin/sh");
        assert!(candidates.iter().any(|c| c.contains("sh")));
    }

    #[test]
    fn unknown_shell_returns_itself_as_first_candidate() {
        let candidates = build_shell_candidates("/usr/bin/custom_shell");
        assert_eq!(candidates[0], "/usr/bin/custom_shell");
    }

    #[test]
    fn windows_fallbacks_present_on_windows() {
        if cfg!(target_os = "windows") {
            let candidates = build_shell_candidates("");
            assert!(candidates.contains(&"powershell.exe".to_string()));
            assert!(candidates.contains(&"cmd.exe".to_string()));
        }
    }
}
