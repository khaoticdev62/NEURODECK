use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum TunnelRequest {
    #[serde(rename = "run_cmd")]
    RunCmd { command: String },
    #[serde(rename = "write_file")]
    WriteFile { path: String, content: String },
    #[serde(rename = "read_dir")]
    ReadDir { path: String },
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum TunnelResponse {
    #[serde(rename = "success")]
    Success { output: String },
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TunnelEnvelope {
    pub token: String,
    pub request: TunnelRequest,
}

lazy_static::lazy_static! {
    static ref TUNNEL_SHUTDOWN_TX: Mutex<Option<oneshot::Sender<()>>> = Mutex::new(None);
    static ref TUNNEL_TOKEN: Mutex<Option<String>> = Mutex::new(None);
}

/// Constant-time byte comparison — prevents timing oracle on tunnel tokens.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() { return false; }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) { diff |= x ^ y; }
    diff == 0
}

async fn read_framed<S>(socket: &mut S) -> std::io::Result<Vec<u8>>
where
    S: AsyncRead + Unpin,
{
    let mut len_bytes = [0u8; 4];
    socket.read_exact(&mut len_bytes).await?;
    let len = u32::from_be_bytes(len_bytes) as usize;

    if len > 10 * 1024 * 1024 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Payload too large",
        ));
    }

    let mut buf = vec![0u8; len];
    socket.read_exact(&mut buf).await?;
    Ok(buf)
}

async fn write_framed<S>(socket: &mut S, data: &[u8]) -> std::io::Result<()>
where
    S: AsyncWrite + Unpin,
{
    let len = data.len() as u32;
    socket.write_all(&len.to_be_bytes()).await?;
    socket.write_all(data).await?;
    Ok(())
}

fn sanitize_tunnel_path(path_str: &str) -> Result<std::path::PathBuf, String> {
    let base_dir =
        std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    let target_path = std::path::Path::new(path_str);

    let absolute_path = if target_path.is_absolute() {
        target_path.to_path_buf()
    } else {
        base_dir.join(target_path)
    };

    let canonical_path = match absolute_path.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            if let Some(parent) = absolute_path.parent() {
                match parent.canonicalize() {
                    Ok(p_can) => {
                        let file_name = absolute_path.file_name().ok_or("Invalid filename")?;
                        p_can.join(file_name)
                    }
                    Err(e) => return Err(format!("Invalid path directory: {}", e)),
                }
            } else {
                return Err("Invalid path: no parent directory".to_string());
            }
        }
    };

    let canonical_base = base_dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize current directory: {}", e))?;

    if canonical_path.starts_with(&canonical_base) {
        Ok(canonical_path)
    } else {
        Err("Access denied: path escapes S-Term sandbox".to_string())
    }
}

async fn handle_tunnel_request(req: TunnelRequest) -> TunnelResponse {
    match req {
        TunnelRequest::RunCmd { command } => {
            // SECURITY MODEL: RunCmd is intentionally unrestricted — the tunnel
            // is a trusted local-only channel (loopback + shared keychain token)
            // that lets the Game Mode sandbox drive the host Desktop.  The token
            // is never logged or transmitted over the network.  Callers outside
            // this process cannot reach this handler without a valid token.
            // WriteFile/ReadDir are sandboxed to a base path; RunCmd is not,
            // by design — it is the mechanism for full host automation.
            let mut cmd = if cfg!(target_os = "windows") {
                let mut c = tokio::process::Command::new("cmd.exe");
                c.arg("/c").arg(&command);
                c
            } else {
                let mut c = tokio::process::Command::new("sh");
                c.arg("-c").arg(&command);
                c
            };
            match cmd.output().await {
                Ok(output) => {
                    let combined = [output.stdout, output.stderr].concat();
                    TunnelResponse::Success {
                        output: String::from_utf8_lossy(&combined).into_owned(),
                    }
                }
                Err(e) => TunnelResponse::Error {
                    message: format!("Execution failed: {}", e),
                },
            }
        }
        TunnelRequest::WriteFile { path, content } => {
            let safe_path = match sanitize_tunnel_path(&path) {
                Ok(p) => p,
                Err(e) => return TunnelResponse::Error { message: e },
            };
            if let Some(parent) = safe_path.parent() {
                if let Err(e) = std::fs::create_dir_all(parent) {
                    return TunnelResponse::Error {
                        message: format!("Failed to create directories: {}", e),
                    };
                }
            }
            match std::fs::write(&safe_path, content) {
                Ok(_) => TunnelResponse::Success {
                    output: "File successfully written".to_string(),
                },
                Err(e) => TunnelResponse::Error {
                    message: format!("Failed to write file: {}", e),
                },
            }
        }
        TunnelRequest::ReadDir { path } => {
            let safe_path = match sanitize_tunnel_path(&path) {
                Ok(p) => p,
                Err(e) => return TunnelResponse::Error { message: e },
            };
            match std::fs::read_dir(&safe_path) {
                Ok(read_dir) => {
                    let mut items = Vec::new();
                    for entry in read_dir.flatten() {
                        let name = entry.file_name().to_string_lossy().into_owned();
                        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                        items.push(format!("{}{}", name, if is_dir { "/" } else { "" }));
                    }
                    TunnelResponse::Success {
                        output: items.join("\n"),
                    }
                }
                Err(e) => TunnelResponse::Error {
                    message: format!("Failed to read directory: {}", e),
                },
            }
        }
    }
}

pub async fn start_tunnel_server() -> Result<String, String> {
    let mut tx_guard = TUNNEL_SHUTDOWN_TX.lock().unwrap_or_else(|e| e.into_inner());
    if tx_guard.is_some() {
        return Err("Tunnel server is already running".to_string());
    }

    // Generate secure 32-character token
    let token = {
        use rand::distributions::Alphanumeric;
        use rand::{thread_rng, Rng};
        let t: String = thread_rng()
            .sample_iter(&Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();
        t
    };

    // Save token to OS secure keychain
    neurodeck_infrastructure::secrets::save_tunnel_token(&token)
        .map_err(|e| format!("Failed to save tunnel token: {}", e))?;

    // Keep token in memory
    {
        let mut token_guard = TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
        *token_guard = Some(token.clone());
    }

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();
    *tx_guard = Some(shutdown_tx);

    tokio::spawn(async move {
        let listener = match TcpListener::bind("127.0.0.1:18337").await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to bind tunnel server to 18337: {}", e);
                return;
            }
        };
        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    break;
                }
                accept_res = listener.accept() => {
                    if let Ok((mut socket, _)) = accept_res {
                        tokio::spawn(async move {
                            if let Ok(buf) = read_framed(&mut socket).await {
                                let req_str = String::from_utf8_lossy(&buf);
                                let (_, response) = match serde_json::from_str::<TunnelEnvelope>(&req_str) {
                                    Ok(envelope) => {
                                        let expected = {
                                            let guard = TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
                                            guard.clone()
                                        };
                                        if let Some(expected_token) = expected {
                                            if constant_time_eq(envelope.token.as_bytes(), expected_token.as_bytes()) {
                                                (true, handle_tunnel_request(envelope.request).await)
                                            } else {
                                                (false, TunnelResponse::Error { message: "Authentication failed".to_string() })
                                            }
                                        } else {
                                            (false, TunnelResponse::Error { message: "Authentication token not initialized".to_string() })
                                        }
                                    }
                                    Err(e) => {
                                        (false, TunnelResponse::Error { message: format!("Authentication or request format failed: {}", e) })
                                    }
                                };
                                if let Ok(resp_bytes) = serde_json::to_vec(&response) {
                                    let _ = write_framed(&mut socket, &resp_bytes).await;
                                }
                            }
                        });
                    }
                }
            }
        }
    });

    Ok("Tunnel server started successfully on 127.0.0.1:18337".to_string())
}

pub async fn stop_tunnel_server() -> Result<String, String> {
    let mut tx_guard = TUNNEL_SHUTDOWN_TX.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tx) = tx_guard.take() {
        let _ = tx.send(());
        // Clean up token from memory and keychain
        {
            let mut token_guard = TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
            *token_guard = None;
        }
        let _ = neurodeck_infrastructure::secrets::delete_tunnel_token();
        Ok("Tunnel server stopped".to_string())
    } else {
        Err("Tunnel server was not running".to_string())
    }
}

pub async fn send_tunnel_request(request: String) -> Result<String, String> {
    use tokio::net::TcpStream;

    let token = {
        let guard = TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
        guard.clone()
    }
    .or_else(|| neurodeck_infrastructure::secrets::get_tunnel_token().ok())
    .ok_or_else(|| "Tunnel token not found. Is the tunnel server running?".to_string())?;

    let req_obj: TunnelRequest =
        serde_json::from_str(&request).map_err(|e| format!("Invalid request payload: {}", e))?;

    let envelope = TunnelEnvelope {
        token,
        request: req_obj,
    };

    let envelope_str = serde_json::to_string(&envelope)
        .map_err(|e| format!("Failed to serialize envelope: {}", e))?;

    let mut stream = TcpStream::connect("127.0.0.1:18337")
        .await
        .map_err(|e| format!("Failed to connect to tunnel server: {}", e))?;

    write_framed(&mut stream, envelope_str.as_bytes())
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let buf = read_framed(&mut stream)
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(String::from_utf8_lossy(&buf).to_string())
}

pub async fn run_tunnel_server_headless() -> Result<(), String> {
    // Generate secure 32-character token
    let token = {
        use rand::distributions::Alphanumeric;
        use rand::{thread_rng, Rng};
        let t: String = thread_rng()
            .sample_iter(&Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();
        t
    };

    // Save token to OS secure keychain
    neurodeck_infrastructure::secrets::save_tunnel_token(&token)
        .map_err(|e| format!("Failed to save tunnel token: {}", e))?;

    // Keep token in memory
    {
        let mut token_guard = TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
        *token_guard = Some(token.clone());
    }

    let listener = TcpListener::bind("127.0.0.1:18337")
        .await
        .map_err(|e| format!("Failed to bind tunnel server to 18337: {}", e))?;

    loop {
        match listener.accept().await {
            Ok((mut socket, _)) => {
                tokio::spawn(async move {
                    if let Ok(buf) = read_framed(&mut socket).await {
                        let req_str = String::from_utf8_lossy(&buf);
                        let (_, response) = match serde_json::from_str::<TunnelEnvelope>(&req_str) {
                            Ok(envelope) => {
                                let expected = {
                                    let guard =
                                        TUNNEL_TOKEN.lock().unwrap_or_else(|e| e.into_inner());
                                    guard.clone()
                                };
                                if let Some(expected_token) = expected {
                                    if envelope.token == expected_token {
                                        (true, handle_tunnel_request(envelope.request).await)
                                    } else {
                                        (
                                            false,
                                            TunnelResponse::Error {
                                                message: "Authentication failed".to_string(),
                                            },
                                        )
                                    }
                                } else {
                                    (
                                        false,
                                        TunnelResponse::Error {
                                            message: "Authentication token not initialized"
                                                .to_string(),
                                        },
                                    )
                                }
                            }
                            Err(e) => (
                                false,
                                TunnelResponse::Error {
                                    message: format!(
                                        "Authentication or request format failed: {}",
                                        e
                                    ),
                                },
                            ),
                        };
                        if let Ok(resp_bytes) = serde_json::to_vec(&response) {
                            let _ = write_framed(&mut socket, &resp_bytes).await;
                        }
                    }
                });
            }
            Err(e) => {
                eprintln!("Error accepting connection: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::constant_time_eq;

    #[test]
    fn tunnel_token_eq_matches() {
        assert!(constant_time_eq(b"abc123", b"abc123"));
    }

    #[test]
    fn tunnel_token_eq_rejects_wrong() {
        assert!(!constant_time_eq(b"abc123", b"xyz789"));
    }

    #[test]
    fn tunnel_token_eq_rejects_prefix() {
        assert!(!constant_time_eq(b"abc", b"abcx"));
    }
}
