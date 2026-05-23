use tauri::State;
use crate::AppState;

#[tauri::command]
pub async fn get_terminal_autocomplete(
    partial: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let app_state = state.inner().lock().await;
    let provider = app_state.llm_provider.clone();
    
    // We don't have history in this signature yet, but for Sprint 3, just completing the partial command is a good start.
    // We could accept history: Vec<String> if we updated main.js to pass it.
    let prompt = format!(
        "Complete this shell command. Output ONLY the raw completion text that should follow the partial command. Do not repeat the partial command. Do not output any markdown formatting, explanations, or quotes.\n\nPartial command: {}",
        partial
    );
    
    // Request a short, fast completion
    let completion = provider.generate_oneshot(&prompt, 30).await?;
    
    // Clean up response if the LLM adds markdown or repeats the prompt
    let mut cleaned = completion.trim().to_string();
    if cleaned.starts_with("```") {
        cleaned = cleaned.lines().skip(1).take_while(|l| !l.starts_with("```")).collect::<Vec<&str>>().join(" ");
    }
    
    // If the LLM repeats the partial string at the start, strip it
    if cleaned.starts_with(&partial) {
        cleaned = cleaned[partial.len()..].to_string();
    }
    
    Ok(cleaned.trim_start().to_string())
}
