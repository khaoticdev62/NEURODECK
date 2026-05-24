use tauri::{AppHandle, Manager};

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

    let builder = WebviewWindowBuilder::new(
        &app,
        "browser-view",
        WebviewUrl::External(nav_url),
    )
    .title("NEURODECK Browser")
    .decorations(false)
    .position(screen_x, screen_y)
    .inner_size(width, height)
    .skip_taskbar(true);

    let builder = builder.parent(&main_win).map_err(|e| e.to_string())?;

    builder.build().map_err(|e| e.to_string())?;

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
pub fn open_external(url: String) -> Result<(), String> {
    // Basic sanity check: only allow http/https to prevent arbitrary command execution
    if !url.starts_with("http://") && !url.starts_with("https://") {
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
