use crate::{config, storage, AppState};
use crate::memory::MemoryRecord;
use base64::Engine;
use chrono::{DateTime, Utc};
use ring::{aead, digest, rand};
use ring::rand::SecureRandom;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, State};

const SYNC_DIR: &str = "./data/sync";
const STATUS_FILE: &str = "./data/sync/status.json";
const SESSION_DIR: &str = "./sessions";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRecord {
    pub id: String,
    #[serde(rename = "type")]
    pub record_type: String,
    pub payload_encrypted: String,
    pub device_id: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncStatus {
    pub enabled: bool,
    pub sync_memory: bool,
    pub sync_sessions: bool,
    pub api_base_url: String,
    pub device_id: String,
    pub last_sync_at: Option<String>,
    pub last_error: Option<String>,
    pub pending_records: usize,
    pub pushed_records: usize,
    pub pulled_records: usize,
    pub conflict_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigureSyncRequest {
    pub enabled: bool,
    pub sync_memory: bool,
    pub sync_sessions: bool,
    pub api_base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PushRequest {
    device_id: String,
    records: Vec<SyncRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PushResponse {
    accepted: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PullResponse {
    records: Vec<SyncRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionPayload {
    id: String,
    created_at: DateTime<Utc>,
    messages: Vec<String>,
}

#[tauri::command]
pub fn get_sync_status(state: State<'_, Mutex<AppState>>) -> Result<SyncStatus, String> {
    let app = state.lock().unwrap_or_else(|e| e.into_inner());
    let mut status = load_status();
    status.enabled = app.config.sync.enabled;
    status.sync_memory = app.config.sync.sync_memory;
    status.sync_sessions = app.config.sync.sync_sessions;
    status.api_base_url = app.config.sync.api_base_url.clone();
    status.device_id = app.config.sync.device_id.clone();
    status.last_sync_at = app.config.sync.last_sync_at.clone().or(status.last_sync_at);
    status.pending_records = count_pending_records(&app)?;
    Ok(status)
}

#[tauri::command]
pub fn configure_sync(
    request: ConfigureSyncRequest,
    state: State<'_, Mutex<AppState>>,
) -> Result<SyncStatus, String> {
    if request.enabled && request.api_base_url.trim().is_empty() {
        return Err("Sync API URL is required before enabling cloud sync".to_string());
    }

    let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
    app.config.sync.enabled = request.enabled;
    app.config.sync.sync_memory = request.sync_memory;
    app.config.sync.sync_sessions = request.sync_sessions;
    app.config.sync.api_base_url = request.api_base_url.trim().trim_end_matches('/').to_string();
    if app.config.sync.device_id.is_empty() {
        app.config.sync.device_id = uuid::Uuid::new_v4().to_string();
    }

    let path = crate::get_config_path();
    config::save_config(&path, &app.config)?;
    drop(app);

    get_sync_status(state)
}

#[tauri::command]
pub async fn start_sync(
    app_handle: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<SyncStatus, String> {
    sync_now(app_handle, state).await
}

#[tauri::command]
pub async fn sync_now(
    app_handle: tauri::AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<SyncStatus, String> {
    let (config, mem_db) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        (app.config.clone(), app.mem_db.clone())
    };

    if !config.sync.enabled {
        return Err("Cloud sync is disabled. Enable it in Settings first.".to_string());
    }
    if config.sync.api_base_url.trim().is_empty() {
        return Err("Sync API URL is not configured.".to_string());
    }

    let token = neurodeck_infrastructure::secrets::get_gemini_api_key()
        .or_else(|_| std::env::var("GEMINI_API_KEY").map_err(|e| e.to_string()))
        .map_err(|_| "Google OAuth/API token not found. Sign in before syncing.".to_string())?;

    let _ = app_handle.emit("sync_progress", "collecting");
    let records = collect_local_records(&config.sync, mem_db.as_ref(), &token)?;
    let client = reqwest::Client::new();
    let base_url = config.sync.api_base_url.trim_end_matches('/');
    let since = config.sync.last_sync_at.clone().unwrap_or_default();

    let _ = app_handle.emit("sync_progress", "pushing");
    let push_resp = client
        .post(format!("{}/sync/push", base_url))
        .bearer_auth(&token)
        .json(&PushRequest {
            device_id: config.sync.device_id.clone(),
            records: records.clone(),
        })
        .send()
        .await
        .map_err(|e| persist_error(format!("Sync push failed: {}", e)))?;

    if !push_resp.status().is_success() {
        return Err(persist_error(format!("Sync push failed with HTTP {}", push_resp.status())));
    }

    let pushed_records = push_resp
        .json::<PushResponse>()
        .await
        .ok()
        .and_then(|r| r.accepted)
        .unwrap_or(records.len());

    let _ = app_handle.emit("sync_progress", "pulling");
    let pull_resp = client
        .get(format!("{}/sync/pull", base_url))
        .bearer_auth(&token)
        .query(&[("since", since.as_str())])
        .send()
        .await
        .map_err(|e| persist_error(format!("Sync pull failed: {}", e)))?;

    if !pull_resp.status().is_success() {
        return Err(persist_error(format!("Sync pull failed with HTTP {}", pull_resp.status())));
    }

    let remote = pull_resp
        .json::<PullResponse>()
        .await
        .map_err(|e| persist_error(format!("Invalid sync pull response: {}", e)))?;

    let _ = app_handle.emit("sync_progress", "merging");
    let merge = merge_remote_records(remote.records, &config.sync.device_id, mem_db.as_ref(), &token)?;
    let synced_at = Utc::now().to_rfc3339();

    {
        let mut app = state.lock().unwrap_or_else(|e| e.into_inner());
        app.config.sync.last_sync_at = Some(synced_at.clone());
        let path = crate::get_config_path();
        config::save_config(&path, &app.config)?;
    }

    let status = SyncStatus {
        enabled: config.sync.enabled,
        sync_memory: config.sync.sync_memory,
        sync_sessions: config.sync.sync_sessions,
        api_base_url: config.sync.api_base_url.clone(),
        device_id: config.sync.device_id.clone(),
        last_sync_at: Some(synced_at),
        last_error: None,
        pending_records: 0,
        pushed_records,
        pulled_records: merge.applied,
        conflict_count: merge.conflicts,
    };
    save_status(&status)?;
    let _ = app_handle.emit("sync_progress", "done");
    Ok(status)
}

fn collect_local_records(
    config: &config::SyncConfig,
    mem_db: Option<&crate::memory::MemoryDB>,
    token: &str,
) -> Result<Vec<SyncRecord>, String> {
    let mut records = Vec::new();
    let now = Utc::now().to_rfc3339();

    if config.sync_memory {
        if let Some(db) = mem_db {
            for memory in db.list_all()? {
                let payload = serde_json::to_vec(&memory)
                    .map_err(|e| format!("Failed to serialize memory record: {}", e))?;
                records.push(SyncRecord {
                    id: memory.id.clone(),
                    record_type: "memory".to_string(),
                    payload_encrypted: encrypt_payload(token, &payload)?,
                    device_id: config.device_id.clone(),
                    timestamp: memory.metadata.get("sync_updated_at").cloned().unwrap_or_else(|| now.clone()),
                });
            }
        }
    }

    if config.sync_sessions {
        for session in list_session_payloads()? {
            let payload = serde_json::to_vec(&session)
                .map_err(|e| format!("Failed to serialize session: {}", e))?;
            records.push(SyncRecord {
                id: session.id.clone(),
                record_type: "session".to_string(),
                payload_encrypted: encrypt_payload(token, &payload)?,
                device_id: config.device_id.clone(),
                timestamp: session.created_at.to_rfc3339(),
            });
        }
    }

    Ok(records)
}

struct MergeResult {
    applied: usize,
    conflicts: usize,
}

fn merge_remote_records(
    records: Vec<SyncRecord>,
    local_device_id: &str,
    mem_db: Option<&crate::memory::MemoryDB>,
    token: &str,
) -> Result<MergeResult, String> {
    let mut applied = 0;
    let mut conflicts = 0;

    for record in records {
        if record.device_id == local_device_id {
            continue;
        }

        let decrypted = decrypt_payload(token, &record.payload_encrypted)?;
        match record.record_type.as_str() {
            "memory" => {
                if let Some(db) = mem_db {
                    let mut incoming: MemoryRecord = serde_json::from_slice(&decrypted)
                        .map_err(|e| format!("Failed to parse synced memory record: {}", e))?;
                    if let Some(existing) = db.list_all()?.into_iter().find(|r| r.id == incoming.id) {
                        if existing.content != incoming.content {
                            incoming.metadata.insert("sync_conflict".to_string(), "true".to_string());
                            conflicts += 1;
                        }
                    }
                    incoming.metadata.insert("sync_updated_at".to_string(), record.timestamp.clone());
                    db.store_message(incoming.id, incoming.content, incoming.embedding, incoming.metadata)?;
                    applied += 1;
                }
            }
            "session" => {
                let session: SessionPayload = serde_json::from_slice(&decrypted)
                    .map_err(|e| format!("Failed to parse synced session: {}", e))?;
                save_remote_session(session, &record.timestamp)?;
                applied += 1;
            }
            _ => {}
        }
    }

    Ok(MergeResult { applied, conflicts })
}

fn encrypt_payload(token: &str, plaintext: &[u8]) -> Result<String, String> {
    let key = derive_key(token)?;
    let sealing_key = aead::UnboundKey::new(&aead::AES_256_GCM, &key)
        .map_err(|_| "Failed to create sync encryption key".to_string())?;
    let sealing_key = aead::LessSafeKey::new(sealing_key);
    let rng = rand::SystemRandom::new();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes)
        .map_err(|_| "Failed to generate sync nonce".to_string())?;
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);
    let mut buffer = plaintext.to_vec();
    sealing_key
        .seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut buffer)
        .map_err(|_| "Failed to encrypt sync payload".to_string())?;

    let mut output = nonce_bytes.to_vec();
    output.extend(buffer);
    Ok(base64::engine::general_purpose::STANDARD.encode(output))
}

fn decrypt_payload(token: &str, encoded: &str) -> Result<Vec<u8>, String> {
    let key = derive_key(token)?;
    let opening_key = aead::UnboundKey::new(&aead::AES_256_GCM, &key)
        .map_err(|_| "Failed to create sync decryption key".to_string())?;
    let opening_key = aead::LessSafeKey::new(opening_key);
    let mut data = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Invalid sync payload encoding: {}", e))?;
    if data.len() <= 12 {
        return Err("Encrypted sync payload is too short".to_string());
    }

    let mut nonce_bytes = [0u8; 12];
    nonce_bytes.copy_from_slice(&data[..12]);
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);
    let mut ciphertext = data.split_off(12);
    let plaintext = opening_key
        .open_in_place(nonce, aead::Aad::empty(), &mut ciphertext)
        .map_err(|_| "Failed to decrypt sync payload".to_string())?;
    Ok(plaintext.to_vec())
}

fn derive_key(token: &str) -> Result<[u8; 32], String> {
    if token.trim().is_empty() {
        return Err("OAuth/API token is empty; cannot derive sync key".to_string());
    }
    let mut material = Vec::with_capacity(token.len() + 20);
    material.extend_from_slice(b"neurodeck-sync-v1:");
    material.extend_from_slice(token.as_bytes());
    let digest = digest::digest(&digest::SHA256, &material);
    let mut key = [0u8; 32];
    key.copy_from_slice(digest.as_ref());
    Ok(key)
}

fn list_session_payloads() -> Result<Vec<SessionPayload>, String> {
    let mut sessions = Vec::new();
    let dir = Path::new(SESSION_DIR);
    if !dir.exists() {
        return Ok(sessions);
    }

    for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read sessions dir: {}", e))? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let session = storage::load_session(&path)?;
        sessions.push(SessionPayload {
            id: session.id,
            created_at: session.created_at,
            messages: session.messages,
        });
    }
    Ok(sessions)
}

fn save_remote_session(session: SessionPayload, timestamp: &str) -> Result<(), String> {
    if session.id.is_empty() || session.id.contains('/') || session.id.contains('\\') || session.id.contains("..") {
        return Err(format!("Invalid synced session ID: {}", session.id));
    }

    let path = PathBuf::from(SESSION_DIR).join(format!("{}.json", session.id));
    if path.exists() {
        let local_modified = fs::metadata(&path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| DateTime::<Utc>::from(t).to_rfc3339().parse::<String>().ok())
            .unwrap_or_default();
        if !local_modified.is_empty() && local_modified.as_str() > timestamp {
            return Ok(());
        }
    }

    let stored = storage::Session {
        id: session.id,
        created_at: session.created_at,
        messages: session.messages,
    };
    storage::save_session(SESSION_DIR, &stored)
}

fn count_pending_records(app: &AppState) -> Result<usize, String> {
    let mut count = 0;
    if app.config.sync.sync_memory {
        if let Some(db) = &app.mem_db {
            count += db.list_all()?.len();
        }
    }
    if app.config.sync.sync_sessions {
        count += list_session_payloads()?.len();
    }
    Ok(count)
}

fn load_status() -> SyncStatus {
    fs::read_to_string(STATUS_FILE)
        .ok()
        .and_then(|raw| serde_json::from_str::<SyncStatus>(&raw).ok())
        .unwrap_or_default()
}

fn save_status(status: &SyncStatus) -> Result<(), String> {
    fs::create_dir_all(SYNC_DIR).map_err(|e| format!("Failed to create sync dir: {}", e))?;
    let raw = serde_json::to_string_pretty(status)
        .map_err(|e| format!("Failed to serialize sync status: {}", e))?;
    fs::write(STATUS_FILE, raw).map_err(|e| format!("Failed to write sync status: {}", e))
}

fn persist_error(message: String) -> String {
    let mut status = load_status();
    status.last_error = Some(message.clone());
    let _ = save_status(&status);
    message
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_round_trip() {
        let token = "test-oauth-token";
        let plaintext = br#"{"kind":"memory","content":"sync me"}"#;

        let encrypted = encrypt_payload(token, plaintext).unwrap();
        assert_ne!(encrypted.as_bytes(), plaintext);

        let decrypted = decrypt_payload(token, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn decrypt_rejects_wrong_token() {
        let encrypted = encrypt_payload("token-a", b"secret").unwrap();
        assert!(decrypt_payload("token-b", &encrypted).is_err());
    }
}
