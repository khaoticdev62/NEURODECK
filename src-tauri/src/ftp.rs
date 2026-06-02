use std::io::{Read, Write};
use suppaftp::{FtpError, FtpStream};
use tauri::{AppHandle, Emitter};

const UPLOAD_EMIT_INTERVAL: u64 = 65_536; // emit every 64 KB

fn to_string_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[derive(serde::Serialize, Clone)]
pub struct FtpFileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(serde::Serialize, Clone)]
struct FtpUploadProgress {
    local_path: String,
    bytes_sent: u64,
    total_bytes: u64,
}

#[derive(serde::Serialize, Clone)]
struct FtpDownloadProgress {
    remote_path: String,
    bytes_received: usize,
    total_bytes: usize,
}

/// Wraps a `Read` source and emits `ftp_upload_progress` events to the
/// frontend every UPLOAD_EMIT_INTERVAL bytes so large uploads are not silent.
struct ProgressReader<R: Read> {
    inner: R,
    bytes_read: u64,
    last_emitted: u64,
    total: u64,
    local_path: String,
    app: AppHandle,
}

impl<R: Read> Read for ProgressReader<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let n = self.inner.read(buf)?;
        if n > 0 {
            self.bytes_read += n as u64;
            let elapsed = self.bytes_read - self.last_emitted;
            if elapsed >= UPLOAD_EMIT_INTERVAL || self.bytes_read >= self.total {
                self.last_emitted = self.bytes_read;
                let _ = self.app.emit(
                    "ftp_upload_progress",
                    FtpUploadProgress {
                        local_path: self.local_path.clone(),
                        bytes_sent: self.bytes_read,
                        total_bytes: self.total,
                    },
                );
            }
        }
        Ok(n)
    }
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
        let name = parts.last()?.to_string();
        return Some(FtpFileEntry {
            name,
            is_dir: false,
            size: 0,
        });
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

/// Default maximum download size: 500 MB.
const MAX_DOWNLOAD_SIZE_MB: u64 = 500;
/// Emit progress every 1 MB.
const DOWNLOAD_PROGRESS_INTERVAL: usize = 1_048_576;

#[tauri::command]
pub async fn ftp_download_file(
    app: AppHandle,
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

        // Check remote file size before downloading.
        let total_bytes: usize = stream
            .size(&remote_path)
            .map_err(to_string_err)
            .unwrap_or(0);
        let max_bytes: usize = (MAX_DOWNLOAD_SIZE_MB * 1_048_576) as usize;
        if total_bytes > max_bytes {
            return Err(format!(
                "File size ({:.1} MB) exceeds maximum allowed download size ({} MB).",
                total_bytes as f64 / 1_048_576.0,
                MAX_DOWNLOAD_SIZE_MB
            ));
        }

        // Stream directly to disk with periodic progress events.
        let app_clone = app.clone();
        let remote_path_clone = remote_path.clone();
        stream
            .retr(&remote_path, |reader| {
                let mut file =
                    std::fs::File::create(&local_path).map_err(FtpError::ConnectionError)?;
                let mut buf = [0u8; 8192];
                let mut bytes_received: usize = 0;
                let mut next_emit: usize = DOWNLOAD_PROGRESS_INTERVAL;
                loop {
                    let n = reader.read(&mut buf).map_err(FtpError::ConnectionError)?;
                    if n == 0 {
                        break;
                    }
                    file.write_all(&buf[..n]).map_err(FtpError::ConnectionError)?;
                    bytes_received += n;
                    if bytes_received >= next_emit {
                        let _ = app_clone.emit(
                            "ftp_download_progress",
                            FtpDownloadProgress {
                                remote_path: remote_path_clone.clone(),
                                bytes_received,
                                total_bytes,
                            },
                        );
                        next_emit += DOWNLOAD_PROGRESS_INTERVAL;
                    }
                }
                // Final progress event.
                let _ = app_clone.emit(
                    "ftp_download_progress",
                    FtpDownloadProgress {
                        remote_path: remote_path_clone.clone(),
                        bytes_received,
                        total_bytes,
                    },
                );
                Ok(())
            })
            .map_err(to_string_err)?;

        stream.quit().ok();
        Ok(())
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
pub async fn ftp_upload_file(
    app: AppHandle,
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

        let file = std::fs::File::open(&local_path).map_err(to_string_err)?;
        let total = file.metadata().map_err(to_string_err)?.len();
        let mut progress_reader = ProgressReader {
            inner: file,
            bytes_read: 0,
            last_emitted: 0,
            total,
            local_path: local_path.clone(),
            app,
        };

        stream
            .put_file(&remote_path, &mut progress_reader)
            .map_err(to_string_err)?;
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
        // SECURITY: Plain FTP transmits credentials and data in cleartext.
        Ok(format!(
            "⚠️ Connected (UNENCRYPTED). Current directory: {}\n\nWarning: Plain FTP sends credentials and file contents in cleartext. Consider using SFTP for sensitive data.",
            cwd
        ))
    })
    .await
    .map_err(to_string_err)?
}
