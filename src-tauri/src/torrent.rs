use std::collections::HashMap;
use std::convert::TryFrom;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;

use chrono::Utc;
use fx_torrent::{
    metrics::Metric, FxTorrentSession, Magnet, Session, SessionConfig, Torrent, TorrentFlags,
    TorrentMetadata,
};
use serde::Serialize;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

const MAX_TORRENT_FILE_BYTES: u64 = 32 * 1024 * 1024;

#[derive(Clone)]
pub struct TorrentState {
    inner: Arc<Mutex<TorrentManager>>,
}

impl TorrentState {
    pub fn new(download_root: PathBuf) -> Self {
        Self {
            inner: Arc::new(Mutex::new(TorrentManager::new(download_root))),
        }
    }
}

struct TorrentManager {
    download_root: PathBuf,
    session: Option<FxTorrentSession>,
    torrents: HashMap<String, TorrentRecord>,
    sequence: u64,
}

struct TorrentRecord {
    id: String,
    seq: u64,
    torrent: Torrent,
    label: String,
    source_kind: String,
    source_display: String,
    source_value: String,
    added_at_utc: String,
    info_hash: String,
}

#[derive(Serialize)]
pub struct TorrentSnapshot {
    pub id: String,
    pub name: String,
    pub source_kind: String,
    pub source_display: String,
    pub source_value: String,
    pub status: String,
    pub progress_pct: f64,
    pub pieces_done: usize,
    pub pieces_total: usize,
    pub peers: usize,
    pub trackers: usize,
    pub paused: bool,
    pub completed: bool,
    pub metadata_known: bool,
    pub download_root: String,
    pub save_path: Option<String>,
    pub added_at_utc: String,
    pub info_hash: String,
    pub download_rate_bps: u64,
    pub upload_rate_bps: u64,
    pub downloaded_bytes: u64,
    pub uploaded_bytes: u64,
    pub bytes_remaining: u64,
    pub eta_seconds: Option<u64>,
    pub ratio: Option<f64>,
}

#[derive(Serialize)]
pub struct TorrentClientStatus {
    pub download_root: String,
    pub torrent_count: usize,
    pub torrents: Vec<TorrentSnapshot>,
}

#[allow(clippy::large_enum_variant)]
enum ParsedTorrentSource {
    Magnet {
        uri: String,
        info_hash: Option<String>,
    },
    File {
        canonical_path: PathBuf,
        metadata: TorrentMetadata,
        info_hash: Option<String>,
    },
}

impl TorrentManager {
    fn new(download_root: PathBuf) -> Self {
        Self {
            download_root,
            session: None,
            torrents: HashMap::new(),
            sequence: 0,
        }
    }

    async fn ensure_session(&mut self) -> Result<(), String> {
        if self.session.is_some() {
            return Ok(());
        }

        std::fs::create_dir_all(&self.download_root)
            .map_err(|e| format!("Failed to create torrent download root: {}", e))?;

        let session = FxTorrentSession::builder()
            .config(
                SessionConfig::builder()
                    .path(&self.download_root)
                    .client_name("NEURODECK")
                    .build(),
            )
            .default_extensions()
            .build()
            .map_err(|e| format!("Failed to initialize torrent session: {}", e))?;

        self.session = Some(session);
        Ok(())
    }

    async fn add_source(&mut self, source: &str) -> Result<TorrentSnapshot, String> {
        self.ensure_session().await?;
        let session = self
            .session
            .as_ref()
            .ok_or_else(|| "Torrent session is unavailable".to_string())?;
        let cleaned = source.trim();
        if cleaned.is_empty() {
            return Err("Torrent source cannot be empty.".to_string());
        }

        let parsed = parse_torrent_source(cleaned)?;
        let normalized_source = parsed.source_value();
        if let Some(record) = self.find_duplicate_by_source(&normalized_source) {
            return Err(format!(
                "This torrent source is already queued as {}.",
                record.label
            ));
        }
        if let Some(info_hash) = parsed.info_hash() {
            if let Some(record) = self.find_duplicate_by_info_hash(info_hash) {
                return Err(format!(
                    "A torrent with info hash {} is already queued as {}.",
                    info_hash, record.label
                ));
            }
        }

        let flags = TorrentFlags::Paused | TorrentFlags::Metadata | TorrentFlags::AutoManaged;
        let torrent = match &parsed {
            ParsedTorrentSource::Magnet { uri, .. } => session
                .add_torrent_from_uri(uri, flags)
                .await
                .map_err(|e| format!("Failed to add magnet torrent: {}", e))?,
            ParsedTorrentSource::File { metadata, .. } => session
                .add_torrent_from_info(metadata.clone(), flags)
                .await
                .map_err(|e| format!("Failed to add torrent metadata: {}", e))?,
        };

        let id = Uuid::new_v4().to_string();
        let seq = self.sequence;
        self.sequence = self.sequence.saturating_add(1);
        let label = parsed.label();
        let source_kind = parsed.source_kind().to_string();
        let source_display = shorten_for_display(&normalized_source, 96);
        let source_value = normalized_source;
        let added_at_utc = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let info_hash = parsed.info_hash().unwrap_or_default().to_string();

        self.torrents.insert(
            id.clone(),
            TorrentRecord {
                id: id.clone(),
                seq,
                torrent,
                label,
                source_kind,
                source_display,
                source_value,
                added_at_utc,
                info_hash,
            },
        );

        self.snapshot_by_id(&id).await
    }

    async fn remove(&mut self, id: &str, delete_data: bool) -> Result<(), String> {
        let session = self
            .session
            .as_ref()
            .ok_or_else(|| "Torrent session is unavailable".to_string())?;

        let (handle, payload_path) = {
            let record = self
                .torrents
                .get(id)
                .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
            record.torrent.pause().await;
            let path = if delete_data {
                record.torrent.path().await
            } else {
                None
            };
            (record.torrent.handle(), path)
        };

        session.remove_torrent(&handle).await;
        self.torrents.remove(id);

        if let Some(path) = payload_path {
            safe_delete_torrent_payload(&self.download_root, &path)?;
        }

        Ok(())
    }

    async fn snapshot_by_id(&self, id: &str) -> Result<TorrentSnapshot, String> {
        let record = self
            .torrents
            .get(id)
            .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
        snapshot_record(record, &self.download_root).await
    }

    async fn save_path_for_id(&self, id: &str) -> Result<PathBuf, String> {
        let record = self
            .torrents
            .get(id)
            .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
        record.torrent.path().await.ok_or_else(|| {
            "Torrent save path is not available yet. Metadata may still be pending.".to_string()
        })
    }

    async fn list(&self) -> Result<Vec<TorrentSnapshot>, String> {
        let mut items: Vec<&TorrentRecord> = self.torrents.values().collect();
        items.sort_by(|a, b| b.seq.cmp(&a.seq));

        let mut snapshots = Vec::with_capacity(items.len());
        for record in items {
            snapshots.push(snapshot_record(record, &self.download_root).await?);
        }
        Ok(snapshots)
    }

    async fn pause(&self, id: &str) -> Result<TorrentSnapshot, String> {
        let record = self
            .torrents
            .get(id)
            .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
        record.torrent.pause().await;
        snapshot_record(record, &self.download_root).await
    }

    async fn resume(&self, id: &str) -> Result<TorrentSnapshot, String> {
        let record = self
            .torrents
            .get(id)
            .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
        record.torrent.resume().await;
        snapshot_record(record, &self.download_root).await
    }

    async fn pause_all(&self) -> Result<Vec<TorrentSnapshot>, String> {
        let mut items: Vec<&TorrentRecord> = self.torrents.values().collect();
        items.sort_by(|a, b| b.seq.cmp(&a.seq));

        let mut snapshots = Vec::with_capacity(items.len());
        for record in items {
            record.torrent.pause().await;
            snapshots.push(snapshot_record(record, &self.download_root).await?);
        }
        Ok(snapshots)
    }

    async fn resume_all(&self) -> Result<Vec<TorrentSnapshot>, String> {
        let mut items: Vec<&TorrentRecord> = self.torrents.values().collect();
        items.sort_by(|a, b| b.seq.cmp(&a.seq));

        let mut snapshots = Vec::with_capacity(items.len());
        for record in items {
            record.torrent.resume().await;
            snapshots.push(snapshot_record(record, &self.download_root).await?);
        }
        Ok(snapshots)
    }

    fn download_root(&self) -> String {
        self.download_root.to_string_lossy().to_string()
    }

    fn find_duplicate_by_source(&self, normalized_source: &str) -> Option<&TorrentRecord> {
        self.torrents
            .values()
            .find(|record| record.source_value.eq_ignore_ascii_case(normalized_source))
    }

    fn find_duplicate_by_info_hash(&self, candidate: &str) -> Option<&TorrentRecord> {
        let candidate_upper = candidate.to_ascii_uppercase();
        self.torrents.values().find(|record| {
            !record.info_hash.is_empty() && record.info_hash.eq_ignore_ascii_case(&candidate_upper)
        })
    }
}

async fn snapshot_record(
    record: &TorrentRecord,
    download_root: &Path,
) -> Result<TorrentSnapshot, String> {
    let paused = record.torrent.is_paused().await;
    let completed = record.torrent.is_completed().await;
    let metadata_known = record.torrent.is_metadata_known().await;
    let peers = record.torrent.active_peer_connections().await;
    let trackers = record.torrent.active_tracker_connections().await;
    let pieces_done = record.torrent.total_completed_pieces().await;
    let pieces_total = record.torrent.total_pieces().await;
    let save_path = record
        .torrent
        .path()
        .await
        .map(|path| path.to_string_lossy().to_string());
    let metrics = record.torrent.metrics().snapshot();
    let download_rate_bps = u64::from(metrics.download.rate());
    let upload_rate_bps = u64::from(metrics.upload.rate());
    let downloaded_bytes = metrics.download.total();
    let uploaded_bytes = metrics.upload.total();
    let bytes_remaining = metrics.bytes_remaining();
    let eta_seconds = if completed || bytes_remaining == 0 {
        Some(0)
    } else if download_rate_bps == 0 {
        None
    } else {
        Some(bytes_remaining.saturating_add(download_rate_bps - 1) / download_rate_bps)
    };
    let ratio = if downloaded_bytes == 0 {
        None
    } else {
        Some(uploaded_bytes as f64 / downloaded_bytes as f64)
    };

    let progress_pct = if completed {
        100.0
    } else if pieces_total == 0 {
        0.0
    } else {
        (pieces_done as f64 / pieces_total as f64) * 100.0
    };

    let status = if paused {
        if completed {
            "paused-complete"
        } else {
            "paused"
        }
    } else if completed {
        "completed"
    } else if !metadata_known {
        "metadata"
    } else if peers > 0 {
        "downloading"
    } else {
        "waiting"
    };

    Ok(TorrentSnapshot {
        id: record.id.clone(),
        name: record.label.clone(),
        source_kind: record.source_kind.clone(),
        source_display: record.source_display.clone(),
        source_value: record.source_value.clone(),
        status: status.to_string(),
        progress_pct: (progress_pct * 10.0).round() / 10.0,
        pieces_done,
        pieces_total,
        peers,
        trackers,
        paused,
        completed,
        metadata_known,
        download_root: download_root.to_string_lossy().to_string(),
        save_path,
        added_at_utc: record.added_at_utc.clone(),
        info_hash: record.info_hash.clone(),
        download_rate_bps,
        upload_rate_bps,
        downloaded_bytes,
        uploaded_bytes,
        bytes_remaining,
        eta_seconds,
        ratio: ratio.map(|value| (value * 100.0).round() / 100.0),
    })
}

fn sanitize_torrent_path(input: &str) -> Result<PathBuf, String> {
    if input.contains("://") {
        return Err(
            "Remote torrent URLs are not accepted. Use a local .torrent file path or a magnet URI."
                .to_string(),
        );
    }

    let raw = PathBuf::from(input);
    let resolved = if raw.is_absolute() {
        raw
    } else {
        std::env::current_dir()
            .map_err(|e| format!("Failed to resolve working directory: {}", e))?
            .join(raw)
    };

    let canonical = resolved.canonicalize().map_err(|e| {
        format!(
            "Failed to resolve torrent file {}: {}",
            resolved.display(),
            e
        )
    })?;

    if !canonical.is_file() {
        return Err(format!(
            "Torrent file does not exist: {}",
            canonical.display()
        ));
    }

    if canonical
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("torrent"))
        != Some(true)
    {
        return Err("Only local .torrent files are accepted.".to_string());
    }

    Ok(canonical)
}

fn parse_torrent_source(input: &str) -> Result<ParsedTorrentSource, String> {
    if is_magnet_source(input) {
        let magnet = Magnet::from_str(input).map_err(|e| format!("Invalid magnet URI: {}", e))?;
        return Ok(ParsedTorrentSource::Magnet {
            uri: input.to_string(),
            info_hash: extract_magnet_info_hash(&magnet),
        });
    }

    let file_path = sanitize_torrent_path(input)?;
    let bytes = std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read torrent file {}: {}", file_path.display(), e))?;
    if (bytes.len() as u64) > MAX_TORRENT_FILE_BYTES {
        return Err(
            "Torrent file is too large. Refusing to ingest files above 32 MiB.".to_string(),
        );
    }
    let metadata = TorrentMetadata::try_from(bytes.as_slice())
        .map_err(|e| format!("Invalid torrent metadata in {}: {}", file_path.display(), e))?;
    let info_hash = Some(metadata.info_hash.to_string());

    Ok(ParsedTorrentSource::File {
        canonical_path: file_path,
        metadata,
        info_hash,
    })
}

fn is_magnet_source(input: &str) -> bool {
    input.starts_with("magnet:?") || input.starts_with("magnet:")
}

fn extract_magnet_info_hash(magnet: &Magnet) -> Option<String> {
    magnet.xt().into_iter().find_map(|topic| {
        topic
            .rsplit(':')
            .next()
            .map(|value| value.to_ascii_uppercase())
    })
}

fn normalized_path_for_check(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return path
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path {}: {}", path.display(), e));
    }

    let parent = path
        .parent()
        .ok_or_else(|| format!("Path {} has no parent directory.", path.display()))?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|e| format!("Failed to resolve directory {}: {}", parent.display(), e))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| format!("Path {} has no terminal name.", path.display()))?;
    Ok(canonical_parent.join(file_name))
}

fn safe_delete_torrent_payload(download_root: &Path, candidate: &Path) -> Result<(), String> {
    let root = download_root.canonicalize().map_err(|e| {
        format!(
            "Failed to resolve torrent root {}: {}",
            download_root.display(),
            e
        )
    })?;
    let target = normalized_path_for_check(candidate)?;

    if target == root {
        return Err("Refusing to delete the torrent root itself.".to_string());
    }
    if !target.starts_with(&root) {
        return Err(format!(
            "Refusing to delete torrent payload outside the managed root: {}",
            target.display()
        ));
    }
    if !target.exists() {
        return Ok(());
    }

    if target.is_dir() {
        std::fs::remove_dir_all(&target).map_err(|e| {
            format!(
                "Failed to delete torrent directory {}: {}",
                target.display(),
                e
            )
        })?;
    } else {
        std::fs::remove_file(&target)
            .map_err(|e| format!("Failed to delete torrent file {}: {}", target.display(), e))?;
    }

    cleanup_empty_torrent_dirs(target.parent(), &root)?;
    Ok(())
}

fn cleanup_empty_torrent_dirs(mut current: Option<&Path>, root: &Path) -> Result<(), String> {
    while let Some(dir) = current {
        if dir == root || !dir.starts_with(root) {
            break;
        }
        let is_empty = std::fs::read_dir(dir)
            .map_err(|e| {
                format!(
                    "Failed to inspect torrent directory {}: {}",
                    dir.display(),
                    e
                )
            })?
            .next()
            .is_none();
        if !is_empty {
            break;
        }
        std::fs::remove_dir(dir).map_err(|e| {
            format!(
                "Failed to delete empty torrent directory {}: {}",
                dir.display(),
                e
            )
        })?;
        current = dir.parent();
    }
    Ok(())
}

fn shorten_for_display(input: &str, limit: usize) -> String {
    let trimmed = input.trim();
    if trimmed.chars().count() <= limit {
        return trimmed.to_string();
    }
    let mut out = String::new();
    for ch in trimmed.chars().take(limit.saturating_sub(1)) {
        out.push(ch);
    }
    out.push('…');
    out
}

fn derive_label(source: &str) -> String {
    if source.starts_with("magnet:?") || source.starts_with("magnet:") {
        return shorten_for_display(source, 40);
    }
    Path::new(source)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_string())
        .unwrap_or_else(|| shorten_for_display(source, 40))
}

impl ParsedTorrentSource {
    fn source_kind(&self) -> &'static str {
        match self {
            ParsedTorrentSource::Magnet { .. } => "magnet",
            ParsedTorrentSource::File { .. } => "file",
        }
    }

    fn source_value(&self) -> String {
        match self {
            ParsedTorrentSource::Magnet { uri, .. } => uri.clone(),
            ParsedTorrentSource::File { canonical_path, .. } => {
                canonical_path.to_string_lossy().to_string()
            }
        }
    }

    fn info_hash(&self) -> Option<&str> {
        match self {
            ParsedTorrentSource::Magnet { info_hash, .. } => info_hash.as_deref(),
            ParsedTorrentSource::File { info_hash, .. } => info_hash.as_deref(),
        }
    }

    fn label(&self) -> String {
        match self {
            ParsedTorrentSource::Magnet { uri, .. } => derive_label(uri),
            ParsedTorrentSource::File { canonical_path, .. } => {
                derive_label(&canonical_path.to_string_lossy())
            }
        }
    }
}

#[tauri::command]
pub async fn torrent_get_status(
    state: State<'_, TorrentState>,
) -> Result<TorrentClientStatus, String> {
    let guard = state.inner.lock().await;
    let torrents = guard.list().await?;
    Ok(TorrentClientStatus {
        download_root: guard.download_root(),
        torrent_count: torrents.len(),
        torrents,
    })
}

#[tauri::command]
pub async fn torrent_list(state: State<'_, TorrentState>) -> Result<Vec<TorrentSnapshot>, String> {
    let guard = state.inner.lock().await;
    guard.list().await
}

#[tauri::command]
pub async fn torrent_add(
    state: State<'_, TorrentState>,
    source: String,
) -> Result<TorrentSnapshot, String> {
    let mut guard = state.inner.lock().await;
    guard.add_source(&source).await
}

#[tauri::command]
pub async fn torrent_remove(
    state: State<'_, TorrentState>,
    id: String,
    delete_data: Option<bool>,
) -> Result<(), String> {
    let mut guard = state.inner.lock().await;
    guard.remove(&id, delete_data.unwrap_or(false)).await
}

#[tauri::command]
pub async fn torrent_pause(
    state: State<'_, TorrentState>,
    id: String,
) -> Result<TorrentSnapshot, String> {
    let guard = state.inner.lock().await;
    guard.pause(&id).await
}

#[tauri::command]
pub async fn torrent_resume(
    state: State<'_, TorrentState>,
    id: String,
) -> Result<TorrentSnapshot, String> {
    let guard = state.inner.lock().await;
    guard.resume(&id).await
}

#[tauri::command]
pub async fn torrent_pause_all(
    state: State<'_, TorrentState>,
) -> Result<Vec<TorrentSnapshot>, String> {
    let guard = state.inner.lock().await;
    guard.pause_all().await
}

#[tauri::command]
pub async fn torrent_resume_all(
    state: State<'_, TorrentState>,
) -> Result<Vec<TorrentSnapshot>, String> {
    let guard = state.inner.lock().await;
    guard.resume_all().await
}

#[tauri::command]
pub async fn torrent_get_download_root(state: State<'_, TorrentState>) -> Result<String, String> {
    let guard = state.inner.lock().await;
    Ok(guard.download_root())
}

#[tauri::command]
pub async fn torrent_open_download_root(state: State<'_, TorrentState>) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let root = PathBuf::from(guard.download_root());
    drop(guard);

    if !root.exists() || !root.is_dir() {
        return Err(format!(
            "Torrent download root is unavailable: {}",
            root.display()
        ));
    }

    open_path_in_shell(&root, false)
}

#[tauri::command]
pub async fn torrent_open_save_path(
    state: State<'_, TorrentState>,
    id: String,
) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let root = guard.download_root.clone();
    let save_path = guard.save_path_for_id(&id).await?;
    drop(guard);

    let target = normalized_path_for_check(&save_path)?;
    let root = root
        .canonicalize()
        .map_err(|e| format!("Failed to resolve torrent root {}: {}", root.display(), e))?;
    if !target.starts_with(&root) {
        return Err(format!(
            "Refusing to open torrent payload outside the managed root: {}",
            target.display()
        ));
    }

    open_path_in_shell(&target, true)
}

fn open_path_in_shell(target: &Path, reveal_parent_for_file: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut command = std::process::Command::new("explorer.exe");
        if reveal_parent_for_file && target.is_file() {
            command.arg("/select,").arg(target);
        } else {
            command.arg(target);
        }
        command
            .spawn()
            .map_err(|e| format!("Failed to open {}: {}", target.display(), e))?;
    }
    #[cfg(target_os = "macos")]
    {
        let mut command = std::process::Command::new("open");
        if reveal_parent_for_file && target.exists() {
            command.arg("-R");
        }
        command
            .arg(target)
            .spawn()
            .map_err(|e| format!("Failed to open {}: {}", target.display(), e))?;
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let open_target = if reveal_parent_for_file && target.is_file() {
            target
                .parent()
                .ok_or_else(|| format!("Path {} has no parent directory.", target.display()))?
        } else {
            target
        };
        std::process::Command::new("xdg-open")
            .arg(open_target)
            .spawn()
            .map_err(|e| format!("Failed to open {}: {}", open_target.display(), e))?;
    }

    Ok(())
}
