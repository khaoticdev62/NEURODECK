use git2::{DiffFormat, Repository, StatusOptions};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

use crate::AppState;

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone, Debug)]
pub struct GitStatus {
    pub path: String,
    pub branch: String,
    pub staged: Vec<String>,
    pub unstaged: Vec<String>,
    pub untracked: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: String,
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn open_repo(path: &str) -> Result<Repository, String> {
    Repository::discover(path).map_err(|e| format!("Not a git repo: {}", e))
}

fn current_branch(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let repo = open_repo(&path)?;
    let branch = current_branch(&repo);

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut opts))
        .map_err(|e| format!("Status error: {}", e))?;

    let mut staged   = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let name = entry.path().unwrap_or("?").to_string();
        let s = entry.status();

        // Staged (index)
        if s.intersects(
            git2::Status::INDEX_NEW
            | git2::Status::INDEX_MODIFIED
            | git2::Status::INDEX_DELETED
            | git2::Status::INDEX_RENAMED
            | git2::Status::INDEX_TYPECHANGE,
        ) {
            staged.push(name.clone());
        }

        // Unstaged (workdir)
        if s.intersects(
            git2::Status::WT_MODIFIED
            | git2::Status::WT_DELETED
            | git2::Status::WT_TYPECHANGE,
        ) {
            unstaged.push(name.clone());
        }

        // Untracked
        if s.contains(git2::Status::WT_NEW) {
            untracked.push(name);
        }
    }

    Ok(GitStatus { path, branch, staged, unstaged, untracked })
}

#[tauri::command]
pub fn git_diff(path: String, file: Option<String>) -> Result<String, String> {
    let repo = open_repo(&path)?;
    let mut diff_text = String::new();

    // Diff HEAD → index (staged changes)
    let head_tree = repo.head().ok()
        .and_then(|h| h.peel_to_tree().ok());
    let index = repo.index().map_err(|e| e.to_string())?;

    let staged_diff = repo
        .diff_tree_to_index(head_tree.as_ref(), Some(&index), None)
        .map_err(|e| format!("Staged diff error: {}", e))?;

    // Diff index → workdir (unstaged changes)
    let unstaged_diff = repo
        .diff_index_to_workdir(None, None)
        .map_err(|e| format!("Unstaged diff error: {}", e))?;

    let collect = |diff: &git2::Diff, buf: &mut String| -> Result<(), String> {
        diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
            // If a specific file was requested, filter
            if let Some(ref f) = file {
                let origin = line.origin();
                let _ = origin; // already filtered per delta
                // Check file path via delta
                if let Some(path) = _delta.new_file().path().and_then(|p| p.to_str()) {
                    if !path.contains(f.as_str()) {
                        return true; // skip
                    }
                }
            }
            let origin = line.origin();
            match origin {
                '+' | '-' | ' ' => {
                    buf.push(origin);
                    buf.push_str(&String::from_utf8_lossy(line.content()));
                }
                'H' => {
                    buf.push_str(&format!("\n{}", String::from_utf8_lossy(line.content())));
                }
                'F' => {
                    buf.push_str(&format!("--- {}\n", String::from_utf8_lossy(line.content())));
                }
                _ => {}
            }
            true
        }).map_err(|e| e.to_string())
    };

    collect(&staged_diff, &mut diff_text)?;
    collect(&unstaged_diff, &mut diff_text)?;

    if diff_text.is_empty() {
        diff_text = "No changes detected.".to_string();
    }

    Ok(diff_text)
}

#[tauri::command]
pub fn git_log(path: String, limit: Option<usize>) -> Result<Vec<GitCommit>, String> {
    let repo = open_repo(&path)?;
    let limit = limit.unwrap_or(20).min(100);

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| format!("No commits yet: {}", e))?;

    let mut commits = Vec::new();
    for oid in revwalk.take(limit) {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        let hash = oid.to_string();
        let short_hash = hash[..7].to_string();
        let message = commit.summary().unwrap_or("").to_string();
        let author = commit.author().name().unwrap_or("Unknown").to_string();
        let timestamp = chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
            .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
            .unwrap_or_default();

        commits.push(GitCommit { hash, short_hash, message, author, timestamp });
    }

    Ok(commits)
}

#[tauri::command]
pub fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = open_repo(&path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for file in &files {
        let p = std::path::Path::new(file);
        // Check if file is deleted
        let full = std::path::Path::new(&path).join(p);
        if full.exists() {
            index.add_path(p).map_err(|e| format!("Stage '{}': {}", file, e))?;
        } else {
            index.remove_path(p).map_err(|e| format!("Remove '{}': {}", file, e))?;
        }
    }

    index.write().map_err(|e| format!("Index write: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<(), String> {
    let repo = open_repo(&path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Stage all: {}", e))?;
    index.write().map_err(|e| format!("Index write: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<GitCommit, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    let repo = open_repo(&path)?;

    let sig = repo.signature()
        .or_else(|_| git2::Signature::now("NEURODECK", "neurodeck@localhost"))
        .map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| format!("Write tree: {}", e))?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    // Get parent commit (HEAD), if any
    let parent_commit = repo.head().ok()
        .and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    let oid = repo.commit(Some("HEAD"), &sig, &sig, message.trim(), &tree, &parents)
        .map_err(|e| format!("Commit failed: {}", e))?;

    let hash = oid.to_string();
    Ok(GitCommit {
        short_hash: hash[..7].to_string(),
        hash,
        message: message.trim().to_string(),
        author: sig.name().unwrap_or("NEURODECK").to_string(),
        timestamp: chrono::Utc::now().format("%Y-%m-%d %H:%M").to_string(),
    })
}

#[tauri::command]
pub async fn generate_commit_message(
    diff: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        std::sync::Arc::clone(&app.provider)
    };

    if diff.trim().is_empty() || diff.trim() == "No changes detected." {
        return Err("No diff to generate message from".to_string());
    }

    // Truncate diff to ~3000 chars to avoid token limits
    let diff_preview = if diff.len() > 3000 {
        format!("{}… [truncated]", &diff[..3000])
    } else {
        diff.clone()
    };

    let prompt = format!(
        "Generate a concise git commit message for the following diff.\n\
         Use conventional commit format: type(scope): description\n\
         Types: feat, fix, refactor, style, docs, test, chore\n\
         Output ONLY the commit message — no explanation, no quotes, no markdown.\n\
         Keep it under 72 characters.\n\n\
         DIFF:\n{}",
        diff_preview
    );

    let msg = provider.generate_oneshot(&prompt, 256).await?;

    // Strip markdown/quotes if model added them
    let cleaned = msg.trim()
        .trim_matches('`')
        .trim_matches('"')
        .trim_matches('\'')
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    Ok(cleaned)
}

// ── AI Code Review ─────────────────────────────────────────────────────────

/// Review code and return a JSON array of findings:
/// `[{ "line": N, "severity": "error"|"warning"|"info", "category": "...", "message": "..." }]`
#[tauri::command]
pub async fn review_code(
    code: String,
    lang: String,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let provider = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        std::sync::Arc::clone(&app.provider)
    };

    if code.trim().is_empty() {
        return Err("No code to review".to_string());
    }

    let code_preview = if code.len() > 4000 {
        format!("{}… [truncated at 4000 chars]", &code[..4000])
    } else {
        code.clone()
    };

    let prompt = format!(
        "You are a senior code reviewer. Review the following {} code and identify bugs, \
         security issues, performance problems, and style concerns.\n\
         Output ONLY valid JSON — no markdown, no explanation:\n\
         {{\"findings\":[{{\"line\":1,\"severity\":\"error\",\"category\":\"bug\",\"message\":\"description\"}}]}}\n\
         Rules:\n\
         - severity: \"error\" (crash/security), \"warning\" (logic/perf), \"info\" (style/suggestion)\n\
         - category: \"bug\", \"security\", \"performance\", \"style\", \"logic\"\n\
         - line: best estimate of affected line number (1-based), or 0 if file-wide\n\
         - message: concise, actionable description (max 120 chars)\n\
         - 3-10 findings maximum; omit trivial nits\n\
         - If code is correct and clean, return {{\"findings\":[]}}\n\n\
         Language: {}\n\
         Code:\n```\n{}\n```",
        lang, lang, code_preview
    );

    let raw = provider.generate_oneshot(&prompt, 800).await?;

    // Strip markdown fences and find the JSON object
    let s = raw.trim();
    let inner = if let Some(start) = s.find("```") {
        let after = &s[start + 3..];
        let after = if after.starts_with("json") { &after[4..] } else { after };
        if let Some(end) = after.find("```") { &after[..end] } else { after }
    } else {
        s
    };
    let trimmed = inner.trim();
    let start = trimmed.find('{').unwrap_or(0);
    let json_str = &trimmed[start..];

    // Validate it parses
    serde_json::from_str::<serde_json::Value>(json_str)
        .map_err(|e| format!("Review JSON parse error: {} — raw: {}", e, &json_str[..json_str.len().min(200)]))?;

    Ok(json_str.to_string())
}
