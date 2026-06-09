use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption;
use headless_chrome::{Browser, LaunchOptionsBuilder, Tab};
use serde_json::Value;

lazy_static::lazy_static! {
    static ref AUTOMATION_STATE: Mutex<BrowserAutomationState> = Mutex::new(BrowserAutomationState::default());
}

#[derive(Default)]
struct BrowserAutomationState {
    browser: Option<Browser>,
    sessions: HashMap<String, Arc<Tab>>,
}

fn parse_http_url(url: &str) -> Result<(), String> {
    let parsed = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err("Only http/https URLs are permitted".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("URLs with embedded credentials are not permitted".to_string());
    }
    if parsed.host_str().unwrap_or_default().is_empty() {
        return Err("URL must include a host".to_string());
    }
    Ok(())
}

fn with_state<T>(
    f: impl FnOnce(&mut BrowserAutomationState) -> Result<T, String>,
) -> Result<T, String> {
    let mut state = AUTOMATION_STATE
        .lock()
        .map_err(|_| "Browser automation state lock poisoned".to_string())?;
    f(&mut state)
}

fn ensure_browser(state: &mut BrowserAutomationState) -> Result<(), String> {
    if state.browser.is_none() {
        let options = LaunchOptionsBuilder::default()
            .headless(true)
            .build()
            .map_err(|e| e.to_string())?;
        let browser = Browser::new(options).map_err(|e| e.to_string())?;
        state.browser = Some(browser);
    }
    Ok(())
}

fn get_session_tab(state: &BrowserAutomationState, session_id: &str) -> Result<Arc<Tab>, String> {
    state
        .sessions
        .get(session_id)
        .cloned()
        .ok_or_else(|| format!("Browser session '{}' not found", session_id))
}

fn require_browser_exec(
    app_state: &Arc<Mutex<crate::AppState>>,
    action: &str,
) -> Result<(), String> {
    let app = app_state.lock().unwrap_or_else(|e| e.into_inner());
    let agent_id = app.config.llm.active_agent_id.clone();
    crate::permissions::require_capability(
        &app.config.security.permission_registry,
        &agent_id,
        crate::permissions::Capability::Browser,
    )
    .map_err(|e| format!("Permission denied for {}: {}", action, e))
}

pub fn browser_open_session(
    url: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<String, String> {
    require_browser_exec(&app_state, "browser-open-session")?;
    parse_http_url(&url)?;
    with_state(|state| {
        ensure_browser(state)?;
        let browser = state
            .browser
            .as_ref()
            .ok_or_else(|| "Headless browser not initialized".to_string())?;
        let tab = browser.new_tab().map_err(|e| e.to_string())?;
        tab.navigate_to(&url).map_err(|e| e.to_string())?;
        tab.wait_until_navigated().map_err(|e| e.to_string())?;

        let session_id = uuid::Uuid::new_v4().to_string();
        state.sessions.insert(session_id.clone(), tab);
        Ok(session_id)
    })
}

pub fn browser_navigate_session(
    session_id: String,
    url: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    require_browser_exec(&app_state, "browser-navigate-session")?;
    parse_http_url(&url)?;
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        tab.navigate_to(&url).map_err(|e| e.to_string())?;
        tab.wait_until_navigated().map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn browser_get_content(session_id: String) -> Result<String, String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        tab.get_content().map_err(|e| e.to_string())
    })
}

pub fn browser_click(
    session_id: String,
    selector: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    require_browser_exec(&app_state, "browser-click")?;
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let element = tab.wait_for_element(&selector).map_err(|e| e.to_string())?;
        element.click().map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn browser_fill(
    session_id: String,
    selector: String,
    value: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    require_browser_exec(&app_state, "browser-fill")?;
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let element = tab.wait_for_element(&selector).map_err(|e| e.to_string())?;
        element.click().map_err(|e| e.to_string())?;
        element.type_into(&value).map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn browser_screenshot(session_id: String) -> Result<String, String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let png = tab
            .capture_screenshot(CaptureScreenshotFormatOption::Png, None, None, true)
            .map_err(|e| e.to_string())?;
        Ok(STANDARD.encode(png))
    })
}

pub fn browser_evaluate_js(
    session_id: String,
    script: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<Value, String> {
    require_browser_exec(&app_state, "browser-eval")?;
    crate::security::validate_script_payload(&script, "javascript", "browser-eval", None)?;
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let eval_result = tab.evaluate(&script, false).map_err(|e| e.to_string())?;
        Ok(eval_result.value.unwrap_or(Value::Null))
    })
}

pub fn browser_close_session(
    session_id: String,
    app_state: Arc<Mutex<crate::AppState>>,
) -> Result<(), String> {
    require_browser_exec(&app_state, "browser-close-session")?;
    with_state(|state| {
        state.sessions.remove(&session_id);
        if state.sessions.is_empty() {
            state.browser = None;
        }
        Ok(())
    })
}

pub fn open_external(url: String) -> Result<(), String> {
    parse_http_url(&url)?;
    #[cfg(target_os = "windows")]
    {
        // Use explorer.exe instead of `cmd /c start` to avoid cmd shell metacharacter
        // injection: `&` in query strings is interpreted as a command separator by cmd.
        std::process::Command::new("explorer.exe")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn chunk_text(text: &str, chunk_words: usize, overlap_words: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return vec![];
    }
    let step = chunk_words.saturating_sub(overlap_words).max(1);
    let mut chunks = Vec::new();
    let mut start = 0usize;
    while start < words.len() {
        let end = (start + chunk_words).min(words.len());
        chunks.push(words[start..end].join(" "));
        if end == words.len() {
            break;
        }
        start += step;
    }
    chunks
}

pub async fn browser_get_citation(url: String) -> Result<String, String> {
    parse_http_url(&url)?;

    let url_clone = url.clone();
    let title = tokio::task::spawn_blocking(move || -> Result<String, String> {
        with_state(|s| {
            ensure_browser(s)?;
            let browser = s.browser.as_ref().ok_or("Browser not initialized")?;
            let tab = browser.new_tab().map_err(|e| e.to_string())?;
            tab.navigate_to(&url_clone).map_err(|e| e.to_string())?;
            tab.wait_until_navigated().map_err(|e| e.to_string())?;
            let title_val = tab
                .evaluate("document.title", false)
                .map_err(|e| e.to_string())?;
            Ok(title_val
                .value
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| url_clone.clone()))
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))??;

    Ok(format!("[{}]({})", title, url))
}

pub async fn browser_save_to_memory(
    url: String,
    state: Arc<Mutex<crate::AppState>>,
) -> Result<serde_json::Value, String> {
    parse_http_url(&url)?;

    let url_clone = url.clone();
    let (title, text) = tokio::task::spawn_blocking(move || -> Result<(String, String), String> {
        with_state(|s| {
            ensure_browser(s)?;
            let browser = s.browser.as_ref().ok_or("Browser not initialized")?;
            let tab = browser.new_tab().map_err(|e| e.to_string())?;
            tab.navigate_to(&url_clone).map_err(|e| e.to_string())?;
            tab.wait_until_navigated().map_err(|e| e.to_string())?;

            let title_val = tab
                .evaluate("document.title", false)
                .map_err(|e| e.to_string())?;
            let text_val = tab
                .evaluate("document.body.innerText", false)
                .map_err(|e| e.to_string())?;

            let title = title_val
                .value
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| url_clone.clone());
            let text = text_val
                .value
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_default();

            Ok((title, text))
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))??;

    if text.trim().is_empty() {
        return Err("No text content found on page".to_string());
    }

    let (provider, mem_db) = {
        let app = state.lock().unwrap_or_else(|e| e.into_inner());
        (app.provider.clone(), app.mem_db.clone())
    };

    let db = mem_db.ok_or("Memory database not initialized")?;

    let chunks = chunk_text(&text, 512, 64);
    let mut indexed = 0;

    for (chunk_idx, chunk) in chunks.iter().enumerate() {
        if let Ok(embedding) = provider.generate_embedding(chunk).await {
            let mut metadata = HashMap::new();
            metadata.insert("namespace".to_string(), "browser".to_string());
            metadata.insert("source_url".to_string(), url.clone());
            metadata.insert("title".to_string(), title.clone());
            metadata.insert("chunk_index".to_string(), chunk_idx.to_string());
            metadata.insert("role".to_string(), "document".to_string());
            let id = format!("browser::{}::{}", url, chunk_idx);
            let _ = db.store_message(id, chunk.clone(), embedding, metadata);
            indexed += 1;
        }
    }

    Ok(serde_json::json!({
        "title": title,
        "indexed": indexed,
        "total": chunks.len()
    }))
}
