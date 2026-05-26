import { invoke } from "@tauri-apps/api/core";

let currentCollection = null;
let currentRequests = [];
let currentRequestIndex = -1;

export function initApiLabView() {
  wireTabs();
  wireActions();
  loadCollections();
  addDefaultHeader();
}

function wireTabs() {
  document.querySelectorAll(".api-lab-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".api-lab-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".api-lab-tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.getElementById(`api-tab-${tab.dataset.apiTab}`);
      if (panel) panel.classList.add("active");
    });
  });
}

function wireActions() {
  document.getElementById("api-send-btn")?.addEventListener("click", sendRequest);
  document.getElementById("api-add-header-btn")?.addEventListener("click", addHeaderRow);
  document.getElementById("api-ai-generate-btn")?.addEventListener("click", generateRequest);
  document.getElementById("api-new-collection-btn")?.addEventListener("click", createCollection);
  document.getElementById("api-new-request-btn")?.addEventListener("click", newRequest);
}

function addDefaultHeader() {
  const list = document.getElementById("api-headers-list");
  if (!list) return;
  list.innerHTML = "";
  addHeaderRow("Content-Type", "application/json");
}

function addHeaderRow(key = "", value = "") {
  const list = document.getElementById("api-headers-list");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "api-lab-kv-row";
  row.innerHTML = `
    <input type="text" class="api-lab-kv-key" placeholder="Key" value="${escapeHtml(key)}">
    <input type="text" class="api-lab-kv-value" placeholder="Value" value="${escapeHtml(value)}">
    <button class="api-lab-btn-small" title="Remove">×</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  list.appendChild(row);
}

function getHeaders() {
  const rows = document.querySelectorAll("#api-headers-list .api-lab-kv-row");
  const headers = [];
  rows.forEach(row => {
    const key = row.querySelector(".api-lab-kv-key")?.value.trim();
    const val = row.querySelector(".api-lab-kv-value")?.value.trim();
    if (key) headers.push([key, val]);
  });
  return headers;
}

async function sendRequest() {
  const method = document.getElementById("api-method-select")?.value || "GET";
  const url = document.getElementById("api-url-input")?.value.trim();
  const body = document.getElementById("api-body-input")?.value || null;
  const statusEl = document.getElementById("api-response-status");
  const bodyEl = document.getElementById("api-response-body");

  if (!url) { alert("Enter a URL"); return; }

  statusEl.textContent = "Sending…";
  bodyEl.textContent = "";

  try {
    const resp = await invoke("api_request", { method, url, headers: getHeaders(), body, timeoutSecs: 30 });
    statusEl.textContent = `${resp.status} ${resp.status_text} · ${resp.duration_ms}ms`;
    statusEl.style.color = resp.status < 400 ? "#86efac" : "#fca5a5";

    let formatted = resp.body;
    try {
      const json = JSON.parse(resp.body);
      formatted = JSON.stringify(json, null, 2);
    } catch { /* not JSON */ }
    bodyEl.textContent = formatted;
  } catch (e) {
    statusEl.textContent = "Error";
    statusEl.style.color = "#fca5a5";
    bodyEl.textContent = String(e);
  }
}

async function generateRequest() {
  const input = document.getElementById("api-ai-input");
  const btn = document.getElementById("api-ai-generate-btn");
  if (!input?.value.trim()) return;
  btn.textContent = "Generating…";
  try {
    const req = await invoke("api_generate_request", { description: input.value.trim() });
    document.getElementById("api-method-select").value = req.method;
    document.getElementById("api-url-input").value = req.url;
    document.getElementById("api-body-input").value = req.body || "";
    const list = document.getElementById("api-headers-list");
    list.innerHTML = "";
    (req.headers || []).forEach(([k, v]) => addHeaderRow(k, v));
    // Switch to headers tab
    document.querySelector('.api-lab-tab[data-api-tab="headers"]')?.click();
  } catch (e) {
    alert("Generate failed: " + e);
  } finally {
    btn.textContent = "Generate Request";
  }
}

// ── Collections ────────────────────────────────────────────────────────────

async function loadCollections() {
  const list = document.getElementById("api-lab-collections");
  if (!list) return;
  try {
    const names = await invoke("api_list_collections");
    if (!names || names.length === 0) {
      list.innerHTML = `<div class="api-lab-empty">No collections yet.</div>`;
      return;
    }
    list.innerHTML = names.map(n => `
      <div class="api-collection-item" data-name="${escapeHtml(n)}">
        <span class="api-collection-name">${escapeHtml(n)}</span>
        <button class="api-lab-btn-small" data-action="delete">×</button>
      </div>
    `).join("");
    list.querySelectorAll(".api-collection-item").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.dataset.action === "delete") {
          deleteCollection(el.dataset.name);
        } else {
          loadCollection(el.dataset.name);
        }
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="api-lab-empty">Error: ${escapeHtml(String(e))}</div>`;
  }
}

async function createCollection() {
  const name = prompt("Collection name:");
  if (!name) return;
  try {
    await invoke("api_save_collection", { name, requests: "[]" });
    await loadCollections();
  } catch (e) {
    alert("Save failed: " + e);
  }
}

async function loadCollection(name) {
  try {
    const raw = await invoke("api_load_collection", { name });
    currentRequests = JSON.parse(raw || "[]");
    currentCollection = name;
    renderRequestList();
  } catch (e) {
    alert("Load failed: " + e);
  }
}

async function deleteCollection(name) {
  if (!confirm(`Delete collection "${name}"?`)) return;
  try {
    await invoke("api_delete_collection", { name });
    await loadCollections();
  } catch (e) {
    alert("Delete failed: " + e);
  }
}

function newRequest() {
  document.getElementById("api-method-select").value = "GET";
  document.getElementById("api-url-input").value = "";
  document.getElementById("api-body-input").value = "";
  addDefaultHeader();
  currentRequestIndex = -1;
}

function renderRequestList() {
  // In a full implementation, show requests within the selected collection
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
