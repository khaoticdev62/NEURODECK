use chrono::Utc;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use neurodeck_infrastructure::warpinator::WarpinatorCallbacks;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub ip: String,
    pub hostname: String,
    pub os: String,
    pub port: u16,
    pub is_warpinator: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTransfer {
    pub id: String,
    pub filename: String,
    pub size: u64,
    pub progress: u64,
    pub status: String, // "Pending", "Accepted", "Rejected", "Transferring", "Completed", "Failed", "Cancelled"
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
    pub group_code: String,
    pub cancel_txs: HashMap<String, tokio::sync::oneshot::Sender<()>>,
    pub mdns_daemon: Option<ServiceDaemon>,
    pub outgoing_paths: HashMap<String, PathBuf>,
}

impl TransferState {
    pub fn new() -> Self {
        Self {
            peers: HashMap::new(),
            transfers: HashMap::new(),
            accept_txs: HashMap::new(),
            group_code: "DEFAULT".to_string(),
            cancel_txs: HashMap::new(),
            mdns_daemon: None,
            outgoing_paths: HashMap::new(),
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

struct STermWarpinatorCallbacks {
    app_handle: AppHandle,
    state: Arc<Mutex<TransferState>>,
}

#[tonic::async_trait]
impl WarpinatorCallbacks for STermWarpinatorCallbacks {
    fn get_local_machine_info(&self) -> (String, String) {
        (get_hostname(), "deck".to_string())
    }

    async fn on_incoming_transfer(
        &self,
        transfer_id: String,
        sender_name: String,
        sender_ip: String,
        filename: String,
        total_size: u64,
        _file_count: u32,
    ) -> bool {
        let transfer = FileTransfer {
            id: transfer_id.clone(),
            filename: filename.clone(),
            size: total_size,
            progress: 0,
            status: "Pending".to_string(),
            direction: "Incoming".to_string(),
            peer_ip: sender_ip.clone(),
            peer_name: sender_name.clone(),
        };

        let (accept_tx, accept_rx) = tokio::sync::oneshot::channel::<bool>();

        {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            s.transfers.insert(transfer_id.clone(), transfer.clone());
            s.accept_txs.insert(transfer_id.clone(), accept_tx);
        }

        let _ = self.app_handle.emit("transfer_incoming", transfer);

        (accept_rx.await).unwrap_or_default()
    }

    async fn on_chunk_received(
        &self,
        _transfer_id: &str,
        relative_path: &str,
        file_type: i32,
        chunk: &[u8],
    ) -> Result<(), String> {
        let download_dir = self
            .app_handle
            .path()
            .download_dir()
            .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default())
            .join("neurodeck_transfers");

        let dest_path = download_dir.join(relative_path);

        if file_type == 1 {
            tokio::fs::create_dir_all(&dest_path)
                .await
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else if file_type == 0 {
            if let Some(parent) = dest_path.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            use tokio::fs::OpenOptions;
            let mut file = OpenOptions::new()
                .create(true)
                .write(true)
                .append(true)
                .open(&dest_path)
                .await
                .map_err(|e| format!("Failed to open file: {}", e))?;

            file.write_all(chunk)
                .await
                .map_err(|e| format!("Failed to write chunk: {}", e))?;
        }
        Ok(())
    }

    fn on_transfer_progress(&self, transfer_id: &str, progress: u64) {
        {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(transfer_id) {
                t.progress = progress;
                if t.status == "Pending" || t.status == "Accepted" {
                    t.status = "Transferring".to_string();
                }
            }
        }
        let _ = self
            .app_handle
            .emit("transfer_progress", (transfer_id.to_string(), progress));
    }

    fn on_transfer_completed(&self, transfer_id: &str) {
        {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(transfer_id) {
                t.status = "Completed".to_string();
            }
        }
        let _ = self
            .app_handle
            .emit("transfer_completed", transfer_id.to_string());

        // Clean up temp file if it was a directory archive
        let path_to_clean = {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            s.outgoing_paths.remove(transfer_id)
        };
        if let Some(path) = path_to_clean {
            if path.to_string_lossy().contains("neurodeck_tar") {
                let _ = std::fs::remove_file(path);
            }
        }
    }

    fn on_transfer_failed(&self, transfer_id: &str) {
        {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(transfer_id) {
                t.status = "Failed".to_string();
            }
        }
        let _ = self
            .app_handle
            .emit("transfer_failed", transfer_id.to_string());

        // Clean up temp file if it was a directory archive
        let path_to_clean = {
            let mut s = self.state.lock().unwrap_or_else(|e| e.into_inner());
            s.outgoing_paths.remove(transfer_id)
        };
        if let Some(path) = path_to_clean {
            if path.to_string_lossy().contains("neurodeck_tar") {
                let _ = std::fs::remove_file(path);
            }
        }
    }

    fn is_cancelled(&self, transfer_id: &str) -> bool {
        let s = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(t) = s.transfers.get(transfer_id) {
            t.status == "Cancelled"
        } else {
            true
        }
    }

    fn get_outgoing_file_path(&self, transfer_id: &str) -> Option<std::path::PathBuf> {
        let s = self.state.lock().unwrap_or_else(|e| e.into_inner());
        s.outgoing_paths.get(transfer_id).cloned()
    }
}

pub fn start_transfer_services(app_handle: AppHandle, state: Arc<Mutex<TransferState>>) {
    // 1. Initialize mDNS ServiceDaemon
    let mdns = match ServiceDaemon::new() {
        Ok(d) => d,
        Err(e) => {
            println!("Failed to create mDNS daemon: {}", e);
            return;
        }
    };

    // Store daemon in state for later updates
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.mdns_daemon = Some(mdns.clone());
    }

    let hostname = get_hostname();
    let os = get_os_name();
    let service_type = "_neurodeck._tcp.local.";
    let instance_name = format!("neurodeck-{}", hostname);
    let host_name = format!("{}.local.", hostname.replace(" ", "-"));
    let port = 18338;

    let group_code = {
        let s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.group_code.clone()
    };

    let mut properties = HashMap::new();
    properties.insert("hostname".to_string(), hostname.clone());
    properties.insert("os".to_string(), os);
    properties.insert("group_code".to_string(), group_code);

    if let Ok(service_info) = ServiceInfo::new(
        service_type,
        &instance_name,
        &host_name,
        "0.0.0.0",
        port,
        Some(properties),
    ) {
        if let Err(e) = mdns.register(service_info) {
            println!("Failed to register mDNS service: {}", e);
        } else {
            println!("mDNS peer registered as: {} ({})", instance_name, host_name);
        }
    }

    // 2a. mDNS Neurodeck Browser Loop (runs in a separate standard thread)
    let browser_mdns = mdns.clone();
    let state_browser = state.clone();
    let app_handle_browser = app_handle.clone();
    std::thread::spawn(move || {
        let receiver = match browser_mdns.browse(service_type) {
            Ok(r) => r,
            Err(e) => {
                println!("Failed to start mDNS browser: {}", e);
                return;
            }
        };

        while let Ok(event) = receiver.recv() {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let peer_group = info
                        .get_property_val_str("group_code")
                        .unwrap_or("DEFAULT")
                        .to_string();

                    let local_group = {
                        let s = state_browser.lock().unwrap_or_else(|e| e.into_inner());
                        s.group_code.clone()
                    };

                    if peer_group == local_group {
                        let ip = info
                            .get_addresses()
                            .iter()
                            .find(|ip| ip.is_ipv4())
                            .map(|ip| ip.to_string())
                            .unwrap_or_else(|| {
                                info.get_addresses()
                                    .iter()
                                    .next()
                                    .map(|ip| ip.to_string())
                                    .unwrap_or_default()
                            });

                        if ip.is_empty() {
                            continue;
                        }

                        let hostname = info
                            .get_property_val_str("hostname")
                            .unwrap_or_else(|| info.get_fullname())
                            .to_string();
                        let os = info
                            .get_property_val_str("os")
                            .unwrap_or("unknown")
                            .to_string();

                        if hostname != get_hostname() {
                            let mut changed = false;
                            let mut peer_list = Vec::new();
                            {
                                let mut s = state_browser.lock().unwrap_or_else(|e| e.into_inner());
                                let peer = Peer {
                                    ip: ip.clone(),
                                    hostname: hostname.clone(),
                                    os,
                                    port: 18338,
                                    is_warpinator: false,
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
                                let _ = app_handle_browser.emit("peers_updated", peer_list);
                            }
                        }
                    }
                }
                ServiceEvent::ServiceRemoved(_service_type, name) => {
                    let mut changed = false;
                    let mut peer_list = Vec::new();
                    {
                        let mut s = state_browser.lock().unwrap_or_else(|e| e.into_inner());
                        let to_remove: Vec<String> = s
                            .peers
                            .iter()
                            .filter(|(_, (p, _))| name.contains(&p.hostname) && !p.is_warpinator)
                            .map(|(ip, _)| ip.clone())
                            .collect();

                        for ip in to_remove {
                            s.peers.remove(&ip);
                            changed = true;
                        }
                        for (p, _) in s.peers.values() {
                            peer_list.push(p.clone());
                        }
                    }
                    if changed {
                        let _ = app_handle_browser.emit("peers_updated", peer_list);
                    }
                }
                _ => {}
            }
        }
    });

    // 2b. mDNS Warpinator Browser Loop (runs in a separate standard thread)
    let browser_mdns_warp = mdns.clone();
    let state_browser_warp = state.clone();
    let app_handle_browser_warp = app_handle.clone();
    std::thread::spawn(move || {
        let receiver = match browser_mdns_warp.browse("_warpinator._tcp.local.") {
            Ok(r) => r,
            Err(e) => {
                println!("Failed to start Warpinator mDNS browser: {}", e);
                return;
            }
        };

        while let Ok(event) = receiver.recv() {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let peer_group = info
                        .get_property_val_str("group")
                        .unwrap_or("warpinator")
                        .to_string();

                    let local_group = {
                        let s = state_browser_warp.lock().unwrap_or_else(|e| e.into_inner());
                        s.group_code.clone()
                    };

                    if peer_group.to_lowercase() == local_group.to_lowercase() {
                        let ip = info
                            .get_addresses()
                            .iter()
                            .find(|ip| ip.is_ipv4())
                            .map(|ip| ip.to_string())
                            .unwrap_or_else(|| {
                                info.get_addresses()
                                    .iter()
                                    .next()
                                    .map(|ip| ip.to_string())
                                    .unwrap_or_default()
                            });

                        if ip.is_empty() {
                            continue;
                        }

                        let hostname = info
                            .get_property_val_str("machine")
                            .or_else(|| info.get_property_val_str("hostname"))
                            .unwrap_or_else(|| info.get_fullname())
                            .to_string();
                        let os = "linux".to_string();
                        let port = info.get_port();

                        if hostname != get_hostname() {
                            let mut changed = false;
                            let mut peer_list = Vec::new();
                            {
                                let mut s =
                                    state_browser_warp.lock().unwrap_or_else(|e| e.into_inner());
                                let peer = Peer {
                                    ip: ip.clone(),
                                    hostname: hostname.clone(),
                                    os,
                                    port,
                                    is_warpinator: true,
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
                                let _ = app_handle_browser_warp.emit("peers_updated", peer_list);
                            }
                        }
                    }
                }
                ServiceEvent::ServiceRemoved(_service_type, name) => {
                    let mut changed = false;
                    let mut peer_list = Vec::new();
                    {
                        let mut s = state_browser_warp.lock().unwrap_or_else(|e| e.into_inner());
                        let to_remove: Vec<String> = s
                            .peers
                            .iter()
                            .filter(|(_, (p, _))| name.contains(&p.hostname) && p.is_warpinator)
                            .map(|(ip, _)| ip.clone())
                            .collect();

                        for ip in to_remove {
                            s.peers.remove(&ip);
                            changed = true;
                        }
                        for (p, _) in s.peers.values() {
                            peer_list.push(p.clone());
                        }
                    }
                    if changed {
                        let _ = app_handle_browser_warp.emit("peers_updated", peer_list);
                    }
                }
                _ => {}
            }
        }
    });

    // 2c. Start Warpinator gRPC Server
    let callbacks = Arc::new(STermWarpinatorCallbacks {
        app_handle: app_handle.clone(),
        state: state.clone(),
    });

    let callbacks_clone = callbacks.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) =
            neurodeck_infrastructure::warpinator::start_warpinator_service(callbacks_clone, 42000)
                .await
        {
            println!("Failed to start Warpinator service: {}", e);
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
                        if let Err(e) = handle_incoming_connection(
                            socket,
                            addr.ip().to_string(),
                            app_handle,
                            state,
                        )
                        .await
                        {
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
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.transfers.insert(transfer_id.clone(), transfer.clone());
        s.accept_txs.insert(transfer_id.clone(), accept_tx);
    }

    let _ = app_handle.emit("transfer_incoming", transfer.clone());

    let accepted: bool = (accept_rx.await).unwrap_or_default();

    if !accepted {
        let resp = ResponseHeader {
            status: "rejected".to_string(),
        };
        let resp_bytes = format!("{}\n", serde_json::to_string(&resp)?);
        tx.write_all(resp_bytes.as_bytes()).await?;

        {
            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                t.status = "Rejected".to_string();
            }
            s.accept_txs.remove(&transfer_id);
        }
        let _ = app_handle.emit("transfer_failed", transfer_id);
        return Ok(());
    }

    let resp = ResponseHeader {
        status: "accepted".to_string(),
    };
    let resp_bytes = format!("{}\n", serde_json::to_string(&resp)?);
    tx.write_all(resp_bytes.as_bytes()).await?;

    // Register cancellation oneshot
    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Transferring".to_string();
        }
        s.accept_txs.remove(&transfer_id);
        s.cancel_txs.insert(transfer_id.clone(), cancel_tx);
    }
    let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), 0u64));

    let download_dir = app_handle
        .path()
        .download_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default())
        .join("neurodeck_transfers");

    tokio::fs::create_dir_all(&download_dir).await?;

    let clean_filename = std::path::Path::new(&filename)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unnamed_transfer".to_string());

    let file_path = download_dir.join(&clean_filename);
    let mut file = File::create(&file_path).await?;

    let mut buffer = [0u8; 16384];
    let mut bytes_written = 0u64;
    let mut last_emit = Instant::now();
    let mut transfer_success = true;

    while bytes_written < size {
        let to_read = std::cmp::min((size - bytes_written) as usize, buffer.len());

        let n = tokio::select! {
            n_res = reader.read(&mut buffer[..to_read]) => {
                match n_res {
                    Ok(val) => val,
                    Err(_) => {
                        transfer_success = false;
                        break;
                    }
                }
            }
            _ = &mut cancel_rx => {
                transfer_success = false;
                break;
            }
        };

        if n == 0 {
            transfer_success = false;
            break;
        }

        if (file.write_all(&buffer[..n]).await).is_err() {
            transfer_success = false;
            break;
        }

        bytes_written += n as u64;

        if last_emit.elapsed() > std::time::Duration::from_millis(150) || bytes_written == size {
            {
                let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.progress = bytes_written;
                }
            }
            let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), bytes_written));
            last_emit = Instant::now();
        }
    }

    // Clean up cancellation handle
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.cancel_txs.remove(&transfer_id);
    }

    if !transfer_success || bytes_written < size {
        // Cancelled or aborted transfer cleanup
        {
            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                if t.status != "Cancelled" {
                    t.status = "Failed".to_string();
                }
            }
        }
        let _ = app_handle.emit("transfer_failed", transfer_id.clone());
        let _ = tokio::fs::remove_file(&file_path).await;
        return Ok(());
    }

    // Completed successfully
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Completed".to_string();
            t.progress = size;
        }
    }

    // Auto-extract tar folders
    if clean_filename.ends_with(".tar") {
        let tar_path = file_path.clone();
        let folder_name = clean_filename.trim_end_matches(".tar").to_string();
        let dest_dir = download_dir.join(&folder_name);
        let _ = tokio::fs::create_dir_all(&dest_dir).await;

        // Spawn blocking extraction
        let extract_res = tokio::task::spawn_blocking(move || {
            let file = std::fs::File::open(&tar_path)?;
            let mut ar = tar::Archive::new(file);
            ar.unpack(&dest_dir)?;
            Ok::<(), std::io::Error>(())
        })
        .await;

        // Always delete the temporary tar file
        let _ = tokio::fs::remove_file(&file_path).await;

        if let Err(e) = extract_res {
            println!("Failed to extract folder: {:?}", e);
            {
                let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.status = "Failed".to_string();
                }
            }
            let _ = app_handle.emit("transfer_failed", transfer_id);
            return Ok(());
        }
    }

    let _ = app_handle.emit("transfer_completed", transfer_id);
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn run_outgoing_transfer(
    transfer_id: String,
    peer_ip: String,
    file_path: PathBuf,
    filename: String,
    size: u64,
    app_handle: AppHandle,
    state: Arc<Mutex<TransferState>>,
    is_temp: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let peer_addr = format!("{}:18338", peer_ip);

    let socket = match TcpStream::connect(&peer_addr).await {
        Ok(s) => s,
        Err(e) => {
            {
                let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.status = "Failed".to_string();
                }
            }
            let _ = app_handle.emit("transfer_failed", transfer_id.clone());
            if is_temp {
                let _ = tokio::fs::remove_file(&file_path).await;
            }
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
            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                t.status = "Rejected".to_string();
            }
        }
        let _ = app_handle.emit("transfer_failed", transfer_id);
        if is_temp {
            let _ = tokio::fs::remove_file(&file_path).await;
        }
        return Ok(());
    }

    // Register cancellation oneshot
    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Transferring".to_string();
        }
        s.cancel_txs.insert(transfer_id.clone(), cancel_tx);
    }
    let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), 0u64));

    let mut file = File::open(&file_path).await?;
    let mut buffer = [0u8; 16384];
    let mut bytes_sent = 0u64;
    let mut last_emit = Instant::now();
    let mut transfer_success = true;

    loop {
        let n = tokio::select! {
            n_res = file.read(&mut buffer) => {
                match n_res {
                    Ok(val) => val,
                    Err(_) => {
                        transfer_success = false;
                        break;
                    }
                }
            }
            _ = &mut cancel_rx => {
                transfer_success = false;
                break;
            }
        };

        if n == 0 {
            break;
        }

        if (tx.write_all(&buffer[..n]).await).is_err() {
            transfer_success = false;
            break;
        }

        bytes_sent += n as u64;

        if last_emit.elapsed() > std::time::Duration::from_millis(150) || bytes_sent == size {
            {
                let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(t) = s.transfers.get_mut(&transfer_id) {
                    t.progress = bytes_sent;
                }
            }
            let _ = app_handle.emit("transfer_progress", (transfer_id.clone(), bytes_sent));
            last_emit = Instant::now();
        }
    }

    // Clean up cancellation handle
    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
        s.cancel_txs.remove(&transfer_id);
    }

    // Clean up temp file
    if is_temp {
        let _ = tokio::fs::remove_file(&file_path).await;
    }

    if !transfer_success || bytes_sent < size {
        {
            let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(t) = s.transfers.get_mut(&transfer_id) {
                if t.status != "Cancelled" {
                    t.status = "Failed".to_string();
                }
            }
        }
        let _ = app_handle.emit("transfer_failed", transfer_id);
        return Ok(());
    }

    {
        let mut s = state.lock().unwrap_or_else(|e| e.into_inner());
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
    if !path.exists() {
        return Err("Provided path does not exist".to_string());
    }

    let mut is_temp = false;
    let mut final_path = path.clone();
    let mut filename = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown_file".to_string());

    if path.is_dir() {
        is_temp = true;
        filename = format!("{}.tar", filename);

        let tar_dir = std::env::temp_dir().join("neurodeck_tar");
        let _ = std::fs::create_dir_all(&tar_dir);
        let tar_path = tar_dir.join(format!(
            "dir-{}-{}.tar",
            Utc::now().timestamp(),
            rand::thread_rng().gen_range(1000..9999)
        ));

        let dir_to_tar = path.clone();
        let tar_path_clone = tar_path.clone();

        // Spawn blocking compression
        tokio::task::spawn_blocking(move || {
            let file = std::fs::File::create(&tar_path_clone)?;
            let mut ar = tar::Builder::new(file);
            ar.append_dir_all(".", &dir_to_tar)?;
            ar.finish()?;
            Ok::<(), std::io::Error>(())
        })
        .await
        .map_err(|e| format!("Archiver thread failed: {}", e))?
        .map_err(|e| format!("Failed to create tar archive: {}", e))?;

        final_path = tar_path;
    }

    let size = match tokio::fs::metadata(&final_path).await {
        Ok(meta) => meta.len(),
        Err(e) => {
            if is_temp {
                let _ = tokio::fs::remove_file(&final_path).await;
            }
            return Err(format!("Failed to read file size: {}", e));
        }
    };

    let transfer_id = format!(
        "{}-{}",
        Utc::now().timestamp(),
        rand::thread_rng().gen_range(1000..9999)
    );

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

    let (is_warpinator, peer_port) = {
        let s = state.0.lock().unwrap_or_else(|e| e.into_inner());
        s.peers
            .get(&peer_ip)
            .map(|(p, _)| (p.is_warpinator, p.port))
            .unwrap_or((false, 18338))
    };

    {
        let mut s = state.0.lock().unwrap_or_else(|e| e.into_inner());
        let peer_name = s
            .peers
            .get(&peer_ip)
            .map(|(p, _)| p.hostname.clone())
            .unwrap_or_else(|| "Unknown Peer".to_string());
        let mut t = transfer.clone();
        t.peer_name = peer_name;
        s.transfers.insert(transfer_id.clone(), t);
        s.outgoing_paths
            .insert(transfer_id.clone(), final_path.clone());
    }

    if is_warpinator {
        let callbacks = Arc::new(STermWarpinatorCallbacks {
            app_handle: app_handle.clone(),
            state: state.0.clone(),
        });
        let peer_ip_clone = peer_ip.clone();
        let transfer_id_clone = transfer_id.clone();
        let filename_clone = filename.clone();

        tauri::async_runtime::spawn(async move {
            if let Err(e) = neurodeck_infrastructure::warpinator::send_file_to_warpinator_peer(
                &peer_ip_clone,
                peer_port,
                &transfer_id_clone,
                &filename_clone,
                size,
                callbacks.clone(),
            )
            .await
            {
                println!("Failed to send file to Warpinator peer: {:?}", e);
                callbacks.on_transfer_failed(&transfer_id_clone);
            }
        });
    } else {
        let state_inner = state.0.clone();
        let app_handle_inner = app_handle.clone();
        let transfer_id_clone = transfer_id.clone();

        tauri::async_runtime::spawn(async move {
            if let Err(e) = run_outgoing_transfer(
                transfer_id_clone,
                peer_ip,
                final_path,
                filename,
                size,
                app_handle_inner,
                state_inner,
                is_temp,
            )
            .await
            {
                println!("Outgoing transfer error: {}", e);
            }
        });
    }

    Ok(transfer_id)
}

#[tauri::command]
pub fn respond_to_transfer(
    transfer_id: String,
    accept: bool,
    state: State<'_, SharedTransferState>,
) -> Result<(), String> {
    let mut s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tx) = s.accept_txs.remove(&transfer_id) {
        let _ = tx.send(accept);
        Ok(())
    } else {
        Err("No pending transfer response channel found".to_string())
    }
}

#[tauri::command]
pub fn get_discovered_peers(state: State<'_, SharedTransferState>) -> Vec<Peer> {
    let s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    s.peers.values().map(|(p, _)| p.clone()).collect()
}

#[tauri::command]
pub fn get_active_transfers(state: State<'_, SharedTransferState>) -> Vec<FileTransfer> {
    let s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    s.transfers.values().cloned().collect()
}

#[tauri::command]
pub fn cancel_transfer(
    transfer_id: String,
    state: State<'_, SharedTransferState>,
) -> Result<(), String> {
    let mut s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tx) = s.cancel_txs.remove(&transfer_id) {
        let _ = tx.send(());
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Cancelled".to_string();
        }
        Ok(())
    } else if let Some(tx) = s.accept_txs.remove(&transfer_id) {
        let _ = tx.send(false);
        if let Some(t) = s.transfers.get_mut(&transfer_id) {
            t.status = "Cancelled".to_string();
        }
        Ok(())
    } else {
        Err("No active or pending transfer found to cancel".to_string())
    }
}

#[tauri::command]
pub fn set_group_code(code: String, state: State<'_, SharedTransferState>) -> Result<(), String> {
    let mut s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    s.group_code = code.trim().to_string();

    if let Some(ref mdns) = s.mdns_daemon {
        let local_hostname = get_hostname();
        let instance_name = format!("neurodeck-{}", local_hostname);
        let service_type = "_neurodeck._tcp.local.";
        let host_name = format!("{}.local.", local_hostname.replace(" ", "-"));
        let port = 18338;

        let fullname = format!("{}.{}", instance_name, service_type);
        let _ = mdns.unregister(&fullname);

        let mut properties = HashMap::new();
        properties.insert("hostname".to_string(), local_hostname.clone());
        properties.insert("os".to_string(), get_os_name());
        properties.insert("group_code".to_string(), s.group_code.clone());

        if let Ok(service_info) = ServiceInfo::new(
            service_type,
            &instance_name,
            &host_name,
            "0.0.0.0",
            port,
            Some(properties),
        ) {
            let _ = mdns.register(service_info);
            println!("mDNS Peer re-registered with group code: {}", s.group_code);
        }
    }

    s.peers.clear();
    Ok(())
}

#[tauri::command]
pub fn get_group_code(state: State<'_, SharedTransferState>) -> Result<String, String> {
    let s = state.0.lock().unwrap_or_else(|e| e.into_inner());
    Ok(s.group_code.clone())
}
