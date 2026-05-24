//! Live workspace collaboration over LAN TCP.
//!
//! NEURODECK instances share newline-delimited JSON messages over a local TCP
//! room. The frontend owns message semantics; the backend only routes payloads
//! and emits inbound messages as `canvas_sync` events.

use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex as AsyncMutex};

/// A live collab session handle.
pub struct CollabSession {
    pub abort_handle: tokio::task::AbortHandle,
    pub tx: mpsc::Sender<String>,
    pub peer_count: Arc<AtomicUsize>,
}

/// Start as HOST: bind `0.0.0.0:{port}`, then accept peers until stopped.
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

    let (tx, mut rx) = mpsc::channel::<String>(128);
    let peers: Arc<AsyncMutex<Vec<mpsc::Sender<String>>>> = Arc::new(AsyncMutex::new(Vec::new()));
    let peer_count = Arc::new(AtomicUsize::new(0));
    let accept_peers = Arc::clone(&peers);
    let accept_count = Arc::clone(&peer_count);
    let relay_tx = tx.clone();

    let task = tokio::spawn(async move {
        let broadcast_peers = Arc::clone(&peers);
        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                let senders = {
                    let guard = broadcast_peers.lock().await;
                    guard.clone()
                };
                for peer_tx in senders {
                    let _ = peer_tx.send(msg.clone()).await;
                }
            }
        });

        loop {
            match listener.accept().await {
                Ok((stream, peer)) => {
                    let peer_str = peer.to_string();
                    let (peer_tx, peer_rx) = mpsc::channel::<String>(128);
                    {
                        let mut guard = accept_peers.lock().await;
                        guard.push(peer_tx);
                    }
                    accept_count.fetch_add(1, Ordering::SeqCst);
                    let _ = app.emit("canvas_collab_event", format!("peer_connected:{}", peer_str));
                    tokio::spawn(run_peer_io(
                        stream,
                        app.clone(),
                        peer_rx,
                        Some(relay_tx.clone()),
                        Some(Arc::clone(&accept_count)),
                    ));
                }
                Err(e) => {
                    let _ = app.emit("canvas_collab_event", format!("error:{}", e));
                    break;
                }
            }
        }
    });

    Ok((
        bound_port,
        CollabSession {
            abort_handle: task.abort_handle(),
            tx,
            peer_count,
        },
    ))
}

/// Start as GUEST: connect to `addr` (e.g. "192.168.1.5:13338").
pub async fn join(addr: &str, app: AppHandle) -> Result<CollabSession, String> {
    let stream = TcpStream::connect(addr)
        .await
        .map_err(|e| format!("Connect to {} failed: {}", addr, e))?;

    let _ = app.emit("canvas_collab_event", format!("peer_connected:{}", addr));

    let (tx, rx) = mpsc::channel::<String>(64);
    let peer_count = Arc::new(AtomicUsize::new(1));

    let task = tokio::spawn(run_peer_io(
        stream,
        app,
        rx,
        None,
        Some(Arc::clone(&peer_count)),
    ));

    Ok(CollabSession {
        abort_handle: task.abort_handle(),
        tx,
        peer_count,
    })
}

// ──────────────────────────────────────────────
// Internal
// ──────────────────────────────────────────────

async fn run_peer_io(
    stream: TcpStream,
    app: AppHandle,
    mut rx: mpsc::Receiver<String>,
    inbound_relay: Option<mpsc::Sender<String>>,
    peer_count: Option<Arc<AtomicUsize>>,
) {
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
                let _ = app.emit("canvas_sync", line.clone());
                if let Some(relay) = &inbound_relay {
                    let _ = relay.send(line).await;
                }
            }
            _ => break,
        }
    }

    write_task.abort();
    if let Some(count) = peer_count {
        count.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |value| {
            Some(value.saturating_sub(1))
        })
        .ok();
    }
    let _ = app.emit("canvas_collab_event", "peer_disconnected".to_string());
}
