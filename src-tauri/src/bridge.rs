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
use std::net::SocketAddr;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State as AxumState, ConnectInfo,
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
    pub deckcode_state: Arc<Mutex<(Option<crate::deckcode::schema::ControllerProfileSchema>, Option<crate::deckcode::multilang_schema::MultiLangProfileSchema>)>>,
    pub deckcode_lang: Arc<Mutex<String>>,
    pub limiter: Arc<crate::security::IpRateLimiter>,
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
        deckcode_state: Arc<Mutex<(Option<crate::deckcode::schema::ControllerProfileSchema>, Option<crate::deckcode::multilang_schema::MultiLangProfileSchema>)>>,
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
            limiter: Arc::new(crate::security::IpRateLimiter::new(200.0, 50.0)),
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
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(command): Path<String>,
    body: axum::body::Bytes,
) -> Response {
    let ip = addr.ip();
    if !state.limiter.is_allowed(ip) {
        return (StatusCode::TOO_MANY_REQUESTS, "Too many requests. Please try again later.").into_response();
    }

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
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    AxumState(state): AxumState<ServerState>,
) -> Response {
    let ip = addr.ip();
    if !state.limiter.is_allowed(ip) {
        return (StatusCode::TOO_MANY_REQUESTS, "Too many requests. Please try again later.").into_response();
    }
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

async fn cors_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    let method = req.method().clone();
    let origin = req.headers().get("origin").cloned();

    if method == axum::http::Method::OPTIONS {
        let mut response = Response::new(axum::body::Body::empty());
        let headers = response.headers_mut();
        if let Some(origin_val) = origin {
            headers.insert("access-control-allow-origin", origin_val);
        } else {
            headers.insert("access-control-allow-origin", axum::http::HeaderValue::from_static("*"));
        }
        headers.insert("access-control-allow-methods", axum::http::HeaderValue::from_static("POST, GET, OPTIONS"));
        headers.insert("access-control-allow-headers", axum::http::HeaderValue::from_static("Content-Type"));
        headers.insert("access-control-max-age", axum::http::HeaderValue::from_static("86400"));
        return response;
    }

    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    if let Some(origin_val) = origin {
        headers.insert("access-control-allow-origin", origin_val);
    } else {
        headers.insert("access-control-allow-origin", axum::http::HeaderValue::from_static("*"));
    }
    response
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
        .layer(axum::middleware::from_fn(cors_middleware))
        .with_state(state);

    tracing::info!("NEURODECK bridge server listening on {}", addr);
    println!("NEURODECK_READY:{}", port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;
    Ok(())
}


/// Run NEURODECK as a pure HTTP + WebSocket bridge server (no Tauri WebView).
/// Used for headless backends, Electron wrappers, or external client control.
///
/// Startup: `neurodeck --bridge`
/// Port: 9477 (override with NEURODECK_PORT env var)
pub async fn run_bridge_server(
    config_root: &std::path::Path,
    config_path: &std::path::Path,
) -> anyhow::Result<()> {
    use chrono::Utc;
    use std::sync::{Arc, Mutex};

    // ── Tracing ────────────────────────────────────────────────────────────
    let log_dir = config_root.join("logs");
    let _ = std::fs::create_dir_all(&log_dir);
    let file_appender = tracing_appender::rolling::daily(log_dir, "neurodeck.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    tracing_subscriber::fmt()
        .with_writer(non_blocking)
        .with_ansi(false)
        .init();
    tracing::info!("Starting NEURODECK bridge server...");

    // ── Config & env ───────────────────────────────────────────────────────
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
    } else if config.llm.active_agent_id.is_empty() {
        config.llm.active_agent_id = config
            .llm
            .agents
            .first()
            .map(|a| a.id.clone())
            .unwrap_or_default();
        let _ = crate::config::save_config(config_path, &config);
    }

    let provider = crate::create_provider(&config);
    let data_dir = config_root.join("data");
    let torrent_download_root = data_dir.join("torrents/downloads");
    let _ = std::fs::create_dir_all(&torrent_download_root);

    let whisper_binary = config.stt.whisper_binary.clone();
    let whisper_model = config.stt.whisper_model.clone();

    // ── AppState ───────────────────────────────────────────────────────────
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
        whisper_binary,
        whisper_model,
        collab_abort: None,
        collab_tx: None,
        collab_mode: None,
        collab_addr: None,
        collab_peer_count: None,
        collab_mdns: None,
        canvas_exec_cancel_tx: None,
        boot_self_heal: boot_self_heal.report,
    };

    // ── Server state ───────────────────────────────────────────────────────
    let (broadcaster, _) = WsBroadcaster::new();
    let pty_state = Arc::new(crate::pty_manager::PtyState::new());
    let remote_state = Arc::new(crate::remote_control::RemoteControlState::default());
    let torrent_state = Arc::new(crate::torrent::TorrentState::new(torrent_download_root));
    let scheduler = Arc::new(crate::scheduler::SchedulerManaged::new());
    let orchestrator = Arc::new(crate::orchestrator::OrchestratorManaged::new());
    let lsp = Arc::new(Mutex::new(crate::lsp::LspManager::new()));

    // ── Lua engine ─────────────────────────────────────────────────────────
    let lua_engine = crate::lua::LuaEngine::new_headless()?;
    let plugins_dir = std::path::PathBuf::from("./plugins");
    if plugins_dir.exists() {
        if let Err(e) = lua_engine.load_plugins(&plugins_dir) {
            tracing::warn!("Failed to load Lua plugins: {}", e);
        } else {
            tracing::info!("Lua plugins loaded from {}", plugins_dir.display());
        }
    }
    let lua = Arc::new(Mutex::new(lua_engine));

    // ── Scheduler ──────────────────────────────────────────────────────────
    {
        let sched = scheduler.clone();
        let bc = broadcaster.clone();
        tokio::spawn(async move {
            if let Err(e) = sched.start(bc).await {
                tracing::warn!("Failed to start task scheduler: {}", e);
            } else {
                tracing::info!("Task scheduler started");
            }
        });
    }

    // ── Runtime layout maintenance ─────────────────────────────────────────
    {
        let config_root = config_root.to_path_buf();
        tokio::spawn(async move {
            loop {
                crate::self_heal::maintain_runtime_layout(&config_root);
                tokio::time::sleep(std::time::Duration::from_secs(45)).await;
            }
        });
    }

    // ── Auto-backup memory ─────────────────────────────────────────────────
    {
        let app_state_backup = app_state.mem_db.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            if let Some(db) = app_state_backup {
                if let Ok(records) = db.export_all_records() {
                    if !records.is_empty() {
                        let _ = crate::commands::system::run_memory_backup(&db);
                    }
                }
            }
        });
    }

    // ── Transfer services ──────────────────────────────────────────────────
    let transfer_state = Arc::new(Mutex::new(crate::transfer::TransferState::new()));
    let download_dir = config_root.join("data/transfers");
    let _ = std::fs::create_dir_all(&download_dir);
    crate::transfer::start_transfer_services(
        broadcaster.clone(),
        transfer_state.clone(),
        download_dir,
    );

    // ── DeckCode input daemon (Linux/Steam Deck) ───────────────────────────
    let deckcode_schema_path = std::path::PathBuf::from("../deckcode-controller-profile.schema.json");
    let deckcode_schema_path = if deckcode_schema_path.exists() {
        deckcode_schema_path
    } else {
        std::path::PathBuf::from("deckcode-controller-profile.schema.json")
    };
    let deckcode_multilang_path = std::path::PathBuf::from("../deckcode-multilang-code-entry.profile.json");
    let deckcode_multilang_path = if deckcode_multilang_path.exists() {
        deckcode_multilang_path
    } else {
        std::path::PathBuf::from("deckcode-multilang-code-entry.profile.json")
    };

    let mut loaded_schema: Option<crate::deckcode::schema::ControllerProfileSchema> = None;
    let mut loaded_multilang: Option<crate::deckcode::multilang_schema::MultiLangProfileSchema> = None;

    if let Ok(schema) = crate::deckcode::load_schema(deckcode_schema_path.to_str().unwrap_or_default()) {
        loaded_schema = Some(schema);
        tracing::info!("Loaded DeckCode Controller Profile");
    }
    if let Ok(ml_schema) = crate::deckcode::load_multilang_profile(deckcode_multilang_path.to_str().unwrap_or_default()) {
        loaded_multilang = Some(ml_schema);
        tracing::info!("Loaded DeckCode MultiLang Profile");
    }

    let deckcode_state = Arc::new(Mutex::new((loaded_schema.clone(), loaded_multilang.clone())));
    let deckcode_lang = Arc::new(Mutex::new("plain_text".to_string()));

    // Start DeckCode input daemon + resolver if schema loaded
    if let Some(schema) = loaded_schema {
        let (tx, rx) = std::sync::mpsc::channel();
        crate::deckcode::input::start_input_daemon(tx);

        let dc_emitter = broadcaster.clone();
        let dc_lang = deckcode_lang.clone();
        let dc_multilang = loaded_multilang.clone();

        std::thread::spawn(move || {
            let resolver = crate::deckcode::resolver::DeckCodeResolver::new(schema, dc_multilang);
            let mut context = crate::deckcode::resolver::ResolverContext::default();

            while let Ok(event) = rx.recv() {
                context.active_language_id = dc_lang.lock().unwrap_or_else(|e| e.into_inner()).clone();
                if let Some(binding) = resolver.resolve(&event, &context) {
                    crate::deckcode::dispatch::dispatch_action(&dc_emitter, &binding);
                }
            }
        });
    }

    let server_state = ServerState {
        app_state: Arc::new(Mutex::new(app_state)),
        broadcaster: broadcaster.clone(),
        pty: pty_state,
        remote: remote_state,
        transfer: crate::transfer::SharedTransferState(transfer_state),
        torrent: torrent_state,
        scheduler,
        orchestrator,
        lsp,
        lua,
        deckcode_state,
        deckcode_lang,
        limiter: Arc::new(crate::security::IpRateLimiter::new(200.0, 50.0)),
    };

    start_server(server_state).await
}
