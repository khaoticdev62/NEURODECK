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
pub async fn dispatch(state: ServerState, command: &str, args: Value) -> Result<Value, String> {
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
        // Chat & Session Management
        // ────────────────────────────────────────────────────────────────────
        "get_initial_state" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let memory_count = app_state.mem_db.as_ref()
                .and_then(|db| db.export_all_records().ok().map(|r| r.len()))
                .unwrap_or(0);

            Ok(serde_json::json!({
                "session_id": app_state.session_id,
                "persona": app_state.active_persona,
                "messages": app_state.messages,
                "memory_count": memory_count,
                "provider": app_state.config.llm.default_provider,
                "model": if app_state.config.llm.default_provider == "gemini" {
                    app_state.config.llm.gemini_model.clone()
                } else {
                    app_state.config.llm.ollama_model.clone()
                },
            }))
        }

        "list_sessions" => {
            let sessions_dir = crate::user_config_dir().join("sessions");
            let mut session_list = Vec::new();

            if let Ok(entries) = std::fs::read_dir(&sessions_dir) {
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_file() {
                            if let Some(name) = entry.file_name().to_str() {
                                if name.ends_with(".json") {
                                    let id = name.trim_end_matches(".json").to_string();
                                    session_list.push(serde_json::json!({
                                        "id": id,
                                        "size": metadata.len(),
                                    }));
                                }
                            }
                        }
                    }
                }
            }

            Ok(serde_json::json!({
                "sessions": session_list,
                "count": session_list.len(),
            }))
        }

        "save_session" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let session = crate::storage::Session {
                id: app_state.session_id.clone(),
                created_at: chrono::Utc::now(),
                messages: app_state.messages.clone(),
                name: None,
            };

            crate::storage::save_session(crate::user_config_dir().join("sessions"), &session)
                .map_err(|e| format!("Failed to save session: {}", e))?;

            Ok(serde_json::json!({
                "status": "saved",
                "session_id": session.id,
            }))
        }

        "load_session" => {
            let session_id = args.get("session_id").and_then(|v| v.as_str())
                .ok_or("Missing 'session_id'")?;

            let path = crate::user_config_dir()
                .join("sessions")
                .join(format!("{}.json", session_id));

            if !path.exists() {
                return Err(format!("Session '{}' not found", session_id));
            }

            let session = crate::storage::load_session(&path)
                .map_err(|e| format!("Failed to load session: {}", e))?;

            Ok(serde_json::json!({
                "id": session.id,
                "created_at": session.created_at.to_rfc3339(),
                "message_count": session.messages.len(),
                "name": session.name,
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Configuration Management
        // ────────────────────────────────────────────────────────────────────
        "get_config" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({
                "llm": {
                    "provider": app_state.config.llm.default_provider,
                    "gemini_model": app_state.config.llm.gemini_model,
                    "ollama_model": app_state.config.llm.ollama_model,
                    "ollama_base_url": app_state.config.llm.ollama_base_url,
                },
                "stt": {
                    "whisper_enabled": !app_state.config.stt.whisper_binary.is_empty(),
                },
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Persona Management
        // ────────────────────────────────────────────────────────────────────
        "get_personas" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut persona_names = vec!["Default".to_string(), "Developer".to_string()];

            for persona in &app_state.custom_personas {
                persona_names.push(persona.name.clone());
            }

            Ok(serde_json::json!({
                "personas": persona_names,
                "count": persona_names.len(),
            }))
        }

        "set_persona" => {
            let name = args.get("name").and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app_state.active_persona = name.to_string();

            Ok(serde_json::json!({
                "status": "ok",
                "persona": name,
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // PTY Terminal Management
        // ────────────────────────────────────────────────────────────────────
        "pty_spawn" | "pty_write" | "pty_kill" | "pty_resize" => {
            Err("PTY commands in bridge mode must use WebSocket. See GET /ws endpoint.".to_string())
        }

        // ────────────────────────────────────────────────────────────────────
        // LLM & Chat Commands (Streaming)
        // ────────────────────────────────────────────────────────────────────
        "send_command" | "execute_command_stream" => {
            Err("LLM commands require streaming via WebSocket. See GET /ws endpoint.".to_string())
        }

        // ────────────────────────────────────────────────────────────────────
        // Remaining 280+ commands (template provided)
        // ────────────────────────────────────────────────────────────────────

        _ => Err(format!(
            "Command '{}' not yet implemented in bridge mode.\n\
            Bridge status: 10 commands implemented, 285 remaining.\n\
            Implemented: health, get_system_info, get_initial_state, list_sessions, \
            save_session, load_session, get_config, get_personas, set_persona.\n\
            \n\
            To add '{}' to bridge server:\n\
            1. Open src-tauri/src/commands/mod.rs\n\
            2. Add match arm for '{}'\n\
            3. Extract args: args.get(\"key\").and_then(|v| v.as_str())?\n\
            4. Call handler and return Ok(serde_json::json!(...))\n\
            5. For streaming: state.broadcaster.emit(\"event\", payload)",
            command, command, command
        )),
    }
}
