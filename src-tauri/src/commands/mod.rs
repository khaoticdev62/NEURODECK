pub mod agent;
pub mod api_lab;
pub mod browser;
pub mod cli_maker;
pub mod config;
pub mod git;
pub mod ide;
pub mod session;
pub mod system;

pub use agent::*;
pub use api_lab::*;
pub use browser::*;
pub use cli_maker::*;
pub use config::*;
pub use git::*;
pub use ide::*;
pub use session::*;
pub use system::*;

use crate::bridge::ServerState;
use serde_json::Value;

/// Unified command dispatcher for bridge server (HTTP API).
/// Routes command names to their handlers and returns JSON results.
///
/// This is the core of bridge server mode. Commands are invoked via:
///   `POST /api/{command}` with JSON body as request/response
///   `GET /ws` for WebSocket streaming events (PTY output, LLM tokens, etc.)
///
/// Implementation Strategy:
/// - Simple commands return JSON directly
/// - Streaming commands emit events via `state.broadcaster` and return status
/// - All commands extract args from JSON, call handlers, return results
///
/// To add a command:
/// 1. Match on command name
/// 2. Extract JSON args with `args.get("param").and_then(...)`
/// 3. Call the command handler (may need adaptation for bridge mode)
/// 4. Emit WebSocket events via `state.broadcaster.emit("event", payload)` for streaming
/// 5. Return JSON result
pub async fn dispatch(state: ServerState, command: &str, _args: Value) -> Result<Value, String> {
    match command {
        // ────────────────────────────────────────────────────────────────────
        // System & Status
        // ────────────────────────────────────────────────────────────────────
        "health" => {
            Ok(serde_json::json!({
                "status": "ready",
                "version": "1.6.0-bastet",
                "mode": "bridge_server",
                "endpoint": "http://127.0.0.1:9477",
                "api_version": "1.0",
            }))
        }

        "get_system_info" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({
                "session_id": app_state.session_id,
                "provider": app_state.config.llm.default_provider,
                "model": if app_state.config.llm.default_provider == "gemini" {
                    app_state.config.llm.gemini_model.clone()
                } else {
                    app_state.config.llm.ollama_model.clone()
                },
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // PTY Terminal Management
        // ────────────────────────────────────────────────────────────────────
        // NOTE: Full PTY implementation requires Tauri AppHandle for event routing.
        // For bridge mode, PTY commands should be wired through a dedicated
        // WebSocket message handler rather than the HTTP /api/{command} endpoint.
        // This allows true bidirectional streaming of input/output.

        "pty_spawn" => {
            Err("PTY commands in bridge mode must use WebSocket. See GET /ws endpoint.".to_string())
        }
        "pty_write" => {
            Err("PTY commands in bridge mode must use WebSocket. See GET /ws endpoint.".to_string())
        }
        "pty_kill" => {
            Err("PTY commands in bridge mode must use WebSocket. See GET /ws endpoint.".to_string())
        }
        "pty_resize" => {
            Err("PTY commands in bridge mode must use WebSocket. See GET /ws endpoint.".to_string())
        }

        // ────────────────────────────────────────────────────────────────────
        // LLM & Chat Commands (NOT YET IMPLEMENTED)
        // ────────────────────────────────────────────────────────────────────
        // These require streaming implementation via WebSocket
        "send_command" => {
            Err("LLM commands require streaming via WebSocket. See GET /ws endpoint.".to_string())
        }
        "execute_command_stream" => {
            Err("Agent execution requires streaming via WebSocket. See GET /ws endpoint.".to_string())
        }

        // ────────────────────────────────────────────────────────────────────
        // Placeholder for all other commands (280+ remaining)
        // ────────────────────────────────────────────────────────────────────

        _ => Err(format!(
            "Command '{}' not yet implemented in bridge mode (295 total commands in NEURODECK). \n\
            To add support:\n\
            1. Open src-tauri/src/commands/mod.rs\n\
            2. Add a new match arm for '{}'\n\
            3. Extract JSON args with: args.get(\"key\").and_then(...)\n\
            4. Call the command handler and return JSON result\n\
            5. For streaming commands, emit events via: state.broadcaster.emit(\"event\", payload)",
            command, command
        )),
    }
}
