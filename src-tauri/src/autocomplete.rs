use crate::AppState;
use std::sync::Mutex;
use crate::{State};

pub async fn get_terminal_autocomplete(
    partial: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app_state = state.lock().unwrap_or_else(|e| e.into_inner());
        app_state.provider.clone()
    };

    let prompt = format!(
        "Complete this shell command. Output ONLY the raw completion text that should follow the partial command. Do not repeat the partial command. Do not output any markdown formatting, explanations, or quotes.\n\nPartial command: {}",
        partial
    );

    let completion = provider.generate_oneshot(&prompt, 30).await?;

    let mut cleaned = completion.trim().to_string();
    if cleaned.starts_with("```") {
        cleaned = cleaned
            .lines()
            .skip(1)
            .take_while(|l| !l.starts_with("```"))
            .collect::<Vec<&str>>()
            .join(" ");
    }

    if cleaned.starts_with(&partial) {
        cleaned = cleaned[partial.len()..].to_string();
    }

    Ok(cleaned.trim_start().to_string())
}
