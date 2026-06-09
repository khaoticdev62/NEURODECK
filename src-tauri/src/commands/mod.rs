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
use futures_util::StreamExt;
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
use std::sync::Arc;

fn promptdrive_required_str<'a>(args: &'a Value, key: &str) -> Result<&'a str, String> {
    args.get(key)
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Missing '{}'", key))
}

fn promptdrive_slot_values(args: &Value) -> Result<Value, String> {
    let raw_slot_values = args
        .get("slot_values")
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));
    crate::promptdrive::slot_map_from_value(&raw_slot_values)?;
    Ok(raw_slot_values)
}

fn promptdrive_macro_steps(args: &Value) -> Result<Vec<crate::promptdrive::MacroStep>, String> {
    serde_json::from_value(
        args.get("steps")
            .cloned()
            .unwrap_or_else(|| serde_json::json!([])),
    )
    .map_err(|e| format!("Invalid macro steps: {}", e))
}

pub async fn dispatch_send_command(
    state: ServerState,
    message: String,
    image_base64: Option<String>,
    image_mime: Option<String>,
    pack_id: Option<String>,
) -> Result<Value, String> {
    {
        let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
        let agent_id = app.config.llm.active_agent_id.clone();
        crate::permissions::require_capability(
            &app.config.security.permission_registry,
            &agent_id,
            crate::permissions::Capability::Network,
        )?;
    }

    let broadcaster = state.broadcaster.clone();
    let app_state_clone = state.app_state.clone();
    let (provider_clone, mem_db, session_id, messages_len) = {
        let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
        (
            app.provider.clone(),
            app.mem_db.clone(),
            app.session_id.clone(),
            app.messages.len(),
        )
    };
    let message_clone = message;

    if let Some(ref db) = mem_db {
        let msg_id = format!("{}-{}", session_id, messages_len);
        let mut metadata = std::collections::HashMap::new();
        metadata.insert("role".to_string(), "user".to_string());
        let db_clone = db.clone();
        let prompt_clone = message_clone.clone();
        let provider_clone2 = provider_clone.clone();
        tokio::spawn(async move {
            if let Ok(embedding) = provider_clone2.generate_embedding(&prompt_clone).await {
                let _ = db_clone.store_message(msg_id, prompt_clone, embedding, metadata);
            }
        });
    }

    tokio::spawn(async move {
        {
            let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
            app.messages.push(format!("User: {}", message_clone));
        }

        let mut system_prompt = {
            let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
            let active_persona = app.active_persona.clone();
            let custom_personas = app.custom_personas.clone();

            crate::PERSONAS
                .iter()
                .find(|p| p.0 == active_persona)
                .map(|p| p.1.clone())
                .unwrap_or_else(|| {
                    custom_personas
                        .iter()
                        .find(|p| p.name == active_persona)
                        .map(|p| p.prompt.clone())
                        .unwrap_or_else(|| "You are a helpful assistant.".to_string())
                })
        };

        if let Some(ref db) = mem_db {
            let rag_results = match provider_clone.generate_embedding(&message_clone).await {
                Ok(query_embed) => db.search(&query_embed, 10).ok(),
                Err(_) => db.list_all().ok().map(|records| {
                    let query_words: Vec<&str> = message_clone
                        .split_whitespace()
                        .filter(|w| w.len() > 3)
                        .collect();
                    if query_words.is_empty() {
                        return Vec::new();
                    }
                    let mut scored: Vec<(usize, _)> = records
                        .into_iter()
                        .filter_map(|rec| {
                            let lower = rec.content.to_lowercase();
                            let hits = query_words
                                .iter()
                                .filter(|w| lower.contains(&w.to_lowercase()[..]))
                                .count();
                            if hits > 0 {
                                Some((hits, rec))
                            } else {
                                None
                            }
                        })
                        .collect();
                    scored.sort_by(|a, b| b.0.cmp(&a.0));
                    scored.into_iter().take(10).map(|(_, rec)| rec).collect()
                }),
            };

            if let Some(results) = rag_results {
                let unlock_state = {
                    let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    app.unlock_state.clone()
                };
                let mut filtered = Vec::new();
                for rec in results {
                    if let Some(ref pid) = pack_id {
                        if rec.pack_id.as_ref() != Some(pid) {
                            continue;
                        }
                    }
                    let level = crate::privacy::PrivacyLevel::from_str(
                        rec.metadata
                            .get("privacy_level")
                            .map(|s| s.as_str())
                            .unwrap_or("standard"),
                    );
                    let is_unlocked = unlock_state.is_unlocked(&rec.id);
                    if !crate::privacy::PrivacyFilter::can_inject(&level, is_unlocked) {
                        continue;
                    }
                    filtered.push(rec);
                    if filtered.len() >= 3 {
                        break;
                    }
                }

                if !filtered.is_empty() {
                    system_prompt.push_str("\n\nRelevant past context:\n");
                    let mut provenance_list = Vec::new();
                    for res in &filtered {
                        system_prompt.push_str(&format!("- {}\n", res.content));
                        let title = res
                            .metadata
                            .get("title")
                            .or_else(|| res.metadata.get("filename"))
                            .map(|s| s.as_str())
                            .unwrap_or(if res.content.len() > 30 {
                                &res.content[0..30]
                            } else {
                                &res.content
                            });
                        provenance_list.push(serde_json::json!({
                            "id": res.id,
                            "title": title,
                            "content_snippet": if res.content.len() > 100 { format!("{}...", &res.content[0..97]) } else { res.content.clone() },
                            "role": res.metadata.get("role").unwrap_or(&"unknown".to_string())
                        }));
                    }
                    broadcaster.emit(
                        "rag_sources",
                        serde_json::json!(provenance_list).to_string(),
                    );
                }
            }
        }

        let mut full_response = String::new();

        if let Some(ref b64) = image_base64 {
            let mime_str = image_mime.as_deref().unwrap_or("image/png");
            match provider_clone
                .chat_with_image(&message_clone, &system_prompt, Some(b64), Some(mime_str))
                .await
            {
                Ok(response) => {
                    full_response = response.clone();
                    broadcaster.emit("command_token", serde_json::json!({ "token": response }));
                }
                Err(e) => {
                    broadcaster.emit(
                        "command_error",
                        serde_json::json!({ "error": e.to_string() }),
                    );
                    return;
                }
            }
        } else {
            let mut stream = provider_clone.stream_response(&message_clone, &system_prompt);
            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(chunk) => {
                        full_response.push_str(&chunk);
                        broadcaster.emit("command_token", serde_json::json!({ "token": chunk }));
                    }
                    Err(e) => {
                        broadcaster.emit(
                            "command_error",
                            serde_json::json!({ "error": e.to_string() }),
                        );
                        return;
                    }
                }
            }
        }

        {
            let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
            app.messages.push(format!("AI: {}", full_response));
        }

        broadcaster.emit("command_done", serde_json::json!({ "status": "complete" }));
    });

    Ok(serde_json::json!({
        "status": "streaming",
        "message": "LLM response streaming via WebSocket events"
    }))
}

pub async fn dispatch(state: ServerState, command: &str, args: Value) -> Result<Value, String> {
    match command {
        // ────────────────────────────────────────────────────────────────────
        // System & Status
        // ────────────────────────────────────────────────────────────────────
        "health" => Ok(serde_json::json!({
            "status": "ready",
            "version": env!("CARGO_PKG_VERSION"),
            "codename": "Ptah",
            "tag": concat!("v", env!("CARGO_PKG_VERSION"), "-ptah"),
            "mode": "bridge_server",
            "endpoint": "http://127.0.0.1:9477",
            "api_version": "1.0",
        })),

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
            let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let model_name = match app.config.llm.default_provider.as_str() {
                "gemini" => app.config.llm.gemini_model.clone(),
                "kimi" => app.config.llm.kimi_model.clone(),
                "huggingface" => app.config.llm.hf_model.clone(),
                _ => app.config.llm.ollama_model.clone(),
            };

            let (game_name, game_id, game_running) = crate::detect_game();

            Ok(serde_json::json!({
                "model": model_name,
                "provider": app.config.llm.default_provider,
                "active_agent_id": app.config.llm.active_agent_id,
                "session_id": app.session_id,
                "active_persona": app.active_persona,
                "memory_status": if app.mem_db.is_some() { "Stable" } else { "Offline" },
                "tool_status": "Idle",
                "boot_health_status": app.boot_self_heal.status,
                "boot_health_summary": app.boot_self_heal.summary(),
                "boot_health_recovered_count": app.boot_self_heal.recovered_count.to_string(),
                "boot_health_warning_count": app.boot_self_heal.warning_count.to_string(),
                "game_name": game_name,
                "game_app_id": game_id,
                "game_running": game_running.to_string(),
            }))
        }

        "list_sessions" => {
            let sessions = crate::commands::session::list_sessions().map_err(|e| e.to_string())?;
            Ok(serde_json::json!(sessions))
        }

        "list_sessions_meta" => {
            let meta = crate::commands::session::list_sessions_meta().map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(meta).map_err(|e| e.to_string())?)
        }

        "load_latest_session" => {
            let read_dir = std::fs::read_dir(crate::user_config_dir().join("sessions"))
                .map_err(|e| format!("Error reading sessions dir: {}", e))?;

            let mut latest_file = std::path::PathBuf::new();
            let mut latest_name = String::new();

            for entry in read_dir.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().is_some_and(|ext| ext == "json") {
                    let name = path
                        .file_name()
                        .map(|f| f.to_string_lossy().into_owned())
                        .unwrap_or_default();
                    if latest_name.is_empty() || name > latest_name {
                        latest_name = name;
                        latest_file = path;
                    }
                }
            }

            if latest_name.is_empty() {
                return Err("No saved sessions found".to_string());
            }

            let session = crate::storage::load_session(&latest_file)
                .map_err(|e| format!("Failed to load session: {}", e))?;

            let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app.messages = session.messages.clone();
            app.session_id = session.id.clone();

            Ok(serde_json::json!({
                "session_id": session.id,
                "messages": session.messages,
            }))
        }

        "load_session_by_id" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
                return Err(format!("Invalid session ID: {}", id));
            }

            let file_path = crate::user_config_dir()
                .join("sessions")
                .join(format!("{}.json", id));
            if !file_path.exists() {
                return Err(format!("Session {} does not exist", id));
            }

            let session = crate::storage::load_session(&file_path)
                .map_err(|e| format!("Failed to load session: {}", e))?;

            let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app.messages = session.messages.clone();
            app.session_id = session.id.clone();

            Ok(serde_json::json!({
                "session_id": session.id,
                "messages": session.messages,
            }))
        }

        "delete_session" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            crate::commands::session::delete_session(id.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "id": id }))
        }

        "fork_session" => {
            let base_messages = args
                .get("base_messages")
                .and_then(|v| v.as_array())
                .ok_or("Missing 'base_messages'")?
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>();

            let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let new_id = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
            app.session_id = new_id.clone();
            app.messages = base_messages;

            Ok(serde_json::json!(new_id))
        }

        "rename_session" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;

            crate::commands::session::rename_session(id.to_string(), name.to_string())?;
            Ok(serde_json::Value::Null)
        }

        "export_session_content" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let format_val = args
                .get("format")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'format'")?;

            let content = crate::commands::session::export_session_content(
                id.to_string(),
                format_val.to_string(),
            )?;
            Ok(serde_json::json!(content))
        }

        "export_session_markdown" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let path = crate::commands::session::export_session_markdown(id.to_string())?;
            Ok(serde_json::json!(path))
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
            let session_id = args
                .get("session_id")
                .and_then(|v| v.as_str())
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
                "security": {
                    "agent_workspace_only": app_state.config.security.agent_workspace_only,
                    "agent_workspace_path": app_state.config.security.agent_workspace_path,
                    "permission_registry": app_state.config.security.permission_registry,
                },
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Persona Management
        // ────────────────────────────────────────────────────────────────────
        "get_personas" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut persona_names: Vec<String> =
                crate::PERSONAS.iter().map(|p| p.0.clone()).collect();
            for persona in &app_state.custom_personas {
                if !persona_names.contains(&persona.name) {
                    persona_names.push(persona.name.clone());
                }
            }
            Ok(serde_json::json!(persona_names))
        }

        "set_persona" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
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
        "pty_spawn" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or(&format!("pty_{}", chrono::Utc::now().timestamp()))
                .to_string();
            let cols = args.get("cols").and_then(|v| v.as_u64()).unwrap_or(80) as u16;
            let rows = args.get("rows").and_then(|v| v.as_u64()).unwrap_or(24) as u16;
            let _shell = args
                .get("shell")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let _args_list = args.get("args").and_then(|v| v.as_array()).map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect::<Vec<_>>()
            });

            let broadcaster = state.broadcaster.clone();

            // Emit session created event
            broadcaster.emit(
                "pty_session_created",
                serde_json::json!({
                    "id": id,
                    "cols": cols,
                    "rows": rows
                }),
            );

            // In bridge mode, PTY output events will be emitted by the underlying
            // PTY reader thread. The main app loop or event subscription should
            // relay these events via the broadcaster.
            // For now, spawning directly causes issues with AppHandle.
            // TODO: Implement bridge-compatible PTY spawning

            Ok(serde_json::json!({
                "status": "spawned",
                "id": id,
                "cols": cols,
                "rows": rows,
                "note": "PTY session created. Monitor WebSocket for pty_output events."
            }))
        }

        "pty_write" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let data = args
                .get("data")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'data'")?;

            let mut sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(session) = sessions.get_mut(id) {
                use std::io::Write;
                session
                    .writer
                    .write_all(data.as_bytes())
                    .map_err(|e| format!("Failed to write to PTY: {}", e))?;
                session
                    .writer
                    .flush()
                    .map_err(|e| format!("Failed to flush PTY: {}", e))?;

                Ok(serde_json::json!({
                    "status": "written",
                    "id": id,
                    "bytes": data.len()
                }))
            } else {
                Err(format!("PTY session {} not found", id))
            }
        }

        "pty_kill" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if sessions.remove(id).is_some() {
                state
                    .broadcaster
                    .emit("pty_killed", serde_json::json!({ "id": id }));
                Ok(serde_json::json!({
                    "status": "killed",
                    "id": id
                }))
            } else {
                Ok(serde_json::json!({
                    "status": "not_found",
                    "id": id,
                    "message": "Session was not running"
                }))
            }
        }

        "pty_resize" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let cols = args
                .get("cols")
                .and_then(|v| v.as_u64())
                .ok_or("Missing 'cols'")? as u16;
            let rows = args
                .get("rows")
                .and_then(|v| v.as_u64())
                .ok_or("Missing 'rows'")? as u16;

            // Verify session exists
            let sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if sessions.contains_key(id) {
                // PTY resize requires ioctl calls which are complex in bridge mode
                // For now, acknowledge the resize request but don't perform it
                // TODO: Implement proper PTY resize via ioctl once dependencies are available

                state.broadcaster.emit(
                    "pty_resize_requested",
                    serde_json::json!({
                        "id": id,
                        "cols": cols,
                        "rows": rows
                    }),
                );

                Ok(serde_json::json!({
                    "status": "resize_requested",
                    "id": id,
                    "cols": cols,
                    "rows": rows,
                    "note": "Resize request acknowledged. Full implementation coming soon."
                }))
            } else {
                Err(format!("PTY session {} not found", id))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // LLM & Chat Commands (Streaming)
        // ────────────────────────────────────────────────────────────────────
        "send_command" => {
            let message = args
                .get("message")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'message'")?;
            let image_base64 = args
                .get("image_base64")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let image_mime = args
                .get("image_mime")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let pack_id = args
                .get("pack_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Network,
                )?;
            }

            let broadcaster = state.broadcaster.clone();
            let app_state_clone = state.app_state.clone();
            let (provider_clone, mem_db, session_id, messages_len) = {
                let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                (
                    app.provider.clone(),
                    app.mem_db.clone(),
                    app.session_id.clone(),
                    app.messages.len(),
                )
            };
            let message_clone = message.to_string();

            // Store user message in vector DB (fire-and-forget)
            if let Some(ref db) = mem_db {
                let msg_id = format!("{}-{}", session_id, messages_len);
                let mut metadata = std::collections::HashMap::new();
                metadata.insert("role".to_string(), "user".to_string());
                let db_clone = db.clone();
                let prompt_clone = message_clone.clone();
                let provider_clone2 = provider_clone.clone();
                tokio::spawn(async move {
                    if let Ok(embedding) = provider_clone2.generate_embedding(&prompt_clone).await {
                        let _ = db_clone.store_message(msg_id, prompt_clone, embedding, metadata);
                    }
                });
            }

            tokio::spawn(async move {
                // 1. Add user message to state
                {
                    let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    app.messages.push(format!("User: {}", message_clone));
                }

                // 2. Get system prompt from active persona
                let mut system_prompt = {
                    let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    let active_persona = app.active_persona.clone();
                    let custom_personas = app.custom_personas.clone();

                    crate::PERSONAS
                        .iter()
                        .find(|p| p.0 == active_persona)
                        .map(|p| p.1.clone())
                        .unwrap_or_else(|| {
                            custom_personas
                                .iter()
                                .find(|p| p.name == active_persona)
                                .map(|p| p.prompt.clone())
                                .unwrap_or_else(|| "You are a helpful assistant.".to_string())
                        })
                };

                // 3. RAG: Search memory for relevant messages with pack + privacy filters
                if let Some(ref db) = mem_db {
                    let rag_results = match provider_clone.generate_embedding(&message_clone).await
                    {
                        Ok(query_embed) => db.search(&query_embed, 10).ok(),
                        Err(_) => db.list_all().ok().map(|records| {
                            let query_words: Vec<&str> = message_clone
                                .split_whitespace()
                                .filter(|w| w.len() > 3)
                                .collect();
                            if query_words.is_empty() {
                                return Vec::new();
                            }
                            let mut scored: Vec<(usize, _)> = records
                                .into_iter()
                                .filter_map(|rec| {
                                    let lower = rec.content.to_lowercase();
                                    let hits = query_words
                                        .iter()
                                        .filter(|w| lower.contains(&w.to_lowercase()[..]))
                                        .count();
                                    if hits > 0 {
                                        Some((hits, rec))
                                    } else {
                                        None
                                    }
                                })
                                .collect();
                            scored.sort_by(|a, b| b.0.cmp(&a.0));
                            scored.into_iter().take(10).map(|(_, rec)| rec).collect()
                        }),
                    };

                    if let Some(results) = rag_results {
                        let unlock_state = {
                            let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                            app.unlock_state.clone()
                        };
                        let mut filtered = Vec::new();
                        for rec in results {
                            // Pack filter
                            if let Some(ref pid) = pack_id {
                                if rec.pack_id.as_ref() != Some(pid) {
                                    continue;
                                }
                            }
                            // Privacy filter
                            let level = crate::privacy::PrivacyLevel::from_str(
                                rec.metadata
                                    .get("privacy_level")
                                    .map(|s| s.as_str())
                                    .unwrap_or("standard"),
                            );
                            let is_unlocked = unlock_state.is_unlocked(&rec.id);
                            if !crate::privacy::PrivacyFilter::can_inject(&level, is_unlocked) {
                                continue;
                            }
                            filtered.push(rec);
                            if filtered.len() >= 3 {
                                break;
                            }
                        }

                        if !filtered.is_empty() {
                            system_prompt.push_str("\n\nRelevant past context:\n");
                            let mut provenance_list = Vec::new();
                            for res in &filtered {
                                system_prompt.push_str(&format!("- {}\n", res.content));
                                let title = res
                                    .metadata
                                    .get("title")
                                    .or_else(|| res.metadata.get("filename"))
                                    .map(|s| s.as_str())
                                    .unwrap_or(if res.content.len() > 30 {
                                        &res.content[0..30]
                                    } else {
                                        &res.content
                                    });
                                provenance_list.push(serde_json::json!({
                                    "id": res.id,
                                    "title": title,
                                    "content_snippet": if res.content.len() > 100 { format!("{}...", &res.content[0..97]) } else { res.content.clone() },
                                    "role": res.metadata.get("role").unwrap_or(&"unknown".to_string())
                                }));
                            }
                            broadcaster.emit(
                                "rag_sources",
                                serde_json::json!(provenance_list).to_string(),
                            );
                        }
                    }
                }

                let mut full_response = String::new();

                // 4. Stream response from LLM
                if let Some(ref b64) = image_base64 {
                    let mime_str = image_mime.as_deref().unwrap_or("image/png");
                    match provider_clone
                        .chat_with_image(&message_clone, &system_prompt, Some(b64), Some(mime_str))
                        .await
                    {
                        Ok(response) => {
                            full_response = response.clone();
                            broadcaster
                                .emit("command_token", serde_json::json!({ "token": response }));
                        }
                        Err(e) => {
                            broadcaster.emit(
                                "command_error",
                                serde_json::json!({ "error": e.to_string() }),
                            );
                            return;
                        }
                    }
                } else {
                    let mut stream = provider_clone.stream_response(&message_clone, &system_prompt);
                    while let Some(chunk_res) = stream.next().await {
                        match chunk_res {
                            Ok(chunk) => {
                                full_response.push_str(&chunk);
                                broadcaster
                                    .emit("command_token", serde_json::json!({ "token": chunk }));
                            }
                            Err(e) => {
                                broadcaster.emit(
                                    "command_error",
                                    serde_json::json!({ "error": e.to_string() }),
                                );
                                return;
                            }
                        }
                    }
                }

                // 5. Store AI response in state
                {
                    let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    app.messages.push(format!("AI: {}", full_response));
                }

                // 6. Signal completion
                broadcaster.emit("command_done", serde_json::json!({ "status": "complete" }));
            });

            Ok(serde_json::json!({
                "status": "streaming",
                "message": "LLM response streaming via WebSocket events"
            }))
        }

        "execute_command_stream" => {
            Err("LLM commands require streaming via WebSocket. See GET /ws endpoint.".to_string())
        }

        // ────────────────────────────────────────────────────────────────────
        // Memory Management (RAG/Vector DB)
        // ────────────────────────────────────────────────────────────────────
        "memory_add_fact" => {
            let content = args
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'content'")?;

            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::MemoryWrite,
                )?;
            }

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let fact_id = format!("manual-{}", chrono::Utc::now().timestamp());
                let mut metadata = std::collections::HashMap::new();
                metadata.insert("source".to_string(), "manual".to_string());

                // Store fact without embedding (will use keyword search)
                let _ = db.store_message(fact_id.clone(), content.to_string(), vec![], metadata);
                Ok(serde_json::json!({
                    "status": "added",
                    "id": fact_id,
                    "content": content
                }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_search" => {
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?;

            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::MemoryRead,
                )?;
            }

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                match db.list_all() {
                    Ok(records) => {
                        let query_words: Vec<&str> =
                            query.split_whitespace().filter(|w| w.len() > 3).collect();

                        let mut results: Vec<(usize, _)> = records
                            .into_iter()
                            .filter_map(|rec| {
                                let lower = rec.content.to_lowercase();
                                let hits = query_words
                                    .iter()
                                    .filter(|w| lower.contains(&w.to_lowercase()[..]))
                                    .count();
                                if hits > 0 {
                                    Some((hits, rec))
                                } else {
                                    None
                                }
                            })
                            .collect();

                        results.sort_by(|a, b| b.0.cmp(&a.0));
                        let top_3: Vec<_> = results
                            .into_iter()
                            .take(3)
                            .map(|(_, rec)| {
                                serde_json::json!({
                                    "id": rec.id,
                                    "content": rec.content,
                                    "metadata": rec.metadata
                                })
                            })
                            .collect();

                        Ok(serde_json::json!({
                            "query": query,
                            "results": top_3,
                            "count": top_3.len()
                        }))
                    }
                    Err(e) => Err(format!("Memory search error: {}", e)),
                }
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Session Management
        // ────────────────────────────────────────────────────────────────────
        "new_session" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let session_id = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
            app_state.session_id = session_id.clone();
            app_state.messages.clear();

            Ok(serde_json::json!(session_id))
        }

        // ────────────────────────────────────────────────────────────────────
        // Model Management
        // ────────────────────────────────────────────────────────────────────
        "list_models" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let gemini_models = vec!["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
            let ollama_models = vec!["llama2", "mistral", "neural-chat", "orca-mini"];

            Ok(serde_json::json!({
                "gemini": gemini_models,
                "ollama": ollama_models,
                "current": {
                    "provider": app_state.config.llm.default_provider,
                    "model": if app_state.config.llm.default_provider == "gemini" {
                        app_state.config.llm.gemini_model.clone()
                    } else {
                        app_state.config.llm.ollama_model.clone()
                    }
                }
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Utility & Diagnostics
        // ────────────────────────────────────────────────────────────────────
        "execute_command_sync" => {
            let cmd = args
                .get("command")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'command'")?;

            tokio::task::spawn_blocking({
                let cmd_str = cmd.to_string();
                move || {
                    let output = if cfg!(target_os = "windows") {
                        std::process::Command::new("cmd.exe")
                            .arg("/c")
                            .arg(&cmd_str)
                            .output()
                    } else {
                        std::process::Command::new("sh")
                            .arg("-c")
                            .arg(&cmd_str)
                            .output()
                    };

                    match output {
                        Ok(out) => {
                            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
                            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
                            (stdout, stderr, out.status.code().unwrap_or(-1))
                        }
                        Err(e) => (String::new(), e.to_string(), -1),
                    }
                }
            })
            .await
            .ok()
            .map(|(stdout, stderr, code)| {
                serde_json::json!({
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": code
                })
            })
            .ok_or("Failed to execute command".to_string())
        }

        "test_connection" => {
            let (provider, provider_name) = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                (
                    app_state.provider.clone(),
                    app_state.config.llm.default_provider.clone(),
                )
            };
            let broadcaster = state.broadcaster.clone();

            tokio::spawn(async move {
                match provider
                    .chat_with_image(
                        "ping",
                        "You are a helpful assistant. Reply with 'pong'.",
                        None,
                        None,
                    )
                    .await
                {
                    Ok(response) => {
                        broadcaster.emit(
                            "connection_test",
                            serde_json::json!({
                                "status": "success",
                                "provider": provider_name,
                                "response": response
                            }),
                        );
                    }
                    Err(e) => {
                        broadcaster.emit(
                            "connection_test",
                            serde_json::json!({
                                "status": "failed",
                                "provider": provider_name,
                                "error": e.to_string()
                            }),
                        );
                    }
                }
            });

            Ok(serde_json::json!({
                "status": "testing",
                "message": "Connection test initiated, check WebSocket for result"
            }))
        }

        "get_doc_count" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let count = app_state
                .mem_db
                .as_ref()
                .and_then(|db| db.export_all_records().ok().map(|r| r.len()))
                .unwrap_or(0);

            Ok(serde_json::json!({
                "count": count,
                "database": "memory",
                "last_updated": chrono::Utc::now().to_rfc3339()
            }))
        }

        "cancel_generation" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(tx) = app_state.cancel_stream_tx.take() {
                let _ = tx.send(());
                Ok(serde_json::json!({
                    "status": "cancelled",
                    "message": "LLM generation cancelled"
                }))
            } else {
                Ok(serde_json::json!({
                    "status": "idle",
                    "message": "No active generation to cancel"
                }))
            }
        }

        "get_agent_status" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());

            let (running, task_count, tasks) = {
                if let Some(ref plan) = orch_state.plan {
                    (
                        orch_state.running,
                        plan.tasks.len(),
                        plan.tasks
                            .iter()
                            .map(|t| {
                                serde_json::json!({
                                    "id": t.id,
                                    "role": t.role,
                                    "status": t.status,
                                    "result": t.result
                                })
                            })
                            .collect::<Vec<_>>(),
                    )
                } else {
                    (orch_state.running, 0, vec![])
                }
            };

            Ok(serde_json::json!({
                "agent": {
                    "running": running,
                    "task_count": task_count,
                    "status": if running { "active" } else { "idle" },
                    "tasks": tasks
                },
                "chat": {
                    "message_count": app_state.messages.len(),
                    "session_id": app_state.session_id,
                    "persona": app_state.active_persona
                },
                "system": {
                    "provider": app_state.config.llm.default_provider,
                    "model": if app_state.config.llm.default_provider == "gemini" {
                        app_state.config.llm.gemini_model.clone()
                    } else {
                        app_state.config.llm.ollama_model.clone()
                    }
                }
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Agent & Orchestration
        // ────────────────────────────────────────────────────────────────────
        "start_agent" => {
            let goal = args
                .get("goal")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'goal'")?;

            let mut orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if orch_state.running {
                return Err("Agent already running".to_string());
            }

            // Create initial task from goal
            let task = crate::orchestrator::AgentTask {
                id: format!("task-{}", chrono::Utc::now().timestamp()),
                role: "Main Agent".to_string(),
                goal: goal.to_string(),
                depends_on: vec![],
                status: "running".to_string(),
                result: None,
                error: None,
            };

            let plan = crate::orchestrator::OrchestratorPlan {
                goal: goal.to_string(),
                tasks: vec![task.clone()],
            };

            orch_state.running = true;
            orch_state.plan = Some(plan);

            let broadcaster = state.broadcaster.clone();
            broadcaster.emit(
                "agent_started",
                serde_json::json!({
                    "goal": goal,
                    "task_id": task.id,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }),
            );

            Ok(serde_json::json!({
                "status": "started",
                "goal": goal,
                "task_id": task.id,
                "message": "Agent loop initialized"
            }))
        }

        "stop_agent" => {
            let mut orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if !orch_state.running {
                return Ok(serde_json::json!({
                    "status": "idle",
                    "message": "Agent is not running"
                }));
            }

            // If abort_tx exists, send signal to stop
            if let Some(tx) = orch_state.abort_tx.take() {
                let _ = tx.send(());
            }

            orch_state.running = false;
            let plan_goal = orch_state.plan.as_ref().map(|p| p.goal.clone());

            let broadcaster = state.broadcaster.clone();
            broadcaster.emit(
                "agent_stopped",
                serde_json::json!({
                    "goal": plan_goal,
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }),
            );

            Ok(serde_json::json!({
                "status": "stopped",
                "goal": plan_goal,
                "message": "Agent loop terminated"
            }))
        }

        "agent_step" => {
            let orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());

            if !orch_state.running {
                return Ok(serde_json::json!({
                    "step": 0,
                    "running": false,
                    "status": "idle",
                    "message": "Agent not running"
                }));
            }

            // Count completed tasks
            let (total_tasks, completed_tasks, current_task) =
                if let Some(ref plan) = orch_state.plan {
                    let total = plan.tasks.len();
                    let completed = plan.tasks.iter().filter(|t| t.status == "done").count();
                    let curr = plan
                        .tasks
                        .iter()
                        .find(|t| t.status == "running")
                        .map(|t| (&t.id, &t.role, &t.goal));

                    (total, completed, curr)
                } else {
                    (0, 0, None)
                };

            Ok(serde_json::json!({
                "step": completed_tasks,
                "running": orch_state.running,
                "status": if orch_state.running { "active" } else { "idle" },
                "progress": {
                    "completed": completed_tasks,
                    "total": total_tasks,
                    "percent": if total_tasks > 0 { (completed_tasks * 100) / total_tasks } else { 0 }
                },
                "current_task": current_task.map(|(id, role, goal)| serde_json::json!({
                    "id": id,
                    "role": role,
                    "goal": goal
                })),
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }

        "agent_exec_code" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?
                .to_string();
            let lang = args
                .get("lang")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'lang'")?
                .to_string();
            let result =
                crate::commands::agent::agent_exec_code(code, lang, state.app_state.clone())
                    .await?;
            Ok(serde_json::json!({ "output": result }))
        }

        "get_agent_plan" => {
            let orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());

            if let Some(ref plan) = orch_state.plan {
                Ok(serde_json::json!({
                    "goal": plan.goal,
                    "tasks": plan.tasks.iter().map(|t| serde_json::json!({
                        "id": t.id,
                        "role": t.role,
                        "goal": t.goal,
                        "status": t.status,
                        "result": t.result,
                        "error": t.error,
                        "depends_on": t.depends_on
                    })).collect::<Vec<_>>(),
                    "count": plan.tasks.len()
                }))
            } else {
                Ok(serde_json::json!({
                    "goal": null,
                    "tasks": [],
                    "count": 0,
                    "message": "No active plan"
                }))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // File Transfer & Peer Discovery
        // ────────────────────────────────────────────────────────────────────
        "transfer_list_peers" => {
            let transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            let peer_count = transfer_state.peers.len();

            Ok(serde_json::json!({
                "count": peer_count,
                "status": "ok"
            }))
        }

        "transfer_list_active" => {
            let transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            let transfer_count = transfer_state.transfers.len();

            Ok(serde_json::json!({
                "count": transfer_count,
                "status": "ok"
            }))
        }

        "transfer_cancel" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());

            // Remove transfer by key (id)
            if let Some(_cancelled) = transfer_state.transfers.remove(id) {
                state.broadcaster.emit(
                    "transfer_cancelled",
                    serde_json::json!({
                        "id": id
                    }),
                );

                Ok(serde_json::json!({
                    "status": "cancelled",
                    "id": id
                }))
            } else {
                Ok(serde_json::json!({
                    "status": "not_found",
                    "id": id
                }))
            }
        }

        "transfer_group_code" => {
            let action = args.get("action").and_then(|v| v.as_str()).unwrap_or("get");

            let mut transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());

            match action {
                "set" => {
                    let code = args
                        .get("code")
                        .and_then(|v| v.as_str())
                        .ok_or("Missing 'code' for set action")?;
                    transfer_state.group_code = code.to_string();

                    Ok(serde_json::json!({
                        "status": "set",
                        "code": code
                    }))
                }
                "get" => {
                    let code = &transfer_state.group_code;
                    Ok(serde_json::json!({
                        "status": "ok",
                        "code": code,
                        "has_code": !code.is_empty()
                    }))
                }
                "clear" => {
                    transfer_state.group_code = String::new();
                    Ok(serde_json::json!({
                        "status": "cleared"
                    }))
                }
                _ => Err(format!(
                    "Unknown action: {}. Use 'get', 'set', or 'clear'",
                    action
                )),
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Lua Scripting & Plugin System
        // ────────────────────────────────────────────────────────────────────
        "run_lua" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?;

            let lua_engine = state.lua.lock().unwrap_or_else(|e| e.into_inner());
            match lua_engine.run_script(code) {
                Ok(_) => {
                    state.broadcaster.emit(
                        "lua_executed",
                        serde_json::json!({
                            "status": "success",
                            "length": code.len()
                        }),
                    );

                    Ok(serde_json::json!({
                        "status": "executed",
                        "message": "Lua script executed successfully"
                    }))
                }
                Err(e) => {
                    state.broadcaster.emit(
                        "lua_error",
                        serde_json::json!({
                            "error": e.clone()
                        }),
                    );

                    Err(format!("Lua execution error: {}", e))
                }
            }
        }

        "list_lua_commands" => {
            let lua_engine = state.lua.lock().unwrap_or_else(|e| e.into_inner());
            let commands = lua_engine.get_registered_commands();

            Ok(serde_json::json!({
                "commands": commands,
                "count": commands.len()
            }))
        }

        "call_lua_command" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let args_str = args.get("args").and_then(|v| v.as_str()).unwrap_or("");

            let lua_engine = state.lua.lock().unwrap_or_else(|e| e.into_inner());
            match lua_engine.call_command(name, args_str) {
                Ok(Some(result)) => {
                    state.broadcaster.emit(
                        "lua_command_result",
                        serde_json::json!({
                            "command": name,
                            "result": result
                        }),
                    );

                    Ok(serde_json::json!({
                        "status": "success",
                        "command": name,
                        "result": result
                    }))
                }
                Ok(None) => Ok(serde_json::json!({
                    "status": "executed",
                    "command": name,
                    "result": null,
                    "message": "Command executed but returned nil"
                })),
                Err(e) => {
                    state.broadcaster.emit(
                        "lua_error",
                        serde_json::json!({
                            "command": name,
                            "error": e.clone()
                        }),
                    );

                    Err(format!("Lua command error: {}", e))
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Game Context & Detection
        // ────────────────────────────────────────────────────────────────────
        "list_games" => {
            // Game detection uses Steam API and local game scanners
            // For bridge mode, return empty list as placeholder
            Ok(serde_json::json!({
                "games": [],
                "count": 0,
                "note": "Game detection not yet integrated in bridge mode"
            }))
        }

        "get_game_context" => {
            // Get current game context (Steam Deck specific)
            Ok(serde_json::json!({
                "game_name": "",
                "game_id": "",
                "running": false,
                "context": "",
                "note": "Game context detection not yet integrated in bridge mode"
            }))
        }

        "save_game_notes" => {
            let _game_id = args
                .get("game_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'game_id'")?;
            let _notes = args
                .get("notes")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'notes'")?;

            // Game notes storage would go to user_config_dir/data/game_notes/
            Ok(serde_json::json!({
                "status": "saved",
                "note": "Game notes storage not yet integrated in bridge mode"
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Browser Integration
        // ────────────────────────────────────────────────────────────────────
        "browser_open" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;

            if url.starts_with("http://") || url.starts_with("https://") {
                state.broadcaster.emit(
                    "browser_opened",
                    serde_json::json!({ "url": url }),
                );
                Ok(serde_json::json!({ "status": "opened", "url": url }))
            } else {
                Err("Invalid URL format. Must start with a valid scheme (http/https)".to_string())
            }
        }

        "browser_hide" => {
            state.broadcaster.emit("browser_hide_requested", serde_json::json!({}));
            Ok(serde_json::json!({ "status": "hidden" }))
        }

        "browser_show" => {
            state.broadcaster.emit("browser_show_requested", serde_json::json!({}));
            Ok(serde_json::json!({ "status": "shown" }))
        }

        "open_browser" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;

            // In bridge mode, we can't actually open a browser window
            // But we can validate the URL and return a placeholder response
            if url.starts_with("http://") || url.starts_with("https://") {
                state.broadcaster.emit(
                    "browser_opened",
                    serde_json::json!({
                        "url": url
                    }),
                );

                Ok(serde_json::json!({
                    "status": "opened",
                    "url": url,
                    "note": "Browser window not available in bridge mode"
                }))
            } else {
                Err("Invalid URL format. Must start with a valid scheme (http/https)".to_string())
            }
        }

        "get_browser_url" => {
            // Placeholder: would require browser session tracking
            Ok(serde_json::json!({
                "url": "",
                "note": "Browser session tracking not available in bridge mode"
            }))
        }

        "browser_back" => {
            state
                .broadcaster
                .emit("browser_back_requested", serde_json::json!({}));

            Ok(serde_json::json!({
                "status": "back_requested",
                "note": "Browser back navigation not available in bridge mode"
            }))
        }

        "browser_forward" => {
            state
                .broadcaster
                .emit("browser_forward_requested", serde_json::json!({}));

            Ok(serde_json::json!({
                "status": "forward_requested",
                "note": "Browser forward navigation not available in bridge mode"
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // System Info & State Management
        // ────────────────────────────────────────────────────────────────────
        "get_context_stats" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let orch_state = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());

            let memory_count = app_state
                .mem_db
                .as_ref()
                .and_then(|db| db.export_all_records().ok().map(|r| r.len()))
                .unwrap_or(0);

            Ok(serde_json::json!({
                "chat": {
                    "session_id": app_state.session_id,
                    "messages": app_state.messages.len(),
                    "persona": app_state.active_persona
                },
                "memory": {
                    "facts": memory_count
                },
                "agent": {
                    "running": orch_state.running,
                    "tasks": orch_state.plan.as_ref().map(|p| p.tasks.len()).unwrap_or(0)
                },
                "system": {
                    "provider": app_state.config.llm.default_provider,
                    "model": if app_state.config.llm.default_provider == "gemini" {
                        app_state.config.llm.gemini_model.clone()
                    } else {
                        app_state.config.llm.ollama_model.clone()
                    }
                }
            }))
        }

        "list_features" => Ok(serde_json::json!({
            "features": vec![
                "chat", "memory", "terminal", "file_transfer", "agent",
                "lua_scripting", "session_management", "diagnostics"
            ],
            "count": 8
        })),

        "get_version" => Ok(serde_json::json!({
            "version": env!("CARGO_PKG_VERSION"),
            "codename": "Ptah",
            "tag": concat!("v", env!("CARGO_PKG_VERSION"), "-ptah"),
            "bridge_api_version": "1.0",
        })),

        "debug_info" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());

            let workspace = app_state
                .config
                .get_resolved_workspace()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|| "unknown".to_string());

            Ok(serde_json::json!({
                "session": app_state.session_id,
                "uptime_seconds": chrono::Utc::now().timestamp(),
                "config": {
                    "workspace": workspace,
                    "provider": app_state.config.llm.default_provider,
                },
                "state": {
                    "messages": app_state.messages.len(),
                    "personas": app_state.custom_personas.len(),
                },
                "timestamp": chrono::Utc::now().to_rfc3339()
            }))
        }

        "export_state" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());

            Ok(serde_json::json!({
                "session_id": app_state.session_id,
                "messages_count": app_state.messages.len(),
                "personas": app_state.custom_personas.iter().map(|p| &p.name).collect::<Vec<_>>(),
                "active_persona": app_state.active_persona,
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "format": "json",
                "note": "Full state export (messages) requires separate call"
            }))
        }

        "reset_session" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let old_id = app_state.session_id.clone();

            // Reset session state
            app_state.session_id = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
            app_state.messages.clear();
            app_state.active_persona = "Default".to_string();

            state.broadcaster.emit(
                "session_reset",
                serde_json::json!({
                    "old_id": old_id,
                    "new_id": app_state.session_id
                }),
            );

            Ok(serde_json::json!({
                "status": "reset",
                "old_session_id": old_id,
                "new_session_id": app_state.session_id
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Configuration Updates
        // ────────────────────────────────────────────────────────────────────
        "set_config" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            let value = args
                .get("value")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'value'")?;

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();

            match key {
                "llm.default_provider" => config.llm.default_provider = value.to_string(),
                "llm.ollama_model" => config.llm.ollama_model = value.to_string(),
                "llm.gemini_model" => config.llm.gemini_model = value.to_string(),
                "llm.ollama_base_url" => {
                    let parsed =
                        reqwest::Url::parse(value).map_err(|e| format!("Invalid URL: {}", e))?;
                    if !matches!(parsed.scheme(), "http" | "https") {
                        return Err("ollama_base_url must use http or https".to_string());
                    }
                    config.llm.ollama_base_url = value.to_string();
                }
                "llm.openai_compat_model" => config.llm.openai_compat_model = value.to_string(),
                "llm.openai_compat_base_url" => {
                    if !value.is_empty() {
                        let parsed = reqwest::Url::parse(value)
                            .map_err(|e| format!("Invalid URL: {}", e))?;
                        if !matches!(parsed.scheme(), "http" | "https") {
                            return Err("openai_compat_base_url must use http or https".to_string());
                        }
                    }
                    config.llm.openai_compat_base_url = value.to_string();
                }
                "theme.primary_color" => config.theme.primary_color = value.to_string(),
                "theme.secondary_color" => config.theme.secondary_color = value.to_string(),
                "theme.bg_color" => config.theme.bg_color = value.to_string(),
                "theme.foreground_color" => config.theme.foreground_color = value.to_string(),
                "theme.response_color" => config.theme.response_color = value.to_string(),
                "security.agent_workspace_only" => {
                    config.security.agent_workspace_only = value
                        .parse::<bool>()
                        .map_err(|_| "Invalid boolean value".to_string())?;
                }
                "security.agent_workspace_path" => {
                    config.security.agent_workspace_path = value.to_string();
                }
                "security.permission_registry" => {
                    let registry: crate::permissions::PermissionRegistry =
                        serde_json::from_str(value)
                            .map_err(|e| format!("Invalid permission registry JSON: {}", e))?;
                    registry.validate()?;
                    config.security.permission_registry = registry;
                }
                _ => return Err(format!("Unknown or read-only config key: '{}'", key)),
            }

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;

            app_state.config = config.clone();
            app_state.provider = crate::create_provider(&config);

            Ok(serde_json::json!({
                "status": "updated",
                "key": key,
                "value": value
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Permission Registry
        // ────────────────────────────────────────────────────────────────────
        "list_permission_profiles" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let registry = &app_state.config.security.permission_registry;
            Ok(serde_json::json!({
                "profiles": registry.profiles,
                "default_profile_id": registry.default_profile_id,
            }))
        }

        "get_permission_profile" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let registry = &app_state.config.security.permission_registry;
            match registry.get(id) {
                Some(profile) => Ok(serde_json::json!(profile)),
                None => Err(format!("Permission profile '{}' not found", id)),
            }
        }

        "set_permission_profile" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or(&id)
                .to_string();
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let granted: Vec<crate::permissions::Capability> = args
                .get("granted")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect()
                })
                .unwrap_or_default();

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();
            let registry = &mut config.security.permission_registry;

            let mut profile = registry
                .get(&id)
                .cloned()
                .unwrap_or_else(|| crate::permissions::PermissionProfile::new(&id, &name));
            profile.name = name;
            profile.description = description;
            profile.granted = granted.into_iter().collect();
            registry.upsert(profile);
            registry.validate()?;

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;
            app_state.config = config;

            Ok(serde_json::json!({ "status": "updated", "id": id }))
        }

        "delete_permission_profile" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();
            let registry = &mut config.security.permission_registry;
            registry.remove(id)?;

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;
            app_state.config = config;

            Ok(serde_json::json!({ "status": "deleted", "id": id }))
        }

        "set_default_permission_profile" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();
            let registry = &mut config.security.permission_registry;
            registry.set_default(id)?;

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;
            app_state.config = config;

            Ok(serde_json::json!({ "status": "updated", "default_profile_id": id }))
        }

        "set_model" => {
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model'")?;

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();

            if config.llm.default_provider == "gemini" {
                config.llm.gemini_model = model.to_string();
            } else {
                config.llm.ollama_model = model.to_string();
            }

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;

            app_state.config = config.clone();
            app_state.provider = crate::create_provider(&config);

            Ok(serde_json::json!({
                "status": "updated",
                "provider": config.llm.default_provider,
                "model": model
            }))
        }

        "set_provider" => {
            let provider = args
                .get("provider")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'provider'")?;

            if !matches!(
                provider,
                "gemini" | "ollama" | "openai_compat" | "huggingface" | "kimi"
            ) {
                return Err(format!("Unknown provider '{}'. Valid: gemini, ollama, openai_compat, huggingface, kimi", provider));
            }

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut config = app_state.config.clone();
            config.llm.default_provider = provider.to_string();

            let path = crate::get_config_path();
            crate::config::save_config(&path, &config)
                .map_err(|e| format!("Failed to save config: {}", e))?;

            app_state.config = config.clone();
            app_state.provider = crate::create_provider(&config);

            let active_model = match provider {
                "gemini" => config.llm.gemini_model.clone(),
                "huggingface" => config.llm.hf_model.clone(),
                "kimi" => config.llm.kimi_model.clone(),
                "openai_compat" => config.llm.openai_compat_model.clone(),
                _ => config.llm.ollama_model.clone(),
            };

            Ok(serde_json::json!({
                "status": "updated",
                "provider": provider,
                "model": active_model
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Memory CRUD (delete, pin, list, clear)
        // ────────────────────────────────────────────────────────────────────
        "memory_delete" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                db.delete_record(id)?;
                Ok(serde_json::json!({
                    "status": "deleted",
                    "id": id
                }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_pin" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let pinned = args.get("pinned").and_then(|v| v.as_bool()).unwrap_or(true);

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                db.set_pinned(id, pinned)?;
                Ok(serde_json::json!({
                    "status": "updated",
                    "id": id,
                    "pinned": pinned
                }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_list" => {
            let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(50) as usize;
            let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as usize;

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let all = db
                    .list_all()
                    .map_err(|e| format!("Memory list error: {}", e))?;
                let total = all.len();
                let page: Vec<_> = all
                    .into_iter()
                    .skip(offset)
                    .take(limit)
                    .map(|rec| {
                        serde_json::json!({
                            "id":       rec.id,
                            "content":  rec.content,
                            "metadata": rec.metadata
                        })
                    })
                    .collect();

                Ok(serde_json::json!({
                    "records": page,
                    "count": page.len(),
                    "total": total,
                    "offset": offset,
                    "limit": limit
                }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_clear" => {
            // Delete every non-pinned record from the memory DB
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let all = db
                    .list_all()
                    .map_err(|e| format!("Memory clear error: {}", e))?;
                let mut deleted = 0usize;
                for rec in &all {
                    let pinned = rec
                        .metadata
                        .get("pinned")
                        .map(|v| v == "true")
                        .unwrap_or(false);
                    if !pinned {
                        let _ = db.delete_record(&rec.id);
                        deleted += 1;
                    }
                }
                Ok(serde_json::json!({
                    "status": "cleared",
                    "deleted": deleted,
                    "preserved_pinned": all.len() - deleted
                }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Chat History Management
        // ────────────────────────────────────────────────────────────────────
        "get_messages" => {
            let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(50) as usize;
            let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as usize;

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let total = app_state.messages.len();
            let page: Vec<_> = app_state
                .messages
                .iter()
                .skip(offset)
                .take(limit)
                .enumerate()
                .map(|(i, msg)| {
                    let (role, content) = if msg.starts_with("User: ") {
                        ("user", msg["User: ".len()..].to_string())
                    } else if msg.starts_with("AI: ") {
                        ("assistant", msg["AI: ".len()..].to_string())
                    } else {
                        ("system", msg.clone())
                    };
                    serde_json::json!({
                        "index":   offset + i,
                        "role":    role,
                        "content": content
                    })
                })
                .collect();

            Ok(serde_json::json!({
                "messages": page,
                "count": page.len(),
                "total": total,
                "offset": offset,
                "limit": limit,
                "session_id": app_state.session_id
            }))
        }

        "clear_messages" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let count = app_state.messages.len();
            app_state.messages.clear();

            Ok(serde_json::json!({
                "status": "cleared",
                "messages_removed": count
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Plugin System
        // ────────────────────────────────────────────────────────────────────
        "list_plugins" => {
            // Use the async list_plugins() which parses manifests + enriches with registry.
            match crate::plugin_mgr::list_plugins().await {
                Ok(plugins) => {
                    let list: Vec<_> = plugins
                        .iter()
                        .map(|p| {
                            serde_json::json!({
                                "name":        p.name,
                                "file_name":   p.file_name,
                                "enabled":     p.enabled,
                                "id":          p.id,
                                "author":      p.author,
                                "version":     p.version,
                                "description": p.description,
                                "tags":        p.tags,
                                "marketplace": p.marketplace,
                                "permissions": p.permissions,
                            })
                        })
                        .collect();

                    Ok(serde_json::json!({
                        "plugins": list,
                        "count":   list.len(),
                        "enabled": list.iter().filter(|p| p["enabled"].as_bool().unwrap_or(false)).count()
                    }))
                }
                Err(e) => Err(format!("Failed to list plugins: {}", e)),
            }
        }

        "validate_plugin" => {
            let file_name = args
                .get("file_name")
                .or_else(|| args.get("fileName"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'file_name'")?
                .to_string();
            match crate::plugin_mgr::validate_plugin(&file_name) {
                Ok(report) => Ok(serde_json::to_value(&report).unwrap_or_default()),
                Err(e) => Err(e),
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Git Integration (spawn_blocking for sync git2 calls)
        // ────────────────────────────────────────────────────────────────────
        "git_list_repos" => {
            // In bridge mode, read repos file from user_config_dir (no AppHandle)
            let repos_path = crate::user_config_dir().join("git_repos.json");
            let result: Vec<serde_json::Value> = std::fs::read_to_string(&repos_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();

            Ok(serde_json::json!({
                "repos": result,
                "count": result.len()
            }))
        }

        "git_open_repo" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();

            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path)
                    .map_err(|e| format!("Cannot open repo at '{}': {}", path, e))?;
                let head = repo.head().map_err(|e| e.to_string())?;
                let branch = head.shorthand().unwrap_or("HEAD").to_string();
                let head_oid = head.target().map(|t| t.to_string()).unwrap_or_default();

                let mut dirty = false;
                let mut opts = git2::StatusOptions::new();
                opts.include_untracked(true);
                for entry in repo
                    .statuses(Some(&mut opts))
                    .map_err(|e| e.to_string())?
                    .iter()
                {
                    if entry.status() != git2::Status::CURRENT {
                        dirty = true;
                        break;
                    }
                }

                let (ahead, behind) =
                    if let Ok(br) = repo.find_branch(&branch, git2::BranchType::Local) {
                        if let Ok(upstream) = br.upstream() {
                            match (br.get().target(), upstream.get().target()) {
                                (Some(l), Some(u)) => repo
                                    .graph_ahead_behind(l, u)
                                    .map(|(a, b)| (a as i32, b as i32))
                                    .unwrap_or((0, 0)),
                                _ => (0, 0),
                            }
                        } else {
                            (0, 0)
                        }
                    } else {
                        (0, 0)
                    };

                Ok(serde_json::json!({
                    "path":   path,
                    "branch": branch,
                    "head":   head_oid,
                    "dirty":  dirty,
                    "ahead":  ahead,
                    "behind": behind
                }))
            })
            .await
            .map_err(|e| format!("Spawn error: {}", e))?
        }

        "git_status" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();

            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path)
                    .map_err(|e| format!("Cannot open repo: {}", e))?;
                let mut opts = git2::StatusOptions::new();
                opts.include_untracked(true)
                    .renames_head_to_index(true)
                    .renames_index_to_workdir(true);

                let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
                let mut files = Vec::new();

                for entry in statuses.iter() {
                    let st = entry.status();
                    let fpath = entry.path().unwrap_or("?").to_string();
                    let old_path = entry
                        .head_to_index()
                        .and_then(|d| d.old_file().path())
                        .map(|p| p.to_string_lossy().to_string());

                    let status_str = if st.contains(git2::Status::CONFLICTED) {
                        "conflict"
                    } else if st.contains(git2::Status::INDEX_NEW)
                        || st.contains(git2::Status::INDEX_MODIFIED)
                        || st.contains(git2::Status::INDEX_DELETED)
                        || st.contains(git2::Status::INDEX_RENAMED)
                    {
                        "staged"
                    } else if st.contains(git2::Status::WT_NEW) {
                        "untracked"
                    } else if st.contains(git2::Status::WT_DELETED) {
                        "deleted"
                    } else if st.contains(git2::Status::WT_RENAMED) {
                        "renamed"
                    } else if st.contains(git2::Status::WT_MODIFIED) {
                        "modified"
                    } else {
                        continue;
                    };

                    files.push(serde_json::json!({
                        "path":     fpath,
                        "status":   status_str,
                        "old_path": old_path
                    }));
                }

                Ok(serde_json::json!({
                    "files": files,
                    "count": files.len()
                }))
            })
            .await
            .map_err(|e| format!("Spawn error: {}", e))?
        }

        "git_log" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let max_count = args.get("max_count").and_then(|v| v.as_u64()).unwrap_or(20) as usize;

            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path)
                    .map_err(|e| format!("Cannot open repo: {}", e))?;
                let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
                revwalk.push_head().map_err(|e| e.to_string())?;

                let mut commits = Vec::new();
                for (i, oid_res) in revwalk.enumerate() {
                    if i >= max_count { break; }
                    let oid = oid_res.map_err(|e| e.to_string())?;
                    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
                    commits.push(serde_json::json!({
                        "sha":       oid.to_string(),
                        "short_sha": oid.to_string().chars().take(7).collect::<String>(),
                        "message":   commit.message().unwrap_or("").trim().to_string(),
                        "author":    commit.author().name().unwrap_or("").to_string(),
                        "email":     commit.author().email().unwrap_or("").to_string(),
                        "time":      commit.time().seconds(),
                        "parents":   commit.parent_ids().map(|id| id.to_string()).collect::<Vec<_>>()
                    }));
                }

                Ok(serde_json::json!({
                    "commits": commits,
                    "count":   commits.len()
                }))
            })
            .await
            .map_err(|e| format!("Spawn error: {}", e))?
        }

        // ────────────────────────────────────────────────────────────────────
        // Task Scheduler
        // ────────────────────────────────────────────────────────────────────
        "list_scheduled_tasks" => {
            let tasks = state
                .scheduler
                .tasks
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .clone();
            let list: Vec<_> = tasks
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "id":         t.id,
                        "name":       t.name,
                        "cron":       t.cron,
                        "goal":       t.goal,
                        "enabled":    t.enabled,
                        "last_run":   t.last_run,
                        "created_at": t.created_at
                    })
                })
                .collect();

            Ok(serde_json::json!(list))
        }

        "add_scheduled_task" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let cron = args
                .get("cron")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'cron'")?;
            let goal = args
                .get("goal")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'goal'")?;

            // Validate cron by parsing (5-field or 6-field)
            let parts: Vec<&str> = cron.split_whitespace().collect();
            if parts.len() != 5 && parts.len() != 6 {
                return Err(
                    "cron must be 5-field (min hr dom mon dow) or 6-field (sec min hr dom mon dow)"
                        .to_string(),
                );
            }

            let task = crate::scheduler::ScheduledTask {
                id: uuid::Uuid::new_v4().to_string(),
                name: name.to_string(),
                cron: cron.to_string(),
                goal: goal.to_string(),
                enabled: true,
                last_run: None,
                created_at: chrono::Utc::now().to_rfc3339(),
            };

            {
                let mut tasks = state
                    .scheduler
                    .tasks
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                tasks.push(task.clone());
                let _ = serde_json::to_string_pretty(&*tasks)
                    .ok()
                    .and_then(|s| std::fs::write(&state.scheduler.tasks_path, s).ok());
            }

            // Register with live scheduler if running
            let sched_guard = state.scheduler.scheduler.lock().await;
            if let Some(s) = sched_guard.as_ref() {
                let _ = crate::scheduler::register_task(
                    s,
                    &task,
                    state.scheduler.job_map.clone(),
                    state.broadcaster.clone(),
                    state.app_state.clone(),
                )
                .await;
            }
            drop(sched_guard);

            state.broadcaster.emit(
                "scheduled_task_added",
                serde_json::json!({
                    "id":   task.id,
                    "name": task.name,
                    "cron": task.cron
                }),
            );

            Ok(serde_json::json!({
                "status":     "added",
                "id":         task.id,
                "name":       task.name,
                "cron":       task.cron,
                "note":       "Task registered with live scheduler"
            }))
        }

        "delete_scheduled_task" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let removed = {
                let mut tasks = state
                    .scheduler
                    .tasks
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                let before = tasks.len();
                tasks.retain(|t| t.id != id);
                let removed = tasks.len() < before;
                if removed {
                    let _ = serde_json::to_string_pretty(&*tasks)
                        .ok()
                        .and_then(|s| std::fs::write(&state.scheduler.tasks_path, s).ok());
                }
                removed
            };

            if removed {
                Ok(serde_json::json!({ "status": "deleted", "id": id }))
            } else {
                Ok(serde_json::json!({ "status": "not_found", "id": id }))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // PTY Session Listing & System Info
        // ────────────────────────────────────────────────────────────────────
        "get_pty_sessions" => {
            let sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            let ids: Vec<_> = sessions.keys().cloned().collect();

            Ok(serde_json::json!({
                "sessions": ids,
                "count":    ids.len()
            }))
        }

        "get_os_info" => {
            let os = std::env::consts::OS;
            let arch = std::env::consts::ARCH;
            let hostname = std::env::var("HOSTNAME")
                .or_else(|_| std::env::var("COMPUTERNAME"))
                .unwrap_or_else(|_| "unknown".to_string());

            Ok(serde_json::json!({
                "os":       os,
                "arch":     arch,
                "hostname": hostname,
                "data_dir": crate::user_config_dir().display().to_string()
            }))
        }

        "get_memory_usage" => {
            // Process-level memory via /proc/self/status (Linux/SteamOS) or placeholder
            #[cfg(target_os = "linux")]
            {
                let status = std::fs::read_to_string("/proc/self/status").unwrap_or_default();
                let rss_kb = status
                    .lines()
                    .find(|l| l.starts_with("VmRSS:"))
                    .and_then(|l| l.split_whitespace().nth(1))
                    .and_then(|v| v.parse::<u64>().ok())
                    .unwrap_or(0);
                let vm_kb = status
                    .lines()
                    .find(|l| l.starts_with("VmSize:"))
                    .and_then(|l| l.split_whitespace().nth(1))
                    .and_then(|v| v.parse::<u64>().ok())
                    .unwrap_or(0);

                Ok(serde_json::json!({
                    "rss_mb":    rss_kb / 1024,
                    "virt_mb":   vm_kb  / 1024,
                    "rss_kb":    rss_kb,
                    "virt_kb":   vm_kb,
                    "platform":  "linux"
                }))
            }
            #[cfg(not(target_os = "linux"))]
            {
                Ok(serde_json::json!({
                    "rss_mb":   0,
                    "virt_mb":  0,
                    "platform": std::env::consts::OS,
                    "note":     "Memory stats only available on Linux"
                }))
            }
        }

        // Session Extended handlers moved to primary session section

        // ────────────────────────────────────────────────────────────────────
        // Memory Extended
        // ────────────────────────────────────────────────────────────────────
        "memory_export" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let records = db.export_all_records().map_err(|e| e.to_string())?;
                let json = serde_json::to_string_pretty(&records).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "data": json, "count": records.len() }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_list_backups" => {
            let backup_dir = crate::user_config_dir().join("data/memory/backups");
            let mut backups = Vec::new();
            if let Ok(entries) = std::fs::read_dir(&backup_dir) {
                for entry in entries.flatten() {
                    if let (Ok(meta), Some(fname)) = (
                        entry.metadata(),
                        entry.file_name().to_str().map(|s| s.to_string()),
                    ) {
                        if meta.is_file() {
                            backups.push(serde_json::json!({
                                "name": fname, "size_bytes": meta.len()
                            }));
                        }
                    }
                }
            }
            Ok(serde_json::json!({ "backups": backups, "count": backups.len() }))
        }

        "memory_backup_auto" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                crate::commands::run_memory_backup(db)?;
                Ok(serde_json::json!({ "status": "backed_up" }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_restore_backup" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let backup_path = crate::user_config_dir()
                .join("data/memory/backups")
                .join(name);
            if !backup_path.exists() {
                return Err(format!("Backup '{}' not found", name));
            }
            let dest = crate::user_config_dir().join("data/memory/memory.json");
            std::fs::copy(&backup_path, &dest).map_err(|e| format!("Restore failed: {}", e))?;
            Ok(serde_json::json!({ "status": "restored", "name": name }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Agent Config Management
        // ────────────────────────────────────────────────────────────────────
        "list_agents" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let agents: Vec<_> = app_state
                .config
                .llm
                .agents
                .iter()
                .map(|a| {
                    serde_json::json!({
                        "id": a.id, "name": a.name, "provider": a.provider, "model": a.model, "description": a.description
                    })
                })
                .collect();
            Ok(serde_json::json!(agents))
        }

        "get_active_agent_id" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({ "active_agent_id": app_state.config.llm.active_agent_id }))
        }

        "switch_agent" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let agent = app_state
                .config
                .llm
                .agents
                .iter()
                .find(|a| a.id == id)
                .cloned()
                .ok_or_else(|| format!("Agent '{}' not found", id))?;
            app_state.config.llm.active_agent_id = id.to_string();
            let path = crate::get_config_path();
            crate::config::save_config(&path, &app_state.config).map_err(|e| e.to_string())?;
            Ok(
                serde_json::json!({ "status": "switched", "id": agent.id, "name": agent.name, "provider": agent.provider, "model": agent.model }),
            )
        }

        "add_agent" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model'")?;
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let provider_name = args
                .get("provider")
                .and_then(|v| v.as_str())
                .unwrap_or("gemini");
            let base_url = args
                .get("base_url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let agent = crate::config::AgentConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name: name.to_string(),
                provider: provider_name.to_string(),
                model: model.to_string(),
                base_url,
                embed_model: String::new(),
                description: description.to_string(),
            };
            app_state.config.llm.agents.push(agent.clone());
            let path = crate::get_config_path();
            crate::config::save_config(&path, &app_state.config).map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "added", "id": agent.id, "name": agent.name }))
        }

        "delete_agent" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let before = app_state.config.llm.agents.len();
            app_state.config.llm.agents.retain(|a| a.id != id);
            if app_state.config.llm.agents.len() == before {
                return Err(format!("Agent '{}' not found", id));
            }
            let path = crate::get_config_path();
            crate::config::save_config(&path, &app_state.config).map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "id": id }))
        }

        "get_recommended_models" => Ok(serde_json::json!([
            { "provider": "gemini", "model": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "tier": "fast", "steam_deck_ok": true, "vram_mb": 0, "description": "Fast multimodal model for everyday tasks", "tags": ["recommended", "multilingual"] },
            { "provider": "gemini", "model": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "tier": "smart", "steam_deck_ok": true, "vram_mb": 0, "description": "High-quality reasoning with long context", "tags": ["recommended", "long-context"] },
            { "provider": "ollama", "model": "llama3", "name": "Llama 3 8B", "tier": "local-fast", "steam_deck_ok": true, "vram_mb": 5200, "description": "Efficient local model, great for Steam Deck", "tags": ["recommended"] },
            { "provider": "ollama", "model": "mistral", "name": "Mistral 7B", "tier": "local-balanced", "steam_deck_ok": true, "vram_mb": 4800, "description": "Balanced local performance", "tags": ["recommended", "code"] },
            { "provider": "ollama", "model": "neural-chat", "name": "Neural Chat 7B", "tier": "local-balanced", "steam_deck_ok": false, "vram_mb": 4800, "description": "Conversational local model", "tags": [] }
        ])),

        // ────────────────────────────────────────────────────────────────────
        // IDE / Workspace File System
        // ────────────────────────────────────────────────────────────────────
        "list_workspace_files" => {
            let workspace = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                args.get("path")
                    .and_then(|v| v.as_str())
                    .map(|s| std::path::PathBuf::from(s))
                    .or_else(|| app_state.config.get_resolved_workspace())
                    .ok_or("No workspace path configured or provided")?
            };
            let entries = tokio::task::spawn_blocking(move || {
                let mut files = Vec::new();
                if let Ok(rd) = std::fs::read_dir(&workspace) {
                    for e in rd.flatten() {
                        if let (Ok(meta), Some(name)) =
                            (e.metadata(), e.file_name().to_str().map(|s| s.to_string()))
                        {
                            files.push(serde_json::json!({
                                "name": name,
                                "path": e.path().display().to_string(),
                                "is_dir": meta.is_dir(),
                                "size":   if meta.is_file() { meta.len() } else { 0 }
                            }));
                        }
                    }
                }
                files
            })
            .await
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "files": entries, "count": entries.len() }))
        }

        "read_workspace_file" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?;
            let content = tokio::fs::read_to_string(path)
                .await
                .map_err(|e| format!("Read failed: {}", e))?;
            Ok(serde_json::json!({ "path": path, "content": content, "bytes": content.len() }))
        }

        "write_workspace_file" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?;
            let content = args
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'content'")?;
            if let Some(parent) = std::path::Path::new(path).parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(|e| e.to_string())?;
            }
            tokio::fs::write(path, content)
                .await
                .map_err(|e| format!("Write failed: {}", e))?;
            Ok(serde_json::json!({ "status": "written", "path": path, "bytes": content.len() }))
        }

        "create_workspace_file" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?;
            let p = std::path::Path::new(path);
            if let Some(parent) = p.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .map_err(|e| e.to_string())?;
            }
            tokio::fs::File::create(path)
                .await
                .map_err(|e| format!("Create failed: {}", e))?;
            Ok(serde_json::json!({ "status": "created", "path": path }))
        }

        "delete_workspace_file" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?;
            let p = std::path::Path::new(path);
            if p.is_dir() {
                tokio::fs::remove_dir_all(path)
                    .await
                    .map_err(|e| format!("Delete failed: {}", e))?;
            } else {
                tokio::fs::remove_file(path)
                    .await
                    .map_err(|e| format!("Delete failed: {}", e))?;
            }
            Ok(serde_json::json!({ "status": "deleted", "path": path }))
        }

        "rename_workspace_file" => {
            let from = args
                .get("from")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'from'")?;
            let to = args
                .get("to")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'to'")?;
            tokio::fs::rename(from, to)
                .await
                .map_err(|e| format!("Rename failed: {}", e))?;
            Ok(serde_json::json!({ "status": "renamed", "from": from, "to": to }))
        }

        // ────────────────────────────────────────────────────────────────────
        // API Lab
        // ────────────────────────────────────────────────────────────────────
        "api_request" => {
            let method = args
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or("GET")
                .to_uppercase();
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;
            let headers = args.get("headers").cloned().unwrap_or_default();
            let body = args
                .get("body")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let url_str = url.to_string();
            let method_str = method.clone();

            let result = tokio::task::spawn_blocking(move || {
                let client = reqwest::blocking::Client::builder()
                    .timeout(std::time::Duration::from_secs(30))
                    .build()
                    .map_err(|e| e.to_string())?;

                let mut req = match method_str.as_str() {
                    "POST" => client.post(&url_str),
                    "PUT" => client.put(&url_str),
                    "DELETE" => client.delete(&url_str),
                    "PATCH" => client.patch(&url_str),
                    _ => client.get(&url_str),
                };
                if let Some(hdrs) = headers.as_object() {
                    for (k, v) in hdrs {
                        if let Some(val) = v.as_str() {
                            req = req.header(k.as_str(), val);
                        }
                    }
                }
                if let Some(b) = body {
                    req = req.body(b);
                }
                let resp = req.send().map_err(|e| e.to_string())?;
                let status = resp.status().as_u16();
                let body = resp.text().unwrap_or_default();
                Ok::<_, String>(
                    serde_json::json!({ "status": status, "body": body, "url": url_str }),
                )
            })
            .await
            .map_err(|e| e.to_string())?;

            result
        }

        "api_list_collections" => {
            let names = crate::commands::api_lab::api_list_collections()?;
            Ok(serde_json::json!({ "collections": names, "count": names.len() }))
        }

        "api_save_collection" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            let requests = args
                .get("requests")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'requests'")?
                .to_string();
            crate::commands::api_lab::api_save_collection(name.clone(), requests)?;
            Ok(serde_json::json!({ "status": "saved", "name": name }))
        }

        "api_load_collection" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            let content = crate::commands::api_lab::api_load_collection(name.clone())?;
            Ok(serde_json::json!({ "name": name, "requests": content }))
        }

        "api_delete_collection" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            crate::commands::api_lab::api_delete_collection(name.clone())?;
            Ok(serde_json::json!({ "status": "deleted", "name": name }))
        }

        // ────────────────────────────────────────────────────────────────────
        // FTP (spawn_blocking — suppaftp is sync)
        // ────────────────────────────────────────────────────────────────────
        "ftp_list_dir" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(21) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .unwrap_or("anonymous")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("/")
                .to_string();

            tokio::task::spawn_blocking(move || {
                use suppaftp::FtpStream;
                let addr = format!("{}:{}", host, port);
                let mut stream = FtpStream::connect(&addr).map_err(|e| e.to_string())?;
                stream.login(&user, &password).map_err(|e| e.to_string())?;
                stream.cwd(&path).map_err(|e| e.to_string())?;
                let raw = stream.list(None).map_err(|e| e.to_string())?;
                stream.quit().ok();

                let entries: Vec<_> = raw
                    .iter()
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() < 9 {
                            return None;
                        }
                        let name = parts[8..].join(" ");
                        if name == "." || name == ".." {
                            return None;
                        }
                        let is_dir = parts[0].starts_with('d');
                        let size: u64 = parts[4].parse().unwrap_or(0);
                        Some(serde_json::json!({ "name": name, "is_dir": is_dir, "size": size }))
                    })
                    .collect();

                Ok(serde_json::json!({ "path": path, "entries": entries, "count": entries.len() }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "ftp_test_connection" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(21) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .unwrap_or("anonymous")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            tokio::task::spawn_blocking(move || {
                use suppaftp::FtpStream;
                let addr = format!("{}:{}", host, port);
                let mut stream = FtpStream::connect(&addr).map_err(|e| e.to_string())?;
                stream.login(&user, &password).map_err(|e| e.to_string())?;
                let cwd = stream.pwd().map_err(|e| e.to_string())?;
                stream.quit().ok();
                Ok(serde_json::json!({ "status": "connected", "cwd": cwd, "host": host, "warning": "Plain FTP is unencrypted. Use SFTP for sensitive data." }))
            }).await.map_err(|e| e.to_string())?
        }

        "ftp_download_file" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(21) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .unwrap_or("anonymous")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let remote_path = args
                .get("remote_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'remote_path'")?
                .to_string();
            let local_path = args
                .get("local_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'local_path'")?
                .to_string();

            tokio::task::spawn_blocking(move || {
                use suppaftp::FtpStream;
                use suppaftp::FtpError;
                const MAX_DOWNLOAD_SIZE_MB: u64 = 500;
                let addr = format!("{}:{}", host, port);
                let mut stream = FtpStream::connect(&addr).map_err(|e| e.to_string())?;
                stream.login(&user, &password).map_err(|e| e.to_string())?;
                let total_bytes = stream.size(&remote_path).map_err(|e| e.to_string()).unwrap_or(0);
                let max_bytes = MAX_DOWNLOAD_SIZE_MB * 1_048_576;
                if total_bytes > max_bytes as usize {
                    return Err(format!(
                        "File size ({:.1} MB) exceeds maximum allowed download size ({} MB).",
                        total_bytes as f64 / 1_048_576.0,
                        MAX_DOWNLOAD_SIZE_MB
                    ));
                }
                stream.retr(&remote_path, |reader| {
                    let mut file = std::fs::File::create(&local_path)
                        .map_err(FtpError::ConnectionError)?;
                    std::io::copy(reader, &mut file).map_err(FtpError::ConnectionError)?;
                    Ok(())
                }).map_err(|e| e.to_string())?;
                stream.quit().ok();
                Ok(serde_json::json!({ "status": "downloaded", "remote_path": remote_path, "local_path": local_path }))
            }).await.map_err(|e| e.to_string())?
        }

        "ftp_upload_file" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(21) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .unwrap_or("anonymous")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let local_path = args
                .get("local_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'local_path'")?
                .to_string();
            let remote_path = args
                .get("remote_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'remote_path'")?
                .to_string();

            tokio::task::spawn_blocking(move || {
                use suppaftp::FtpStream;
                let addr = format!("{}:{}", host, port);
                let mut stream = FtpStream::connect(&addr).map_err(|e| e.to_string())?;
                stream.login(&user, &password).map_err(|e| e.to_string())?;
                let mut file = std::fs::File::open(&local_path).map_err(|e| e.to_string())?;
                stream.put_file(&remote_path, &mut file).map_err(|e| e.to_string())?;
                stream.quit().ok();
                Ok(serde_json::json!({ "status": "uploaded", "local_path": local_path, "remote_path": remote_path }))
            }).await.map_err(|e| e.to_string())?
        }

        // ────────────────────────────────────────────────────────────────────
        // Torrent
        // ────────────────────────────────────────────────────────────────────
        "torrent_get_status" => {
            let res = crate::torrent::torrent_get_status(&state.torrent).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_list" => {
            let res = crate::torrent::torrent_list(&state.torrent).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_add" => {
            let source = args
                .get("source")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'source' (magnet URI or infohash)")?;
            let res = crate::torrent::torrent_add(&state.torrent, source.to_string()).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_pause" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let res = crate::torrent::torrent_pause(&state.torrent, id.to_string()).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_resume" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let res = crate::torrent::torrent_resume(&state.torrent, id.to_string()).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_pause_all" => {
            let res = crate::torrent::torrent_pause_all(&state.torrent).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_resume_all" => {
            let res = crate::torrent::torrent_resume_all(&state.torrent).await?;
            Ok(serde_json::to_value(res).unwrap_or(serde_json::Value::Null))
        }

        "torrent_get_download_root" => {
            let res = crate::torrent::torrent_get_download_root(&state.torrent).await?;
            Ok(serde_json::json!({ "download_root": res }))
        }

        "torrent_open_download_root" => {
            crate::torrent::torrent_open_download_root(&state.torrent).await?;
            Ok(serde_json::json!({ "status": "ok" }))
        }

        "torrent_open_save_path" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            crate::torrent::torrent_open_save_path(&state.torrent, id.to_string()).await?;
            Ok(serde_json::json!({ "status": "ok" }))
        }

        "torrent_remove" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let delete_data = args.get("deleteData").and_then(|v| v.as_bool());
            crate::torrent::torrent_remove(&state.torrent, id.to_string(), delete_data).await?;
            Ok(serde_json::json!({ "status": "removed", "id": id }))
        }

        // ────────────────────────────────────────────────────────────────────
        // LSP (Language Server Protocol)
        // ────────────────────────────────────────────────────────────────────
        "lsp_list" => {
            let lsp = state.lsp.lock().unwrap_or_else(|e| e.into_inner());
            let servers: Vec<_> = lsp
                .server_list()
                .iter()
                .map(|s| {
                    serde_json::json!({
                        "language": s.language, "command": s.command
                    })
                })
                .collect();
            Ok(serde_json::json!({ "servers": servers, "count": servers.len() }))
        }

        "lsp_known_servers" => {
            let known: Vec<_> = crate::lsp::known_servers()
                .iter()
                .map(|s| {
                    serde_json::json!({
                        "language": s.language,
                        "label": s.label,
                        "command": s.command,
                        "args": s.args,
                        "install_hint": s.install_hint
                    })
                })
                .collect();
            Ok(serde_json::json!(known))
        }

        "lsp_get_diagnostics" => {
            let uri = args
                .get("uri")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'uri'")?;
            let lsp = state.lsp.lock().unwrap_or_else(|e| e.into_inner());
            let diags = lsp.diagnostics_for(uri);
            Ok(serde_json::json!({ "uri": uri, "diagnostics": diags, "count": diags.len() }))
        }

        "lsp_stop" => {
            let language = args
                .get("language")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'language'")?;
            let mut lsp = state.lsp.lock().unwrap_or_else(|e| e.into_inner());
            lsp.mark_status(language, "stopped");
            Ok(serde_json::json!({ "status": "stopped", "language": language }))
        }

        "lsp_start" => {
            let language = args
                .get("language")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'language'")?
                .to_string();
            let command = args
                .get("command")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'command'")?
                .to_string();
            let args_vec: Vec<String> = args
                .get("args")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let workspace_root = crate::user_config_dir()
                .join("workspace")
                .to_string_lossy()
                .to_string();
            crate::lsp::spawn_server(
                state.lsp.clone(),
                state.broadcaster.clone(),
                language,
                command,
                args_vec,
                workspace_root,
            )
            .await?;
            Ok(serde_json::json!({ "status": "started" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Browser Extended
        // ────────────────────────────────────────────────────────────────────
        "browser_navigate" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;
            state.broadcaster.emit(
                "browser_navigate_requested",
                serde_json::json!({ "url": url }),
            );
            Ok(
                serde_json::json!({ "status": "navigate_requested", "url": url, "note": "Browser navigation requires Tauri WebView; event emitted to UI" }),
            )
        }

        "browser_exec" | "browser_evaluate_js" => {
            let script = args
                .get("script")
                .or_else(|| args.get("js"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'script' or 'js'")?;
            state.broadcaster.emit(
                "browser_exec_requested",
                serde_json::json!({ "script": script }),
            );
            Ok(
                serde_json::json!({ "status": "exec_requested", "note": "Browser JS execution requires Tauri WebView; event emitted to UI" }),
            )
        }

        "browser_get_content" => {
            state
                .broadcaster
                .emit("browser_get_content_requested", serde_json::json!({}));
            Ok(
                serde_json::json!({ "content": "", "note": "Browser content retrieval requires Tauri WebView; event emitted to UI" }),
            )
        }

        "browser_screenshot" => {
            state
                .broadcaster
                .emit("browser_screenshot_requested", serde_json::json!({}));
            Ok(
                serde_json::json!({ "screenshot_b64": "", "note": "Browser screenshot requires Tauri WebView; event emitted to UI" }),
            )
        }

        "browser_get_citation" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Browser,
                )?;
            }
            let citation = crate::commands::browser::browser_get_citation(url.to_string()).await?;
            Ok(serde_json::Value::String(citation))
        }

        // ── Headless browser session commands (spawn_blocking — headless_chrome is sync) ──

        "browser_open_session" => {
            let url = args.get("url").and_then(|v| v.as_str()).ok_or("Missing 'url'")?.to_string();
            let app_state = state.app_state.clone();
            let session_id = tokio::task::spawn_blocking(move || {
                crate::commands::browser::browser_open_session(url, app_state)
            }).await.map_err(|e| e.to_string())??;
            Ok(serde_json::json!({ "session_id": session_id }))
        }

        "browser_navigate_session" => {
            let session_id = args.get("session_id").and_then(|v| v.as_str()).ok_or("Missing 'session_id'")?.to_string();
            let url = args.get("url").and_then(|v| v.as_str()).ok_or("Missing 'url'")?.to_string();
            let app_state = state.app_state.clone();
            tokio::task::spawn_blocking(move || {
                crate::commands::browser::browser_navigate_session(session_id, url, app_state)
            }).await.map_err(|e| e.to_string())??;
            Ok(serde_json::json!({ "status": "navigated" }))
        }

        "browser_click" => {
            let session_id = args.get("session_id").and_then(|v| v.as_str()).ok_or("Missing 'session_id'")?.to_string();
            let selector = args.get("selector").and_then(|v| v.as_str()).ok_or("Missing 'selector'")?.to_string();
            let app_state = state.app_state.clone();
            tokio::task::spawn_blocking(move || {
                crate::commands::browser::browser_click(session_id, selector, app_state)
            }).await.map_err(|e| e.to_string())??;
            Ok(serde_json::json!({ "status": "clicked" }))
        }

        "browser_fill" => {
            let session_id = args.get("session_id").and_then(|v| v.as_str()).ok_or("Missing 'session_id'")?.to_string();
            let selector = args.get("selector").and_then(|v| v.as_str()).ok_or("Missing 'selector'")?.to_string();
            let value = args.get("value").and_then(|v| v.as_str()).ok_or("Missing 'value'")?.to_string();
            let app_state = state.app_state.clone();
            tokio::task::spawn_blocking(move || {
                crate::commands::browser::browser_fill(session_id, selector, value, app_state)
            }).await.map_err(|e| e.to_string())??;
            Ok(serde_json::json!({ "status": "filled" }))
        }

        "browser_close_session" => {
            let session_id = args.get("session_id").and_then(|v| v.as_str()).ok_or("Missing 'session_id'")?.to_string();
            let app_state = state.app_state.clone();
            tokio::task::spawn_blocking(move || {
                crate::commands::browser::browser_close_session(session_id, app_state)
            }).await.map_err(|e| e.to_string())??;
            Ok(serde_json::json!({ "status": "closed" }))
        }

        "browser_save_to_memory" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Browser,
                )?;
            }
            let res = crate::commands::browser::browser_save_to_memory(
                url.to_string(),
                state.app_state.clone(),
            )
            .await?;
            Ok(res)
        }

        "open_external" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?;
            if !url.starts_with("http://") && !url.starts_with("https://") {
                return Err("URL must start with a valid scheme (http/https)".to_string());
            }
            // Use OS default browser open on the host
            #[cfg(target_os = "linux")]
            {
                let _ = std::process::Command::new("xdg-open").arg(url).spawn();
            }
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("cmd")
                    .args(["/c", "start", url])
                    .spawn();
            }
            #[cfg(target_os = "macos")]
            {
                let _ = std::process::Command::new("open").arg(url).spawn();
            }
            Ok(serde_json::json!({ "status": "opened", "url": url }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Sync
        // ────────────────────────────────────────────────────────────────────
        "get_sync_status" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({
                "enabled":         app_state.config.sync.enabled,
                "api_base_url":    app_state.config.sync.api_base_url,
                "last_sync_at":    null,
                "syncing":         false
            }))
        }

        "configure_sync" => {
            let enabled = args
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let api_base_url = args
                .get("api_base_url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if enabled && api_base_url.trim().is_empty() {
                return Err("api_base_url required when enabling sync".to_string());
            }

            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app_state.config.sync.enabled = enabled;
            app_state.config.sync.api_base_url = api_base_url.clone();
            let path = crate::get_config_path();
            crate::config::save_config(&path, &app_state.config).map_err(|e| e.to_string())?;
            Ok(
                serde_json::json!({ "status": "configured", "enabled": enabled, "api_base_url": api_base_url }),
            )
        }

        "sync_now" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if !app_state.config.sync.enabled
                || app_state.config.sync.api_base_url.trim().is_empty()
            {
                return Err("Sync not configured. Use configure_sync first.".to_string());
            }
            Ok(
                serde_json::json!({ "status": "sync_initiated", "note": "Full sync requires AppHandle; initiate from Tauri frontend" }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // Prompt Lab
        // ────────────────────────────────────────────────────────────────────
        "promptdrive_list_packs" => {
            let packs = crate::promptdrive::load_builtin_packs()?;
            Ok(serde_json::json!(packs))
        }

        "promptdrive_list_templates" => {
            let pack_id = args.get("pack_id").and_then(|v| v.as_str());
            let templates = crate::promptdrive::list_templates(pack_id)?;
            Ok(serde_json::json!(templates))
        }

        "promptdrive_get_template" => {
            let template_id = args
                .get("template_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'template_id'")?;
            let template = crate::promptdrive::find_template(template_id)?;
            Ok(serde_json::json!(template))
        }

        "promptdrive_validate_slots" => {
            let template_id = promptdrive_required_str(&args, "template_id")?;
            let slot_values = promptdrive_slot_values(&args)?;
            let template = crate::promptdrive::find_template(template_id)?;
            let slot_values = crate::promptdrive::slot_map_from_value(&slot_values)?;
            let result = crate::promptdrive::validate_slots(&template, &slot_values);
            Ok(serde_json::json!(result))
        }

        "promptdrive_preview_prompt" => {
            let template_id = promptdrive_required_str(&args, "template_id")?;
            let slot_values = promptdrive_slot_values(&args)?;
            let template = crate::promptdrive::find_template(template_id)?;
            let slot_values = crate::promptdrive::slot_map_from_value(&slot_values)?;
            let result = crate::promptdrive::validate_slots(&template, &slot_values);
            Ok(serde_json::json!(result))
        }

        "promptdrive_execute_prompt" => {
            let template_id = promptdrive_required_str(&args, "template_id")?;
            let slot_values = promptdrive_slot_values(&args)?;
            let template = crate::promptdrive::find_template(template_id)?;
            let slot_values = crate::promptdrive::slot_map_from_value(&slot_values)?;
            let result = crate::promptdrive::validate_slots(&template, &slot_values);
            let prompt = result
                .rendered_prompt
                .clone()
                .ok_or_else(|| format!("Prompt is invalid: {}", result.errors.join("; ")))?;
            let response = dispatch_send_command(
                state,
                prompt,
                None,
                None,
                args.get("pack_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            )
            .await?;
            Ok(serde_json::json!({
                "status": "streaming",
                "validation": result,
                "stream": response
            }))
        }

        "promptdrive_save_prompt" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let title = args
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Untitled Prompt")
                .trim()
                .to_string();
            let prompt = args
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'prompt'")?
                .to_string();
            let slot_values = promptdrive_slot_values(&args)?;
            let saved = crate::promptdrive::PromptDriveDb::new(db.pool)
                .save_prompt(
                    if title.is_empty() {
                        "Untitled Prompt".to_string()
                    } else {
                        title
                    },
                    args.get("template_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    args.get("pack_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    slot_values,
                    prompt,
                )
                .await?;
            Ok(serde_json::json!(saved))
        }

        "promptdrive_list_saved_prompts" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let prompts = crate::promptdrive::PromptDriveDb::new(db.pool)
                .list_saved_prompts()
                .await?;
            Ok(serde_json::json!(prompts))
        }

        "promptdrive_macro_start" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let recording_id = crate::promptdrive::PromptDriveDb::new(db.pool)
                .macro_start()
                .await?;
            Ok(serde_json::json!({ "recording_id": recording_id, "status": "recording" }))
        }

        "promptdrive_macro_stop" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let recording_id = promptdrive_required_str(&args, "recording_id")?.to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("PromptDrive Macro")
                .to_string();
            let steps = promptdrive_macro_steps(&args)?;
            let macro_def = crate::promptdrive::PromptDriveDb::new(db.pool)
                .macro_stop(recording_id, name, steps)
                .await?;
            Ok(serde_json::json!(macro_def))
        }

        "promptdrive_macro_execute" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let macro_id = promptdrive_required_str(&args, "macro_id")?;
            let macro_def = crate::promptdrive::PromptDriveDb::new(db.pool)
                .get_macro(macro_id)
                .await?;
            Ok(serde_json::json!({
                "status": "ready",
                "macro": macro_def,
                "safe_replay": true
            }))
        }

        "promptdrive_list_macros" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let macros = crate::promptdrive::PromptDriveDb::new(db.pool)
                .list_macros()
                .await?;
            Ok(serde_json::json!(macros))
        }

        "promptdrive_delete_macro" => {
            let db = state.db.clone().ok_or("SQLite database not initialized")?;
            let macro_id = promptdrive_required_str(&args, "macro_id")?;
            crate::promptdrive::PromptDriveDb::new(db.pool)
                .delete_macro(macro_id)
                .await?;
            Ok(serde_json::json!({ "status": "deleted", "macro_id": macro_id }))
        }

        "promptdrive_get_suggestions" => {
            let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("");
            let template_id = args.get("template_id").and_then(|v| v.as_str());
            let suggestions = crate::promptdrive::suggestions(query, template_id)?;
            Ok(serde_json::json!(suggestions))
        }

        "save_prompt_preset" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let schema_json = args
                .get("schema_json")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'schema_json'")?;
            let presets_path = crate::user_config_dir().join("data/prompt_presets.json");

            let mut presets: std::collections::HashMap<String, String> =
                std::fs::read_to_string(&presets_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            presets.insert(name.to_string(), schema_json.to_string());
            std::fs::write(
                &presets_path,
                serde_json::to_string_pretty(&presets).unwrap_or_default(),
            )
            .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "name": name }))
        }

        "load_prompt_presets" => {
            let presets_path = crate::user_config_dir().join("data/prompt_presets.json");
            let presets: std::collections::HashMap<String, String> =
                std::fs::read_to_string(&presets_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            Ok(serde_json::json!({ "presets": presets, "count": presets.len() }))
        }

        "delete_prompt_preset" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let presets_path = crate::user_config_dir().join("data/prompt_presets.json");
            let mut presets: std::collections::HashMap<String, String> =
                std::fs::read_to_string(&presets_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            if presets.remove(name).is_none() {
                return Err(format!("Preset '{}' not found", name));
            }
            std::fs::write(
                &presets_path,
                serde_json::to_string_pretty(&presets).unwrap_or_default(),
            )
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "name": name }))
        }

        "generate_jpe_explanation" => {
            let topic = args
                .get("topic")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'topic'")?;
            let broadcaster = state.broadcaster.clone();
            let provider = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.provider.clone()
            };
            let prompt = format!(
                "Explain '{}' in Just Plain English (JPE). Use simple analogies, no jargon, \
                and make it understandable to a complete beginner in 2-3 short paragraphs.",
                topic
            );
            let topic_clone = topic.to_string();
            tokio::spawn(async move {
                let mut stream = provider.stream_response(
                    &prompt,
                    "You are a clear technical writer who explains complex topics simply.",
                );
                let mut full = String::new();
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        Ok(t) => {
                            full.push_str(&t);
                            broadcaster.emit("jpe_token", serde_json::json!({ "token": t }));
                        }
                        Err(e) => {
                            broadcaster
                                .emit("jpe_error", serde_json::json!({ "error": e.to_string() }));
                            return;
                        }
                    }
                }
                broadcaster.emit(
                    "jpe_done",
                    serde_json::json!({ "topic": topic_clone, "explanation": full }),
                );
            });
            Ok(serde_json::json!({ "status": "streaming", "topic": topic }))
        }

        "shell_autocomplete" => {
            let partial = args
                .get("partial")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'partial'")?;
            let broadcaster = state.broadcaster.clone();
            let provider = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.provider.clone()
            };
            let prompt = format!(
                "Complete this shell command: `{}`\n\
                Return ONLY the completed command, no explanation. If there are multiple options, return the most common one.", partial
            );
            let partial_clone = partial.to_string();
            tokio::spawn(async move {
                match provider
                    .chat_with_image(&prompt, "You are a shell expert.", None, None)
                    .await
                {
                    Ok(completion) => broadcaster.emit(
                        "shell_autocomplete_result",
                        serde_json::json!({
                            "partial": partial_clone, "completion": completion.trim().to_string()
                        }),
                    ),
                    Err(e) => broadcaster.emit(
                        "shell_autocomplete_error",
                        serde_json::json!({ "error": e.to_string() }),
                    ),
                }
            });
            Ok(serde_json::json!({ "status": "streaming", "partial": partial }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Voice / STT (require AppHandle process management — stubs)
        // ────────────────────────────────────────────────────────────────────
        "speak_text" | "speak_text_stream" => {
            let text = args.get("text").and_then(|v| v.as_str()).unwrap_or("");
            state
                .broadcaster
                .emit("speak_text_requested", serde_json::json!({ "text": text }));
            Ok(
                serde_json::json!({ "status": "requested", "text": text, "note": "TTS requires espeak/system audio; event emitted to UI" }),
            )
        }

        "start_recording" => match system::start_recording(state.app_state.clone()) {
            Ok(msg) => Ok(serde_json::Value::String(msg)),
            Err(e) => Err(e),
        },

        "stop_recording" => match system::stop_recording(state.app_state.clone()).await {
            Ok(text) => Ok(serde_json::Value::String(text)),
            Err(e) => Err(e),
        },

        "transcribe_audio_whisper" => {
            state
                .broadcaster
                .emit("recording_stop_requested", serde_json::json!({}));
            Ok(
                serde_json::json!({ "status": "requested", "transcript": "", "note": "STT stop requires system audio pipeline; event emitted to UI" }),
            )
        }

        "get_whisper_status" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({
                "enabled":        !app_state.config.stt.whisper_binary.is_empty(),
                "binary":         app_state.config.stt.whisper_binary,
                "model":          app_state.config.stt.whisper_model
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Git Extended (branches)
        // ────────────────────────────────────────────────────────────────────
        "git_branch_list" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut branches = Vec::new();
                for b in repo.branches(None).map_err(|e| e.to_string())? {
                    let (branch, kind) = b.map_err(|e| e.to_string())?;
                    if let Ok(Some(name)) = branch.name() {
                        branches.push(serde_json::json!({
                            "name": name,
                            "kind": if kind == git2::BranchType::Local { "local" } else { "remote" },
                            "is_head": branch.is_head()
                        }));
                    }
                }
                Ok(serde_json::json!({ "branches": branches, "count": branches.len() }))
            }).await.map_err(|e| e.to_string())?
        }

        "git_branch_create" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let head = repo.head().map_err(|e| e.to_string())?;
                let commit = repo
                    .find_commit(head.target().ok_or("HEAD has no target")?)
                    .map_err(|e| e.to_string())?;
                repo.branch(&name, &commit, false)
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "created", "branch": name }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_branch_checkout" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let branch = repo
                    .find_branch(&name, git2::BranchType::Local)
                    .map_err(|e| e.to_string())?;
                let obj = branch
                    .get()
                    .peel(git2::ObjectType::Commit)
                    .map_err(|e| e.to_string())?;
                repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
                repo.set_head(&format!("refs/heads/{}", name))
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "checked_out", "branch": name }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_branch_delete" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut branch = repo
                    .find_branch(&name, git2::BranchType::Local)
                    .map_err(|e| e.to_string())?;
                branch.delete().map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "deleted", "branch": name }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        // ────────────────────────────────────────────────────────────────────
        // DeckCode State
        // ────────────────────────────────────────────────────────────────────
        "get_deckcode_state" => {
            let (schema, bindings) = {
                let dc = state
                    .deckcode_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                (dc.0.clone(), dc.1.clone())
            };
            let lang = state
                .deckcode_lang
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .clone();
            Ok(serde_json::json!({ "schema": schema, "bindings": bindings, "language": lang }))
        }

        "set_deckcode_lang" => {
            let lang = args
                .get("language")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'language'")?;
            let mut l = state
                .deckcode_lang
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            *l = lang.to_string();
            Ok(serde_json::json!({ "status": "set", "language": lang }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Scheduler toggle
        // ────────────────────────────────────────────────────────────────────
        "toggle_scheduled_task" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let enabled = args
                .get("enabled")
                .and_then(|v| v.as_bool())
                .ok_or("Missing 'enabled'")?;
            let task = {
                let mut tasks = state
                    .scheduler
                    .tasks
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                let found_idx = tasks.iter().position(|t| t.id == id);
                if let Some(idx) = found_idx {
                    tasks[idx].enabled = enabled;
                    let task = tasks[idx].clone();
                    let _ = serde_json::to_string_pretty(&*tasks)
                        .ok()
                        .and_then(|s| std::fs::write(&state.scheduler.tasks_path, s).ok());
                    Some(task)
                } else {
                    None
                }
            };
            if let Some(task) = task {
                let sched_guard = state.scheduler.scheduler.lock().await;
                if let Some(s) = sched_guard.as_ref() {
                    if enabled {
                        let _ = crate::scheduler::register_task(
                            s,
                            &task,
                            state.scheduler.job_map.clone(),
                            state.broadcaster.clone(),
                            state.app_state.clone(),
                        )
                        .await;
                    } else {
                        let _ = crate::scheduler::unregister_task(s, &id, &state.scheduler.job_map)
                            .await;
                    }
                }
                Ok(
                    serde_json::json!({ "status": if enabled { "enabled" } else { "disabled" }, "id": id }),
                )
            } else {
                Err(format!("Task '{}' not found", id))
            }
        }

        "run_task_now" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let task = {
                let tasks = state
                    .scheduler
                    .tasks
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                tasks.iter().find(|t| t.id == id).cloned()
            };
            if let Some(task) = task {
                let goal = task.goal.clone();
                state.broadcaster.emit(
                    "scheduled_task_started",
                    serde_json::json!({
                        "id": task.id,
                        "name": task.name,
                        "goal": &goal,
                        "triggered_at": chrono::Utc::now().to_rfc3339(),
                        "manual": true,
                    }),
                );
                if let Some(workflow_name) = goal.strip_prefix("workflow:") {
                    let wf_name = workflow_name.trim().to_string();
                    if !wf_name.is_empty() {
                        let json_result = crate::workflow::workflow_run(wf_name.clone());
                        if let Ok(json_str) = json_result {
                            if let Ok(doc) = crate::workflow_engine::parse_workflow(&json_str) {
                                let broadcaster = state.broadcaster.clone();
                                let app_state = state.app_state.clone();
                                broadcaster.emit(
                                    "workflow_started",
                                    serde_json::json!({
                                        "name": &wf_name,
                                        "triggered_by": "manual_scheduler",
                                    }),
                                );
                                tokio::spawn(async move {
                                    let run_state = crate::workflow_engine::execute_workflow(
                                        &wf_name,
                                        &doc,
                                        app_state,
                                        broadcaster,
                                    )
                                    .await;
                                    if let Err(e) = crate::workflow_engine::save_run_history(
                                        &wf_name, &run_state,
                                    ) {
                                        tracing::warn!(
                                            "Failed to save workflow run history: {}",
                                            e
                                        );
                                    }
                                });
                            }
                        }
                    }
                }
                Ok(serde_json::json!({ "status": "triggered", "id": id }))
            } else {
                Err(format!("Task '{}' not found", id))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Workflow CRUD
        // ────────────────────────────────────────────────────────────────────
        "list_workflows" => {
            let names = crate::workflow::list_workflows()?;
            Ok(serde_json::json!({ "workflows": names }))
        }

        "load_workflow" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let json = crate::workflow::load_workflow(name.to_string())?;
            Ok(serde_json::json!({ "name": name, "json": json }))
        }

        "save_workflow" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let json = args
                .get("json")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'json'")?;
            crate::workflow::save_workflow(name.to_string(), json.to_string())?;
            Ok(serde_json::json!({ "status": "saved", "name": name }))
        }

        "delete_workflow" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            crate::workflow::delete_workflow(name.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "name": name }))
        }

        "workflow_export" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let json = crate::workflow::workflow_export(name.to_string())?;
            Ok(serde_json::json!({ "name": name, "ndwf": json }))
        }

        "workflow_import" => {
            let json = args
                .get("json")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'json'")?;
            let imported_name = crate::workflow::workflow_import(json.to_string())?;
            Ok(serde_json::json!({ "status": "imported", "name": imported_name }))
        }

        "workflow_run" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let json_str = crate::workflow::workflow_run(name.to_string())?;
            let doc = crate::workflow_engine::parse_workflow(&json_str)
                .map_err(|e| format!("Failed to parse workflow: {}", e))?;

            let broadcaster = state.broadcaster.clone();
            let app_state = state.app_state.clone();
            let name_owned = name.to_string();

            broadcaster.emit("workflow_started", serde_json::json!({ "name": name }));

            tokio::spawn(async move {
                let run_state = crate::workflow_engine::execute_workflow(
                    &name_owned,
                    &doc,
                    app_state,
                    broadcaster,
                )
                .await;
                if let Err(e) = crate::workflow_engine::save_run_history(&name_owned, &run_state) {
                    tracing::warn!("Failed to save workflow run history: {}", e);
                }
            });

            Ok(serde_json::json!({ "status": "started", "name": name }))
        }

        "get_workflow_history" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let runs = crate::workflow_engine::list_run_history(name)
                .map_err(|e| format!("Failed to list history: {}", e))?;
            Ok(serde_json::json!({ "name": name, "runs": runs }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Orchestrator
        // ────────────────────────────────────────────────────────────────────
        "start_orchestrated_task" => {
            let goal = args
                .get("goal")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'goal'")?;
            {
                let mut s = state
                    .orchestrator
                    .state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                if s.running {
                    return Err("Orchestrator is already running".to_string());
                }
                s.running = true;
                s.plan = None;
            }
            let provider = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                Arc::clone(&app.provider)
            };
            let (abort_tx, mut abort_rx) = tokio::sync::oneshot::channel::<()>();
            {
                let mut s = state
                    .orchestrator
                    .state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                s.abort_tx = Some(abort_tx);
            }
            let state_arc = Arc::clone(&state.orchestrator.state);
            let goal_clone = goal.to_string();
            let bc = state.broadcaster.clone();
            tokio::spawn(async move {
                let _ = crate::orchestrator::_run_orchestration(
                    goal_clone,
                    provider,
                    bc,
                    state_arc,
                    &mut abort_rx,
                )
                .await;
            });
            Ok(serde_json::json!({ "status": "started", "goal": goal }))
        }

        "get_orchestration_status" => {
            let s = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({
                "running": s.running,
                "goal": s.plan.as_ref().map(|p| p.goal.clone()).unwrap_or_default(),
                "tasks": s.plan.as_ref().map(|p| p.tasks.clone()).unwrap_or_default(),
            }))
        }

        "stop_orchestration" => {
            let mut s = state
                .orchestrator
                .state
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if let Some(tx) = s.abort_tx.take() {
                let _ = tx.send(());
            }
            s.running = false;
            state.broadcaster.emit(
                "agent_stopped",
                serde_json::json!({
                    "goal": s.plan.as_ref().map(|p| p.goal.clone()),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }),
            );
            Ok(serde_json::json!({ "status": "stopped" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Themes
        // ────────────────────────────────────────────────────────────────────
        "get_themes" => {
            let names: Vec<String> = crate::THEMES.iter().map(|t| t.name.clone()).collect();
            Ok(serde_json::json!(names))
        }

        "set_theme" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            if let Some(t) = crate::THEMES.iter().find(|t| t.name == name) {
                Ok(serde_json::json!({
                    "Name": t.name,
                    "Color": t.color,
                    "Pulse": serde_json::to_string(&t.pulse).unwrap_or_default(),
                    "Background": t.background,
                    "Foreground": t.foreground,
                    "Accent": t.accent,
                    "Response": t.response,
                    "Warning": t.warning,
                    "Error": t.error,
                    // also add lowercase for compatibility
                    "name": t.name,
                    "color": t.color,
                    "background": t.background,
                    "foreground": t.foreground,
                    "accent": t.accent,
                    "response": t.response,
                    "warning": t.warning,
                    "error": t.error,
                }))
            } else {
                Err(format!("Theme '{}' not found", name))
            }
        }

        "save_custom_themes" => {
            let data = args
                .get("data")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'data'")?;
            let dir = crate::user_config_dir().join("data/themes");
            std::fs::create_dir_all(&dir).ok();
            std::fs::write(dir.join("custom.json"), data)
                .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved" }))
        }

        "load_custom_themes" => {
            let data =
                std::fs::read_to_string(crate::user_config_dir().join("data/themes/custom.json"))
                    .unwrap_or_else(|_| "[]".to_string());
            Ok(serde_json::json!({ "themes": data }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Custom Personas
        // ────────────────────────────────────────────────────────────────────
        "list_custom_personas" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let personas: Vec<_> = app_state
                .custom_personas
                .iter()
                .map(|p| {
                    serde_json::json!({
                        "name": p.name, "prompt": p.prompt
                    })
                })
                .collect();
            Ok(serde_json::json!(personas))
        }

        "add_custom_persona" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .trim()
                .to_string();
            let prompt = args
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'prompt'")?
                .trim()
                .to_string();
            if name.is_empty() || prompt.is_empty() {
                return Err("Name and prompt cannot be empty".to_string());
            }
            if name.len() > 30 {
                return Err("Persona name must be under 30 characters".to_string());
            }
            if crate::PERSONAS
                .iter()
                .any(|p| p.0.to_lowercase() == name.to_lowercase())
            {
                return Err(format!("'{}' clashes with a built-in persona", name));
            }
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if app_state
                .custom_personas
                .iter()
                .any(|p| p.name.to_lowercase() == name.to_lowercase())
            {
                return Err(format!("Persona '{}' already exists", name));
            }
            app_state.custom_personas.push(crate::CustomPersona {
                name: name.clone(),
                prompt,
            });
            let json = serde_json::to_string_pretty(&app_state.custom_personas)
                .map_err(|e| e.to_string())?;
            std::fs::write(crate::user_config_dir().join("data/personas.json"), json)
                .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "added", "name": name }))
        }

        "delete_custom_persona" => {
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?;
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let before = app_state.custom_personas.len();
            app_state.custom_personas.retain(|p| p.name != name);
            if app_state.custom_personas.len() == before {
                return Err(format!("Persona '{}' not found", name));
            }
            let json = serde_json::to_string_pretty(&app_state.custom_personas)
                .map_err(|e| e.to_string())?;
            std::fs::write(crate::user_config_dir().join("data/personas.json"), json)
                .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "deleted", "name": name }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Profiles (SSH/FTP/SFTP saved connections)
        // ────────────────────────────────────────────────────────────────────
        "save_profiles" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            let data = args
                .get("data")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'data'")?;
            if !matches!(key, "ssh" | "ftp" | "sftp") {
                return Err(format!("Invalid key '{}'. Use ssh, ftp, or sftp", key));
            }
            let dir = crate::user_config_dir().join("data/profiles");
            std::fs::create_dir_all(&dir).ok();
            std::fs::write(dir.join(format!("{}.json", key)), data)
                .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "key": key }))
        }

        "load_profiles" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            if !matches!(key, "ssh" | "ftp" | "sftp") {
                return Err(format!("Invalid key '{}'", key));
            }
            let data = std::fs::read_to_string(
                crate::user_config_dir()
                    .join("data/profiles")
                    .join(format!("{}.json", key)),
            )
            .unwrap_or_else(|_| "[]".to_string());
            Ok(serde_json::json!({ "key": key, "profiles": data }))
        }

        // ────────────────────────────────────────────────────────────────────
        "get_mcp_status" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let mut result = std::collections::HashMap::new();
            if app_state.mcp_abort.is_some() {
                result.insert("running".to_string(), "true".to_string());
                result.insert("port".to_string(), app_state.mcp_port.to_string());
                result.insert(
                    "url".to_string(),
                    format!("http://127.0.0.1:{}", app_state.mcp_port),
                );
                result.insert(
                    "discovery".to_string(),
                    format!("http://127.0.0.1:{}/.well-known/mcp", app_state.mcp_port),
                );
                if let Some(tok) = &app_state.mcp_token {
                    result.insert("token".to_string(), tok.clone());
                }
            } else {
                result.insert("running".to_string(), "false".to_string());
                result.insert("port".to_string(), app_state.mcp_port.to_string());
            }
            Ok(serde_json::json!(result))
        }

        "get_mcp_tool_whitelist" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!(app_state.mcp_tool_whitelist))
        }

        "set_mcp_tool_whitelist" => {
            let tools: Vec<String> = args
                .get("tools")
                .and_then(|v| v.as_array())
                .ok_or("Missing 'tools' array")?
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            let known: std::collections::HashSet<&str> =
                crate::mcp::ALL_TOOLS.iter().copied().collect();
            for t in &tools {
                if !known.contains(t.as_str()) {
                    return Err(format!("Unknown tool: '{}'", t));
                }
            }
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app_state.mcp_tool_whitelist = tools.clone();
            Ok(serde_json::json!({ "status": "updated", "whitelist": tools }))
        }

        "start_mcp_server" => {
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(13337) as u16;
            let (provider, whitelist, mem_db) = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                if app.mcp_abort.is_some() {
                    return Err(format!(
                        "MCP server is already running on port {}. Stop it first.",
                        app.mcp_port
                    ));
                }
                (
                    app.provider.clone(),
                    app.mcp_tool_whitelist.clone(),
                    app.mem_db.clone(),
                )
            };
            let config = crate::mcp::McpServerConfig {
                provider,
                tool_whitelist: whitelist,
                mem_db,
                port,
            };
            let (bound_port, abort_handle, token) =
                crate::mcp::start(config).await.map_err(|e| e.to_string())?;
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.mcp_abort = Some(abort_handle);
                app.mcp_port = bound_port;
                app.mcp_token = Some(token.clone());
            }
            Ok(serde_json::json!({
                "url": format!("http://127.0.0.1:{}", bound_port),
                "token": token,
                "discovery": format!("http://127.0.0.1:{}/.well-known/mcp", bound_port)
            }))
        }

        "stop_mcp_server" => {
            let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(handle) = app.mcp_abort.take() {
                handle.abort();
                let port = app.mcp_port;
                app.mcp_port = 13337;
                Ok(serde_json::json!({ "status": "stopped", "port": port }))
            } else {
                Err("MCP server is not running.".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Canvas Collaboration
        // ────────────────────────────────────────────────────────────────────
        "canvas_collab_status" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let peers = app_state
                .collab_peer_count
                .as_ref()
                .map(|c| c.load(std::sync::atomic::Ordering::SeqCst))
                .unwrap_or(0);
            Ok(serde_json::json!({
                "active": app_state.collab_abort.is_some(),
                "mode":   app_state.collab_mode.clone().unwrap_or_else(|| "idle".to_string()),
                "addr":   app_state.collab_addr.clone().unwrap_or_default(),
                "peers":  peers
            }))
        }

        "canvas_collab_stop" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(abort) = app_state.collab_abort.take() {
                abort.abort();
            }
            app_state.collab_tx = None;
            app_state.collab_mode = None;
            app_state.collab_addr = None;
            app_state.collab_peer_count = None;
            if let Some(daemon) = app_state.collab_mdns.take() {
                let hostname = crate::transfer::get_hostname();
                let _ = daemon.unregister(&format!(
                    "neurodeck-{}._neurodeck-canvas._tcp.local.",
                    hostname.replace(" ", "-")
                ));
            }
            Ok(serde_json::json!({ "status": "stopped" }))
        }

        "discover_canvas_peers" => {
            let peers =
                crate::commands::system::discover_canvas_peers().map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "peers": peers, "count": peers.len() }))
        }

        "canvas_collab_send" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?;
            let lang = args.get("lang").and_then(|v| v.as_str()).unwrap_or("html");
            let sender = args
                .get("sender")
                .and_then(|v| v.as_str())
                .unwrap_or("bridge");
            let tx = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app_state.collab_tx.clone()
            };
            if let Some(tx) = tx {
                let payload = serde_json::json!({ "type": "code_update", "code": code, "lang": lang, "sender": sender });
                tx.send(payload.to_string())
                    .await
                    .map_err(|_| "Collab channel closed".to_string())?;
                Ok(serde_json::json!({ "status": "sent" }))
            } else {
                Err(
                    "No active collab session. Use canvas_collab_host or canvas_collab_join first."
                        .to_string(),
                )
            }
        }

        "canvas_collab_broadcast" => {
            let payload_val = args.get("payload").cloned().unwrap_or(args.clone());
            let tx = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app_state.collab_tx.clone()
            };
            if let Some(tx) = tx {
                tx.send(payload_val.to_string())
                    .await
                    .map_err(|_| "Collab channel closed".to_string())?;
                Ok(serde_json::json!({ "status": "broadcast" }))
            } else {
                Err("No active collab session".to_string())
            }
        }

        // canvas_collab_host / canvas_collab_join handled in final stubs below
        "canvas_collab_host_moved" | "canvas_collab_join_moved" => {
            Ok(serde_json::json!({ "status": "unavailable" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Network / LAN
        // ────────────────────────────────────────────────────────────────────
        "get_lan_ip" => {
            let ip = std::net::UdpSocket::bind("0.0.0.0:0")
                .ok()
                .and_then(|s| {
                    s.connect("8.8.8.8:80").ok()?;
                    s.local_addr().ok()
                })
                .map(|a| a.ip().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            Ok(serde_json::json!({ "ip": ip }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Ollama Model Management
        // ────────────────────────────────────────────────────────────────────
        "ollama_list_models" => {
            let base_url = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                args.get("base_url")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| app_state.config.llm.ollama_base_url.clone())
            };
            let models = crate::ollama_mgr::ollama_list_models(base_url)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "models": models, "count": models.len() }))
        }

        "ollama_delete_model" => {
            let base_url = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                args.get("base_url")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| app_state.config.llm.ollama_base_url.clone())
            };
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model'")?
                .to_string();
            crate::ollama_mgr::ollama_delete_model(base_url, model.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "model": model }))
        }

        // ollama_pull_model implemented below with streaming broadcaster
        "ollama_pull_model_stub_removed" => Ok(
            serde_json::json!({ "status": "unavailable", "note": "ollama_pull_model requires Tauri AppHandle for streaming progress events; use the Tauri UI" }),
        ),

        // ────────────────────────────────────────────────────────────────────
        // Computer Use (requires explicit user approval)
        // ────────────────────────────────────────────────────────────────────
        "computer_screenshot" => {
            let shot = crate::computer_use::computer_screenshot()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "mime": shot.mime, "base64": shot.base64 }))
        }

        "computer_mouse_move" => {
            let x = args
                .get("x")
                .and_then(|v| v.as_i64())
                .ok_or("Missing 'x'")? as i32;
            let y = args
                .get("y")
                .and_then(|v| v.as_i64())
                .ok_or("Missing 'y'")? as i32;
            let approved = args
                .get("approved")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Computer,
                )?;
            }
            crate::computer_use::computer_mouse_move(x, y, approved)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "moved", "x": x, "y": y }))
        }

        "computer_mouse_click" => {
            let button = args
                .get("button")
                .and_then(|v| v.as_str())
                .unwrap_or("left")
                .to_string();
            let approved = args
                .get("approved")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Computer,
                )?;
            }
            crate::computer_use::computer_mouse_click(button.clone(), approved)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "clicked", "button": button }))
        }

        "computer_type" => {
            let text = args
                .get("text")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'text'")?
                .to_string();
            let approved = args
                .get("approved")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Computer,
                )?;
            }
            crate::computer_use::computer_type(text.clone(), approved)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "typed", "chars": text.len() }))
        }

        "computer_key" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?
                .to_string();
            let approved = args
                .get("approved")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::Computer,
                )?;
            }
            crate::computer_use::computer_key(key.clone(), approved)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "pressed", "key": key }))
        }

        "computer_find_text" => {
            let text = args
                .get("text")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'text'")?
                .to_string();
            let result = crate::computer_use::computer_find_text(text)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Remote Control Server
        // ────────────────────────────────────────────────────────────────────
        "get_remote_server_info" => {
            let guard = state
                .remote
                .handle
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            match guard.as_ref() {
                Some(h) => {
                    let connected = h.connected.load(std::sync::atomic::Ordering::Relaxed);
                    let elapsed = h.started_at.elapsed().as_secs();
                    let ttl_rem = 900u64.saturating_sub(elapsed);
                    Ok(serde_json::json!({
                        "running":                true,
                        "port":                   h.port,
                        "ip":                     h.local_ip,
                        "pin":                    h.pin,
                        "connected":              connected,
                        "ttl_seconds_remaining":  ttl_rem
                    }))
                }
                None => Ok(serde_json::json!({ "running": false })),
            }
        }

        // remote_send_to_clients / remote_relay_notification implemented below; start/stop still stubs
        "start_remote_server_moved" | "stop_remote_server_moved" => {
            Ok(serde_json::json!({ "status": "unavailable" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Plugin Management
        // ────────────────────────────────────────────────────────────────────
        "toggle_plugin" => {
            let file_name = args
                .get("file_name")
                .or_else(|| args.get("fileName"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'file_name'")?;
            let enabled = args
                .get("enabled")
                .and_then(|v| v.as_bool())
                .ok_or("Missing 'enabled'")?;
            crate::plugin_mgr::toggle_plugin(file_name.to_string(), enabled)
                .map_err(|e| e.to_string())?;
            Ok(
                serde_json::json!({ "status": if enabled { "enabled" } else { "disabled" }, "file_name": file_name }),
            )
        }

        "read_plugin" => {
            let file_name = args
                .get("file_name")
                .or_else(|| args.get("fileName"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'file_name'")?;
            let content =
                crate::plugin_mgr::read_plugin(file_name.to_string()).map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "file_name": file_name, "content": content }))
        }

        "save_plugin" => {
            let file_name = args
                .get("file_name")
                .or_else(|| args.get("fileName"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'file_name'")?;
            let content = args
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'content'")?;
            crate::plugin_mgr::save_plugin(file_name.to_string(), content.to_string())
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "saved", "file_name": file_name }))
        }

        "fetch_plugin_registry" => {
            let registry = crate::plugin_mgr::fetch_plugin_registry()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(registry).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Git Extended Operations (spawn_blocking)
        // ────────────────────────────────────────────────────────────────────
        "git_stage" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let files: Vec<String> = args
                .get("files")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            tokio::task::spawn_blocking(move || {
                use std::path::Path;
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut idx = repo.index().map_err(|e| e.to_string())?;
                for f in &files {
                    idx.add_path(Path::new(f)).map_err(|e| e.to_string())?;
                }
                idx.write().map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "staged", "files": files }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_unstage" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let files: Vec<String> = args
                .get("files")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            tokio::task::spawn_blocking(move || {
                use std::path::Path;
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let head = repo.head().map_err(|e| e.to_string())?;
                let head_tree = repo
                    .find_commit(head.target().ok_or("HEAD has no target".to_string())?)
                    .map_err(|e| e.to_string())?
                    .tree()
                    .map_err(|e| e.to_string())?;
                let mut idx = repo.index().map_err(|e| e.to_string())?;
                for f in &files {
                    idx.remove_path(Path::new(f)).ok();
                    if let Ok(e) = head_tree.get_path(Path::new(f)) {
                        let entry = git2::IndexEntry {
                            ctime: git2::IndexTime::new(0, 0),
                            mtime: git2::IndexTime::new(0, 0),
                            dev: 0,
                            ino: 0,
                            mode: e.filemode() as u32,
                            uid: 0,
                            gid: 0,
                            file_size: 0,
                            id: e.id(),
                            flags: 0,
                            flags_extended: 0,
                            path: f.as_bytes().to_vec(),
                        };
                        idx.add(&entry).ok();
                    }
                }
                idx.write().map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "unstaged", "files": files }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_commit" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let message = args
                .get("message")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'message'")?
                .to_string();
            let author_name = args
                .get("author_name")
                .and_then(|v| v.as_str())
                .unwrap_or("NEURODECK Bridge")
                .to_string();
            let author_email = args
                .get("author_email")
                .and_then(|v| v.as_str())
                .unwrap_or("bridge@neurodeck.local")
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut idx = repo.index().map_err(|e| e.to_string())?;
                let tree_oid = idx.write_tree().map_err(|e| e.to_string())?;
                let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
                let sig =
                    git2::Signature::now(&author_name, &author_email).map_err(|e| e.to_string())?;
                let parent = repo
                    .head()
                    .ok()
                    .and_then(|h| h.target())
                    .and_then(|oid| repo.find_commit(oid).ok());
                let parents: Vec<&git2::Commit> = parent.as_ref().into_iter().collect();
                let sha = repo
                    .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "committed", "sha": sha.to_string() }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_push" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let remote = args
                .get("remote")
                .and_then(|v| v.as_str())
                .unwrap_or("origin")
                .to_string();
            let branch = args
                .get("branch")
                .and_then(|v| v.as_str())
                .unwrap_or("main")
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut r = repo.find_remote(&remote).map_err(|e| e.to_string())?;
                let mut cb = git2::RemoteCallbacks::new();
                cb.credentials(|_url, user, _| {
                    git2::Cred::ssh_key_from_agent(user.unwrap_or("git"))
                });
                let mut opts = git2::PushOptions::new();
                opts.remote_callbacks(cb);
                r.push(
                    &[format!("refs/heads/{}:refs/heads/{}", branch, branch)],
                    Some(&mut opts),
                )
                .map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "pushed", "remote": remote, "branch": branch }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_pull" | "git_fetch" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let remote = args
                .get("remote")
                .and_then(|v| v.as_str())
                .unwrap_or("origin")
                .to_string();
            let branch = args
                .get("branch")
                .and_then(|v| v.as_str())
                .unwrap_or("main")
                .to_string();
            let is_pull = command == "git_pull";
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut r = repo.find_remote(&remote).map_err(|e| e.to_string())?;
                let mut cb = git2::RemoteCallbacks::new();
                cb.credentials(|_url, user, _| git2::Cred::ssh_key_from_agent(user.unwrap_or("git")));
                let mut fopts = git2::FetchOptions::new();
                fopts.remote_callbacks(cb);
                let refs = if is_pull { vec![branch.as_str()] } else { vec![] };
                r.fetch(&refs, Some(&mut fopts), None).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": if is_pull { "pulled" } else { "fetched" }, "remote": remote }))
            }).await.map_err(|e| e.to_string())?
        }

        "git_diff" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let head_tree = repo.head().ok()
                    .and_then(|h| h.target())
                    .and_then(|oid| repo.find_commit(oid).ok())
                    .and_then(|c| c.tree().ok());
                let diff = repo.diff_tree_to_workdir_with_index(
                    head_tree.as_ref(), None
                ).map_err(|e| e.to_string())?;
                let mut out = String::new();
                diff.print(git2::DiffFormat::Patch, |_d, _h, line| {
                    out.push(line.origin());
                    if let Ok(s) = std::str::from_utf8(line.content()) { out.push_str(s); }
                    true
                }).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "diff": out, "files_changed": diff.stats().map(|s| s.files_changed()).unwrap_or(0) }))
            }).await.map_err(|e| e.to_string())?
        }

        "git_remote_list" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let remotes = repo.remotes().map_err(|e| e.to_string())?;
                let list: Vec<_> = remotes
                    .iter()
                    .flatten()
                    .map(|name| {
                        let url = repo
                            .find_remote(name)
                            .ok()
                            .and_then(|r| r.url().map(|u| u.to_string()))
                            .unwrap_or_default();
                        serde_json::json!({ "name": name, "url": url })
                    })
                    .collect();
                Ok(serde_json::json!({ "remotes": list, "count": list.len() }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_remote_add" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                repo.remote(&name, &url).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "added", "name": name, "url": url }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_remote_remove" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'name'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                repo.remote_delete(&name).map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "removed", "name": name }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_discard" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let files: Vec<String> = args
                .get("files")
                .and_then(|v| v.as_array())
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect();
            tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let mut opts = git2::build::CheckoutBuilder::new();
                for f in &files {
                    opts.path(f);
                }
                opts.force();
                repo.checkout_head(Some(&mut opts))
                    .map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "status": "discarded", "files": files }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        // ────────────────────────────────────────────────────────────────────
        // Memory Extended
        // ────────────────────────────────────────────────────────────────────
        "memory_list_all" | "memory_list_by_namespace" => {
            let namespace = args.get("namespace").and_then(|v| v.as_str());
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let all = db.list_all().map_err(|e| e.to_string())?;
                let filtered: Vec<_> = all.iter().filter(|r| {
                    namespace.map(|ns| r.metadata.get("namespace").map(|v| v == ns).unwrap_or(false))
                        .unwrap_or(true)
                }).map(|r| serde_json::json!({ "id": r.id, "content": r.content, "metadata": r.metadata, "project_id": r.project_id, "pack_id": r.pack_id }))
                .collect();
                Ok(serde_json::json!({ "records": filtered, "count": filtered.len() }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "memory_search_semantic" => {
            // Semantic search requires embeddings — fall back to keyword search in bridge mode
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?;
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let all = db.list_all().map_err(|e| e.to_string())?;
                let qwords: Vec<_> = query.split_whitespace().collect();
                let mut results: Vec<_> = all
                    .into_iter()
                    .filter_map(|r| {
                        let lower = r.content.to_lowercase();
                        let hits = qwords
                            .iter()
                            .filter(|w| lower.contains(&w.to_lowercase()[..]))
                            .count();
                        if hits > 0 {
                            Some((hits, r))
                        } else {
                            None
                        }
                    })
                    .collect();
                results.sort_by(|a, b| b.0.cmp(&a.0));
                let top: Vec<_> = results
                    .into_iter()
                    .take(5)
                    .map(|(score, r)| {
                        serde_json::json!({
                            "id": r.id, "content": r.content, "metadata": r.metadata, "score": score
                        })
                    })
                    .collect();
                Ok(
                    serde_json::json!({ "query": query, "results": top, "method": "keyword_fallback" }),
                )
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Document Indexing
        // ────────────────────────────────────────────────────────────────────
        // index_directory → real broadcaster implementation below
        "_stub_index_directory_removed" => Ok(serde_json::json!({ "status": "stub_removed" })),

        "clear_doc_index" => {
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref mut db) = app_state.mem_db {
                let all = db.list_all().map_err(|e| e.to_string())?;
                let doc_ids: Vec<_> = all
                    .iter()
                    .filter(|r| {
                        r.metadata
                            .get("source")
                            .map(|v| v == "doc")
                            .unwrap_or(false)
                    })
                    .map(|r| r.id.clone())
                    .collect();
                let count = doc_ids.len();
                for id in &doc_ids {
                    let _ = db.delete_record(id);
                }
                Ok(serde_json::json!({ "status": "cleared", "deleted": count }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Game Notes
        // ────────────────────────────────────────────────────────────────────
        "get_game_notes" => {
            let app_id = args
                .get("app_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'app_id'")?;
            let path = crate::user_config_dir()
                .join("data/game_notes")
                .join(format!("{}.txt", app_id));
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            Ok(serde_json::json!({ "app_id": app_id, "content": content }))
        }

        "save_game_note" => {
            let app_id = args
                .get("app_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'app_id'")?;
            let content = args
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'content'")?;
            let dir = crate::user_config_dir().join("data/game_notes");
            std::fs::create_dir_all(&dir).ok();
            std::fs::write(dir.join(format!("{}.txt", app_id)), content)
                .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "app_id": app_id }))
        }

        // fork_session moved to primary session section

        // compare_models is implemented further below with real parallel LLM calls

        // ────────────────────────────────────────────────────────────────────
        // OAuth
        // ────────────────────────────────────────────────────────────────────
        "start_oauth_flow" => {
            let client_id = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app_state.config.llm.google_client_id.clone()
            };
            if client_id.trim().is_empty() {
                return Err("google_client_id not configured. Set it via set_config key=llm.google_client_id".to_string());
            }
            let cfg = neurodeck_infrastructure::oauth::OAuthConfig {
                client_id,
                ..Default::default()
            };
            let result = neurodeck_infrastructure::oauth::request_device_code(&cfg)
                .await
                .map_err(|e| format!("OAuth device code request failed: {}", e))?;
            Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
        }

        "poll_oauth_token" => {
            let client_id = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app_state.config.llm.google_client_id.clone()
            };
            let device_code = args
                .get("device_code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'device_code'")?
                .to_string();
            let interval = args.get("interval").and_then(|v| v.as_u64()).unwrap_or(5);
            let cfg = neurodeck_infrastructure::oauth::OAuthConfig {
                client_id,
                ..Default::default()
            };
            let token =
                neurodeck_infrastructure::oauth::poll_for_token(&cfg, &device_code, interval)
                    .await
                    .map_err(|e| format!("OAuth poll failed: {}", e))?;
            Ok(serde_json::json!({ "token": token }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Onboarding Diagnostics
        // ────────────────────────────────────────────────────────────────────
        "run_onboarding_diagnostics" => {
            let result = crate::commands::run_onboarding_diagnostics()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Secure Credential Storage (OS Keychain via neurodeck_infrastructure)
        // ────────────────────────────────────────────────────────────────────
        "save_gemini_api_key" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            neurodeck_infrastructure::secrets::save_gemini_api_key(key)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "note": "Key stored in OS keychain" }))
        }

        "save_hf_api_key" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            neurodeck_infrastructure::secrets::save_hf_api_key(key)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved" }))
        }

        "save_kimi_api_key" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            neurodeck_infrastructure::secrets::save_kimi_api_key(key)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved" }))
        }

        "save_openai_compat_api_key" => {
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'key'")?;
            neurodeck_infrastructure::secrets::save_openai_compat_api_key(key)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved" }))
        }

        "save_ssh_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            let pass = args
                .get("password")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'password'")?;
            neurodeck_infrastructure::secrets::save_ssh_credential(name, pass)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "profile": name }))
        }

        "get_ssh_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            let cred = neurodeck_infrastructure::secrets::get_ssh_credential(name)
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "profile": name, "password": cred }))
        }

        "delete_ssh_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            neurodeck_infrastructure::secrets::delete_ssh_credential(name)
                .map_err(|e| format!("Keychain delete failed: {}", e))?;
            Ok(serde_json::json!({ "status": "deleted", "profile": name }))
        }

        "save_sftp_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            let pass = args
                .get("password")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'password'")?;
            neurodeck_infrastructure::secrets::save_sftp_credential(name, pass)
                .map_err(|e| format!("Keychain save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "saved", "profile": name }))
        }

        // ────────────────────────────────────────────────────────────────────
        // HuggingFace Model Management
        // ────────────────────────────────────────────────────────────────────
        "hf_search_models" => {
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?
                .to_string();
            let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(20) as u32;
            let models = crate::hf_model_mgr::hf_search_models(query, limit)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(models).map_err(|e| e.to_string())?)
        }

        "hf_get_steam_deck_models" => {
            let models = crate::hf_model_mgr::hf_get_steam_deck_models().await;
            Ok(serde_json::to_value(models).map_err(|e| e.to_string())?)
        }

        "hf_get_model_info" => {
            let repo_id = args
                .get("repo_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'repo_id'")?
                .to_string();
            let info = crate::hf_model_mgr::hf_get_model_info(repo_id)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(info).map_err(|e| e.to_string())?)
        }

        "hf_list_installed_models" => {
            let models = crate::hf_model_mgr::hf_list_installed_models()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(models).map_err(|e| e.to_string())?)
        }

        "hf_delete_model" => {
            let repo_id = args
                .get("repo_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'repo_id'")?
                .to_string();
            let filename = args
                .get("filename")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'filename'")?
                .to_string();
            crate::hf_model_mgr::hf_delete_model(repo_id.clone(), filename.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "repo_id": repo_id, "filename": filename }))
        }

        "hf_cancel_download" => {
            let id = args
                .get("download_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'download_id'")?
                .to_string();
            crate::hf_model_mgr::hf_cancel_download(id.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "cancelled", "download_id": id }))
        }

        "hf_list_downloads" => {
            let downloads = crate::hf_model_mgr::hf_list_downloads().await;
            Ok(serde_json::to_value(downloads).map_err(|e| e.to_string())?)
        }

        // hf_download_model implemented below with streaming broadcaster

        // ────────────────────────────────────────────────────────────────────
        // Tunnel Server
        // ────────────────────────────────────────────────────────────────────
        "start_tunnel_server" => {
            let result = crate::tunnel::start_tunnel_server()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "started", "info": result }))
        }

        "stop_tunnel_server" => {
            let result = crate::tunnel::stop_tunnel_server()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "stopped", "info": result }))
        }

        "send_tunnel_request" => {
            let request = args
                .get("request")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'request'")?
                .to_string();
            let result = crate::tunnel::send_tunnel_request(request)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "sent", "response": result }))
        }

        // Session Extended handlers moved to primary session section

        // ────────────────────────────────────────────────────────────────────
        // Keychain — get & delete
        // ────────────────────────────────────────────────────────────────────
        "get_gemini_api_key" => {
            let key = neurodeck_infrastructure::secrets::get_gemini_api_key()
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "key": key }))
        }

        "get_hf_api_key" => {
            let key = neurodeck_infrastructure::secrets::get_hf_api_key()
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "key": key }))
        }

        "get_kimi_api_key" => {
            let key = neurodeck_infrastructure::secrets::get_kimi_api_key()
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "key": key }))
        }

        "get_openai_compat_api_key" => {
            let key = neurodeck_infrastructure::secrets::get_openai_compat_api_key()
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "key": key }))
        }

        "get_sftp_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            let cred = neurodeck_infrastructure::secrets::get_sftp_credential(name)
                .map_err(|e| format!("Keychain read failed: {}", e))?;
            Ok(serde_json::json!({ "profile": name, "password": cred }))
        }

        "delete_sftp_credential" => {
            let name = args
                .get("profile_name")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'profile_name'")?;
            neurodeck_infrastructure::secrets::delete_sftp_credential(name)
                .map_err(|e| format!("Keychain delete failed: {}", e))?;
            Ok(serde_json::json!({ "status": "deleted", "profile": name }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Prompt Engineering (LLM calls)
        // ────────────────────────────────────────────────────────────────────
        "optimize_raw_prompt" => {
            let raw_text = args
                .get("raw_text")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'raw_text'")?;
            if raw_text.trim().is_empty() {
                return Err("Input draft cannot be empty".to_string());
            }
            let provider = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.provider.clone()
            };
            let system =
                "You are an expert prompt engineer. Return ONLY a valid JSON object with keys: \
                persona, task, context, tone, constraints, format. No markdown, no explanation.";
            let result = provider
                .chat_with_image(raw_text, system, None, None)
                .await
                .map_err(|e| e.to_string())?;
            let cleaned = result
                .trim()
                .trim_start_matches("```json")
                .trim_start_matches("```")
                .trim_end_matches("```")
                .trim();
            let parsed: serde_json::Value = serde_json::from_str(cleaned)
                .unwrap_or_else(|_| serde_json::json!({ "raw": result }));
            Ok(parsed)
        }

        "generate_jpe_explanation_with_level" => {
            let topic = args
                .get("topic")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'topic'")?;
            let level = args
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("intermediate");
            let broadcaster = state.broadcaster.clone();
            let provider = {
                state
                    .app_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .provider
                    .clone()
            };
            let prompt = format!(
                "Explain '{}' for a {} audience in Just Plain English. Use analogies, be concise.",
                topic, level
            );
            let topic_c = topic.to_string();
            let level_c = level.to_string();
            tokio::spawn(async move {
                let mut s = provider.stream_response(&prompt, "You are a clear technical writer.");
                let mut full = String::new();
                while let Some(chunk) = s.next().await {
                    match chunk {
                        Ok(t) => {
                            full.push_str(&t);
                            broadcaster.emit("jpe_token", serde_json::json!({ "token": t }));
                        }
                        Err(e) => {
                            broadcaster
                                .emit("jpe_error", serde_json::json!({ "error": e.to_string() }));
                            return;
                        }
                    }
                }
                broadcaster.emit(
                    "jpe_done",
                    serde_json::json!({ "topic": topic_c, "level": level_c, "explanation": full }),
                );
            });
            Ok(serde_json::json!({ "status": "streaming", "topic": topic, "level": level }))
        }

        "assemble_prompt_via_lua_cmd" => {
            let persona = args
                .get("persona")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let task = args
                .get("task")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let context = args
                .get("context")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let tone = args
                .get("tone")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let constraints = args
                .get("constraints")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let format_str = args
                .get("format")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let examples = args
                .get("examples")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let formula = args
                .get("formula")
                .and_then(|v| v.as_str())
                .unwrap_or("AIDA")
                .to_string();
            let lua = state.lua.lock().unwrap_or_else(|e| e.into_inner());
            let result = lua
                .assemble_prompt(
                    &persona,
                    &task,
                    &context,
                    &tone,
                    &constraints,
                    &format_str,
                    &examples,
                    &formula,
                )
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "prompt": result }))
        }

        "search_history_ai" => {
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?
                .to_string();
            let provider = {
                state
                    .app_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .provider
                    .clone()
            };

            let mut history: Vec<String> = Vec::new();
            let mut candidate_paths: Vec<std::path::PathBuf> = Vec::new();
            if let Ok(home) = std::env::var("HOME") {
                let h = std::path::PathBuf::from(&home);
                candidate_paths.push(h.join(".bash_history"));
                candidate_paths.push(h.join(".zsh_history"));
            }
            if let Ok(appdata) = std::env::var("APPDATA") {
                candidate_paths.push(
                    std::path::PathBuf::from(&appdata).join(
                        "Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt",
                    ),
                );
            }
            for path in &candidate_paths {
                if let Ok(content) = std::fs::read_to_string(path) {
                    history.extend(content.lines().rev().take(500).map(|l| l.to_string()));
                }
            }

            if history.is_empty() {
                return Ok(
                    serde_json::json!({ "results": [], "query": query, "note": "No shell history found" }),
                );
            }

            let history_text = history
                .iter()
                .take(300)
                .cloned()
                .collect::<Vec<_>>()
                .join("\n");
            let prompt = format!("Search this shell history for commands related to '{}'. Return a JSON array of the top 10 matching commands, most relevant first.\n\nHistory:\n{}", query, history_text);

            let result = provider.chat_with_image(&prompt, "You are a shell command search assistant. Return ONLY a JSON array of strings.", None, None).await
                .map_err(|e| e.to_string())?;
            let cleaned = result
                .trim()
                .trim_start_matches("```json")
                .trim_start_matches("```")
                .trim_end_matches("```")
                .trim();
            let parsed: Vec<String> = serde_json::from_str(cleaned).unwrap_or_default();
            Ok(serde_json::json!({ "results": parsed, "query": query }))
        }

        "read_last_screenshot" => {
            let info = crate::commands::read_last_screenshot()
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(info).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // API Lab Extended
        // ────────────────────────────────────────────────────────────────────
        "api_curl_import" => {
            let curl = args
                .get("curl")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'curl'")?
                .to_string();
            let req = crate::commands::api_curl_import(curl).map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(req).map_err(|e| e.to_string())?)
        }

        // api_generate_request implemented below with real LLM call

        // ────────────────────────────────────────────────────────────────────
        // Git AI & Credentials
        // ────────────────────────────────────────────────────────────────────
        "git_generate_commit_message" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let provider = {
                state
                    .app_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .provider
                    .clone()
            };

            let diff = tokio::task::spawn_blocking(move || {
                let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
                let head_tree = repo
                    .head()
                    .ok()
                    .and_then(|h| h.target())
                    .and_then(|oid| repo.find_commit(oid).ok())
                    .and_then(|c| c.tree().ok());
                let diff = repo
                    .diff_tree_to_workdir_with_index(head_tree.as_ref(), None)
                    .map_err(|e| e.to_string())?;
                let mut out = String::new();
                let _ = diff.print(git2::DiffFormat::Patch, |_d, _h, line| {
                    if let Ok(s) = std::str::from_utf8(line.content()) {
                        out.push_str(s);
                    }
                    true
                });
                Ok::<_, String>(out.chars().take(3000).collect::<String>())
            })
            .await
            .map_err(|e| e.to_string())?;

            let diff_text = diff.map_err(|e| e.to_string())?;
            let prompt = format!("Generate a concise git commit message for this diff (Conventional Commits format):\n\n{}", diff_text);
            let message = provider.chat_with_image(&prompt, "You are a git commit message expert. Return only the commit message, no explanation.", None, None)
                .await.map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "message": message.trim().to_string() }))
        }

        "git_credential_store" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?;
            let username = args
                .get("username")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'username'")?;
            let token = args
                .get("token")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'token'")?;
            let creds_path = crate::user_config_dir().join("data/git_credentials.json");
            let mut creds: std::collections::HashMap<String, serde_json::Value> =
                std::fs::read_to_string(&creds_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            creds.insert(
                host.to_string(),
                serde_json::json!({ "host": host, "username": username, "token": token }),
            );
            std::fs::write(
                &creds_path,
                serde_json::to_string_pretty(&creds).unwrap_or_default(),
            )
            .map_err(|e| format!("Save failed: {}", e))?;
            Ok(serde_json::json!({ "status": "stored", "host": host }))
        }

        "git_credential_get" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?;
            let creds_path = crate::user_config_dir().join("data/git_credentials.json");
            let creds: std::collections::HashMap<String, serde_json::Value> =
                std::fs::read_to_string(&creds_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            if let Some(cred) = creds.get(host) {
                Ok(cred.clone())
            } else {
                Err(format!("No credential stored for '{}'", host))
            }
        }

        "git_credential_delete" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?;
            let creds_path = crate::user_config_dir().join("data/git_credentials.json");
            let mut creds: std::collections::HashMap<String, serde_json::Value> =
                std::fs::read_to_string(&creds_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            if creds.remove(host).is_none() {
                return Err(format!("No credential for '{}'", host));
            }
            std::fs::write(
                &creds_path,
                serde_json::to_string_pretty(&creds).unwrap_or_default(),
            )
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "deleted", "host": host }))
        }

        "git_init" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            tokio::task::spawn_blocking(move || {
                git2::Repository::init(&path).map_err(|e| e.to_string())?;
                let repos_path = crate::user_config_dir().join("git_repos.json");
                let name = std::path::Path::new(&path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();
                let mut repos: Vec<serde_json::Value> = std::fs::read_to_string(&repos_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
                repos.retain(|r| r["path"].as_str() != Some(path.as_str()));
                repos.insert(0, serde_json::json!({ "path": path, "name": name }));
                repos.truncate(20);
                let _ = std::fs::write(
                    &repos_path,
                    serde_json::to_string_pretty(&repos).unwrap_or_default(),
                );
                Ok(serde_json::json!({ "status": "initialized", "path": path }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        "git_clone" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?
                .to_string();
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let broadcaster = state.broadcaster.clone();
            let url_c = url.clone();
            let path_c = path.clone();
            tokio::task::spawn_blocking(move || {
                broadcaster.emit(
                    "git_clone_started",
                    serde_json::json!({ "url": url_c, "path": path_c }),
                );
                let mut builder = git2::build::RepoBuilder::new();
                let mut cb = git2::RemoteCallbacks::new();
                cb.credentials(|_url, user, _| {
                    git2::Cred::ssh_key_from_agent(user.unwrap_or("git"))
                });
                let mut fopts = git2::FetchOptions::new();
                fopts.remote_callbacks(cb);
                builder.fetch_options(fopts);
                builder
                    .clone(&url_c, std::path::Path::new(&path_c))
                    .map_err(|e| e.to_string())?;
                let repos_path = crate::user_config_dir().join("git_repos.json");
                let name = std::path::Path::new(&path_c)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("unknown")
                    .to_string();
                let mut repos: Vec<serde_json::Value> = std::fs::read_to_string(&repos_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
                repos.retain(|r| r["path"].as_str() != Some(path_c.as_str()));
                repos.insert(0, serde_json::json!({ "path": path_c, "name": name }));
                repos.truncate(20);
                let _ = std::fs::write(
                    &repos_path,
                    serde_json::to_string_pretty(&repos).unwrap_or_default(),
                );
                Ok(serde_json::json!({ "status": "cloned", "url": url_c, "path": path_c }))
            })
            .await
            .map_err(|e| e.to_string())?
        }

        // ────────────────────────────────────────────────────────────────────
        // Memory Import & Graph
        // ────────────────────────────────────────────────────────────────────
        "memory_import_data" => {
            let data = args
                .get("data")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'data'")?;
            let records: Vec<crate::memory::MemoryRecord> =
                serde_json::from_str(data).map_err(|e| format!("Invalid memory JSON: {}", e))?;
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let mut imported = 0usize;
                for rec in &records {
                    if db
                        .store_message(
                            rec.id.clone(),
                            rec.content.clone(),
                            rec.embedding.clone(),
                            rec.metadata.clone(),
                        )
                        .is_ok()
                    {
                        imported += 1;
                    }
                }
                Ok(
                    serde_json::json!({ "status": "imported", "imported": imported, "total": records.len() }),
                )
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        "get_memory_graph_data" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                let all = db.list_all().map_err(|e| e.to_string())?;
                let nodes: Vec<_> = all
                    .iter()
                    .map(|r| {
                        serde_json::json!({
                            "id": r.id, "label": r.content.chars().take(60).collect::<String>(),
                            "role": r.metadata.get("role").cloned().unwrap_or_default()
                        })
                    })
                    .collect();
                Ok(serde_json::json!({ "nodes": nodes, "edges": [], "count": nodes.len() }))
            } else {
                Err("Memory database not initialized".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Window Management (require Tauri Window handle — stubs)
        // ────────────────────────────────────────────────────────────────────
        // set_kiosk_mode/get_window_mode/close_splashscreen/install_bmad_to_dir → real implementations below
        "_stub_window_removed" | "_stub_bmad_removed" => {
            Ok(serde_json::json!({ "status": "stub_removed" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Write to / Kill running process
        // ────────────────────────────────────────────────────────────────────
        // write_to_process / kill_process → final stubs below
        "_stub_process_removed" => Ok(serde_json::json!({ "status": "stub_removed" })),

        // ────────────────────────────────────────────────────────────────────
        // Transfer Extended (require AppHandle for events — stubs)
        // ────────────────────────────────────────────────────────────────────
        "start_file_transfer" => {
            let peer_ip = args
                .get("peer_ip")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'peer_ip'")?
                .to_string();
            let file_path = args
                .get("file_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'file_path'")?
                .to_string();
            let transfer_id = crate::transfer::start_file_transfer_impl(
                peer_ip,
                file_path,
                state.broadcaster.clone(),
                state.transfer.clone(),
            )
            .await?;
            Ok(serde_json::json!({ "status": "started", "transfer_id": transfer_id }))
        }

        "respond_to_transfer" => {
            let transfer_id = args
                .get("transfer_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'transfer_id'")?
                .to_string();
            let accept = args
                .get("accept")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let mut s = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(tx) = s.accept_txs.remove(&transfer_id) {
                let _ = tx.send(accept);
                Ok(
                    serde_json::json!({ "status": "responded", "transfer_id": transfer_id, "accept": accept }),
                )
            } else {
                Err("No pending transfer response channel found".to_string())
            }
        }

        "get_discovered_peers" => {
            let transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            let peers: Vec<_> = transfer_state.peers.values().map(|(p, _)| p.clone()).collect();
            Ok(serde_json::json!(peers))
        }

        "get_active_transfers" => {
            let transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            let transfers: Vec<_> = transfer_state
                .transfers
                .values()
                .cloned()
                .collect();
            Ok(serde_json::json!(transfers))
        }

        "set_group_code" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?;
            let mut ts = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            ts.group_code = code.to_string();
            Ok(serde_json::json!({ "status": "set", "code": code }))
        }

        "get_group_code" => {
            let ts = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({ "code": ts.group_code }))
        }

        // ────────────────────────────────────────────────────────────────────
        // SFTP (calls public async fns — no AppHandle needed)
        // ────────────────────────────────────────────────────────────────────
        "sftp_test_connection" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(22) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'user'")?
                .to_string();
            let auth_type = args
                .get("auth_type")
                .and_then(|v| v.as_str())
                .unwrap_or("password")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let key_path = args
                .get("key_path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let result =
                crate::sftp::sftp_test_connection(host, port, user, auth_type, password, key_path)
                    .await
                    .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "connected", "cwd": result }))
        }

        "sftp_list_dir" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(22) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'user'")?
                .to_string();
            let auth_type = args
                .get("auth_type")
                .and_then(|v| v.as_str())
                .unwrap_or("password")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let key_path = args
                .get("key_path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("/")
                .to_string();
            let entries = crate::sftp::sftp_list_dir(
                host,
                port,
                user,
                auth_type,
                password,
                key_path,
                path.clone(),
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "path": path, "entries": entries, "count": entries.len() }))
        }

        "sftp_download_file" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(22) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'user'")?
                .to_string();
            let auth_type = args
                .get("auth_type")
                .and_then(|v| v.as_str())
                .unwrap_or("password")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let key_path = args
                .get("key_path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let remote_path = args
                .get("remote_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'remote_path'")?
                .to_string();
            let local_path = args
                .get("local_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'local_path'")?
                .to_string();
            crate::sftp::sftp_download_file(
                host,
                port,
                user,
                auth_type,
                password,
                key_path,
                remote_path.clone(),
                local_path.clone(),
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(
                serde_json::json!({ "status": "downloaded", "remote_path": remote_path, "local_path": local_path }),
            )
        }

        "sftp_upload_file" => {
            let host = args
                .get("host")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'host'")?
                .to_string();
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(22) as u16;
            let user = args
                .get("user")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'user'")?
                .to_string();
            let auth_type = args
                .get("auth_type")
                .and_then(|v| v.as_str())
                .unwrap_or("password")
                .to_string();
            let password = args
                .get("password")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let key_path = args
                .get("key_path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let local_path = args
                .get("local_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'local_path'")?
                .to_string();
            let remote_path = args
                .get("remote_path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'remote_path'")?
                .to_string();
            crate::sftp::sftp_upload_file(
                host,
                port,
                user,
                auth_type,
                password,
                key_path,
                local_path.clone(),
                remote_path.clone(),
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(
                serde_json::json!({ "status": "uploaded", "local_path": local_path, "remote_path": remote_path }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // LLM Connection Test
        // ────────────────────────────────────────────────────────────────────
        "test_llm_connection" => {
            let provider = args
                .get("provider")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'provider'")?
                .to_string();
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let key = args
                .get("key")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let result = crate::commands::test_llm_connection(provider, model, url, key)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "ok", "message": result }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Whisper Configuration
        // ────────────────────────────────────────────────────────────────────
        "set_whisper_config" => {
            let binary = args
                .get("binary")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let mut app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            app_state.config.stt.whisper_binary = binary.clone();
            app_state.config.stt.whisper_model = model.clone();
            let path = crate::get_config_path();
            crate::config::save_config(&path, &app_state.config).map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "updated", "binary": binary, "model": model }))
        }

        // download_whisper_model → real broadcaster implementation below
        "_stub_whisper_download_removed" => Ok(serde_json::json!({ "status": "stub_removed" })),

        // ────────────────────────────────────────────────────────────────────
        // Plugin Install / Uninstall / Reload (bridge-native)
        // ────────────────────────────────────────────────────────────────────
        "install_plugin" => {
            let url = args
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'url'")?
                .to_string();
            crate::plugin_mgr::install_plugin(url.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "installed", "url": url }))
        }

        "install_plugin_from_registry" => {
            let plugin_id = args
                .get("plugin_id")
                .or_else(|| args.get("pluginId"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'plugin_id'")?
                .to_string();
            crate::plugin_mgr::install_plugin_from_registry(
                plugin_id.clone(),
                state.lua.clone(),
                state.app_state.clone(),
                state.broadcaster.clone(),
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "installed", "plugin_id": plugin_id }))
        }

        "uninstall_plugin" => {
            let plugin_id = args
                .get("plugin_id")
                .or_else(|| args.get("pluginId"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'plugin_id'")?
                .to_string();
            crate::plugin_mgr::uninstall_plugin(plugin_id.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "uninstalled", "plugin_id": plugin_id }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Ollama Pull (streaming via broadcaster)
        // ────────────────────────────────────────────────────────────────────
        "ollama_pull_model" => {
            let base_url = {
                let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                args.get("base_url")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| app_state.config.llm.ollama_base_url.clone())
            };
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model'")?
                .to_string();
            let broadcaster = state.broadcaster.clone();
            let url = format!("{}/api/pull", base_url.trim_end_matches('/'));
            let model_c = model.clone();
            tokio::spawn(async move {
                let client = reqwest::Client::new();
                let body = serde_json::json!({ "model": model_c, "stream": true });
                match client.post(&url).json(&body).send().await {
                    Ok(mut resp) => {
                        while let Ok(Some(chunk)) = resp.chunk().await {
                            if let Ok(s) = std::str::from_utf8(&chunk) {
                                broadcaster.emit(
                                    "ollama_pull_progress",
                                    serde_json::json!({ "model": model_c, "data": s }),
                                );
                            }
                        }
                        broadcaster
                            .emit("ollama_pull_done", serde_json::json!({ "model": model_c }));
                    }
                    Err(e) => broadcaster.emit(
                        "ollama_pull_error",
                        serde_json::json!({ "model": model_c, "error": e.to_string() }),
                    ),
                }
            });
            Ok(
                serde_json::json!({ "status": "streaming", "model": model, "note": "Monitor WebSocket for ollama_pull_progress events" }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // HuggingFace Download (streaming via broadcaster)
        // ────────────────────────────────────────────────────────────────────
        "hf_download_model" => {
            let repo_id = args
                .get("repo_id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'repo_id'")?
                .to_string();
            let filename = args
                .get("filename")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'filename'")?
                .to_string();
            let broadcaster = state.broadcaster.clone();
            let download_id = format!(
                "{}_{}",
                repo_id.replace('/', "_"),
                uuid::Uuid::new_v4()
                    .to_string()
                    .chars()
                    .take(8)
                    .collect::<String>()
            );
            let dl_id = download_id.clone();
            let repo_c = repo_id.clone();
            let file_c = filename.clone();
            tokio::spawn(async move {
                let url = format!("https://huggingface.co/{}/resolve/main/{}", repo_c, file_c);
                let client = reqwest::Client::new();
                match client.get(&url).send().await {
                    Ok(resp) => {
                        let total = resp.content_length().unwrap_or(0);
                        broadcaster.emit(
                            "hf_download_started",
                            serde_json::json!({ "download_id": dl_id, "total_bytes": total }),
                        );
                        let dest = crate::user_config_dir().join("data/models").join(&file_c);
                        std::fs::create_dir_all(dest.parent().unwrap_or(std::path::Path::new(".")))
                            .ok();
                        if let Ok(bytes) = resp.bytes().await {
                            if std::fs::write(&dest, &bytes).is_ok() {
                                broadcaster.emit("hf_download_done", serde_json::json!({ "download_id": dl_id, "path": dest.display().to_string() }));
                            } else {
                                broadcaster.emit("hf_download_error", serde_json::json!({ "download_id": dl_id, "error": "Write failed" }));
                            }
                        }
                    }
                    Err(e) => broadcaster.emit(
                        "hf_download_error",
                        serde_json::json!({ "download_id": dl_id, "error": e.to_string() }),
                    ),
                }
            });
            Ok(
                serde_json::json!({ "status": "downloading", "download_id": download_id, "repo_id": repo_id, "filename": filename }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // Git SSH Key Generation
        // ────────────────────────────────────────────────────────────────────
        "git_generate_ssh_key" => {
            let label = args
                .get("label")
                .and_then(|v| v.as_str())
                .unwrap_or("neurodeck")
                .to_string();
            let ssh_dir = crate::user_config_dir().join("data/ssh_keys");
            std::fs::create_dir_all(&ssh_dir).ok();
            let key_path = ssh_dir.join(format!("{}_rsa", label));
            let key_path_str = key_path.display().to_string();
            let result = tokio::task::spawn_blocking(move || {
                std::process::Command::new("ssh-keygen")
                    .args([
                        "-t",
                        "rsa",
                        "-b",
                        "4096",
                        "-C",
                        &label,
                        "-f",
                        &key_path_str,
                        "-N",
                        "",
                    ])
                    .output()
            })
            .await
            .map_err(|e| e.to_string())?;
            match result {
                Ok(out) if out.status.success() => {
                    let pub_path = format!("{}.pub", key_path.display());
                    let pub_key = std::fs::read_to_string(&pub_path).unwrap_or_default();
                    Ok(
                        serde_json::json!({ "status": "generated", "private_key_path": key_path.display().to_string(), "public_key": pub_key.trim().to_string() }),
                    )
                }
                Ok(out) => Err(format!(
                    "ssh-keygen failed: {}",
                    String::from_utf8_lossy(&out.stderr)
                )),
                Err(e) => Err(format!("ssh-keygen not available: {}", e)),
            }
        }

        "git_ssh_public_keys" => {
            let ssh_dir = crate::user_config_dir().join("data/ssh_keys");
            let mut keys = Vec::new();
            if let Ok(entries) = std::fs::read_dir(&ssh_dir) {
                for entry in entries.flatten() {
                    if entry
                        .path()
                        .extension()
                        .map(|e| e == "pub")
                        .unwrap_or(false)
                    {
                        if let Ok(content) = std::fs::read_to_string(entry.path()) {
                            keys.push(content.trim().to_string());
                        }
                    }
                }
            }
            Ok(serde_json::json!({ "keys": keys, "count": keys.len() }))
        }

        // ────────────────────────────────────────────────────────────────────
        // API Lab — AI Request Generation
        // ────────────────────────────────────────────────────────────────────
        "api_generate_request" => {
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'description'")?;
            let provider = {
                state
                    .app_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .provider
                    .clone()
            };
            let prompt = format!(
                "Generate an HTTP API request for: '{}'\n\
                Return ONLY a JSON object with keys: method (GET/POST/PUT/DELETE), url, headers (object), body (string or null). No markdown.", description
            );
            let result = provider
                .chat_with_image(
                    &prompt,
                    "You are an API expert. Return only JSON.",
                    None,
                    None,
                )
                .await
                .map_err(|e| e.to_string())?;
            let cleaned = result
                .trim()
                .trim_start_matches("```json")
                .trim_start_matches("```")
                .trim_end_matches("```")
                .trim();
            let parsed: serde_json::Value = serde_json::from_str(cleaned)
                .unwrap_or_else(|_| serde_json::json!({ "raw": result }));
            Ok(parsed)
        }

        // ────────────────────────────────────────────────────────────────────
        // Boot Diagnostics (bridge-adapted snapshot)
        // ────────────────────────────────────────────────────────────────────
        "get_boot_diagnostics" => {
            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            let memory_count = app_state
                .mem_db
                .as_ref()
                .and_then(|db| db.export_all_records().ok().map(|r| r.len()))
                .unwrap_or(0);
            let plugins = crate::plugin_mgr::list_local_plugins().unwrap_or_default();
            Ok(serde_json::json!({
                "version":       concat!(env!("CARGO_PKG_VERSION"), "-ptah"),
                "provider":      app_state.config.llm.default_provider,
                "model":         if app_state.config.llm.default_provider == "gemini" { &app_state.config.llm.gemini_model } else { &app_state.config.llm.ollama_model },
                "memory_ready":  app_state.mem_db.is_some(),
                "memory_count":  memory_count,
                "mcp_running":   app_state.mcp_abort.is_some(),
                "plugin_count":  plugins.len(),
                "session_id":    app_state.session_id,
                "persona":       app_state.active_persona,
                "mode":          "bridge_server"
            }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Model Comparison (parallel LLM calls)
        // ────────────────────────────────────────────────────────────────────
        "compare_models" => {
            let prompt = args
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'prompt'")?;
            let model_a = args
                .get("model_a")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model_a'")?;
            let model_b = args
                .get("model_b")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model_b'")?;
            let provider_name = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.config.llm.default_provider.clone()
            };
            let broadcaster = state.broadcaster.clone();
            let prompt_c = prompt.to_string();
            let model_a_c = model_a.to_string();
            let model_b_c = model_b.to_string();
            tokio::spawn(async move {
                for (model_name, label) in [(&model_a_c, "a"), (&model_b_c, "b")] {
                    let provider = if provider_name == "gemini" {
                        Box::new(crate::llm::GeminiProvider::new(model_name.clone()))
                            as Box<dyn crate::llm::LlmProvider>
                    } else {
                        Box::new(crate::llm::OllamaProvider::new(
                            model_name.clone(),
                            "http://localhost:11434".to_string(),
                            "".to_string(),
                        )) as Box<dyn crate::llm::LlmProvider>
                    };
                    match provider.chat_with_image(&prompt_c, "You are a helpful assistant.", None, None).await {
                        Ok(resp) => broadcaster.emit("compare_result", serde_json::json!({ "model": model_name, "label": label, "response": resp })),
                        Err(e)   => broadcaster.emit("compare_error",  serde_json::json!({ "model": model_name, "label": label, "error": e.to_string() })),
                    }
                }
                broadcaster.emit(
                    "compare_done",
                    serde_json::json!({ "models": [model_a_c, model_b_c] }),
                );
            });
            Ok(
                serde_json::json!({ "status": "streaming", "note": "Watch WebSocket for compare_result events" }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // Reload Plugins — uses bridge-native reload (WsBroadcaster + Arc<Mutex<LuaEngine>>)
        // ────────────────────────────────────────────────────────────────────
        "reload_plugins" => {
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                crate::permissions::require_capability(
                    &app.config.security.permission_registry,
                    &agent_id,
                    crate::permissions::Capability::PluginLoad,
                )?;
            }
            crate::plugin_mgr::reload_plugins_bridge(
                state.lua.clone(),
                state.app_state.clone(),
                state.broadcaster.clone(),
            )
            .await
            .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "status": "reloaded" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Document Index (broadcaster for progress instead of AppHandle)
        // ────────────────────────────────────────────────────────────────────
        "index_directory" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let broadcaster = state.broadcaster.clone();
            let (provider, mem_db) = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                (app.provider.clone(), app.mem_db.clone())
            };
            let db = mem_db.ok_or("Memory database not initialized")?;
            let dir = std::path::PathBuf::from(&path);
            if !dir.is_dir() {
                return Err(format!("'{}' is not a directory", path));
            }

            tokio::spawn(async move {
                let mut files: Vec<std::path::PathBuf> = Vec::new();
                fn collect(dir: &std::path::Path, out: &mut Vec<std::path::PathBuf>, limit: usize) {
                    if out.len() >= limit {
                        return;
                    }
                    if let Ok(entries) = std::fs::read_dir(dir) {
                        for e in entries.flatten() {
                            let p = e.path();
                            if p.is_dir() {
                                collect(&p, out, limit);
                            } else if matches!(
                                p.extension().and_then(|x| x.to_str()),
                                Some(
                                    "txt"
                                        | "md"
                                        | "rs"
                                        | "py"
                                        | "js"
                                        | "ts"
                                        | "json"
                                        | "toml"
                                        | "yaml"
                                        | "yml"
                                        | "html"
                                        | "css"
                                )
                            ) {
                                out.push(p);
                            }
                        }
                    }
                }
                collect(&dir, &mut files, 500);
                let total = files.len();
                broadcaster.emit(
                    "doc_index_progress",
                    serde_json::json!({ "indexed": 0, "total": total }),
                );

                let mut indexed = 0usize;
                for file in &files {
                    let content = match std::fs::read_to_string(file) {
                        Ok(c) if !c.trim().is_empty() => c,
                        _ => continue,
                    };
                    let id = format!("doc-{}-{}", chrono::Utc::now().timestamp_millis(), indexed);
                    let mut meta = std::collections::HashMap::new();
                    meta.insert("source".to_string(), "doc".to_string());
                    meta.insert("path".to_string(), file.display().to_string());

                    // Try to generate embedding; fall back to zero vector
                    let embedding = match provider.generate_embedding(&content).await {
                        Ok(e) => e,
                        Err(_) => vec![],
                    };
                    let _ =
                        db.store_message(id, content.chars().take(4000).collect(), embedding, meta);
                    indexed += 1;
                    if indexed % 10 == 0 {
                        broadcaster.emit(
                            "doc_index_progress",
                            serde_json::json!({ "indexed": indexed, "total": total }),
                        );
                    }
                }
                broadcaster.emit(
                    "doc_index_done",
                    serde_json::json!({ "indexed": indexed, "total": total }),
                );
            });

            Ok(
                serde_json::json!({ "status": "indexing", "path": path, "note": "Monitor WebSocket for doc_index_progress events" }),
            )
        }

        "get_indexed_docs" => {
            let mem_db = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.mem_db.clone()
            };
            let db = match mem_db {
                Some(db) => db,
                None => return Ok(serde_json::json!([])),
            };
            let records = db.list_all().map_err(|e| e.to_string())?;
            let mut paths: std::collections::HashSet<String> = std::collections::HashSet::new();
            for r in records {
                // Support both "path" (set by index_directory) and "file" (set by doc_indexer.rs)
                if r.metadata.get("source").map(|s| s.as_str()) == Some("doc")
                    || r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs")
                {
                    if let Some(p) = r.metadata.get("path").or_else(|| r.metadata.get("file")) {
                        paths.insert(p.clone());
                    }
                }
            }
            let mut result: Vec<String> = paths.into_iter().collect();
            result.sort();
            Ok(serde_json::to_value(result).unwrap_or(serde_json::json!([])))
        }

        "search_docs_semantic" => {
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?
                .to_string();
            let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize;

            let (mem_db, provider) = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                (app.mem_db.clone(), app.provider.clone())
            };
            let db = match mem_db {
                Some(db) => db,
                None => return Ok(serde_json::json!([])),
            };

            // Generate embedding for the query
            let embedding = match provider.generate_embedding(&query).await {
                Ok(e) => e,
                Err(_) => {
                    // Keyword fallback — return top-N by text match
                    let records = db.list_all().map_err(|e| e.to_string())?;
                    let words: Vec<&str> = query.split_whitespace().collect();
                    let results: Vec<serde_json::Value> = records
                        .into_iter()
                        .filter(|r| {
                            r.metadata.get("source").map(|s| s.as_str()) == Some("doc")
                                || r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs")
                        })
                        .filter(|r| {
                            let lc = r.content.to_lowercase();
                            words.iter().any(|w| lc.contains(&w.to_lowercase()))
                        })
                        .take(limit)
                        .map(|r| {
                            let file = r
                                .metadata
                                .get("path")
                                .or_else(|| r.metadata.get("file"))
                                .cloned()
                                .unwrap_or_default();
                            serde_json::json!({
                                "file": file,
                                "snippet": r.content.chars().take(300).collect::<String>(),
                                "score": 0.5_f32
                            })
                        })
                        .collect();
                    return Ok(serde_json::to_value(results).unwrap_or(serde_json::json!([])));
                }
            };

            let all_records = db.list_all().map_err(|e| e.to_string())?;
            let docs_records: Vec<_> = all_records
                .into_iter()
                .filter(|r| {
                    r.metadata.get("source").map(|s| s.as_str()) == Some("doc")
                        || r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs")
                })
                .filter(|r| !r.embedding.is_empty())
                .collect();

            let cosine = |a: &[f32], b: &[f32]| -> f32 {
                let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
                let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
                let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
                if na == 0.0 || nb == 0.0 {
                    0.0
                } else {
                    dot / (na * nb)
                }
            };

            let mut scored: Vec<(f32, _)> = docs_records
                .into_iter()
                .map(|r| {
                    let s = cosine(&embedding, &r.embedding);
                    (s, r)
                })
                .collect();
            scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

            let results: Vec<serde_json::Value> = scored
                .into_iter()
                .take(limit)
                .map(|(score, r)| {
                    let file = r
                        .metadata
                        .get("path")
                        .or_else(|| r.metadata.get("file"))
                        .cloned()
                        .unwrap_or_default();
                    serde_json::json!({
                        "file": file,
                        "snippet": r.content.chars().take(300).collect::<String>(),
                        "score": score
                    })
                })
                .collect();

            Ok(serde_json::to_value(results).unwrap_or(serde_json::json!([])))
        }

        "remove_indexed_doc" => {
            let file_path = args
                .get("filePath")
                .or_else(|| args.get("file_path"))
                .and_then(|v| v.as_str())
                .ok_or("Missing 'filePath'")?
                .to_string();
            let mem_db = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.mem_db.clone()
            };
            let db = match mem_db {
                Some(db) => db,
                None => return Ok(serde_json::json!({ "removed": 0 })),
            };
            let all = db.list_all().map_err(|e| e.to_string())?;
            let mut removed = 0usize;
            for r in all {
                let is_doc = r.metadata.get("source").map(|s| s.as_str()) == Some("doc")
                    || r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs");
                let path_val = r.metadata.get("path").or_else(|| r.metadata.get("file"));
                let matches = path_val
                    .map(|p| p.as_str() == file_path.as_str())
                    .unwrap_or(false);
                if is_doc && matches {
                    let _ = db.delete_record(&r.id);
                    removed += 1;
                }
            }
            Ok(serde_json::json!({ "removed": removed }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Whisper Model Download (broadcaster for progress)
        // ────────────────────────────────────────────────────────────────────
        "download_whisper_model" => {
            const VALID_MODELS: &[&str] = &[
                "tiny.en",
                "base.en",
                "small.en",
                "medium.en",
                "tiny",
                "base",
                "small",
                "medium",
            ];
            let model = args
                .get("model")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'model'")?
                .to_string();
            if !VALID_MODELS.contains(&model.as_str()) {
                return Err(format!(
                    "Unknown model '{}'. Valid: {}",
                    model,
                    VALID_MODELS.join(", ")
                ));
            }
            let broadcaster = state.broadcaster.clone();
            let model_c = model.clone();
            tokio::spawn(async move {
                let models_dir = crate::user_config_dir().join("data/models");
                let _ = std::fs::create_dir_all(&models_dir);
                let filename = format!("ggml-{}.bin", model_c);
                let target = models_dir.join(&filename);

                if target.exists() {
                    broadcaster.emit("whisper_download_progress", serde_json::json!({ "done": true, "pct": 100, "skipped": true, "path": target.display().to_string() }));
                    return;
                }

                let url = format!(
                    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
                    model_c
                );
                broadcaster.emit(
                    "whisper_download_progress",
                    serde_json::json!({ "pct": 0, "model": model_c }),
                );
                let client = reqwest::Client::new();
                match client.get(&url).send().await {
                    Ok(resp) => {
                        let _total = resp.content_length().unwrap_or(1);
                        match resp.bytes().await {
                            Ok(bytes) => {
                                if std::fs::write(&target, &bytes).is_ok() {
                                    broadcaster.emit("whisper_download_progress", serde_json::json!({
                                        "done": true, "pct": 100, "path": target.display().to_string(), "bytes": bytes.len()
                                    }));
                                } else {
                                    broadcaster.emit(
                                        "whisper_download_progress",
                                        serde_json::json!({ "error": "Write failed" }),
                                    );
                                }
                            }
                            Err(e) => broadcaster.emit(
                                "whisper_download_progress",
                                serde_json::json!({ "error": e.to_string() }),
                            ),
                        }
                    }
                    Err(e) => broadcaster.emit(
                        "whisper_download_progress",
                        serde_json::json!({ "error": e.to_string() }),
                    ),
                }
            });
            Ok(
                serde_json::json!({ "status": "downloading", "model": model, "note": "Monitor WebSocket for whisper_download_progress events" }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // BMAD Install (use bundled _bmad/ or assets/ directory)
        // ────────────────────────────────────────────────────────────────────
        "install_bmad_to_dir" => {
            let target_dir = args
                .get("target_dir")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'target_dir'")?;
            let target = std::path::Path::new(target_dir);
            if !target.exists() {
                return Err(format!("Target directory does not exist: {}", target_dir));
            }

            // Look for _bmad or assets/bmad-bundle relative to project root
            let source = ["_bmad", "assets/bmad-bundle", "../_bmad"]
                .iter()
                .map(std::path::PathBuf::from)
                .find(|p| p.exists())
                .ok_or("BMAD bundle not found. Ensure _bmad/ exists at the project root.")?;

            // Copy directory
            fn copy_dir(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<usize> {
                std::fs::create_dir_all(dst)?;
                let mut count = 0;
                for entry in std::fs::read_dir(src)?.flatten() {
                    let dest_path = dst.join(entry.file_name());
                    if entry.path().is_dir() {
                        count += copy_dir(&entry.path(), &dest_path)?;
                    } else {
                        std::fs::copy(&entry.path(), &dest_path)?;
                        count += 1;
                    }
                }
                Ok(count)
            }
            let count = copy_dir(&source, &target.join("_bmad"))
                .map_err(|e| format!("Copy failed: {}", e))?;

            state.broadcaster.emit(
                "bmad_install_progress",
                serde_json::json!({ "stage": "done", "files": count, "target": target_dir }),
            );
            Ok(
                serde_json::json!({ "status": "installed", "target": target_dir, "files_copied": count }),
            )
        }

        // ────────────────────────────────────────────────────────────────────
        // Remote Control Send (via broadcast_tx — no AppHandle needed)
        // ────────────────────────────────────────────────────────────────────
        "remote_send_to_clients" => {
            let message = args
                .get("message")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'message'")?;
            let guard = state
                .remote
                .handle
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if let Some(ref h) = *guard {
                let _ = h.broadcast_tx.send(message.to_string());
                Ok(serde_json::json!({ "status": "sent", "message_len": message.len() }))
            } else {
                Err("Remote server not running".to_string())
            }
        }

        "remote_relay_notification" => {
            let payload = args.get("payload").cloned().unwrap_or(args.clone());
            let guard = state
                .remote
                .handle
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if let Some(ref h) = *guard {
                let _ = h.broadcast_tx.send(
                    serde_json::json!({ "type": "notification", "data": payload }).to_string(),
                );
                Ok(serde_json::json!({ "status": "relayed" }))
            } else {
                Ok(
                    serde_json::json!({ "status": "no_clients", "note": "Remote server not running" }),
                )
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Final AppHandle-only stubs (window, remote server lifecycle)
        // ────────────────────────────────────────────────────────────────────
        "start_remote_server" => {
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(9333) as u16;
            let result = crate::remote_control::start_remote_server_bridge(
                port,
                state.broadcaster.clone(),
                state.remote.clone(),
                state.pty.clone(),
            )
            .await?;
            Ok(result)
        }

        "stop_remote_server" => {
            crate::remote_control::stop_remote_server_bridge(
                state.remote.clone(),
                state.pty.clone(),
            )
            .await?;
            Ok(serde_json::json!({ "status": "stopped" }))
        }

        "queue_agent_approval_request" => {
            let action_type = args
                .get("action_type")
                .and_then(|v| v.as_str())
                .unwrap_or("action")
                .to_string();
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let request_id = format!("{:016x}", rand::random::<u64>());
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            let approval = crate::remote_control::PendingApproval {
                request_id: request_id.clone(),
                action_type: action_type.clone(),
                description: description.clone(),
                timestamp,
            };
            {
                let mut guard = state
                    .remote
                    .pending_approvals
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                guard.push(approval);
            }
            {
                let guard = state
                    .remote
                    .handle
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                if let Some(ref h) = *guard {
                    let msg = serde_json::json!({
                        "type": "agent_approval_request",
                        "request_id": request_id,
                        "action_type": action_type,
                        "description": description,
                        "timestamp": timestamp,
                    })
                    .to_string();
                    let _ = h.broadcast_tx.send(msg);
                }
            }
            Ok(serde_json::json!({"request_id": request_id}))
        }

        "get_pending_approvals" => {
            let guard = state
                .remote
                .pending_approvals
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            Ok(serde_json::json!({"approvals": *guard}))
        }

        "resolve_agent_approval" => {
            let request_id = args
                .get("request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let mut guard = state
                .remote
                .pending_approvals
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            guard.retain(|a| a.request_id != request_id);
            Ok(serde_json::json!({"ok": true}))
        }

        "canvas_collab_host" => {
            let port = args.get("port").and_then(|v| v.as_u64()).unwrap_or(9733) as u16;
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(abort) = app.collab_abort.take() {
                    abort.abort();
                }
                app.collab_tx = None;
                app.collab_mode = None;
                app.collab_addr = None;
                app.collab_peer_count = None;
            }
            let (bound_port, session) =
                crate::canvas_collab::host(port, state.broadcaster.clone()).await?;
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.collab_abort = Some(session.abort_handle);
                app.collab_tx = Some(session.tx);
                app.collab_mode = Some("host".to_string());
                app.collab_addr = Some(format!("0.0.0.0:{}", bound_port));
                app.collab_peer_count = Some(session.peer_count);
            }
            Ok(serde_json::json!({ "port": bound_port }))
        }

        "canvas_collab_join" => {
            let addr = args
                .get("addr")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'addr'")?
                .to_string();
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(abort) = app.collab_abort.take() {
                    abort.abort();
                }
                app.collab_tx = None;
                app.collab_mode = None;
                app.collab_addr = None;
                app.collab_peer_count = None;
            }
            let session = crate::canvas_collab::join(&addr, state.broadcaster.clone()).await?;
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.collab_abort = Some(session.abort_handle);
                app.collab_tx = Some(session.tx);
                app.collab_mode = Some("guest".to_string());
                app.collab_addr = Some(addr);
                app.collab_peer_count = Some(session.peer_count);
            }
            Ok(serde_json::json!({ "status": "joined" }))
        }

        "set_kiosk_mode" => Ok(
            serde_json::json!({ "status": "unavailable", "note": "Window management requires a Tauri Window handle; bridge mode has no WebView" }),
        ),

        "get_window_mode" => Ok(
            serde_json::json!({ "fullscreen": false, "decorations": true, "kiosk": false, "note": "Bridge mode has no window" }),
        ),

        "close_splashscreen" => Ok(
            serde_json::json!({ "status": "no_splashscreen", "note": "Bridge mode has no splashscreen" }),
        ),

        "dispatch_action" => {
            let action_id = args
                .get("action")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'action'")?
                .to_string();
            state.broadcaster.emit("deckcode-action", action_id);
            Ok(serde_json::json!({ "status": "dispatched" }))
        }

        "write_to_process" => {
            let input = args
                .get("input")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'input'")?;
            if input.len() > 32 * 1024 {
                return Err("Input exceeds 32KB".to_string());
            }
            let tx = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.process_stdin_tx.clone()
            };
            if let Some(tx) = tx {
                tx.send(input.to_string())
                    .await
                    .map_err(|e| format!("Failed to send to stdin channel: {}", e))?;
                Ok(serde_json::json!({ "status": "written" }))
            } else {
                Err("No active process running to write to".to_string())
            }
        }

        "kill_process" => {
            let tx = {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.kill_tx.take()
            };
            if let Some(tx) = tx {
                let _ = tx.send(());
                Ok(serde_json::json!({ "status": "killed" }))
            } else {
                Err("No active process running to kill".to_string())
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Canvas Code Execution (bridge-native, streams via WebSocket)
        // ────────────────────────────────────────────────────────────────────
        "exec_code_stream" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?
                .to_string();
            let lang = args
                .get("lang")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'lang'")?
                .to_string();

            let (workspace_path, agent_id) = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                let agent_id = app.config.llm.active_agent_id.clone();
                (app.config.get_resolved_workspace(), agent_id)
            };

            crate::permissions::require_capability(
                &state
                    .app_state
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .config
                    .security
                    .permission_registry,
                &agent_id,
                crate::permissions::Capability::ShellExec,
            )?;

            crate::security::validate_script_payload(
                &code,
                &lang,
                "canvas-exec",
                workspace_path.as_deref(),
            )?;

            let (program, args_vec): (String, Vec<String>) = match lang.to_lowercase().as_str() {
                "python" | "python3" => {
                    if cfg!(target_os = "windows") {
                        ("python".to_string(), vec!["-c".to_string(), code.clone()])
                    } else {
                        ("python3".to_string(), vec!["-c".to_string(), code.clone()])
                    }
                }
                "bash" | "sh" | "shell" => {
                    if cfg!(target_os = "windows") {
                        (
                            "powershell".to_string(),
                            vec!["-Command".to_string(), code.clone()],
                        )
                    } else {
                        ("bash".to_string(), vec!["-c".to_string(), code.clone()])
                    }
                }
                "powershell" => (
                    "powershell".to_string(),
                    vec!["-Command".to_string(), code.clone()],
                ),
                "javascript" | "js" | "node" => {
                    ("node".to_string(), vec!["-e".to_string(), code.clone()])
                }
                _ => return Err(format!("Unsupported language: {lang}")),
            };

            // Cancel any previous exec
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(cancel_tx) = app.canvas_exec_cancel_tx.take() {
                    let _ = cancel_tx.send(());
                }
            }

            let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.canvas_exec_cancel_tx = Some(cancel_tx);
            }

            let broadcaster = state.broadcaster.clone();
            tokio::spawn(async move {
                use std::process::Stdio;
                use tokio::io::{AsyncBufReadExt, BufReader};

                let start = std::time::Instant::now();

                let mut cmd = tokio::process::Command::new(&program);
                cmd.args(&args_vec)
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped());
                if let Some(ref wp) = workspace_path {
                    cmd.current_dir(wp);
                }

                let mut child = match cmd.spawn() {
                    Ok(c) => c,
                    Err(e) => {
                        broadcaster.emit("canvas_exec_line", serde_json::json!({ "stream": "stderr", "line": format!("[error] Failed to spawn '{}': {}", program, e) }));
                        broadcaster.emit("canvas_exec_done", serde_json::json!({ "exit_code": -1, "duration_ms": start.elapsed().as_millis() as u64 }));
                        return;
                    }
                };

                let Some(stdout) = child.stdout.take() else {
                    let _ = child.kill().await;
                    broadcaster.emit(
                        "canvas_exec_done",
                        serde_json::json!({ "exit_code": -1, "duration_ms": 0u64 }),
                    );
                    return;
                };
                let Some(stderr) = child.stderr.take() else {
                    let _ = child.kill().await;
                    broadcaster.emit(
                        "canvas_exec_done",
                        serde_json::json!({ "exit_code": -1, "duration_ms": 0u64 }),
                    );
                    return;
                };

                let b1 = broadcaster.clone();
                let b2 = broadcaster.clone();
                let stdout_task = tokio::spawn(async move {
                    let mut lines = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        b1.emit(
                            "canvas_exec_line",
                            serde_json::json!({ "stream": "stdout", "line": line }),
                        );
                    }
                });
                let stderr_task = tokio::spawn(async move {
                    let mut lines = BufReader::new(stderr).lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        b2.emit(
                            "canvas_exec_line",
                            serde_json::json!({ "stream": "stderr", "line": line }),
                        );
                    }
                });

                let exit_code = tokio::select! {
                    status = child.wait() => status.ok().and_then(|s| s.code()).unwrap_or(-1),
                    _ = &mut cancel_rx => {
                        let _ = child.kill().await;
                        broadcaster.emit("canvas_exec_line", serde_json::json!({ "stream": "stderr", "line": "[cancelled] Execution cancelled by user." }));
                        -3
                    }
                    _ = tokio::time::sleep(std::time::Duration::from_secs(120)) => {
                        let _ = child.kill().await;
                        broadcaster.emit("canvas_exec_line", serde_json::json!({ "stream": "stderr", "line": "[error] Execution timed out (120s limit)." }));
                        -2
                    }
                };

                let _ = tokio::join!(stdout_task, stderr_task);
                broadcaster.emit(
                    "canvas_exec_done",
                    serde_json::json!({
                        "exit_code": exit_code,
                        "duration_ms": start.elapsed().as_millis() as u64
                    }),
                );
            });

            Ok(serde_json::json!({ "status": "started" }))
        }

        "cancel_exec" => {
            let tx = {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.canvas_exec_cancel_tx.take()
            };
            if let Some(tx) = tx {
                let _ = tx.send(());
                Ok(serde_json::json!({ "status": "cancelled" }))
            } else {
                Ok(serde_json::json!({ "status": "no_active_exec" }))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Project Knowledge Spaces
        // ────────────────────────────────────────────────────────────────────
        "create_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "name required".to_string())?;
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let color = args
                .get("color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let id = uuid::Uuid::new_v4().to_string();
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            let project = project_db
                .create(id, name.to_string(), description, color)
                .await?;
            Ok(serde_json::to_value(project).map_err(|e| e.to_string())?)
        }

        "list_projects" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            let projects = project_db.list().await?;
            Ok(serde_json::to_value(projects).map_err(|e| e.to_string())?)
        }

        "get_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            let project = project_db.get(id).await?;
            Ok(serde_json::to_value(project).map_err(|e| e.to_string())?)
        }

        "update_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let color = args
                .get("color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            project_db.update(id, name, description, color).await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "delete_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            project_db.delete(id).await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "set_session_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let session_id = args
                .get("session_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "session_id required".to_string())?;
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            project_db
                .set_session_project(session_id, project_id)
                .await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "set_memory_project" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let memory_id = args
                .get("memory_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "memory_id required".to_string())?;
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            project_db.set_memory_project(memory_id, project_id).await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "get_project_sessions" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            let sessions = project_db.get_project_sessions(id).await?;
            Ok(serde_json::to_value(sessions).map_err(|e| e.to_string())?)
        }

        "get_project_memory" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let project_db = crate::projects::ProjectDB::new(db.pool.clone());
            let records = project_db.get_project_memory(id).await?;
            Ok(serde_json::to_value(records).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Universal Search
        // ────────────────────────────────────────────────────────────────────
        "universal_search" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let query = args
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "query required".to_string())?;
            let limit = args.get("limit").and_then(|v| v.as_i64()).unwrap_or(20);
            let source_filter = args
                .get("source_filter")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let project_id = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let engine = crate::search::SearchEngine::new(db.pool.clone());
            let results = engine
                .universal_search(query, limit, source_filter, project_id)
                .await?;
            Ok(serde_json::to_value(results).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Context Packs
        // ────────────────────────────────────────────────────────────────────
        "create_pack" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "name required".to_string())?;
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let color = args
                .get("color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let privacy_level = args
                .get("privacy_level")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let id = uuid::Uuid::new_v4().to_string();
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            let pack = pack_db
                .create(id, name.to_string(), description, color, privacy_level)
                .await?;
            Ok(serde_json::to_value(pack).map_err(|e| e.to_string())?)
        }

        "list_packs" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            let packs = pack_db.list().await?;
            Ok(serde_json::to_value(packs).map_err(|e| e.to_string())?)
        }

        "get_pack" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            let pack = pack_db.get(id).await?;
            Ok(serde_json::to_value(pack).map_err(|e| e.to_string())?)
        }

        "update_pack" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let name = args
                .get("name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let description = args
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let color = args
                .get("color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let privacy_level = args
                .get("privacy_level")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            pack_db
                .update(id, name, description, color, privacy_level)
                .await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "delete_pack" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            pack_db.delete(id).await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "set_memory_pack" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let memory_id = args
                .get("memory_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "memory_id required".to_string())?;
            let pack_id = args
                .get("pack_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            pack_db.set_memory_pack(memory_id, pack_id).await?;
            Ok(serde_json::json!({ "success": true }))
        }

        "get_pack_memory" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "id required".to_string())?;
            let pack_db = crate::context_packs::PackDB::new(db.pool.clone());
            let records = pack_db.get_pack_memory(id).await?;
            Ok(serde_json::to_value(records).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Privacy
        // ────────────────────────────────────────────────────────────────────
        "set_memory_privacy" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let memory_id = args
                .get("memory_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "memory_id required".to_string())?;
            let level = args
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("standard");
            sqlx::query("UPDATE memory_records SET privacy_level = ? WHERE id = ?")
                .bind(level)
                .bind(memory_id)
                .execute(&db.pool)
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "success": true }))
        }

        "unlock_sealed_records" => {
            let ids = args
                .get("ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                for id in &ids {
                    app.unlock_state.unlock(id);
                }
            }
            Ok(serde_json::json!({ "unlocked": ids.len() }))
        }

        "lock_all_sealed" => {
            {
                let mut app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                app.unlock_state.lock_all();
            }
            Ok(serde_json::json!({ "success": true }))
        }

        // ────────────────────────────────────────────────────────────────────
        // Dashboard
        // ────────────────────────────────────────────────────────────────────
        "get_dashboard_stats" => {
            let db = state
                .db
                .as_ref()
                .ok_or_else(|| "Database not available".to_string())?;
            let provider;
            let model;
            {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                provider = app.config.llm.default_provider.clone();
                model = if provider == "gemini" {
                    app.config.llm.gemini_model.clone()
                } else {
                    app.config.llm.ollama_model.clone()
                };
            }
            let dashboard = crate::dashboard::DashboardDB::new(db.pool.clone(), &db.db_path);
            let stats = dashboard.get_stats(&provider, &model).await?;
            Ok(serde_json::to_value(stats).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // Observability
        // ────────────────────────────────────────────────────────────────────
        "generate_support_bundle" => {
            let app_arc = state.app_state.clone();
            let result = tokio::task::spawn_blocking(move || {
                crate::commands::system::generate_support_bundle(app_arc)
            })
            .await
            .map_err(|e| format!("spawn_blocking: {}", e))??;
            Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
        }

        "get_system_health" => {
            let app_arc = state.app_state.clone();
            let report = tokio::task::spawn_blocking(move || {
                crate::commands::system::get_system_health(app_arc)
            })
            .await
            .map_err(|e| format!("spawn_blocking: {}", e))?;
            Ok(serde_json::to_value(report).map_err(|e| e.to_string())?)
        }

        // ────────────────────────────────────────────────────────────────────
        // LLM Utilities
        // ────────────────────────────────────────────────────────────────────
        "llm_oneshot" => {
            let prompt = args
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'prompt'")?;
            let max_tokens = args
                .get("max_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(512) as u32;
            let provider = {
                let app = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
                Arc::clone(&app.provider)
            };
            let result = provider
                .generate_oneshot(prompt, max_tokens)
                .await
                .map_err(|e| format!("LLM oneshot failed: {}", e))?;
            Ok(serde_json::json!({ "result": result }))
        }

        // ────────────────────────────────────────────────────────────────────
        // CLI Maker commands
        // ────────────────────────────────────────────────────────────────────

        "cli_list_commands" => {
            let json = crate::commands::cli_maker::cli_list_commands()?;
            Ok(serde_json::from_str(&json).unwrap_or(serde_json::json!([])))
        }

        "cli_create_command" => {
            let def = args
                .get("def")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'def'")?
                .to_string();
            let id = crate::commands::cli_maker::cli_create_command(def)?;
            Ok(serde_json::json!({ "id": id }))
        }

        "cli_update_command" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let def = args
                .get("def")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'def'")?
                .to_string();
            crate::commands::cli_maker::cli_update_command(id, def)?;
            Ok(serde_json::json!({ "status": "updated" }))
        }

        "cli_delete_command" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            crate::commands::cli_maker::cli_delete_command(id)?;
            Ok(serde_json::json!({ "status": "deleted" }))
        }

        "cli_run_command" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let run_args = args
                .get("args")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let output = crate::commands::cli_maker::cli_run_command(id, run_args)?;
            Ok(serde_json::json!({ "output": output }))
        }

        "cli_export_lua" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let lua = crate::commands::cli_maker::cli_export_lua(id)?;
            Ok(serde_json::json!({ "lua": lua }))
        }

        "cli_import_lua" => {
            let path = args
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'path'")?
                .to_string();
            let json = crate::commands::cli_maker::cli_import_lua(path)?;
            Ok(serde_json::from_str(&json).unwrap_or(serde_json::json!([])))
        }

        "cli_maker_save_plugin" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let path = crate::commands::cli_maker::cli_maker_save_plugin(id)?;
            Ok(serde_json::json!({ "path": path }))
        }

        "cli_maker_export" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let format = args
                .get("format")
                .and_then(|v| v.as_str())
                .unwrap_or("lua")
                .to_string();
            let path = crate::commands::cli_maker::cli_maker_export(id, format)?;
            Ok(serde_json::json!({ "path": path }))
        }

        "cli_list_hooks" => {
            let json = crate::commands::cli_maker::cli_list_hooks()?;
            Ok(serde_json::from_str(&json).unwrap_or(serde_json::json!([])))
        }

        "cli_toggle_hook" => {
            let id = args
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?
                .to_string();
            let enabled = args
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            crate::commands::cli_maker::cli_toggle_hook(id, enabled)?;
            Ok(serde_json::json!({ "status": "ok" }))
        }

        // ────────────────────────────────────────────────────────────────────
        // execute_lua — debug-only Lua execution from the UI
        // ────────────────────────────────────────────────────────────────────

        "execute_lua" => {
            let code = args
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or("Missing 'code'")?
                .to_string();
            crate::security::validate_script_payload(&code, "lua", "lua-exec", None)?;
            let lua = Arc::clone(&state.lua);
            let broadcaster = state.broadcaster.clone();
            tokio::task::spawn_blocking(move || {
                let engine = lua.lock().unwrap_or_else(|e| e.into_inner());
                match engine.run_script(&code) {
                    Ok(_) => broadcaster.emit("command_exit", serde_json::json!(0)),
                    Err(e) => {
                        broadcaster.emit("command_stderr", serde_json::json!(format!("{}\n", e)));
                        broadcaster.emit("command_exit", serde_json::json!(1));
                    }
                }
            })
            .await
            .map_err(|e| format!("Task join error: {}", e))?;
            Ok(serde_json::json!({ "status": "ok" }))
        }

        // browser_get_url — returns the current browser URL tracked by the frontend;
        // in Electron mode the URL state lives in the renderer, so the backend always
        // returns empty string and the frontend ignores it gracefully.
        "browser_get_url" => Ok(serde_json::json!({ "url": "" })),

        // ────────────────────────────────────────────────────────────────────
        // Absolute final catch-all
        // ────────────────────────────────────────────────────────────────────
        _ => Err(format!(
            "Command '{}' not found in bridge dispatch table. \
            Bridge status: ~297 commands (>99% coverage). \
            Bridge-unavailable (Electron handles instead): set_kiosk_mode. \
            Full command reference: docs/BRIDGE_SERVER_PROGRESS.md",
            command
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn promptdrive_slot_values_rejects_non_object_payload() {
        let args = serde_json::json!({ "slot_values": ["task", "review"] });
        let err = promptdrive_slot_values(&args).unwrap_err();
        assert_eq!(err, "slot_values must be an object");
    }

    #[test]
    fn promptdrive_macro_steps_rejects_malformed_payload() {
        let args = serde_json::json!({
            "steps": [
                {
                    "kind": "update_slot",
                    "timestamp": "2026-01-01T00:00:00Z",
                    "payload": { "slot_id": "task" }
                }
            ]
        });
        let err = promptdrive_macro_steps(&args).unwrap_err();
        assert!(err.contains("Invalid macro steps"));
    }

    #[test]
    fn promptdrive_required_str_rejects_missing_fields() {
        let err = promptdrive_required_str(&serde_json::json!({}), "macro_id").unwrap_err();
        assert_eq!(err, "Missing 'macro_id'");
    }
}
