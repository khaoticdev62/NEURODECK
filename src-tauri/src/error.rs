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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_new_sets_code_and_message() {
        let err = NeurodeckError::new("TEST_CODE", "something went wrong");
        assert_eq!(err.code, "TEST_CODE");
        assert_eq!(err.message, "something went wrong");
        assert!(!err.recoverable);
        assert_eq!(err.suggestion, None);
    }

    #[test]
    fn error_recoverable_flag() {
        let err = NeurodeckError::new("TEST", "msg").recoverable();
        assert!(err.recoverable);
    }

    #[test]
    fn error_with_suggestion() {
        let err = NeurodeckError::new("TEST", "msg")
            .recoverable()
            .with_suggestion("Try again later");
        assert_eq!(err.suggestion, Some("Try again later".to_string()));
    }

    #[test]
    fn error_llm_error_prebuilt() {
        let err = NeurodeckError::llm_error("model timeout");
        assert_eq!(err.code, "LLM_ERROR");
        assert_eq!(err.message, "model timeout");
        assert!(err.recoverable);
        assert!(err.suggestion.is_some());
    }

    #[test]
    fn error_display_is_json() {
        let err = NeurodeckError::new("CODE", "message").recoverable();
        let display = format!("{}", err);
        assert!(display.contains("\"code\":\"CODE\""));
        assert!(display.contains("\"message\":\"message\""));
        assert!(display.contains("\"recoverable\":true"));
    }

    #[test]
    fn error_round_trip_serialization() {
        let original = NeurodeckError::new("FOO", "bar")
            .recoverable()
            .with_suggestion("baz");
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: NeurodeckError = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.code, original.code);
        assert_eq!(deserialized.message, original.message);
        assert_eq!(deserialized.recoverable, original.recoverable);
        assert_eq!(deserialized.suggestion, original.suggestion);
    }
}
