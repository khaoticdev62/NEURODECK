import { invoke } from "./neurobridge.js";

// ── State ──────────────────────────────────────────────────────────────────────
const HISTORY_KEY    = "nd_api_lab_history";
const ENV_KEY        = "nd_api_lab_env";
const HISTORY_LIMIT  = 50;

let _currentCollection = null;
let _currentRequests   = [];
let _currentReqIndex   = -1;
let _lastResponse      = null;
let _initialized       = false;

// ── Public init ────────────────────────────────────────────────────────────────
export function initApiLabView() {
  if (_initialized) return;
  _initialized = true;

  _wireSidebarTabs();
  _wireRequestTabs();
  _wireRespTabs();
  _wireActions();
  _wireAuth();
  _wireBodyMode();
  _wireEnv();

  _loadCollections();
  _renderHistory();
  _loadEnvFromStorage();
  _addDefaultHeader();
}

// ── Sidebar tabs ──────────────────────────────────────────────────────────────
function _wireSidebarTabs() {
  document.querySelectorAll(".api-lab-stab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".api-lab-stab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".api-lab-stab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`api-stab-${tab.dataset.stab}`)?.classList.add("active");
    });
  });
}

// ── Request tabs ──────────────────────────────────────────────────────────────
function _wireRequestTabs() {
  document.querySelectorAll(".api-lab-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".api-lab-tab").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".api-lab-tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      document.getElementById(`api-tab-${tab.dataset.apiTab}`)?.classList.add("active");
    });
  });
}

// ── Response tabs ─────────────────────────────────────────────────────────────
function _wireRespTabs() {
  document.querySelectorAll(".api-lab-resp-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".api-lab-resp-tab").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      const target = tab.dataset.respTab;
      document.getElementById("api-response-body")?.classList.toggle("hidden", target !== "body");
      document.getElementById("api-response-headers")?.classList.toggle("hidden", target !== "headers");
    });
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────
function _wireActions() {
  document.getElementById("api-send-btn")?.addEventListener("click", _sendRequest);
  document.getElementById("api-add-header-btn")?.addEventListener("click", () => _addKvRow("api-headers-list", "", ""));
  document.getElementById("api-new-collection-btn")?.addEventListener("click", _createCollection);
  document.getElementById("api-save-request-btn")?.addEventListener("click", _saveRequestToCollection);
  document.getElementById("api-ai-generate-btn")?.addEventListener("click", _generateRequest);
  document.getElementById("api-export-curl-btn")?.addEventListener("click", _exportCurl);
  document.getElementById("api-import-curl-btn")?.addEventListener("click", _importCurl);
  document.getElementById("api-resp-copy-btn")?.addEventListener("click", _copyResponseBody);
  document.getElementById("api-resp-canvas-btn")?.addEventListener("click", _sendToCanvas);
  document.getElementById("api-clear-history-btn")?.addEventListener("click", _clearHistory);

  // URL bar: Enter to send
  document.getElementById("api-url-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") _sendRequest();
  });
}

// ── Auth panel ────────────────────────────────────────────────────────────────
function _wireAuth() {
  document.getElementById("api-auth-type")?.addEventListener("change", _syncAuthFields);
}

function _syncAuthFields() {
  const type = document.getElementById("api-auth-type")?.value || "none";
  ["bearer", "basic", "apikey"].forEach(t => {
    document.getElementById(`api-auth-${t}`)?.classList.toggle("hidden", type !== t);
  });
}

function _getAuthHeaders() {
  const type = document.getElementById("api-auth-type")?.value || "none";
  switch (type) {
    case "bearer": {
      const token = document.getElementById("api-auth-token")?.value.trim();
      return token ? [["Authorization", `Bearer ${token}`]] : [];
    }
    case "basic": {
      const user = document.getElementById("api-auth-username")?.value || "";
      const pass = document.getElementById("api-auth-password")?.value || "";
      if (!user && !pass) return [];
      return [["Authorization", `Basic ${btoa(`${user}:${pass}`)}`]];
    }
    case "apikey": {
      const name = document.getElementById("api-auth-key-name")?.value.trim();
      const val  = document.getElementById("api-auth-key-value")?.value.trim();
      return name && val ? [[name, val]] : [];
    }
    default:
      return [];
  }
}

// ── Body mode ─────────────────────────────────────────────────────────────────
function _wireBodyMode() {
  document.getElementById("api-body-mode")?.addEventListener("change", _syncBodyMode);
}

function _syncBodyMode() {
  const mode = document.getElementById("api-body-mode")?.value || "raw";
  document.getElementById("api-body-input")?.classList.toggle("hidden", mode !== "raw");
  document.getElementById("api-form-list")?.classList.toggle("hidden", mode !== "form");
  document.getElementById("api-add-form-btn")?.classList.toggle("hidden", mode !== "form");
}

function _wireFormAdd() {
  document.getElementById("api-add-form-btn")?.addEventListener("click", () => _addKvRow("api-form-list", "", ""));
}

function _getBody() {
  const mode = document.getElementById("api-body-mode")?.value || "raw";
  const method = document.getElementById("api-method-select")?.value || "GET";
  if (["GET", "HEAD"].includes(method)) return null;
  if (mode === "none") return null;
  if (mode === "form") {
    const rows = document.querySelectorAll("#api-form-list .api-lab-kv-row");
    const parts = [];
    rows.forEach(row => {
      const k = row.querySelector(".api-lab-kv-key")?.value.trim();
      const v = row.querySelector(".api-lab-kv-value")?.value.trim();
      if (k) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v || "")}`);
    });
    return parts.join("&") || null;
  }
  return document.getElementById("api-body-input")?.value.trim() || null;
}

// ── Env vars ──────────────────────────────────────────────────────────────────
function _wireEnv() {
  document.getElementById("api-add-env-btn")?.addEventListener("click", () => {
    _addKvRow("api-env-list", "", "");
    _saveEnvToStorage();
  });
}

function _saveEnvToStorage() {
  const rows = document.querySelectorAll("#api-env-list .api-lab-kv-row");
  const vars = {};
  rows.forEach(row => {
    const k = row.querySelector(".api-lab-kv-key")?.value.trim();
    const v = row.querySelector(".api-lab-kv-value")?.value.trim();
    if (k) vars[k] = v || "";
  });
  localStorage.setItem(ENV_KEY, JSON.stringify(vars));
}

function _loadEnvFromStorage() {
  const raw = localStorage.getItem(ENV_KEY);
  if (!raw) return;
  try {
    const vars = JSON.parse(raw);
    Object.entries(vars).forEach(([k, v]) => _addKvRow("api-env-list", k, v));
  } catch {}
}

function _resolveEnv(text) {
  const raw = localStorage.getItem(ENV_KEY) || "{}";
  let vars = {};
  try { vars = JSON.parse(raw); } catch {}
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

// ── KV row helper ─────────────────────────────────────────────────────────────
function _addKvRow(listId, key = "", value = "") {
  const list = document.getElementById(listId);
  if (!list) return;
  const row = document.createElement("div");
  row.className = "api-lab-kv-row";
  row.innerHTML = `
    <input type="text"  class="api-lab-kv-key"   placeholder="Key"   value="${_esc(key)}"   aria-label="Key">
    <input type="text"  class="api-lab-kv-value" placeholder="Value" value="${_esc(value)}" aria-label="Value">
    <button class="api-lab-btn-small" title="Remove" aria-label="Remove">×</button>
  `;
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    if (listId === "api-env-list") _saveEnvToStorage();
  });
  if (listId === "api-env-list") {
    row.querySelectorAll("input").forEach(i => i.addEventListener("input", _saveEnvToStorage));
  }
  list.appendChild(row);
}

function _addDefaultHeader() {
  const list = document.getElementById("api-headers-list");
  if (!list || list.children.length > 0) return;
  _addKvRow("api-headers-list", "Content-Type", "application/json");
}

function _getHeaders() {
  const rows = document.querySelectorAll("#api-headers-list .api-lab-kv-row");
  const headers = [];
  rows.forEach(row => {
    const k = _resolveEnv(row.querySelector(".api-lab-kv-key")?.value.trim() || "");
    const v = _resolveEnv(row.querySelector(".api-lab-kv-value")?.value.trim() || "");
    if (k) headers.push([k, v]);
  });
  return headers;
}

// ── Loading bar helpers ───────────────────────────────────────────────────────
function _showLoadingBar() {
  const workspace = document.querySelector(".api-lab-workspace");
  if (!workspace) return null;
  const bar = document.createElement("div");
  bar.className = "loading-bar";
  bar.setAttribute("aria-hidden", "true");
  workspace.style.position = "relative";
  workspace.appendChild(bar);
  return bar;
}

function _hideLoadingBar(bar) {
  bar?.remove();
}

// ── Send request ──────────────────────────────────────────────────────────────
async function _sendRequest() {
  const method  = document.getElementById("api-method-select")?.value || "GET";
  const rawUrl  = document.getElementById("api-url-input")?.value.trim() || "";
  const url     = _resolveEnv(rawUrl);
  const statusEl = document.getElementById("api-response-status");
  const bodyEl   = document.getElementById("api-response-body");
  const headersEl = document.getElementById("api-response-headers");

  if (!url) {
    statusEl.textContent = "Enter a URL first";
    statusEl.style.color = "#fbbf24";
    return;
  }

  statusEl.textContent = "Sending…";
  statusEl.style.color = "#94a3b8";
  bodyEl.textContent = "";
  if (headersEl) headersEl.innerHTML = "";
  document.getElementById("api-send-btn").disabled = true;

  const bar = _showLoadingBar();
  const allHeaders = [..._getHeaders(), ..._getAuthHeaders()];
  const body = _getBody();

  try {
    const resp = await invoke("api_request", {
      method, url, headers: allHeaders, body, timeoutSecs: 30
    });
    _lastResponse = resp;

    const statusColor = resp.status < 300 ? "#86efac" : resp.status < 400 ? "#fbbf24" : "#fca5a5";
    statusEl.textContent = `${resp.status} ${resp.status_text} · ${resp.duration_ms}ms`;
    statusEl.style.color = statusColor;

    let formatted = resp.body;
    try { formatted = JSON.stringify(JSON.parse(resp.body), null, 2); } catch {}
    bodyEl.textContent = formatted;

    // Render response headers
    if (headersEl && resp.headers && resp.headers.length) {
      headersEl.innerHTML = resp.headers
        .map(([k, v]) => `<div class="api-resp-header-row"><span class="api-resp-hkey">${_esc(k)}</span><span class="api-resp-hval">${_esc(v)}</span></div>`)
        .join("");
    }

    // Add to history
    _addToHistory({ method, url: rawUrl, status: resp.status, duration_ms: resp.duration_ms });

  } catch (e) {
    statusEl.textContent = `Error: ${String(e).split('\n')[0]}`;
    statusEl.style.color = "#fca5a5";
    bodyEl.textContent = String(e);
    _lastResponse = null;
  } finally {
    _hideLoadingBar(bar);
    document.getElementById("api-send-btn").disabled = false;
  }
}

// ── Generate request via AI ───────────────────────────────────────────────────
async function _generateRequest() {
  const input = document.getElementById("api-ai-input");
  const btn   = document.getElementById("api-ai-generate-btn");
  if (!input?.value.trim()) { input?.focus(); return; }
  btn.textContent = "Generating…";
  btn.disabled = true;
  try {
    const req = await invoke("api_generate_request", { description: input.value.trim() });
    _setFormRequest(req, true);
  } catch (e) {
    addNotification('Generate Failed', String(e), 'error');
  } finally {
    btn.textContent = "✨ Generate Request";
    btn.disabled = false;
  }
}

// ── cURL import/export ────────────────────────────────────────────────────────
async function _exportCurl() {
  const method  = document.getElementById("api-method-select")?.value || "GET";
  const url     = document.getElementById("api-url-input")?.value.trim() || "";
  const headers = _getHeaders();
  const body    = _getBody();
  const reqStr  = JSON.stringify({ method, url, headers, body });
  try {
    const curl = await invoke("api_export_curl", { request: reqStr });
    const area = document.getElementById("api-curl-area");
    if (area) { area.value = curl; area.select(); }
  } catch (e) {
    addNotification('Export Failed', String(e), 'error');
  }
}

async function _importCurl() {
  const area = document.getElementById("api-curl-area");
  const curl = area?.value.trim();
  if (!curl) { area?.focus(); return; }
  try {
    const req = await invoke("api_curl_import", { curl });
    _setFormRequest(req, true);
  } catch (e) {
    addNotification('Import Failed', String(e), 'error');
  }
}

// ── Copy / Send to Canvas ─────────────────────────────────────────────────────
function _copyResponseBody() {
  const body = document.getElementById("api-response-body")?.textContent || "";
  navigator.clipboard?.writeText(body).catch(() => {});
}

function _sendToCanvas() {
  const body = document.getElementById("api-response-body")?.textContent || "";
  if (!body) return;
  // Switch to Canvas view and populate editor
  const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
  if (canvasTab) canvasTab.click();
  setTimeout(() => {
    const editor = window._monacoEditor;
    if (editor) {
      editor.setValue(body);
    } else {
      const textarea = document.querySelector("#canvas-editor textarea");
      if (textarea) { textarea.value = body; textarea.dispatchEvent(new Event("input")); }
    }
  }, 150);
}

// ── Request history ───────────────────────────────────────────────────────────
function _addToHistory(entry) {
  const raw = localStorage.getItem(HISTORY_KEY) || "[]";
  let hist = [];
  try { hist = JSON.parse(raw); } catch {}
  hist.unshift({ ...entry, ts: Date.now() });
  if (hist.length > HISTORY_LIMIT) hist = hist.slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  _renderHistory();
}

function _renderHistory() {
  const listEl = document.getElementById("api-history-list");
  if (!listEl) return;
  const raw = localStorage.getItem(HISTORY_KEY) || "[]";
  let hist = [];
  try { hist = JSON.parse(raw); } catch {}
  if (!hist.length) {
    listEl.innerHTML = '<div class="api-lab-empty">No history yet.</div>';
    return;
  }
  listEl.innerHTML = hist.map((h, i) => `
    <div class="api-history-item" data-idx="${i}" role="button" tabindex="0"
         aria-label="Load ${h.method} ${h.url}">
      <span class="api-hist-method">${_esc(h.method)}</span>
      <span class="api-hist-status" style="color:${h.status < 400 ? '#86efac' : '#fca5a5'}">${h.status || '—'}</span>
      <span class="api-hist-url">${_esc(h.url)}</span>
    </div>
  `).join("");

  listEl.querySelectorAll(".api-history-item").forEach(el => {
    const load = () => {
      const h = hist[Number(el.dataset.idx)];
      if (!h) return;
      document.getElementById("api-method-select").value = h.method || "GET";
      document.getElementById("api-url-input").value = h.url || "";
    };
    el.addEventListener("click", load);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } });
  });
}

async function _clearHistory() {
  const confirmed = await showConfirm("Clear all request history?", { confirmText: "Clear", cancelText: "Keep" }); if (!confirmed) return;
  localStorage.removeItem(HISTORY_KEY);
  _renderHistory();
}

// ── Collections ───────────────────────────────────────────────────────────────
async function _loadCollections() {
  const listEl = document.getElementById("api-lab-collections");
  if (!listEl) return;
  try {
    const names = await invoke("api_list_collections");
    if (!names || names.length === 0) {
      listEl.innerHTML = '<div class="api-lab-empty">No collections yet.</div>';
      return;
    }
    listEl.innerHTML = names.map(n => `
      <div class="api-collection-item${_currentCollection === n ? ' active' : ''}"
           data-name="${_esc(n)}" role="listitem">
        <span class="api-collection-name">${_esc(n)}</span>
        <button class="api-lab-btn-small" data-action="delete" title="Delete" aria-label="Delete ${_esc(n)}">×</button>
      </div>
    `).join("");
    listEl.querySelectorAll(".api-collection-item").forEach(el => {
      el.addEventListener("click", e => {
        if (e.target.dataset.action === "delete") {
          _deleteCollection(el.dataset.name);
        } else {
          _loadCollection(el.dataset.name);
        }
      });
    });
  } catch (e) {
    listEl.innerHTML = `<div class="api-lab-empty">Error: ${_esc(String(e))}</div>`;
  }
}

async function _createCollection() {
  const name = await showPrompt("Collection name:", "", { title: "New Collection" });
  if (!name?.trim()) return;
  try {
    await invoke("api_save_collection", { name: name.trim(), requests: "[]" });
    _loadCollections();
  } catch (e) { addNotification('Save Failed', String(e), 'error'); }
}

async function _loadCollection(name) {
  try {
    const raw = await invoke("api_load_collection", { name });
    _currentRequests = JSON.parse(raw || "[]");
    _currentCollection = name;
    _renderRequestList();
    _loadCollections();
  } catch (e) { addNotification('Load Failed', String(e), 'error'); }
}

async function _deleteCollection(name) {
  const confirmed = await showConfirm(`Delete collection "${name}"?`, { confirmText: "Delete", cancelText: "Keep" }); if (!confirmed) return;
  try {
    await invoke("api_delete_collection", { name });
    if (_currentCollection === name) { _currentCollection = null; _currentRequests = []; _renderRequestList(); }
    _loadCollections();
  } catch (e) { addNotification('Delete Failed', String(e), 'error'); }
}

async function _saveRequestToCollection() {
  if (!_currentCollection) {
    const name = await showPrompt("Save to collection (name):", "", { title: "Save to Collection" });
    if (!name?.trim()) return;
    _currentCollection = name.trim();
    try {
      await invoke("api_save_collection", { name: _currentCollection, requests: "[]" });
    } catch {}
  }
  const method  = document.getElementById("api-method-select")?.value || "GET";
  const url     = document.getElementById("api-url-input")?.value.trim() || "";
  const body    = document.getElementById("api-body-input")?.value || "";
  const headers = _getHeaders();
  const entry   = { id: `req_${Date.now()}`, method, url, body, headers, name: `${method} ${url.split("/").pop() || url}` };
  if (_currentReqIndex >= 0) {
    _currentRequests[_currentReqIndex] = entry;
  } else {
    _currentRequests.push(entry);
  }
  try {
    await invoke("api_save_collection", { name: _currentCollection, requests: JSON.stringify(_currentRequests) });
    _renderRequestList();
  } catch (e) { addNotification('Save Failed', String(e), 'error'); }
}

function _renderRequestList() {
  // Request list is embedded within the collection sidebar panel
  // Remove old request list if exists
  document.getElementById("api-req-list")?.remove();
  const listEl = document.getElementById("api-lab-collections");
  if (!listEl) return;

  if (!_currentCollection || _currentRequests.length === 0) return;

  const reqEl = document.createElement("div");
  reqEl.id = "api-req-list";
  reqEl.className = "api-req-list";
  reqEl.innerHTML = `
    <div class="api-req-list-header">${_esc(_currentCollection)}</div>
    ${_currentRequests.map((r, i) => `
      <div class="api-req-item" data-idx="${i}" role="button" tabindex="0"
           aria-label="Load ${_esc(r.name || r.url)}">
        <span class="api-req-method">${_esc(r.method)}</span>
        <span class="api-req-name">${_esc(r.name || r.url)}</span>
        <button class="api-lab-btn-small api-req-del" data-idx="${i}" title="Delete" aria-label="Delete request">×</button>
      </div>
    `).join("")}
  `;

  reqEl.querySelectorAll(".api-req-item").forEach(el => {
    const activate = e => {
      if (e && e.target.classList.contains("api-req-del")) {
        const idx = Number(e.target.dataset.idx);
        _currentRequests.splice(idx, 1);
        invoke("api_save_collection", { name: _currentCollection, requests: JSON.stringify(_currentRequests) }).catch(() => {});
        _renderRequestList();
        return;
      }
      const r = _currentRequests[Number(el.dataset.idx)];
      if (!r) return;
      _currentReqIndex = Number(el.dataset.idx);
      _setFormRequest(r, false);
    };
    el.addEventListener("click", activate);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
  });

  listEl.after(reqEl);
}

function _setFormRequest(req, selectTab = false) {
  if (!req) return;
  const methodSelect = document.getElementById("api-method-select");
  if (methodSelect) methodSelect.value = req.method || "GET";

  const urlInput = document.getElementById("api-url-input");
  if (urlInput) urlInput.value = req.url || "";

  const bodyInput = document.getElementById("api-body-input");
  if (bodyInput) bodyInput.value = req.body || "";

  const list = document.getElementById("api-headers-list");
  if (list) {
    list.innerHTML = "";
    (req.headers || []).forEach(([k, v]) => _addKvRow("api-headers-list", k, v));
  }
  if (selectTab) {
    document.querySelector('.api-lab-tab[data-api-tab="headers"]')?.click();
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function _esc(s) {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
}
