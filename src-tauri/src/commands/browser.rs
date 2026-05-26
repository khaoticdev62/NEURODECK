use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption;
use headless_chrome::{Browser, LaunchOptionsBuilder, Tab};
use serde_json::Value;
use tauri::{AppHandle, Manager};

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

#[tauri::command]
pub async fn browser_open(
    app: AppHandle,
    url: String,
    viewport_x: f64,
    viewport_y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{LogicalPosition, LogicalSize, WebviewUrl, WebviewWindowBuilder};

    let nav_url = url.parse::<tauri::Url>().map_err(|e| e.to_string())?;
    let scheme = nav_url.scheme();
    if scheme != "http" && scheme != "https" {
        return Err("Only http/https URLs are permitted".into());
    }

    let main_win = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let scale = main_win.scale_factor().map_err(|e| e.to_string())?;
    let inner_pos = main_win.inner_position().map_err(|e| e.to_string())?;
    let screen_x = inner_pos.x as f64 / scale + viewport_x;
    let screen_y = inner_pos.y as f64 / scale + viewport_y;

    if let Some(win) = app.get_webview_window("browser-view") {
        win.set_position(LogicalPosition::new(screen_x, screen_y))
            .map_err(|e| e.to_string())?;
        win.set_size(LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
        win.navigate(nav_url).map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let make_builder = |nav: tauri::Url| {
        WebviewWindowBuilder::new(&app, "browser-view", WebviewUrl::External(nav))
            .title("NEURODECK Browser")
            .decorations(false)
            .position(screen_x, screen_y)
            .inner_size(width, height)
            .skip_taskbar(true)
    };

    // Attempt child-window parenting (preferred — keeps browser clipped to main window).
    // Falls back to a standalone overlay window if the platform rejects it (e.g. Windows
    // desktop mode where the parent HWND relationship isn't supported by WebView2).
    let built = make_builder(nav_url.clone())
        .parent(&main_win)
        .and_then(|b| b.build())
        .or_else(|_| make_builder(nav_url).build());

    built.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn browser_navigate(app: AppHandle, url: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("browser-view") {
        let nav_url = url.parse::<tauri::Url>().map_err(|e| e.to_string())?;
        let scheme = nav_url.scheme();
        if scheme != "http" && scheme != "https" {
            return Err("Only http/https URLs are permitted".into());
        }
        win.navigate(nav_url).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_hide(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("browser-view") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_show(
    app: AppHandle,
    viewport_x: f64,
    viewport_y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::{LogicalPosition, LogicalSize};

    let main_win = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let scale = main_win.scale_factor().map_err(|e| e.to_string())?;
    let inner_pos = main_win.inner_position().map_err(|e| e.to_string())?;
    let screen_x = inner_pos.x as f64 / scale + viewport_x;
    let screen_y = inner_pos.y as f64 / scale + viewport_y;

    if let Some(win) = app.get_webview_window("browser-view") {
        win.set_position(LogicalPosition::new(screen_x, screen_y))
            .map_err(|e| e.to_string())?;
        win.set_size(LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_get_url(app: AppHandle) -> String {
    app.get_webview_window("browser-view")
        .and_then(|win| win.url().ok())
        .map(|u| u.to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub fn browser_exec(app: AppHandle, js: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("browser-view") {
        win.eval(&js).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_open_session(url: String) -> Result<String, String> {
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

#[tauri::command]
pub fn browser_navigate_session(session_id: String, url: String) -> Result<(), String> {
    parse_http_url(&url)?;
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        tab.navigate_to(&url).map_err(|e| e.to_string())?;
        tab.wait_until_navigated().map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn browser_get_content(session_id: String) -> Result<String, String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        tab.get_content().map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn browser_click(session_id: String, selector: String) -> Result<(), String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let element = tab.wait_for_element(&selector).map_err(|e| e.to_string())?;
        element.click().map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn browser_fill(session_id: String, selector: String, value: String) -> Result<(), String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let element = tab.wait_for_element(&selector).map_err(|e| e.to_string())?;
        element.click().map_err(|e| e.to_string())?;
        element.type_into(&value).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn browser_screenshot(session_id: String) -> Result<String, String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let png = tab
            .capture_screenshot(CaptureScreenshotFormatOption::Png, None, None, true)
            .map_err(|e| e.to_string())?;
        Ok(STANDARD.encode(png))
    })
}

#[tauri::command]
pub fn browser_evaluate_js(session_id: String, script: String) -> Result<Value, String> {
    with_state(|state| {
        let tab = get_session_tab(state, &session_id)?;
        let eval_result = tab.evaluate(&script, false).map_err(|e| e.to_string())?;
        Ok(eval_result.value.unwrap_or(Value::Null))
    })
}

#[tauri::command]
pub fn browser_close_session(session_id: String) -> Result<(), String> {
    with_state(|state| {
        state.sessions.remove(&session_id);
        if state.sessions.is_empty() {
            state.browser = None;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    // Basic sanity check: only allow http/https to prevent arbitrary command execution
    let lower = url.to_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return Err("Only http/https URLs are supported".into());
    }
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
