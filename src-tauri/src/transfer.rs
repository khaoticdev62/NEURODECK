use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader, AsyncBufReadExt};
use tokio::net::{TcpListener, TcpStream, UdpSocket};
use tokio::sync::oneshot;
use serde::{Deserialize, Serialize};
use rand::Rng;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub ip: String,
    pub hostname: String,
    pub os: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTransfer {
    pub id: String,
    pub filename: String,
    pub size: u64,
    pub progress: u64,
    pub status: String, // "Pending", "Accepted", "Rejected", "Transferring", "Completed", "Failed"
    pub direction: String, // "Incoming", "Outgoing"
    pub peer_ip: String,
    pub peer_name: String,
}

#[derive(Serialize, Deserialize)]
struct MetadataHeader {
    id: String,
    sender: String,
    filename: String,
    size: u64,
}

#[derive(Serialize, Deserialize)]
struct ResponseHeader {
    status: String,
}

pub struct TransferState {
    pub peers: HashMap<String, (Peer, Instant)>,
    pub transfers: HashMap<String, FileTransfer>,
    pub accept_txs: HashMap<String, oneshot::Sender<bool>>,
}

impl TransferState {
    pub fn new() -> Self {
        Self {
            peers: HashMap::new(),
            transfers: HashMap::new(),
            accept_txs: HashMap::new(),
        }
    }
}

pub struct SharedTransferState(pub Arc<Mutex<TransferState>>);

fn get_hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| {
            std::process::Command::new("hostname")
                .output()
                .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
                .unwrap_or_else(|_| "S-Term Device".to_string())
        })
}

fn get_os_name() -> String {
    std::env::consts::OS.to_string()
}

pub fn start_transfer_services(app_handle: AppHandle, state: Arc<Mutex<TransferState>>) {
    // 1. UDP Discovery Beacon
    tauri::async_runtime::spawn(async move {
        let socket = match UdpSocket::bind("0.0.0.0:0").await {
            Ok(s) => s,
            Err(e) => {
                println!("Failed to bind UDP beacon socket: {}", e);
                return;
            }
        };
        let _ = socket.set_broadcast(true);
        let hostname = get_hostname();
        let os = get_os_name();
        let payload = format!("NEURODECK_PEER:{}:{}", hostname, os);
        let bytes = payload.as_bytes();

        loop {
            if let Err(e) = socket.send_to(bytes, "255.255.255.255:18339").await {
                println!("Failed to send UDP broadcast: {}", e);
            }
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
        }
    });

    // 2. UDP Discovery Listener
    let app_handle_listener = app_handle.clone();
    let state_listener = state.clone();
    tauri::async_runtime::spawn(async move {
        let socket = match UdpSocket::bind("0.0.0.0:18339").await {
            Ok(s) => s,
            Err(e) => {
                println!("Failed to bind UDP discovery listener: {}", e);
                return;
            }
        };

        let mut buf = [0u8; 1024];

        // Stale peer cleanup worker
        let state_cleanup = state_listener.clone();
        let app_handle_cleanup = app_handle_listener.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                let mut changed = false;
                let mut peer_list = Vec::new();
                {
                    let mut s = state_cleanup.lock().unwrap();
                    let now = Instant::now();
                    let len_before = s.peers.len();
                    s.peers.retain(|_, (_, last_seen)| now.duration_since(*last_seen) < std::time::Duration::from_secs(10));
                    if s.peers.len() != len_before {
                        changed = true;
                    }
                    for (peer, _) in s.peers.values() {
                        peer_list.push(peer.clone());
                    }
                }
                if changed {
                    let _ = app_handle_cleanup.emit("peers_updated", peer_list);
                }
            }
        });

        loop {
            match socket.recv_from(&mut buf).await {
                Ok((len, src_addr)) => {
                    let text = String::from_utf8_lossy(&buf[..len]);
                    if text.starts_with("NEURODECK_PEER:") {
                        let parts: Vec<&str> = text.splitn(3, ':').collect();
                        if parts.len() == 3 {
                            let hostname = parts[1].to_string();
                            let os = parts[2].to_string();
                            let ip = src_addr.ip().to_string();

                            let local_hostname = get_hostname();
                            if hostname != local_hostname {
                                let mut changed = false;
                                let mut peer_list = Vec::new();
                                {
                                    let mut s = state_listener.lock().unwrap();
                                    let peer = Peer {
                                        ip: ip.clone(),
                                        hostname,
                                        os,
                                    };
                                    let is_new = !s.peers.contains_key(&ip);
                                    s.peers.insert(ip.clone(), (peer, Instant::now()));
                                    if is_new {
                                        changed = true;
                                    }
                                    for (p, _) in s.peers.values() {
                                        peer_list.push(p.clone());
                                    }
                                }
                                if changed {
                                    let _ = app_handle_listener.emit("peers_updated", peer_list);
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    println!("UDP recv error: {}", e);
                }
            }
        }
    });

    // 3. TCP Transfer Server
    let app_handle_server = app_handle.clone();
    let state_server = state.clone();
    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind("0.0.0.0:18338").await {
            Ok(l) => l,
            Err(e) => {
                println!("Failed to bind TCP transfer server: {}", e);
                return;
            }
        };

        loop {
            match listener.accept().await {
                Ok((socket, addr)) => {
                    let app_handle = app_handle_server.clone();
                    let state = state_server.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = handle_incoming_connection(socket, addr.ip().to_string(), app_handle, state).await {
                            println!("Error handling incoming connection from {}: {}", addr, e);
                        }
                    });
                }
                Err(e) => {
                    println!("TCP accept error: {}", e);
                }
            }
        }
    });
}

async fn handle_incoming_connection(
    socket: TcpStream,
    peer_ip: String,
    app_handle: AppHandle,
    state: Arc<Mutex<TransferState>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let (rx, mut tx) = socket.into_split();
    let mut reader = BufReader::new(rx);
    let mut line = String::new();
    reader.read_line(&mut line).await?;
    
    let header: MetadataHeader = serde_json::from_str(line.trim())?;
    
    let transfer_id = header.id.clone();
    let filename = header.filename.clone();
    let size = header.size;
    let peer_name = header.sender.clone();
    
    let transfer = FileTransfer {
        id: transfer_id.clone(),
        filename: filename.clone(),
        size,
        progress: 0,
        status: "Pending".to_string(),
        direction: "Incoming".to_string(),
        peer_ip: peer_ip.clone(),
        peer_name: peer_name.clone(),
    };
    
    let (accept_tx, accept_rx) = oneshot::channel::<bool>();
    
    {
        let mut s = state.lock().unwrap();
        s.transfers.insert(transfer_id.clone(), transfer.clone());
        s.accept_txs.insert(transfer_id.clone(), accept_tx);
    }
    
    let _ = app_handle.emit("transfer_incoming", transfer.clone());
    
    let accepted = match accept_rx.await {
        Ok(val) => val,
        Err(_) => false,
    };
    
    if !accepted {
        let resp = ResponseHeader { status: "rejected".to_string() };
        let resp_bytes = format!("{}\n", serde_json::to_string(&resp)?);
        tx.write_all(resp_bytes.as_bytes()).await?;
        
        {
            let mut s = state.lock().unwrap();
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                t.status = "Rejected".to_string();
            }
            s.accept_txs.remove(&transfer_id);
        }
        let _ = app_handle.emit("transfer_failed", transfer_id);
        return Ok(());
    }
    
    let resp = ResponseHeader { status: "accepted".to_string() };
    let resp_bytes = format!("{}\n", serde_json::to_string(&resp)?);
    tx.write_all(resp_bytes.as_bytes()).await?;
    
    {
        let mut s = state.lock().unwrap();
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Transferring".to_string();
        }
        s.accept_txs.remove(&transfer_id);
    }
    let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), 0u64));
    
    let download_dir = app_handle.path().download_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default())
        .join("neurodeck_transfers");
    
    tokio::fs::create_dir_all(&download_dir).await?;
    
    let file_path = download_dir.join(&filename);
    let mut file = File::create(file_path).await?;
    
    let mut buffer = [0u8; 16384];
    let mut bytes_written = 0u64;
    let mut last_emit = Instant::now();
    
    while bytes_written < size {
        let to_read = std::cmp::min((size - bytes_written) as usize, buffer.len());
        let n = reader.read(&mut buffer[..to_read]).await?;
        if n == 0 {
            return Err("TCP stream closed prematurely".into());
        }
        file.write_all(&buffer[..n]).await?;
        bytes_written += n as u64;
        
        if last_emit.elapsed() > std::time::Duration::from_millis(150) || bytes_written == size {
            {
                let mut s = state.lock().unwrap();
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.progress = bytes_written;
                }
            }
            let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), bytes_written));
            last_emit = Instant::now();
        }
    }
    
    {
        let mut s = state.lock().unwrap();
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Completed".to_string();
            t.progress = size;
        }
    }
    let _ = app_handle.emit("transfer_completed", transfer_id);
    
    Ok(())
}

async fn run_outgoing_transfer(
    transfer_id: String,
    peer_ip: String,
    file_path: PathBuf,
    filename: String,
    size: u64,
    app_handle: AppHandle,
    state: Arc<Mutex<TransferState>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let peer_addr = format!("{}:18338", peer_ip);
    
    let socket = match TcpStream::connect(&peer_addr).await {
        Ok(s) => s,
        Err(e) => {
            {
                let mut s = state.lock().unwrap();
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.status = "Failed".to_string();
                }
            }
            let _ = app_handle.emit("transfer_failed", transfer_id.clone());
            return Err(e.into());
        }
    };
    
    let (rx, mut tx) = socket.into_split();
    let hostname = get_hostname();
    let header = MetadataHeader {
        id: transfer_id.clone(),
        sender: hostname,
        filename,
        size,
    };
    let header_bytes = format!("{}\n", serde_json::to_string(&header)?);
    tx.write_all(header_bytes.as_bytes()).await?;
    
    let mut reader = BufReader::new(rx);
    let mut line = String::new();
    reader.read_line(&mut line).await?;
    
    let resp: ResponseHeader = serde_json::from_str(line.trim())?;
    
    if resp.status != "accepted" {
        {
            let mut s = state.lock().unwrap();
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                t.status = "Rejected".to_string();
            }
        }
        let _ = app_handle.emit("transfer_failed", transfer_id);
        return Ok(());
    }
    
    {
        let mut s = state.lock().unwrap();
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Transferring".to_string();
        }
    }
    let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), 0u64));
    
    let mut file = File::open(file_path).await?;
    let mut buffer = [0u8; 16384];
    let mut bytes_sent = 0u64;
    let mut last_emit = Instant::now();
    
    loop {
        let n = file.read(&mut buffer).await?;
        if n == 0 {
            break;
        }
        tx.write_all(&buffer[..n]).await?;
        bytes_sent += n as u64;
        
        if last_emit.elapsed() > std::time::Duration::from_millis(150) || bytes_sent == size {
            {
                let mut s = state.lock().unwrap();
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.progress = bytes_sent;
                }
            }
            let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), bytes_sent));
            last_emit = Instant::now();
        }
    }
    
    {
        let mut s = state.lock().unwrap();
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Completed".to_string();
            t.progress = size;
        }
    }
    let _ = app_handle.emit("transfer_completed", transfer_id);
    
    Ok(())
}

#[tauri::command]
pub async fn start_file_transfer(
    peer_ip: String,
    file_path: String,
    app_handle: AppHandle,
    state: State<'_, SharedTransferState>,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if !path.is_file() {
        return Err("Provided path is not a file".to_string());
    }
    
    let filename = path.file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown_file".to_string());
        
    let size = match tokio::fs::metadata(&path).await {
        Ok(meta) => meta.len(),
        Err(e) => return Err(format!("Failed to read file size: {}", e)),
    };
    
    let transfer_id = format!("{}-{}", Utc::now().timestamp(), rand::thread_rng().gen_range(1000..9999));
    
    let transfer = FileTransfer {
        id: transfer_id.clone(),
        filename: filename.clone(),
        size,
        progress: 0,
        status: "Pending".to_string(),
        direction: "Outgoing".to_string(),
        peer_ip: peer_ip.clone(),
        peer_name: "".to_string(),
    };
    
    {
        let mut s = state.0.lock().unwrap();
        let peer_name = s.peers.get(&peer_ip).map(|(p, _)| p.hostname.clone()).unwrap_or_else(|| "Unknown Peer".to_string());
        let mut t = transfer.clone();
        t.peer_name = peer_name;
        s.transfers.insert(transfer_id.clone(), t);
    }
    
    let state_inner = state.0.clone();
    let app_handle_inner = app_handle.clone();
    let transfer_id_clone = transfer_id.clone();
    
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_outgoing_transfer(transfer_id_clone, peer_ip, path, filename, size, app_handle_inner, state_inner).await {
            println!("Outgoing transfer error: {}", e);
        }
    });
    
    Ok(transfer_id)
}

#[tauri::command]
pub fn respond_to_transfer(
    transfer_id: String,
    accept: bool,
    state: State<'_, SharedTransferState>,
) -> Result<(), String> {
    let mut s = state.0.lock().unwrap();
    if let Some(tx) = s.accept_txs.remove(&transfer_id) {
        let _ = tx.send(accept);
        Ok(())
    } else {
        Err("No pending transfer response channel found".to_string())
    }
}

#[tauri::command]
pub fn get_discovered_peers(
    state: State<'_, SharedTransferState>,
) -> Vec<Peer> {
    let s = state.0.lock().unwrap();
    s.peers.values().map(|(p, _)| p.clone()).collect()
}

#[tauri::command]
pub fn get_active_transfers(
    state: State<'_, SharedTransferState>,
) -> Vec<FileTransfer> {
    let s = state.0.lock().unwrap();
    s.transfers.values().cloned().collect()
}
