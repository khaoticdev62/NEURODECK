use std::io::Write;
use std::process::Stdio;

fn to_string_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn validate_sftp_path(path: &str) -> Result<(), String> {
    lazy_static::lazy_static! {
        static ref RE: regex::Regex = regex::Regex::new(r"^[a-zA-Z0-9_\.\-\/:@ ]+$").unwrap();
    }
    if RE.is_match(path) {
        Ok(())
    } else {
        Err("Invalid characters in SFTP path. Only alphanumeric, dashes, dots, underscores, colons, slashes, and spaces are allowed.".to_string())
    }
}

fn validate_sftp_user_host(val: &str) -> Result<(), String> {
    lazy_static::lazy_static! {
        static ref RE: regex::Regex = regex::Regex::new(r"^[a-zA-Z0-9._-]+$").unwrap();
    }
    if RE.is_match(val) {
        Ok(())
    } else {
        Err("Invalid user or host format. Only alphanumeric, dots, underscores, and dashes are allowed.".to_string())
    }
}

#[derive(serde::Serialize, Clone)]
pub struct FtpFileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

fn build_sftp_command(
    host: &str,
    port: u16,
    user: &str,
    auth_type: &str,
    password: Option<&str>,
    key_path: Option<&str>,
) -> std::process::Command {
    let mut cmd;
    if auth_type == "key" || password.map_or(true, |p| p.is_empty()) {
        cmd = std::process::Command::new("sftp");
    } else {
        // SECURITY: Use sshpass -e with SSHPASS env var instead of -p
        // to prevent password exposure in process listings (ps aux).
        cmd = std::process::Command::new("sshpass");
        cmd.arg("-e").arg("sftp");
        cmd.env("SSHPASS", password.unwrap_or(""));
    }

    // Port argument (capital -P for sftp)
    cmd.arg("-P").arg(port.to_string());

    if auth_type == "key" {
        if let Some(key) = key_path {
            if !key.is_empty() {
                cmd.arg("-i").arg(key);
            }
        }
    }

    // Batch mode from stdin
    cmd.arg("-b").arg("-");

    // Target host connection string
    cmd.arg(format!("{}@{}", user, host));

    cmd
}

fn execute_sftp_commands(mut cmd: std::process::Command, commands: &str) -> Result<String, String> {
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn SFTP command: {}", e))?;

    {
        let stdin = child.stdin.as_mut().ok_or("Failed to open SFTP stdin")?;
        stdin
            .write_all(commands.as_bytes())
            .map_err(|e| format!("Failed to write to SFTP stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for SFTP: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        return Err(format!(
            "SFTP error (exit {}): {}",
            output.status.code().unwrap_or(-1),
            stderr
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Parse a single line from SFTP ls -la output
fn parse_sftp_line(line: &str) -> Option<FtpFileEntry> {
    let line = line.trim();
    if line.is_empty() || line.starts_with("sftp>") || line.starts_with("total ") {
        return None;
    }
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 9 {
        return None;
    }
    let perms = parts[0];
    if perms.len() < 9 || !perms.chars().next().is_some_and(|c| "d-lcbsp".contains(c)) {
        return None;
    }
    let is_dir = perms.starts_with('d');
    let size: u64 = parts[4].parse().unwrap_or(0);
    let name = parts[8..].join(" ");
    if name == "." || name == ".." {
        return None;
    }
    Some(FtpFileEntry { name, is_dir, size })
}

#[tauri::command]
pub async fn sftp_test_connection(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
) -> Result<String, String> {
    validate_sftp_user_host(&host)?;
    validate_sftp_user_host(&user)?;
    tokio::task::spawn_blocking(move || {
        let cmd = build_sftp_command(
            &host,
            port,
            &user,
            &auth_type,
            password.as_deref(),
            key_path.as_deref(),
        );
        let output = execute_sftp_commands(cmd, "pwd\n")?;
        Ok(output.trim().to_string())
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
pub async fn sftp_list_dir(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
    path: String,
) -> Result<Vec<FtpFileEntry>, String> {
    validate_sftp_user_host(&host)?;
    validate_sftp_user_host(&user)?;
    validate_sftp_path(&path)?;
    tokio::task::spawn_blocking(move || {
        let cmd = build_sftp_command(
            &host,
            port,
            &user,
            &auth_type,
            password.as_deref(),
            key_path.as_deref(),
        );
        let sftp_cmds = format!("cd \"{}\"\nls -la\n", path);
        let output = execute_sftp_commands(cmd, &sftp_cmds)?;

        let entries = output.lines().filter_map(parse_sftp_line).collect();

        Ok(entries)
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sftp_download_file(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    validate_sftp_user_host(&host)?;
    validate_sftp_user_host(&user)?;
    validate_sftp_path(&remote_path)?;
    validate_sftp_path(&local_path)?;
    tokio::task::spawn_blocking(move || {
        let cmd = build_sftp_command(
            &host,
            port,
            &user,
            &auth_type,
            password.as_deref(),
            key_path.as_deref(),
        );
        let sftp_cmds = format!("get \"{}\" \"{}\"\n", remote_path, local_path);
        execute_sftp_commands(cmd, &sftp_cmds)?;
        Ok(())
    })
    .await
    .map_err(to_string_err)?
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sftp_upload_file(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    validate_sftp_user_host(&host)?;
    validate_sftp_user_host(&user)?;
    validate_sftp_path(&local_path)?;
    validate_sftp_path(&remote_path)?;
    tokio::task::spawn_blocking(move || {
        let cmd = build_sftp_command(
            &host,
            port,
            &user,
            &auth_type,
            password.as_deref(),
            key_path.as_deref(),
        );
        let sftp_cmds = format!("put \"{}\" \"{}\"\n", local_path, remote_path);
        execute_sftp_commands(cmd, &sftp_cmds)?;
        Ok(())
    })
    .await
    .map_err(to_string_err)?
}
