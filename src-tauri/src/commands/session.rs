use crate::storage::{load_session, SessionMeta};
use crate::*;

/// Returns the session content formatted as the requested type:
/// "markdown" | "json" | "html"
/// Used by the frontend export dropdown (copy to clipboard or file download).
pub fn export_session_content(id: String, format: String) -> Result<String, String> {
    if id.is_empty() || id.contains("..") || id.contains('/') || id.contains('\\') {
        return Err("Invalid session ID".into());
    }
    let path = user_config_dir()
        .join("sessions")
        .join(format!("{}.json", id));
    let session = if path.exists() {
        storage::load_session(&path)?
    } else {
        return Err(format!("Session {} not found", id));
    };

    match format.as_str() {
        "json" => serde_json::to_string_pretty(&session)
            .map_err(|e| format!("JSON serialization error: {}", e)),
        "html" => {
            let title = session.name.as_deref().unwrap_or(&session.id);
            let date = session.created_at.format("%Y-%m-%d %H:%M UTC").to_string();
            let mut rows = String::new();
            for msg in &session.messages {
                let (role_class, role_label, content) = if msg.starts_with("User: ") {
                    ("user", "You", msg.trim_start_matches("User: "))
                } else if msg.starts_with("AI: ") {
                    ("ai", "NEURODECK", msg.trim_start_matches("AI: "))
                } else {
                    ("system", "System", msg.as_str())
                };
                let escaped = content
                    .replace('&', "&amp;")
                    .replace('<', "&lt;")
                    .replace('>', "&gt;")
                    .replace('\n', "<br>");
                rows.push_str(&format!(
                    r#"<div class="msg {role_class}"><span class="role">{role_label}</span><div class="body">{escaped}</div></div>"#
                ));
            }
            Ok(format!(
                r#"<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>NEURODECK — {title}</title>
<style>
  body{{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;background:#0a0d10;color:#e8f4ff}}
  h1{{color:#5eebff;font-size:1.2rem;margin-bottom:4px}}
  .date{{color:#666;font-size:0.8rem;margin-bottom:32px}}
  .msg{{margin-bottom:20px;padding:14px 18px;border-radius:10px;line-height:1.6}}
  .msg.user{{background:#11223a;border:1px solid rgba(94,235,255,.15);border-bottom-right-radius:3px}}
  .msg.ai{{background:#0d1a10;border:1px solid rgba(124,255,178,.12);border-bottom-left-radius:3px}}
  .msg.system{{background:#1a1a0d;border:1px solid rgba(255,200,87,.12)}}
  .role{{font-size:0.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.55;display:block;margin-bottom:8px}}
  .msg.user .role{{color:#5eebff}}.msg.ai .role{{color:#7cffb2}}.msg.system .role{{color:#ffc857}}
  .body{{white-space:pre-wrap}}
</style></head><body>
<h1>{title}</h1><p class="date">{date} · {count} messages</p>
{rows}
</body></html>"#,
                title = title,
                date = date,
                count = session.messages.len(),
                rows = rows
            ))
        }
        _ => {
            // Default: markdown
            let title = session.name.as_deref().unwrap_or(&session.id);
            let date = session.created_at.format("%Y-%m-%d %H:%M UTC").to_string();
            let mut md = format!(
                "# NEURODECK — {}\n\n**Date:** {}\n**Messages:** {}\n\n---\n\n",
                title,
                date,
                session.messages.len()
            );
            for msg in &session.messages {
                if msg.starts_with("User: ") {
                    md.push_str(&format!(
                        "**You:**\n\n{}\n\n",
                        msg.trim_start_matches("User: ")
                    ));
                } else if msg.starts_with("AI: ") {
                    md.push_str(&format!(
                        "**NEURODECK:**\n\n{}\n\n",
                        msg.trim_start_matches("AI: ")
                    ));
                } else {
                    md.push_str(&format!("> {}\n\n", msg));
                }
                md.push_str("---\n\n");
            }
            Ok(md)
        }
    }
}

pub fn export_session_markdown(id: String) -> Result<String, String> {
    if id.contains("..") || id.contains('/') || id.contains('\\') {
        return Err("Invalid session ID".into());
    }
    let path = user_config_dir()
        .join("sessions")
        .join(format!("{}.json", id));
    if !path.exists() {
        return Err(format!("Session {} does not exist on disk", id));
    }
    let session = storage::load_session(&path)?;

    let export_dir = user_config_dir().join("exports");
    std::fs::create_dir_all(&export_dir)
        .map_err(|e| format!("Failed to create exports directory: {}", e))?;

    let file_path = export_dir.join(format!("{}.md", id));
    storage::export_to_markdown(&file_path, &session)?;

    Ok(format!(
        "Session exported to {}",
        file_path.to_string_lossy()
    ))
}

pub fn list_sessions() -> Result<Vec<String>, String> {
    let mut sessions = Vec::new();
    let dir = user_config_dir().join("sessions");
    if !dir.exists() {
        return Ok(sessions);
    }
    let read_dir =
        std::fs::read_dir(dir).map_err(|e| format!("Error reading sessions dir: {}", e))?;

    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().is_some_and(|ext| ext == "json") {
            if let Some(stem) = path.file_stem() {
                sessions.push(stem.to_string_lossy().into_owned());
            }
        }
    }

    sessions.sort_by(|a, b| b.cmp(a));
    Ok(sessions)
}

pub fn delete_session(id: String) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }

    let file_path = user_config_dir()
        .join("sessions")
        .join(format!("{}.json", id));
    if file_path.exists() {
        std::fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete session file: {}", e))?;
    }
    Ok(())
}

pub fn list_sessions_meta() -> Result<Vec<SessionMeta>, String> {
    storage::list_sessions_meta(user_config_dir().join("sessions"))
}

pub fn rename_session(id: String, name: String) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("Invalid session ID: {}", id));
    }
    let file_path = user_config_dir()
        .join("sessions")
        .join(format!("{}.json", id));
    if !file_path.exists() {
        return Err(format!("Session {} does not exist", id));
    }
    let mut session = load_session(&file_path)?;
    let trimmed = name.trim().to_string();
    session.name = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    };
    let serialized = serde_json::to_string_pretty(&session)
        .map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&file_path, serialized)
        .map_err(|e| format!("Failed to write session: {}", e))?;
    Ok(())
}
