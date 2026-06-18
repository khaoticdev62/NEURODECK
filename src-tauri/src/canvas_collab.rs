//! Live workspace collaboration over LAN TCP with CRDT conflict resolution.
//!
//! Each session maintains a `yrs::Doc` that merges concurrent edits correctly.
//! Messages use `{ "type": "y_update", "data": "<base64 encoded yrs Update>" }`
//! for incremental sync and `{ "type": "sync_full", "code": "...", "lang": "..." }`
//! for joining a new session.  Legacy `{ "type": "sync" }` messages are still
//! accepted for backward compatibility.

use crate::bridge::EventEmitter;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex as AsyncMutex};
use yrs::{updates::decoder::Decode, Doc, GetString, ReadTxn, Text, Transact};

// ── Shared CRDT document ───────────────────────────────────────────────────────

pub struct CollabDoc {
    pub doc: Doc,
    pub text: yrs::TextRef,
}

impl CollabDoc {
    pub fn new() -> Self {
        let doc = Doc::new();
        let text = doc.get_or_insert_text("canvas");
        CollabDoc { doc, text }
    }

    /// Replace the entire text content, returning an encoded yrs Update.
    pub fn set_content(&self, new_code: &str) -> Vec<u8> {
        let mut txn = self.doc.transact_mut();
        let current_len = self.text.len(&txn);
        if current_len > 0 {
            self.text.remove_range(&mut txn, 0, current_len);
        }
        if !new_code.is_empty() {
            self.text.insert(&mut txn, 0, new_code);
        }
        txn.encode_update_v2()
    }

    /// Apply a raw encoded yrs Update and return the resulting text content.
    pub fn apply_update(&self, bytes: &[u8]) -> Result<String, String> {
        let update = yrs::Update::decode_v2(bytes).map_err(|e| e.to_string())?;
        let mut txn = self.doc.transact_mut();
        txn.apply_update(update).map_err(|e| e.to_string())?;
        Ok(self.text.get_string(&txn))
    }

    /// Encode the full current state as a yrs Update for new-peer catchup.
    pub fn encode_state_as_update(&self) -> Vec<u8> {
        let txn = self.doc.transact();
        txn.encode_state_as_update_v2(&Default::default())
    }
}

// ── Session handle ─────────────────────────────────────────────────────────────

pub struct CollabSession {
    pub abort_handle: tokio::task::AbortHandle,
    pub tx: mpsc::Sender<String>,
    pub peer_count: Arc<AtomicUsize>,
}

// ── Host ───────────────────────────────────────────────────────────────────────

pub async fn host<E: EventEmitter>(port: u16, app: E) -> Result<(u16, CollabSession), String> {
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Bind failed on {}: {}", addr, e))?;
    let bound_port = listener.local_addr().map(|a| a.port()).unwrap_or(port);

    let (tx, mut rx) = mpsc::channel::<String>(256);
    let peers: Arc<AsyncMutex<Vec<mpsc::Sender<String>>>> = Arc::new(AsyncMutex::new(Vec::new()));
    let peer_count: Arc<AtomicUsize> = Arc::new(AtomicUsize::new(0));
    let crdt_doc: Arc<AsyncMutex<CollabDoc>> = Arc::new(AsyncMutex::new(CollabDoc::new()));

    let accept_peers = Arc::clone(&peers);
    let accept_count = Arc::clone(&peer_count);
    let relay_tx = tx.clone();
    let accept_crdt = Arc::clone(&crdt_doc);

    let task = tokio::spawn(async move {
        loop {
            tokio::select! {
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, peer_addr)) => {
                            let count_now = accept_count.fetch_add(1, Ordering::SeqCst) + 1;
                            if count_now > 8 {
                                // Over the limit — reject silently
                                accept_count.fetch_sub(1, Ordering::SeqCst);
                                continue;
                            }
                            let peer_str = peer_addr.to_string();
                            let (peer_tx, peer_rx) = mpsc::channel::<String>(256);
                            {
                                let mut guard = accept_peers.lock().await;
                                guard.push(peer_tx.clone());
                            }
                            app.emit("canvas_collab_event",
                                format!("peer_connected:{}", peer_str));
                            // Send full state to new peer so they catch up immediately
                            let catchup = {
                                let doc = accept_crdt.lock().await;
                                let update_bytes = doc.encode_state_as_update();
                                serde_json::json!({
                                    "type": "sync_full",
                                    "data": STANDARD.encode(&update_bytes)
                                }).to_string()
                            };
                            let _ = peer_tx.send(catchup).await;

                            tokio::spawn(run_peer_io(
                                stream,
                                app.clone(),
                                peer_rx,
                                Some(relay_tx.clone()),
                                Some(Arc::clone(&accept_count)),
                                Some(Arc::clone(&accept_crdt)),
                            ));
                        }
                        Err(e) => {
                            app.emit("canvas_collab_event", format!("error:{}", e));
                            break;
                        }
                    }
                }
                msg = rx.recv() => {
                    match msg {
                        Some(msg) => {
                            let senders = {
                                let guard = peers.lock().await;
                                guard.clone()
                            };
                            for peer_tx in &senders {
                                let _ = peer_tx.send(msg.clone()).await;
                            }
                        }
                        None => break,
                    }
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

// ── Guest ──────────────────────────────────────────────────────────────────────

pub async fn join<E: EventEmitter>(addr: &str, app: E) -> Result<CollabSession, String> {
    let stream = TcpStream::connect(addr)
        .await
        .map_err(|e| format!("Connect to {} failed: {}", addr, e))?;
    app.emit("canvas_collab_event", format!("peer_connected:{}", addr));

    let (tx, rx) = mpsc::channel::<String>(256);
    let peer_count = Arc::new(AtomicUsize::new(1));
    let crdt_doc = Arc::new(AsyncMutex::new(CollabDoc::new()));

    let task = tokio::spawn(run_peer_io(
        stream,
        app,
        rx,
        None,
        Some(Arc::clone(&peer_count)),
        Some(crdt_doc),
    ));

    Ok(CollabSession {
        abort_handle: task.abort_handle(),
        tx,
        peer_count,
    })
}

// ── Per-peer I/O ───────────────────────────────────────────────────────────────

async fn run_peer_io<E: EventEmitter>(
    stream: TcpStream,
    app: E,
    mut rx: mpsc::Receiver<String>,
    inbound_relay: Option<mpsc::Sender<String>>,
    peer_count: Option<Arc<AtomicUsize>>,
    crdt_doc: Option<Arc<AsyncMutex<CollabDoc>>>,
) {
    let (read_half, mut write_half) = stream.into_split();
    let mut lines = BufReader::new(read_half).lines();

    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let line = msg + "\n";
            if write_half.write_all(line.as_bytes()).await.is_err() {
                break;
            }
        }
    });

    while let Ok(Some(line)) = lines.next_line().await {
        let merged_code = if let Some(ref doc_mutex) = crdt_doc {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                let msg_type = val["type"].as_str().unwrap_or("");
                match msg_type {
                    "y_update" | "sync_full" => {
                        if let Some(data_b64) = val["data"].as_str() {
                            if let Ok(bytes) = STANDARD.decode(data_b64) {
                                let doc = doc_mutex.lock().await;
                                doc.apply_update(&bytes).ok()
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    }
                    // Legacy full-content sync
                    "sync" => {
                        if let Some(code) = val["code"].as_str() {
                            let doc = doc_mutex.lock().await;
                            let _ = doc.set_content(code);
                            Some(code.to_string())
                        } else {
                            None
                        }
                    }
                    _ => None,
                }
            } else {
                None
            }
        } else {
            None
        };

        // Build the event the frontend receives
        let emit_payload = if let Some(code) = merged_code {
            // Reconstruct with merged code so the frontend always gets canonical text
            if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&line) {
                val["code"] = serde_json::Value::String(code);
                val.to_string()
            } else {
                line.clone()
            }
        } else {
            line.clone()
        };

        app.emit("canvas_sync", emit_payload.clone());

        if let Some(relay) = &inbound_relay {
            let _ = relay.send(emit_payload).await;
        }
    }

    write_task.abort();
    if let Some(count) = peer_count {
        count
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |v| {
                Some(v.saturating_sub(1))
            })
            .ok();
    }
    app.emit("canvas_collab_event", "peer_disconnected".to_string());
}
