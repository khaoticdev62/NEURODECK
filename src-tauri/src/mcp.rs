//! NEURODECK MCP Server
//!
//! Implements the Model Context Protocol (MCP) over HTTP / JSON-RPC 2.0.
//! Listens on 127.0.0.1:{port} (default 13337).
//!
//! Supported JSON-RPC methods:
//!   initialize, initialized, ping, tools/list, tools/call
//!
//! Exposed tools:
//!   neurodeck_chat  — ask the active LLM and get a full response
//!   run_shell       — execute a shell command, return stdout+stderr
//!   run_code        — execute Python / Bash / JavaScript, return output
//!   read_file       — read a file from disk, return contents
//!   write_file      — write content to a file on disk
//!   get_status      — return provider, model, and version info

use std::process::Stdio;
use std::sync::Arc;

use serde::Deserialize;
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::llm::LlmProvider;

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

fn tool_list() -> Value {
    let mut tools = vec![
        json!({
            "name": "neurodeck_chat",
            "description": "Send a message to the NEURODECK AI and receive a full response. Uses the currently configured LLM provider (Gemini or Ollama).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The message or question to send to the AI."
                    },
                    "system_prompt": {
                        "type": "string",
                        "description": "Optional system prompt override. Defaults to helpful assistant."
                    }
                },
                "required": ["prompt"]
            }
        }),
    ];

    if mcp_exec_tools_enabled() {
        tools.push(json!({
            "name": "run_shell",
            "description": "Execute a shell command on the NEURODECK host system and return its combined stdout+stderr output.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to execute."
                    }
                },
                "required": ["command"]
            }
        }));
        tools.push(json!({
            "name": "run_code",
            "description": "Execute code in a specified language and return its output. Supported: python, bash, javascript.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "The code to execute."
                    },
                    "lang": {
                        "type": "string",
                        "enum": ["python", "bash", "javascript"],
                        "description": "The programming language."
                    }
                },
                "required": ["code", "lang"]
            }
        }));
    }

    tools.extend([
        json!({
            "name": "read_file",
            "description": "Read the text contents of a file on the NEURODECK host filesystem.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute or relative path to the file."
                    }
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
                    "path": {
                        "type": "string",
                        "description": "Absolute or relative path to write."
                    },
                    "content": {
                        "type": "string",
                        "description": "Text content to write."
                    }
                },
                "required": ["path", "content"]
            }
        }),
        json!({
            "name": "get_status",
            "description": "Get the current status of the running NEURODECK instance: AI provider, version info, and server uptime.",
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }),
    ]);

    json!({
        "tools": tools
    })
}

fn sanitize_mcp_path(path_str: &str) -> Result<std::path::PathBuf, String> {
    let base_dir = std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
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
    
    let canonical_base = base_dir.canonicalize()
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
) -> Result<Value, String> {
    match name {
        "neurodeck_chat" => {
            let prompt = args["prompt"].as_str().ok_or("Missing required arg: 'prompt'")?;
            let system = args["system_prompt"]
                .as_str()
                .unwrap_or("You are a helpful assistant.");
            let response = provider
                .chat_with_image(prompt, system, None, None)
                .await?;
            Ok(json!({
                "content": [{ "type": "text", "text": response }]
            }))
        }

        "run_shell" => {
            if !mcp_exec_tools_enabled() {
                return Err("MCP execution tools are disabled. Set NEURODECK_ENABLE_MCP_EXEC=true to enable run_shell.".to_string());
            }
            let cmd_str = args["command"].as_str().ok_or("Missing required arg: 'command'")?;
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

            Ok(json!({
                "content": [{ "type": "text", "text": output }]
            }))
        }

        "run_code" => {
            if !mcp_exec_tools_enabled() {
                return Err("MCP execution tools are disabled. Set NEURODECK_ENABLE_MCP_EXEC=true to enable run_code.".to_string());
            }
            let code = args["code"].as_str().ok_or("Missing required arg: 'code'")?;
            let lang = args["lang"].as_str().ok_or("Missing required arg: 'lang'")?;

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

            Ok(json!({
                "content": [{ "type": "text", "text": output }]
            }))
        }

        "read_file" => {
            let path_str = args["path"].as_str().ok_or("Missing required arg: 'path'")?;
            let safe_path = sanitize_mcp_path(path_str)?;
            let content = std::fs::read_to_string(safe_path)
                .map_err(|e| format!("Cannot read '{}': {}", path_str, e))?;
            Ok(json!({
                "content": [{ "type": "text", "text": content }]
            }))
        }

        "write_file" => {
            let path_str = args["path"].as_str().ok_or("Missing required arg: 'path'")?;
            let content = args["content"].as_str().ok_or("Missing required arg: 'content'")?;
            let safe_path = sanitize_mcp_path(path_str)?;
            // Create parent dirs if needed
            if let Some(parent) = safe_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            std::fs::write(safe_path, content)
                .map_err(|e| format!("Cannot write '{}': {}", path_str, e))?;
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!("Wrote {} bytes to '{}'.", content.len(), path_str)
                }]
            }))
        }

        "get_status" => {
            let provider_name = if std::env::var("GEMINI_API_KEY").is_ok() {
                "Gemini"
            } else {
                "Ollama (local)"
            };
            Ok(json!({
                "content": [{
                    "type": "text",
                    "text": format!(
                        "NEURODECK MCP Server v1.0.0\nAI Provider: {}\nTools available: 6\nStatus: Online",
                        provider_name
                    )
                }]
            }))
        }

        unknown => Err(format!("Unknown tool: '{}'", unknown)),
    }
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

async fn handle_connection(mut stream: tokio::net::TcpStream, provider: Arc<dyn LlmProvider>, token: Arc<String>) {
    let mut buf = vec![0u8; 131_072]; // 128 KiB — enough for any reasonable tool call
    let n = match stream.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let raw = String::from_utf8_lossy(&buf[..n]);

    // Locate end of HTTP headers
    let body_start = match raw.find("\r\n\r\n") {
        Some(i) => i + 4,
        None => return,
    };
    let header_section = &raw[..body_start];
    let body_str = raw[body_start..].trim_end_matches('\0');

    // CORS preflight — respond without wildcard Access-Control-Allow-Origin headers to block browser execution
    if header_section.starts_with("OPTIONS ") {
        let _ = stream
            .write_all(
                b"HTTP/1.1 200 OK\r\n\
                  Access-Control-Allow-Methods: POST, OPTIONS\r\n\
                  Access-Control-Allow-Headers: Content-Type, Authorization\r\n\
                  Content-Length: 0\r\n\r\n",
            )
            .await;
        return;
    }

    // Validate Bearer token — reject all non-preflight requests missing or with wrong auth
    let expected_auth = format!("Bearer {}", token);
    let provided_auth = extract_header_value(header_section, "authorization").unwrap_or("");
    if provided_auth != expected_auth {
        let _ = stream
            .write_all(b"HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Bearer realm=\"neurodeck-mcp\"\r\nContent-Length: 0\r\n\r\n")
            .await;
        return;
    }

    // Only POST accepted for RPC
    if !header_section.starts_with("POST ") {
        let _ = stream
            .write_all(b"HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n")
            .await;
        return;
    }

    // Parse JSON-RPC 2.0 request
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
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "neurodeck", "version": "1.0.0" }
            }),
        ),
        "initialized" | "notifications/initialized" => {
            // Client notification — acknowledge with empty result
            rpc_ok(&req.id, json!({}))
        }
        "ping" => rpc_ok(&req.id, json!({})),
        "tools/list" => rpc_ok(&req.id, tool_list()),
        "tools/call" => {
            let name = req.params["name"].as_str().unwrap_or("");
            let args = &req.params["arguments"];
            match call_tool(name, args, provider).await {
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
        _ => rpc_err(&req.id, -32601, "Method not found"),
    };

    send_response(&mut stream, &response).await;
}

async fn send_response(stream: &mut tokio::net::TcpStream, body: &Value) {
    let body_str = body.to_string();
    let http = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: application/json\r\n\
         Content-Length: {}\r\n\
         \r\n\
         {}",
        body_str.len(),
        body_str
    );
    let _ = stream.write_all(http.as_bytes()).await;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/// Start the MCP HTTP server on `127.0.0.1:{port}`.
///
/// Returns `(actual_port, abort_handle, session_token)`.
/// All non-preflight requests must include `Authorization: Bearer <session_token>`.
pub async fn start(
    port: u16,
    provider: Arc<dyn LlmProvider>,
) -> Result<(u16, tokio::task::AbortHandle, String), String> {
    use rand::distributions::Alphanumeric;
    use rand::{thread_rng, Rng};
    let token: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    let token_arc = Arc::new(token.clone());

    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("MCP server bind failed on {}: {}", addr, e))?;

    let bound_port = listener
        .local_addr()
        .map(|a| a.port())
        .unwrap_or(port);

    let task = tokio::spawn(async move {
        while let Ok((stream, _peer)) = listener.accept().await {
            let prov = provider.clone();
            let tok = token_arc.clone();
            tokio::spawn(handle_connection(stream, prov, tok));
        }
    });

    let abort_handle = task.abort_handle();
    Ok((bound_port, abort_handle, token))
}
