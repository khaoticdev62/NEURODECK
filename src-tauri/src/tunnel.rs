use std::sync::Mutex;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

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

async fn handle_tunnel_request(req: TunnelRequest) -> TunnelResponse {
    match req {
        TunnelRequest::RunCmd { command } => {
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
                Err(e) => TunnelResponse::Error { message: format!("Execution failed: {}", e) },
            }
        }
        TunnelRequest::WriteFile { path, content } => {
            let path_obj = Path::new(&path);
            if let Some(parent) = path_obj.parent() {
                if let Err(e) = std::fs::create_dir_all(parent) {
                    return TunnelResponse::Error { message: format!("Failed to create directories: {}", e) };
                }
            }
            match std::fs::write(path_obj, content) {
                Ok(_) => TunnelResponse::Success { output: format!("File successfully written to {}", path) },
                Err(e) => TunnelResponse::Error { message: format!("Failed to write file: {}", e) },
            }
        }
        TunnelRequest::ReadDir { path } => {
            match std::fs::read_dir(Path::new(&path)) {
                Ok(read_dir) => {
                    let mut items = Vec::new();
                    for entry in read_dir.flatten() {
                        let name = entry.file_name().to_string_lossy().into_owned();
                        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                        items.push(format!("{}{}", name, if is_dir { "/" } else { "" }));
                    }
                    TunnelResponse::Success { output: items.join("\n") }
                }
                Err(e) => TunnelResponse::Error { message: format!("Failed to read directory: {}", e) },
            }
        }
    }
}

#[tauri::command]
pub async fn start_tunnel_server() -> Result<String, String> {
    let mut tx_guard = TUNNEL_SHUTDOWN_TX.lock().unwrap();
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

    // Save token to data/tunnel_token with secure permissions on Unix (0600)
    let data_dir = Path::new("data");
    if !data_dir.exists() {
        std::fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    let token_path = data_dir.join("tunnel_token");

    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        use std::io::Write as IoWrite;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&token_path)
            .map_err(|e| format!("Failed to open tunnel_token: {}", e))?;
        file.write_all(token.as_bytes()).map_err(|e| format!("Failed to write token: {}", e))?;
    }
    #[cfg(not(unix))]
    {
        std::fs::write(&token_path, &token).map_err(|e| format!("Failed to write token: {}", e))?;
    }

    // Keep token in memory
    {
        let mut token_guard = TUNNEL_TOKEN.lock().unwrap();
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
        println!("Tunnel server running on 127.0.0.1:18337");

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    println!("Tunnel server shutting down");
                    break;
                }
                accept_res = listener.accept() => {
                    if let Ok((mut socket, _)) = accept_res {
                        tokio::spawn(async move {
                            let mut buf = vec![0u8; 65536];
                            if let Ok(n) = socket.read(&mut buf).await {
                                if n == 0 { return; }
                                let req_str = String::from_utf8_lossy(&buf[..n]);
                                let (_, response) = match serde_json::from_str::<TunnelEnvelope>(&req_str) {
                                    Ok(envelope) => {
                                        let expected = {
                                            let guard = TUNNEL_TOKEN.lock().unwrap();
                                            guard.clone()
                                        };
                                        if let Some(expected_token) = expected {
                                            if envelope.token == expected_token {
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
                                    let _ = socket.write_all(&resp_bytes).await;
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

#[tauri::command]
pub async fn stop_tunnel_server() -> Result<String, String> {
    let mut tx_guard = TUNNEL_SHUTDOWN_TX.lock().unwrap();
    if let Some(tx) = tx_guard.take() {
        let _ = tx.send(());
        // Clean up token from memory and file
        {
            let mut token_guard = TUNNEL_TOKEN.lock().unwrap();
            *token_guard = None;
        }
        let _ = std::fs::remove_file("data/tunnel_token");
        Ok("Tunnel server stopped".to_string())
    } else {
        Err("Tunnel server was not running".to_string())
    }
}

#[tauri::command]
pub async fn send_tunnel_request(request: String) -> Result<String, String> {
    use tokio::net::TcpStream;

    let token = {
        let guard = TUNNEL_TOKEN.lock().unwrap();
        guard.clone()
    }.or_else(|| {
        std::fs::read_to_string("data/tunnel_token")
            .ok()
            .map(|s| s.trim().to_string())
    }).ok_or_else(|| "Tunnel token not found. Is the tunnel server running?".to_string())?;

    let req_obj: TunnelRequest = serde_json::from_str(&request)
        .map_err(|e| format!("Invalid request payload: {}", e))?;

    let envelope = TunnelEnvelope {
        token,
        request: req_obj,
    };

    let envelope_str = serde_json::to_string(&envelope)
        .map_err(|e| format!("Failed to serialize envelope: {}", e))?;

    let mut stream = TcpStream::connect("127.0.0.1:18337").await
        .map_err(|e| format!("Failed to connect to tunnel server: {}", e))?;

    stream.write_all(envelope_str.as_bytes()).await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let mut buf = vec![0u8; 65536];
    let n = stream.read(&mut buf).await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if n == 0 {
        return Err("Server closed connection before response".to_string());
    }
    Ok(String::from_utf8_lossy(&buf[..n]).to_string())
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

    // Save token to data/tunnel_token with secure permissions on Unix (0600)
    let data_dir = Path::new("data");
    if !data_dir.exists() {
        std::fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    let token_path = data_dir.join("tunnel_token");

    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        use std::io::Write as IoWrite;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&token_path)
            .map_err(|e| format!("Failed to open tunnel_token: {}", e))?;
        file.write_all(token.as_bytes()).map_err(|e| format!("Failed to write token: {}", e))?;
    }
    #[cfg(not(unix))]
    {
        std::fs::write(&token_path, &token).map_err(|e| format!("Failed to write token: {}", e))?;
    }

    // Keep token in memory
    {
        let mut token_guard = TUNNEL_TOKEN.lock().unwrap();
        *token_guard = Some(token.clone());
    }

    let listener = TcpListener::bind("127.0.0.1:18337").await
        .map_err(|e| format!("Failed to bind tunnel server to 18337: {}", e))?;
    println!("Tunnel server running on 127.0.0.1:18337");

    loop {
        match listener.accept().await {
            Ok((mut socket, _)) => {
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 65536];
                    if let Ok(n) = socket.read(&mut buf).await {
                        if n == 0 { return; }
                        let req_str = String::from_utf8_lossy(&buf[..n]);
                        let (_, response) = match serde_json::from_str::<TunnelEnvelope>(&req_str) {
                            Ok(envelope) => {
                                let expected = {
                                    let guard = TUNNEL_TOKEN.lock().unwrap();
                                    guard.clone()
                                };
                                if let Some(expected_token) = expected {
                                    if envelope.token == expected_token {
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
                            let _ = socket.write_all(&resp_bytes).await;
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

