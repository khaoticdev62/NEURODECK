//! # NEURODECK Bridge Server
//!
//! Replaces Tauri's `invoke()` / `emit()` IPC with a local axum HTTP + WebSocket bridge.
//!
//! ## Architecture
//! - `POST /api/{command}` — all Tauri command handlers (replaces `invoke()`)
//! - `GET  /ws`            — WebSocket connection for backend→frontend events (replaces `listen()`)
//! - `GET  /health`        — ready probe used by Electron to know the sidecar is up
//!
//! ## Port
//! Binds to `127.0.0.1:9477` by default.  Override with the `NEURODECK_PORT` env var.

use std::sync::{Arc, Mutex};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State as AxumState,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::Value;
use tokio::sync::broadcast;

use crate::AppState;

// ─────────────────────────────────────────────────────────
// Broadcaster — wraps tokio broadcast for event fan-out
// ─────────────────────────────────────────────────────────

/// A cloneable handle for sending events from any async context.
/// Replaces every `app_handle.emit("event", payload)` call.
#[derive(Clone)]
pub struct WsBroadcaster(pub broadcast::Sender<WsEvent>);

/// An outbound event payload — mirrors Tauri's event model.
#[derive(Clone, Debug, serde::Serialize)]
pub struct WsEvent {
    pub event: String,
    pub payload: Value,
}

impl WsBroadcaster {
    pub fn new() -> (Self, broadcast::Receiver<WsEvent>) {
        let (tx, rx) = broadcast::channel(4096);
        (WsBroadcaster(tx), rx)
    }

    /// Send an event to all connected WebSocket clients.
    /// Silently drops if no clients are connected.
    pub fn emit<T: serde::Serialize>(&self, event: &str, payload: T) {
        let val = match serde_json::to_value(&payload) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("WsBroadcaster: failed to serialize payload for '{}': {}", event, e);
                return;
            }
        };
        let _ = self.0.send(WsEvent {
            event: event.to_string(),
            payload: val,
        });
    }
}

// ─────────────────────────────────────────────────────────
// Shared server state — passed via axum State extractor
// ─────────────────────────────────────────────────────────

/// All long-lived objects the route handlers need access to.
/// Cloned cheaply (all fields are `Arc`-wrapped).
#[derive(Clone)]
pub struct ServerState {
    pub app_state: Arc<Mutex<AppState>>,
    pub broadcaster: WsBroadcaster,
    pub pty: Arc<crate::pty_manager::PtyState>,
    pub remote: Arc<crate::remote_control::RemoteControlState>,
    pub transfer: crate::transfer::SharedTransferState,
    pub torrent: Arc<crate::torrent::TorrentState>,
    pub scheduler: Arc<crate::scheduler::SchedulerManaged>,
    pub orchestrator: Arc<crate::orchestrator::OrchestratorManaged>,
    pub lsp: Arc<Mutex<crate::lsp::LspManager>>,
    pub lua: Arc<Mutex<crate::lua::LuaEngine>>,
    pub deckcode_state: Arc<Mutex<(Option<serde_json::Value>, Option<serde_json::Value>)>>,
    pub deckcode_lang: Arc<Mutex<String>>,
}

impl ServerState {
    /// Create ServerState from the full AppState and system components.
    /// Used during bridge server bootstrap.
    pub fn new(
        app_state: AppState,
        broadcaster: WsBroadcaster,
        pty: Arc<crate::pty_manager::PtyState>,
        remote: Arc<crate::remote_control::RemoteControlState>,
        transfer: crate::transfer::SharedTransferState,
        torrent: Arc<crate::torrent::TorrentState>,
        scheduler: Arc<crate::scheduler::SchedulerManaged>,
        orchestrator: Arc<crate::orchestrator::OrchestratorManaged>,
        lsp: Arc<Mutex<crate::lsp::LspManager>>,
        lua: Arc<Mutex<crate::lua::LuaEngine>>,
        deckcode_state: Arc<Mutex<(Option<serde_json::Value>, Option<serde_json::Value>)>>,
        deckcode_lang: Arc<Mutex<String>>,
    ) -> Self {
        ServerState {
            app_state: Arc::new(Mutex::new(app_state)),
            broadcaster,
            pty,
            remote,
            transfer,
            torrent,
            scheduler,
            orchestrator,
            lsp,
            lua,
            deckcode_state,
            deckcode_lang,
        }
    }
}

// ─────────────────────────────────────────────────────────
// Command dispatch table
// ─────────────────────────────────────────────────────────

/// Dispatch a single command by name, returning a JSON result.
/// This is the single-entry-point equivalent of Tauri's `generate_handler![]`.
async fn dispatch_command(
    state: ServerState,
    command: &str,
    args: Value,
) -> Result<Value, String> {
    crate::commands::dispatch(state, command, args).await
}

// ─────────────────────────────────────────────────────────
// HTTP route handlers
// ─────────────────────────────────────────────────────────

/// `GET /health` — Electron polls this until the sidecar is ready.
async fn health() -> &'static str {
    "NEURODECK_READY"
}

/// `POST /api/{command}` — single route for all 235 command handlers.
///
/// Request body: JSON object with the named arguments.
/// Response body: JSON value returned by the handler, or an error string.
async fn api_command(
    AxumState(state): AxumState<ServerState>,
    Path(command): Path<String>,
    body: axum::body::Bytes,
) -> Response {
    // Parse body as JSON args (allow empty body → empty object)
    let args: Value = if body.is_empty() {
        Value::Object(serde_json::Map::new())
    } else {
        match serde_json::from_slice(&body) {
            Ok(v) => v,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    format!("Invalid JSON body: {}", e),
                )
                    .into_response();
            }
        }
    };

    match dispatch_command(state, &command, args).await {
        Ok(result) => Json(result).into_response(),
        Err(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg).into_response(),
    }
}

// ─────────────────────────────────────────────────────────
// WebSocket route
// ─────────────────────────────────────────────────────────

/// `GET /ws` — upgrades to WebSocket.
/// The server only *sends* (backend → frontend events).
/// Clients do not send messages upward via WS (they use the HTTP API).
async fn ws_handler(
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<ServerState>,
) -> Response {
    let rx = state.broadcaster.0.subscribe();
    ws.on_upgrade(move |socket| handle_socket(socket, rx))
}

async fn handle_socket(mut socket: WebSocket, mut rx: broadcast::Receiver<WsEvent>) {
    loop {
        match rx.recv().await {
            Ok(event) => {
                let text = match serde_json::to_string(&event) {
                    Ok(t) => t,
                    Err(_) => continue,
                };
                if socket.send(Message::Text(text.into())).await.is_err() {
                    // Client disconnected
                    break;
                }
            }
            Err(broadcast::error::RecvError::Closed) => break,
            Err(broadcast::error::RecvError::Lagged(n)) => {
                tracing::warn!("WS client lagged, dropped {} events", n);
                // Send a special lag notice so the frontend can detect it
                let notice = serde_json::json!({
                    "event": "__lag__",
                    "payload": { "dropped": n }
                });
                let _ = socket
                    .send(Message::Text(notice.to_string().into()))
                    .await;
            }
        }
    }
}

// ─────────────────────────────────────────────────────────
// Server bootstrap
// ─────────────────────────────────────────────────────────

/// Starts the HTTP + WebSocket bridge and blocks until the process exits.
/// Called from main startup when --bridge flag is used.
pub async fn start_server(state: ServerState) -> anyhow::Result<()> {
    let port: u16 = std::env::var("NEURODECK_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(9477);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));

    let app = Router::new()
        .route("/health", get(health))
        .route("/ws", get(ws_handler))
        .route("/api/{command}", post(api_command))
        .with_state(state);

    tracing::info!("NEURODECK bridge server listening on http://{}", addr);
    println!("NEURODECK_READY:{}", port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
