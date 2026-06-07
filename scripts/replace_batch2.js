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

// ── loadPluginsList ──────────────────────────────────────────────────────────
src = replaceFunction(src, 'loadPluginsList', `function _buildPluginRow(p) {
  const row = document.createElement("div");
  row.className = "ssh-profile-item";
  row.style.cssText = "padding:6px 8px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;";
  const left = document.createElement("div");
  left.style.cssText = "display:flex;align-items:center;gap:8px;";
  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.className = "plugin-toggle-checkbox";
  chk.setAttribute("data-file", p.file_name);
  chk.checked = !!p.enabled;
  chk.style.accentColor = "var(--accent-color)";
  chk.style.cursor = "pointer";
  chk.onchange = () => {
    const enabled = chk.checked;
    const statusEl = document.getElementById("settings-plugin-status");
    if (statusEl) statusEl.innerText = "Toggling plugin...";
    invoke("toggle_plugin", { fileName: p.file_name, enabled })
      .then(() => { if (statusEl) statusEl.innerText = "Plugin " + (enabled ? "enabled" : "disabled") + " successfully."; loadPluginsList(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Failed to toggle: " + err; chk.checked = !enabled; });
  };
  const name = document.createElement("span");
  name.style.fontWeight = "500";
  name.style.color = p.enabled ? "var(--foreground-color)" : "rgba(255,255,255,0.3)";
  name.textContent = p.name;
  const file = document.createElement("span");
  file.style.cssText = "font-size:0.7rem;opacity:0.5;";
  file.textContent = "(" + p.file_name + ")";
  left.append(chk, name, file);
  const btn = document.createElement("button");
  btn.className = "canvas-btn plugin-edit-btn";
  btn.setAttribute("data-file", p.file_name);
  btn.style.cssText = "padding:3px 8px;font-size:0.75rem;";
  btn.textContent = "Edit";
  btn.onclick = () => {
    const statusEl = document.getElementById("settings-plugin-status");
    if (statusEl) statusEl.innerText = "Reading plugin content...";
    invoke("read_plugin", { fileName: p.file_name })
      .then((content) => {
        document.getElementById("settings-overlay")?.classList.remove("active");
        if (statusEl) statusEl.innerText = "";
        window.neurodeckCanvas.activePluginFile = p.file_name;
        loadCanvasCode("lua", content, p.file_name);
        const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
        if (canvasTab) canvasTab.click();
      })
      .catch((err) => { if (statusEl) statusEl.innerText = "Failed to read plugin: " + err; });
  };
  row.append(left, btn);
  return row;
}

function loadPluginsList() {
  const listEl = document.getElementById("settings-plugins-list");
  if (!listEl) return;
  const loading = document.createElement("div");
  loading.style.cssText = "opacity:0.5;font-style:italic;";
  loading.textContent = "Loading plugins...";
  listEl.replaceChildren(loading);
  invoke("list_plugins")
    .then((plugins) => {
      if (plugins.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "opacity:0.5;font-style:italic;padding:5px;";
        empty.textContent = "No plugins found.";
        listEl.replaceChildren(empty);
        return;
      }
      listEl.replaceChildren();
      plugins.forEach((p) => listEl.appendChild(_buildPluginRow(p)));
    })
    .catch((err) => {
      const error = document.createElement("div");
      error.style.cssText = "color:var(--error-color);padding:5px;";
      error.textContent = "Failed to load plugins: " + String(err);
      listEl.replaceChildren(error);
    });
}`);

// ── renderPluginMarketplace ──────────────────────────────────────────────────
src = replaceFunction(src, 'renderPluginMarketplace', `function _buildMarketplaceCard(plugin) {
  const card = document.createElement("div");
  card.className = ("plugin-marketplace-card " + (plugin.installed ? "installed" : "")).trim();
  const title = document.createElement("div");
  title.className = "plugin-marketplace-title";
  const strong = document.createElement("strong");
  strong.textContent = String(plugin.name ?? "");
  const secondary = document.createElement("span");
  secondary.className = "plugin-marketplace-badge";
  const hasUpdate = plugin.installed && plugin.installed_version && plugin.version && plugin.version !== plugin.installed_version;
  if (plugin.installed && !plugin.enabled) { secondary.textContent = "Disabled"; }
  else if (hasUpdate) { secondary.textContent = "Update → v" + plugin.version; secondary.style.cssText = "background:rgba(255,200,87,0.15);color:var(--warning-color);border-color:rgba(255,200,87,0.3);"; }
  else if (plugin.installed) { secondary.textContent = "Installed"; }
  else { secondary.textContent = "v" + String(plugin.version ?? ""); }
  title.append(strong, secondary);
  const meta = document.createElement("div");
  meta.className = "plugin-marketplace-meta";
  meta.textContent = String(plugin.author ?? "") + " · " + String(plugin.lua_file ?? "");
  const desc = document.createElement("div");
  desc.className = "plugin-marketplace-desc";
  desc.textContent = String(plugin.description ?? "");
  const tagsWrap = document.createElement("div");
  tagsWrap.className = "plugin-marketplace-tags";
  (plugin.tags && plugin.tags.length ? plugin.tags : ["utility"]).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "plugin-marketplace-tag";
    span.textContent = String(tag);
    tagsWrap.appendChild(span);
  });
  const actions = document.createElement("div");
  actions.className = "plugin-marketplace-actions";
  const btn = document.createElement("button");
  btn.className = plugin.installed ? "stv-btn-ghost marketplace-uninstall-btn" : "stv-btn-primary marketplace-install-btn";
  btn.setAttribute("data-plugin-id", String(plugin.id));
  btn.textContent = plugin.installed ? "Uninstall" : "Install";
  btn.onclick = async () => {
    const statusEl = document.getElementById("plugin-marketplace-status");
    btn.disabled = true;
    if (plugin.installed) {
      if (!confirm("Uninstall marketplace plugin '" + plugin.id + "'?")) { btn.disabled = false; return; }
      if (statusEl) statusEl.innerText = "Uninstalling marketplace plugin...";
      try { await invoke("uninstall_plugin", { pluginId: plugin.id }); if (statusEl) statusEl.innerText = "Plugin uninstalled and Lua runtime reloaded."; await loadPluginMarketplace(); loadPluginsList(); }
      catch (err) { if (statusEl) statusEl.innerText = "Uninstall failed: " + err; }
      finally { btn.disabled = false; }
    } else {
      if (statusEl) statusEl.innerText = "Installing marketplace plugin...";
      try { await invoke("install_plugin_from_registry", { pluginId: plugin.id }); if (statusEl) statusEl.innerText = "Plugin installed and Lua runtime reloaded."; await loadPluginMarketplace(); loadPluginsList(); }
      catch (err) { if (statusEl) statusEl.innerText = "Install failed: " + err; }
      finally { btn.disabled = false; }
    }
  };
  actions.appendChild(btn);
  card.append(title, meta, desc, tagsWrap, actions);
  return card;
}

function renderPluginMarketplace() {
  const grid = document.getElementById("plugin-marketplace-grid");
  const tagSelect = document.getElementById("plugin-marketplace-tag");
  const categorySelect = document.getElementById("plugin-marketplace-category");
  if (!grid) return;
  const tags = [...new Set(pluginMarketplaceState.plugins.flatMap((p) => p.tags || []))].sort();
  if (tagSelect) {
    const selected = tagSelect.value || pluginMarketplaceState.tag;
    tagSelect.replaceChildren();
    const allOpt = document.createElement("option"); allOpt.value = ""; allOpt.textContent = "All Tags"; tagSelect.appendChild(allOpt);
    tags.forEach((tag) => { const opt = document.createElement("option"); opt.value = String(tag); opt.textContent = String(tag); tagSelect.appendChild(opt); });
    tagSelect.value = tags.includes(selected) ? selected : "";
    pluginMarketplaceState.tag = tagSelect.value;
  }
  const query = pluginMarketplaceState.search.trim().toLowerCase();
  const selectedTag = pluginMarketplaceState.tag;
  const selectedCategory = categorySelect?.value || "";
  const filtered = pluginMarketplaceState.plugins.filter((plugin) => {
    const haystack = (plugin.name + " " + plugin.description + " " + plugin.author + " " + (plugin.tags || []).join(" ") + " " + (plugin.category || "")).toLowerCase();
    return (!query || haystack.includes(query)) && (!selectedTag || (plugin.tags || []).includes(selectedTag)) && (!selectedCategory || (plugin.category || "utility") === selectedCategory);
  });
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "opacity:0.45;font-style:italic;";
    empty.textContent = "No marketplace plugins match this filter.";
    grid.replaceChildren(empty);
    return;
  }
  grid.replaceChildren();
  filtered.forEach((plugin) => grid.appendChild(_buildMarketplaceCard(plugin)));
}`);

// ── initPluginsManager ───────────────────────────────────────────────────────
src = replaceFunction(src, 'initPluginsManager', `function _pluginsWireInstall(installBtn, urlInput, statusEl) {
  if (!installBtn || !urlInput) return;
  installBtn.onclick = () => {
    const url = urlInput.value.trim();
    if (!url) { alert("Please enter a valid plugin URL."); return; }
    if (statusEl) statusEl.innerText = "Downloading and installing plugin...";
    installBtn.disabled = true;
    invoke("install_plugin", { url })
      .then(() => { if (statusEl) statusEl.innerText = "Plugin installed successfully!"; urlInput.value = ""; loadPluginsList(); loadPluginMarketplace(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Installation failed: " + err; })
      .finally(() => { installBtn.disabled = false; });
  };
}

function _pluginsWireNewBtn(newBtn) {
  if (!newBtn) return;
  newBtn.onclick = () => {
    document.getElementById("settings-overlay")?.classList.remove("active");
    const boilerplate = \`-- plugins/new_plugin.lua
-- Template for a new S-Term plugin.

-- 1. Register a custom chat command (type /mycommand in chat)
registerCommand("mycommand", function(args)
    print("Executing mycommand with args: " .. tostring(args))
    return "mycommand executed! Args: " .. tostring(args)
end)

-- 2. Register hooks to inspect or modify messages/responses
-- Available events: onMessage, onAIResponse
registerHook("onMessage", function(text)
    -- This hook runs whenever a user sends a message.
    -- You can modify the text and return it.
    return text
end)

print("[Plugin] New plugin loaded successfully!")
\`;
    loadCanvasCode("lua", boilerplate, "");
    const canvasTab = document.querySelector('.nav-tab[data-view="canvas"]');
    if (canvasTab) canvasTab.click();
  };
}

function _pluginsWireReload(reloadBtn, statusEl) {
  if (!reloadBtn) return;
  reloadBtn.onclick = () => {
    if (statusEl) statusEl.innerText = "Reloading plugins in engine...";
    reloadBtn.disabled = true;
    invoke("reload_plugins")
      .then(() => { if (statusEl) statusEl.innerText = "Plugins reloaded successfully!"; loadPluginsList(); loadPluginMarketplace(); })
      .catch((err) => { if (statusEl) statusEl.innerText = "Reload failed: " + err; })
      .finally(() => { reloadBtn.disabled = false; });
  };
}

function initPluginsManager() {
  const installBtn = document.getElementById("settings-plugin-install-btn");
  const urlInput = document.getElementById("settings-plugin-install-url");
  const statusEl = document.getElementById("settings-plugin-status");
  const newBtn = document.getElementById("settings-plugin-new-btn");
  const reloadBtn = document.getElementById("settings-plugin-reload-btn");
  const marketplaceSearch = document.getElementById("plugin-marketplace-search");
  const marketplaceTag = document.getElementById("plugin-marketplace-tag");
  const marketplaceRefresh = document.getElementById("plugin-marketplace-refresh-btn");

  _pluginsWireInstall(installBtn, urlInput, statusEl);
  _pluginsWireNewBtn(newBtn);
  _pluginsWireReload(reloadBtn, statusEl);

  if (marketplaceSearch) marketplaceSearch.oninput = () => { pluginMarketplaceState.search = marketplaceSearch.value || ""; renderPluginMarketplace(); };
  if (marketplaceTag) marketplaceTag.onchange = () => { pluginMarketplaceState.tag = marketplaceTag.value || ""; renderPluginMarketplace(); };
  const marketplaceCategory = document.getElementById("plugin-marketplace-category");
  if (marketplaceCategory) marketplaceCategory.onchange = () => renderPluginMarketplace();
  if (marketplaceRefresh) marketplaceRefresh.onclick = () => loadPluginMarketplace();
  loadPluginMarketplace();
}`);

// ── initComputerUse ──────────────────────────────────────────────────────────
src = replaceFunction(src, 'initComputerUse', `function _cuBuildApi() {
  return {
    captureScreenshot: captureComputerScreenshot,
    requestApproval: requestComputerUseApproval,
    mouseMove: (x, y) => invokeApprovedComputerAction("computer_mouse_move", { x, y }, { action: "Move mouse pointer", details: "Move pointer to " + x + ", " + y + ".", target: { x, y, width: 28, height: 28 } }),
    click: (button = "left") => invokeApprovedComputerAction("computer_mouse_click", { button }, { action: "Mouse click", details: "Perform a " + button + " click at the current pointer position." }),
    type: (text) => invokeApprovedComputerAction("computer_type", { text }, { action: "Type text", details: "Type " + String(text || "").length + " character" + (String(text || "").length === 1 ? "" : "s") + " into the focused application." }),
    key: (key) => invokeApprovedComputerAction("computer_key", { key }, { action: "Press keyboard key", details: "Send key: " + key + "." }),
    findText: (text) => invoke("computer_find_text", { text }),
  };
}

function initComputerUse() {
  const captureBtn = document.getElementById("computer-capture-btn");
  const ocrBtn = document.getElementById("computer-ocr-btn");
  const ocrInput = document.getElementById("computer-ocr-input");
  const approveAllToggle = document.getElementById("computer-approve-all-toggle");
  const approveBtn = document.getElementById("computer-use-approve-btn");
  const approveSessionBtn = document.getElementById("computer-use-approve-session-btn");
  const denyBtn = document.getElementById("computer-use-deny-btn");
  const denyX = document.getElementById("computer-use-deny-x");

  if (approveAllToggle) {
    approveAllToggle.checked = computerUseState.approveAll;
    approveAllToggle.onchange = () => { computerUseState.approveAll = approveAllToggle.checked; setComputerStatus(computerUseState.approveAll ? "Computer use auto-approval is active for this session." : "Computer use approval modal is active.", "info"); };
  }
  if (captureBtn) {
    captureBtn.onclick = async () => {
      captureBtn.disabled = true; setComputerStatus("Capturing desktop screenshot...");
      try { await captureComputerScreenshot({ showInAgentLog: true }); setComputerStatus("Screenshot captured.", "ok"); }
      catch (err) { setComputerStatus("Screenshot failed: " + err, "error"); }
      finally { captureBtn.disabled = false; }
    };
  }
  if (ocrBtn && ocrInput) {
    ocrBtn.onclick = async () => {
      const text = ocrInput.value.trim();
      if (!text) { ocrInput.focus(); return; }
      ocrBtn.disabled = true; setComputerStatus("Running OCR over the current desktop...");
      try {
        const match = await invoke("computer_find_text", { text });
        await requestComputerUseApproval({ action: "Found text: " + match.text, details: "Coordinates " + match.x + ", " + match.y + "; confidence " + Math.round(match.confidence) + "%.", target: match });
        setComputerStatus('Found "' + match.text + '" at ' + match.x + ", " + match.y + ".", "ok");
      } catch (err) { setComputerStatus("OCR failed: " + err, "error"); }
      finally { ocrBtn.disabled = false; }
    };
  }
  if (approveBtn) approveBtn.onclick = () => finishComputerUseApproval(true, false);
  if (approveSessionBtn) approveSessionBtn.onclick = () => finishComputerUseApproval(true, true);
  if (denyBtn) denyBtn.onclick = () => finishComputerUseApproval(false, false);
  if (denyX) denyX.onclick = () => finishComputerUseApproval(false, false);
  window.neurodeckComputerUse = _cuBuildApi();
}`);

// ── initSessionBrowser ───────────────────────────────────────────────────────
src = replaceFunction(src, 'initSessionBrowser', `function _sbFormatDate(isoStr) {
  try {
    const d = new Date(isoStr), now = new Date(), diff = now - d;
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 7 * 86_400_000) return d.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return isoStr || ""; }
}

function _sbBuildSessionItem(session, loadSessions) {
  const item = document.createElement("div");
  item.className = "session-browser-item";
  item.dataset.id = session.id;
  const title = document.createElement("div");
  title.className = "session-browser-title";
  title.textContent = session.name || _sbFormatDate(session.created_at);
  const meta = document.createElement("div");
  meta.className = "session-browser-meta";
  meta.textContent = session.message_count + " msgs" + (session.preview ? " · " + session.preview : "");
  const actions = document.createElement("div");
  actions.className = "session-browser-actions";
  const openBtn = document.createElement("button");
  openBtn.className = "session-browser-btn"; openBtn.title = "Restore session"; openBtn.innerHTML = createIcon("cornerDownLeft", { size: 12 });
  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    invoke("load_session_by_id", { id: session.id })
      .then((data) => { activateViewByName("chat"); if (typeof window.restoreSessionMessages === "function") window.restoreSessionMessages(data); addNotification("Session Restored", "Loaded: " + (session.name || session.id), "success"); })
      .catch((err) => addNotification("Session Error", String(err), "error"));
  });
  const renameBtn = document.createElement("button");
  renameBtn.className = "session-browser-btn"; renameBtn.title = "Rename"; renameBtn.innerHTML = createIcon("pencil", { size: 12 });
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newName = prompt("Rename session:", session.name || "");
    if (newName === null) return;
    invoke("rename_session", { id: session.id, name: newName.trim() }).then(() => loadSessions()).catch((err) => addNotification("Rename Error", String(err), "error"));
  });
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "session-browser-btn session-browser-btn--danger"; deleteBtn.title = "Delete"; deleteBtn.innerHTML = createIcon("trash2", { size: 12 });
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!confirm('Delete session "' + (session.name || session.id) + '"?')) return;
    invoke("delete_session", { id: session.id }).then(() => loadSessions()).catch((err) => addNotification("Delete Error", String(err), "error"));
  });
  actions.append(openBtn, renameBtn, deleteBtn);
  item.append(title, meta, actions);
  item.addEventListener("click", () => openBtn.click());
  return item;
}

function _sbRenderSessionList(sessions, list, loadSessions) {
  list.innerHTML = "";
  if (!sessions || sessions.length === 0) {
    const empty = document.createElement("div"); empty.className = "session-browser-empty"; empty.textContent = "No saved sessions yet."; list.appendChild(empty); return;
  }
  sessions.forEach(session => list.appendChild(_sbBuildSessionItem(session, loadSessions)));
}

function initSessionBrowser() {
  const toggleBtn = document.getElementById("session-browser-toggle");
  const list = document.getElementById("session-browser-list");
  const chevron = document.getElementById("session-browser-chevron");
  if (!toggleBtn || !list) return;
  let loaded = false;
  const loadSessions = () => invoke("list_sessions_meta").then(sessions => _sbRenderSessionList(sessions, list, loadSessions)).catch(() => { list.innerHTML = '<div class="session-browser-empty" style="color:var(--error-color)">Failed to load sessions.</div>'; });
  toggleBtn.addEventListener("click", () => {
    const isHidden = list.classList.contains("hidden");
    list.classList.toggle("hidden", !isHidden);
    toggleBtn.setAttribute("aria-expanded", String(isHidden));
    if (chevron) chevron.style.transform = isHidden ? "rotate(90deg)" : "rotate(0deg)";
    if (isHidden && !loaded) { loaded = true; loadSessions(); }
  });
  document.addEventListener("neurodeck:session-saved", loadSessions);
}`);

// ── initShortcutCustomization ────────────────────────────────────────────────
src = replaceFunction(src, 'initShortcutCustomization', `function _scFormatKeys(keys) {
  return keys.map((k) => '<kbd style="font-size:0.7rem;padding:2px 6px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;background:rgba(255,255,255,0.06);font-family:var(--font-mono)">' + escapeHtml(k) + '</kbd>').join(" + ");
}

function _scBuildShortcutRow(sc, overrides, table) {
  const effectiveKeys = overrides[sc.action] || sc.keys;
  const isCustom = !!overrides[sc.action];
  const row = document.createElement("div");
  row.className = "shortcut-row-custom";
  row.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;border:1px solid transparent;transition:background 0.12s,border-color 0.12s;";
  const actionSpan = document.createElement("span");
  actionSpan.style.cssText = "flex:1;font-size:0.78rem;color:rgba(255,255,255,0.7);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  actionSpan.textContent = sc.action;
  if (sc.scope !== "global") {
    const scope = document.createElement("span");
    scope.style.cssText = "font-size:0.65rem;opacity:0.4;margin-left:6px;font-family:var(--font-mono)";
    scope.textContent = "[" + sc.scope + "]";
    actionSpan.appendChild(scope);
  }
  const keysSpan = document.createElement("span");
  keysSpan.style.cssText = "display:flex;gap:3px;align-items:center;flex-shrink:0;";
  keysSpan.innerHTML = _scFormatKeys(effectiveKeys);
  if (isCustom) {
    const badge = document.createElement("span");
    badge.style.cssText = "font-size:0.6rem;color:var(--warning-color);margin-left:4px;opacity:0.8;";
    badge.textContent = "✎";
    keysSpan.appendChild(badge);
  }
  const resetBtn = document.createElement("button");
  resetBtn.style.cssText = "background:transparent;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:2px 5px;border-radius:4px;font-size:0.65rem;display:" + (isCustom ? "block" : "none") + ";";
  resetBtn.title = "Reset to default"; resetBtn.textContent = "↺";
  resetBtn.addEventListener("click", (e) => { e.stopPropagation(); resetShortcutOverride(sc.action); _scRenderTable(table); });
  row.append(actionSpan, keysSpan, resetBtn);
  row.addEventListener("click", () => {
    row.style.background = "rgba(var(--accent-rgb),0.1)";
    row.style.borderColor = "rgba(var(--accent-rgb),0.3)";
    keysSpan.innerHTML = '<span style="font-size:0.72rem;color:var(--accent-color);font-family:var(--font-mono)">Press keys…</span>';
    const onKey = (e) => {
      if (e.key === "Escape") { document.removeEventListener("keydown", onKey, true); _scRenderTable(table); return; }
      const keys = [];
      if (e.ctrlKey || e.metaKey) keys.push("Ctrl");
      if (e.shiftKey) keys.push("Shift");
      if (e.altKey) keys.push("Alt");
      if (!["Control","Shift","Alt","Meta"].includes(e.key)) keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (keys.length > 0 && !keys.every((k) => ["Ctrl","Shift","Alt"].includes(k))) { e.preventDefault(); e.stopPropagation(); document.removeEventListener("keydown", onKey, true); saveShortcutOverride(sc.action, keys); _scRenderTable(table); }
    };
    document.addEventListener("keydown", onKey, true);
  });
  row.addEventListener("mouseenter", () => { row.style.background = "rgba(255,255,255,0.03)"; row.style.borderColor = "var(--border-color)"; });
  row.addEventListener("mouseleave", () => { row.style.background = ""; row.style.borderColor = "transparent"; });
  return row;
}

function _scRenderTable(table) {
  const overrides = getShortcutOverrides();
  table.innerHTML = "";
  KEYBOARD_SHORTCUTS.filter((s) => s.scope !== "radial" && s.scope !== "browser").forEach((sc) => table.appendChild(_scBuildShortcutRow(sc, overrides, table)));
}

function initShortcutCustomization() {
  const table = document.getElementById("shortcut-customization-table");
  if (!table) return;
  _scRenderTable(table);
}`);

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
