pub mod schema;
pub mod input;
pub mod activator;
pub mod resolver;
pub mod prediction;
pub mod dispatch;

use schema::ControllerProfileSchema;
use std::fs;
use anyhow::{Result, Context};

pub fn load_schema(path: &str) -> Result<ControllerProfileSchema> {
    let content = fs::read_to_string(path).context("Failed to read schema file")?;
    let schema: ControllerProfileSchema = serde_json::from_str(&content).context("Failed to parse JSON")?;
    Ok(schema)
}

pub struct DeckCodeState(pub std::sync::Mutex<Option<ControllerProfileSchema>>);
