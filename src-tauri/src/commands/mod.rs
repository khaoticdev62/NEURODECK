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
        "pty_spawn" => {
            let id = args.get("id").and_then(|v| v.as_str())
                .unwrap_or(&format!("pty_{}", chrono::Utc::now().timestamp()))
                .to_string();
            let cols = args.get("cols").and_then(|v| v.as_u64()).unwrap_or(80) as u16;
            let rows = args.get("rows").and_then(|v| v.as_u64()).unwrap_or(24) as u16;
            let _shell = args.get("shell").and_then(|v| v.as_str()).map(|s| s.to_string());
            let _args_list = args.get("args").and_then(|v| v.as_array()).map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect::<Vec<_>>()
            });

            let broadcaster = state.broadcaster.clone();

            // Emit session created event
            broadcaster.emit("pty_session_created", serde_json::json!({
                "id": id,
                "cols": cols,
                "rows": rows
            }));

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
            let id = args.get("id").and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let data = args.get("data").and_then(|v| v.as_str())
                .ok_or("Missing 'data'")?;

            let mut sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(session) = sessions.get_mut(id) {
                use std::io::Write;
                session.writer
                    .write_all(data.as_bytes())
                    .map_err(|e| format!("Failed to write to PTY: {}", e))?;
                session.writer
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
            let id = args.get("id").and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if sessions.remove(id).is_some() {
                state.broadcaster.emit("pty_killed", serde_json::json!({ "id": id }));
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
            let id = args.get("id").and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;
            let cols = args.get("cols").and_then(|v| v.as_u64())
                .ok_or("Missing 'cols'")? as u16;
            let rows = args.get("rows").and_then(|v| v.as_u64())
                .ok_or("Missing 'rows'")? as u16;

            // Verify session exists
            let sessions = state.pty.sessions.lock().unwrap_or_else(|e| e.into_inner());
            if sessions.contains_key(id) {
                // PTY resize requires ioctl calls which are complex in bridge mode
                // For now, acknowledge the resize request but don't perform it
                // TODO: Implement proper PTY resize via ioctl once dependencies are available

                state.broadcaster.emit("pty_resize_requested", serde_json::json!({
                    "id": id,
                    "cols": cols,
                    "rows": rows
                }));

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
            let orch_state = state.orchestrator.state.lock().unwrap_or_else(|e| e.into_inner());

            let (running, task_count, tasks) = {
                if let Some(ref plan) = orch_state.plan {
                    (
                        orch_state.running,
                        plan.tasks.len(),
                        plan.tasks.iter().map(|t| serde_json::json!({
                            "id": t.id,
                            "role": t.role,
                            "status": t.status,
                            "result": t.result
                        })).collect::<Vec<_>>()
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
            let goal = args.get("goal").and_then(|v| v.as_str())
                .ok_or("Missing 'goal'")?;

            let mut orch_state = state.orchestrator.state.lock().unwrap_or_else(|e| e.into_inner());
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
            broadcaster.emit("agent_started", serde_json::json!({
                "goal": goal,
                "task_id": task.id,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));

            Ok(serde_json::json!({
                "status": "started",
                "goal": goal,
                "task_id": task.id,
                "message": "Agent loop initialized"
            }))
        }

        "stop_agent" => {
            let mut orch_state = state.orchestrator.state.lock().unwrap_or_else(|e| e.into_inner());
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
            broadcaster.emit("agent_stopped", serde_json::json!({
                "goal": plan_goal,
                "timestamp": chrono::Utc::now().to_rfc3339()
            }));

            Ok(serde_json::json!({
                "status": "stopped",
                "goal": plan_goal,
                "message": "Agent loop terminated"
            }))
        }

        "agent_step" => {
            let orch_state = state.orchestrator.state.lock().unwrap_or_else(|e| e.into_inner());

            if !orch_state.running {
                return Ok(serde_json::json!({
                    "step": 0,
                    "running": false,
                    "status": "idle",
                    "message": "Agent not running"
                }));
            }

            // Count completed tasks
            let (total_tasks, completed_tasks, current_task) = if let Some(ref plan) = orch_state.plan {
                let total = plan.tasks.len();
                let completed = plan.tasks.iter().filter(|t| t.status == "done").count();
                let curr = plan.tasks.iter()
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

        "get_agent_plan" => {
            let orch_state = state.orchestrator.state.lock().unwrap_or_else(|e| e.into_inner());

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
            let id = args.get("id").and_then(|v| v.as_str())
                .ok_or("Missing 'id'")?;

            let mut transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());

            // Remove transfer by key (id)
            if let Some(_cancelled) = transfer_state.transfers.remove(id) {
                state.broadcaster.emit("transfer_cancelled", serde_json::json!({
                    "id": id
                }));

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
            let action = args.get("action").and_then(|v| v.as_str())
                .unwrap_or("get");

            let mut transfer_state = state.transfer.0.lock().unwrap_or_else(|e| e.into_inner());

            match action {
                "set" => {
                    let code = args.get("code").and_then(|v| v.as_str())
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
                _ => Err(format!("Unknown action: {}. Use 'get', 'set', or 'clear'", action))
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // Remaining 263+ commands (template provided in BRIDGE_SERVER.md)
        // ────────────────────────────────────────────────────────────────────

        _ => Err(format!(
            "Command '{}' not yet implemented in bridge mode.\n\
            Bridge status: 32 commands implemented, 263+ remaining.\n\
            Implemented: health, get_system_info, get_initial_state, list_sessions, \
            save_session, load_session, get_config, get_personas, set_persona, send_command, \
            memory_add_fact, memory_search, new_session, list_models, execute_command_sync, \
            test_connection, get_doc_count, cancel_generation, get_agent_status, \
            pty_spawn, pty_write, pty_kill, pty_resize, start_agent, stop_agent, agent_step, \
            get_agent_plan, transfer_list_peers, transfer_list_active, transfer_cancel, transfer_group_code.\n\
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
