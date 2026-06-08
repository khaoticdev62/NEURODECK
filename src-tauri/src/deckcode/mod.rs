pub mod schema;
pub mod input;
pub mod activator;
pub mod resolver;
pub mod prediction;
pub mod dispatch;
pub mod multilang_schema;

use schema::ControllerProfileSchema;
use std::fs;
use anyhow::{Result, Context};

pub fn load_schema(path: &str) -> Result<ControllerProfileSchema> {
    let content = fs::read_to_string(path).context("Failed to read schema file")?;
    let schema: ControllerProfileSchema = serde_json::from_str(&content).context("Failed to parse JSON")?;
    Ok(schema)
}

pub fn load_multilang_profile(path: &str) -> Result<multilang_schema::MultiLangProfileSchema> {
    let content = fs::read_to_string(path).context("Failed to read multilang profile file")?;
    let schema: multilang_schema::MultiLangProfileSchema = serde_json::from_str(&content).context("Failed to parse JSON")?;
    Ok(schema)
}

pub struct DeckCodeState(pub std::sync::Mutex<(Option<ControllerProfileSchema>, Option<multilang_schema::MultiLangProfileSchema>)>);

pub struct DeckCodeActiveLang(pub std::sync::Arc<std::sync::Mutex<String>>);

pub fn deckcode_set_active_language(
    lang_state: std::sync::Arc<std::sync::Mutex<String>> ,
    language_id: String,
) -> Result<(), String> {
    *lang_state.lock().unwrap_or_else(|e| e.into_inner()) = language_id;
    Ok(())
}
