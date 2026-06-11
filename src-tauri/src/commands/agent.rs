use crate::*;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::sync::{Arc, Mutex};

#[derive(Clone, Serialize, Deserialize)]
pub struct RecommendedModel {
    pub provider: String,
    pub model: String,
    pub name: String,
    pub tier: String,
    pub vram_mb: u32,
    pub steam_deck_ok: bool,
    pub description: String,
    pub tags: Vec<String>,
}

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
            description:
                "Moonshot AI flagship. Excellent reasoning, coding, and ultra-long context.".into(),
            tags: vec![
                "cloud".into(),
                "smart".into(),
                "long-context".into(),
                "recommended".into(),
            ],
        },
        RecommendedModel {
            provider: kimi.clone(),
            model: "kimi-k2-turbo-preview".into(),
            name: "Kimi K2 Turbo".into(),
            tier: "fast".into(),
            vram_mb: 0,
            steam_deck_ok: true,
            description: "Fast and efficient Kimi model. Great for daily chat and quick tasks."
                .into(),
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


/// Apply an AI-generated inline edit to code. Sends the code + instruction to
/// the active LLM provider via generate_oneshot and returns the modified code.
pub async fn ai_edit_code(
    code: String,
    instruction: String,
    lang: String,
    state: Arc<Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        Arc::clone(&app.provider)
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
pub async fn agent_exec_code(
    code: String,
    lang: String,
    state: Arc<Mutex<AppState>>,
) -> Result<String, String> {
    let (workspace_path, agent_id) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        let agent_id = app.config.llm.active_agent_id.clone();
        (app.config.get_resolved_workspace(), agent_id)
    };

    crate::permissions::require_capability(
        &state
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
        "agent-exec",
        workspace_path.as_deref(),
    )?;

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
            let mut cmd = std::process::Command::new(&program_owned);
            cmd.args(args_owned.iter().map(|s| s.as_str()).collect::<Vec<_>>())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            if let Some(wp) = workspace_path {
                cmd.current_dir(wp);
            }

            let output = cmd.output();

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

