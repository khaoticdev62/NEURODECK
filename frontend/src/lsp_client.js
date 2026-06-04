// LSP frontend client — bridges the IDE textarea with backend language servers.
// Handles: server lifecycle, document sync, completions popup, hover tooltip,
// and diagnostic display in the IDE output panel.

import { invoke } from "./neurobridge.js";
import { listen } from "./neurobridge.js";

// ── Config ───────────────────────────────────────────────────────────────────

const CHANGE_DEBOUNCE_MS = 500;
const COMPLETION_DEBOUNCE_MS = 200;
const HOVER_DEBOUNCE_MS = 400;
const MAX_COMPLETIONS = 50;

const STORAGE_KEY = "neurodeck_lsp_config";

// Completion item kind → display label
const KIND_LABELS = {
  1: "txt", 2: "meth", 3: "fn", 4: "ctor", 5: "field",
  6: "var", 7: "class", 8: "iface", 9: "mod", 10: "prop",
  11: "unit", 12: "val", 13: "enum", 14: "kw", 15: "snippet",
  16: "color", 17: "file", 18: "ref", 19: "folder", 20: "member",
  21: "const", 22: "struct", 23: "event", 24: "op", 25: "type",
};

// ── State ─────────────────────────────────────────────────────────────────────

const _state = {
  // language → { command, args, enabled }
  config: {},
  // language → "starting" | "ready" | "error" | "stopped"
  serverStatus: {},
  // Current document info
  activeLanguage: null,
  activeUri: null,
  docVersion: 0,
  // Completion state
  completionItems: [],
  completionSelectedIdx: 0,
  completionVisible: false,
  // Hover state
  hoverVisible: false,
  // Event unlisteners
  _unlisteners: [],
  // Tauri event unlisteners (Promise<UnlistenFn>)
  _tauriUnlisteners: [],
  // Callbacks to signal the IDE view
  onStatusChange: null,
  onDiagnostics: null,
  onLog: null,
};

// Timers
let changeTimer = null;
let hoverTimer = null;

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadLspConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _state.config = JSON.parse(raw);
  } catch (_) {
    _state.config = {};
  }
}

export function saveLspConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_state.config));
}

export function getLspConfig() {
  return _state.config;
}

export function setLspServerConfig(language, cfg) {
  _state.config[language] = cfg;
  saveLspConfig();
}

export function removeLspServerConfig(language) {
  delete _state.config[language];
  saveLspConfig();
}

// ── Server lifecycle ──────────────────────────────────────────────────────────

export async function startServer(language, command, args = []) {
  _state.serverStatus[language] = "starting";
  _statusChanged();
  try {
    await invoke("lsp_start", { language, command, args });
  } catch (e) {
    _state.serverStatus[language] = "error";
    _statusChanged();
    _log(`[LSP] Failed to start '${language}': ${e}`, "error");
  }
}

export async function stopServer(language) {
  try {
    await invoke("lsp_stop", { language });
    delete _state.serverStatus[language];
    _statusChanged();
    _log(`[LSP] Stopped '${language}'`, "info");
  } catch (e) {
    _log(`[LSP] Stop error '${language}': ${e}`, "warn");
  }
}

export async function refreshServerList() {
  try {
    const servers = await invoke("lsp_list");
    for (const s of servers) {
      _state.serverStatus[s.language] = s.status;
    }
    _statusChanged();
    return servers;
  } catch (_) {
    return [];
  }
}

export function getServerStatus() {
  return { ..._state.serverStatus };
}

// ── Document sync ─────────────────────────────────────────────────────────────

export async function openDocument(language, uri, content) {
  _state.activeLanguage = language;
  _state.activeUri = uri;
  _state.docVersion = 1;

  if (_state.serverStatus[language] !== "ready") return;

  try {
    await invoke("lsp_open_document", { language, uri, content });
  } catch (e) {
    _log(`[LSP] didOpen error: ${e}`, "warn");
  }
}

export async function closeDocument() {
  const { activeLanguage: lang, activeUri: uri } = _state;
  if (!lang || !uri) return;
  if (_state.serverStatus[lang] !== "ready") return;

  try {
    await invoke("lsp_close_document", { language: lang, uri });
  } catch (_) {}

  _state.activeLanguage = null;
  _state.activeUri = null;
  _state.docVersion = 0;
}

export function scheduleDocumentChange(content) {
  if (!_state.activeLanguage || !_state.activeUri) return;
  if (_state.serverStatus[_state.activeLanguage] !== "ready") return;

  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => _syncDocument(content), CHANGE_DEBOUNCE_MS);
}

async function _syncDocument(content) {
  const { activeLanguage: lang, activeUri: uri } = _state;
  if (!lang || !uri) return;
  _state.docVersion++;
  try {
    await invoke("lsp_change_document", {
      language: lang,
      uri,
      content,
      version: _state.docVersion,
    });
  } catch (e) {
    _log(`[LSP] didChange error: ${e}`, "warn");
  }
}

// ── Completions ───────────────────────────────────────────────────────────────

export async function requestCompletions(textarea, popupEl) {
  const { activeLanguage: lang, activeUri: uri } = _state;
  if (!lang || !uri || _state.serverStatus[lang] !== "ready") return;

  const { line, character } = _cursorPosition(textarea);

  try {
    const items = await invoke("lsp_get_completions", {
      language: lang,
      uri,
      line,
      character,
    });

    if (!items || items.length === 0) {
      hideCompletions(popupEl);
      return;
    }

    _state.completionItems = items.slice(0, MAX_COMPLETIONS);
    _state.completionSelectedIdx = 0;
    _state.completionVisible = true;
    _renderCompletions(textarea, popupEl);
  } catch (e) {
    _log(`[LSP] Completion error: ${e}`, "warn");
    hideCompletions(popupEl);
  }
}

export function hideCompletions(popupEl) {
  if (!popupEl) return;
  _state.completionVisible = false;
  _state.completionItems = [];
  popupEl.style.display = "none";
}

export function completionKeydown(e, textarea, popupEl) {
  if (!_state.completionVisible) return false;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    _state.completionSelectedIdx = Math.min(
      _state.completionSelectedIdx + 1,
      _state.completionItems.length - 1
    );
    _renderCompletions(textarea, popupEl);
    return true;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    _state.completionSelectedIdx = Math.max(_state.completionSelectedIdx - 1, 0);
    _renderCompletions(textarea, popupEl);
    return true;
  }
  if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    _applyCompletion(textarea, popupEl);
    return true;
  }
  if (e.key === "Escape") {
    hideCompletions(popupEl);
    return true;
  }
  return false;
}

function _applyCompletion(textarea, popupEl) {
  const item = _state.completionItems[_state.completionSelectedIdx];
  if (!item) return;

  const text = item.insert_text || item.label;
  const pos = textarea.selectionStart;
  const content = textarea.value;

  // Replace the current "word" before the cursor with the completion.
  let wordStart = pos;
  while (wordStart > 0 && /\w/.test(content[wordStart - 1])) wordStart--;

  textarea.value =
    content.slice(0, wordStart) + text + content.slice(textarea.selectionEnd);
  const newPos = wordStart + text.length;
  textarea.selectionStart = textarea.selectionEnd = newPos;

  // Trigger input event so the IDE view tracks dirtiness.
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  hideCompletions(popupEl);
}

function _renderCompletions(textarea, popupEl) {
  if (!popupEl || !_state.completionVisible) return;

  const { x, y } = _caretCoords(textarea);
  popupEl.style.left = `${x}px`;
  popupEl.style.top = `${y + 20}px`;
  popupEl.style.display = "block";

  popupEl.innerHTML = _state.completionItems
    .map((item, idx) => {
      const active = idx === _state.completionSelectedIdx ? " lsp-comp-active" : "";
      const kindLabel = KIND_LABELS[item.kind] || "…";
      const detail = item.detail
        ? `<span class="lsp-comp-detail">${_esc(item.detail)}</span>`
        : "";
      const isSelected = idx === _state.completionSelectedIdx;
      return `<div class="lsp-comp-item${active}" role="option" aria-selected="${isSelected}" data-idx="${idx}">
        <span class="lsp-comp-kind">${kindLabel}</span>
        <span class="lsp-comp-label">${_esc(item.label)}</span>${detail}
      </div>`;
    })
    .join("");

  // Click to apply
  popupEl.querySelectorAll(".lsp-comp-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      _state.completionSelectedIdx = parseInt(el.dataset.idx, 10);
      _applyCompletion(textarea, popupEl);
    });
  });

  // Scroll selected item into view
  const activeEl = popupEl.querySelector(".lsp-comp-active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
}

// ── Hover ─────────────────────────────────────────────────────────────────────

export function scheduleHover(textarea, tooltipEl, mouseEvent) {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => _doHover(textarea, tooltipEl, mouseEvent), HOVER_DEBOUNCE_MS);
}

export function hideHover(tooltipEl) {
  if (tooltipEl) tooltipEl.style.display = "none";
  _state.hoverVisible = false;
}

async function _doHover(textarea, tooltipEl, e) {
  const { activeLanguage: lang, activeUri: uri } = _state;
  if (!lang || !uri || _state.serverStatus[lang] !== "ready") return;

  const rect = textarea.getBoundingClientRect();
  const relX = e.clientX - rect.left + textarea.scrollLeft;
  const relY = e.clientY - rect.top + textarea.scrollTop;
  const { line, character } = _posFromCoords(textarea, relX, relY);

  try {
    const hover = await invoke("lsp_get_hover", {
      language: lang,
      uri,
      line,
      character,
    });

    if (!hover || !hover.contents || !tooltipEl) return;

    tooltipEl.textContent = hover.contents.slice(0, 500);
    tooltipEl.style.left = `${e.clientX + 12}px`;
    tooltipEl.style.top = `${e.clientY - 8}px`;
    tooltipEl.style.display = "block";
    _state.hoverVisible = true;
  } catch (_) {}
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

// Called when lsp:diagnostics event fires; relayed to the IDE output panel.
function _onDiagnosticsEvent(payload) {
  const { language, uri, diagnostics } = payload;
  if (_state.onDiagnostics) {
    _state.onDiagnostics(language, uri, diagnostics);
  }
}

// ── Init / teardown ───────────────────────────────────────────────────────────

export async function initLspClient({ onStatusChange, onDiagnostics, onLog } = {}) {
  _state.onStatusChange = onStatusChange || null;
  _state.onDiagnostics = onDiagnostics || null;
  _state.onLog = onLog || null;

  loadLspConfig();

  // Subscribe to Tauri LSP events.
  const unlistenDiag = await listen("lsp:diagnostics", (ev) => {
    _onDiagnosticsEvent(ev.payload);
  });
  const unlistenReady = await listen("lsp:ready", (ev) => {
    const { language } = ev.payload;
    _state.serverStatus[language] = "ready";
    _statusChanged();
    _log(`[LSP] '${language}' ready`, "ok");

    // If a document is currently active and matches this language, open it.
    if (_state.activeLanguage === language && _state.activeUri) {
      // The IDE view will re-send didOpen on the next focusIn or we trigger it.
      // Signal the IDE to re-sync.
      if (_state.onStatusChange) _state.onStatusChange(_state.serverStatus);
    }
  });
  const unlistenError = await listen("lsp:error", (ev) => {
    const { language, message } = ev.payload;
    _state.serverStatus[language] = "error";
    _statusChanged();
    _log(`[LSP] '${language}' error: ${message}`, "error");
  });

  _state._tauriUnlisteners = [unlistenDiag, unlistenReady, unlistenError];

  // Restore servers that were enabled in config.
  for (const [lang, cfg] of Object.entries(_state.config)) {
    if (cfg.enabled && cfg.command) {
      await startServer(lang, cfg.command, cfg.args || []);
    }
  }

  await refreshServerList();
}

export function destroyLspClient() {
  for (const unlisten of _state._tauriUnlisteners) {
    if (typeof unlisten === "function") unlisten();
  }
  _state._tauriUnlisteners = [];
  clearTimeout(changeTimer);
  clearTimeout(hoverTimer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _statusChanged() {
  if (_state.onStatusChange) _state.onStatusChange({ ..._state.serverStatus });
}

function _log(msg, tone = "info") {
  if (_state.onLog) _state.onLog(msg, tone);
}

/** Get line/character from textarea.selectionStart. */
function _cursorPosition(textarea) {
  const before = textarea.value.slice(0, textarea.selectionStart);
  const lines = before.split("\n");
  const line = lines.length - 1;
  const character = lines[line].length;
  return { line, character };
}

/** Approximate file:// URI for workspace-relative path. */
export function workspaceUri(relativePath) {
  return `file:///workspace/${relativePath.replace(/\\/g, '/')}`;
}

/** Escape HTML special chars. */
function _esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Get approximate pixel coords of the cursor in the textarea.
 * Uses a hidden mirror div with the same font metrics.
 */
function _caretCoords(textarea) {
  const mirror = _getMirror(textarea);
  const before = document.createTextNode(textarea.value.slice(0, textarea.selectionStart));
  const caret = document.createElement("span");
  caret.textContent = "​"; // zero-width space as a size anchor

  mirror.innerHTML = "";
  mirror.appendChild(before);
  mirror.appendChild(caret);

  const tRect = textarea.getBoundingClientRect();
  const cRect = caret.getBoundingClientRect();

  return {
    x: cRect.left - tRect.left + textarea.scrollLeft,
    y: cRect.top - tRect.top + textarea.scrollTop,
  };
}

let _mirrorEl = null;
function _getMirror(textarea) {
  if (!_mirrorEl) {
    _mirrorEl = document.createElement("div");
    _mirrorEl.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      box-sizing: border-box;
    `;
    document.body.appendChild(_mirrorEl);
  }
  const cs = window.getComputedStyle(textarea);
  ["font", "fontSize", "fontFamily", "fontWeight", "lineHeight",
   "letterSpacing", "padding", "paddingTop", "paddingLeft",
   "paddingRight", "paddingBottom", "width", "borderWidth",
   "boxSizing", "whiteSpace", "overflowWrap", "wordBreak"].forEach((p) => {
    _mirrorEl.style[p] = cs[p];
  });
  return _mirrorEl;
}

/**
 * Approximate line/character from pixel coords within the textarea.
 * Based on font line-height and average char width.
 */
function _posFromCoords(textarea, relX, relY) {
  const cs = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(cs.lineHeight) || 18;
  const paddingTop = parseFloat(cs.paddingTop) || 0;
  const paddingLeft = parseFloat(cs.paddingLeft) || 0;

  const line = Math.max(0, Math.floor((relY - paddingTop) / lineHeight));
  const lines = textarea.value.split("\n");
  const lineText = lines[Math.min(line, lines.length - 1)] || "";

  // Approximate character by measuring average glyph width.
  const avgCharWidth = parseFloat(cs.fontSize) * 0.6;
  const character = Math.max(0, Math.round((relX - paddingLeft) / avgCharWidth));

  return { line, character: Math.min(character, lineText.length) };
}
