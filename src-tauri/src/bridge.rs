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

// ─────────────────────────────────────────────────────────
// EventEmitter trait — abstracts over Tauri AppHandle and WsBroadcaster
// ─────────────────────────────────────────────────────────

pub trait EventEmitter: Send + Sync + Clone + 'static {
    fn emit<E: serde::Serialize + Clone>(&self, event: &str, payload: E);
}

impl EventEmitter for WsBroadcaster {
    fn emit<E: serde::Serialize + Clone>(&self, event: &str, payload: E) {
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

impl EventEmitter for tauri::AppHandle {
    fn emit<E: serde::Serialize + Clone>(&self, event: &str, payload: E) {
        let _ = tauri::Emitter::emit(self, event, payload);
    }
}

impl WsBroadcaster {
    pub fn new() -> (Self, broadcast::Receiver<WsEvent>) {
        let (tx, rx) = broadcast::channel(4096);
        (WsBroadcaster(tx), rx)
    }

    /// Send an event to all connected WebSocket clients.
    /// Silently drops if no clients are connected.
    pub fn emit<T: serde::Serialize + Clone>(&self, event: &str, payload: T) {
        <Self as EventEmitter>::emit(self, event, payload);
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

    tracing::info!("NEURODECK bridge server listening on {}", addr);
    println!("NEURODECK_READY:{}", port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}


/// Run NEURODECK as a pure HTTP + WebSocket bridge server (no Tauri WebView).
/// Used for headless backends, Electron wrappers, or external client control.
///
/// Startup: `neurodeck --bridge`
/// Port: 9477 (override with NEURODECK_PORT env var)
///
/// Status: Foundation implemented. See docs/BRIDGE_SERVER.md for extending command dispatch.
pub async fn run_bridge_server(
    config_root: &std::path::Path,
    config_path: &std::path::Path,
) -> anyhow::Result<()> {
    use chrono::Utc;
    use std::sync::{Arc, Mutex};

    tracing::info!("Starting NEURODECK bridge server on port 9477");
    eprintln!("Bridge server mode is ALPHA — only PTY commands are currently dispatched.");
    eprintln!("To add more commands, extend the dispatch() function in src-tauri/src/commands/mod.rs");

    // Minimal setup for bridge mode (without Tauri's WebView)
    crate::load_env_file();
    let boot_self_heal = crate::self_heal::boot_self_heal(config_root, config_path);
    let mut config = boot_self_heal.config;

    if config.llm.agents.is_empty() {
        config.llm.agents = crate::default_agents();
        let target_provider = config.llm.default_provider.clone();
        let target_model = if target_provider == "gemini" {
            config.llm.gemini_model.clone()
        } else {
            config.llm.ollama_model.clone()
        };
        config.llm.active_agent_id = config
            .llm
            .agents
            .iter()
            .find(|a| a.provider == target_provider && a.model == target_model)
            .map(|a| a.id.clone())
            .unwrap_or_else(|| config.llm.agents[0].id.clone());
        let _ = crate::config::save_config(config_path, &config);
    }

    let provider = crate::create_provider(&config);
    let torrent_download_root = config_root.join("data/torrents/downloads");
    let _ = std::fs::create_dir_all(&torrent_download_root);

    let app_state = crate::AppState {
        provider,
        config,
        session_id: Utc::now().format("%Y%m%d-%H%M%S").to_string(),
        messages: Vec::new(),
        active_persona: "Default".to_string(),
        mem_db: boot_self_heal.mem_db,
        record_child: None,
        record_stop_flag: None,
        process_stdin_tx: None,
        kill_tx: None,
        active_process_id: 0,
        cancel_stream_tx: None,
        compare_cancel_flag: None,
        custom_personas: boot_self_heal.custom_personas,
        mcp_abort: None,
        mcp_port: 13337,
        mcp_token: None,
        mcp_tool_whitelist: crate::mcp::default_tool_whitelist(),
        whisper_binary: String::new(),
        whisper_model: String::new(),
        collab_abort: None,
        collab_tx: None,
        collab_mode: None,
        collab_addr: None,
        collab_peer_count: None,
        collab_mdns: None,
        canvas_exec_cancel_tx: None,
        boot_self_heal: boot_self_heal.report,
    };

    // Create server state
    let (broadcaster, _) = WsBroadcaster::new();
    let pty_state = Arc::new(crate::pty_manager::PtyState::new());
    let remote_state = Arc::new(crate::remote_control::RemoteControlState::default());
    let torrent_state = Arc::new(crate::torrent::TorrentState::new(torrent_download_root));
    let scheduler = Arc::new(crate::scheduler::SchedulerManaged::new());
    let orchestrator = Arc::new(crate::orchestrator::OrchestratorManaged::new());
    let lsp = Arc::new(Mutex::new(crate::lsp::LspManager::new()));

    // TODO: Initialize Lua engine when bridge mode has a proper AppHandle mock
    // For now, create a placeholder. Full Lua support requires Tauri's event system.

    // Create server state (minimal for initial bridge server release)
    // TODO: Add lua engine and full command dispatch table
    let dummy_transfer = Arc::new(Mutex::new(crate::transfer::TransferState::new()));

    let server_state = ServerState {
        app_state: Arc::new(Mutex::new(app_state)),
        broadcaster,
        pty: pty_state,
        remote: remote_state,
        transfer: crate::transfer::SharedTransferState(dummy_transfer),
        torrent: torrent_state,
        scheduler,
        orchestrator,
        lsp,
        lua: Arc::new(Mutex::new(crate::lua::LuaEngine::new_headless()?)),
        deckcode_state: Arc::new(Mutex::new((None, None))),
        deckcode_lang: Arc::new(Mutex::new("plain_text".to_string())),
    };

    start_server(server_state).await
}
