use serde::{Deserialize, Serialize};

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
