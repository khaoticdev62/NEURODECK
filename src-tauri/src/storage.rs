use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Session {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub messages: Vec<String>,
    /// User-assigned display name; None means show formatted date
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Lightweight metadata returned by list_sessions_meta — no messages loaded
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SessionMeta {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub message_count: usize,
    pub preview: String,
    pub name: Option<String>,
}

pub fn save_session<P: AsRef<Path>>(dir: P, session: &Session) -> Result<(), String> {
    let dir_ref = dir.as_ref();
    fs::create_dir_all(dir_ref)
        .map_err(|e| format!("Failed to create sessions directory: {}", e))?;

    // Sanitize session ID to prevent directory traversal
    if session.id.is_empty()
        || session.id.contains('/')
        || session.id.contains('\\')
        || session.id.contains("..")
    {
        return Err(format!("Invalid session ID: {}", session.id));
    }

    let file_path = dir_ref.join(format!("{}.json", session.id));
    let serialized =
        serde_json::to_string_pretty(session).map_err(|e| format!("Serialization error: {}", e))?;

    fs::write(file_path, serialized).map_err(|e| format!("Failed to write session file: {}", e))?;

    Ok(())
}

pub fn load_session<P: AsRef<Path>>(path: P) -> Result<Session, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read session file: {}", e))?;

    let session = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse session JSON: {}", e))?;

    Ok(session)
}

#[allow(dead_code)]
/// Read all session files and return lightweight metadata — does not load messages into memory more than needed.
pub fn list_sessions_meta<P: AsRef<Path>>(dir: P) -> Result<Vec<SessionMeta>, String> {
    let dir_ref = dir.as_ref();
    if !dir_ref.exists() {
        return Ok(Vec::new());
    }

    let mut metas: Vec<SessionMeta> = std::fs::read_dir(dir_ref)
        .map_err(|e| format!("Error reading sessions dir: {}", e))?
        .flatten()
        .filter(|e| {
            let p = e.path();
            p.is_file() && p.extension().is_some_and(|x| x == "json")
        })
        .filter_map(|entry| {
            let session: Session =
                serde_json::from_str(&std::fs::read_to_string(entry.path()).ok()?).ok()?;

            let preview = session
                .messages
                .last()
                .map(|m| {
                    let stripped = m.trim_start_matches("User: ").trim_start_matches("AI: ");
                    if stripped.len() > 80 {
                        format!("{}…", &stripped[..80])
                    } else {
                        stripped.to_string()
                    }
                })
                .unwrap_or_default();

            Some(SessionMeta {
                id: session.id,
                created_at: session.created_at,
                message_count: session.messages.len(),
                preview,
                name: session.name,
            })
        })
        .collect();

    metas.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(metas)
}

pub fn export_to_markdown<P: AsRef<Path>>(path: P, session: &Session) -> Result<(), String> {
    if let Some(parent) = path.as_ref().parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create export directory: {}", e))?;
    }

    let mut markdown = format!("# Session: {}\n\n", session.id);
    markdown.push_str(&format!("Created: {}\n\n", session.created_at.to_rfc3339()));

    for msg in &session.messages {
        markdown.push_str(&format!("{}\n\n", msg));
    }

    fs::write(path, markdown).map_err(|e| format!("Failed to write markdown export: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_and_load_session() {
        let temp_dir = std::env::temp_dir().join("neurodeck_test_storage");
        if temp_dir.exists() {
            let _ = std::fs::remove_dir_all(&temp_dir);
        }

        let session = Session {
            id: "test-session-123".to_string(),
            created_at: Utc::now(),
            messages: vec!["User: Hello".to_string(), "AI: Hi there".to_string()],
            name: None,
        };

        // Test save
        save_session(&temp_dir, &session).unwrap();

        // Test load
        let file_path = temp_dir.join("test-session-123.json");
        let loaded = load_session(file_path).unwrap();
        assert_eq!(loaded.id, session.id);
        assert_eq!(loaded.messages, session.messages);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_invalid_session_ids() {
        let temp_dir = std::env::temp_dir().join("neurodeck_test_storage_invalid");
        let session = Session {
            id: "../traversal".to_string(),
            created_at: Utc::now(),
            messages: vec![],
            name: None,
        };

        assert!(save_session(&temp_dir, &session).is_err());

        let session_empty = Session {
            id: "".to_string(),
            created_at: Utc::now(),
            messages: vec![],
            name: None,
        };
        assert!(save_session(&temp_dir, &session_empty).is_err());
    }

    #[test]
    fn test_export_to_markdown() {
        let temp_dir = std::env::temp_dir().join("neurodeck_test_markdown");
        if temp_dir.exists() {
            let _ = std::fs::remove_dir_all(&temp_dir);
        }
        std::fs::create_dir_all(&temp_dir).unwrap();

        let session = Session {
            id: "test-session-md".to_string(),
            created_at: Utc::now(),
            messages: vec!["User: Msg1".to_string(), "AI: Msg2".to_string()],
            name: None,
        };

        let md_path = temp_dir.join("export.md");
        export_to_markdown(&md_path, &session).unwrap();

        assert!(md_path.exists());
        let content = std::fs::read_to_string(md_path).unwrap();
        assert!(content.contains("# Session: test-session-md"));
        assert!(content.contains("User: Msg1"));
        assert!(content.contains("AI: Msg2"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
