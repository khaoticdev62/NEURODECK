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
    crate::model_registry::load_supported_models()
        .into_iter()
        .map(|profile| {
            let provider = crate::model_registry::provider_label(&profile).to_string();
            let model = profile
                .provider_model_ids
                .first()
                .cloned()
                .unwrap_or_else(|| profile.id.clone());
            let tier = crate::model_registry::tier_label(&profile);
            let vram_mb = crate::model_registry::vram_mb_estimate(&profile);
            let steam_deck_ok = crate::model_registry::steam_deck_ok(&profile);
            let description = profile
                .steam_deck_policy
                .notes
                .first()
                .cloned()
                .unwrap_or_else(|| "Curated model profile".to_string());
            RecommendedModel {
                provider,
                model,
                name: profile.display_name,
                tier,
                vram_mb,
                steam_deck_ok,
                description,
                tags: profile.capabilities,
            }
        })
        .collect()
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
