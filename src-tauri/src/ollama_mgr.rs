use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use crate::{AppHandle};

#[derive(Serialize, Deserialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Serialize, Clone)]
struct PullProgressPayload {
    model: String,
    status: String,
    completed: Option<u64>,
    total: Option<u64>,
}

#[derive(Deserialize)]
struct OllamaPullChunk {
    status: Option<String>,
    completed: Option<u64>,
    total: Option<u64>,
}

pub async fn ollama_list_models(base_url: String) -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/tags", base_url.trim_end_matches('/'));

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama tags API: {}", e))?;

    if !res.status().is_success() {
        return Err(format!(
            "Ollama tags API returned error status: {}",
            res.status()
        ));
    }

    let parsed = res
        .json::<OllamaTagsResponse>()
        .await
        .map_err(|e| format!("Failed to parse Ollama tags response: {}", e))?;

    Ok(parsed.models)
}

pub async fn ollama_pull_model(
    base_url: String,
    model: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/pull", base_url.trim_end_matches('/'));

    let request_body = serde_json::json!({
        "model": model,
        "stream": true
    });

    let res = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send pull request: {}", e))?;

    if !res.status().is_success() {
        return Err(format!(
            "Ollama pull returned error status: {}",
            res.status()
        ));
    }

    let mut byte_stream = res.bytes_stream();
    let mut buffer = String::new();
    let model_clone = model.clone();

    tokio::spawn(async move {
        while let Some(chunk_res) = byte_stream.next().await {
            match chunk_res {
                Ok(bytes) => {
                    let chunk_str = String::from_utf8_lossy(&bytes);
                    buffer.push_str(&chunk_str);

                    while let Some(line_idx) = buffer.find('\n') {
                        let line = buffer[..line_idx].trim().to_string();
                        buffer.drain(..=line_idx);

                        if !line.is_empty() {
                            if let Ok(pull_chunk) = serde_json::from_str::<OllamaPullChunk>(&line) {
                                let payload = PullProgressPayload {
                                    model: model_clone.clone(),
                                    status: pull_chunk
                                        .status
                                        .unwrap_or_else(|| "downloading".to_string()),
                                    completed: pull_chunk.completed,
                                    total: pull_chunk.total,
                                };
                                let _ = app_handle.emit("ollama_pull_progress", payload);
                            }
                        }
                    }
                }
                Err(e) => {
                    let payload = PullProgressPayload {
                        model: model_clone.clone(),
                        status: format!("Error: {}", e),
                        completed: None,
                        total: None,
                    };
                    let _ = app_handle.emit("ollama_pull_progress", payload);
                    break;
                }
            }
        }

        let final_payload = PullProgressPayload {
            model: model_clone,
            status: "success".to_string(),
            completed: None,
            total: None,
        };
        let _ = app_handle.emit("ollama_pull_progress", final_payload);
    });

    Ok(())
}

pub async fn ollama_delete_model(base_url: String, model: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/delete", base_url.trim_end_matches('/'));

    let request_body = serde_json::json!({
        "model": model
    });

    let res = client
        .delete(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send delete request: {}", e))?;

    if !res.status().is_success() {
        return Err(format!(
            "Ollama delete returned error status: {}",
            res.status()
        ));
    }

    Ok(())
}
