// terminal_gamepad.js — Terminal Controller Mode
// Self-contained ES module. Intercepts gamepad input when the terminal view is active,
// maps buttons to PTY key sequences, and drives the Terminal Command Picker overlay.
// Architecture mirrors ctrl_prompt.js — exported guards + handlers called by main.js.

import { state } from "./state.js";
import { invoke } from "./neurobridge.js";
import { createIcon } from "./icons.js";
import { FocusTrap } from "./focus-trap.js";
import { triggerHaptic } from "./haptics.js";
import { addNotification } from "./notifications.js";
import { createTerminalSession } from "./terminal.js";

// ─── Module state ─────────────────────────────────────────────────────────────
let _pickerVisible = false;
let _pickerTemplateMode = false;
let _pickerCatIdx = 0;
let _pickerListIdx = 0;
let _pickerFiltered = [];
let _pickerTemplateParts = [];
let _pickerPlaceholderIdx = 0;
let _pickerFocusTrap = null;

// ─── Category definitions ─────────────────────────────────────────────────────
const TERM_CMD_CATS = [
  { id: "files", icon: "folder", label: "Files", color: "#FFD600" },
  { id: "git", icon: "gitBranch", label: "Git", color: "#00E676" },
  { id: "system", icon: "cpu", label: "System", color: "#29B6F6" },
  { id: "network", icon: "wifi", label: "Network", color: "#FF7043" },
  { id: "devtools", icon: "code", label: "Dev Tools", color: "#AB47BC" },
  { id: "quickrun", icon: "zap", label: "Quickrun", color: "#00E5FF" },
];

// ─── Placeholder option dictionary ───────────────────────────────────────────
const PLACEHOLDER_OPTIONS = {
  PATTERN: ["*.log", "*.ts", "*.rs", "*.json", "*.md", "*.sh"],
  FILE: ["README.md", "package.json", "Cargo.toml", ".env", "main.rs", "index.ts"],
  DIR: [".", "src/", "dist/", "~/", "/tmp/", "/var/log/"],
  PROCESS: ["node", "cargo", "python", "nginx", "systemd", "electron"],
  PORT: ["3000", "8080", "4000", "5000", "443", "80", "9477"],
  SERVICE: ["nginx", "sshd", "docker", "NetworkManager", "steamos-update", "bluetooth"],
  HOST: ["localhost", "192.168.1.1", "10.0.0.1", "github.com", "steamdeck.local"],
  USER: ["deck", "root", "admin", "user"],
  NAMESPACE: ["default", "kube-system", "production", "staging"],
  CONTAINER: ["app", "nginx", "postgres", "redis", "backend"],
  BRANCH: ["main", "master", "develop", "feature/new", "fix/bug", "release/v1"],
  MESSAGE: [
    '"fix: patch issue"',
    '"feat: add feature"',
    '"chore: update deps"',
    '"docs: update readme"',
  ],
  COUNT: ["1", "2", "3", "5", "10"],
  DEST: ["~/Downloads/", "/tmp/", "/home/deck/", "./backup/"],
  SOURCE: ["./src/", "./dist/", "~/Documents/", "/var/log/"],
  ARCHIVE: ["backup", "release", "snapshot", "export"],
  SCRIPT: ["build", "dev", "test", "start", "lint", "check"],
  VAR: ["PATH", "HOME", "USER", "GEMINI_API_VAR", "NODE_ENV", "NEURODECK_PORT"],
  CMD: ["ls", "git", "cargo", "npm", "node", "python3"],
  URL: ["http://localhost:3000", "https://api.github.com", "http://127.0.0.1:9477/health"],
  PATH: [".", "./src", "~/Desktop", "/tmp"],
};

function _getPlaceholderOptions(name) {
  return PLACEHOLDER_OPTIONS[name] || [];
}

// ─── Command library ──────────────────────────────────────────────────────────
const TERM_CMD_LIB = [
  // Files
  {
    id: "f1",
    cat: "files",
    icon: "list",
    title: "List (detailed)",
    cmd: "ls -la",
    desc: "Long listing with permissions, size, and timestamps.",
  },
  {
    id: "f2",
    cat: "files",
    icon: "search",
    title: "Find files",
    cmd: 'find . -name "[PATTERN]" -type f',
    desc: "Recursively find files matching a glob pattern.",
  },
  {
    id: "f3",
    cat: "files",
    icon: "hardDrive",
    title: "Disk usage",
    cmd: "du -sh */ | sort -rh | head -20",
    desc: "Show largest directories sorted by size.",
  },
  {
    id: "f4",
    cat: "files",
    icon: "fileText",
    title: "Cat file",
    cmd: "cat [FILE]",
    desc: "Print file contents to stdout.",
  },
  {
    id: "f5",
    cat: "files",
    icon: "copy",
    title: "Copy",
    cmd: "cp [SOURCE] [DEST]",
    desc: "Copy file or directory.",
  },
  {
    id: "f6",
    cat: "files",
    icon: "arrowRight",
    title: "Move / Rename",
    cmd: "mv [SOURCE] [DEST]",
    desc: "Move or rename a file.",
  },
  {
    id: "f7",
    cat: "files",
    icon: "trash2",
    title: "Remove (force)",
    cmd: "rm -rf [PATH]",
    desc: "Recursively force-remove path. Use carefully.",
  },
  {
    id: "f8",
    cat: "files",
    icon: "archive",
    title: "Tar compress",
    cmd: "tar -czf [ARCHIVE].tar.gz [DIR]/",
    desc: "Create a gzip-compressed archive.",
  },
  {
    id: "f9",
    cat: "files",
    icon: "package",
    title: "Tar extract",
    cmd: "tar -xzf [ARCHIVE]",
    desc: "Extract a .tar.gz archive.",
  },
  {
    id: "f10",
    cat: "files",
    icon: "shield",
    title: "Make executable",
    cmd: "chmod +x [FILE]",
    desc: "Grant execute permission to a file.",
  },

  // Git
  {
    id: "g1",
    cat: "git",
    icon: "gitCommit",
    title: "Status",
    cmd: "git status",
    desc: "Show working tree status and staged changes.",
  },
  {
    id: "g2",
    cat: "git",
    icon: "clock",
    title: "Log (oneline)",
    cmd: "git log --oneline -20",
    desc: "Compact history of last 20 commits.",
  },
  {
    id: "g3",
    cat: "git",
    icon: "fileDiff",
    title: "Diff",
    cmd: "git diff",
    desc: "Show unstaged changes.",
  },
  {
    id: "g4",
    cat: "git",
    icon: "plus",
    title: "Add path",
    cmd: "git add [PATH]",
    desc: "Stage a file or directory.",
  },
  {
    id: "g5",
    cat: "git",
    icon: "check",
    title: "Commit",
    cmd: "git commit -m [MESSAGE]",
    desc: "Create a commit with a message.",
  },
  {
    id: "g6",
    cat: "git",
    icon: "upload",
    title: "Push",
    cmd: "git push origin [BRANCH]",
    desc: "Push branch to remote origin.",
  },
  {
    id: "g7",
    cat: "git",
    icon: "gitBranch",
    title: "New branch",
    cmd: "git checkout -b [BRANCH]",
    desc: "Create and switch to a new branch.",
  },
  {
    id: "g8",
    cat: "git",
    icon: "layers",
    title: "Stash",
    cmd: "git stash",
    desc: "Stash all uncommitted changes.",
  },
  {
    id: "g9",
    cat: "git",
    icon: "download",
    title: "Pull rebase",
    cmd: "git pull --rebase",
    desc: "Fetch and rebase onto upstream.",
  },
  {
    id: "g10",
    cat: "git",
    icon: "rotateCcw",
    title: "Reset commits",
    cmd: "git reset --hard HEAD~[COUNT]",
    desc: "Hard-reset to N commits before HEAD.",
  },

  // System
  {
    id: "s1",
    cat: "system",
    icon: "activity",
    title: "Find process",
    cmd: "ps aux | grep [PROCESS]",
    desc: "List running processes matching name.",
  },
  {
    id: "s2",
    cat: "system",
    icon: "x",
    title: "Kill port",
    cmd: "kill -9 $(lsof -ti :[PORT])",
    desc: "Force-kill whatever is holding a port.",
  },
  {
    id: "s3",
    cat: "system",
    icon: "cpu",
    title: "Memory free",
    cmd: "free -h",
    desc: "Human-readable RAM and swap usage.",
  },
  {
    id: "s4",
    cat: "system",
    icon: "hardDrive",
    title: "Disk free",
    cmd: "df -h",
    desc: "Disk usage across all mounts.",
  },
  {
    id: "s5",
    cat: "system",
    icon: "barChart2",
    title: "Top snapshot",
    cmd: "top -bn1 | head -20",
    desc: "One-shot top output (no interactive).",
  },
  {
    id: "s6",
    cat: "system",
    icon: "server",
    title: "Service status",
    cmd: "systemctl status [SERVICE]",
    desc: "Check systemd service state and logs.",
  },
  {
    id: "s7",
    cat: "system",
    icon: "fileText",
    title: "Service logs",
    cmd: "journalctl -u [SERVICE] -n 50",
    desc: "Last 50 log lines for a systemd service.",
  },
  {
    id: "s8",
    cat: "system",
    icon: "info",
    title: "Kernel version",
    cmd: "uname -r",
    desc: "Print the running kernel version.",
  },
  {
    id: "s9",
    cat: "system",
    icon: "database",
    title: "Block devices",
    cmd: "lsblk",
    desc: "List all block devices and partitions.",
  },
  {
    id: "s10",
    cat: "system",
    icon: "refreshCw",
    title: "SteamOS update",
    cmd: "sudo steamos-update",
    desc: "Trigger a SteamOS system update check.",
  },

  // Network
  {
    id: "n1",
    cat: "network",
    icon: "globe",
    title: "Curl fetch",
    cmd: "curl -s [URL] | head -50",
    desc: "Fetch URL and print first 50 lines.",
  },
  {
    id: "n2",
    cat: "network",
    icon: "list",
    title: "Listening ports",
    cmd: "ss -tulnp | grep LISTEN",
    desc: "Show all ports currently listening.",
  },
  {
    id: "n3",
    cat: "network",
    icon: "radio",
    title: "Ping host",
    cmd: "ping -c 4 [HOST]",
    desc: "Send 4 ICMP pings to a host.",
  },
  {
    id: "n4",
    cat: "network",
    icon: "search",
    title: "Nmap scan",
    cmd: "nmap -sV [HOST]",
    desc: "Version-detect open services on host.",
  },
  {
    id: "n5",
    cat: "network",
    icon: "download",
    title: "Wget download",
    cmd: "wget -O [FILE] [URL]",
    desc: "Download URL to a named file.",
  },
  {
    id: "n6",
    cat: "network",
    icon: "navigation",
    title: "Traceroute",
    cmd: "traceroute [HOST]",
    desc: "Trace the path packets take to host.",
  },
  {
    id: "n7",
    cat: "network",
    icon: "network",
    title: "IP addresses",
    cmd: "ip addr show",
    desc: "Show all network interface IPs.",
  },
  {
    id: "n8",
    cat: "network",
    icon: "wifi",
    title: "Network status",
    cmd: "nmcli device status",
    desc: "NetworkManager device connectivity.",
  },
  {
    id: "n9",
    cat: "network",
    icon: "terminal",
    title: "SSH connect",
    cmd: "ssh [USER]@[HOST]",
    desc: "Open an SSH session to a host.",
  },
  {
    id: "n10",
    cat: "network",
    icon: "upload",
    title: "SCP upload",
    cmd: "scp [FILE] [USER]@[HOST]:[DEST]",
    desc: "Secure-copy a file to a remote host.",
  },

  // Dev Tools
  {
    id: "d1",
    cat: "devtools",
    icon: "check",
    title: "Cargo check",
    cmd: "cargo check",
    desc: "Fast type-check without full compile.",
  },
  {
    id: "d2",
    cat: "devtools",
    icon: "package",
    title: "Cargo build",
    cmd: "cargo build --release",
    desc: "Optimised release build.",
  },
  {
    id: "d3",
    cat: "devtools",
    icon: "flaskConical",
    title: "Cargo test",
    cmd: "cargo test",
    desc: "Run all Rust tests.",
  },
  {
    id: "d4",
    cat: "devtools",
    icon: "play",
    title: "npm run script",
    cmd: "npm run [SCRIPT]",
    desc: "Run a package.json script.",
  },
  {
    id: "d5",
    cat: "devtools",
    icon: "download",
    title: "npm install",
    cmd: "npm install",
    desc: "Install all npm dependencies.",
  },
  {
    id: "d6",
    cat: "devtools",
    icon: "flaskConical",
    title: "pytest",
    cmd: "python3 -m pytest",
    desc: "Run Python tests with pytest.",
  },
  {
    id: "d7",
    cat: "devtools",
    icon: "box",
    title: "Docker ps",
    cmd: "docker ps -a",
    desc: "List all containers (running + stopped).",
  },
  {
    id: "d8",
    cat: "devtools",
    icon: "fileText",
    title: "Docker logs",
    cmd: "docker logs -f [CONTAINER]",
    desc: "Follow container stdout/stderr.",
  },
  {
    id: "d9",
    cat: "devtools",
    icon: "cloud",
    title: "kubectl pods",
    cmd: "kubectl get pods -n [NAMESPACE]",
    desc: "List pods in a Kubernetes namespace.",
  },
  {
    id: "d10",
    cat: "devtools",
    icon: "gitCommit",
    title: "git bisect start",
    cmd: "git bisect start",
    desc: "Begin binary search for a regression.",
  },

  // Quickrun
  {
    id: "q1",
    cat: "quickrun",
    icon: "rotateCw",
    title: "Clear screen",
    cmd: "clear",
    desc: "Clear the terminal output.",
  },
  {
    id: "q2",
    cat: "quickrun",
    icon: "clock",
    title: "History tail",
    cmd: "history | tail -20",
    desc: "Last 20 shell history entries.",
  },
  {
    id: "q3",
    cat: "quickrun",
    icon: "mapPin",
    title: "Working dir",
    cmd: "pwd",
    desc: "Print current working directory.",
  },
  {
    id: "q4",
    cat: "quickrun",
    icon: "search",
    title: "Find env var",
    cmd: "env | grep [VAR]",
    desc: "Search environment variables.",
  },
  {
    id: "q5",
    cat: "quickrun",
    icon: "terminal",
    title: "Which command",
    cmd: "which [CMD]",
    desc: "Locate a command on PATH.",
  },
  {
    id: "q6",
    cat: "quickrun",
    icon: "bookOpen",
    title: "Man page",
    cmd: "man [CMD]",
    desc: "Open the manual page for a command.",
  },
  {
    id: "q7",
    cat: "quickrun",
    icon: "refreshCw",
    title: "Repeat last",
    cmd: "!!",
    desc: "Re-run the previous command.",
  },
  {
    id: "q8",
    cat: "quickrun",
    icon: "shield",
    title: "Sudo repeat",
    cmd: "sudo !!",
    desc: "Re-run last command with sudo.",
  },
  {
    id: "q9",
    cat: "quickrun",
    icon: "arrowLeft",
    title: "Previous dir",
    cmd: "cd -",
    desc: "Switch back to the previous directory.",
  },
  {
    id: "q10",
    cat: "quickrun",
    icon: "logOut",
    title: "Exit shell",
    cmd: "exit",
    desc: "Close the current shell session.",
  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────
function _ptyWrite(data) {
  if (!state.activeTerminalSessionId) return;
  invoke("pty_write", { id: state.activeTerminalSessionId, data }).catch(() => {});
}

function _parseTemplateParts(cmd) {
  const parts = [];
  const re = /\[([A-Z_0-9]+)\]/g;
  let last = 0,
    m;
  while ((m = re.exec(cmd)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: cmd.slice(last, m.index) });
    parts.push({ type: "ph", name: m[1], options: _getPlaceholderOptions(m[1]), optIdx: 0 });
    last = m.index + m[0].length;
  }
  if (last < cmd.length) parts.push({ type: "text", value: cmd.slice(last) });
  return parts;
}

function _getFilledCommand() {
  return _pickerTemplateParts
    .map((p) => {
      if (p.type === "text") return p.value;
      return p.options.length > 0 ? p.options[p.optIdx] : `[${p.name}]`;
    })
    .join("");
}

function _filteredForCat() {
  const cat = TERM_CMD_CATS[_pickerCatIdx];
  return cat ? TERM_CMD_LIB.filter((c) => c.cat === cat.id) : TERM_CMD_LIB;
}

// ─── Overlay DOM construction ─────────────────────────────────────────────────
function _buildOverlayDOM() {
  const el = document.createElement("div");
  el.id = "terminal-cmd-picker-overlay";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Terminal Command Picker");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="tcp-modal" role="document">
      <div class="tcp-header">
        <span class="tcp-header-title">${createIcon("terminal", { size: 14 })} TERMINAL COMMANDS</span>
        <span class="tcp-header-hint">
          <strong>[L1/R1]</strong>&nbsp;Category &nbsp;
          <strong>[↑↓]</strong>&nbsp;Navigate &nbsp;
          <strong>[A]</strong>&nbsp;Run &nbsp;
          <strong>[X]</strong>&nbsp;Paste &nbsp;
          <strong>[B]</strong>&nbsp;Close
        </span>
      </div>
      <div class="tcp-body">
        <div class="tcp-categories" id="tcp-cat-list" role="list" aria-label="Command categories"></div>
        <div class="tcp-list-wrap" id="tcp-cmd-list" role="listbox" aria-label="Commands"></div>
      </div>
      <div class="tcp-footer" id="tcp-footer"></div>
    </div>`;
  document.body.appendChild(el);
  return el;
}

// ─── Render functions ─────────────────────────────────────────────────────────
function _renderCats() {
  const list = document.getElementById("tcp-cat-list");
  if (!list) return;
  list.innerHTML = TERM_CMD_CATS.map((cat, i) => {
    const active = i === _pickerCatIdx;
    return `<button type="button"
      class="tcp-cat-btn${active ? " active" : ""}"
      data-cat-idx="${i}"
      aria-selected="${active}"
      style="${active ? `border-left-color:${cat.color};color:${cat.color};` : ""}"
    >${createIcon(cat.icon, { size: 13 })} ${cat.label}</button>`;
  }).join("");

  list.querySelectorAll(".tcp-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      _pickerCatIdx = parseInt(btn.dataset.catIdx, 10);
      _pickerListIdx = 0;
      _pickerFiltered = _filteredForCat();
      _exitTemplateMode();
      _renderCats();
      _renderList();
    });
  });
}

function _renderList() {
  const wrap = document.getElementById("tcp-cmd-list");
  if (!wrap) return;
  _pickerFiltered = _filteredForCat();
  if (_pickerListIdx >= _pickerFiltered.length) _pickerListIdx = 0;

  const cat = TERM_CMD_CATS[_pickerCatIdx];
  const color = cat ? cat.color : "#5eebff";

  wrap.innerHTML = _pickerFiltered
    .map((cmd, i) => {
      const focused = i === _pickerListIdx;
      const hasPH = cmd.cmd.includes("[");
      return `<div
      class="tcp-row${focused ? " focused" : ""}"
      role="option"
      aria-selected="${focused}"
      data-row-idx="${i}"
      style="${focused ? `border-left-color:${color};` : ""}"
    >
      <div class="tcp-row-icon" style="color:${color};">${createIcon(cmd.icon, { size: 14 })}</div>
      <div class="tcp-row-body">
        <span class="tcp-row-title">${cmd.title}${hasPH ? ' <span class="tcp-template-badge">template</span>' : ""}</span>
        <span class="tcp-row-cmd">${cmd.cmd.replace(/</g, "&lt;")}</span>
      </div>
    </div>`;
    })
    .join("");

  wrap.querySelectorAll(".tcp-row").forEach((row) => {
    row.addEventListener("click", () => {
      _pickerListIdx = parseInt(row.dataset.rowIdx, 10);
      _renderList();
      _pickerConfirm(false);
    });
    row.addEventListener("mouseenter", () => {
      _pickerListIdx = parseInt(row.dataset.rowIdx, 10);
      _renderList();
    });
  });

  const focusedRow = wrap.querySelector(".tcp-row.focused");
  if (focusedRow) focusedRow.scrollIntoView({ block: "nearest" });
  _renderFooter();
}

function _renderFooter() {
  const footer = document.getElementById("tcp-footer");
  if (!footer) return;

  if (_pickerTemplateMode) {
    const phs = _pickerTemplateParts.filter((p) => p.type === "ph");
    const current = phs[_pickerPlaceholderIdx];
    if (!current) return;
    const filled = _getFilledCommand();
    footer.innerHTML = `
      <div class="tcp-template-bar">
        <span class="tcp-template-label">&#x25B6; [${current.name}]</span>
        <span class="tcp-template-value">${current.options.length > 0 ? current.options[current.optIdx] : "(no presets)"}</span>
        <span class="tcp-template-hint">&#x2190;&#x2192;=Cycle &nbsp; &#x2191;&#x2193;=Next &nbsp; A=Run &nbsp; X=Paste &nbsp; B=Back</span>
      </div>
      <span class="tcp-footer-preview">${filled.replace(/</g, "&lt;")}</span>`;
    return;
  }

  const cmd = _pickerFiltered[_pickerListIdx];
  footer.innerHTML = cmd
    ? `<span class="tcp-footer-preview">${cmd.desc}</span>`
    : `<span class="tcp-footer-preview">Select a command to see its description.</span>`;
}

// ─── State machine ────────────────────────────────────────────────────────────
function _enterTemplateMode(cmd) {
  _pickerTemplateParts = _parseTemplateParts(cmd.cmd);
  const phs = _pickerTemplateParts.filter((p) => p.type === "ph");
  if (phs.length === 0) {
    _executeCommand(cmd.cmd, false);
    return;
  }
  _pickerTemplateMode = true;
  _pickerPlaceholderIdx = 0;
  triggerHaptic("light");
  _renderFooter();
}

function _exitTemplateMode() {
  _pickerTemplateMode = false;
  _pickerTemplateParts = [];
  _renderFooter();
}

function _executeCommand(cmdStr, noNewline) {
  _ptyWrite(noNewline ? cmdStr : cmdStr + "\n");
  closeTerminalCommandPicker();
}

function _pickerConfirm(noNewline) {
  if (_pickerTemplateMode) {
    _executeCommand(_getFilledCommand(), noNewline);
    return;
  }
  const cmd = _pickerFiltered[_pickerListIdx];
  if (!cmd) return;
  if (cmd.cmd.includes("[")) {
    _enterTemplateMode(cmd);
  } else {
    _executeCommand(cmd.cmd, noNewline);
  }
}

// ─── HUD hint bar ─────────────────────────────────────────────────────────────
export function initTerminalControllerHintBar() {
  if (document.getElementById("terminal-gp-hud")) return;
  const view = document.getElementById("view-terminal");
  if (!view) return;
  const hud = document.createElement("div");
  hud.id = "terminal-gp-hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = `<span class="tcp-hud-hint">
    <strong>[↑↓]</strong>&nbsp;History &nbsp;
    <strong>[←→]</strong>&nbsp;Cursor &nbsp;
    <strong>[A]</strong>&nbsp;Enter &nbsp;
    <strong>[B]</strong>&nbsp;Ctrl+C &nbsp;
    <strong>[X]</strong>&nbsp;Tab &nbsp;
    <strong>[Y]</strong>&nbsp;Clear &nbsp;
    <strong>[L1/R1]</strong>&nbsp;Scroll &nbsp;
    <strong>[R2]</strong>&nbsp;Commands &nbsp;
    <strong>[L4]</strong>&nbsp;New Tab &nbsp;
    <strong>[R4]</strong>&nbsp;Cycle Tab
  </span>`;
  view.appendChild(hud);
}

export function updateHintBarVisibility() {
  const hud = document.getElementById("terminal-gp-hud");
  if (!hud) return;
  hud.classList.toggle("visible", !!(state.gamepadActive && isTerminalViewActive()));
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
export function initTerminalGamepad() {
  if (!document.getElementById("terminal-cmd-picker-overlay")) {
    _buildOverlayDOM();
  }
  initTerminalControllerHintBar();
}

export function openTerminalCommandPicker() {
  if (!state.activeTerminalSessionId) {
    addNotification("warning", "Terminal", "Start a terminal session first.", 3000);
    return;
  }
  if (state.radialMenuVisible) return;

  _pickerVisible = true;
  _pickerTemplateMode = false;
  _pickerCatIdx = 0;
  _pickerListIdx = 0;
  _pickerFiltered = _filteredForCat();

  const overlay = document.getElementById("terminal-cmd-picker-overlay");
  if (overlay) {
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
  }
  if (!_pickerFocusTrap && overlay) _pickerFocusTrap = new FocusTrap(overlay);
  _pickerFocusTrap?.activate();

  _renderCats();
  _renderList();
}

export function closeTerminalCommandPicker() {
  _pickerVisible = false;
  _pickerTemplateMode = false;
  _pickerTemplateParts = [];

  const overlay = document.getElementById("terminal-cmd-picker-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
  _pickerFocusTrap?.deactivate();
}

// ─── Guard exports ────────────────────────────────────────────────────────────
export function isTerminalViewActive() {
  return document.getElementById("view-terminal")?.classList.contains("active") ?? false;
}

export function isTerminalCommandPickerVisible() {
  return _pickerVisible;
}

// ─── Button handler (called from main.js _gpFaceButton* functions) ────────────
// btnIdx: 0=A  1=B  2=X  3=Y
export function handleTerminalGamepadButton(btnIdx) {
  if (_pickerVisible) {
    if (btnIdx === 0) {
      triggerHaptic("medium");
      _pickerConfirm(false);
    } else if (btnIdx === 1) {
      triggerHaptic("medium");
      if (_pickerTemplateMode) _exitTemplateMode();
      else closeTerminalCommandPicker();
    } else if (btnIdx === 2) {
      triggerHaptic("light");
      _pickerConfirm(true);
    }
    return;
  }

  // Direct PTY key sequences
  switch (btnIdx) {
    case 0:
      _ptyWrite("\r");
      triggerHaptic("medium");
      break; // A  → Enter
    case 1:
      _ptyWrite("\x03");
      triggerHaptic("medium");
      break; // B  → Ctrl+C
    case 2:
      _ptyWrite("\t");
      triggerHaptic("light");
      break; // X  → Tab
    case 3:
      _ptyWrite("\x0c");
      triggerHaptic("medium");
      break; // Y  → Ctrl+L clear
  }
}

// ─── D-pad handler (called from main.js _gpDpadVertical / _gpDpadHorizontal) ──
export function handleTerminalGamepadDpad(dir) {
  if (_pickerVisible) {
    if (_pickerTemplateMode) {
      const phs = _pickerTemplateParts.filter((p) => p.type === "ph");
      if (dir === "up") {
        _pickerPlaceholderIdx = (_pickerPlaceholderIdx - 1 + phs.length) % phs.length;
        _renderFooter();
      } else if (dir === "down") {
        _pickerPlaceholderIdx = (_pickerPlaceholderIdx + 1) % phs.length;
        _renderFooter();
      } else {
        const p = phs[_pickerPlaceholderIdx];
        if (!p || p.options.length === 0) {
          triggerHaptic("error");
          return;
        }
        p.optIdx =
          dir === "left"
            ? (p.optIdx - 1 + p.options.length) % p.options.length
            : (p.optIdx + 1) % p.options.length;
        triggerHaptic("tick");
        _renderFooter();
      }
      return;
    }

    // Normal picker: up/down navigate the command list
    if (dir === "up") {
      _pickerListIdx = (_pickerListIdx - 1 + _pickerFiltered.length) % _pickerFiltered.length;
      _renderList();
    } else if (dir === "down") {
      _pickerListIdx = (_pickerListIdx + 1) % _pickerFiltered.length;
      _renderList();
    }
    return;
  }

  // Terminal view — arrow key escape sequences
  const seq = { up: "\x1b[A", down: "\x1b[B", left: "\x1b[D", right: "\x1b[C" }[dir];
  if (seq) _ptyWrite(seq);
}

// ─── L1/R1 shoulder in picker (cycle categories) ─────────────────────────────
export function handlePickerGamepadShoulder(isL1) {
  const total = TERM_CMD_CATS.length;
  _pickerCatIdx = isL1 ? (_pickerCatIdx - 1 + total) % total : (_pickerCatIdx + 1) % total;
  _pickerListIdx = 0;
  _pickerFiltered = _filteredForCat();
  _exitTemplateMode();
  _renderCats();
  _renderList();
  triggerHaptic("tick");
}
