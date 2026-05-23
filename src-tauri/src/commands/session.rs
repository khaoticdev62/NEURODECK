use crate::*;
use std::collections::HashMap;
use std::sync::Mutex;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State};
use chrono::Utc;
use futures_util::StreamExt;
use crate::storage::{Session, load_session};

#[tauri::command]
pub fn save_session(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let session = Session {
        id: app.session_id.clone(),
        created_at: Utc::now(),
        messages: app.messages.clone(),
    };

    storage::save_session("./sessions", &session)?;
    Ok(format!("Session saved as {}", app.session_id))
}

#[tauri::command]
pub fn export_session_markdown(id: String) -> Result<String, String> {
    let path = Path::new("./sessions").join(format!("{}.json", id));
    if !path.exists() {
        return Err(format!("Session {} does not exist on disk", id));
    }
    let session = storage::load_session(&path)?;
    
    let export_dir = Path::new("./exports");
    std::fs::create_dir_all(export_dir).map_err(|e| format!("Failed to create exports directory: {}", e))?;
    
    let file_path = export_dir.join(format!("{}.md", id));
    storage::export_to_markdown(&file_path, &session)?;
    
    Ok(format!("Session exported to {}", file_path.to_string_lossy()))
}

#[tauri::command]
pub fn load_latest_session(state: State<'_, Mutex<AppState>>) -> Result<HashMap<String, serde_json::Value>, String> {
    let read_dir = std::fs::read_dir("./sessions")
        .map_err(|e| format!("Error reading sessions dir: {}", e))?;

    let mut latest_file = std::path::PathBuf::new();
    let mut latest_name = String::new();

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            let name = path.file_name().unwrap().to_string_lossy().into_owned();
            if latest_name.is_empty() || name > latest_name {
                latest_name = name;
                latest_file = path;
            }
        }
    }

    if latest_name.is_empty() {
        return Err("No saved sessions found".to_string());
    }

    let session = load_session(latest_file)?;
    
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.messages = session.messages.clone();
    app.session_id = session.id.clone();

    let mut result = HashMap::new();
    result.insert("session_id".to_string(), serde_json::Value::String(session.id));
    result.insert(
        "messages".to_string(),
        serde_json::to_value(session.messages).unwrap(),
    );

    Ok(result)
}

#[tauri::command]
pub fn list_sessions() -> Result<Vec<String>, String> {
    let mut sessions = Vec::new();
    let dir = Path::new("./sessions");
    if !dir.exists() {
        return Ok(sessions);
    }
    let read_dir = std::fs::read_dir(dir)
        .map_err(|e| format!("Error reading sessions dir: {}", e))?;

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
            if let Some(stem) = path.file_stem() {
                sessions.push(stem.to_string_lossy().into_owned());
            }
        }
    }
    
    // Sort reverse to have latest sessions first
    sessions.sort_by(|a, b| b.cmp(a));
    Ok(sessions)
}

#[tauri::command]
pub fn load_session_by_id(id: String, state: State<'_, Mutex<AppState>>) -> Result<HashMap<String, serde_json::Value>, String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }

    let file_path = Path::new("./sessions").join(format!("{}.json", id));
    if !file_path.exists() {
        return Err(format!("Session {} does not exist", id));
    }

    let session = load_session(file_path)?;
    
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.messages = session.messages.clone();
    app.session_id = session.id.clone();

    let mut result = HashMap::new();
    result.insert("session_id".to_string(), serde_json::Value::String(session.id));
    result.insert(
        "messages".to_string(),
        serde_json::to_value(session.messages).unwrap(),
    );

    Ok(result)
}

#[tauri::command]
pub fn delete_session(id: String) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }

    let file_path = Path::new("./sessions").join(format!("{}.json", id));
    if file_path.exists() {
        std::fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn new_session(state: State<'_, Mutex<AppState>>) -> String {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    let new_id = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    app.session_id = new_id.clone();
    app.messages.clear();
    new_id
}

#[tauri::command]
pub async fn speak_text(text: String) -> Result<(), String> {
    let sanitized: String = text.chars()
        .filter(|c| (c.is_alphanumeric() || *c == ' ' || *c == '.' || *c == ',' || *c == '?' || *c == '!')
            && *c != '\'' && *c != '"' && *c != '`' && *c != '$' && *c != ';' && *c != '|' && *c != '&' && *c != '<' && *c != '>')
        .collect();

    if sanitized.is_empty() {
        return Ok(());
    }

    tokio::task::spawn_blocking(move || {
        if cfg!(target_os = "windows") {
            let ps_cmd = format!(
                "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{}')",
                sanitized.replace('\'', "''")
            );
            let _ = std::process::Command::new("powershell")
                .arg("-Command")
                .arg(&ps_cmd)
                .output();
        } else {
            let _ = std::process::Command::new("espeak")
                .arg(&sanitized)
                .output();
        }
    }).await.map_err(|e| format!("Failed to run speech synthesis: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_generation(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let tx = {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.cancel_stream_tx.take()
    };
    if let Some(tx) = tx {
        let _ = tx.send(());
    }
    Ok(())
}

#[tauri::command]
pub async fn send_command(
    prompt: String,
    image_base64: Option<String>,
    image_mime: Option<String>,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    // Run hooks
    let mut prompt = prompt;
    {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        if let Ok(modified) = engine.trigger_hook("onMessage", prompt.clone()) {
            prompt = modified;
        }
    }

    // Check for registered Lua custom commands
    let trimmed_prompt = prompt.trim();
    let (cmd_name, cmd_args) = if trimmed_prompt.starts_with('/') {
        let mut parts = trimmed_prompt[1..].splitn(2, ' ');
        (parts.next().unwrap_or(""), parts.next().unwrap_or(""))
    } else {
        let mut parts = trimmed_prompt.splitn(2, ' ');
        (parts.next().unwrap_or(""), parts.next().unwrap_or(""))
    };

    let is_lua_cmd = {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        engine.is_command_registered(cmd_name)
    };

    if is_lua_cmd {
        let result = {
            let lua_state = app_handle.state::<LuaState>();
            let engine = lua_state.0.lock().unwrap();
            engine.call_command(cmd_name, cmd_args)
        };
        match result {
            Ok(Some(out)) => {
                let response = format!("System: Command '{}' executed successfully.\nOutput:\n{}", cmd_name, out);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                
                // Trigger onAIResponse hook
                let lua_state = app_handle.state::<LuaState>();
                let engine = lua_state.0.lock().unwrap();
                let _ = engine.trigger_hook("onAIResponse", out);
                
                return Ok(());
            }
            Ok(None) => {
                let response = format!("System: Command '{}' executed.", cmd_name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
            Err(e) => {
                let response = format!("System: Command '{}' failed:\n{}", cmd_name, e);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
        }
    }

    // 1. Gather variables from state
    let (provider, active_persona, messages_len, session_id, mem_db, custom_personas) = {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.messages.push(format!("User: {}", prompt));
        (
            app.provider.clone(),
            app.active_persona.clone(),
            app.messages.len(),
            app.session_id.clone(),
            app.mem_db.clone(),
            app.custom_personas.clone(),
        )
    };

    // Store user message in vector DB if stable
    if let Some(ref db) = mem_db {
        let msg_id = format!("{}-{}", session_id, messages_len);
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "user".to_string());
        
        let db_clone = db.clone();
        let prompt_clone = prompt.clone();
        let provider_clone = provider.clone();
        tokio::spawn(async move {
            if let Ok(embedding) = provider_clone.generate_embedding(&prompt_clone).await {
                let _ = db_clone.store_message(msg_id, prompt_clone, embedding, metadata);
            }
        });
    }

    // Determine system prompt based on active persona
    let mut system_prompt = PERSONAS
        .iter()
        .find(|p| p.0 == active_persona)
        .map(|p| p.1.clone())
        .unwrap_or_else(|| {
            custom_personas
                .iter()
                .find(|p| p.name == active_persona)
                .map(|p| p.prompt.clone())
                .unwrap_or_else(|| "You are a helpful assistant.".to_string())
        });

    // Add game context if available
    let (game_name, game_id, game_running) = detect_game();
    if !game_name.is_empty() {
        let state_label = if game_running { "currently playing" } else { "recently played" };
        let id_note = if game_id.is_empty() { String::new() } else { format!(" (Steam AppID: {})", game_id) };
        let (_, notes) = get_game_details(&game_id, &game_name);
        system_prompt.push_str(&format!(
            "\n\n[Active SteamOS Game Context]\nThe user is {} the game: {}{}.\nSteam Deck Optimization Notes: {}\nPlease adapt your answers to help the user with this game if applicable, keeping their hardware context in mind.",
            state_label, game_name, id_note, notes
        ));
    }

    // Add OS context
    system_prompt.push_str(&format!(
        " The user is on operating system: {}.",
        std::env::consts::OS
    ));

    // RAG: Search memory for relevant messages
    if let Some(ref db) = mem_db {
        if let Ok(query_embed) = provider.generate_embedding(&prompt).await {
            if let Ok(results) = db.search(&query_embed, 3) {
                if !results.is_empty() {
                    system_prompt.push_str("\n\nRelevant past context:\n");
                    for res in results {
                        system_prompt.push_str(&format!("- {}\n", res.content));
                    }
                }
            }
        }
    }

    // Handle @file:path pattern
    let mut full_prompt = prompt.clone();
    let re = regex::Regex::new(r"@file:([^\s]+)").unwrap();
    if let Some(caps) = re.captures(&prompt) {
        let file_path = caps.get(1).unwrap().as_str();
        if let Ok(content) = std::fs::read_to_string(file_path) {
            let _ = app_handle.emit(
                "stream_chunk",
                format!("System: Read file {} ({} bytes)\n", file_path, content.len()),
            );
            full_prompt = format!(
                "User mentioned file: {}\n```\n{}\n```\n\n{}",
                file_path, content, prompt
            );
        } else {
            let _ = app_handle.emit(
                "stream_chunk",
                format!("System: Error reading file {}: File not found or unreadable\n", file_path),
            );
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        }
    }

    // Check for persona change command
    if prompt.trim().starts_with("/persona") {
        let parts: Vec<&str> = prompt.trim().split_whitespace().collect();
        if parts.len() == 1 {
            let mut available_personas: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
            let (active, custom_list) = {
                let app = state.lock().unwrap_or_else(|e| e.into_inner());
                (app.active_persona.clone(), app.custom_personas.clone())
            };
            for cp in custom_list {
                available_personas.push(cp.name);
            }
            let response = format!(
                "System: Available personas: {}\nActive persona: {}",
                available_personas.join(", "),
                active
            );
            let _ = app_handle.emit("stream_chunk", response);
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        } else {
            let name = parts[1..].join(" ");
            let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
            let is_valid = PERSONAS.iter().any(|p| p.0 == name) || app.custom_personas.iter().any(|p| p.name == name);
            if is_valid {
                app.active_persona = name.clone();
                let _ = app_handle.emit("persona_changed", name.clone());
                let response = format!("System: Persona set to {}", name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            } else {
                let response = format!("System: Persona '{}' not found.", name);
                let _ = app_handle.emit("stream_chunk", response);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }
        }
    }

    // Check for roundtable discussion command
    if prompt.trim().starts_with("/discuss") {
        let re_discuss = regex::Regex::new(r"^/discuss\s+(\w+)\s+(\w+)\s+(.+)$").unwrap();
        if let Some(caps) = re_discuss.captures(prompt.trim()) {
            let p1 = caps.get(1).unwrap().as_str().to_string();
            let p2 = caps.get(2).unwrap().as_str().to_string();
            let topic = caps.get(3).unwrap().as_str().to_string();

            let (has_p1, has_p2, custom_list) = {
                let app = state.lock().unwrap_or_else(|e| e.into_inner());
                let has1 = PERSONAS.iter().any(|p| p.0 == p1) || app.custom_personas.iter().any(|p| p.name == p1);
                let has2 = PERSONAS.iter().any(|p| p.0 == p2) || app.custom_personas.iter().any(|p| p.name == p2);
                (has1, has2, app.custom_personas.clone())
            };

            if !has_p1 || !has_p2 {
                let mut available: Vec<String> = PERSONAS.iter().map(|p| p.0.clone()).collect();
                for cp in custom_list {
                    available.push(cp.name);
                }
                let error_msg = format!(
                    "System: Invalid personas specified. Available personas: {}\nUsage: `/discuss <persona1> <persona2> <topic>`",
                    available.join(", ")
                );
                let _ = app_handle.emit("stream_chunk", error_msg);
                let _ = app_handle.emit("stream_done", ());
                return Ok(());
            }

            let mut discussion_history = format!(
                "We are holding a roundtable discussion/debate on the topic: \"{}\".\nParticipants: {} and {}.\n\n",
                topic, p1, p2
            );

            let mut current_speaker = p1.clone();
            let mut next_speaker = p2.clone();

            let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
            {
                let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                app.cancel_stream_tx = Some(cancel_tx);
            }

            for turn in 1..=4 {
                if cancel_rx.try_recv().is_ok() {
                    let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
                    let _ = app_handle.emit("stream_done", ());
                    {
                        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                        app.cancel_stream_tx = None;
                    }
                    return Ok(());
                }

                let speaker_system_prompt = PERSONAS
                    .iter()
                    .find(|p| p.0 == current_speaker)
                    .map(|p| p.1.clone())
                    .or_else(|| {
                        let app = state.lock().unwrap_or_else(|e| e.into_inner());
                        app.custom_personas.iter().find(|p| p.name == current_speaker).map(|p| p.prompt.clone())
                    })
                    .unwrap_or_default();

                let full_system_prompt = format!(
                    "{} You are participating in a roundtable debate. Keep your responses short (under 100 words), engaging, and directly address the previous points. You are speaking as {}.",
                    speaker_system_prompt, current_speaker
                );

                let header = format!("\n\n**[{}]**: ", current_speaker);
                let _ = app_handle.emit("stream_chunk", header);

                let prompt_for_turn = format!(
                    "{}\n\nIt is now your turn, {}. Please respond to the debate history above on the topic of \"{}\".",
                    discussion_history, current_speaker, topic
                );

                let mut turn_response = String::new();
                let mut stream = provider.stream_response(&prompt_for_turn, &full_system_prompt);
                while let Some(chunk_res) = stream.next().await {
                    if cancel_rx.try_recv().is_ok() {
                        let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
                        let _ = app_handle.emit("stream_done", ());
                        {
                            let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                            app.cancel_stream_tx = None;
                        }
                        return Ok(());
                    }
                    match chunk_res {
                        Ok(chunk) => {
                            turn_response.push_str(&chunk);
                            let _ = app_handle.emit("stream_chunk", chunk);
                        }
                        Err(e) => {
                            let _ = app_handle.emit("stream_error", format!("Error in debate turn {}: {}", turn, e));
                            {
                                let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                                app.cancel_stream_tx = None;
                            }
                            return Ok(());
                        }
                    }
                }

                discussion_history.push_str(&format!("{}: {}\n\n", current_speaker, turn_response));

                {
                    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                    app.messages.push(format!("{}: {}", current_speaker, turn_response));
                }

                std::mem::swap(&mut current_speaker, &mut next_speaker);
            }

            {
                let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                app.cancel_stream_tx = None;
            }
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        } else {
            let response = "System: Invalid debate command format.\nUsage: `/discuss <persona1> <persona2> <topic>`\nExample: `/discuss Developer Cyberpunk Should we write Rust?`".to_string();
            let _ = app_handle.emit("stream_chunk", response);
            let _ = app_handle.emit("stream_done", ());
            return Ok(());
        }
    }

    // Check for helper commands
    if prompt == "/help" || prompt == "help" {
        let mut help_msg = "System: Available commands:\n".to_string();
        help_msg.push_str("- help or /help: Display this help message\n");
        help_msg.push_str("- /persona <name>: Change active agent persona\n");
        help_msg.push_str("- /discuss <persona1> <persona2> <topic>: Run a 4-turn roundtable debate between two personas\n");
        help_msg.push_str("- @file:path: Mention a file and include its content in the prompt\n\n");
        help_msg.push_str("Keyboard Shortcuts:\n");
        help_msg.push_str("- Enter: Send message\n");
        help_msg.push_str("- Ctrl+B: Execute pending Lua script (last Lua block in chat)\n");
        help_msg.push_str("- Ctrl+R: Toggle microphone voice recording\n");
        help_msg.push_str("- Ctrl+M: Toggle Text-to-Speech mute state\n");
        help_msg.push_str("- Ctrl+P: Cycle to next agent persona\n");
        help_msg.push_str("- Ctrl+N: Start new chat session\n");
        help_msg.push_str("- Ctrl+S: Save current session\n\n");
        help_msg.push_str("Lua Scripting:\n");
        help_msg.push_str("- Any Lua code block in chat gets an 'Execute' button\n");
        help_msg.push_str("- Plugins placed in the plugins/ folder are auto-loaded\n");
        help_msg.push_str("- Lua globals: print(), execute(cmd), registerCommand(name, fn), registerHook(event, fn)\n");
        help_msg.push_str("- Events: onMessage, onAIResponse\n");
        
        let _ = app_handle.emit("stream_chunk", help_msg);
        let _ = app_handle.emit("stream_done", ());
        return Ok(());
    }

    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.cancel_stream_tx = Some(cancel_tx);
    }

    let mut full_response = String::new();

    if let Some(ref b64) = image_base64 {
        // Vision path: non-streaming chat_with_image
        let mime_str = image_mime.as_deref().unwrap_or("image/png");
        let vision_prompt = if full_prompt.starts_with("[User attached a screenshot]") {
            // Strip the prefix we added in JS; the image speaks for itself
            prompt.clone()
        } else {
            full_prompt.clone()
        };

        match provider.chat_with_image(&vision_prompt, &system_prompt, Some(b64.as_str()), Some(mime_str)).await {
            Ok(response) => {
                full_response = response.clone();
                let _ = app_handle.emit("stream_chunk", response);
            }
            Err(e) => {
                let _ = app_handle.emit("stream_error", e);
                {
                    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                    app.cancel_stream_tx = None;
                }
                return Ok(());
            }
        }
    } else {
        // Normal streaming path
        let mut stream = provider.stream_response(&full_prompt, &system_prompt);

        while let Some(chunk_res) = stream.next().await {
            if cancel_rx.try_recv().is_ok() {
                let _ = app_handle.emit("stream_chunk", "\n\n[Generation Cancelled by User]".to_string());
                break;
            }
            match chunk_res {
                Ok(chunk) => {
                    full_response.push_str(&chunk);
                    let _ = app_handle.emit("stream_chunk", chunk);
                }
                Err(e) => {
                    let _ = app_handle.emit("stream_error", e);
                    {
                        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
                        app.cancel_stream_tx = None;
                    }
                    return Ok(());
                }
            }
        }
    }

    // Clean up cancel channel
    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.cancel_stream_tx = None;
    }

    // Append AI response to state
    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.messages.push(format!("AI: {}", full_response));
    }

    // Store AI response in vector DB if stable
    if let Some(ref db) = mem_db {
        let msg_id = format!("{}-ai-{}", session_id, messages_len + 1);
        let mut metadata = HashMap::new();
        metadata.insert("role".to_string(), "ai".to_string());
        
        let db_clone = db.clone();
        let resp_clone = full_response.clone();
        let provider_clone = provider.clone();
        tokio::spawn(async move {
            if let Ok(embedding) = provider_clone.generate_embedding(&resp_clone).await {
                let _ = db_clone.store_message(msg_id, resp_clone, embedding, metadata);
            }
        });
    }

    // Trigger onAIResponse hook
    {
        let lua_state = app_handle.state::<LuaState>();
        let engine = lua_state.0.lock().unwrap();
        let _ = engine.trigger_hook("onAIResponse", full_response.clone());
    }

    let _ = app_handle.emit("stream_done", ());
    Ok(())
}
