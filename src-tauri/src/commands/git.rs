use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::{command, AppHandle, Manager};

// ── Data Types ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct GitRepoInfo {
    pub path: String,
    pub name: String,
}

#[derive(serde::Serialize, Clone)]
pub struct GitRepoStatus {
    pub head: String,
    pub branch: String,
    pub dirty: bool,
    pub ahead: i32,
    pub behind: i32,
}

#[derive(serde::Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "staged" | "modified" | "untracked" | "renamed" | "deleted" | "conflict"
    pub old_path: Option<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct GitCommit {
    pub sha: String,
    pub short_sha: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub time: i64,
    pub parents: Vec<String>,
    pub file_changes: usize,
}

#[derive(serde::Serialize, Clone)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct GitCredential {
    pub host: String,
    pub username: String,
    pub token: String,
}

// ── Repo Discovery ─────────────────────────────────────────────────────────

fn get_repos_file(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("git_repos.json")
}

fn load_repos(app: &AppHandle) -> Vec<GitRepoInfo> {
    let path = get_repos_file(app);
    if !path.exists() {
        return vec![];
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_repos(app: &AppHandle, repos: &[GitRepoInfo]) {
    let path = get_repos_file(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(
        &path,
        serde_json::to_string_pretty(repos).unwrap_or_default(),
    );
}

fn add_recent_repo(app: &AppHandle, path_str: &str) {
    let mut repos = load_repos(app);
    let name = Path::new(path_str)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    repos.retain(|r| r.path != path_str);
    repos.insert(
        0,
        GitRepoInfo {
            path: path_str.to_string(),
            name,
        },
    );
    repos.truncate(20);
    save_repos(app, &repos);
}

// ── Credential Helpers ─────────────────────────────────────────────────────

fn git_creds_file(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("git_credentials.json")
}

fn load_git_creds(app: &AppHandle) -> HashMap<String, GitCredential> {
    let path = git_creds_file(app);
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_git_creds(app: &AppHandle, creds: &HashMap<String, GitCredential>) {
    let path = git_creds_file(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(
        &path,
        serde_json::to_string_pretty(creds).unwrap_or_default(),
    );
}

// ── Commands ───────────────────────────────────────────────────────────────

#[command]
pub fn git_list_repos(app: AppHandle) -> Result<Vec<GitRepoInfo>, String> {
    Ok(load_repos(&app))
}

#[command]
pub fn git_open_repo(path: String, app: AppHandle) -> Result<GitRepoStatus, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    add_recent_repo(&app, &path);

    let head = repo.head().map_err(|e| e.to_string())?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();
    let head_oid = head.target().map(|t| t.to_string()).unwrap_or_default();

    let mut dirty = false;
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true);
    for entry in repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.to_string())?
        .iter()
    {
        if entry.status() != git2::Status::CURRENT {
            dirty = true;
            break;
        }
    }

    // ahead/behind against upstream
    let (ahead, behind) = if let Ok(branch_ref) = repo.find_branch(&branch, git2::BranchType::Local)
    {
        if let Ok(upstream) = branch_ref.upstream() {
            let local_oid = branch_ref.get().target();
            let upstream_oid = upstream.get().target();
            if let (Some(l), Some(u)) = (local_oid, upstream_oid) {
                repo.graph_ahead_behind(l, u)
                    .map(|(a, b)| (a as i32, b as i32))
                    .unwrap_or((0, 0))
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    Ok(GitRepoStatus {
        head: head_oid,
        branch,
        dirty,
        ahead,
        behind,
    })
}

#[command]
pub fn git_clone(url: String, path: String, app: AppHandle) -> Result<(), String> {
    let mut builder = git2::build::RepoBuilder::new();
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
    });
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    builder.fetch_options(fetch_opts);
    builder
        .clone(&url, Path::new(&path))
        .map_err(|e| e.to_string())?;
    add_recent_repo(&app, &path);
    Ok(())
}

#[command]
pub fn git_init(path: String, app: AppHandle) -> Result<(), String> {
    git2::Repository::init(&path).map_err(|e| e.to_string())?;
    add_recent_repo(&app, &path);
    Ok(())
}

#[command]
pub fn git_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true);
    opts.renames_head_to_index(true);
    opts.renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path_str = entry.path().unwrap_or("?").to_string();
        let old_path = entry
            .head_to_index()
            .and_then(|d| d.old_file().path())
            .map(|p| p.to_string_lossy().to_string());

        let status_str = if status.contains(git2::Status::CONFLICTED) {
            "conflict"
        } else if status.contains(git2::Status::INDEX_NEW)
            || status.contains(git2::Status::INDEX_MODIFIED)
            || status.contains(git2::Status::INDEX_DELETED)
            || status.contains(git2::Status::INDEX_RENAMED)
        {
            "staged"
        } else if status.contains(git2::Status::WT_NEW) {
            "untracked"
        } else if status.contains(git2::Status::WT_DELETED) {
            "deleted"
        } else if status.contains(git2::Status::WT_RENAMED) {
            "renamed"
        } else if status.contains(git2::Status::WT_MODIFIED) {
            "modified"
        } else {
            continue;
        };

        result.push(GitFileStatus {
            path: path_str,
            status: status_str.to_string(),
            old_path,
        });
    }

    Ok(result)
}

#[command]
pub fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    for file in files {
        index
            .add_path(Path::new(&file))
            .map_err(|e| e.to_string())?;
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_tree = repo
        .find_commit(head.target().ok_or("HEAD has no target commit")?)
        .map_err(|e| e.to_string())?
        .tree()
        .map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for file in files {
        index.remove_path(Path::new(&file)).ok();
        if let Ok(entry) = head_tree.get_path(Path::new(&file)) {
            let index_entry = git2::IndexEntry {
                ctime: git2::IndexTime::new(0, 0),
                mtime: git2::IndexTime::new(0, 0),
                dev: 0,
                ino: 0,
                mode: entry.filemode() as u32,
                uid: 0,
                gid: 0,
                file_size: 0,
                id: entry.id(),
                flags: 0,
                flags_extended: 0,
                path: file.as_bytes().to_vec(),
            };
            index.add(&index_entry).map_err(|e| e.to_string())?;
        }
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_discard(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();
    for f in &files {
        checkout_builder.path(f);
    }
    repo.checkout_head(Some(&mut checkout_builder))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_commit(
    path: String,
    message: String,
    author_name: String,
    author_email: String,
) -> Result<String, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let signature = git2::Signature::now(&author_name, &author_email).map_err(|e| e.to_string())?;
    let parent_commit = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok());
    let parents: Vec<&git2::Commit> = parent_commit.as_ref().into_iter().collect();

    let commit_oid = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &parents,
        )
        .map_err(|e| e.to_string())?;

    Ok(commit_oid.to_string())
}

#[command]
pub fn git_log(path: String, max_count: u32) -> Result<Vec<GitCommit>, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for (i, oid) in revwalk.enumerate() {
        if i >= max_count as usize {
            break;
        }
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        let parents: Vec<String> = commit.parent_ids().map(|id| id.to_string()).collect();

        result.push(GitCommit {
            sha: oid.to_string(),
            short_sha: oid.to_string().chars().take(7).collect(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            time: commit.time().seconds(),
            parents,
            file_changes: 0, // would require diff tree-to-tree; skip for perf
        });
    }
    Ok(result)
}

#[command]
pub fn git_branch_list(path: String) -> Result<Vec<String>, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();
    for b in repo.branches(None).map_err(|e| e.to_string())? {
        let (branch, _) = b.map_err(|e| e.to_string())?;
        if let Some(name) = branch.name().map_err(|e| e.to_string())? {
            branches.push(name.to_string());
        }
    }
    Ok(branches)
}

#[command]
pub fn git_branch_create(path: String, name: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = repo
        .find_commit(head.target().ok_or("HEAD has no target commit")?)
        .map_err(|e| e.to_string())?;
    repo.branch(&name, &commit, false)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_branch_delete(path: String, name: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut branch = repo
        .find_branch(&name, git2::BranchType::Local)
        .map_err(|e| e.to_string())?;
    branch.delete().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_branch_checkout(path: String, name: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let (object, reference) = repo.revparse_ext(&name).map_err(|e| e.to_string())?;
    repo.checkout_tree(&object, None)
        .map_err(|e| e.to_string())?;
    if let Some(ref_ref) = reference {
        repo.set_head(ref_ref.name().ok_or("Reference name is not valid UTF-8")?)
            .map_err(|e| e.to_string())?;
    } else {
        repo.set_head_detached(object.id())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub fn git_push(path: String, remote: String, branch: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
    });
    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);
    remote_obj
        .push(
            &[format!("refs/heads/{}:refs/heads/{}", branch, branch)],
            Some(&mut push_opts),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_pull(path: String, remote: String, branch: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
    });
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    remote_obj
        .fetch(&[&branch], Some(&mut fetch_opts), None)
        .map_err(|e| e.to_string())?;

    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| e.to_string())?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| e.to_string())?;
    let mut merge_opts = git2::MergeOptions::new();
    repo.merge(&[&fetch_commit], Some(&mut merge_opts), None)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_fetch(path: String, remote: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut remote_obj = repo.find_remote(&remote).map_err(|e| e.to_string())?;
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git"))
    });
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    remote_obj
        .fetch(&[] as &[&str], Some(&mut fetch_opts), None)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_diff(
    path: String,
    old_tree: Option<String>,
    new_tree: Option<String>,
) -> Result<String, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let diff = match (old_tree, new_tree) {
        (Some(old), Some(new)) => {
            let old_oid = git2::Oid::from_str(&old).map_err(|e| e.to_string())?;
            let new_oid = git2::Oid::from_str(&new).map_err(|e| e.to_string())?;
            let old_t = repo.find_tree(old_oid).map_err(|e| e.to_string())?;
            let new_t = repo.find_tree(new_oid).map_err(|e| e.to_string())?;
            repo.diff_tree_to_tree(Some(&old_t), Some(&new_t), None)
                .map_err(|e| e.to_string())?
        }
        _ => {
            let mut opts = git2::DiffOptions::new();
            repo.diff_index_to_workdir(None, Some(&mut opts))
                .map_err(|e| e.to_string())?
        }
    };

    let mut buf = Vec::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        buf.extend_from_slice(line.content());
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&buf).to_string())
}

#[command]
pub fn git_remote_list(path: String) -> Result<Vec<GitRemote>, String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    let mut remotes = Vec::new();
    for name in repo.remotes().map_err(|e| e.to_string())?.iter().flatten() {
        if let Some(url) = repo
            .find_remote(name)
            .ok()
            .and_then(|r| r.url().map(|u| u.to_string()))
        {
            remotes.push(GitRemote {
                name: name.to_string(),
                url,
            });
        }
    }
    Ok(remotes)
}

#[command]
pub fn git_remote_add(path: String, name: String, url: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    repo.remote(&name, &url).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn git_remote_remove(path: String, name: String) -> Result<(), String> {
    let repo = git2::Repository::open(&path).map_err(|e| e.to_string())?;
    repo.remote_delete(&name).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Credentials ────────────────────────────────────────────────────────────

#[command]
pub fn git_credential_store(
    host: String,
    username: String,
    token: String,
    app: AppHandle,
) -> Result<(), String> {
    let mut creds = load_git_creds(&app);
    creds.insert(
        host.clone(),
        GitCredential {
            host,
            username,
            token,
        },
    );
    save_git_creds(&app, &creds);
    Ok(())
}

#[command]
pub fn git_credential_get(host: String, app: AppHandle) -> Result<Option<GitCredential>, String> {
    let creds = load_git_creds(&app);
    Ok(creds.get(&host).cloned())
}

#[command]
pub fn git_credential_delete(host: String, app: AppHandle) -> Result<(), String> {
    let mut creds = load_git_creds(&app);
    creds.remove(&host);
    save_git_creds(&app, &creds);
    Ok(())
}

// ── SSH Keys ───────────────────────────────────────────────────────────────

fn ssh_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("ssh")
}

#[command]
pub fn git_generate_ssh_key(label: String, app: AppHandle) -> Result<String, String> {
    let dir = ssh_dir(&app);
    let _ = std::fs::create_dir_all(&dir);
    let key_path = dir.join(format!(
        "id_ed25519_{}",
        label.replace(|c: char| !c.is_alphanumeric(), "_")
    ));
    let pub_path = key_path.with_extension("pub");

    let output = std::process::Command::new("ssh-keygen")
        .args([
            "-t",
            "ed25519",
            "-f",
            key_path.to_str().ok_or("Key path contains invalid Unicode")?,
            "-N",
            "",
            "-C",
            &format!("neurodeck-{}", label),
        ])
        .output()
        .map_err(|e| format!("ssh-keygen failed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ssh-keygen error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let pub_key = std::fs::read_to_string(&pub_path).map_err(|e| e.to_string())?;
    Ok(pub_key.trim().to_string())
}

#[command]
pub fn git_ssh_public_keys(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = ssh_dir(&app);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut keys = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension() == Some(std::ffi::OsStr::new("pub")) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                keys.push(content.trim().to_string());
            }
        }
    }
    Ok(keys)
}

// ── AI Commit Message ──────────────────────────────────────────────────────

#[command]
pub async fn git_generate_commit_message(
    path: String,
    _app: AppHandle,
    state: tauri::State<'_, std::sync::Mutex<crate::AppState>>,
) -> Result<String, String> {
    // Get staged diff
    let diff = git_diff(path, None, None)?;
    if diff.trim().is_empty() {
        return Err("No staged changes to generate commit message from.".to_string());
    }

    let prompt = format!(
        "Write a concise, conventional commit message (max 72 chars first line) for this git diff:\n\n{}",
        &diff[..diff.len().min(4000)]
    );

    // Reuse existing LLM pipeline via invoke to keep it simple
    // Actually, we can't easily call send_command from here. Let's use the provider directly.
    let provider = {
        let app_state = state.lock().unwrap_or_else(|e| e.into_inner());
        app_state.provider.clone()
    };

    let response = provider
        .chat_with_image(&prompt, "", None, None)
        .await
        .map_err(|e| e.to_string())?;
    Ok(response.trim().to_string())
}
