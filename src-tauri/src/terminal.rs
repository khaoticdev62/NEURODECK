use crate::pty_manager::PtyState;
use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Instant;

#[derive(Clone, Serialize)]
pub struct TerminalEnvironmentProbe {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub status: String,
}

#[derive(Clone, Serialize)]
pub struct TerminalEnvironmentReport {
    pub platform: String,
    pub arch: String,
    pub steam_deck_host: bool,
    pub cwd: String,
    pub shell: String,
    pub probes: Vec<TerminalEnvironmentProbe>,
    pub missing_tools: Vec<String>,
    pub ready_profiles: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct TerminalProfileAvailability {
    pub id: String,
    pub name: String,
    pub description: String,
    pub platform: String,
    pub shell_path: String,
    pub shell_args: Vec<String>,
    pub cwd_strategy: String,
    pub shell_available: bool,
    pub shell_status: String,
    pub detected_path: Option<String>,
    pub production_ready: bool,
}

#[derive(Clone, Serialize)]
pub struct TerminalSessionSummary {
    pub id: String,
    pub title: String,
    pub shell: String,
    pub cwd: String,
    pub profile_id: Option<String>,
    pub tab_id: Option<String>,
    pub pane_id: Option<String>,
    pub cols: u16,
    pub rows: u16,
    pub spawned_at: String,
    pub uptime_secs: u64,
    pub bytes_in: usize,
    pub bytes_out: usize,
    pub state: String,
}

#[derive(Clone, Serialize)]
pub struct TerminalDiagnosticsReport {
    pub session_count: usize,
    pub active_session_count: usize,
    pub active_sessions: Vec<TerminalSessionSummary>,
    pub environment: TerminalEnvironmentReport,
    pub safety_level: String,
    pub warnings: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct CommandSafetyVerdict {
    pub level: String,
    pub reason: String,
    pub matched_pattern: Option<String>,
    pub source: String,
}

fn command_exists(command: &str) -> bool {
    if command.is_empty() {
        return false;
    }

    if cfg!(target_os = "windows") {
        Command::new("where")
            .arg(command)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    } else {
        Command::new("sh")
            .arg("-lc")
            .arg(format!("command -v {} >/dev/null 2>&1", command))
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
}

fn probe(name: &str, path: &str) -> TerminalEnvironmentProbe {
    let exists = command_exists(path);
    TerminalEnvironmentProbe {
        name: name.to_string(),
        path: path.to_string(),
        exists,
        status: if exists { "detected".into() } else { "missing".into() },
    }
}

pub fn detect_terminal_environment() -> TerminalEnvironmentReport {
    let platform = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let cwd = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .display()
        .to_string();
    let shell = std::env::var("SHELL")
        .or_else(|_| std::env::var("COMSPEC"))
        .unwrap_or_else(|_| String::from("unknown"));
    let steam_deck_host = platform == "linux"
        && std::fs::read_to_string("/etc/os-release")
            .ok()
            .map(|text| text.to_lowercase().contains("steamos"))
            .unwrap_or(false);

    let probes = vec![
        probe("Bash", "/bin/bash"),
        probe("Zsh", "/bin/zsh"),
        probe("Fish", "/usr/bin/fish"),
        probe("Sh", "/bin/sh"),
        probe("PowerShell", "powershell.exe"),
        probe("PowerShell Core", "pwsh"),
        probe("Cmd", "cmd.exe"),
        probe("Git", "git"),
        probe("Node", "node"),
        probe("Npm", "npm"),
        probe("Python", "python3"),
        probe("Cargo", "cargo"),
        probe("Go", "go"),
        probe("Lua", "lua"),
        probe("OpenVPN", "openvpn"),
        probe("WireGuard", "wg"),
        probe("WG-Quick", "wg-quick"),
        probe("NetworkManager", "nmcli"),
        probe("Fallow", "fallow"),
    ];

    let missing_tools = probes
        .iter()
        .filter(|probe| !probe.exists)
        .map(|probe| probe.name.clone())
        .collect::<Vec<_>>();

    let ready_profiles = probes
        .iter()
        .filter(|probe| probe.exists)
        .map(|probe| probe.name.clone())
        .collect::<Vec<_>>();

    let mut warnings = Vec::new();
    if steam_deck_host {
        warnings.push("Steam Deck host detected".to_string());
    }
    if missing_tools.iter().any(|tool| tool == "OpenVPN") {
        warnings.push("OpenVPN binary is missing".to_string());
    }
    if missing_tools.iter().any(|tool| tool == "WireGuard") && missing_tools.iter().any(|tool| tool == "WG-Quick") {
        warnings.push("WireGuard runtime is missing".to_string());
    }

    TerminalEnvironmentReport {
        platform,
        arch,
        steam_deck_host,
        cwd,
        shell,
        probes,
        missing_tools,
        ready_profiles,
        warnings,
    }
}

pub fn detect_terminal_profiles() -> Vec<TerminalProfileAvailability> {
    let profiles = vec![
        (
            "steamos-bash",
            "SteamOS Bash",
            "Default Steam Deck shell with project-aware workspace launch.",
            "steamdeck",
            "/bin/bash",
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "linux-sh",
            "Linux Sh",
            "Portable POSIX shell for recovery and low-assumption workflows.",
            "linux",
            "/bin/sh",
            vec![],
            "home",
        ),
        (
            "power-shell",
            "PowerShell",
            "Windows desktop shell profile with explicit confirmation gates.",
            "windows",
            "powershell.exe",
            vec!["-NoLogo".to_string()],
            "home",
        ),
        (
            "read-only-safe-shell",
            "Read-Only Safe Shell",
            "Conservative shell profile for diagnostics and inspection only.",
            "cross_platform",
            "/bin/sh",
            vec![],
            "workspaceRoot",
        ),
    ];

    profiles
        .into_iter()
        .map(|(id, name, description, platform, shell_path, shell_args, cwd_strategy)| {
            let shell_available = command_exists(shell_path);
            TerminalProfileAvailability {
                id: id.to_string(),
                name: name.to_string(),
                description: description.to_string(),
                platform: platform.to_string(),
                shell_path: shell_path.to_string(),
                shell_args,
                cwd_strategy: cwd_strategy.to_string(),
                shell_available,
                shell_status: if shell_available { "ready".into() } else { "missing_shell_binary".into() },
                detected_path: if shell_available { Some(shell_path.to_string()) } else { None },
                production_ready: shell_available,
            }
        })
        .collect()
}

pub fn list_terminal_sessions(state: Arc<PtyState>) -> Vec<TerminalSessionSummary> {
    let sessions = state.sessions.lock().unwrap_or_else(|e| e.into_inner());
    let now = Instant::now();
    sessions
        .iter()
        .map(|(id, session)| {
            let size = session.size.lock().unwrap_or_else(|e| e.into_inner());
            TerminalSessionSummary {
                id: id.clone(),
                title: session.title.clone(),
                shell: session.shell.clone(),
                cwd: session.cwd.clone(),
                profile_id: session.profile_id.clone(),
                tab_id: session.tab_id.clone(),
                pane_id: session.pane_id.clone(),
                cols: size.0,
                rows: size.1,
                spawned_at: session.created_at.clone(),
                uptime_secs: now.duration_since(session.spawned_at).as_secs(),
                bytes_in: session.bytes_in.load(Ordering::Relaxed),
                bytes_out: session.bytes_out.load(Ordering::Relaxed),
                state: "running".into(),
            }
        })
        .collect()
}

pub fn classify_terminal_command(command: &str, source: &str) -> CommandSafetyVerdict {
    let trimmed = command.trim().replace('\n', " ");
    if trimmed.is_empty() {
        return CommandSafetyVerdict {
            level: "unknown".into(),
            reason: "Empty command.".into(),
            matched_pattern: None,
            source: source.to_string(),
        };
    }

    let blocked = [
        (r"rm\s+-rf\s+/\s*$", "Refusing to remove the root filesystem."),
        (r"sudo\s+rm\s+-rf\s+/\s*$", "Refusing to escalate destructive root removal."),
        (r"\|\s*(bash|sh|zsh|fish)\b", "Pipes to a shell are blocked."),
        (r"\$\([^\n]*\)", "Command substitution is blocked in reviewed commands."),
        (r"`[^`]+`", "Backtick command substitution is blocked in reviewed commands."),
        (r"\bfork\s+bomb\b", "Fork bombs are blocked."),
    ];
    for (pattern, reason) in blocked {
        let regex = regex::Regex::new(pattern).unwrap();
        if regex.is_match(&trimmed) {
            return CommandSafetyVerdict {
                level: "blocked".into(),
                reason: reason.into(),
                matched_pattern: Some(pattern.into()),
                source: source.to_string(),
            };
        }
    }

    let dangerous = [
        (r"\brm\s+-rf\b", "Recursive deletion is dangerous."),
        (r"\bgit\s+reset\s+--hard\b", "Hard reset can destroy work."),
        (r"\bgit\s+clean\b", "Git clean can delete untracked files."),
        (r"\bchmod\s+-R\s+777\b", "Recursive world-writable permissions are dangerous."),
        (r"\bdd\s+if=", "Raw disk writes are dangerous."),
        (r"\bmkfs(\.\w+)?\b", "Filesystem formatting is dangerous."),
        (r"\bcurl\s+.+\|\s*sh\b", "Piping remote scripts into a shell is dangerous."),
        (r"\bwget\s+.+\|\s*sh\b", "Piping remote scripts into a shell is dangerous."),
        (r"\bcat\s+~\/\.ssh\/id_rsa\b", "Private key reads are blocked."),
        (r"\bcat\s+\.env\b", "Secret file reads are blocked."),
    ];
    for (pattern, reason) in dangerous {
        let regex = regex::Regex::new(pattern).unwrap();
        if regex.is_match(&trimmed) {
            return CommandSafetyVerdict {
                level: "dangerous".into(),
                reason: reason.into(),
                matched_pattern: Some(pattern.into()),
                source: source.to_string(),
            };
        }
    }

    let confirm = [
        (r"\b(npm|pnpm|yarn|bun)\s+(install|add)\b", "Package install requires confirmation."),
        (r"\bpip(\d+)?\s+install\b", "Python package installation requires confirmation."),
        (r"\bcargo\s+add\b", "Cargo dependency changes require confirmation."),
        (r"\bgo\s+get\b", "Go module changes require confirmation."),
        (r"\bgit\s+(pull|checkout|merge)\b", "Git history-changing actions require confirmation."),
        (r"\bchmod\s+\+x\b", "Executable bit changes require confirmation."),
        (r"\b(openvpn|wg-quick|nmcli|systemctl)\b", "System network actions require confirmation."),
    ];
    for (pattern, reason) in confirm {
        let regex = regex::Regex::new(pattern).unwrap();
        if regex.is_match(&trimmed) {
            return CommandSafetyVerdict {
                level: "confirm".into(),
                reason: reason.into(),
                matched_pattern: Some(pattern.into()),
                source: source.to_string(),
            };
        }
    }

    let safe_prefixes = [
        "pwd",
        "ls",
        "dir",
        "cd ",
        "cat ",
        "less ",
        "more ",
        "grep ",
        "rg ",
        "find ",
        "git status",
        "git diff",
        "git branch",
        "git log",
        "python --version",
        "python3 --version",
        "node --version",
        "npm run ",
        "pnpm run ",
        "yarn run ",
        "bun run ",
        "cargo check",
        "cargo test",
        "cargo build",
        "go test ",
        "go build ",
        "lua ",
        "luajit ",
        "npx tsc",
        "npx eslint",
        "npx prettier",
    ];
    if safe_prefixes.iter().any(|prefix| trimmed == *prefix || trimmed.starts_with(prefix)) {
        return CommandSafetyVerdict {
            level: "safe".into(),
            reason: "Matched an allowlisted command prefix.".into(),
            matched_pattern: None,
            source: source.to_string(),
        };
    }

    CommandSafetyVerdict {
        level: "unknown".into(),
        reason: "Command is not recognized by the safety allowlist.".into(),
        matched_pattern: None,
        source: source.to_string(),
    }
}
