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
use futures_util::StreamExt;

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
        "send_command" => {
            let message = args.get("message").and_then(|v| v.as_str())
                .ok_or("Missing 'message'")?;
            let image_base64 = args.get("image_base64").and_then(|v| v.as_str()).map(|s| s.to_string());
            let image_mime = args.get("image_mime").and_then(|v| v.as_str()).map(|s| s.to_string());

            let broadcaster = state.broadcaster.clone();
            let app_state_clone = state.app_state.clone();
            let provider_clone = {
                let app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                app.provider.clone()
            };
            let message_clone = message.to_string();

            tokio::spawn(async move {
                // 1. Add user message to state
                {
                    let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    app.messages.push(format!("User: {}", message_clone));
                }

                // 2. Get system prompt from active persona
                let system_prompt = {
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

                let mut full_response = String::new();

                // 3. Stream response from LLM
                if let Some(ref b64) = image_base64 {
                    // Vision path (non-streaming)
                    let mime_str = image_mime.as_deref().unwrap_or("image/png");
                    match provider_clone.chat_with_image(
                        &message_clone,
                        &system_prompt,
                        Some(b64),
                        Some(mime_str),
                    ).await {
                        Ok(response) => {
                            full_response = response.clone();
                            broadcaster.emit("command_token", serde_json::json!({ "token": response }));
                        }
                        Err(e) => {
                            broadcaster.emit("command_error", serde_json::json!({ "error": e.to_string() }));
                            return;
                        }
                    }
                } else {
                    // Normal streaming path
                    let mut stream = provider_clone.stream_response(&message_clone, &system_prompt);
                    while let Some(chunk_res) = stream.next().await {
                        match chunk_res {
                            Ok(chunk) => {
                                full_response.push_str(&chunk);
                                broadcaster.emit("command_token", serde_json::json!({ "token": chunk }));
                            }
                            Err(e) => {
                                broadcaster.emit("command_error", serde_json::json!({ "error": e.to_string() }));
                                return;
                            }
                        }
                    }
                }

                // 4. Store AI response in state
                {
                    let mut app = app_state_clone.lock().unwrap_or_else(|e| e.into_inner());
                    app.messages.push(format!("AI: {}", full_response));
                }

                // 5. Signal completion
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
            let content = args.get("content").and_then(|v| v.as_str())
                .ok_or("Missing 'content'")?;

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
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or("Missing 'query'")?;

            let app_state = state.app_state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(ref db) = app_state.mem_db {
                match db.list_all() {
                    Ok(records) => {
                        let query_words: Vec<&str> = query
                            .split_whitespace()
                            .filter(|w| w.len() > 3)
                            .collect();

                        let mut results: Vec<(usize, _)> = records
                            .into_iter()
                            .filter_map(|rec| {
                                let lower = rec.content.to_lowercase();
                                let hits = query_words
                                    .iter()
                                    .filter(|w| lower.contains(&w.to_lowercase()[..]))
                                    .count();
                                if hits > 0 { Some((hits, rec)) } else { None }
                            })
                            .collect();

                        results.sort_by(|a, b| b.0.cmp(&a.0));
                        let top_3: Vec<_> = results
                            .into_iter()
                            .take(3)
                            .map(|(_, rec)| serde_json::json!({
                                "id": rec.id,
                                "content": rec.content,
                                "metadata": rec.metadata
                            }))
                            .collect();

                        Ok(serde_json::json!({
                            "query": query,
                            "results": top_3,
                            "count": top_3.len()
                        }))
                    }
                    Err(e) => Err(format!("Memory search error: {}", e))
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
            app_state.active_persona = "Default".to_string();

            Ok(serde_json::json!({
                "status": "created",
                "session_id": session_id,
                "messages": 0,
                "persona": "Default"
            }))
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
            let cmd = args.get("command").and_then(|v| v.as_str())
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
                        Err(e) => (String::new(), e.to_string(), -1)
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
                (app_state.provider.clone(), app_state.config.llm.default_provider.clone())
            };
            let broadcaster = state.broadcaster.clone();

            tokio::spawn(async move {
                match provider.chat_with_image("ping", "You are a helpful assistant. Reply with 'pong'.", None, None).await {
                    Ok(response) => {
                        broadcaster.emit("connection_test", serde_json::json!({
                            "status": "success",
                            "provider": provider_name,
                            "response": response
                        }));
                    }
                    Err(e) => {
                        broadcaster.emit("connection_test", serde_json::json!({
                            "status": "failed",
                            "provider": provider_name,
                            "error": e.to_string()
                        }));
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
            let count = app_state.mem_db.as_ref()
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

            Ok(serde_json::json!({
                "agent": {
                    "running": false,  // TODO: check orchestrator state
                    "step_count": 0,   // TODO: get from orchestrator
                    "status": "idle"
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
        // Remaining 270+ commands (template provided in BRIDGE_SERVER.md)
        // ────────────────────────────────────────────────────────────────────

        _ => Err(format!(
            "Command '{}' not yet implemented in bridge mode.\n\
            Bridge status: 20 commands implemented, 275+ remaining.\n\
            Implemented: health, get_system_info, get_initial_state, list_sessions, \
            save_session, load_session, get_config, get_personas, set_persona, send_command, \
            memory_add_fact, memory_search, new_session, list_models, execute_command_sync, \
            test_connection, get_doc_count, cancel_generation, get_agent_status.\n\
            \n\
            To add '{}' to bridge server:\n\
            1. Open src-tauri/src/commands/mod.rs\n\
            2. Add match arm for '{}'\n\
            3. Extract args: args.get(\"key\").and_then(|v| v.as_str())?\n\
            4. Call handler and return Ok(serde_json::json!(...))\n\
            5. For streaming: state.broadcaster.emit(\"event\", payload)\n\
            6. For blocking I/O: use tokio::task::spawn_blocking\n\
            7. See docs/BRIDGE_SERVER.md for full implementation guide",
            command, command, command
        )),
    }
}
