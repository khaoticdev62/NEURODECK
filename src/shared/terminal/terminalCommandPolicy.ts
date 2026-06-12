import type { TerminalCommandSafety, TerminalSafetyLevel, TerminalSafetySource } from "./terminalSafetyTypes";

const SAFE_PREFIXES = [
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

const CONFIRM_PATTERNS: Array<[RegExp, string]> = [
  [/\b(npm|pnpm|yarn|bun)\s+(install|add)\b/i, "Package install requires confirmation."],
  [/\bpip(\d+)?\s+install\b/i, "Python package installation requires confirmation."],
  [/\bcargo\s+add\b/i, "Cargo dependency changes require confirmation."],
  [/\bgo\s+get\b/i, "Go module changes require confirmation."],
  [/\bgit\s+(pull|checkout|merge)\b/i, "Git history-changing actions require confirmation."],
  [/\bchmod\s+\+x\b/i, "Executable bit changes require confirmation."],
  [/\b(openvpn|wg-quick|nmcli|systemctl)\b/i, "System network actions require confirmation."],
];

const DANGEROUS_PATTERNS: Array<[RegExp, string]> = [
  [/\brm\s+-rf\b/i, "Recursive deletion is dangerous."],
  [/\brmdir\b/i, "Directory removal can be destructive."],
  [/\bdel(\.exe)?\b/i, "Deletion command is dangerous."],
  [/\bgit\s+reset\s+--hard\b/i, "Hard reset can destroy work."],
  [/\bgit\s+clean\b/i, "Git clean can delete untracked files."],
  [/\bchmod\s+-R\s+777\b/i, "Recursive world-writable permissions are dangerous."],
  [/\bchown\s+-R\b/i, "Recursive ownership changes require strong confirmation."],
  [/\bdd\s+if=/i, "Raw disk writes are dangerous."],
  [/\bmkfs(\.\w+)?\b/i, "Filesystem formatting is dangerous."],
  [/\bcurl\s+.+\|\s*sh\b/i, "Piping remote scripts into a shell is dangerous."],
  [/\bwget\s+.+\|\s*sh\b/i, "Piping remote scripts into a shell is dangerous."],
  [/\bcat\s+~\/\.ssh\/id_rsa\b/i, "Private key reads are blocked."],
  [/\bcat\s+\.env\b/i, "Secret file reads are blocked."],
];

const BLOCKED_PATTERNS: Array<[RegExp, string]> = [
  [/rm\s+-rf\s+\/\s*$/i, "Refusing to remove the root filesystem."],
  [/sudo\s+rm\s+-rf\s+\/\s*$/i, "Refusing to escalate destructive root removal."],
  [/\|\s*(bash|sh|zsh|fish)\b/i, "Pipes to a shell are blocked."],
  [/\$\([^\n]*\)/, "Command substitution is blocked in safety-reviewed commands."],
  [/`[^`]+`/, "Backtick command substitution is blocked in safety-reviewed commands."],
  [/\n.*\n/, "Multi-line command chaining is blocked for reviewed commands."],
  [/\bfork\s+bomb\b/i, "Fork bombs are blocked."],
  [/\b(history|env)\s*(\||;|&&)/i, "History or environment exfiltration is blocked."],
];

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function hasSafePrefix(command: string) {
  return SAFE_PREFIXES.some((prefix) => command === prefix || command.startsWith(prefix));
}

function firstMatch(command: string, patterns: Array<[RegExp, string]>) {
  for (const [pattern, reason] of patterns) {
    if (pattern.test(command)) return { pattern: pattern.source, reason };
  }
  return null;
}

export function classifyTerminalCommand(
  command: string,
  source: TerminalSafetySource = "palette"
): TerminalCommandSafety {
  const trimmed = normalize(command);
  if (!trimmed) {
    return { level: "unknown", reason: "Empty command.", source };
  }

  const blocked = firstMatch(trimmed, BLOCKED_PATTERNS);
  if (blocked) {
    return { level: "blocked", reason: blocked.reason, matchedPattern: blocked.pattern, source };
  }

  const dangerous = firstMatch(trimmed, DANGEROUS_PATTERNS);
  if (dangerous) {
    return { level: "dangerous", reason: dangerous.reason, matchedPattern: dangerous.pattern, source };
  }

  const confirm = firstMatch(trimmed, CONFIRM_PATTERNS);
  if (confirm) {
    return { level: "confirm", reason: confirm.reason, matchedPattern: confirm.pattern, source };
  }

  if (hasSafePrefix(trimmed)) {
    return { level: "safe", reason: "Matched an allowlisted command prefix.", source };
  }

  return {
    level: "unknown",
    reason: "Command is not recognized by the safety allowlist.",
    source,
  };
}

export function requiresConfirmation(level: TerminalSafetyLevel) {
  return level === "confirm" || level === "dangerous";
}

