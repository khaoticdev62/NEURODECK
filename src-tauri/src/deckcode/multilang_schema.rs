use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MultiLangProfileSchema {
    pub name: String,
    pub version: String,
    pub target: String,
    pub purpose: String,
    pub base_physical_layers: HashMap<String, String>,
    pub universal_entry_actions: UniversalEntryActions,
    pub left_trackpad_language_palette: Vec<LanguagePaletteSlot>,
    pub language_detection: LanguageDetection,
    pub language_packs: HashMap<String, LanguagePack>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UniversalEntryActions {
    pub paired_delimiters: HashMap<String, PairedDelimiter>,
    pub operators: HashMap<String, Operator>,
    pub entry_commit: HashMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PairedDelimiter {
    pub id: String,
    pub text: String,
    pub cursor: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Operator {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LanguagePaletteSlot {
    pub slot: u32,
    pub label: String,
    pub emit: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LanguageDetection {
    pub priority: Vec<String>,
    pub manual_override_binding: String,
    pub fallback_language: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LanguagePack {
    pub language_id: String,
    pub extensions: Vec<String>,
    pub comment: String,
    pub statement_end: String,
    #[serde(default)]
    pub symbol_overrides: HashMap<String, Operator>,
    pub snippets: HashMap<String, SnippetTemplate>,
    #[serde(default)]
    pub prediction_rules: Vec<PredictionRule>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SnippetTemplate {
    pub template: String,
    #[serde(default)]
    pub placeholders: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PredictionRule {
    pub when: String,
    pub suggest: Vec<String>,
}
