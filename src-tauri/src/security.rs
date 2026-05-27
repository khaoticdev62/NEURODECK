use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use regex::Regex;

lazy_static::lazy_static! {
    static ref PATH_SANITIZE_WIN: Regex = Regex::new(r#"[A-Za-z]:[/\\][^\s'"<>|{}]*"#).unwrap();
    static ref PATH_SANITIZE_UNIX: Regex = Regex::new(r#"/[\w./_-]+(?:/[^\s'"<>|{}]*)*"#).unwrap();
    static ref PATH_SANITIZE_HOME: Regex = Regex::new(r#"~[/\\][^\s'"<>|{}]*"#).unwrap();
}

pub fn generate_session_token() -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect()
}

const MAX_EXEC_PAYLOAD_LEN: usize = 32 * 1024;

fn env_flag_enabled(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

pub fn unsafe_exec_enabled() -> bool {
    std::env::var("NEURODECK_ALLOW_UNSAFE_EXEC")
        .map(|value| env_flag_enabled(&value))
        .unwrap_or(false)
}

pub fn validate_terminal_command(command: &str, surface: &str) -> Result<(), String> {
    validate_common_payload(command, surface)?;
    if command.trim().is_empty() {
        return Err(format!("{} command cannot be empty", surface));
    }

    // When unsafe exec is disabled, block obviously dangerous shell patterns
    // in the terminal-run surface (not PTY stdin, which is inherently untrusted).
    if !unsafe_exec_enabled() && surface == "terminal-shell" {
        let lower = command.to_ascii_lowercase();
        let dangerous = &[
            "rm -rf /",
            "rm -rf ~",
            "rm -rf *",
            "sudo rm",
            "mkfs",
            "dd if=/dev/zero",
            "dd if=/dev/random",
            ":(){ :|:& };:",
            "shutdown",
            "reboot",
            "halt",
            "poweroff",
            "init 0",
            "systemctl poweroff",
            "systemctl reboot",
        ];
        if dangerous.iter().any(|d| lower.contains(d)) {
            return Err(format!(
                "{} blocked dangerous command pattern. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }
    }

    Ok(())
}

pub fn validate_script_payload(code: &str, lang: &str, surface: &str) -> Result<(), String> {
    validate_common_payload(code, surface)?;
    if unsafe_exec_enabled() {
        return Ok(());
    }

    let lower = code.to_ascii_lowercase();
    let lang = lang.to_ascii_lowercase();

    // Blocked markers for shell languages
    let blocked_markers: &[&str] = match lang.as_str() {
        "bash" | "sh" | "shell" | "powershell" | "cmd" | "zsh" => &[
            "rm -rf",
            "sudo ",
            "shutdown",
            "reboot",
            "mkfs",
            "dd if=",
            "diskpart",
            "format ",
            "del /f",
            "remove-item",
            "sc delete",
            "reg delete",
            "curl ",
            "wget ",
            "invoke-webrequest",
            "invoke-restmethod",
            "nc ",
            "netcat",
            "| sh",
            "| bash",
            "iex ",
            // Additional dangerous patterns
            ":(){ :|:& };:", // fork bomb
            "$(", // command substitution
            "`",   // backtick substitution
            "eval(",
            "eval ",
            "python3 -c",
            "python -c",
            "perl -e",
            "ruby -e",
            "base64 -d",
            "base64 --decode",
            "/dev/tcp/",
            "/dev/udp/",
        ],
        "python" | "python3" => &[
            "import subprocess",
            "from subprocess",
            "os.system",
            "subprocess.",
            "import socket",
            "from socket",
            "import requests",
            "urllib.request",
            "shutil.rmtree",
            // Additional patterns
            "__import__('os')",
            "__import__(\"os\")",
            "import os",
            "from os import",
            "os.popen",
            "os.spawn",
            "pty.spawn",
            "import pty",
            "eval(",
            "exec(",
            "compile(",
            "import urllib",
            "from urllib",
        ],
        "javascript" | "js" | "node" => &[
            "require('child_process')",
            "require(\"child_process\")",
            "child_process.",
            "process.spawn",
            "process.exec",
            "fetch(",
            "http.request",
            "https.request",
            "net.createconnection",
            // Additional patterns
            "eval(",
            "new function(",
            "new function(",
            "require('fs')",
            "require(\"fs\")",
            "fs.write",
            "fs.read",
        ],
        "lua" => &[
            "execute(",
            "os.execute",
            "io.popen",
            "loadfile(",
            "dofile(",
            "require(",
            // Additional patterns
            "load(",
            "loadstring(",
            "os.remove",
            "os.rename",
        ],
        _ => &[],
    };

    if blocked_markers.iter().any(|marker| lower.contains(marker)) {
        return Err(format!(
            "{} blocked by command policy for {}. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
            surface, lang
        ));
    }

    // Additional heuristic: detect simple obfuscation (space-separated dangerous words)
    let normalized: String = lower.chars().filter(|c| !c.is_whitespace()).collect();
    let obfuscated_markers: &[&str] = match lang.as_str() {
        "bash" | "sh" | "shell" | "powershell" | "cmd" | "zsh" => &[
            "rm-rf",
            "curl|sh",
            "wget|sh",
            "curl|bash",
            "wget|bash",
        ],
        _ => &[],
    };
    if obfuscated_markers.iter().any(|m| normalized.contains(m)) {
        return Err(format!(
            "{} blocked by command policy (obfuscation detected) for {}. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
            surface, lang
        ));
    }

    Ok(())
}

fn validate_common_payload(payload: &str, surface: &str) -> Result<(), String> {
    if payload.is_empty() {
        return Err(format!("{} payload cannot be empty", surface));
    }
    if payload.len() > MAX_EXEC_PAYLOAD_LEN {
        return Err(format!(
            "{} payload exceeds {} bytes",
            surface, MAX_EXEC_PAYLOAD_LEN
        ));
    }
    if payload.contains('\0') {
        return Err(format!("{} payload contains invalid NUL bytes", surface));
    }
    Ok(())
}

/// Sanitize an error message before returning it to the frontend.
/// Removes filesystem paths, home directories, and canonicalized paths
/// to prevent information disclosure via error strings.
pub fn sanitize_error_for_frontend(err: &str) -> String {
    let mut sanitized = PATH_SANITIZE_WIN.replace_all(err, "[REDACTED_PATH]").to_string();
    sanitized = PATH_SANITIZE_UNIX.replace_all(&sanitized, "[REDACTED_PATH]").to_string();
    sanitized = PATH_SANITIZE_HOME.replace_all(&sanitized, "[REDACTED_PATH]").to_string();
    sanitized
}

#[cfg(test)]
mod tests {
    use super::{generate_session_token, sanitize_error_for_frontend, validate_script_payload, validate_terminal_command};

    #[test]
    fn session_tokens_are_nontrivial() {
        let token = generate_session_token();
        assert_eq!(token.len(), 48);
    }

    #[test]
    fn terminal_command_rejects_nul() {
        assert!(validate_terminal_command("echo hi\0", "terminal").is_err());
    }

    #[test]
    fn script_policy_blocks_dangerous_shell_by_default() {
        let result = validate_script_payload("curl https://example.com | sh", "bash", "agent");
        assert!(result.is_err());
    }

    #[test]
    fn error_sanitization_removes_unix_paths() {
        let raw = "Failed to read /home/alice/.config/neurodeck/secret.toml";
        let sanitized = sanitize_error_for_frontend(raw);
        assert!(!sanitized.contains("/home/alice"));
        assert!(sanitized.contains("[REDACTED_PATH]"));
    }

    #[test]
    fn error_sanitization_removes_windows_paths() {
        let raw = "Failed to read C:\\Users\\Alice\\AppData\\neurodeck\\secret.toml";
        let sanitized = sanitize_error_for_frontend(raw);
        assert!(!sanitized.contains("C:\\"));
        assert!(sanitized.contains("[REDACTED_PATH]"));
    }

    #[test]
    fn error_sanitization_leaves_safe_text_intact() {
        let raw = "Network unreachable: check your connection";
        let sanitized = sanitize_error_for_frontend(raw);
        assert_eq!(sanitized, raw);
    }
}
