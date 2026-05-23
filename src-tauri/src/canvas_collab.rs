//! Live Canvas Collaboration over LAN TCP.
//!
//! Two NEURODECK instances share a Canvas session in real time.
//! Protocol: newline-delimited JSON  { "type": "sync", "code": "...", "lang": "..." }
//!
//! Host mode: bind a TCP port and accept one peer connection.
//! Guest mode: connect to the host's IP:port.
//!
//! All inbound messages are forwarded to the frontend as `canvas_sync` events.
//! The caller sends outbound messages through the returned `mpsc::Sender<String>`.

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};

/// A live collab session handle.
pub struct CollabSession {
    pub abort_handle: tokio::task::AbortHandle,
    pub tx: mpsc::Sender<String>,
}

/// Start as HOST: bind `0.0.0.0:{port}`, wait for one peer to connect.
/// Returns `(actual_port, session)`.
pub async fn host(port: u16, app: AppHandle) -> Result<(u16, CollabSession), String> {
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Bind failed on {}: {}", addr, e))?;

    let bound_port = listener
        .local_addr()
        .map(|a| a.port())
        .unwrap_or(port);

    let (tx, rx) = mpsc::channel::<String>(64);

    let task = tokio::spawn(async move {
        match listener.accept().await {
            Ok((stream, peer)) => {
                let peer_str = peer.to_string();
                let _ = app.emit("canvas_collab_event", format!("peer_connected:{}", peer_str));
                run_peer_io(stream, app, rx).await;
            }
            Err(e) => {
                let _ = app.emit("canvas_collab_event", format!("error:{}", e));
            }
        }
    });

    Ok((bound_port, CollabSession { abort_handle: task.abort_handle(), tx }))
}

/// Start as GUEST: connect to `addr` (e.g. "192.168.1.5:13338").
pub async fn join(addr: &str, app: AppHandle) -> Result<CollabSession, String> {
    let stream = TcpStream::connect(addr)
        .await
        .map_err(|e| format!("Connect to {} failed: {}", addr, e))?;

    let _ = app.emit("canvas_collab_event", format!("peer_connected:{}", addr));

    let (tx, rx) = mpsc::channel::<String>(64);

    let task = tokio::spawn(run_peer_io(stream, app, rx));

    Ok(CollabSession { abort_handle: task.abort_handle(), tx })
}

// ──────────────────────────────────────────────
// Internal
// ──────────────────────────────────────────────

async fn run_peer_io(stream: TcpStream, app: AppHandle, mut rx: mpsc::Receiver<String>) {
    let (read_half, mut write_half) = stream.into_split();
    let mut lines = BufReader::new(read_half).lines();

    // Outbound: drain the mpsc channel, write each message as a JSON line to the peer
    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let line = msg + "\n";
            if write_half.write_all(line.as_bytes()).await.is_err() {
                break;
            }
        }
    });

    // Inbound: relay each received line to the frontend as a `canvas_sync` event
    loop {
        match lines.next_line().await {
            Ok(Some(line)) => {
                let _ = app.emit("canvas_sync", line);
            }
            _ => break,
        }
    }

    write_task.abort();
    let _ = app.emit("canvas_collab_event", "peer_disconnected".to_string());
}
