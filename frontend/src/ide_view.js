import { invoke } from "./neurobridge.js";
import {
  initLspClient,
  destroyLspClient,
  startServer,
  stopServer,
  refreshServerList,
  getServerStatus,
  openDocument,
  closeDocument,
  scheduleDocumentChange,
  requestCompletions,
  hideCompletions,
  completionKeydown,
  scheduleHover,
  hideHover,
  workspaceUri,
  getLspConfig,
  setLspServerConfig,
  loadLspConfig,
} from "./lsp_client.js";

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
  // LSP UI refs
  lspCompletionEl: null,
  lspHoverEl: null,
  lspStatusBarEl: null,
  lspServerSelectEl: null,
  lspToggleBtnEl: null,
  // Known servers catalog from backend
  knownServers: [],
  lspInitialized: false,
  viewInitialized: false,
  // New LSP UI elements
  mirrorEl: null,
  diagPanelEl: null,
  diagContentEl: null,
  diagHeaderTitle: null,
  diagToggle: null,
  diagnosticsCache: {},
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

  if (_s.files.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "ide-tree-item ide-tree-empty";
    emptyLi.innerHTML = `<span class="ide-tree-icon">📂</span> <span class="ide-tree-label" style="opacity:0.5">No files in workspace</span>`;
    ul.appendChild(emptyLi);
  }

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
    const lang = getLanguage(name);
    const tab = { path, name, content, dirty: false, lang };
    _s.openTabs.push(tab);
    switchTab(path);
    renderTabs();

    // Notify LSP of open document.
    const uri = workspaceUri(path);
    await openDocument(lang, uri, content);
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
    _syncMirror();
    openDocument(tab.lang, workspaceUri(path), tab.content).catch(() => {});

    // Notify DeckCode runtime of the active language
    invoke("deckcode_set_active_language", { languageId: tab.lang }).catch((e) => {
      console.warn("[DeckCode] Failed to sync active language:", e);
    });
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

  // Notify LSP of close.
  closeDocument().catch(() => {});

  _s.openTabs.splice(idx, 1);

  // Auto-stop server if no other tabs of this language are open.
  const langStillOpen = _s.openTabs.some((t) => t.lang === closedLang);
  if (!langStillOpen && getServerStatus()[closedLang]) {
    stopServer(closedLang).catch(() => {});
  }

  if (_s.activeTab === path) {
    if (_s.openTabs.length > 0) {
      switchTab(_s.openTabs[Math.min(idx, _s.openTabs.length - 1)].path);
    } else {
      _s.activeTab = null;
      if (_s.editorEl) {
        _s.editorEl.value = "";
        _s.editorEl.dataset.lang = "";
        _s.editorEl.dataset.path = "";
        _syncMirror();
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
      <span class="ide-tab-close" aria-label="Close ${escapeHtml(tab.name)}">×</span>
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
  _s.lineNumbersEl.innerHTML = Array.from(
    { length: lines },
    (_, i) => `<div class="ide-line-num">${i + 1}</div>`
  ).join("");
}

function onEditorInput() {
  updateLineNumbers();
  _syncMirror();
  if (_s.activeTab) {
    const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
    if (tab) {
      tab.content = _s.editorEl.value;
      tab.dirty = true;
      renderTabs();
    }
  }
  // Notify LSP of the content change (debounced).
  scheduleDocumentChange(_s.editorEl.value);
  // Auto-trigger completions after a dot; hide on other input.
  const pos = _s.editorEl.selectionStart;
  const charBefore = _s.editorEl.value[pos - 1];
  if (charBefore === ".") {
    requestCompletions(_s.editorEl, _s.lspCompletionEl);
  } else {
    hideCompletions(_s.lspCompletionEl);
  }
}

function onEditorScroll() {
  if (_s.lineNumbersEl) {
    _s.lineNumbersEl.scrollTop = _s.editorEl.scrollTop;
  }
  if (_s.mirrorEl) {
    _s.mirrorEl.scrollTop = _s.editorEl.scrollTop;
    _s.mirrorEl.scrollLeft = _s.editorEl.scrollLeft;
  }
}

function onEditorKeydown(e) {
  // Let LSP completion popup intercept navigation keys first.
  if (completionKeydown(e, _s.editorEl, _s.lspCompletionEl)) return;

  // Ctrl+Space → trigger completions.
  if ((e.ctrlKey || e.metaKey) && e.key === " ") {
    e.preventDefault();
    requestCompletions(_s.editorEl, _s.lspCompletionEl);
    return;
  }

  // F12 → go to definition.
  if (e.key === "F12") {
    e.preventDefault();
    _gotoDefinition();
    return;
  }

  // Tab key inserts spaces (only when completion is not open).
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
    scheduleDocumentChange(_s.editorEl.value);
    renderTabs();
    logOutput(`[Saved] ${_s.activeTab}`, "ok");
  } catch (e) {
    logOutput(`[Error] Save failed: ${e}`, "error");
  }
}

async function newFile() {
  const name = await showPrompt("Enter filename (with extension):", "untitled.txt", {
    title: "New File",
  });
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
  const name = await showPrompt("Enter folder name:", "new-folder", { title: "New Folder" });
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

// ── LSP Toolbar ─────────────────────────────────────────────────────────────

async function _initLspToolbar() {
  _s.lspServerSelectEl = $("ide-lsp-server-select");
  _s.lspToggleBtnEl = $("ide-lsp-toggle");
  if (!_s.lspServerSelectEl || !_s.lspToggleBtnEl) return;

  try {
    _s.knownServers = await invoke("lsp_known_servers");
  } catch (_) {
    _s.knownServers = [];
  }

  // Populate dropdown — only list servers whose binary exists on PATH (checked by backend).
  _s.lspServerSelectEl.innerHTML =
    _s.knownServers.length === 0
      ? `<option value="">No LSP servers found</option>`
      : _s.knownServers.map((s) => `<option value="${s.language}">${s.label}</option>`).join("");

  _s.lspToggleBtnEl.addEventListener("click", async () => {
    const lang = _s.lspServerSelectEl.value;
    if (!lang) return;

    const status = getServerStatus();
    const isRunning = status[lang] === "ready" || status[lang] === "starting";

    if (isRunning) {
      _s.lspToggleBtnEl.textContent = "⏹ LSP";
      _s.lspToggleBtnEl.setAttribute("aria-pressed", "false");
      await stopServer(lang);
    } else {
      const server = _s.knownServers.find((s) => s.language === lang);
      if (!server) return;
      _s.lspToggleBtnEl.textContent = "⌛ LSP";
      _s.lspToggleBtnEl.setAttribute("aria-pressed", "true");
      await startServer(lang, server.command, server.args || []);
    }
    _updateLspToggleLabel();
  });

  _s.lspServerSelectEl.addEventListener("change", _updateLspToggleLabel);
}

function _updateLspToggleLabel() {
  if (!_s.lspToggleBtnEl || !_s.lspServerSelectEl) return;
  const lang = _s.lspServerSelectEl.value;
  const status = getServerStatus();
  const st = status[lang];
  if (st === "ready") {
    _s.lspToggleBtnEl.textContent = "⏹ LSP";
    _s.lspToggleBtnEl.setAttribute("aria-pressed", "true");
    _s.lspToggleBtnEl.classList.add("ide-lsp-toggle-active");
  } else if (st === "starting") {
    _s.lspToggleBtnEl.textContent = "⌛ LSP";
    _s.lspToggleBtnEl.setAttribute("aria-pressed", "true");
    _s.lspToggleBtnEl.classList.remove("ide-lsp-toggle-active");
  } else {
    _s.lspToggleBtnEl.textContent = "▶ LSP";
    _s.lspToggleBtnEl.setAttribute("aria-pressed", "false");
    _s.lspToggleBtnEl.classList.remove("ide-lsp-toggle-active");
  }
}

// ── Go to Definition (F12) ──────────────────────────────────────────────────

async function _gotoDefinition() {
  if (!_s.editorEl || !_s.activeTab) return;
  const tab = _s.openTabs.find((t) => t.path === _s.activeTab);
  if (!tab) return;

  const before = _s.editorEl.value.slice(0, _s.editorEl.selectionStart);
  const lines = before.split("\n");
  const line = lines.length - 1;
  const character = lines[line].length;

  try {
    const locations = await invoke("lsp_get_definitions", {
      language: tab.lang,
      uri: workspaceUri(tab.path),
      line,
      character,
    });

    if (!locations || locations.length === 0) {
      logOutput("[LSP] No definition found at cursor.", "warn");
      return;
    }

    if (locations.length === 1) {
      _openDefinitionLocation(locations[0]);
    } else {
      // Multiple results — show a picker in the output panel.
      logOutput(`[LSP] ${locations.length} definitions found:`, "info");
      locations.forEach((loc, idx) => {
        const line = document.createElement("div");
        line.className = "ide-output-line ide-output-info ide-lsp-def-item";
        line.style.cursor = "pointer";
        line.textContent = `  ${idx + 1}. ${loc.uri.split("/").pop()} Ln ${(loc.range?.start?.line ?? 0) + 1}`;
        line.onclick = () => _openDefinitionLocation(loc);
        if (_s.outputEl) _s.outputEl.appendChild(line);
      });
      if (_s.outputEl) _s.outputEl.scrollTop = _s.outputEl.scrollHeight;
    }
  } catch (e) {
    logOutput(`[LSP] Go to definition failed: ${e}`, "error");
  }
}

function _openDefinitionLocation(loc) {
  const filePath = loc.uri.replace(/^file:\/\/\/workspace\//, "");
  const targetLine = loc.range?.start?.line ?? 0;

  const existing = _s.openTabs.find((t) => t.path === filePath);
  if (existing) {
    switchTab(filePath);
    _scrollEditorToLine(targetLine);
  } else {
    openFile(filePath, filePath.split("/").pop() || filePath)
      .then(() => _scrollEditorToLine(targetLine))
      .catch(() => logOutput(`[LSP] Cannot open ${filePath}`, "error"));
  }
}

function _scrollEditorToLine(lineNo) {
  if (!_s.editorEl) return;
  const lines = _s.editorEl.value.split("\n");
  const charOffset = lines.slice(0, lineNo).reduce((acc, l) => acc + l.length + 1, 0);
  _s.editorEl.focus();
  _s.editorEl.selectionStart = _s.editorEl.selectionEnd = charOffset;
  // Scroll the textarea so the target line is visible.
  const lineHeight = parseInt(getComputedStyle(_s.editorEl).lineHeight, 10) || 18;
  _s.editorEl.scrollTop = Math.max(0, lineNo * lineHeight - _s.editorEl.clientHeight / 2);
}

// ── Init helpers ────────────────────────────────────────────────────────────

function _ideWireDomRefs() {
  _s.fileTreeEl = $("ide-file-tree");
  _s.tabBarEl = $("ide-tab-bar");
  _s.editorEl = $("ide-editor");
  _s.lineNumbersEl = $("ide-line-numbers");
  _s.outputEl = $("ide-output");
  _s.lspCompletionEl = $("ide-lsp-completions");
  _s.lspHoverEl = $("ide-lsp-hover-tooltip");
  _s.lspStatusBarEl = $("ide-lsp-status");
  _s.mirrorEl = $("ide-editor-mirror");
  _s.diagPanelEl = $("ide-lsp-diagnostics-panel");
  _s.diagContentEl = $("ide-lsp-diag-panel-content");
  _s.diagHeaderTitle = document.querySelector(".ide-lsp-diag-panel-title");
  _s.diagToggle = document.querySelector(".ide-lsp-diag-panel-toggle");
}

async function _ideWireEditorListeners() {
  _s.editorEl.addEventListener("input", onEditorInput);
  _s.editorEl.addEventListener("scroll", onEditorScroll);
  _s.editorEl.addEventListener("keydown", onEditorKeydown);
  _s.editorEl.addEventListener("mousemove", (e) => scheduleHover(_s.editorEl, _s.lspHoverEl, e));
  _s.editorEl.addEventListener("mouseleave", () => hideHover(_s.lspHoverEl));
  document.addEventListener("click", (e) => {
    if (_s.lspCompletionEl && !_s.lspCompletionEl.contains(e.target))
      hideCompletions(_s.lspCompletionEl);
    if (_s.lspHoverEl && !_s.lspHoverEl.contains(e.target)) hideHover(_s.lspHoverEl);
  });
  $("ide-btn-new-file")?.addEventListener("click", newFile);
  $("ide-btn-new-folder")?.addEventListener("click", newFolder);
  $("ide-btn-save")?.addEventListener("click", saveActiveFile);
  $("ide-btn-delete")?.addEventListener("click", deleteSelected);
  $("ide-btn-refresh")?.addEventListener("click", () => loadFileTree(_s.currentPath));
  $("ide-btn-clear-output")?.addEventListener("click", clearOutput);
  $("ide-btn-run")?.addEventListener("click", runActiveFile);
  $("ide-lsp-diag-panel-header")?.addEventListener("click", () => {
    if (_s.diagPanelEl && _s.diagToggle) {
      _s.diagPanelEl.classList.toggle("collapsed");
      _s.diagToggle.textContent = _s.diagPanelEl.classList.contains("collapsed") ? "▲" : "▼";
    }
  });
  await _initLspToolbar();
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      const view = $("view-ide");
      if (view && view.classList.contains("active")) {
        e.preventDefault();
        saveActiveFile();
      }
    }
  });
}

async function _ideWireLsp() {
  await initLspClient({
    onStatusChange: (statusMap) => {
      _renderLspStatusBar(statusMap);
      _updateLspToggleLabel();
    },
    onDiagnostics: (language, uri, diagnostics) => _renderDiagnostics(language, uri, diagnostics),
    onLog: (msg, tone) => logOutput(msg, tone),
  });
}

// ── Init ────────────────────────────────────────────────────────────────────
export async function initIdeView() {
  _ideWireDomRefs();
  if (!_s.editorEl) return;
  if (!_s.viewInitialized) {
    _s.viewInitialized = true;
    await _ideWireEditorListeners();
  }
  if (!_s.lspInitialized) {
    _s.lspInitialized = true;
    await _ideWireLsp();
  }
  await loadFileTree("");
  logOutput("Mini IDE ready. Workspace loaded.", "ok");
  logOutput("Tip: Ctrl+Space for completions — configure LSP servers in ⚙ Settings → LSP.", "info");
}

// ── LSP UI helpers ───────────────────────────────────────────────────────────

function _renderLspStatusBar(statusMap) {
  if (!_s.lspStatusBarEl) return;
  const entries = Object.entries(statusMap);
  if (entries.length === 0) {
    _s.lspStatusBarEl.innerHTML = `<span class="lsp-status-idle">LSP: no servers running</span>`;
    return;
  }
  _s.lspStatusBarEl.innerHTML = entries
    .map(([lang, status]) => {
      const cls = `lsp-dot lsp-dot-${status}`;
      return `<span class="lsp-status-entry"><span class="${cls}"></span>${lang}<span class="lsp-status-label">${status}</span></span>`;
    })
    .join("");
}

function _renderDiagnostics(language, uri, diagnostics) {
  _s.diagnosticsCache[uri] = diagnostics;

  if (_s.activeTab && workspaceUri(_s.activeTab) === uri) {
    _syncMirror();
  }

  if (!_s.diagContentEl) return;

  // Remove existing diagnostics section for this URI.
  _s.diagContentEl
    .querySelectorAll(`.ide-lsp-diag-section[data-uri="${CSS.escape(uri)}"]`)
    .forEach((el) => el.remove());

  _updateDiagnosticsHeader();

  if (!diagnostics || diagnostics.length === 0) return;

  const section = document.createElement("div");
  section.className = "ide-lsp-diag-section";
  section.dataset.uri = uri;

  const header = document.createElement("div");
  header.className = "ide-lsp-diag-header";
  const filename = uri.split("/").pop() || uri;
  const errorCount = diagnostics.filter((d) => d.severity === 1).length;
  const warnCount = diagnostics.filter((d) => d.severity === 2).length;
  header.textContent = `${language.toUpperCase()} · ${filename} — ${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warnCount} warning${warnCount !== 1 ? "s" : ""}`;
  section.appendChild(header);

  for (const diag of diagnostics) {
    const line = document.createElement("div");
    const sev = diag.severity || 3;
    const tone = sev === 1 ? "error" : sev === 2 ? "warn" : "info";
    line.className = `ide-output-line ide-output-${tone} ide-lsp-diag ide-lsp-diag-jump`;
    const lineNo = diag.range?.start?.line ?? 0;
    const charNo = diag.range?.start?.character ?? 0;
    line.textContent = `  Ln ${lineNo + 1}, Col ${charNo + 1}: ${diag.message}`;
    line.title = "Click to jump to this line";
    line.style.cursor = "pointer";
    line.addEventListener("click", () => _scrollEditorToLine(lineNo));
    section.appendChild(line);
  }

  _s.diagContentEl.appendChild(section);
}

function _updateDiagnosticsHeader() {
  if (!_s.diagHeaderTitle) return;
  let totalDiags = 0;
  for (const diags of Object.values(_s.diagnosticsCache)) {
    totalDiags += diags.length;
  }
  _s.diagHeaderTitle.textContent = `Diagnostics (${totalDiags})`;
}

function _syncMirror() {
  if (!_s.mirrorEl || !_s.editorEl || !_s.activeTab) return;
  const content = _s.editorEl.value;
  const uri = workspaceUri(_s.activeTab);
  const diags = _s.diagnosticsCache[uri] || [];

  if (diags.length === 0) {
    _s.mirrorEl.textContent = content + " "; // space to allow trailing empty line
    return;
  }

  const lines = content.split("\n");
  const renderedLines = lines.map((text, lineIdx) => {
    const lineDiags = diags.filter(
      (d) => d.range && d.range.start.line <= lineIdx && d.range.end.line >= lineIdx
    );

    if (lineDiags.length === 0) return escapeHtml(text);

    const classes = new Array(text.length).fill("");
    for (const d of lineDiags) {
      const sev = d.severity || 3;
      const cls =
        sev === 1
          ? "ide-lsp-squiggly-error"
          : sev === 2
            ? "ide-lsp-squiggly-warn"
            : "ide-lsp-squiggly-info";

      const startC = d.range.start.line < lineIdx ? 0 : d.range.start.character;
      const endC = d.range.end.line > lineIdx ? text.length : d.range.end.character;

      for (let i = startC; i < endC; i++) {
        if (i < text.length) classes[i] = `ide-lsp-squiggly ${cls}`;
      }
    }

    let out = "";
    for (let i = 0; i < text.length; i++) {
      if (classes[i]) {
        let j = i;
        while (j < text.length && classes[j] === classes[i]) j++;
        out += `<span class="${classes[i]}">${escapeHtml(text.slice(i, j))}</span>`;
        i = j - 1;
      } else {
        out += escapeHtml(text[i]);
      }
    }
    return out;
  });

  _s.mirrorEl.innerHTML = renderedLines.join("\n") + " ";
}

/** Called when the user navigates away from the IDE tab. Tears down LSP
 *  event listeners so they don't accumulate across view switches. */
export function deactivateIdeView() {
  if (_s.lspInitialized) {
    destroyLspClient();
    _s.lspInitialized = false;

    // Stop all running servers
    const statuses = getServerStatus();
    for (const [lang, status] of Object.entries(statuses)) {
      if (status === "ready" || status === "starting") {
        stopServer(lang).catch(() => {});
      }
    }
  }
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
