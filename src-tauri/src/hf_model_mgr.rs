use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

// =============================================================================
// Data structures
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GgufFileInfo {
    pub filename: String,
    pub size_bytes: u64,
    pub quantization: String,
    pub parameters: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HfModelInfo {
    pub repo_id: String,
    pub name: String,
    pub author: String,
    pub description: String,
    pub tags: Vec<String>,
    pub downloads: i64,
    pub likes: i64,
    pub last_modified: String,
    pub gguf_files: Vec<GgufFileInfo>,
    pub steam_deck_compat: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadTask {
    pub id: String,
    pub repo_id: String,
    pub filename: String,
    pub status: DownloadStatus,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledModel {
    pub repo_id: String,
    pub filename: String,
    pub size_bytes: u64,
    pub path: String,
    pub quantization: String,
}

// =============================================================================
// Curated Steam Deck model list
// =============================================================================

pub fn get_curated_steam_deck_models() -> Vec<HfModelInfo> {
    crate::model_registry::load_supported_models()
        .into_iter()
        .filter(|p| {
            p.steam_deck_policy.allowed_local
                && !matches!(p.compatibility_tier.as_str(), "unsupported" | "unknown")
        })
        .map(|profile| {
            let steam_deck_compat = crate::model_registry::steam_deck_ok(&profile);
            let description = profile
                .steam_deck_policy
                .notes
                .first()
                .cloned()
                .unwrap_or_else(|| "Curated Steam Deck model".to_string());
            HfModelInfo {
                repo_id: format!("registry/{}", profile.id),
                name: profile.display_name,
                author: "unknown".to_string(),
                description,
                tags: profile.capabilities,
                downloads: 0,
                likes: 0,
                last_modified: "unknown".to_string(),
                gguf_files: Vec::new(),
                steam_deck_compat,
            }
        })
        .collect()
}

// =============================================================================
// HF Hub API search
// =============================================================================

#[derive(Debug, Deserialize)]
struct HfApiModelItem {
    id: String,
    #[serde(default)]
    author: Option<String>,
    #[serde(default)]
    downloads: i64,
    #[serde(default)]
    likes: i64,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    last_modified: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HfApiFileItem {
    path: String,
    #[serde(default)]
    size: Option<u64>,
    #[serde(rename = "type")]
    item_type: String,
}

pub async fn hf_search_models(query: String, limit: u32) -> Result<Vec<HfModelInfo>, String> {
    let client = reqwest::Client::new();
    let encoded_query = query.replace(' ', "%20");
    let url = format!(
        "https://huggingface.co/api/models?search={}&filter=gguf&sort=downloads&direction=-1&limit={}",
        encoded_query,
        limit.min(50)
    );

    let resp = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("HF search request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HF search returned status: {}", resp.status()));
    }

    let items: Vec<HfApiModelItem> = resp
        .json()
        .await
        .map_err(|e| format!("HF search JSON parse failed: {}", e))?;

    let mut results = Vec::new();
    for item in items.into_iter().take(limit as usize) {
        let info = match hf_get_model_info(item.id.clone()).await {
            Ok(i) => i,
            Err(_) => HfModelInfo {
                repo_id: item.id.clone(),
                name: item
                    .id
                    .split('/')
                    .next_back()
                    .unwrap_or(&item.id)
                    .to_string(),
                author: item.author.unwrap_or_default(),
                description: String::new(),
                tags: item.tags,
                downloads: item.downloads,
                likes: item.likes,
                last_modified: item.last_modified.unwrap_or_default(),
                gguf_files: Vec::new(),
                steam_deck_compat: false,
            },
        };
        results.push(info);
    }

    Ok(results)
}

pub async fn hf_get_model_info(repo_id: String) -> Result<HfModelInfo, String> {
    let client = reqwest::Client::new();

    // Fetch model card info
    let info_url = format!("https://huggingface.co/api/models/{}", repo_id);
    let info_resp = client
        .get(&info_url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("HF model info request failed: {}", e))?;

    if !info_resp.status().is_success() {
        return Err(format!(
            "HF model info returned status: {}",
            info_resp.status()
        ));
    }

    let info: HfApiModelItem = info_resp
        .json()
        .await
        .map_err(|e| format!("HF model info JSON parse failed: {}", e))?;

    // Fetch file list to find GGUF files
    let files_url = format!("https://huggingface.co/api/models/{}/tree/main", repo_id);
    let files_resp = client
        .get(&files_url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("HF file list request failed: {}", e))?;

    let gguf_files = if files_resp.status().is_success() {
        let files: Vec<HfApiFileItem> = files_resp
            .json()
            .await
            .map_err(|e| format!("HF file list JSON parse failed: {}", e))?;
        parse_gguf_files(&files)
    } else {
        Vec::new()
    };

    let steam_deck_compat = is_steam_deck_compatible(&gguf_files);

    Ok(HfModelInfo {
        repo_id: info.id.clone(),
        name: info
            .id
            .split('/')
            .next_back()
            .unwrap_or(&info.id)
            .to_string(),
        author: info.author.unwrap_or_default(),
        description: String::new(),
        tags: info.tags,
        downloads: info.downloads,
        likes: info.likes,
        last_modified: info.last_modified.unwrap_or_default(),
        gguf_files,
        steam_deck_compat,
    })
}

fn parse_gguf_files(files: &[HfApiFileItem]) -> Vec<GgufFileInfo> {
    let mut result = Vec::new();
    for file in files {
        if file.item_type != "file" || !file.path.ends_with(".gguf") {
            continue;
        }
        let filename = file.path.clone();
        let size_bytes = file.size.unwrap_or(0);
        let quantization = extract_quantization(&filename);
        let parameters = extract_parameters(&filename);
        result.push(GgufFileInfo {
            filename,
            size_bytes,
            quantization,
            parameters,
        });
    }
    result
}

fn extract_quantization(filename: &str) -> String {
    let parts: Vec<&str> = filename.split('-').collect();
    for part in parts {
        let p = part.trim_end_matches(".gguf");
        if p.starts_with("Q2_")
            || p.starts_with("Q3_")
            || p.starts_with("Q4_")
            || p.starts_with("Q5_")
            || p.starts_with("Q6_")
            || p.starts_with("Q8_")
            || p.starts_with("F16")
        {
            return p.to_string();
        }
    }
    "Unknown".to_string()
}

fn extract_parameters(filename: &str) -> String {
    let lower = filename.to_lowercase();
    if lower.contains("0.5b") {
        return "0.5B".to_string();
    }
    if lower.contains("1.1b") {
        return "1.1B".to_string();
    }
    if lower.contains("1.5b") {
        return "1.5B".to_string();
    }
    if lower.contains("1.7b") {
        return "1.7B".to_string();
    }
    if lower.contains("1b") {
        return "1B".to_string();
    }
    if lower.contains("2b") {
        return "2B".to_string();
    }
    if lower.contains("3b") {
        return "3B".to_string();
    }
    if lower.contains("3.8b") {
        return "3.8B".to_string();
    }
    if lower.contains("4b") {
        return "4B".to_string();
    }
    if lower.contains("7b") {
        return "7B".to_string();
    }
    if lower.contains("8b") {
        return "8B".to_string();
    }
    if lower.contains("13b") {
        return "13B".to_string();
    }
    "Unknown".to_string()
}

fn is_steam_deck_compatible(files: &[GgufFileInfo]) -> bool {
    if files.is_empty() {
        return false;
    }
    let has_small_file = files.iter().any(|f| {
        let good_quant = matches!(
            f.quantization.as_str(),
            "Q2_K"
                | "Q3_K_S"
                | "Q3_K_M"
                | "Q3_K_L"
                | "Q4_K_M"
                | "Q4_K_S"
                | "Q5_K_M"
                | "Q5_K_S"
                | "Q6_K"
                | "Q8_0"
        );
        let good_size = f.size_bytes > 0 && f.size_bytes < 6_000_000_000; // < 6GB
        good_quant && good_size
    });
    let small_params = files.iter().any(|f| {
        matches!(
            f.parameters.as_str(),
            "0.5B" | "1B" | "1.1B" | "1.5B" | "1.7B" | "2B" | "3B" | "3.8B" | "4B" | "7B"
        )
    });
    has_small_file && small_params
}

// =============================================================================
// Download manager
// =============================================================================

lazy_static::lazy_static! {
    static ref DOWNLOADS: Mutex<HashMap<String, DownloadTask>> = Mutex::new(HashMap::new());
    static ref CANCEL_TOKENS: Mutex<HashMap<String, tokio_util::sync::CancellationToken>> = Mutex::new(HashMap::new());
}

fn models_dir() -> PathBuf {
    crate::user_config_dir().join("models")
}

pub async fn hf_list_installed_models() -> Result<Vec<InstalledModel>, String> {
    let dir = models_dir();
    let mut result = Vec::new();

    let mut entries = fs::read_dir(&dir)
        .await
        .map_err(|e| format!("Failed to read models dir: {}", e))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Read dir error: {}", e))?
    {
        let repo_path = entry.path();
        if !repo_path.is_dir() {
            continue;
        }
        let repo_id = entry.file_name().to_string_lossy().to_string();

        let mut file_entries = fs::read_dir(&repo_path)
            .await
            .map_err(|e| format!("Failed to read repo dir: {}", e))?;

        while let Some(file_entry) = file_entries
            .next_entry()
            .await
            .map_err(|e| format!("Read file error: {}", e))?
        {
            let path = file_entry.path();
            let filename = file_entry.file_name().to_string_lossy().to_string();
            if !filename.ends_with(".gguf") {
                continue;
            }
            let meta = fs::metadata(&path)
                .await
                .map_err(|e| format!("Metadata error: {}", e))?;
            let size_bytes = meta.len();
            let quantization = extract_quantization(&filename);

            result.push(InstalledModel {
                repo_id: repo_id.clone(),
                filename: filename.clone(),
                size_bytes,
                path: path.to_string_lossy().to_string(),
                quantization,
            });
        }
    }

    Ok(result)
}

pub async fn hf_delete_model(repo_id: String, filename: String) -> Result<(), String> {
    let path = models_dir().join(&repo_id).join(&filename);
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete model: {}", e))?;
    }
    // Clean up empty repo dir
    let repo_dir = models_dir().join(repo_id);
    if let Ok(mut entries) = fs::read_dir(&repo_dir).await {
        if entries.next_entry().await.ok().flatten().is_none() {
            let _ = fs::remove_dir(&repo_dir).await;
        }
    }
    Ok(())
}

pub async fn hf_download_model(
    repo_id: String,
    filename: String,
    app_handle: crate::bridge::WsBroadcaster,
) -> Result<String, String> {
    let download_id = format!(
        "{}_{}_{}",
        repo_id.replace('/', "_"),
        filename.replace(".gguf", ""),
        uuid::Uuid::new_v4()
            .to_string()
            .split('-')
            .next()
            .unwrap_or("")
    );

    let task = DownloadTask {
        id: download_id.clone(),
        repo_id: repo_id.clone(),
        filename: filename.clone(),
        status: DownloadStatus::Pending,
        bytes_downloaded: 0,
        total_bytes: 0,
        speed_bps: 0.0,
        error: None,
    };

    {
        let mut downloads = DOWNLOADS.lock().await;
        downloads.insert(download_id.clone(), task);
    }

    let cancel_token = tokio_util::sync::CancellationToken::new();
    {
        let mut tokens = CANCEL_TOKENS.lock().await;
        tokens.insert(download_id.clone(), cancel_token.clone());
    }

    let download_id_spawn = download_id.clone();
    tokio::spawn(async move {
        if let Err(e) = download_file(
            &repo_id,
            &filename,
            &download_id_spawn,
            app_handle,
            cancel_token,
        )
        .await
        {
            let mut downloads = DOWNLOADS.lock().await;
            if let Some(task) = downloads.get_mut(&download_id_spawn) {
                task.status = DownloadStatus::Failed;
                task.error = Some(e);
            }
        }
        let mut tokens = CANCEL_TOKENS.lock().await;
        tokens.remove(&download_id_spawn);
    });

    Ok(download_id)
}

pub async fn hf_cancel_download(download_id: String) -> Result<(), String> {
    let tokens = CANCEL_TOKENS.lock().await;
    if let Some(token) = tokens.get(&download_id) {
        token.cancel();
    }
    let mut downloads = DOWNLOADS.lock().await;
    if let Some(task) = downloads.get_mut(&download_id) {
        task.status = DownloadStatus::Cancelled;
    }
    Ok(())
}

pub async fn hf_list_downloads() -> Vec<DownloadTask> {
    let downloads = DOWNLOADS.lock().await;
    downloads.values().cloned().collect()
}

pub async fn hf_get_steam_deck_models() -> Vec<HfModelInfo> {
    get_curated_steam_deck_models()
}

async fn download_file(
    repo_id: &str,
    filename: &str,
    download_id: &str,
    app_handle: crate::bridge::WsBroadcaster,
    cancel_token: tokio_util::sync::CancellationToken,
) -> Result<(), String> {
    // Update status to Downloading
    {
        let mut downloads = DOWNLOADS.lock().await;
        if let Some(task) = downloads.get_mut(download_id) {
            task.status = DownloadStatus::Downloading;
        }
    }

    let url = format!(
        "https://huggingface.co/{}/resolve/main/{}",
        repo_id, filename
    );
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download returned status: {}", response.status()));
    }

    let total_bytes = response.content_length().unwrap_or(0);
    {
        let mut downloads = DOWNLOADS.lock().await;
        if let Some(task) = downloads.get_mut(download_id) {
            task.total_bytes = total_bytes;
        }
    }

    let out_dir = models_dir().join(repo_id);
    fs::create_dir_all(&out_dir)
        .await
        .map_err(|e| format!("Failed to create model dir: {}", e))?;

    let out_path = out_dir.join(filename);
    let mut file = fs::File::create(&out_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut bytes_downloaded: u64 = 0;
    let start_time = Instant::now();
    let mut last_emit = Instant::now();

    while let Some(chunk_result) = stream.next().await {
        if cancel_token.is_cancelled() {
            let _ = fs::remove_file(&out_path).await;
            return Err("Download cancelled".to_string());
        }

        let chunk = chunk_result.map_err(|e| format!("Download stream error: {}", e))?;
        let chunk_len = chunk.len() as u64;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;
        bytes_downloaded += chunk_len;

        let elapsed = start_time.elapsed().as_secs_f64().max(0.001);
        let speed_bps = bytes_downloaded as f64 / elapsed;

        {
            let mut downloads = DOWNLOADS.lock().await;
            if let Some(task) = downloads.get_mut(download_id) {
                task.bytes_downloaded = bytes_downloaded;
                task.speed_bps = speed_bps;
            }
        }

        if last_emit.elapsed() >= Duration::from_millis(250) {
            last_emit = Instant::now();
            let _ = app_handle.emit(
                "hf_download_progress",
                serde_json::json!({
                    "id": download_id,
                    "repo_id": repo_id,
                    "filename": filename,
                    "bytes_downloaded": bytes_downloaded,
                    "total_bytes": total_bytes,
                    "speed_bps": speed_bps,
                }),
            );
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("File flush error: {}", e))?;

    // Mark completed
    {
        let mut downloads = DOWNLOADS.lock().await;
        if let Some(task) = downloads.get_mut(download_id) {
            task.status = DownloadStatus::Completed;
            task.bytes_downloaded = total_bytes;
            task.speed_bps = 0.0;
        }
    }

    let _ = app_handle.emit(
        "hf_download_progress",
        serde_json::json!({
            "id": download_id,
            "repo_id": repo_id,
            "filename": filename,
            "bytes_downloaded": total_bytes,
            "total_bytes": total_bytes,
            "speed_bps": 0,
            "completed": true,
        }),
    );

    Ok(())
}
