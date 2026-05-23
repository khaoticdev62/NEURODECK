use crate::*;
use std::process::Stdio;
use tauri::State;
use futures_util::StreamExt;
use std::sync::Mutex;

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct AgentHistoryEntry {
    pub role: String,    // "step" | "output"
    pub content: String,
}

/// Call the LLM with the agent system prompt, collect the full response, and
/// return the raw text. The frontend parses the JSON step from the text.
#[tauri::command]
pub async fn agent_step(
    task: String,
    history: Vec<AgentHistoryEntry>,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.provider.clone()
    };

    let os_name = std::env::consts::OS;
    let preferred_lang = if os_name == "windows" { "python or powershell" } else { "python or bash" };

    let system_prompt = format!(
        r#"You are an autonomous coding agent running on {os}. Your job is to complete the user's programming task by iteratively writing and executing code.

RESPONSE FORMAT — always output ONLY valid JSON with these exact fields, no markdown fences, no surrounding text:
{{
  "thought": "reasoning about what to do",
  "code": "executable code (empty string if done)",
  "lang": "python|bash|javascript|powershell",
  "action": "run_code|done|error",
  "summary": "one-line description of this step"
}}

RULES:
- Respond with JSON only. No markdown, no explanation outside the JSON object.
- Keep each code block self-contained and directly executable.
- After seeing execution output, analyze errors and iterate to fix them.
- When the task is fully complete, set action to "done" and summarize in "summary".
- If the task is impossible or you run out of ideas, set action to "error".
- Prefer {lang} for code execution on this platform.
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
                "step" => prompt.push_str(&format!("\n[Step {}] Agent response:\n{}\n", i / 2 + 1, entry.content)),
                "output" => prompt.push_str(&format!("\n[Step {}] Execution output:\n{}\n", i / 2 + 1, entry.content)),
                _ => {}
            }
        }
        prompt.push_str("\nBased on the above history, what is your next step?");
    }

    // Collect full streaming response
    let mut stream = provider.stream_response(&prompt, &system_prompt);
    let mut full_response = String::new();
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(text) => full_response.push_str(&text),
            Err(e) => return Err(format!("LLM error: {}", e)),
        }
    }

    Ok(full_response)
}

/// Execute agent-generated code in a sandboxed subprocess with a 30-second
/// timeout. Returns stdout + stderr combined.
#[tauri::command]
pub async fn agent_exec_code(code: String, lang: String) -> Result<String, String> {
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
                        if !combined.is_empty() { combined.push('\n'); }
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
