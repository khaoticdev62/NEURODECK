use suppaftp::FtpStream;
use std::io::Cursor;

fn to_string_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[derive(serde::Serialize, Clone)]
pub struct FtpFileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub async fn ftp_list_dir(
    host: String,
    port: u16,
    user: String,
    password: String,
    path: String,
) -> Result<Vec<FtpFileEntry>, String> {
    tokio::task::spawn_blocking(move || {
        let addr = format!("{}:{}", host, port);
        let mut stream = FtpStream::connect(&addr).map_err(to_string_err)?;
        stream.login(&user, &password).map_err(to_string_err)?;
        stream.cwd(&path).map_err(to_string_err)?;

        // Use raw LIST for richer metadata
        let raw_list = stream.list(None).map_err(to_string_err)?;
        let entries = raw_list
            .into_iter()
            .filter_map(|line| parse_list_line(&line))
            .collect();

        stream.quit().ok();
        Ok(entries)
    })
    .await
    .map_err(to_string_err)?
}

/// Parse a single line from FTP LIST output (Unix format)
fn parse_list_line(line: &str) -> Option<FtpFileEntry> {
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 9 {
        // Minimal fallback: just treat as unknown entry
        let name = parts.last()?.to_string();
        return Some(FtpFileEntry { name, is_dir: false, size: 0 });
    }
    let perms = parts[0];
    let is_dir = perms.starts_with('d');
    let size: u64 = parts[4].parse().unwrap_or(0);
    let name = parts[8..].join(" ");
    if name == "." || name == ".." {
        return None;
    }
    Some(FtpFileEntry { name, is_dir, size })
}

#[tauri::command]
pub async fn ftp_download_file(
    host: String,
    port: u16,
    user: String,
    password: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let addr = format!("{}:{}", host, port);
        let mut stream = FtpStream::connect(&addr).map_err(to_string_err)?;
        stream.login(&user, &password).map_err(to_string_err)?;

        let cursor: Cursor<Vec<u8>> = stream.retr_as_buffer(&remote_path).map_err(to_string_err)?;
        std::fs::write(&local_path, cursor.into_inner()).map_err(to_string_err)?;

        stream.quit().ok();
        Ok(())
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
pub async fn ftp_upload_file(
    host: String,
    port: u16,
    user: String,
    password: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let addr = format!("{}:{}", host, port);
        let mut stream = FtpStream::connect(&addr).map_err(to_string_err)?;
        stream.login(&user, &password).map_err(to_string_err)?;

        let data = std::fs::read(&local_path).map_err(to_string_err)?;
        let mut cursor = Cursor::new(data);
        stream.put_file(&remote_path, &mut cursor).map_err(to_string_err)?;

        stream.quit().ok();
        Ok(())
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
pub async fn ftp_test_connection(
    host: String,
    port: u16,
    user: String,
    password: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let addr = format!("{}:{}", host, port);
        let mut stream = FtpStream::connect(&addr).map_err(to_string_err)?;
        stream.login(&user, &password).map_err(to_string_err)?;
        let cwd = stream.pwd().map_err(to_string_err)?;
        stream.quit().ok();
        Ok(format!("Connected. Current directory: {}", cwd))
    })
    .await
    .map_err(to_string_err)?
}
