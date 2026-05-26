use serde::{Deserialize, Serialize};
use std::fmt;

/// Structured error type for NEURODECK commands.
///
/// When returned from a Tauri command, the frontend receives the Display string,
/// which is JSON. The frontend can detect JSON errors via `.catch(err => ...)`
/// and parse them for contextual recovery UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeurodeckError {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub recoverable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

impl NeurodeckError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            recoverable: false,
            suggestion: None,
        }
    }

    pub fn recoverable(mut self) -> Self {
        self.recoverable = true;
        self
    }

    pub fn with_suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.suggestion = Some(suggestion.into());
        self
    }

    /// Convenience constructor for LLM/streaming failures.
    pub fn llm_error(msg: impl Into<String>) -> Self {
        Self::new("LLM_ERROR", msg)
            .recoverable()
            .with_suggestion("Check your API key in Settings or switch to a local Ollama model.")
    }
}

impl fmt::Display for NeurodeckError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Serialize as JSON so the frontend can parse structured fields.
        match serde_json::to_string(self) {
            Ok(json) => write!(f, "{}", json),
            Err(_) => write!(f, "{}", self.message),
        }
    }
}

impl std::error::Error for NeurodeckError {}
