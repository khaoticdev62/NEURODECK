import { invoke } from "@tauri-apps/api/core";

// ── State ───────────────────────────────────────────────────────────────────
const _s = {
  files: [],
  openTabs: [],
  activeTab: null,
  currentPath: "",
  editorEl: null,
  lineNumbersEl: null,
  outputEl: null,
  fileTreeEl: null,
  tabBarEl: null,
};

// ── Language detection ──────────────────────────────────────────────────────
function getLanguage(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    rs: "rust",
    py: "python",
    lua: "lua",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    rb: "ruby",
    php: "php",
    sql: "sql",
    dockerfile: "dockerfile",
  };
  return map[ext] || "text";
}

function getLangIcon(lang) {
  const map = {
    rust: "🦀",
    javascript: "📜",
    typescript: "📘",
    python: "🐍",
    lua: "🌙",
    html: "🌐",
    css: "🎨",
    json: "📋",
    markdown: "📝",
    bash: "💲",
    go: "🐹",
    java: "☕",
    c: "🔧",
    cpp: "🔧",
  };
  return map[lang] || "📄";
}

// ── DOM helpers ─────────────────────────────────────────────────────────────
function $(id) {
  return document.getElementById(id);
}

// ── File tree ───────────────────────────────────────────────────────────────
async function loadFileTree(path = "") {
  try {
    _s.files = await invoke("list_workspace_files", { path: path || null });
    renderFileTree(path);
  } catch (e) {
    logOutput(`[Error] Cannot list files: ${e}`, "error");
  }
}

function renderFileTree(currentPath) {
  if (!_s.fileTreeEl) return;

  const ul = document.createElement("ul");
  ul.className = "ide-file-tree";

  // Parent directory link
  if (currentPath) {
    const parts = currentPath.split("/").filter(Boolean);
    const parent = parts.slice(0, -1).join("/");
    const li = document.createElement("li");
    li.className = "ide-tree-item ide-tree-parent";
    li.innerHTML = `<span class="ide-tree-icon">📁</span> <span class="ide-tree-label">..</span>`;
    li.onclick = () => loadFileTree(parent);
    ul.appendChild(li);
  }

  // Current directory indicator
  const dirLi = document.createElement("li");
  dirLi.className = "ide-tree-current-dir";
  dirLi.textContent = currentPath || "workspace";
  ul.appendChild(dirLi);

  for (const entry of _s.files) {
    const li = document.createElement("li");
    li.className = "ide-tree-item";
    li.dataset.path = entry.path;

    if (entry.is_dir) {
      li.innerHTML = `<span class="ide-tree-icon">📁</span> <span class="ide-tree-label">${escapeHtml(entry.name)}</span>`;
      li.onclick = () => loadFileTree(entry.path);
    } else {
      const lang = getLanguage(entry.name);
      const icon = getLangIcon(lang);
      li.innerHTML = `<span class="ide-tree-icon">${icon}</span> <span class="ide-tree-label">${escapeHtml(entry.name)}</span>`;
      li.onclick = () => openFile(entry.path, entry.name);
      li.ondblclick = () => {};
    }

    ul.appendChild(li);
  }

  _s.fileTreeEl.innerHTML = "";
  _s.fileTreeEl.appendChild(ul);
}

// ── Tab management ──────────────────────────────────────────────────────────
async function openFile(path, name) {
  // Check if already open
  const existing = _s.openTabs.find((t) => t.path === path);
  if (existing) {
    switchTab(path);
    return;
  }

  try {
    const content = await invoke("read_workspace_file", { path });
    const tab = {
      path,
      name,
      content,
      dirty: false,
      lang: getLanguage(name),
    };
    _s.openTabs.push(tab);
    switchTab(path);
    renderTabs();
  } catch (e) {
    logOutput(`[Error] Cannot open ${name}: ${e}`, "error");
  }
}

function switchTab(path) {
  // Save current content before switching
  if (_s.activeTab && _s.editorEl) {
    const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
    if (tab) {
      tab.content = _s.editorEl.value;
    }
  }

  _s.activeTab = path;
  const tab = _s.openTabs.find((t) => t.path === path);
  if (tab && _s.editorEl) {
    _s.editorEl.value = tab.content;
    _s.editorEl.dataset.lang = tab.lang;
    _s.editorEl.dataset.path = tab.path;
    updateLineNumbers();
  }
  renderTabs();
}

function closeTab(path, event) {
  if (event) event.stopPropagation();
  const idx = _s.openTabs.findIndex((t) => t.path === path);
  if (idx === -1) return;

  const tab = _s.openTabs[idx];
  if (tab.dirty) {
    if (!confirm(`'${tab.name}' has unsaved changes. Close anyway?`)) return;
  }

  _s.openTabs.splice(idx, 1);

  if (_s.activeTab === path) {
    if (_s.openTabs.length > 0) {
      switchTab(_s.openTabs[Math.min(idx, _s.openTabs.length - 1)].path);
    } else {
      _s.activeTab = null;
      if (_s.editorEl) {
        _s.editorEl.value = "";
        _s.editorEl.dataset.lang = "";
        _s.editorEl.dataset.path = "";
      }
    }
  }

  renderTabs();
}

function renderTabs() {
  if (!_s.tabBarEl) return;
  _s.tabBarEl.innerHTML = "";

  for (const tab of _s.openTabs) {
    const btn = document.createElement("button");
    btn.className = "ide-tab" + (tab.path === _s.activeTab ? " active" : "");
    btn.title = tab.path;
    btn.innerHTML = `
      <span class="ide-tab-icon">${getLangIcon(tab.lang)}</span>
      <span class="ide-tab-label">${escapeHtml(tab.name)}${tab.dirty ? " ●" : ""}</span>
      <span class="ide-tab-close">×</span>
    `;
    btn.onclick = () => switchTab(tab.path);
    btn.querySelector(".ide-tab-close").onclick = (e) => closeTab(tab.path, e);
    _s.tabBarEl.appendChild(btn);
  }
}

// ── Editor ──────────────────────────────────────────────────────────────────
function updateLineNumbers() {
  if (!_s.editorEl || !_s.lineNumbersEl) return;
  const lines = _s.editorEl.value.split("\n").length;
  _s.lineNumbersEl.innerHTML = Array.from({ length: lines }, (_, i) =>
    `<div class="ide-line-num">${i + 1}</div>`
  ).join("");
}

function onEditorInput() {
  updateLineNumbers();
  if (_s.activeTab) {
    const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
    if (tab) {
      tab.content = _s.editorEl.value;
      tab.dirty = true;
      renderTabs();
    }
  }
}

function onEditorScroll() {
  if (_s.lineNumbersEl) {
    _s.lineNumbersEl.scrollTop = _s.editorEl.scrollTop;
  }
}

function onEditorKeydown(e) {
  // Tab key inserts spaces
  if (e.key === "Tab") {
    e.preventDefault();
    const start = _s.editorEl.selectionStart;
    const end = _s.editorEl.selectionEnd;
    const spaces = "  ";
    _s.editorEl.value = _s.editorEl.value.slice(0, start) + spaces + _s.editorEl.value.slice(end);
    _s.editorEl.selectionStart = _s.editorEl.selectionEnd = start + spaces.length;
    onEditorInput();
  }
}

// ── File operations ─────────────────────────────────────────────────────────
async function saveActiveFile() {
  if (!_s.activeTab || !_s.editorEl) return;
  try {
    await invoke("write_workspace_file", {
      path: _s.activeTab,
      content: _s.editorEl.value,
    });
    const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
    if (tab) {
      tab.dirty = false;
      tab.content = _s.editorEl.value;
    }
    renderTabs();
    logOutput(`[Saved] ${_s.activeTab}`, "ok");
  } catch (e) {
    logOutput(`[Error] Save failed: ${e}`, "error");
  }
}

async function newFile() {
  const name = prompt("Enter filename (with extension):", "untitled.txt");
  if (!name) return;
  const path = _s.currentPath ? `${_s.currentPath}/${name}` : name;
  try {
    await invoke("create_workspace_file", { path });
    logOutput(`[Created] ${path}`, "ok");
    await loadFileTree(_s.currentPath);
    await openFile(path, name);
  } catch (e) {
    logOutput(`[Error] Cannot create file: ${e}`, "error");
  }
}

async function newFolder() {
  const name = prompt("Enter folder name:", "new-folder");
  if (!name) return;
  const path = _s.currentPath ? `${_s.currentPath}/${name}/.gitkeep` : `${name}/.gitkeep`;
  try {
    await invoke("create_workspace_file", { path });
    logOutput(`[Created] folder ${name}`, "ok");
    await loadFileTree(_s.currentPath);
  } catch (e) {
    logOutput(`[Error] Cannot create folder: ${e}`, "error");
  }
}

async function deleteSelected() {
  if (!_s.activeTab) {
    logOutput("[Error] No file selected", "error");
    return;
  }
  const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
  if (!tab) return;
  if (!confirm(`Delete '${tab.name}'? This cannot be undone.`)) return;
  try {
    await invoke("delete_workspace_file", { path: _s.activeTab });
    closeTab(_s.activeTab);
    logOutput(`[Deleted] ${tab.name}`, "ok");
    await loadFileTree(_s.currentPath);
  } catch (e) {
    logOutput(`[Error] Delete failed: ${e}`, "error");
  }
}

// ── Output panel ────────────────────────────────────────────────────────────
function logOutput(message, tone = "info") {
  if (!_s.outputEl) return;
  const line = document.createElement("div");
  line.className = `ide-output-line ide-output-${tone}`;
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  line.textContent = `[${time}] ${message}`;
  _s.outputEl.appendChild(line);
  _s.outputEl.scrollTop = _s.outputEl.scrollHeight;
}

function clearOutput() {
  if (_s.outputEl) _s.outputEl.innerHTML = "";
}

// ── Init ────────────────────────────────────────────────────────────────────
export async function initIdeView() {
  _s.fileTreeEl = $("ide-file-tree");
  _s.tabBarEl = $("ide-tab-bar");
  _s.editorEl = $("ide-editor");
  _s.lineNumbersEl = $("ide-line-numbers");
  _s.outputEl = $("ide-output");

  if (!_s.editorEl) return;

  // Wire editor events
  _s.editorEl.addEventListener("input", onEditorInput);
  _s.editorEl.addEventListener("scroll", onEditorScroll);
  _s.editorEl.addEventListener("keydown", onEditorKeydown);

  // Wire toolbar buttons
  $("ide-btn-new-file")?.addEventListener("click", newFile);
  $("ide-btn-new-folder")?.addEventListener("click", newFolder);
  $("ide-btn-save")?.addEventListener("click", saveActiveFile);
  $("ide-btn-delete")?.addEventListener("click", deleteSelected);
  $("ide-btn-refresh")?.addEventListener("click", () => loadFileTree(_s.currentPath));
  $("ide-btn-clear-output")?.addEventListener("click", clearOutput);
  $("ide-btn-run")?.addEventListener("click", runActiveFile);

  // Keyboard shortcut: Ctrl+S to save
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      const view = $("view-ide");
      if (view && view.classList.contains("active")) {
        e.preventDefault();
        saveActiveFile();
      }
    }
  });

  await loadFileTree("");
  logOutput("Mini IDE ready. Workspace loaded.", "ok");
}

async function runActiveFile() {
  if (!_s.activeTab || !_s.editorEl) return;
  const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
  if (!tab) return;

  logOutput(`Running ${tab.name}...`, "info");

  try {
    if (tab.lang === "lua") {
      const result = await invoke("run_lua_script", { code: _s.editorEl.value });
      logOutput(`[Lua] ${result}`, "ok");
    } else if (tab.lang === "bash" || tab.lang === "shell") {
      const result = await invoke("send_command", { command: _s.editorEl.value });
      logOutput(`[Shell] ${result}`, "ok");
    } else if (tab.lang === "javascript") {
      try {
        const executeJs = window.eval;
        const result = executeJs(_s.editorEl.value);
        logOutput(`[JS] ${result}`, "ok");
      } catch (e) {
        logOutput(`[JS Error] ${e.message}`, "error");
      }
    } else {
      logOutput(`Run not supported for ${tab.lang} files yet.`, "warn");
    }
  } catch (e) {
    logOutput(`[Error] ${e}`, "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
