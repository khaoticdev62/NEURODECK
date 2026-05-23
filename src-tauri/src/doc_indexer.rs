use tauri::{State, Emitter, AppHandle};
use crate::AppState;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[tauri::command]
pub async fn index_directory(
    path: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<usize, String> {
    let app_state = state.inner().lock().await;
    let provider = app_state.provider.clone();
    let mem_db = app_state.mem_db.clone().ok_or("MemoryDB not initialized")?;
    
    // We drop the lock here because generating embeddings takes a long time
    // and we don't want to block the rest of the application
    drop(app_state);

    let path_obj = Path::new(&path);
    if !path_obj.exists() || !path_obj.is_dir() {
        return Err("Invalid directory path".to_string());
    }

    let mut indexed_count = 0;
    
    // First, count total files for progress reporting
    let files: Vec<_> = WalkDir::new(path_obj)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| !e.file_type().is_dir())
        .filter(|e| {
            if let Some(ext) = e.path().extension() {
                ext == "md" || ext == "txt"
            } else {
                false
            }
        })
        .collect();
        
    let total = files.len();

    for (file_idx, entry) in files.into_iter().enumerate() {
        let file_path = entry.path();
        
        let _ = app_handle.emit("doc_index_progress", serde_json::json!({
            "indexed": file_idx,
            "total": total,
            "file": file_path.file_name().unwrap_or_default().to_string_lossy(),
            "done": false
        }));

        if let Ok(content) = fs::read_to_string(file_path) {
                    // Very simple chunking strategy: chunks of ~1000 chars
                    let chunks: Vec<String> = content
                        .chars()
                        .collect::<Vec<char>>()
                        .chunks(1000)
                        .map(|c| c.iter().collect::<String>())
                        .collect();

                    for (i, chunk) in chunks.iter().enumerate() {
                        let id = format!("{}_chunk_{}", file_path.to_string_lossy(), i);
                        let mut metadata = HashMap::new();
                        metadata.insert("namespace".to_string(), "rag".to_string());
                        metadata.insert("path".to_string(), file_path.to_string_lossy().to_string());
                        
                        // Wait for embedding (this can take some time per chunk)
                        if let Ok(embedding) = provider.generate_embedding(chunk).await {
                            if mem_db.store_message(id, chunk.clone(), embedding, metadata).is_ok() {
                                indexed_count += 1;
                            }
                        }
                    }
        }
    }
    
    let _ = app_handle.emit("doc_index_progress", serde_json::json!({
        "indexed": total,
        "total": total,
        "done": true
    }));

    Ok(indexed_count)
}

#[tauri::command]
pub async fn get_doc_count(
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let app_state = state.inner().lock().await;
    let mem_db = app_state.mem_db.clone().ok_or("MemoryDB not initialized")?;
    
    // Since each chunk is a record, counting distinct paths gives document count
    let records = mem_db.list_all()?;
    let mut paths = std::collections::HashSet::new();
    
    for r in records {
        if r.metadata.get("namespace").map(|s| s.as_str()) == Some("rag") {
            if let Some(p) = r.metadata.get("path") {
                paths.insert(p.clone());
            }
        }
    }
    
    Ok(paths.len())
}

#[tauri::command]
pub async fn get_indexed_docs(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let app_state = state.inner().lock().await;
    let mem_db = app_state.mem_db.clone().ok_or("MemoryDB not initialized")?;
    
    let records = mem_db.list_all()?;
    let mut paths = std::collections::HashSet::new();
    
    for r in records {
        if r.metadata.get("namespace").map(|s| s.as_str()) == Some("rag") {
            if let Some(p) = r.metadata.get("path") {
                paths.insert(p.clone());
            }
        }
    }
    
    let mut result: Vec<String> = paths.into_iter().collect();
    result.sort();
    Ok(result)
}

#[tauri::command]
pub async fn clear_doc_index(
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let app_state = state.inner().lock().await;
    let mem_db = app_state.mem_db.clone().ok_or("MemoryDB not initialized")?;
    mem_db.delete_by_namespace("rag")
}
