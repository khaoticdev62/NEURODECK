use serde::Serialize;
use std::path::PathBuf;
use tauri::command;

fn workspace_dir() -> PathBuf {
    crate::user_config_dir().join("workspace")
}

fn ensure_workspace() -> Result<PathBuf, String> {
    let dir = workspace_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn sanitize_workspace_path(path: &str) -> Result<PathBuf, String> {
    let workspace = ensure_workspace()?;
    let resolved = workspace.join(path);

    // Normalize path components first (removes `..` and `.`) so that paths for
    // files that don't exist yet are still validated correctly — canonicalize()
    // fails for non-existent paths, leaving raw `..` components that bypass the
    // starts_with check.
    let normalized: PathBuf = resolved.components().collect();
    let canonical_workspace = workspace.canonicalize().unwrap_or(workspace.clone());
    if !normalized.starts_with(&canonical_workspace) {
        return Err("Path escapes workspace directory".to_string());
    }

    // Additional defense: if the file exists, re-check with the real canonical path.
    if let Ok(canon) = resolved.canonicalize() {
        if !canon.starts_with(&canonical_workspace) {
            return Err("Path escapes workspace directory".to_string());
        }
    }

    Ok(resolved)
}

#[derive(Serialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[command]
pub async fn list_workspace_files(path: Option<String>) -> Result<Vec<FileEntry>, String> {
    let workspace = ensure_workspace()?;
    let target = match path {
        Some(p) => sanitize_workspace_path(&p)?,
        None => workspace.clone(),
    };

    let mut entries = vec![];
    let mut dir = tokio::fs::read_dir(&target).await.map_err(|e| e.to_string())?;

    while let Ok(Some(entry)) = dir.next_entry().await {
        let meta = entry.metadata().await.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let rel = entry
            .path()
            .strip_prefix(&workspace)
            .unwrap_or(&entry.path())
            .to_string_lossy()
            .to_string()
            .replace('\\', "/");
        entries.push(FileEntry {
            name,
            path: rel,
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[command]
pub async fn read_workspace_file(path: String) -> Result<String, String> {
    let target = sanitize_workspace_path(&path)?;
    tokio::fs::read_to_string(&target)
        .await
        .map_err(|e| format!("Cannot read '{}': {}", path, e))
}

#[command]
pub async fn write_workspace_file(path: String, content: String) -> Result<(), String> {
    let target = sanitize_workspace_path(&path)?;
    if let Some(parent) = target.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    tokio::fs::write(&target, content)
        .await
        .map_err(|e| format!("Cannot write '{}': {}", path, e))
}

#[command]
pub async fn create_workspace_file(path: String) -> Result<(), String> {
    let target = sanitize_workspace_path(&path)?;
    if let Some(parent) = target.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    tokio::fs::write(&target, "")
        .await
        .map_err(|e| format!("Cannot create '{}': {}", path, e))
}

#[command]
pub async fn delete_workspace_file(path: String) -> Result<(), String> {
    let target = sanitize_workspace_path(&path)?;
    let meta = tokio::fs::metadata(&target).await.map_err(|e| e.to_string())?;
    if meta.is_dir() {
        tokio::fs::remove_dir_all(&target)
            .await
            .map_err(|e| format!("Cannot delete dir '{}': {}", path, e))
    } else {
        tokio::fs::remove_file(&target)
            .await
            .map_err(|e| format!("Cannot delete file '{}': {}", path, e))
    }
}

#[command]
pub async fn rename_workspace_file(from: String, to: String) -> Result<(), String> {
    let src = sanitize_workspace_path(&from)?;
    let dst = sanitize_workspace_path(&to)?;
    tokio::fs::rename(&src, &dst)
        .await
        .map_err(|e| format!("Cannot rename '{}': {}", from, e))
}
