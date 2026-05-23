use std::sync::Mutex;
use tauri::State;
use crate::AppState;

/// Returns the list of unique file paths indexed in the "docs" RAG namespace.
#[tauri::command]
pub fn get_indexed_docs(state: State<'_, Mutex<AppState>>) -> Result<Vec<String>, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let db = match &app.mem_db {
        Some(db) => db.clone(),
        None => return Ok(vec![]),
    };
    drop(app);

    let records = db.list_all()?;
    let mut paths: std::collections::HashSet<String> = std::collections::HashSet::new();
    for r in records {
        if r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs") {
            if let Some(p) = r.metadata.get("file") {
                paths.insert(p.clone());
            }
        }
    }

    let mut result: Vec<String> = paths.into_iter().collect();
    result.sort();
    Ok(result)
}
