use std::path::PathBuf;

// ── Data Types ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ApiRequest {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct ApiResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<(String, String)>,
    pub body: String,
    pub duration_ms: u64,
}

// ── Persistence ────────────────────────────────────────────────────────────

fn collections_dir() -> PathBuf {
    crate::user_config_dir().join("data/api_collections")
}

fn collection_path(name: &str) -> PathBuf {
    collections_dir().join(format!(
        "{}.json",
        name.replace(|c: char| !c.is_alphanumeric() || c.is_whitespace(), "_")
    ))
}

// ── Commands ───────────────────────────────────────────────────────────────

pub async fn api_request(
    method: String,
    url: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
    timeout_secs: u32,
) -> Result<ApiResponse, String> {
    let start = std::time::Instant::now();

    if url.starts_with("file://") {
        return Err("file:// URLs are not allowed".to_string());
    }

    let clamped_timeout = timeout_secs.max(5).min(120);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(clamped_timeout as u64))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request_builder = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "PATCH" => client.patch(&url),
        "DELETE" => client.delete(&url),
        "HEAD" => client.head(&url),
        _ => client.get(&url),
    };

    for (key, value) in headers {
        request_builder = request_builder.header(&key, &value);
    }

    if let Some(b) = body {
        request_builder = request_builder.body(b);
    }

    let response = request_builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    let mut resp_headers = Vec::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.push((key.to_string(), v.to_string()));
        }
    }
    let body_text = response.text().await.map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("Unknown").to_string(),
        headers: resp_headers,
        body: body_text,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub fn api_save_collection(name: String, requests: String) -> Result<(), String> {
    let dir = collections_dir();
    let _ = std::fs::create_dir_all(&dir);
    let path = collection_path(&name);
    std::fs::write(&path, requests).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn api_load_collection(name: String) -> Result<String, String> {
    let path = collection_path(&name);
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

pub fn api_list_collections() -> Result<Vec<String>, String> {
    let dir = collections_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut names = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension() == Some(std::ffi::OsStr::new("json")) {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                names.push(stem.to_string());
            }
        }
    }
    Ok(names)
}

pub fn api_delete_collection(name: String) -> Result<(), String> {
    let path = collection_path(&name);
    std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn api_generate_request(
    description: String,
    state: std::sync::Arc<std::sync::Mutex<crate::AppState>>,
) -> Result<ApiRequest, String> {
    let provider = {
        let app_state = state.lock().unwrap_or_else(|e| e.into_inner());
        app_state.provider.clone()
    };

    let prompt = format!(
        "Generate an HTTP API request from this description. Return ONLY a JSON object with fields: method (GET/POST/PUT/PATCH/DELETE), url, headers (array of [key, value] pairs), body (string or null). Description: {}",
        description
    );

    let response = provider
        .chat_with_image(&prompt, "", None, None)
        .await
        .map_err(|e| e.to_string())?;

    let json_str = response.trim();
    let json_str = if json_str.starts_with("```") {
        json_str
            .lines()
            .skip(1)
            .take_while(|l| !l.starts_with("```"))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        json_str.to_string()
    };

    let parsed: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON from LLM: {}", e))?;

    let method = parsed
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_string();
    let url = parsed
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let headers: Vec<(String, String)> = parsed
        .get("headers")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    if let Some(pair) = item.as_array() {
                        if pair.len() >= 2 {
                            return Some((
                                pair[0].as_str()?.to_string(),
                                pair[1].as_str()?.to_string(),
                            ));
                        }
                    }
                    None
                })
                .collect()
        })
        .unwrap_or_default();
    let body = parsed
        .get("body")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(ApiRequest {
        id: format!("req-{}", rand::random::<u32>()),
        name: "Generated Request".to_string(),
        method,
        url,
        headers,
        body,
    })
}

pub fn api_curl_import(curl: String) -> Result<ApiRequest, String> {
    let mut method = "GET".to_string();
    let mut url = String::new();
    let mut headers = Vec::new();
    let mut body = None;

    if let Some(m) = regex_find(r"-X\s+(\w+)", &curl) {
        method = m;
    } else if curl.contains(" -d ") || curl.contains(" --data ") {
        method = "POST".to_string();
    }

    if let Some(u) = regex_find(r#"['\"]?((https?|ftp)://[^\s'\"]+)['\"]?"#, &curl) {
        url = u;
    }

    for cap in regex_captures_all(r#"-H\s+['\"]([^:]+):\s*([^'\"]+)['\"]"#, &curl) {
        if cap.len() >= 3 {
            headers.push((cap[1].to_string(), cap[2].to_string()));
        }
    }

    if let Some(b) = regex_find(r#"-d\s+['\"]([^'\"]+)['\"]"#, &curl) {
        body = Some(b);
    } else if let Some(b) = regex_find(r#"--data\s+['\"]([^'\"]+)['\"]"#, &curl) {
        body = Some(b);
    }

    if url.is_empty() {
        return Err("Could not parse URL from curl command".to_string());
    }

    Ok(ApiRequest {
        id: format!("req-{}", rand::random::<u32>()),
        name: "Imported curl".to_string(),
        method,
        url,
        headers,
        body,
    })
}

pub fn api_export_curl(request: String) -> Result<String, String> {
    let req: ApiRequest = serde_json::from_str(&request).map_err(|e| e.to_string())?;
    let mut parts = vec![format!(
        "curl -X {} '{}'",
        req.method.to_uppercase(),
        req.url
    )];
    for (k, v) in req.headers {
        parts.push(format!("-H '{}: {}'", k, v));
    }
    if let Some(b) = req.body {
        parts.push(format!("-d '{}'", b.replace('\'', "'\\''")));
    }
    Ok(parts.join(" "))
}

// ── Regex Helpers ──────────────────────────────────────────────────────────

fn regex_find(pattern: &str, text: &str) -> Option<String> {
    let re = regex::Regex::new(pattern).ok()?;
    re.captures(text)?.get(1).map(|m| m.as_str().to_string())
}

fn regex_captures_all(pattern: &str, text: &str) -> Vec<Vec<String>> {
    let re = match regex::Regex::new(pattern) {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    re.captures_iter(text)
        .map(|cap| {
            cap.iter()
                .filter_map(|m| m.map(|m| m.as_str().to_string()))
                .collect()
        })
        .collect()
}
