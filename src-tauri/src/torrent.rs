use std::collections::HashMap;
use std::convert::TryFrom;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;

use chrono::Utc;
use fx_torrent::{FxTorrentSession, Magnet, Session, SessionConfig, Torrent, TorrentFlags, TorrentMetadata};
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
    source_value: String,
    added_at_utc: String,
}

#[derive(Serialize)]
pub struct TorrentSnapshot {
    pub id: String,
    pub name: String,
    pub source_kind: String,
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
    pub added_at_utc: String,
    pub info_hash: String,
}

#[derive(Serialize)]
pub struct TorrentClientStatus {
    pub download_root: String,
    pub torrent_count: usize,
    pub torrents: Vec<TorrentSnapshot>,
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
        let session = self.session.as_ref().ok_or_else(|| "Torrent session is unavailable".to_string())?;
        let cleaned = source.trim();
        if cleaned.is_empty() {
            return Err("Torrent source cannot be empty.".to_string());
        }

        let flags = TorrentFlags::Paused | TorrentFlags::Metadata | TorrentFlags::AutoManaged;
        let torrent = if cleaned.starts_with("magnet:?") || cleaned.starts_with("magnet:") {
            Magnet::from_str(cleaned).map_err(|e| format!("Invalid magnet URI: {}", e))?;
            session
                .add_torrent_from_uri(cleaned, flags)
                .await
                .map_err(|e| format!("Failed to add magnet torrent: {}", e))?
        } else {
            let file_path = sanitize_torrent_path(cleaned)?;
            let bytes = std::fs::read(&file_path)
                .map_err(|e| format!("Failed to read torrent file {}: {}", file_path.display(), e))?;
            if (bytes.len() as u64) > MAX_TORRENT_FILE_BYTES {
                return Err("Torrent file is too large. Refusing to ingest files above 32 MiB.".to_string());
            }
            let metadata = TorrentMetadata::try_from(bytes.as_slice())
                .map_err(|e| format!("Invalid torrent metadata in {}: {}", file_path.display(), e))?;
            session
                .add_torrent_from_info(metadata, flags)
                .await
                .map_err(|e| format!("Failed to add torrent metadata: {}", e))?
        };

        let id = Uuid::new_v4().to_string();
        let seq = self.sequence;
        self.sequence = self.sequence.saturating_add(1);
        let label = derive_label(cleaned);
        let source_kind = if cleaned.starts_with("magnet:?") || cleaned.starts_with("magnet:") {
            "magnet".to_string()
        } else {
            "file".to_string()
        };
        let source_value = shorten_for_display(cleaned, 96);
        let added_at_utc = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

        self.torrents.insert(
            id.clone(),
            TorrentRecord {
                id: id.clone(),
                seq,
                torrent,
                label,
                source_kind,
                source_value,
                added_at_utc,
            },
        );

        self.snapshot_by_id(&id).await
    }

    async fn snapshot_by_id(&self, id: &str) -> Result<TorrentSnapshot, String> {
        let record = self
            .torrents
            .get(id)
            .ok_or_else(|| format!("Unknown torrent id: {}", id))?;
        snapshot_record(record, &self.download_root).await
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

    fn download_root(&self) -> String {
        self.download_root.to_string_lossy().to_string()
    }
}

async fn snapshot_record(record: &TorrentRecord, download_root: &Path) -> Result<TorrentSnapshot, String> {
    let paused = record.torrent.is_paused().await;
    let completed = record.torrent.is_completed().await;
    let metadata_known = record.torrent.is_metadata_known().await;
    let peers = record.torrent.active_peer_connections().await;
    let trackers = record.torrent.active_tracker_connections().await;
    let pieces_done = record.torrent.total_completed_pieces().await;
    let pieces_total = record.torrent.total_pieces().await;

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
        added_at_utc: record.added_at_utc.clone(),
        info_hash: record
            .torrent
            .info_hash()
            .await
            .map_err(|e| format!("Failed to read torrent info hash: {}", e))?
            .to_string(),
    })
}

fn sanitize_torrent_path(input: &str) -> Result<PathBuf, String> {
    if input.contains("://") {
        return Err("Remote torrent URLs are not accepted. Use a local .torrent file path or a magnet URI.".to_string());
    }

    let raw = PathBuf::from(input);
    let resolved = if raw.is_absolute() {
        raw
    } else {
        std::env::current_dir()
            .map_err(|e| format!("Failed to resolve working directory: {}", e))?
            .join(raw)
    };

    let canonical = resolved
        .canonicalize()
        .map_err(|e| format!("Failed to resolve torrent file {}: {}", resolved.display(), e))?;

    if !canonical.is_file() {
        return Err(format!("Torrent file does not exist: {}", canonical.display()));
    }

    if canonical.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("torrent")) != Some(true) {
        return Err("Only local .torrent files are accepted.".to_string());
    }

    Ok(canonical)
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

#[tauri::command]
pub async fn torrent_get_status(state: State<'_, TorrentState>) -> Result<TorrentClientStatus, String> {
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
pub async fn torrent_add(state: State<'_, TorrentState>, source: String) -> Result<TorrentSnapshot, String> {
    let mut guard = state.inner.lock().await;
    guard.add_source(&source).await
}

#[tauri::command]
pub async fn torrent_pause(state: State<'_, TorrentState>, id: String) -> Result<TorrentSnapshot, String> {
    let guard = state.inner.lock().await;
    guard.pause(&id).await
}

#[tauri::command]
pub async fn torrent_resume(state: State<'_, TorrentState>, id: String) -> Result<TorrentSnapshot, String> {
    let guard = state.inner.lock().await;
    guard.resume(&id).await
}

#[tauri::command]
pub async fn torrent_get_download_root(state: State<'_, TorrentState>) -> Result<String, String> {
    let guard = state.inner.lock().await;
    Ok(guard.download_root())
}
