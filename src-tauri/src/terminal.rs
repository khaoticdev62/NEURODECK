use crate::pty_manager::PtyState;
use serde::Serialize;
use std::path::PathBuf;
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct TerminalDiagnosticsReport {
    pub session_count: usize,
    pub active_session_count: usize,
    pub active_sessions: Vec<TerminalSessionSummary>,
    pub environment: TerminalEnvironmentReport,
    pub safety_level: String,
    pub warnings: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandSafetyVerdict {
    pub level: String,
    pub reason: String,
    pub matched_pattern: Option<String>,
    pub source: String,
}

fn command_exists(command: &str) -> bool {
    resolve_command_path(command).is_some()
}

fn resolve_command_path(command: &str) -> Option<String> {
    if command.is_empty() {
        return None;
    }

    let is_windows = cfg!(target_os = "windows");
    let extensions = if is_windows {
        vec!["", ".exe", ".cmd", ".bat", ".com"]
    } else {
        vec![""]
    };

    let check_file = |path: PathBuf| -> Option<String> {
        if path.is_file() {
            return Some(path.to_string_lossy().to_string());
        }
        None
    };

    let path_buf = PathBuf::from(command);

    if path_buf.is_absolute() || command.contains('/') || (is_windows && command.contains('\\')) {
        for ext in &extensions {
            let mut test_path = path_buf.clone();
            if !ext.is_empty() {
                if let Some(file_name) = path_buf.file_name() {
                    let name_str = file_name.to_string_lossy();
                    if !name_str.to_lowercase().ends_with(ext) {
                        let mut new_name = name_str.into_owned();
                        new_name.push_str(ext);
                        test_path.set_file_name(new_name);
                    }
                }
            }
            if let Some(resolved) = check_file(test_path) {
                return Some(resolved);
            }
        }
        return None;
    }

    if let Ok(env_path) = std::env::var("PATH") {
        for path in std::env::split_paths(&env_path) {
            for ext in &extensions {
                let mut file_name = command.to_string();
                if !ext.is_empty() && !file_name.to_lowercase().ends_with(ext) {
                    file_name.push_str(ext);
                }
                let full_path = path.join(&file_name);
                if let Some(resolved) = check_file(full_path) {
                    return Some(resolved);
                }
            }
        }
    }

    None
}

fn probe(name: &str, path: &str) -> TerminalEnvironmentProbe {
    let exists = command_exists(path);
    TerminalEnvironmentProbe {
        name: name.to_string(),
        path: path.to_string(),
        exists,
        status: if exists {
            "detected".into()
        } else {
            "missing".into()
        },
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
        probe("Fish (local)", "/usr/local/bin/fish"),
        probe("Sh", "/bin/sh"),
        probe("WSL", "wsl.exe"),
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
    if missing_tools.iter().any(|tool| tool == "WireGuard")
        && missing_tools.iter().any(|tool| tool == "WG-Quick")
    {
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
    fn resolve_profile_shell(candidates: &[&str]) -> (String, bool, Option<String>) {
        for candidate in candidates {
            if let Some(path) = resolve_command_path(candidate) {
                return ((*candidate).to_string(), true, Some(path));
            }
        }
        (
            candidates.first().copied().unwrap_or("").to_string(),
            false,
            None,
        )
    }

    let profiles =
        vec![
        (
            "linux-bash",
            "Linux Bash",
            "Standard Linux Bash login shell for general development workflows.",
            "linux",
            vec!["/bin/bash", "bash"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "linux-zsh",
            "Linux Zsh",
            "Zsh login shell for Linux with Oh-My-Zsh and plugin support.",
            "linux",
            vec!["/bin/zsh", "zsh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "fish-shell",
            "Fish Shell",
            "Friendly interactive shell with smart completions and syntax highlighting.",
            "linux",
            vec!["/usr/bin/fish", "/usr/local/bin/fish", "fish"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "macos-zsh",
            "macOS Zsh",
            "Default macOS system shell. Z shell with macOS environment and Homebrew paths.",
            "macos",
            vec!["/bin/zsh", "zsh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "macos-bash",
            "macOS Bash",
            "macOS Bash login shell. Useful for legacy scripts and compatibility with bash 3.2.",
            "macos",
            vec!["/bin/bash", "bash"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "wsl-bash",
            "WSL Bash",
            "Windows Subsystem for Linux Bash. Runs a full Linux environment inside Windows.",
            "windows",
            vec!["wsl.exe"],
            vec!["bash".to_string(), "--login".to_string()],
            "home",
        ),
        (
            "steamos-bash",
            "SteamOS Bash",
            "Default Steam Deck shell with project-aware workspace launch.",
            "steamdeck",
            vec!["/bin/bash", "bash"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "steamos-zsh",
            "SteamOS Zsh",
            "Steam Deck Zsh profile for users with custom shell setups.",
            "steamdeck",
            vec!["/bin/zsh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "linux-sh",
            "Linux Sh",
            "Portable POSIX shell for recovery and low-assumption workflows.",
            "linux",
            vec!["/bin/sh", "sh"],
            vec![],
            "home",
        ),
        (
            "power-shell",
            "PowerShell",
            "Windows desktop shell profile with explicit confirmation gates.",
            "windows",
            vec!["powershell.exe"],
            vec!["-NoLogo".to_string()],
            "home",
        ),
        (
            "power-shell-core",
            "PowerShell Core",
            "Cross-platform PowerShell profile for modern automation flows.",
            "windows",
            vec!["pwsh", "pwsh.exe"],
            vec!["-NoLogo".to_string()],
            "workspaceRoot",
        ),
        (
            "windows-cmd",
            "Windows CMD",
            "Minimal Windows command prompt profile for compatibility work.",
            "windows",
            vec!["cmd.exe"],
            vec!["/Q".to_string()],
            "workspaceRoot",
        ),
        (
            "git-bash",
            "Git Bash",
            "Git for Windows Bash profile for Unix-oriented workflows.",
            "windows",
            vec!["bash.exe"],
            vec!["--login".to_string(), "-i".to_string()],
            "workspaceRoot",
        ),
        (
            "developer-shell",
            "Developer Shell",
            "General-purpose development profile with workspace env injection.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "project-shell",
            "Project Shell",
            "Launches in the active project root for repo-local commands.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "projectRoot",
        ),
        (
            "python-env-shell",
            "Python Env Shell",
            "Project-root shell intended for Python virtualenv and test flows.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "projectRoot",
        ),
        (
            "node-project-shell",
            "Node Project Shell",
            "Project-root shell tuned for npm, pnpm, yarn, and bun workflows.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "projectRoot",
        ),
        (
            "rust-project-shell",
            "Rust Project Shell",
            "Project-root shell for cargo, clippy, fmt, and test loops.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "projectRoot",
        ),
        (
            "go-project-shell",
            "Go Project Shell",
            "Project-root shell for go build, test, fmt, and module maintenance.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "projectRoot",
        ),
        (
            "lua-hermes-shell",
            "Lua/Hermes Shell",
            "Plugin and Lua automation shell for validation and repair flows.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "security-tools-shell",
            "Security Tools Shell",
            "Auditing profile for diagnostics, scanning, and hardened inspection tasks.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "vpn-network-tools-shell",
            "VPN/Network Tools Shell",
            "Networking profile for route checks, proxy diagnostics, and VPN verification.",
            "cross_platform",
            vec!["/bin/bash", "bash", "pwsh", "powershell.exe", "cmd.exe", "/bin/sh", "sh"],
            vec!["--login".to_string()],
            "workspaceRoot",
        ),
        (
            "read-only-safe-shell",
            "Read-Only Safe Shell",
            "Conservative shell profile for diagnostics and inspection only.",
            "cross_platform",
            vec!["/bin/sh", "sh", "powershell.exe", "cmd.exe"],
            vec![],
            "workspaceRoot",
        ),
    ];

    profiles
        .into_iter()
        .map(
            |(id, name, description, platform, shell_candidates, shell_args, cwd_strategy)| {
                let (shell_path, shell_available, detected_path) =
                    resolve_profile_shell(&shell_candidates);
                TerminalProfileAvailability {
                    id: id.to_string(),
                    name: name.to_string(),
                    description: description.to_string(),
                    platform: platform.to_string(),
                    shell_path: shell_path.to_string(),
                    shell_args,
                    cwd_strategy: cwd_strategy.to_string(),
                    shell_available,
                    shell_status: if shell_available {
                        "ready".into()
                    } else {
                        "missing_shell_binary".into()
                    },
                    detected_path,
                    production_ready: shell_available,
                }
            },
        )
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
        (
            r"rm\s+-rf\s+/\s*$",
            "Refusing to remove the root filesystem.",
        ),
        (
            r"sudo\s+rm\s+-rf\s+/\s*$",
            "Refusing to escalate destructive root removal.",
        ),
        (
            r"\|\s*(bash|sh|zsh|fish)\b",
            "Pipes to a shell are blocked.",
        ),
        (
            r"\$\([^\n]*\)",
            "Command substitution is blocked in reviewed commands.",
        ),
        (
            r"`[^`]+`",
            "Backtick command substitution is blocked in reviewed commands.",
        ),
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
        (
            r"\bchmod\s+-R\s+777\b",
            "Recursive world-writable permissions are dangerous.",
        ),
        (r"\bdd\s+if=", "Raw disk writes are dangerous."),
        (r"\bmkfs(\.\w+)?\b", "Filesystem formatting is dangerous."),
        (
            r"\bcurl\s+.+\|\s*sh\b",
            "Piping remote scripts into a shell is dangerous.",
        ),
        (
            r"\bwget\s+.+\|\s*sh\b",
            "Piping remote scripts into a shell is dangerous.",
        ),
        (
            r"\bcat\s+~\/\.ssh\/id_rsa\b",
            "Private key reads are blocked.",
        ),
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
        (
            r"\b(npm|pnpm|yarn|bun)\s+(install|add)\b",
            "Package install requires confirmation.",
        ),
        (
            r"\bpip(\d+)?\s+install\b",
            "Python package installation requires confirmation.",
        ),
        (
            r"\bcargo\s+add\b",
            "Cargo dependency changes require confirmation.",
        ),
        (r"\bgo\s+get\b", "Go module changes require confirmation."),
        (
            r"\bgit\s+(pull|checkout|merge)\b",
            "Git history-changing actions require confirmation.",
        ),
        (
            r"\bchmod\s+\+x\b",
            "Executable bit changes require confirmation.",
        ),
        (
            r"\b(openvpn|wg-quick|nmcli|systemctl)\b",
            "System network actions require confirmation.",
        ),
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
    if safe_prefixes
        .iter()
        .any(|prefix| trimmed == *prefix || trimmed.starts_with(prefix))
    {
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
