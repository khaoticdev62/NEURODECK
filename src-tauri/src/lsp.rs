// LSP (Language Server Protocol) client manager.
// Manages one stdio JSON-RPC language server process per language.
// The reader task routes responses to pending callers and publishes
// textDocument/publishDiagnostics as "lsp:diagnostics" Tauri events.

use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex,
};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use crate::bridge::EventEmitter;
use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, oneshot};

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspPosition {
    pub line: u32,
    pub character: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspRange {
    pub start: LspPosition,
    pub end: LspPosition,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspDiagnostic {
    pub range: LspRange,
    /// 1 = Error, 2 = Warning, 3 = Info, 4 = Hint
    pub severity: Option<u32>,
    pub message: String,
    pub source: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspCompletionItem {
    pub label: String,
    /// LSP CompletionItemKind integer
    pub kind: Option<u32>,
    pub detail: Option<String>,
    pub insert_text: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspHover {
    pub contents: String,
    pub range: Option<LspRange>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspLocation {
    pub uri: String,
    pub range: LspRange,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LspServerInfo {
    pub language: String,
    pub command: String,
    pub status: String,
}

// ── Known server catalog ─────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KnownServer {
    pub language: String,
    pub label: String,
    pub command: String,
    pub args: Vec<String>,
    pub install_hint: String,
}

pub fn known_servers() -> Vec<KnownServer> {
    vec![
        KnownServer {
            language: "rust".into(),
            label: "Rust Analyzer".into(),
            command: "rust-analyzer".into(),
            args: vec![],
            install_hint: "rustup component add rust-analyzer".into(),
        },
        KnownServer {
            language: "python".into(),
            label: "Python LSP Server (pylsp)".into(),
            command: "pylsp".into(),
            args: vec![],
            install_hint: "pip install python-lsp-server".into(),
        },
        KnownServer {
            language: "typescript".into(),
            label: "TypeScript Language Server".into(),
            command: "typescript-language-server".into(),
            args: vec!["--stdio".into()],
            install_hint: "npm i -g typescript-language-server typescript".into(),
        },
        KnownServer {
            language: "javascript".into(),
            label: "TypeScript LSP (JS mode)".into(),
            command: "typescript-language-server".into(),
            args: vec!["--stdio".into()],
            install_hint: "npm i -g typescript-language-server typescript".into(),
        },
        KnownServer {
            language: "lua".into(),
            label: "Lua Language Server".into(),
            command: "lua-language-server".into(),
            args: vec![],
            install_hint: "brew install lua-language-server  /  scoop install lua-language-server".into(),
        },
        KnownServer {
            language: "c".into(),
            label: "clangd (C)".into(),
            command: "clangd".into(),
            args: vec![],
            install_hint: "Install clang/LLVM from llvm.org".into(),
        },
        KnownServer {
            language: "cpp".into(),
            label: "clangd (C++)".into(),
            command: "clangd".into(),
            args: vec![],
            install_hint: "Install clang/LLVM from llvm.org".into(),
        },
        KnownServer {
            language: "go".into(),
            label: "gopls".into(),
            command: "gopls".into(),
            args: vec![],
            install_hint: "go install golang.org/x/tools/gopls@latest".into(),
        },
        KnownServer {
            language: "bash".into(),
            label: "Bash Language Server".into(),
            command: "bash-language-server".into(),
            args: vec!["start".into()],
            install_hint: "npm i -g bash-language-server".into(),
        },
    ]
}

fn language_id(lang: &str) -> &str {
    match lang {
        "bash" => "shellscript",
        "cpp" => "cpp",
        other => other,
    }
}

// ── Internal server state ─────────────────────────────────────────────────────

struct LspServerState {
    language: String,
    command: String,
    status: String,
    /// Send raw JSON-RPC frame strings (already Content-Length-framed) to stdin.
    stdin_tx: mpsc::UnboundedSender<String>,
    /// Pending request waiters: id → oneshot sender of the result Value.
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>,
    /// Latest diagnostics per URI, refreshed on publishDiagnostics notifications.
    diagnostics: Arc<Mutex<HashMap<String, Vec<LspDiagnostic>>>>,
    /// Monotonic request ID counter.
    next_id: Arc<AtomicU64>,
    /// Abort handle for the stdout reader task.
    _reader_abort: tokio::task::AbortHandle,
}

impl LspServerState {}

// ── Public manager ────────────────────────────────────────────────────────────

pub struct LspManager {
    servers: HashMap<String, LspServerState>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            servers: HashMap::new(),
        }
    }

    pub fn server_list(&self) -> Vec<LspServerInfo> {
        self.servers
            .values()
            .map(|s| LspServerInfo {
                language: s.language.clone(),
                command: s.command.clone(),
                status: s.status.clone(),
            })
            .collect()
    }

    pub fn diagnostics_for(&self, uri: &str) -> Vec<LspDiagnostic> {
        for s in self.servers.values() {
            if let Ok(map) = s.diagnostics.lock() {
                if let Some(diags) = map.get(uri) {
                    return diags.clone();
                }
            }
        }
        vec![]
    }

    pub fn mark_status(&mut self, language: &str, status: &str) {
        if let Some(s) = self.servers.get_mut(language) {
            s.status = status.to_string();
        }
    }
}

// ── Spawn ─────────────────────────────────────────────────────────────────────

/// Spawn an LSP server for `language` and run the initialize handshake.
/// Returns immediately after handshake is dispatched; the "lsp:ready" event
/// fires when the initialize response arrives.
pub async fn spawn_server<E: EventEmitter>(
    manager: Arc<Mutex<LspManager>>,
    app: E,
    language: String,
    command: String,
    args: Vec<String>,
    workspace_root: String,
) -> Result<(), String> {
    // Kill any existing server for this language.
    {
        let mut mgr = manager.lock().unwrap_or_else(|e| e.into_inner());
        mgr.servers.remove(&language);
    }

    let mut child = Command::new(&command)
        .args(&args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Cannot spawn '{}': {}", command, e))?;

    let mut stdin = child.stdin.take().ok_or("no stdin")?;
    let stdout = child.stdout.take().ok_or("no stdout")?;

    let (stdin_tx, mut stdin_rx) = mpsc::unbounded_channel::<String>();
    let pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>> =
        Arc::new(Mutex::new(HashMap::new()));
    let diagnostics: Arc<Mutex<HashMap<String, Vec<LspDiagnostic>>>> =
        Arc::new(Mutex::new(HashMap::new()));
    let next_id = Arc::new(AtomicU64::new(1));

    // Writer task: drain the channel into child stdin.
    tokio::spawn(async move {
        while let Some(frame) = stdin_rx.recv().await {
            if stdin.write_all(frame.as_bytes()).await.is_err() {
                break;
            }
            let _ = stdin.flush().await;
        }
        drop(stdin);
        let _ = child.wait().await;
    });

    // Reader task: parse Content-Length frames from child stdout.
    let pending_r = pending.clone();
    let diagnostics_r = diagnostics.clone();
    let lang_r = language.clone();
    let app_r = app.clone();

    let reader_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);

        loop {
            // ── Parse headers ────────────────────────────────────────────
            let mut content_length: Option<usize> = None;
            loop {
                let mut line = String::new();
                match reader.read_line(&mut line).await {
                    Ok(0) | Err(_) => return, // EOF or error
                    _ => {}
                }
                let trimmed = line.trim_end_matches(['\r', '\n']);
                if trimmed.is_empty() {
                    break; // blank line = end of headers
                }
                if let Some(rest) = trimmed.strip_prefix("Content-Length: ") {
                    content_length = rest.trim().parse().ok();
                }
            }

            let len = match content_length {
                Some(l) if l > 0 => l,
                _ => continue,
            };

            // ── Read body ────────────────────────────────────────────────
            let mut buf = vec![0u8; len];
            if reader.read_exact(&mut buf).await.is_err() {
                break;
            }

            let msg: Value = match serde_json::from_slice(&buf) {
                Ok(v) => v,
                Err(_) => continue,
            };

            // ── Route ────────────────────────────────────────────────────
            let is_response = msg.get("id").is_some()
                && (msg.get("result").is_some() || msg.get("error").is_some());

            if is_response {
                if let Some(id) = msg["id"].as_u64() {
                    let result = msg
                        .get("result")
                        .cloned()
                        .unwrap_or(Value::Null);
                    let mut p = pending_r.lock().unwrap_or_else(|e| e.into_inner());
                    if let Some(tx) = p.remove(&id) {
                        let _ = tx.send(result);
                    }
                }
            } else if let Some(method) = msg.get("method").and_then(|v| v.as_str()) {
                match method {
                    "textDocument/publishDiagnostics" => {
                        if let Some(params) = msg.get("params") {
                            let uri = params["uri"]
                                .as_str()
                                .unwrap_or("")
                                .to_string();
                            let diags: Vec<LspDiagnostic> = params
                                .get("diagnostics")
                                .and_then(|v| serde_json::from_value(v.clone()).ok())
                                .unwrap_or_default();
                            diagnostics_r
                                .lock()
                                .unwrap_or_else(|e| e.into_inner())
                                .insert(uri.clone(), diags.clone());
                            let _ = app_r.emit(
                                "lsp:diagnostics",
                                json!({ "language": lang_r, "uri": uri, "diagnostics": diags }),
                            );
                        }
                    }
                    // Ignore window/logMessage, window/showMessage, etc.
                    _ => {}
                }
            }
        }
    });

    let state = LspServerState {
        language: language.clone(),
        command: command.clone(),
        status: "starting".to_string(),
        stdin_tx: stdin_tx.clone(),
        pending: pending.clone(),
        diagnostics: diagnostics.clone(),
        next_id: next_id.clone(),
        _reader_abort: reader_handle.abort_handle(),
    };

    manager.lock().unwrap_or_else(|e| e.into_inner()).servers.insert(language.clone(), state);

    // ── Initialize handshake ─────────────────────────────────────────────────
    let id = next_id.fetch_add(1, Ordering::SeqCst);
    let root_uri = {
        let p = workspace_root.replace('\\', "/");
        if p.starts_with('/') {
            format!("file://{}", p)
        } else {
            format!("file:///{}", p)
        }
    };

    let init_msg = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "initialize",
        "params": {
            "processId": std::process::id(),
            "rootUri": root_uri,
            "capabilities": {
                "textDocument": {
                    "completion": {
                        "completionItem": { "snippetSupport": false },
                        "completionItemKind": { "valueSet": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25] }
                    },
                    "hover": {
                        "contentFormat": ["plaintext", "markdown"]
                    },
                    "publishDiagnostics": {
                        "relatedInformation": false
                    },
                    "definition": { "linkSupport": false }
                },
                "workspace": { "workspaceFolders": true }
            },
            "workspaceFolders": [{ "uri": root_uri, "name": "workspace" }]
        }
    });

    let body = serde_json::to_string(&init_msg).map_err(|e| e.to_string())?;
    let frame = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);
    let (init_tx, init_rx) = oneshot::channel();
    pending.lock().unwrap_or_else(|e| e.into_inner()).insert(id, init_tx);
    stdin_tx.send(frame).map_err(|e| e.to_string())?;

    // Complete handshake asynchronously so this command returns quickly.
    let manager2 = manager.clone();
    let stdin_tx2 = stdin_tx.clone();
    let lang2 = language.clone();
    let app2 = app.clone();

    tokio::spawn(async move {
        match tokio::time::timeout(std::time::Duration::from_secs(20), init_rx).await {
            Ok(Ok(_)) => {
                // Send "initialized" notification.
                let notif = json!({ "jsonrpc": "2.0", "method": "initialized", "params": {} });
                match serde_json::to_string(&notif) {
                    Ok(body) => {
                        let frame = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);
                        let _ = stdin_tx2.send(frame);
                    }
                    Err(e) => {
                        manager2.lock().unwrap_or_else(|e| e.into_inner()).mark_status(&lang2, "error");
                        let _ = app2.emit("lsp:error", json!({ "language": lang2, "message": format!("Serialize error: {e}") }));
                        return;
                    }
                }
                manager2.lock().unwrap_or_else(|e| e.into_inner()).mark_status(&lang2, "ready");
                let _ = app2.emit("lsp:ready", json!({ "language": lang2 }));
            }
            _ => {
                manager2.lock().unwrap_or_else(|e| e.into_inner()).mark_status(&lang2, "error");
                let _ = app2.emit(
                    "lsp:error",
                    json!({ "language": lang2, "message": "Initialize timed out" }),
                );
            }
        }
    });

    Ok(())
}

// ── Helper: clone channels from locked manager ───────────────────────────────

fn take_channels(
    mgr: &LspManager,
    language: &str,
) -> Option<(
    mpsc::UnboundedSender<String>,
    Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>,
    Arc<AtomicU64>,
)> {
    mgr.servers.get(language).map(|s| {
        (s.stdin_tx.clone(), s.pending.clone(), s.next_id.clone())
    })
}

fn send_notification(
    stdin_tx: &mpsc::UnboundedSender<String>,
    method: &str,
    params: Value,
) -> Result<(), String> {
    let msg = json!({ "jsonrpc": "2.0", "method": method, "params": params });
    let body = serde_json::to_string(&msg).map_err(|e| e.to_string())?;
    let frame = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);
    stdin_tx.send(frame).map_err(|e| e.to_string())
}

async fn send_request(
    stdin_tx: mpsc::UnboundedSender<String>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>,
    next_id: Arc<AtomicU64>,
    method: &str,
    params: Value,
    timeout_secs: u64,
) -> Result<Value, String> {
    let id = next_id.fetch_add(1, Ordering::SeqCst);
    let msg = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });
    let body = serde_json::to_string(&msg).map_err(|e| e.to_string())?;
    let frame = format!("Content-Length: {}\r\n\r\n{}", body.len(), body);

    let (tx, rx) = oneshot::channel();
    pending.lock().unwrap_or_else(|e| e.into_inner()).insert(id, tx);
    stdin_tx.send(frame).map_err(|e| e.to_string())?;

    tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), rx)
        .await
        .map_err(|_| format!("{} request timed out", method))?
        .map_err(|_| "Response channel closed".to_string())
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Start (or restart) an LSP server for the given language.
#[tauri::command]
pub async fn lsp_start(
    language: String,
    command: String,
    args: Vec<String>,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
    app: AppHandle,
) -> Result<(), String> {
    let workspace = crate::user_config_dir().join("workspace");
    let root = workspace.to_string_lossy().to_string();
    let mgr = Arc::clone(&*state);
    spawn_server(mgr, app, language, command, args, root).await
}

/// Stop an LSP server for the given language.
#[tauri::command]
pub fn lsp_stop(
    language: String,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<(), String> {
    state.lock().unwrap_or_else(|e| e.into_inner()).servers.remove(&language);
    Ok(())
}

/// List all running LSP servers and their status.
#[tauri::command]
pub fn lsp_list(state: tauri::State<'_, Arc<Mutex<LspManager>>>) -> Vec<LspServerInfo> {
    state.lock().unwrap_or_else(|e| e.into_inner()).server_list()
}

/// Get cached diagnostics for a document URI.
#[tauri::command]
pub fn lsp_get_diagnostics(
    uri: String,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Vec<LspDiagnostic> {
    state.lock().unwrap_or_else(|e| e.into_inner()).diagnostics_for(&uri)
}

/// Notify server that a document was opened.
#[tauri::command]
pub async fn lsp_open_document(
    language: String,
    uri: String,
    content: String,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<(), String> {
    let channels = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;
    let lang_id = language_id(&language).to_string();
    send_notification(
        &channels.0,
        "textDocument/didOpen",
        json!({
            "textDocument": {
                "uri": uri,
                "languageId": lang_id,
                "version": 1,
                "text": content
            }
        }),
    )
}

/// Notify server that a document was closed.
#[tauri::command]
pub async fn lsp_close_document(
    language: String,
    uri: String,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<(), String> {
    let channels = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;
    send_notification(
        &channels.0,
        "textDocument/didClose",
        json!({ "textDocument": { "uri": uri } }),
    )
}

/// Notify server of document content change (full sync).
#[tauri::command]
pub async fn lsp_change_document(
    language: String,
    uri: String,
    content: String,
    version: u32,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<(), String> {
    let channels = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;
    send_notification(
        &channels.0,
        "textDocument/didChange",
        json!({
            "textDocument": { "uri": uri, "version": version },
            "contentChanges": [{ "text": content }]
        }),
    )
}

/// Request completions at a cursor position.
#[tauri::command]
pub async fn lsp_get_completions(
    language: String,
    uri: String,
    line: u32,
    character: u32,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<Vec<LspCompletionItem>, String> {
    let (stdin_tx, pending, next_id) = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;

    let result = send_request(
        stdin_tx,
        pending,
        next_id,
        "textDocument/completion",
        json!({
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }),
        5,
    )
    .await?;

    if result.is_null() {
        return Ok(vec![]);
    }

    let raw_items: Vec<Value> = if let Some(arr) = result.as_array() {
        arr.clone()
    } else if let Some(items) = result.get("items").and_then(|v| v.as_array()) {
        items.clone()
    } else {
        vec![]
    };

    let items = raw_items
        .iter()
        .take(60)
        .map(|v| LspCompletionItem {
            label: v["label"].as_str().unwrap_or("").to_string(),
            kind: v.get("kind").and_then(|k| k.as_u64()).map(|k| k as u32),
            detail: v
                .get("detail")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string()),
            insert_text: v
                .get("insertText")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string()),
        })
        .collect();

    Ok(items)
}

/// Request hover information at a position.
#[tauri::command]
pub async fn lsp_get_hover(
    language: String,
    uri: String,
    line: u32,
    character: u32,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<Option<LspHover>, String> {
    let (stdin_tx, pending, next_id) = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;

    let result = send_request(
        stdin_tx,
        pending,
        next_id,
        "textDocument/hover",
        json!({
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }),
        5,
    )
    .await?;

    if result.is_null() {
        return Ok(None);
    }

    let contents = if let Some(c) = result.get("contents") {
        if let Some(s) = c.as_str() {
            s.to_string()
        } else if let Some(v) = c.get("value").and_then(|v| v.as_str()) {
            v.to_string()
        } else if let Some(arr) = c.as_array() {
            arr.iter()
                .filter_map(|e| {
                    e.as_str()
                        .map(|s| s.to_string())
                        .or_else(|| e.get("value").and_then(|v| v.as_str()).map(|s| s.to_string()))
                })
                .collect::<Vec<_>>()
                .join("\n---\n")
        } else {
            c.to_string()
        }
    } else {
        return Ok(None);
    };

    let range = result
        .get("range")
        .and_then(|r| serde_json::from_value(r.clone()).ok());

    Ok(Some(LspHover { contents, range }))
}

/// Request go-to-definition locations.
#[tauri::command]
pub async fn lsp_get_definitions(
    language: String,
    uri: String,
    line: u32,
    character: u32,
    state: tauri::State<'_, Arc<Mutex<LspManager>>>,
) -> Result<Vec<LspLocation>, String> {
    let (stdin_tx, pending, next_id) = take_channels(&state.lock().unwrap_or_else(|e| e.into_inner()), &language)
        .ok_or_else(|| format!("LSP '{}' not running", language))?;

    let result = send_request(
        stdin_tx,
        pending,
        next_id,
        "textDocument/definition",
        json!({
            "textDocument": { "uri": uri },
            "position": { "line": line, "character": character }
        }),
        5,
    )
    .await?;

    if result.is_null() {
        return Ok(vec![]);
    }

    let locs: Vec<LspLocation> = if let Some(arr) = result.as_array() {
        arr.iter()
            .filter_map(|v| serde_json::from_value(v.clone()).ok())
            .collect()
    } else {
        serde_json::from_value(result).unwrap_or_default()
    };

    Ok(locs)
}

/// Return the catalog of well-known language servers.
#[tauri::command]
pub fn lsp_known_servers() -> Vec<KnownServer> {
    known_servers()
}
