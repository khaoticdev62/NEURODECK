use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use uuid::Uuid;
use crate::user_config_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearnerProgress {
    #[serde(default)]
    pub completed_labs: Vec<String>,
    #[serde(default)]
    pub completed_modules: Vec<String>,
    #[serde(default)]
    pub skill_scores: HashMap<String, u32>,
    #[serde(default)]
    pub portfolio_entry_ids: Vec<String>,
    #[serde(default = "default_timestamp")]
    pub last_active: String,
}

impl Default for LearnerProgress {
    fn default() -> Self {
        Self {
            completed_labs: Vec::new(),
            completed_modules: Vec::new(),
            skill_scores: HashMap::new(),
            portfolio_entry_ids: Vec::new(),
            last_active: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioEntry {
    #[serde(default)]
    pub id: String,
    pub lab_id: String,
    pub lab_title: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub commands_used: Vec<String>,
    #[serde(default)]
    pub findings: Vec<String>,
    #[serde(default)]
    pub mitre_mappings: Vec<String>,
    #[serde(default)]
    pub skills_earned: Vec<String>,
    #[serde(default = "default_timestamp")]
    pub timestamp: String,
}

fn default_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn progress_path() -> std::path::PathBuf {
    user_config_dir().join("academy").join("progress.json")
}

fn portfolio_dir() -> std::path::PathBuf {
    user_config_dir().join("academy").join("portfolio")
}

pub fn get_progress() -> Result<LearnerProgress, String> {
    let path = progress_path();
    if !path.exists() {
        return Ok(LearnerProgress::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("Read progress: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Parse progress: {e}"))
}

pub fn save_progress(progress: LearnerProgress) -> Result<(), String> {
    let path = progress_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Create academy dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(&progress).map_err(|e| format!("Serialize progress: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Write progress: {e}"))
}

pub fn save_portfolio_entry(mut entry: PortfolioEntry) -> Result<String, String> {
    let dir = portfolio_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Create portfolio dir: {e}"))?;
    if entry.id.is_empty() {
        entry.id = Uuid::new_v4().to_string();
    }
    if entry.timestamp.is_empty() {
        entry.timestamp = chrono::Utc::now().to_rfc3339();
    }
    let id = entry.id.clone();
    let path = dir.join(format!("{id}.json"));
    let json = serde_json::to_string_pretty(&entry).map_err(|e| format!("Serialize entry: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Write portfolio entry: {e}"))?;
    Ok(id)
}

pub fn list_portfolio() -> Result<Vec<PortfolioEntry>, String> {
    let dir = portfolio_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut entries: Vec<PortfolioEntry> = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("Read portfolio dir: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        match fs::read_to_string(&path) {
            Ok(raw) => match serde_json::from_str::<PortfolioEntry>(&raw) {
                Ok(pe) => entries.push(pe),
                Err(e) => eprintln!("[academy] Skipping malformed portfolio entry {:?}: {e}", path),
            },
            Err(e) => eprintln!("[academy] Could not read portfolio entry {:?}: {e}", path),
        }
    }
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(entries)
}
