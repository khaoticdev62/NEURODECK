use crate::config::AgentConfig;
use crate::*;
use futures_util::StreamExt;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader as TokioBufReader};

// ─── Multi-Agent Switching ────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone, Debug)]
pub struct RecommendedModel {
    pub provider: String,
    pub model: String,
    pub name: String,
    pub tier: String, // "fast" | "balanced" | "smart" | "local-fast" | "local-balanced"
    pub vram_mb: u32, // 0 for cloud models
    pub steam_deck_ok: bool,
    pub description: String,
    pub tags: Vec<String>,
}

#[tauri::command]
pub fn list_agents(state: State<'_, Mutex<AppState>>) -> Vec<AgentConfig> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.config.llm.agents.clone()
}

#[tauri::command]
pub fn get_active_agent_id(state: State<'_, Mutex<AppState>>) -> String {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.config.llm.active_agent_id.clone()
}

#[tauri::command]
pub fn switch_agent(
    id: String,
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<AgentConfig, String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());

    let agent = app
        .config
        .llm
        .agents
        .iter()
        .find(|a| a.id == id)
        .cloned()
        .ok_or_else(|| format!("Agent '{}' not found", id))?;

    app.provider = provider_from_agent(&agent);
    app.config.llm.active_agent_id = id.clone();
    // Keep legacy single-provider fields in sync for get_context_stats
    app.config.llm.default_provider = agent.provider.clone();
    if agent.provider == "gemini" {
        app.config.llm.gemini_model = agent.model.clone();
    } else if agent.provider == "huggingface" {
        app.config.llm.hf_model = agent.model.clone();
        app.config.llm.hf_base_url = agent.base_url.clone();
    } else if agent.provider == "kimi" {
        app.config.llm.kimi_model = agent.model.clone();
        app.config.llm.kimi_base_url = agent.base_url.clone();
    } else {
        app.config.llm.ollama_model = agent.model.clone();
        app.config.llm.ollama_base_url = agent.base_url.clone();
    }

    let path = get_config_path();
    config::save_config(&path, &app.config)?;

    app_handle
        .emit("agent_changed", &agent)
        .map_err(|e| e.to_string())?;
    Ok(agent)
}

#[tauri::command]
pub fn add_agent(agent: AgentConfig, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let id = agent.id.trim().to_string();
    if id.is_empty() {
        return Err("Agent ID cannot be empty".into());
    }
    if !id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Agent ID may only contain letters, numbers, hyphens, and underscores".into());
    }
    if agent.name.trim().is_empty() {
        return Err("Agent name cannot be empty".into());
    }
    if agent.provider != "gemini" && agent.provider != "ollama" && agent.provider != "huggingface" && agent.provider != "kimi" {
        return Err("Provider must be 'gemini', 'ollama', 'huggingface', or 'kimi'".into());
    }

    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    if app.config.llm.agents.iter().any(|a| a.id == id) {
        return Err(format!("Agent '{}' already exists", id));
    }

    app.config.llm.agents.push(AgentConfig { id, ..agent });
    let path = get_config_path();
    config::save_config(&path, &app.config)?;
    Ok(())
}

#[tauri::command]
pub fn delete_agent(id: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());

    let initial = app.config.llm.agents.len();
    app.config.llm.agents.retain(|a| a.id != id);
    if app.config.llm.agents.len() == initial {
        return Err(format!("Agent '{}' not found", id));
    }

    // Fall back to first remaining agent if we deleted the active one
    if app.config.llm.active_agent_id == id {
        app.config.llm.active_agent_id = app
            .config
            .llm
            .agents
            .first()
            .map(|a| a.id.clone())
            .unwrap_or_default();
    }

    let path = get_config_path();
    config::save_config(&path, &app.config)?;
    Ok(())
}

#[tauri::command]
pub fn get_recommended_models() -> Vec<RecommendedModel> {
    let ollama = "ollama".to_string();
    let gemini = "gemini".to_string();
    let huggingface = "huggingface".to_string();
    let kimi = "kimi".to_string();
    vec![
        // ── Cloud (Gemini) ────────────────────────────────────────────────────
        RecommendedModel {
            provider: gemini.clone(),
            model: "gemini-2.0-flash-lite".into(),
            name: "Gemini Flash Lite".into(),
            tier: "fast".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Fastest cloud model. Best for quick chat and low-latency tasks.".into(),
            tags: vec!["cloud".into(), "fast".into(), "low-cost".into()],
        },
        RecommendedModel {
            provider: gemini.clone(),
            model: "gemini-2.0-flash".into(),
            name: "Gemini 2.0 Flash".into(),
            tier: "balanced".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Best all-around cloud model — code, analysis, multi-step reasoning."
                .into(),
            tags: vec!["cloud".into(), "balanced".into(), "recommended".into()],
        },
        RecommendedModel {
            provider: gemini.clone(),
            model: "gemini-1.5-flash".into(),
            name: "Gemini 1.5 Flash".into(),
            tier: "balanced".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Reliable and widely-tested. 1M-token context window.".into(),
            tags: vec!["cloud".into(), "long-context".into()],
        },
        RecommendedModel {
            provider: gemini.clone(),
            model: "gemini-1.5-pro".into(),
            name: "Gemini 1.5 Pro".into(),
            tier: "smart".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Highest intelligence cloud option. Best for complex research.".into(),
            tags: vec!["cloud".into(), "smart".into(), "premium".into()],
        },
        // ── Cloud (Kimi / Moonshot) ───────────────────────────────────────────
        RecommendedModel {
            provider: kimi.clone(),
            model: "kimi-k2.5".into(),
            name: "Kimi K2.5".into(),
            tier: "smart".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Moonshot AI flagship. Excellent reasoning, coding, and ultra-long context.".into(),
            tags: vec!["cloud".into(), "smart".into(), "long-context".into(), "recommended".into()],
        },
        RecommendedModel {
            provider: kimi.clone(),
            model: "kimi-k2-turbo-preview".into(),
            name: "Kimi K2 Turbo".into(),
            tier: "fast".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Fast and efficient Kimi model. Great for daily chat and quick tasks.".into(),
            tags: vec!["cloud".into(), "fast".into(), "low-cost".into()],
        },
        // ── Cloud (Hugging Face) ──────────────────────────────────────────────
        RecommendedModel {
            provider: huggingface.clone(),
            model: "meta-llama/Llama-3.2-1B-Instruct".into(),
            name: "HF Llama 1B".into(),
            tier: "fast".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description:
                "Lightweight open model via Hugging Face. Free-tier friendly, fast responses."
                    .into(),
            tags: vec!["cloud".into(), "open-source".into(), "fast".into()],
        },
        RecommendedModel {
            provider: huggingface.clone(),
            model: "HuggingFaceH4/zephyr-7b-beta".into(),
            name: "HF Zephyr 7B".into(),
            tier: "balanced".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "High-quality chat model. Strong reasoning and instruction following."
                .into(),
            tags: vec![
                "cloud".into(),
                "open-source".into(),
                "balanced".into(),
                "recommended".into(),
            ],
        },
        RecommendedModel {
            provider: huggingface.clone(),
            model: "mistralai/Mistral-7B-Instruct-v0.3".into(),
            name: "HF Mistral 7B".into(),
            tier: "smart".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Popular open-weight model with excellent code and reasoning performance."
                .into(),
            tags: vec![
                "cloud".into(),
                "open-source".into(),
                "smart".into(),
                "code".into(),
            ],
        },
        // ── Local / Ollama (Steam Deck optimized) ────────────────────────────
        RecommendedModel {
            provider: ollama.clone(),
            model: "llama3.2:1b".into(),
            name: "Llama 3.2 1B".into(),
            tier: "local-fast".into(),
            vram_mb: 800,
            steam_deck_ok: true,
            description: "Ultra-fast local. ~50 tok/s on Steam Deck. Basic tasks.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "fast".into(),
                "steam-deck".into(),
            ],
        },
        RecommendedModel {
            provider: ollama.clone(),
            model: "gemma2:2b".into(),
            name: "Gemma 2 2B".into(),
            tier: "local-balanced".into(),
            vram_mb: 1600,
            steam_deck_ok: true,
            description:
                "Best quality-per-RAM local model. ~20-30 tok/s on Steam Deck. Recommended.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "balanced".into(),
                "steam-deck".into(),
                "recommended".into(),
            ],
        },
        RecommendedModel {
            provider: ollama.clone(),
            model: "qwen2.5:1.5b".into(),
            name: "Qwen 2.5 1.5B".into(),
            tier: "local-fast".into(),
            vram_mb: 1000,
            steam_deck_ok: true,
            description: "Fast and multilingual. ~30 tok/s on Steam Deck.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "multilingual".into(),
                "steam-deck".into(),
            ],
        },
        RecommendedModel {
            provider: ollama.clone(),
            model: "phi3.5:mini".into(),
            name: "Phi 3.5 Mini".into(),
            tier: "local-balanced".into(),
            vram_mb: 2300,
            steam_deck_ok: true,
            description:
                "Microsoft's compact reasoning model. Strong for code and structured output.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "code".into(),
                "steam-deck".into(),
            ],
        },
        RecommendedModel {
            provider: ollama.clone(),
            model: "llama3.2:3b".into(),
            name: "Llama 3.2 3B".into(),
            tier: "local-balanced".into(),
            vram_mb: 2000,
            steam_deck_ok: true,
            description: "Better reasoning than 1B. ~15 tok/s on Steam Deck.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "balanced".into(),
                "steam-deck".into(),
            ],
        },
        RecommendedModel {
            provider: ollama.clone(),
            model: "phi4-mini:3.8b".into(),
            name: "Phi 4 Mini 3.8B".into(),
            tier: "local-smart".into(),
            vram_mb: 2500,
            steam_deck_ok: true,
            description: "Microsoft's latest compact model. Excellent reasoning in 3.8B params."
                .into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "smart".into(),
                "code".into(),
            ],
        },
        RecommendedModel {
            provider: ollama,
            model: "tinyllama".into(),
            name: "TinyLlama 1.1B".into(),
            tier: "local-fast".into(),
            vram_mb: 600,
            steam_deck_ok: true,
            description: "Smallest model. ~60 tok/s. For simple completions only.".into(),
            tags: vec![
                "local".into(),
                "offline".into(),
                "ultra-fast".into(),
                "steam-deck".into(),
            ],
        },
    ]
}

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct AgentHistoryEntry {
    pub role: String, // "step" | "output"
    pub content: String,
}

/// Call the LLM with the agent system prompt, collect the full response, and
/// return the raw text. The frontend parses the JSON step from the text.
#[tauri::command]
pub async fn agent_step(
    task: String,
    history: Vec<AgentHistoryEntry>,
    state: State<'_, Mutex<AppState>>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    let os_name = std::env::consts::OS;
    let preferred_lang = if os_name == "windows" {
        "python or powershell"
    } else {
        "python or bash"
    };

    let system_prompt = format!(
        r#"You are an autonomous coding agent running on {os}. Your job is to complete the user's programming task by iteratively writing and executing code.

RESPONSE FORMAT — always output ONLY valid JSON with these exact fields, no markdown fences, no surrounding text:
{{
  "thought": "reasoning about what to do",
  "code": "executable code (empty string if done)",
  "lang": "python|bash|javascript|powershell",
  "action": "run_code|computer|browser|done|error",
  "summary": "one-line description of this step",
  "tool": "tool name when action is computer/browser",
  "args": {{"key": "value arguments when action is computer/browser"}}
}}

RULES:
- Respond with JSON only. No markdown, no explanation outside the JSON object.
- Keep each code block self-contained and directly executable.
- After seeing execution output, analyze errors and iterate to fix them.
- When the task is fully complete, set action to "done" and summarize in "summary".
- If the task is impossible or you run out of ideas, set action to "error".
- Prefer {lang} for code execution on this platform.
- For desktop automation, set action to "computer" with one of these tools:
  computer_screenshot, computer_find_text, computer_mouse_move, computer_mouse_click, computer_type, computer_key.
- Computer actions are user-approved by NEURODECK before execution. Use them only when desktop UI control is necessary.
- For web automation, set action to "browser" with one of these tools:
  browser_open_session, browser_navigate_session, browser_get_content, browser_click,
  browser_fill, browser_screenshot, browser_evaluate_js, browser_close_session.
- Max 5 iterations total — be efficient."#,
        os = os_name,
        lang = preferred_lang
    );

    // Build the prompt: task + history context
    let mut prompt = format!("Task: {}", task);
    if !history.is_empty() {
        prompt.push_str("\n\nExecution history so far:\n");
        for (i, entry) in history.iter().enumerate() {
            match entry.role.as_str() {
                "step" => prompt.push_str(&format!(
                    "\n[Step {}] Agent response:\n{}\n",
                    i / 2 + 1,
                    entry.content
                )),
                "output" => prompt.push_str(&format!(
                    "\n[Step {}] Execution output:\n{}\n",
                    i / 2 + 1,
                    entry.content
                )),
                _ => {}
            }
        }
        prompt.push_str("\nBased on the above history, what is your next step?");
    }

    // Emit thinking event so frontend can show a spinner / cancel button
    let _ = app_handle.emit("agent_thinking", serde_json::json!({ "task": &task }));

    // Collect full streaming response
    let mut stream = provider.stream_response(&prompt, &system_prompt);
    let mut full_response = String::new();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(text) => full_response.push_str(&text),
            Err(e) => {
                let _ = app_handle.emit(
                    "agent_step_error",
                    serde_json::json!({ "error": e.to_string() }),
                );
                return Err(crate::error::NeurodeckError::llm_error(e.to_string()).to_string());
            }
        }
    }

    let _ = app_handle.emit(
        "agent_step_complete",
        serde_json::json!({ "task": &task, "length": full_response.len() }),
    );

    Ok(full_response)
}

/// Apply an AI-generated inline edit to code. Sends the code + instruction to
/// the active LLM provider via generate_oneshot and returns the modified code.
#[tauri::command]
pub async fn ai_edit_code(
    code: String,
    instruction: String,
    lang: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        std::sync::Arc::clone(&app.provider)
    };

    let prompt = format!(
        "You are a code editor assistant. Apply the following instruction to the {} code below.\n\
         Return ONLY the modified code with no explanation, no markdown code fences, and no preamble.\n\n\
         INSTRUCTION: {}\n\n\
         CODE:\n{}",
        lang, instruction, code
    );

    provider.generate_oneshot(&prompt, 4096).await
}

/// Execute agent-generated code in a sandboxed subprocess with a 30-second
/// timeout. Returns stdout + stderr combined.
#[tauri::command]
pub async fn agent_exec_code(
    code: String,
    lang: String,
    _state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    crate::security::validate_script_payload(&code, &lang, "agent-exec")?;

    let (program, args): (&str, Vec<&str>) = match lang.to_lowercase().as_str() {
        "python" | "python3" => {
            if cfg!(target_os = "windows") {
                ("python", vec!["-c", &code])
            } else {
                ("python3", vec!["-c", &code])
            }
        }
        "bash" | "sh" | "shell" => {
            if cfg!(target_os = "windows") {
                ("powershell", vec!["-Command", &code])
            } else {
                ("bash", vec!["-c", &code])
            }
        }
        "powershell" => ("powershell", vec!["-Command", &code]),
        "javascript" | "js" | "node" => ("node", vec!["-e", &code]),
        _ => return Err(format!("Unsupported language: {}", lang)),
    };

    let program_owned = program.to_string();
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::task::spawn_blocking(move || {
            let output = std::process::Command::new(&program_owned)
                .args(args_owned.iter().map(|s| s.as_str()).collect::<Vec<_>>())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();

            match output {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    let mut combined = String::new();
                    if !stdout.is_empty() {
                        combined.push_str(&stdout);
                    }
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
                    Ok(combined)
                }
                Err(e) => Err(format!("Failed to spawn process: {}", e)),
            }
        }),
    )
    .await;

    match result {
        Ok(Ok(inner)) => inner,
        Ok(Err(join_err)) => Err(format!("Task panicked: {}", join_err)),
        Err(_) => Err("Execution timed out (30s limit exceeded)".to_string()),
    }
}

/// Start streaming execution of code from the Canvas view.
/// Emits `canvas_exec_line` for stdout/stderr lines and `canvas_exec_done`
/// when the child exits, is cancelled, or times out.
#[tauri::command]
pub async fn exec_code_stream(
    code: String,
    lang: String,
    state: State<'_, Mutex<AppState>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    crate::security::validate_script_payload(&code, &lang, "canvas-exec")?;

    let (program, args): (&str, Vec<&str>) = match lang.to_lowercase().as_str() {
        "python" | "python3" => {
            if cfg!(target_os = "windows") {
                ("python", vec!["-c", &code])
            } else {
                ("python3", vec!["-c", &code])
            }
        }
        "bash" | "sh" | "shell" => {
            if cfg!(target_os = "windows") {
                ("powershell", vec!["-Command", &code])
            } else {
                ("bash", vec!["-c", &code])
            }
        }
        "powershell" => ("powershell", vec!["-Command", &code]),
        "javascript" | "js" | "node" => ("node", vec!["-e", &code]),
        _ => return Err(format!("Unsupported language: {lang}")),
    };

    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(cancel_tx) = app.canvas_exec_cancel_tx.take() {
            let _ = cancel_tx.send(());
        }
    }

    let program_owned = program.to_string();
    let args_owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();

    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.canvas_exec_cancel_tx = Some(cancel_tx);
    }

    tokio::spawn(async move {
        let start = std::time::Instant::now();
        let mut child = match tokio::process::Command::new(&program_owned)
            .args(&args_owned)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(e) => {
                emit_canvas_exec_line(
                    &app_handle,
                    "stderr",
                    format!("[error] Failed to spawn '{program_owned}': {e}"),
                );
                emit_canvas_exec_done(&app_handle, -1, start);
                return;
            }
        };

        let Some(stdout) = child.stdout.take() else {
            emit_canvas_exec_line(&app_handle, "stderr", "[error] Failed to capture stdout.");
            let _ = child.kill().await;
            emit_canvas_exec_done(&app_handle, -1, start);
            return;
        };
        let Some(stderr) = child.stderr.take() else {
            emit_canvas_exec_line(&app_handle, "stderr", "[error] Failed to capture stderr.");
            let _ = child.kill().await;
            emit_canvas_exec_done(&app_handle, -1, start);
            return;
        };

        let stdout_handle = spawn_canvas_reader(app_handle.clone(), stdout, "stdout");
        let stderr_handle = spawn_canvas_reader(app_handle.clone(), stderr, "stderr");

        let exit_code = tokio::select! {
            status = child.wait() => status.ok().and_then(|s| s.code()).unwrap_or(-1),
            _ = &mut cancel_rx => {
                let _ = child.kill().await;
                emit_canvas_exec_line(&app_handle, "stderr", "[cancelled] Execution cancelled by user.");
                -3
            }
            _ = tokio::time::sleep(std::time::Duration::from_secs(120)) => {
                let _ = child.kill().await;
                emit_canvas_exec_line(&app_handle, "stderr", "[error] Execution timed out (120s limit).");
                -2
            }
        };

        let _ = tokio::join!(stdout_handle, stderr_handle);
        emit_canvas_exec_done(&app_handle, exit_code, start);
    });

    Ok(())
}

/// Cancel the active streaming Canvas execution, if one exists.
#[tauri::command]
pub fn cancel_exec(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(cancel_tx) = app.canvas_exec_cancel_tx.take() {
        let _ = cancel_tx.send(());
    }
    Ok(())
}

fn spawn_canvas_reader<T>(
    app_handle: AppHandle,
    stream: T,
    stream_name: &'static str,
) -> tokio::task::JoinHandle<()>
where
    T: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut lines = TokioBufReader::new(stream).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            emit_canvas_exec_line(&app_handle, stream_name, line);
        }
    })
}

fn emit_canvas_exec_line(app_handle: &AppHandle, stream: &str, line: impl Into<String>) {
    let _ = app_handle.emit(
        "canvas_exec_line",
        serde_json::json!({
            "stream": stream,
            "line": line.into(),
        }),
    );
}

fn emit_canvas_exec_done(app_handle: &AppHandle, exit_code: i32, start: std::time::Instant) {
    let _ = app_handle.emit(
        "canvas_exec_done",
        serde_json::json!({
            "exit_code": exit_code,
            "duration_ms": start.elapsed().as_millis() as u64,
        }),
    );
}
