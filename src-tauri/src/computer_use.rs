use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
pub struct ComputerScreenshot {
    pub mime: String,
    pub base64: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ComputerTextMatch {
    pub text: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub confidence: f32,
}

#[derive(Clone, Debug)]
struct OcrWord {
    text: String,
    left: i32,
    top: i32,
    width: i32,
    height: i32,
    confidence: f32,
}

#[tauri::command]
pub async fn computer_screenshot() -> Result<ComputerScreenshot, String> {
    let bytes = tokio::task::spawn_blocking(capture_screenshot_bytes)
        .await
        .map_err(|e| format!("Screenshot task failed: {e}"))??;

    Ok(ComputerScreenshot {
        mime: "image/png".to_string(),
        base64: BASE64.encode(bytes),
    })
}

#[tauri::command]
pub async fn computer_mouse_move(x: i32, y: i32, approved: bool) -> Result<(), String> {
    require_approval(approved)?;
    tokio::task::spawn_blocking(move || platform_mouse_move(x, y))
        .await
        .map_err(|e| format!("Mouse move task failed: {e}"))?
}

#[tauri::command]
pub async fn computer_mouse_click(button: String, approved: bool) -> Result<(), String> {
    require_approval(approved)?;
    let button = normalize_button(&button)?;
    tokio::task::spawn_blocking(move || platform_mouse_click(button))
        .await
        .map_err(|e| format!("Mouse click task failed: {e}"))?
}

#[tauri::command]
pub async fn computer_type(text: String, approved: bool) -> Result<(), String> {
    require_approval(approved)?;
    if text.len() > 8_000 {
        return Err("Text input is limited to 8,000 bytes per action.".to_string());
    }
    tokio::task::spawn_blocking(move || platform_type_text(text))
        .await
        .map_err(|e| format!("Keyboard type task failed: {e}"))?
}

#[tauri::command]
pub async fn computer_key(key: String, approved: bool) -> Result<(), String> {
    require_approval(approved)?;
    let key = normalize_key(&key)?;
    tokio::task::spawn_blocking(move || platform_key(key))
        .await
        .map_err(|e| format!("Keyboard key task failed: {e}"))?
}

#[tauri::command]
pub async fn computer_find_text(text: String) -> Result<ComputerTextMatch, String> {
    let needle = text.trim().to_string();
    if needle.is_empty() {
        return Err("Search text cannot be empty.".to_string());
    }

    tokio::task::spawn_blocking(move || find_text_with_tesseract(&needle))
        .await
        .map_err(|e| format!("OCR task failed: {e}"))?
}

fn require_approval(approved: bool) -> Result<(), String> {
    if approved {
        Ok(())
    } else {
        Err("Computer use action requires explicit user approval.".to_string())
    }
}

fn normalize_button(button: &str) -> Result<&'static str, String> {
    match button.trim().to_ascii_lowercase().as_str() {
        "left" | "primary" | "1" => Ok("left"),
        "middle" | "2" => Ok("middle"),
        "right" | "secondary" | "3" => Ok("right"),
        _ => Err("Mouse button must be left, middle, or right.".to_string()),
    }
}

fn normalize_key(key: &str) -> Result<String, String> {
    let trimmed = key.trim();
    if trimmed.is_empty() || trimmed.len() > 40 {
        return Err("Key name must be 1-40 characters.".to_string());
    }
    let safe = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '+' | ' '));
    if !safe {
        return Err("Key name may only contain letters, numbers, spaces, _, -, and +.".to_string());
    }
    Ok(trimmed.to_string())
}

fn capture_screenshot_bytes() -> Result<Vec<u8>, String> {
    let path = temp_png_path("screenshot");
    let result = capture_screenshot_to_path(&path)
        .and_then(|_| fs::read(&path).map_err(|e| format!("Failed to read screenshot file: {e}")));
    let _ = fs::remove_file(&path);
    result
}

fn capture_screenshot_to_path(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($env:NEURODECK_SCREENSHOT_PATH, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
"#;
        run_powershell(script, &[("NEURODECK_SCREENSHOT_PATH", path_string(path))])?;
        return ensure_file_exists(path, "screenshot");
    }

    #[cfg(target_os = "linux")]
    {
        let path_text = path_string(path);
        let attempts: Vec<(&str, Vec<&str>)> = vec![
            ("grim", vec![path_text.as_str()]),
            ("gnome-screenshot", vec!["-f", path_text.as_str()]),
            ("spectacle", vec!["-b", "-n", "-o", path_text.as_str()]),
            ("import", vec!["-window", "root", path_text.as_str()]),
        ];
        for (program, args) in attempts {
            if run_program(program, &args, &[]).is_ok() && path.exists() {
                return Ok(());
            }
        }
        return Err("No supported screenshot tool found. Install grim, gnome-screenshot, spectacle, or ImageMagick import.".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        run_program("screencapture", &["-x", &path_string(path)], &[])?;
        return ensure_file_exists(path, "screenshot");
    }

    #[allow(unreachable_code)]
    Err("Desktop screenshots are not supported on this platform.".to_string())
}

fn platform_mouse_move(x: i32, y: i32) -> Result<(), String> {
    if x < 0 || y < 0 {
        return Err("Mouse coordinates must be non-negative.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let script = windows_mouse_script("[NativeMouse]::SetCursorPos([int]$env:NEURODECK_MOUSE_X, [int]$env:NEURODECK_MOUSE_Y) | Out-Null");
        return run_powershell(
            &script,
            &[
                ("NEURODECK_MOUSE_X", x.to_string()),
                ("NEURODECK_MOUSE_Y", y.to_string()),
            ],
        );
    }

    #[cfg(target_os = "linux")]
    {
        return run_program(
            "xdotool",
            &["mousemove", &x.to_string(), &y.to_string()],
            &[],
        );
    }

    #[cfg(target_os = "macos")]
    {
        return Err("Mouse movement is not implemented on macOS.".to_string());
    }

    #[allow(unreachable_code)]
    Err("Mouse movement is not supported on this platform.".to_string())
}

fn platform_mouse_click(button: &'static str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let (down, up) = match button {
            "left" => ("0x0002", "0x0004"),
            "right" => ("0x0008", "0x0010"),
            "middle" => ("0x0020", "0x0040"),
            _ => return Err("Unsupported mouse button.".to_string()),
        };
        let action = format!(
            "[NativeMouse]::mouse_event({down}, 0, 0, 0, [UIntPtr]::Zero)`n[NativeMouse]::mouse_event({up}, 0, 0, 0, [UIntPtr]::Zero)"
        );
        return run_powershell(&windows_mouse_script(&action), &[]);
    }

    #[cfg(target_os = "linux")]
    {
        let xdotool_button = match button {
            "left" => "1",
            "middle" => "2",
            "right" => "3",
            _ => return Err("Unsupported mouse button.".to_string()),
        };
        return run_program("xdotool", &["click", xdotool_button], &[]);
    }

    #[cfg(target_os = "macos")]
    {
        return Err("Mouse click is not implemented on macOS.".to_string());
    }

    #[allow(unreachable_code)]
    Err("Mouse click is not supported on this platform.".to_string())
}

fn platform_type_text(text: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
$text = [Environment]::GetEnvironmentVariable('NEURODECK_TYPE_TEXT')
$previous = $null
try { $previous = Get-Clipboard -Raw -ErrorAction SilentlyContinue } catch {}
Set-Clipboard -Value $text
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 120
if ($null -ne $previous) { Set-Clipboard -Value $previous }
"#;
        return run_powershell(script, &[("NEURODECK_TYPE_TEXT", text)]);
    }

    #[cfg(target_os = "linux")]
    {
        return run_program("xdotool", &["type", "--delay", "0", "--", &text], &[]);
    }

    #[cfg(target_os = "macos")]
    {
        return Err("Keyboard typing is not implemented on macOS.".to_string());
    }

    #[allow(unreachable_code)]
    Err("Keyboard typing is not supported on this platform.".to_string())
}

fn platform_key(key: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let send_key = windows_send_key(&key)?;
        let script = r#"
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($env:NEURODECK_KEY)
"#;
        return run_powershell(script, &[("NEURODECK_KEY", send_key)]);
    }

    #[cfg(target_os = "linux")]
    {
        return run_program("xdotool", &["key", &key.replace(' ', "")], &[]);
    }

    #[cfg(target_os = "macos")]
    {
        return Err("Keyboard key press is not implemented on macOS.".to_string());
    }

    #[allow(unreachable_code)]
    Err("Keyboard key press is not supported on this platform.".to_string())
}

fn find_text_with_tesseract(needle: &str) -> Result<ComputerTextMatch, String> {
    let screenshot_path = temp_png_path("ocr");
    let result = capture_screenshot_to_path(&screenshot_path)
        .and_then(|_| run_tesseract_tsv(&screenshot_path))
        .and_then(|tsv| find_text_in_tsv(needle, &tsv));
    let _ = fs::remove_file(&screenshot_path);
    result
}

fn run_tesseract_tsv(path: &PathBuf) -> Result<String, String> {
    let output = Command::new("tesseract")
        .arg(path)
        .arg("stdout")
        .arg("--psm")
        .arg("6")
        .arg("tsv")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| {
            format!("Failed to start tesseract. Install the tesseract CLI to enable OCR: {e}")
        })?;

    if !output.status.success() {
        return Err(command_error("tesseract", &output));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("Tesseract returned invalid UTF-8: {e}"))
}

fn find_text_in_tsv(needle: &str, tsv: &str) -> Result<ComputerTextMatch, String> {
    let needle_lower = needle.to_ascii_lowercase();
    let words = parse_tesseract_words(tsv);

    for word in &words {
        if word.text.to_ascii_lowercase().contains(&needle_lower) {
            return Ok(word_to_match(word));
        }
    }

    for start in 0..words.len() {
        let mut combined = String::new();
        let mut confidence_total = 0.0;
        for end in start..words.len().min(start + 12) {
            if !combined.is_empty() {
                combined.push(' ');
            }
            combined.push_str(&words[end].text);
            confidence_total += words[end].confidence.max(0.0);

            if combined.to_ascii_lowercase().contains(&needle_lower) {
                let slice = &words[start..=end];
                let left = slice.iter().map(|w| w.left).min().unwrap_or(0);
                let top = slice.iter().map(|w| w.top).min().unwrap_or(0);
                let right = slice.iter().map(|w| w.left + w.width).max().unwrap_or(left);
                let bottom = slice.iter().map(|w| w.top + w.height).max().unwrap_or(top);
                return Ok(ComputerTextMatch {
                    text: combined,
                    x: left,
                    y: top,
                    width: right - left,
                    height: bottom - top,
                    confidence: confidence_total / slice.len() as f32,
                });
            }
        }
    }

    Err(format!(
        "Text '{needle}' was not found in the current screenshot."
    ))
}

fn parse_tesseract_words(tsv: &str) -> Vec<OcrWord> {
    tsv.lines()
        .skip(1)
        .filter_map(|line| {
            let cols: Vec<&str> = line.split('\t').collect();
            if cols.len() < 12 {
                return None;
            }
            let text = cols[11].trim();
            if text.is_empty() {
                return None;
            }
            let confidence = cols[10].parse::<f32>().ok()?;
            if confidence < 0.0 {
                return None;
            }
            Some(OcrWord {
                text: text.to_string(),
                left: cols[6].parse().ok()?,
                top: cols[7].parse().ok()?,
                width: cols[8].parse().ok()?,
                height: cols[9].parse().ok()?,
                confidence,
            })
        })
        .collect()
}

fn word_to_match(word: &OcrWord) -> ComputerTextMatch {
    ComputerTextMatch {
        text: word.text.clone(),
        x: word.left,
        y: word.top,
        width: word.width,
        height: word.height,
        confidence: word.confidence,
    }
}

fn temp_png_path(prefix: &str) -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    std::env::temp_dir().join(format!(
        "neurodeck_{prefix}_{}_{}.png",
        std::process::id(),
        stamp
    ))
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn ensure_file_exists(path: &Path, label: &str) -> Result<(), String> {
    if path.exists() {
        Ok(())
    } else {
        Err(format!("Failed to create {label} file."))
    }
}

#[cfg(target_os = "windows")]
fn windows_mouse_script(action: &str) -> String {
    format!(
        r#"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeMouse {{
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}}
"@
{action}
"#
    )
}

#[cfg(target_os = "windows")]
fn windows_send_key(key: &str) -> Result<String, String> {
    let lower = key.to_ascii_lowercase().replace(' ', "");
    let mapped = match lower.as_str() {
        "enter" | "return" => "{ENTER}".to_string(),
        "tab" => "{TAB}".to_string(),
        "escape" | "esc" => "{ESC}".to_string(),
        "backspace" => "{BACKSPACE}".to_string(),
        "delete" | "del" => "{DELETE}".to_string(),
        "up" | "arrowup" => "{UP}".to_string(),
        "down" | "arrowdown" => "{DOWN}".to_string(),
        "left" | "arrowleft" => "{LEFT}".to_string(),
        "right" | "arrowright" => "{RIGHT}".to_string(),
        "home" => "{HOME}".to_string(),
        "end" => "{END}".to_string(),
        "pageup" => "{PGUP}".to_string(),
        "pagedown" => "{PGDN}".to_string(),
        "ctrl+c" | "control+c" => "^c".to_string(),
        "ctrl+v" | "control+v" => "^v".to_string(),
        "ctrl+a" | "control+a" => "^a".to_string(),
        "ctrl+s" | "control+s" => "^s".to_string(),
        _ if lower.len() == 1 => lower,
        _ => return Err(format!("Unsupported Windows key: {key}")),
    };
    Ok(mapped)
}

#[cfg(target_os = "windows")]
fn run_powershell(script: &str, envs: &[(&str, String)]) -> Result<(), String> {
    let mut command = Command::new("powershell");
    command
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    for (key, value) in envs {
        command.env(key, value);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to start PowerShell: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(command_error("powershell", &output))
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn run_program(program: &str, args: &[&str], envs: &[(&str, String)]) -> Result<(), String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for (key, value) in envs {
        command.env(key, value);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to start {program}: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(program, &output))
    }
}

fn command_error(program: &str, output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let detail = if !stderr.is_empty() { stderr } else { stdout };
    if detail.is_empty() {
        format!("{program} exited with status {}", output.status)
    } else {
        format!("{program} failed: {detail}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_supported_buttons() {
        assert_eq!(normalize_button("left").unwrap(), "left");
        assert_eq!(normalize_button("secondary").unwrap(), "right");
        assert_eq!(normalize_button("2").unwrap(), "middle");
    }

    #[test]
    fn rejects_invalid_buttons() {
        assert!(normalize_button("double").is_err());
    }

    #[test]
    fn validates_key_names() {
        assert_eq!(normalize_key("ctrl+s").unwrap(), "ctrl+s");
        assert!(normalize_key("enter; rm").is_err());
        assert!(normalize_key("").is_err());
    }

    #[test]
    fn parses_tesseract_tsv_words() {
        let tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t10\t20\t30\t12\t92.5\tSettings\n";
        let words = parse_tesseract_words(tsv);
        assert_eq!(words.len(), 1);
        assert_eq!(words[0].text, "Settings");
        assert_eq!(words[0].left, 10);
    }
}
