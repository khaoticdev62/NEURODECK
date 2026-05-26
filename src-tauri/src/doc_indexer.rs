use crate::memory::MemoryRecord;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DocSearchResult {
    pub file: String,
    pub snippet: String,
    pub score: f32,
}

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

/// Semantic search over the "docs" namespace using cosine similarity.
#[tauri::command]
pub async fn search_docs_semantic(
    query: String,
    limit: Option<usize>,
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<DocSearchResult>, String> {
    let top_n = limit.unwrap_or(10);

    // Grab the db handle and provider under a short lock
    let (db, provider) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        let db = match &app.mem_db {
            Some(db) => db.clone(),
            None => return Ok(vec![]),
        };
        let provider = app.provider.clone();
        (db, provider)
    };

    // Generate query embedding
    let embedding: Vec<f32> = provider.generate_embedding(&query).await?;

    // Fetch all docs-namespace records, then run cosine search filtered to that namespace
    let all_records = db.list_all()?;
    let docs_records: Vec<MemoryRecord> = all_records
        .into_iter()
        .filter(|r| r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs"))
        .filter(|r| !r.embedding.is_empty())
        .collect();

    // Cosine similarity inline (avoids re-locking the DB)
    fn cosine(a: &[f32], b: &[f32]) -> f32 {
        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        if na == 0.0 || nb == 0.0 {
            0.0
        } else {
            dot / (na * nb)
        }
    }

    let mut scored: Vec<(f32, MemoryRecord)> = docs_records
        .into_iter()
        .map(|r| {
            let score = cosine(&embedding, &r.embedding);
            (score, r)
        })
        .collect();

    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let results = scored
        .into_iter()
        .take(top_n)
        .map(|(score, r)| DocSearchResult {
            file: r.metadata.get("file").cloned().unwrap_or_default(),
            snippet: r.content.chars().take(300).collect(),
            score,
        })
        .collect();

    Ok(results)
}

/// Remove all indexed chunks for a given file path from the "docs" namespace.
#[tauri::command]
pub fn remove_indexed_doc(
    file_path: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<usize, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let db = match &app.mem_db {
        Some(db) => db.clone(),
        None => return Ok(0),
    };
    drop(app);

    let all = db.list_all()?;
    let mut removed = 0usize;
    for r in all {
        let is_docs = r.metadata.get("namespace").map(|s| s.as_str()) == Some("docs");
        let matches_file = r.metadata.get("file").map(|s| s.as_str()) == Some(&file_path);
        if is_docs && matches_file {
            // Ignore individual delete errors — record may already be gone
            let _ = db.delete_record(&r.id);
            removed += 1;
        }
    }
    Ok(removed)
}
