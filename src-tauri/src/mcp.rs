//! NEURODECK MCP Server
//!
//! Implements the Model Context Protocol 2024-11 over HTTP / JSON-RPC 2.0.
//! Listens on 127.0.0.1:{port} (default 13337).
//!
//! Supported JSON-RPC methods:
//!   initialize, initialized, ping,
//!   tools/list, tools/call,
//!   resources/list, resources/read,
//!   prompts/list
//!
//! HTTP extras:
//!   GET /.well-known/mcp   → server discovery metadata
//!
//! Tool whitelist is user-configurable. Default safe set:
//!   neurodeck_chat, get_status, memory_add_fact, memory_list_all

use std::process::Stdio;
use std::sync::Arc;

use serde::Deserialize;
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::llm::LlmProvider;

// ──────────────────────────────────────────────
// Server configuration
// ──────────────────────────────────────────────

/// All tools that can appear in the whitelist (for Settings UI enumeration).
#[allow(dead_code)]
pub const ALL_TOOLS: &[&str] = &[
    "neurodeck_chat",
    "get_status",
    "memory_add_fact",
    "memory_list_all",
    "read_file",
    "write_file",
    "run_shell",
    "run_code",
];

/// Default whitelisted tools (safe, no file/exec access).
pub fn default_tool_whitelist() -> Vec<String> {
    vec![
        "neurodeck_chat".into(),
        "get_status".into(),
        "memory_add_fact".into(),
        "memory_list_all".into(),
    ]
}

/// Configuration passed into the MCP server at start time.
pub struct McpServerConfig {
    pub provider: Arc<dyn LlmProvider>,
    pub tool_whitelist: Vec<String>,
    pub mem_db: Option<crate::memory::MemoryDB>,
    pub port: u16,
}

// ──────────────────────────────────────────────
// JSON-RPC 2.0 helpers
// ──────────────────────────────────────────────

#[derive(Deserialize)]
struct RpcRequest {
    #[serde(default)]
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

fn rpc_ok(id: &Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn rpc_err(id: &Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

fn env_flag_enabled(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

fn mcp_exec_tools_enabled() -> bool {
    std::env::var("NEURODECK_ENABLE_MCP_EXEC")
        .map(|value| env_flag_enabled(&value))
        .unwrap_or(false)
}

// ──────────────────────────────────────────────
// Tool definitions (MCP schema)
// ──────────────────────────────────────────────

fn build_tool_list(whitelist: &[String]) -> Value {
    let all_tools = vec![
        json!({
            "name": "neurodeck_chat",
            "description": "Send a message to the NEURODECK AI and receive a full response. Uses the currently configured LLM provider (Gemini or Ollama).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": { "type": "string", "description": "The message or question to send to the AI." },
                    "system_prompt": { "type": "string", "description": "Optional system prompt override." }
                },
                "required": ["prompt"]
            }
        }),
        json!({
            "name": "get_status",
            "description": "Get the current status of the running NEURODECK instance: AI provider, version info, and server uptime.",
            "inputSchema": { "type": "object", "properties": {}, "required": [] }
        }),
        json!({
            "name": "memory_add_fact",
            "description": "Persist a pinned fact or note into NEURODECK's long-term vector memory. The fact will be recalled in future AI sessions.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "content": { "type": "string", "description": "The fact or note to store." }
                },
                "required": ["content"]
            }
        }),
        json!({
            "name": "memory_list_all",
            "description": "Return all records in NEURODECK's long-term memory as formatted text.",
            "inputSchema": { "type": "object", "properties": {}, "required": [] }
        }),
        json!({
            "name": "read_file",
            "description": "Read the text contents of a file on the NEURODECK host filesystem.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute or relative path to the file." }
                },
                "required": ["path"]
            }
        }),
        json!({
            "name": "write_file",
            "description": "Write text content to a file on the NEURODECK host filesystem. Creates the file if it does not exist.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute or relative path to write." },
                    "content": { "type": "string", "description": "Text content to write." }
                },
                "required": ["path", "content"]
            }
        }),
        json!({
            "name": "run_shell",
            "description": "Execute a shell command on the NEURODECK host system and return its combined stdout+stderr output. Requires NEURODECK_ENABLE_MCP_EXEC=true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "The shell command to execute." }
                },
                "required": ["command"]
            }
        }),
        json!({
            "name": "run_code",
            "description": "Execute code in a specified language and return its output. Supported: python, bash, javascript. Requires NEURODECK_ENABLE_MCP_EXEC=true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "code": { "type": "string", "description": "The code to execute." },
                    "lang": { "type": "string", "enum": ["python", "bash", "javascript"], "description": "The programming language." }
                },
                "required": ["code", "lang"]
            }
        }),
    ];

    let visible: Vec<Value> = all_tools
        .into_iter()
        .filter(|t| {
            let name = t["name"].as_str().unwrap_or("");
            whitelist.iter().any(|w| w == name)
        })
        .collect();

    json!({ "tools": visible })
}

fn sanitize_mcp_path(path_str: &str) -> Result<std::path::PathBuf, String> {
    let base_dir =
        std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    let target_path = std::path::Path::new(path_str);

    let absolute_path = if target_path.is_absolute() {
        target_path.to_path_buf()
    } else {
        base_dir.join(target_path)
    };

    let canonical_path = match absolute_path.canonicalize() {
        Ok(p) => p,
        Err(_) => {
            if let Some(parent) = absolute_path.parent() {
                match parent.canonicalize() {
                    Ok(p_can) => {
                        let file_name = absolute_path.file_name().ok_or("Invalid filename")?;
                        p_can.join(file_name)
                    }
                    Err(e) => return Err(format!("Invalid path directory: {}", e)),
                }
            } else {
                return Err("Invalid path: no parent directory".to_string());
            }
        }
    };

    let canonical_base = base_dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize current directory: {}", e))?;

    if canonical_path.starts_with(&canonical_base) {
        Ok(canonical_path)
    } else {
        Err("Access denied: path escapes S-Term sandbox".to_string())
    }
}

// ──────────────────────────────────────────────
// Tool dispatch
// ──────────────────────────────────────────────

async fn call_tool(
    name: &str,
    args: &Value,
    provider: Arc<dyn LlmProvider>,
    whitelist: &[String],
    mem_db: &Option<crate::memory::MemoryDB>,
) -> Result<Value, String> {
    // Enforce whitelist before dispatch
    if !whitelist.iter().any(|w| w == name) {
        return Err(format!(
            "Tool '{}' is not enabled on this server. Enabled tools: {}",
            name,
            whitelist.join(", ")
        ));
    }

    match name {
        "neurodeck_chat" => {
            let prompt = args["prompt"]
                .as_str()
                .ok_or("Missing required arg: 'prompt'")?;
            let system = args["system_prompt"]
                .as_str()
                .unwrap_or("You are a helpful assistant.");
            let response = provider.chat_with_image(prompt, system, None, None).await?;
            Ok(json!({ "content": [{ "type": "text", "text": response }] }))
        }

        "get_status" => Ok(json!({
            "content": [{
                "type": "text",
                "text": format!(
                    "NEURODECK MCP Server v1.5.0 (Horus)\nProtocol: MCP 2024-11\nEnabled tools: {}\nStatus: Online",
                    whitelist.join(", ")
                )
            }]
        })),

        "memory_add_fact" => {
            let content = args["content"]
                .as_str()
                .ok_or("Missing required arg: 'content'")?;
            if content.trim().is_empty() {
                return Err("Fact content cannot be empty".into());
            }
            let db = mem_db
                .as_ref()
                .ok_or("Memory database not available in this MCP session")?;
            let id = format!("fact-{}", chrono::Utc::now().format("%Y%m%d%H%M%S%3f"));
            db.add_fact(id.clone(), content.to_string())?;
            Ok(json!({
                "content": [{ "type": "text", "text": format!("Fact stored with ID: {}", id) }]
            }))
        }

        "memory_list_all" => {
            let db = mem_db
                .as_ref()
                .ok_or("Memory database not available in this MCP session")?;
            let records = db.list_all()?;
            if records.is_empty() {
                return Ok(json!({
                    "content": [{ "type": "text", "text": "No memory records found." }]
                }));
            }
            let lines: Vec<String> = records
                .iter()
                .enumerate()
                .map(|(i, r)| {
                    let role = r.metadata.get("role").map(|s| s.as_str()).unwrap_or("msg");
                    let pinned = r
                        .metadata
                        .get("pinned")
                        .map(|s| s == "true")
                        .unwrap_or(false);
                    format!(
                        "[{}] {} ({}{}) — {}",
                        i + 1,
                        &r.id,
                        role,
                        if pinned { ", pinned" } else { "" },
                        r.content.chars().take(200).collect::<String>()
                    )
                })
                .collect();
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("{} memory records:\n\n{}", records.len(), lines.join("\n"))
                }]
            }))
        }

        "run_shell" => {
            if !mcp_exec_tools_enabled() {
                return Err("MCP execution tools are disabled. Set NEURODECK_ENABLE_MCP_EXEC=true to enable run_shell.".to_string());
            }
            let cmd_str = args["command"]
                .as_str()
                .ok_or("Missing required arg: 'command'")?;
            crate::security::validate_script_payload(cmd_str, "bash", "mcp-run-shell", None)?;
            let cmd_owned = cmd_str.to_string();
            let output = tokio::task::spawn_blocking(move || {
                let mut c = if cfg!(target_os = "windows") {
                    let mut c = std::process::Command::new("cmd.exe");
                    c.arg("/c").arg(&cmd_owned);
                    c
                } else {
                    let mut c = std::process::Command::new("sh");
                    c.arg("-c").arg(&cmd_owned);
                    c
                };
                c.stdout(Stdio::piped()).stderr(Stdio::piped());
                match c.output() {
                    Ok(out) => {
                        let combined = [out.stdout, out.stderr].concat();
                        String::from_utf8_lossy(&combined).into_owned()
                    }
                    Err(e) => format!("Error spawning process: {}", e),
                }
            })
            .await
            .map_err(|e| format!("Thread join error: {}", e))?;

            Ok(json!({ "content": [{ "type": "text", "text": output }] }))
        }

        "run_code" => {
            if !mcp_exec_tools_enabled() {
                return Err("MCP execution tools are disabled. Set NEURODECK_ENABLE_MCP_EXEC=true to enable run_code.".to_string());
            }
            let code = args["code"]
                .as_str()
                .ok_or("Missing required arg: 'code'")?;
            let lang = args["lang"]
                .as_str()
                .ok_or("Missing required arg: 'lang'")?;
            crate::security::validate_script_payload(code, lang, "mcp-run-code", None)?;

            let (program, prog_args): (&str, Vec<&str>) = match lang.to_lowercase().as_str() {
                "python" | "python3" => {
                    if cfg!(target_os = "windows") {
                        ("python", vec!["-c", code])
                    } else {
                        ("python3", vec!["-c", code])
                    }
                }
                "bash" | "sh" => {
                    if cfg!(target_os = "windows") {
                        ("powershell", vec!["-Command", code])
                    } else {
                        ("bash", vec!["-c", code])
                    }
                }
                "javascript" | "js" | "node" => ("node", vec!["-e", code]),
                other => return Err(format!("Unsupported language: {}", other)),
            };

            let prog_owned = program.to_string();
            let args_owned: Vec<String> = prog_args.iter().map(|s| s.to_string()).collect();

            let result = tokio::time::timeout(
                std::time::Duration::from_secs(30),
                tokio::task::spawn_blocking(move || {
                    match std::process::Command::new(&prog_owned)
                        .args(args_owned.iter().map(|s| s.as_str()).collect::<Vec<_>>())
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .output()
                    {
                        Ok(out) => {
                            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                            let mut combined = stdout;
                            if !stderr.is_empty() {
                                if !combined.is_empty() {
                                    combined.push('\n');
                                }
                                combined.push_str("[stderr]\n");
                                combined.push_str(&stderr);
                            }
                            if combined.is_empty() {
                                combined = "(no output)".to_string();
                            }
                            combined
                        }
                        Err(e) => format!("Failed to spawn '{}': {}", prog_owned, e),
                    }
                }),
            )
            .await;

            let output = match result {
                Ok(Ok(s)) => s,
                Ok(Err(e)) => format!("Thread panic: {}", e),
                Err(_) => "Execution timed out (30s limit)".to_string(),
            };

            Ok(json!({ "content": [{ "type": "text", "text": output }] }))
        }

        "read_file" => {
            let path_str = args["path"]
                .as_str()
                .ok_or("Missing required arg: 'path'")?;
            let safe_path = sanitize_mcp_path(path_str)?;
            let content = std::fs::read_to_string(safe_path).map_err(|e| {
                format!(
                    "Cannot read '{}': {}",
                    path_str,
                    crate::security::sanitize_error_for_frontend(&e.to_string())
                )
            })?;
            Ok(json!({ "content": [{ "type": "text", "text": content }] }))
        }

        "write_file" => {
            let path_str = args["path"]
                .as_str()
                .ok_or("Missing required arg: 'path'")?;
            let content = args["content"]
                .as_str()
                .ok_or("Missing required arg: 'content'")?;
            let safe_path = sanitize_mcp_path(path_str)?;
            if let Some(parent) = safe_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            std::fs::write(safe_path, content).map_err(|e| {
                format!(
                    "Cannot write '{}': {}",
                    path_str,
                    crate::security::sanitize_error_for_frontend(&e.to_string())
                )
            })?;
            Ok(json!({
                "content": [{ "type": "text", "text": format!("Wrote {} bytes to '{}'.", content.len(), path_str) }]
            }))
        }

        unknown => Err(format!("Unknown tool: '{}'", unknown)),
    }
}

// ──────────────────────────────────────────────
// Resources
// ──────────────────────────────────────────────

fn resources_list(mem_db: &Option<crate::memory::MemoryDB>) -> Value {
    let mut resources = vec![
        json!({
            "uri": "neurodeck://status",
            "name": "NEURODECK Status",
            "description": "Current system status, version, and capabilities.",
            "mimeType": "text/plain"
        }),
        json!({
            "uri": "neurodeck://plugins",
            "name": "Plugin Registry",
            "description": "List of loaded Lua plugins.",
            "mimeType": "application/json"
        }),
    ];

    if mem_db.is_some() {
        resources.push(json!({
            "uri": "neurodeck://memory",
            "name": "Memory Records",
            "description": "All records in NEURODECK long-term vector memory.",
            "mimeType": "application/json"
        }));
    }

    json!({ "resources": resources })
}

fn resources_read(uri: &str, mem_db: &Option<crate::memory::MemoryDB>) -> Result<Value, String> {
    match uri {
        "neurodeck://status" => Ok(json!({
            "contents": [{
                "uri": uri,
                "mimeType": "text/plain",
                "text": format!("NEURODECK v1.5.0 (Horus)\nMCP Protocol: 2024-11\nStatus: Online")
            }]
        })),
        "neurodeck://memory" => {
            let db = mem_db.as_ref().ok_or("Memory not available")?;
            let records = db.list_all()?;
            Ok(json!({
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": serde_json::to_string_pretty(&records).unwrap_or_default()
                }]
            }))
        }
        "neurodeck://plugins" => {
            let plugins_dir = std::path::PathBuf::from("./plugins");
            let names: Vec<String> = std::fs::read_dir(&plugins_dir)
                .into_iter()
                .flatten()
                .flatten()
                .filter(|e| e.path().extension().map(|x| x == "lua").unwrap_or(false))
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .collect();
            Ok(json!({
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": serde_json::to_string_pretty(&names).unwrap_or_default()
                }]
            }))
        }
        other => Err(format!("Unknown resource URI: '{}'", other)),
    }
}

// ──────────────────────────────────────────────
// Prompts
// ──────────────────────────────────────────────

fn prompts_list() -> Value {
    let path = crate::user_config_dir().join("data/prompt_presets.json");
    let presets: std::collections::HashMap<String, String> = path
        .exists()
        .then(|| std::fs::read_to_string(&path).ok())
        .flatten()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let prompts: Vec<Value> = presets
        .iter()
        .map(|(name, schema_json)| {
            // Presets are stored as JSON strings of {name, description, steps, ...}
            // We surface just the name and a description for MCP clients
            let desc = serde_json::from_str::<Value>(schema_json)
                .ok()
                .and_then(|v| {
                    v.get("description")
                        .or_else(|| v.get("system_prompt"))
                        .and_then(|d| d.as_str())
                        .map(|s| s.chars().take(120).collect::<String>())
                })
                .unwrap_or_else(|| "Saved prompt preset".into());
            json!({
                "name": name,
                "description": desc,
                "arguments": []
            })
        })
        .collect();

    json!({ "prompts": prompts })
}

// ──────────────────────────────────────────────
// Discovery endpoint body
// ──────────────────────────────────────────────

fn well_known_mcp_body(port: u16) -> String {
    serde_json::json!({
        "name": "NEURODECK",
        "version": "1.5.0",
        "protocolVersion": "2024-11-05",
        "description": "NEURODECK AI Terminal — MCP server for LLM chat, memory, and file access.",
        "endpoint": format!("http://127.0.0.1:{}/", port),
        "capabilities": {
            "tools": true,
            "resources": true,
            "prompts": true
        },
        "auth": {
            "type": "bearer",
            "header": "Authorization"
        }
    })
    .to_string()
}

// ──────────────────────────────────────────────
// Per-connection HTTP handler
// ──────────────────────────────────────────────

fn extract_header_value<'a>(headers: &'a str, name: &str) -> Option<&'a str> {
    let needle = format!("\r\n{}:", name.to_lowercase());
    let headers_lower = headers.to_lowercase();
    let pos = headers_lower.find(&needle)?;
    let value_start = pos + needle.len();
    let rest = &headers[value_start..];
    let end = rest.find("\r\n").unwrap_or(rest.len());
    Some(rest[..end].trim())
}

fn extract_request_line(raw: &str) -> (&str, &str) {
    let line = raw.lines().next().unwrap_or("");
    let mut parts = line.splitn(3, ' ');
    let method = parts.next().unwrap_or("GET");
    let path = parts.next().unwrap_or("/");
    (method, path)
}

async fn handle_connection(
    mut stream: tokio::net::TcpStream,
    provider: Arc<dyn LlmProvider>,
    token: Arc<String>,
    whitelist: Arc<Vec<String>>,
    mem_db: Arc<Option<crate::memory::MemoryDB>>,
    port: u16,
) {
    let mut buf = vec![0u8; 131_072]; // 128 KiB — enough for any reasonable tool call
    let n = match stream.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let raw = String::from_utf8_lossy(&buf[..n]);
    let body_start = match raw.find("\r\n\r\n") {
        Some(i) => i + 4,
        None => return,
    };
    let header_section = &raw[..body_start];
    let body_str = raw[body_start..].trim_end_matches('\0');

    let (method, path) = extract_request_line(raw.as_ref());

    // ── Discovery endpoint (no auth required) ────────────────────────────
    if method == "GET" && path == "/.well-known/mcp" {
        let body = well_known_mcp_body(port);
        let resp = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
            body.len(),
            body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // ── CORS preflight ───────────────────────────────────────────────────
    if method == "OPTIONS" {
        let _ = stream
            .write_all(
                b"HTTP/1.1 200 OK\r\n\
                  Access-Control-Allow-Methods: POST, OPTIONS, GET\r\n\
                  Access-Control-Allow-Headers: Content-Type, Authorization\r\n\
                  Content-Length: 0\r\n\r\n",
            )
            .await;
        return;
    }

    // ── Bearer token validation ──────────────────────────────────────────
    let expected_auth = format!("Bearer {}", token);
    let provided_auth = extract_header_value(header_section, "authorization").unwrap_or("");
    let auth_ok = provided_auth.len() == expected_auth.len()
        && subtle::ConstantTimeEq::ct_eq(provided_auth.as_bytes(), expected_auth.as_bytes()).into();
    if !auth_ok {
        let _ = stream
            .write_all(b"HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Bearer realm=\"neurodeck-mcp\"\r\nContent-Length: 0\r\n\r\n")
            .await;
        return;
    }

    // ── Only POST for RPC ────────────────────────────────────────────────
    if method != "POST" {
        let _ = stream
            .write_all(b"HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n")
            .await;
        return;
    }

    let req: RpcRequest = match serde_json::from_str(body_str) {
        Ok(r) => r,
        Err(e) => {
            let resp = rpc_err(&json!(null), -32700, &format!("Parse error: {}", e));
            send_response(&mut stream, &resp).await;
            return;
        }
    };

    let response = match req.method.as_str() {
        "initialize" => rpc_ok(
            &req.id,
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {}, "resources": {}, "prompts": {} },
                "serverInfo": { "name": "neurodeck", "version": "1.5.0" }
            }),
        ),
        "initialized" | "notifications/initialized" => rpc_ok(&req.id, json!({})),
        "ping" => rpc_ok(&req.id, json!({})),

        "tools/list" => rpc_ok(&req.id, build_tool_list(&whitelist)),

        "tools/call" => {
            let name = req.params["name"].as_str().unwrap_or("");
            let args = &req.params["arguments"];
            match call_tool(name, args, provider, &whitelist, &mem_db).await {
                Ok(result) => rpc_ok(&req.id, result),
                Err(e) => rpc_ok(
                    &req.id,
                    json!({
                        "content": [{ "type": "text", "text": format!("Tool error: {}", e) }],
                        "isError": true
                    }),
                ),
            }
        }

        "resources/list" => rpc_ok(&req.id, resources_list(&mem_db)),

        "resources/read" => {
            let uri = req.params["uri"].as_str().unwrap_or("");
            match resources_read(uri, &mem_db) {
                Ok(result) => rpc_ok(&req.id, result),
                Err(e) => rpc_err(&req.id, -32602, &e),
            }
        }

        "prompts/list" => rpc_ok(&req.id, prompts_list()),

        _ => rpc_err(&req.id, -32601, "Method not found"),
    };

    send_response(&mut stream, &response).await;
}

async fn send_response(stream: &mut tokio::net::TcpStream, body: &Value) {
    let body_str = body.to_string();
    let http = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
        body_str.len(),
        body_str
    );
    let _ = stream.write_all(http.as_bytes()).await;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/// Start the MCP HTTP server on `127.0.0.1:{port}`.
/// Returns `(actual_port, abort_handle, session_token)`.
pub async fn start(
    config: McpServerConfig,
) -> Result<(u16, tokio::task::AbortHandle, String), String> {
    use rand::distributions::Alphanumeric;
    use rand::{thread_rng, Rng};
    let token: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    let token_arc = Arc::new(token.clone());
    let whitelist_arc = Arc::new(config.tool_whitelist);
    let mem_db_arc = Arc::new(config.mem_db);
    let provider = config.provider;

    let addr = format!("127.0.0.1:{}", config.port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("MCP server bind failed on {}: {}", addr, e))?;

    let bound_port = listener
        .local_addr()
        .map(|a| a.port())
        .unwrap_or(config.port);

    let task = tokio::spawn(async move {
        while let Ok((stream, _peer)) = listener.accept().await {
            let prov = provider.clone();
            let tok = token_arc.clone();
            let wl = whitelist_arc.clone();
            let db = mem_db_arc.clone();
            let p = bound_port;
            tokio::spawn(handle_connection(stream, prov, tok, wl, db, p));
        }
    });

    let abort_handle = task.abort_handle();
    Ok((bound_port, abort_handle, token))
}

#[cfg(test)]
mod tests {
    use super::env_flag_enabled;

    #[test]
    fn env_flag_enabled_accepts_common_truthy_values() {
        for value in ["1", "true", "TRUE", "yes", "on", " On "] {
            assert!(env_flag_enabled(value), "expected '{value}' to be truthy");
        }
    }

    #[test]
    fn env_flag_enabled_rejects_other_values() {
        for value in ["0", "false", "no", "off", "", "maybe"] {
            assert!(!env_flag_enabled(value), "expected '{value}' to be falsy");
        }
    }
}
