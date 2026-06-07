const fs = require('fs');
let src = fs.readFileSync('frontend/src/main.js', 'utf8');

function replaceFunction(src, fnName, newCode) {
  const lines = src.split('\n');
  const startIdx = lines.findIndex(l => l.startsWith('function ' + fnName + '(') || l.startsWith('async function ' + fnName + '('));
  if (startIdx < 0) { console.error('NOT FOUND: ' + fnName); return src; }
  let depth = 0, endIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
    if (depth === 0 && i > startIdx) { endIdx = i; break; }
  }
  console.log(fnName + ': lines ' + (startIdx+1) + '-' + (endIdx+1));
  return [...lines.slice(0, startIdx), newCode, ...lines.slice(endIdx + 1)].join('\n');
}

// ── renderBackgroundGallery ───────────────────────────────────────────────────
src = replaceFunction(src, 'renderBackgroundGallery', `function _bgCreateCard(bg, isLive) {
  const card = document.createElement("div");
  card.className = "bg-gallery-card";
  card.setAttribute("data-id", bg.id);
  if (!isLive) card.setAttribute("data-url", bg.url);
  const preview = document.createElement("div");
  preview.className = "bg-gallery-card-preview";
  if (isLive) { preview.style.background = bg.preview; }
  else if (bg.url) { preview.style.backgroundImage = "url('" + bg.url + "')"; }
  else { preview.style.background = "#050505"; }
  const title = document.createElement("div");
  title.className = "bg-gallery-card-title";
  title.innerText = bg.name;
  const desc = document.createElement("div");
  desc.className = "bg-gallery-card-desc";
  desc.innerText = bg.desc;
  card.append(preview, title, desc);
  card.onclick = function () {
    document.querySelectorAll(".bg-gallery-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    const url = isLive ? "live:" + bg.id : bg.url;
    const bgUrlInput = document.getElementById("bg-url-input");
    if (bgUrlInput) bgUrlInput.value = url;
    localStorage.setItem("bgUrl", url);
    const tvpBgLayer = document.getElementById("tvp-bg-layer");
    if (tvpBgLayer) {
      if (isLive) { tvpBgLayer.style.backgroundImage = "none"; tvpBgLayer.style.backgroundColor = bg.preview || "#050505"; }
      else if (bg.url) { tvpBgLayer.style.backgroundColor = "transparent"; tvpBgLayer.style.backgroundImage = "url('" + bg.url + "')"; }
      else { tvpBgLayer.style.backgroundImage = "none"; tvpBgLayer.style.backgroundColor = "transparent"; }
    }
    applySettings();
  };
  return card;
}

function _bgUpdateThemePreview() {
  const tvpPreview = document.getElementById("theme-viewport-preview");
  if (!tvpPreview) return;
  tvpPreview.style.setProperty("--preview-bg", document.getElementById("ct-bg")?.value || "#050505");
  tvpPreview.style.setProperty("--preview-fg", document.getElementById("ct-fg")?.value || "#D9F7FF");
  tvpPreview.style.setProperty("--preview-accent", document.getElementById("ct-accent")?.value || "#00F0FF");
  tvpPreview.style.setProperty("--preview-response", document.getElementById("ct-response")?.value || "#00FF88");
  tvpPreview.style.setProperty("--preview-warning", document.getElementById("ct-warning")?.value || "#FFB000");
  tvpPreview.style.setProperty("--preview-error", document.getElementById("ct-error")?.value || "#FF3C5A");
}

function renderBackgroundGallery() {
  const liveContainer = document.getElementById("bg-gallery-live");
  const staticContainer = document.getElementById("bg-gallery-static");
  if (!liveContainer || !staticContainer) return;

  liveContainer.innerHTML = "";
  staticContainer.innerHTML = "";
  liveContainer.appendChild(_bgCreateCard({ id: "", name: "None (Solid Black)", desc: "Deep matte black battery-saver mode", preview: "#050505" }, true));
  LIVE_BACKGROUNDS.forEach((bg) => liveContainer.appendChild(_bgCreateCard(bg, true)));
  staticContainer.appendChild(_bgCreateCard({ id: "", name: "None (Solid Black)", url: "", desc: "Deep matte black battery-saver mode" }, false));
  STATIC_BACKGROUNDS.forEach((bg) => staticContainer.appendChild(_bgCreateCard(bg, false)));

  const tabLive = document.getElementById("bg-tab-live");
  const tabStatic = document.getElementById("bg-tab-static");
  if (tabLive && tabStatic) {
    tabLive.onclick = function () { tabLive.classList.add("active"); tabStatic.classList.remove("active"); liveContainer.style.display = "grid"; staticContainer.style.display = "none"; };
    tabStatic.onclick = function () { tabStatic.classList.add("active"); tabLive.classList.remove("active"); staticContainer.style.display = "grid"; liveContainer.style.display = "none"; };
  }

  ["ct-bg","ct-fg","ct-accent","ct-response","ct-warning","ct-error"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", _bgUpdateThemePreview);
  });
  _bgUpdateThemePreview();
}`);

// ── refreshOllamaModels ───────────────────────────────────────────────────────
src = replaceFunction(src, 'refreshOllamaModels', `function _buildOllamaModelRow(m, baseUrl) {
  const isCurrent =
    m.name.includes(localStorage.getItem("settings-ollama-model") || "llama2") ||
    m.name === (document.getElementById("settings-ollama-model")?.value || "llama2");
  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px", borderBottom: "1px solid rgba(255,255,255,0.03)" });
  const item = document.createElement("div");
  Object.assign(item.style, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1", cursor: "pointer" });
  item.className = "settings-ollama-model-item";
  item.setAttribute("data-model", m.name);
  if (isCurrent) {
    const active = document.createElement("span");
    Object.assign(active.style, { color: "var(--accent-color)", fontWeight: "bold", marginRight: "6px" });
    active.textContent = "[Active]";
    item.appendChild(active);
  }
  item.append(" " + m.name + " ");
  const size = document.createElement("span");
  Object.assign(size.style, { opacity: "0.5", fontSize: "0.75rem" });
  size.textContent = "(" + formatBytes(m.size) + ")";
  item.appendChild(size);
  item.onclick = () => {
    const modelInput = document.getElementById("settings-ollama-model");
    if (modelInput) { modelInput.value = m.name; document.getElementById("settings-save-llm-btn")?.click(); }
  };
  const btn = document.createElement("button");
  btn.className = "canvas-btn settings-ollama-delete-btn";
  Object.assign(btn.style, { padding: "2px 8px", fontSize: "0.7rem", borderColor: "#ff3c5a", color: "#ff3c5a" });
  btn.setAttribute("data-model", m.name);
  btn.textContent = "Delete";
  btn.onclick = () => {
    if (confirm("Are you sure you want to delete local model " + m.name + "?")) {
      btn.disabled = true; btn.innerText = "Deleting...";
      invoke("ollama_delete_model", { baseUrl, model: m.name })
        .then(() => refreshOllamaModels())
        .catch((err) => { alert("Delete failed: " + err); refreshOllamaModels(); });
    }
  };
  row.append(item, btn);
  return row;
}

function refreshOllamaModels() {
  const baseUrlInput = document.getElementById("settings-ollama-url");
  const baseUrl = (baseUrlInput?.value || "").trim() || "http://localhost:11434";
  const listEl = document.getElementById("settings-ollama-models-list");
  if (!listEl) return;
  const loading = document.createElement("div");
  Object.assign(loading.style, { opacity: "0.5", fontStyle: "italic" });
  loading.textContent = "Loading models...";
  listEl.replaceChildren(loading);
  invoke("ollama_list_models", { baseUrl })
    .then((models) => {
      if (models.length === 0) {
        const empty = document.createElement("div");
        Object.assign(empty.style, { opacity: "0.5", fontStyle: "italic" });
        empty.textContent = "No local models found.";
        listEl.replaceChildren(empty);
        return;
      }
      listEl.replaceChildren();
      models.forEach((m) => listEl.appendChild(_buildOllamaModelRow(m, baseUrl)));
    })
    .catch((err) => {
      const error = document.createElement("div");
      Object.assign(error.style, { color: "#ff6b6b", fontSize: "0.75rem" });
      error.textContent = "Failed to list models: " + String(err);
      listEl.replaceChildren(error);
    });
}`);

// ── renderTransfers ───────────────────────────────────────────────────────────
src = replaceFunction(src, 'renderTransfers', `function _buildTransferItem(t) {
  const item = document.createElement("div");
  item.className = "transfer-item";
  item.id = "transfer-" + t.id;
  const percent = t.size > 0 ? Math.round((t.progress / t.size) * 100) : 0;
  const progressClass = t.status === "Completed" ? "completed" : (t.status === "Failed" || t.status === "Rejected") ? "failed" : "";
  const { speedText, etaText } = calculateTransferSpeedAndEta(t, t.progress);
  const isCancelable = ["Pending","Accepted","Transferring"].includes(t.status);

  const header = document.createElement("div");
  header.className = "transfer-header";
  const filename = document.createElement("span");
  filename.className = "transfer-filename";
  filename.title = String(t.filename ?? "");
  filename.textContent = String(t.filename ?? "");
  const headerRight = document.createElement("div");
  Object.assign(headerRight.style, { display: "flex", alignItems: "center", gap: "8px" });
  const status = document.createElement("span");
  status.className = "transfer-status " + String(t.status || "").toLowerCase();
  status.textContent = String(t.status ?? "");
  headerRight.appendChild(status);
  if (isCancelable) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cancel-transfer-btn";
    cancelBtn.title = "Cancel Transfer";
    cancelBtn.setAttribute("aria-label", "Cancel Transfer");
    cancelBtn.innerHTML = createIcon("x", { size: 12 });
    cancelBtn.addEventListener("click", (e) => { e.stopPropagation(); window.cancelTransfer(t.id); });
    headerRight.appendChild(cancelBtn);
  }
  header.append(filename, headerRight);

  const progressContainer = document.createElement("div");
  progressContainer.className = "transfer-progress-container";
  const progressBg = document.createElement("div");
  progressBg.className = "transfer-progress-bar-bg";
  const progressFill = document.createElement("div");
  progressFill.className = "transfer-progress-bar-fill " + progressClass;
  progressFill.style.width = percent + "%";
  progressBg.appendChild(progressFill);
  const percentEl = document.createElement("span");
  percentEl.className = "transfer-percent";
  percentEl.textContent = percent + "%";
  progressContainer.append(progressBg, percentEl);

  const meta = document.createElement("div");
  meta.className = "transfer-meta";
  const peer = document.createElement("span");
  peer.textContent = (t.direction === "Incoming" ? "From" : "To") + ": " + String(t.peer_name || t.peer_ip || "");
  const stats = document.createElement("span");
  stats.className = "transfer-stats-text";
  stats.textContent = formatBytes(t.progress) + " / " + formatBytes(t.size) + speedText + etaText;
  meta.append(peer, stats);

  item.append(header, progressContainer, meta);
  return item;
}

function renderTransfers(transfers) {
  const listEl = document.getElementById("share-transfers-list");
  if (!listEl) return;
  listEl.replaceChildren();
  if (!transfers || transfers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "transfer-item-empty";
    empty.textContent = "No active or past transfers in this session.";
    listEl.appendChild(empty);
    return;
  }
  if (!window.activeTransfersMap) window.activeTransfersMap = new Map();
  window.activeTransfersMap.clear();
  transfers.sort((a, b) => b.id.localeCompare(a.id));
  transfers.forEach((t) => { window.activeTransfersMap.set(t.id, t); listEl.appendChild(_buildTransferItem(t)); });
}`);

// ── initTunnelClient ──────────────────────────────────────────────────────────
src = replaceFunction(src, 'initTunnelClient', `function _tunnelWireToggle(toggleBtn) {
  if (!toggleBtn) return;
  toggleBtn.onclick = function () {
    if (state.tunnelStatus === "offline") {
      logTunnel("system", "Starting local loopback tunnel server...");
      invoke("start_tunnel_server")
        .then((msg) => { logTunnel("received", msg); setTimeout(checkTunnelServerStatus, 500); })
        .catch((err) => logTunnel("error", "Failed to start server: " + err));
    } else {
      logTunnel("system", "Stopping local loopback tunnel server...");
      invoke("stop_tunnel_server")
        .then((msg) => {
          logTunnel("received", msg);
          state.tunnelStatus = "offline";
          const indicator = document.getElementById("tunnel-status-indicator");
          if (indicator) { indicator.innerText = "OFFLINE"; indicator.className = "tunnel-status-indicator offline"; }
        })
        .catch((err) => logTunnel("error", "Failed to stop server: " + err));
    }
  };
}

function initTunnelClient() {
  const checkBtn = document.getElementById("tunnel-check-btn");
  const toggleBtn = document.getElementById("tunnel-toggle-btn");
  const cmdSend = document.getElementById("tunnel-cmd-send");
  const fileSend = document.getElementById("tunnel-file-send");
  const dirSend = document.getElementById("tunnel-dir-send");

  if (checkBtn) { checkBtn.onclick = function () { logTunnel("system", "Checking tunnel server status..."); checkTunnelServerStatus(); }; }
  _tunnelWireToggle(toggleBtn);
  if (cmdSend) {
    cmdSend.onclick = function () {
      const input = document.getElementById("tunnel-cmd-input");
      const command = input.value.trim();
      if (!command) return;
      logTunnel("sent", "Execute command: " + command);
      sendAndLogTunnelRequest(JSON.stringify({ type: "run_cmd", command }), "Stdout:");
      input.value = "";
    };
  }
  if (fileSend) {
    fileSend.onclick = function () {
      const pathInput = document.getElementById("tunnel-filepath-input");
      const contentArea = document.getElementById("tunnel-filecontent-input");
      const path = pathInput.value.trim();
      const content = contentArea.value;
      if (!path) return;
      logTunnel("sent", "Write file: " + path + " (" + content.length + " chars)");
      sendAndLogTunnelRequest(JSON.stringify({ type: "write_file", path, content }));
      pathInput.value = ""; contentArea.value = "";
    };
  }
  if (dirSend) {
    dirSend.onclick = function () {
      const input = document.getElementById("tunnel-dirpath-input");
      const path = input.value.trim();
      if (!path) return;
      logTunnel("sent", "Read dir: " + path);
      sendAndLogTunnelRequest(JSON.stringify({ type: "read_dir", path }), "Contents:");
      input.value = "";
    };
  }
  checkTunnelServerStatus(true);
  setInterval(() => checkTunnelServerStatus(true), 5000);
}`);

fs.writeFileSync('frontend/src/main.js', src);
const total = src.split('\n').length;
console.log('Done. Total lines:', total);
