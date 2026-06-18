pub mod warp {
    tonic::include_proto!("_");
}

use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tonic::{transport::Server, Request, Response, Status};
use warp::warp_server::{Warp, WarpServer};
use warp::*;

#[tonic::async_trait]
pub trait WarpinatorCallbacks: Send + Sync {
    fn get_local_machine_info(&self) -> (String, String);

    async fn on_incoming_transfer(
        &self,
        transfer_id: String,
        sender_name: String,
        sender_ip: String,
        filename: String,
        total_size: u64,
        file_count: u32,
    ) -> bool;

    async fn on_chunk_received(
        &self,
        transfer_id: &str,
        relative_path: &str,
        file_type: i32,
        chunk: &[u8],
    ) -> Result<(), String>;

    fn on_transfer_progress(&self, transfer_id: &str, progress: u64);
    fn on_transfer_completed(&self, transfer_id: &str);
    fn on_transfer_failed(&self, transfer_id: &str);
    fn is_cancelled(&self, transfer_id: &str) -> bool;

    fn get_outgoing_file_path(&self, transfer_id: &str) -> Option<std::path::PathBuf>;
}

pub struct WarpinatorService {
    callbacks: Arc<dyn WarpinatorCallbacks>,
}

impl WarpinatorService {
    pub fn new(callbacks: Arc<dyn WarpinatorCallbacks>) -> Self {
        Self { callbacks }
    }
}

#[tonic::async_trait]
impl Warp for WarpinatorService {
    async fn check_duplex_connection(
        &self,
        _req: Request<LookupName>,
    ) -> Result<Response<HaveDuplex>, Status> {
        Ok(Response::new(HaveDuplex { response: true }))
    }

    async fn waiting_for_duplex(
        &self,
        _req: Request<LookupName>,
    ) -> Result<Response<HaveDuplex>, Status> {
        Ok(Response::new(HaveDuplex { response: true }))
    }

    async fn get_remote_machine_info(
        &self,
        _req: Request<LookupName>,
    ) -> Result<Response<RemoteMachineInfo>, Status> {
        let (display_name, user_name) = self.callbacks.get_local_machine_info();
        Ok(Response::new(RemoteMachineInfo {
            display_name,
            user_name,
            feature_flags: 1,
        }))
    }

    type GetRemoteMachineAvatarStream =
        tokio_stream::wrappers::ReceiverStream<Result<RemoteMachineAvatar, Status>>;

    async fn get_remote_machine_avatar(
        &self,
        _req: Request<LookupName>,
    ) -> Result<Response<Self::GetRemoteMachineAvatarStream>, Status> {
        let (_, rx) = tokio::sync::mpsc::channel(1);
        Ok(Response::new(tokio_stream::wrappers::ReceiverStream::new(
            rx,
        )))
    }

    async fn process_transfer_op_request(
        &self,
        req: Request<TransferOpRequest>,
    ) -> Result<Response<VoidType>, Status> {
        let sender_ip = match req.remote_addr() {
            Some(addr) => addr.ip().to_string(),
            None => "".to_string(),
        };
        let op_req = req.into_inner();
        let info = op_req
            .info
            .ok_or_else(|| Status::invalid_argument("Missing info"))?;
        let transfer_id = info.ident.clone();

        let filename = if !op_req.name_if_single.is_empty() {
            op_req.name_if_single.clone()
        } else if !op_req.top_dir_basenames.is_empty() {
            op_req.top_dir_basenames[0].clone()
        } else {
            "Warpinator_Files".to_string()
        };

        let callbacks = self.callbacks.clone();
        let transfer_id_clone = transfer_id.clone();
        let filename_clone = filename.clone();
        let sender_name = op_req.sender_name.clone();
        let size = op_req.size;
        let count = op_req.count as u32;

        tokio::spawn(async move {
            let accepted = callbacks
                .on_incoming_transfer(
                    transfer_id_clone.clone(),
                    sender_name,
                    sender_ip.clone(),
                    filename_clone.clone(),
                    size,
                    count,
                )
                .await;

            if accepted {
                if let Err(e) = run_grpc_incoming_transfer(
                    &sender_ip,
                    42000,
                    &transfer_id_clone,
                    &filename_clone,
                    size,
                    callbacks.as_ref(),
                )
                .await
                {
                    println!("Error in gRPC incoming transfer: {:?}", e);
                    callbacks.on_transfer_failed(&transfer_id_clone);
                } else {
                    callbacks.on_transfer_completed(&transfer_id_clone);
                }
            } else {
                callbacks.on_transfer_failed(&transfer_id_clone);
            }
        });

        Ok(Response::new(VoidType { dummy: 0 }))
    }

    async fn pause_transfer_op(&self, _req: Request<OpInfo>) -> Result<Response<VoidType>, Status> {
        Ok(Response::new(VoidType { dummy: 0 }))
    }

    async fn send_text_message(
        &self,
        _req: Request<TextMessage>,
    ) -> Result<Response<VoidType>, Status> {
        Ok(Response::new(VoidType { dummy: 0 }))
    }

    type StartTransferStream = tokio_stream::wrappers::ReceiverStream<Result<FileChunk, Status>>;

    async fn start_transfer(
        &self,
        req: Request<OpInfo>,
    ) -> Result<Response<Self::StartTransferStream>, Status> {
        let op_info = req.into_inner();
        let transfer_id = op_info.ident.clone();

        let path = match self.callbacks.get_outgoing_file_path(&transfer_id) {
            Some(p) => p,
            None => return Err(Status::not_found("Transfer ID not found")),
        };

        let (tx, rx) = tokio::sync::mpsc::channel(100);
        let callbacks = self.callbacks.clone();

        tokio::spawn(async move {
            if let Err(e) =
                stream_path_to_channel(&path, tx, &transfer_id, callbacks.as_ref()).await
            {
                println!("Error streaming file/dir: {:?}", e);
                callbacks.on_transfer_failed(&transfer_id);
            } else {
                callbacks.on_transfer_completed(&transfer_id);
            }
        });

        Ok(Response::new(tokio_stream::wrappers::ReceiverStream::new(
            rx,
        )))
    }

    async fn cancel_transfer_op_request(
        &self,
        req: Request<OpInfo>,
    ) -> Result<Response<VoidType>, Status> {
        let info = req.into_inner();
        self.callbacks.on_transfer_failed(&info.ident);
        Ok(Response::new(VoidType { dummy: 0 }))
    }

    async fn stop_transfer(&self, req: Request<StopInfo>) -> Result<Response<VoidType>, Status> {
        let stop_info = req.into_inner();
        if let Some(info) = stop_info.info {
            if stop_info.error {
                self.callbacks.on_transfer_failed(&info.ident);
            } else {
                self.callbacks.on_transfer_completed(&info.ident);
            }
        }
        Ok(Response::new(VoidType { dummy: 0 }))
    }

    async fn ping(&self, _req: Request<LookupName>) -> Result<Response<VoidType>, Status> {
        Ok(Response::new(VoidType { dummy: 0 }))
    }
}

async fn stream_path_to_channel(
    path: &std::path::Path,
    tx: tokio::sync::mpsc::Sender<Result<FileChunk, Status>>,
    transfer_id: &str,
    callbacks: &dyn WarpinatorCallbacks,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut total_progress = 0u64;

    if path.is_file() {
        let filename = path.file_name().unwrap().to_string_lossy().to_string();
        let mut file = tokio::fs::File::open(path).await?;
        let mut buffer = [0u8; 16384];

        loop {
            if callbacks.is_cancelled(transfer_id) {
                return Err(Status::cancelled("Transfer cancelled by user").into());
            }
            let n = file.read(&mut buffer).await?;
            if n == 0 {
                break;
            }

            let chunk = FileChunk {
                relative_path: filename.clone(),
                file_type: 0,
                symlink_target: "".to_string(),
                chunk: buffer[..n].to_vec(),
                file_mode: 0o644,
                time: None,
            };

            tx.send(Ok(chunk)).await?;
            total_progress += n as u64;
            callbacks.on_transfer_progress(transfer_id, total_progress);
        }
    } else if path.is_dir() {
        let root_dir_name = path.file_name().unwrap().to_string_lossy().to_string();
        let mut entries: Vec<std::path::PathBuf> = vec![path.to_path_buf()];

        tx.send(Ok(FileChunk {
            relative_path: root_dir_name.clone(),
            file_type: 1,
            symlink_target: "".to_string(),
            chunk: Vec::new(),
            file_mode: 0o755,
            time: None,
        }))
        .await?;

        while let Some(current_path) = entries.pop() {
            if callbacks.is_cancelled(transfer_id) {
                return Err(Status::cancelled("Transfer cancelled by user").into());
            }
            let mut read_dir = tokio::fs::read_dir(&current_path).await?;
            while let Some(entry) = read_dir.next_entry().await? {
                if callbacks.is_cancelled(transfer_id) {
                    return Err(Status::cancelled("Transfer cancelled by user").into());
                }
                let entry_path = entry.path();
                let rel_path = entry_path.strip_prefix(path.parent().unwrap())?;
                let rel_path_str = rel_path.to_string_lossy().to_string();

                if entry_path.is_dir() {
                    tx.send(Ok(FileChunk {
                        relative_path: rel_path_str,
                        file_type: 1,
                        symlink_target: "".to_string(),
                        chunk: Vec::new(),
                        file_mode: 0o755,
                        time: None,
                    }))
                    .await?;
                    entries.push(entry_path);
                } else {
                    let mut file = tokio::fs::File::open(&entry_path).await?;
                    let mut buffer = [0u8; 16384];
                    loop {
                        if callbacks.is_cancelled(transfer_id) {
                            return Err(Status::cancelled("Transfer cancelled by user").into());
                        }
                        let n = file.read(&mut buffer).await?;
                        if n == 0 {
                            break;
                        }
                        let chunk = FileChunk {
                            relative_path: rel_path_str.clone(),
                            file_type: 0,
                            symlink_target: "".to_string(),
                            chunk: buffer[..n].to_vec(),
                            file_mode: 0o644,
                            time: None,
                        };
                        tx.send(Ok(chunk)).await?;
                        total_progress += n as u64;
                        callbacks.on_transfer_progress(transfer_id, total_progress);
                    }
                }
            }
        }
    }

    Ok(())
}

async fn run_grpc_incoming_transfer(
    sender_ip: &str,
    sender_port: u16,
    transfer_id: &str,
    filename: &str,
    _total_size: u64,
    callbacks: &dyn WarpinatorCallbacks,
) -> Result<(), Box<dyn std::error::Error>> {
    use warp::warp_client::WarpClient;

    let channel =
        tonic::transport::Channel::from_shared(format!("http://{}:{}", sender_ip, sender_port))?
            .connect()
            .await?;
    let mut client = WarpClient::new(channel);

    let op_info = OpInfo {
        ident: transfer_id.to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        readable_name: filename.to_string(),
        use_compression: false,
    };

    let response = client.start_transfer(Request::new(op_info)).await?;
    let mut stream = response.into_inner();
    let mut received_bytes = 0u64;

    while let Some(chunk_res) = stream.message().await? {
        if callbacks.is_cancelled(transfer_id) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Interrupted,
                "Transfer cancelled by user",
            )
            .into());
        }
        let chunk = chunk_res;
        callbacks
            .on_chunk_received(
                transfer_id,
                &chunk.relative_path,
                chunk.file_type,
                &chunk.chunk,
            )
            .await
            .map_err(std::io::Error::other)?;

        received_bytes += chunk.chunk.len() as u64;
        callbacks.on_transfer_progress(transfer_id, received_bytes);
    }

    Ok(())
}

pub async fn start_warpinator_service(
    callbacks: Arc<dyn WarpinatorCallbacks>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    use mdns_sd::{ServiceDaemon, ServiceInfo};
    use std::collections::HashMap;

    let mdns = ServiceDaemon::new().expect("Failed to create mdns daemon");
    let service_type = "_warpinator._tcp.local.";
    let local_hostname = callbacks.get_local_machine_info().0;
    let instance_name = format!("NEURODECK-Warpinator-{}", local_hostname);
    let host_name = format!("{}.local.", local_hostname.replace(" ", "-"));

    let mut properties = HashMap::new();
    properties.insert("machine".to_string(), local_hostname.clone());
    properties.insert("user".to_string(), "neurodeck".to_string());
    properties.insert("group".to_string(), "warpinator".to_string());

    let my_service = ServiceInfo::new(
        service_type,
        &instance_name,
        &host_name,
        "0.0.0.0",
        port,
        Some(properties),
    )
    .unwrap();

    mdns.register(my_service)
        .expect("Failed to register mDNS service");
    println!("Registered mDNS Warpinator Service on port {}", port);

    let addr = format!("0.0.0.0:{}", port).parse()?;
    let service = WarpinatorService::new(callbacks);

    println!("Starting Warpinator gRPC Server on {}", addr);
    Server::builder()
        .add_service(WarpServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}

pub async fn send_file_to_warpinator_peer(
    peer_ip: &str,
    peer_port: u16,
    transfer_id: &str,
    filename: &str,
    total_size: u64,
    callbacks: Arc<dyn WarpinatorCallbacks>,
) -> Result<(), Box<dyn std::error::Error>> {
    use warp::warp_client::WarpClient;

    let channel =
        tonic::transport::Channel::from_shared(format!("http://{}:{}", peer_ip, peer_port))?
            .connect()
            .await?;
    let mut client = WarpClient::new(channel);

    let op_info = OpInfo {
        ident: transfer_id.to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        readable_name: filename.to_string(),
        use_compression: false,
    };

    let (display_name, _user_name) = callbacks.get_local_machine_info();

    let req = TransferOpRequest {
        info: Some(op_info),
        sender_name: display_name,
        receiver_name: "".to_string(),
        receiver: "".to_string(),
        size: total_size,
        count: 1,
        name_if_single: filename.to_string(),
        mime_if_single: "".to_string(),
        top_dir_basenames: Vec::new(),
    };

    client
        .process_transfer_op_request(Request::new(req))
        .await?;
    Ok(())
}
