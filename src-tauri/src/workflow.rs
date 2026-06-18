use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// Lightweight workflow descriptor for `workflow_run` (scheduler integration)
#[derive(Serialize, Deserialize, Debug)]
struct WorkflowDoc {
    name: String,
    #[serde(default)]
    nodes: Vec<serde_json::Value>,
    #[serde(default)]
    edges: Vec<serde_json::Value>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn workflows_dir() -> PathBuf {
    let p = crate::user_config_dir().join("data/workflows");
    fs::create_dir_all(&p).ok();
    p
}

fn safe_name(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .trim()
        .replace(' ', "_")
}

// ── Commands ──────────────────────────────────────────────────────────────────

pub fn list_workflows() -> Result<Vec<String>, String> {
    let dir = workflows_dir();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut names: Vec<String> = entries
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.ends_with(".json")
                .then(|| name.trim_end_matches(".json").to_string())
        })
        .collect();
    names.sort();
    Ok(names)
}

pub fn load_workflow(name: String) -> Result<String, String> {
    let path = workflows_dir().join(format!("{}.json", safe_name(&name)));
    fs::read_to_string(&path).map_err(|e| format!("Load failed: {}", e))
}

pub fn save_workflow(name: String, json: String) -> Result<(), String> {
    let clean = safe_name(&name);
    if clean.is_empty() {
        return Err("Workflow name cannot be empty".to_string());
    }
    let path = workflows_dir().join(format!("{}.json", clean));
    fs::write(&path, json).map_err(|e| format!("Save failed: {}", e))
}

pub fn delete_workflow(name: String) -> Result<(), String> {
    let path = workflows_dir().join(format!("{}.json", safe_name(&name)));
    fs::remove_file(&path).map_err(|e| format!("Delete failed: {}", e))
}

/// Export a workflow as a `.ndwf` JSON bundle (returns the JSON string).
pub fn workflow_export(name: String) -> Result<String, String> {
    let path = workflows_dir().join(format!("{}.json", safe_name(&name)));
    fs::read_to_string(&path).map_err(|e| format!("Export failed: {}", e))
}

/// Import a workflow from a `.ndwf` JSON bundle. Saves to disk, returns the workflow name.
pub fn workflow_import(json: String) -> Result<String, String> {
    let doc: WorkflowDoc =
        serde_json::from_str(&json).map_err(|e| format!("Invalid workflow JSON: {}", e))?;
    let clean = safe_name(&doc.name);
    if clean.is_empty() {
        return Err("Workflow name cannot be empty".to_string());
    }
    let path = workflows_dir().join(format!("{}.json", clean));
    fs::write(&path, &json).map_err(|e| format!("Import save failed: {}", e))?;
    Ok(doc.name)
}

/// Trigger a workflow run by name (used by the task scheduler).
/// Returns the workflow JSON so the caller can execute it.
pub fn workflow_run(name: String) -> Result<String, String> {
    let path = workflows_dir().join(format!("{}.json", safe_name(&name)));
    if !path.exists() {
        return Err(format!("Workflow '{}' not found", name));
    }
    fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))
}
