const fs = require('fs');
let src = fs.readFileSync('frontend/src/main.js', 'utf8');

function replaceFunction(src, fnName, newCode) {
  const lines = src.split('\n');
  const startIdx = lines.findIndex(l => (l.startsWith('function ' + fnName + '(') || l.startsWith('async function ' + fnName + '(')));
  if (startIdx < 0) { console.error('NOT FOUND: ' + fnName); return src; }
  let depth = 0, endIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') depth++; if (ch === '}') depth--; }
    if (depth === 0 && i > startIdx) { endIdx = i; break; }
  }
  console.log(fnName + ': lines ' + (startIdx+1) + '-' + (endIdx+1));
  return [...lines.slice(0, startIdx), newCode, ...lines.slice(endIdx + 1)].join('\n');
}

// ── Split _applyInitialState into sub-helpers ─────────────────────────────────
src = replaceFunction(src, '_applyInitialState', `function _initUpdateStatusBadges(initialState) {
  const modelNameEl = document.getElementById("model-name");
  if (modelNameEl) modelNameEl.innerText = \`[ MODEL: \${initialState.model.toUpperCase()} ]\`;
  const dbStatusEl = document.getElementById("vector-db-status");
  if (dbStatusEl) dbStatusEl.innerText = initialState.memory_status;
  const memoryStatusEl = document.getElementById("memory-status");
  if (memoryStatusEl) memoryStatusEl.innerText = initialState.memory_status;
  const toolStatusEl = document.getElementById("tool-status");
  if (toolStatusEl) {
    toolStatusEl.innerText = initialState.tool_status;
    if (initialState.boot_health_status && initialState.boot_health_status !== "healthy") {
      toolStatusEl.innerText = "Recovered Boot";
    }
  }
  const sessionIdEl = document.getElementById("session-id");
  if (sessionIdEl) sessionIdEl.innerText = initialState.session_id;
}

function _initSetupStateAndListeners(initialState) {
  state.currentSessionId = initialState.session_id;
  state.activePersona = initialState.active_persona || "Default";
  state.activeProvider = initialState.provider || "gemini";
  state.activeAgentId = initialState.active_agent_id || "";
  invoke("list_agents").then((agents) => { state.agents = agents; renderAgentSwitcher(); }).catch(() => {});
  listen("agent_changed", (event) => {
    const agent = event.payload;
    state.activeAgentId = agent.id;
    state.activeProvider = agent.provider;
    const el = document.getElementById("model-name");
    if (el) el.innerText = \`[ \${agent.name.toUpperCase()} ]\`;
    renderAgentSwitcher();
  });
  updateContextDrawer();
  updateGameBadge({ name: initialState.game_name || "", app_id: initialState.game_app_id || "", is_running: initialState.game_running || "false" });
  invoke("get_personas").then((personas) => { state.availablePersonas = personas; }).catch((err) => { console.error("Error loading personas:", err); });
}

async function _initRunDiskMigration() {
  if (localStorage.getItem("neurodeck_disk_migrated_v1")) return;
  const migrateProfiles = async (lsKey, profileKey) => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw && raw !== "[]") await invoke("save_profiles", { key: profileKey, data: raw });
    } catch (_) {}
  };
  const migrateThemes = async () => {
    try {
      const raw = localStorage.getItem("neurodeck_custom_themes");
      if (raw && raw !== "[]") await invoke("save_custom_themes", { data: raw });
    } catch (_) {}
  };
  await Promise.all([migrateProfiles("sshProfiles", "ssh"), migrateProfiles("ftpProfiles", "ftp"), migrateProfiles("sftpProfiles", "sftp"), migrateThemes()]);
  localStorage.setItem("neurodeck_disk_migrated_v1", "true");
}

function _initRunOriginMigration() {
  if (localStorage.getItem("neurodeck_origin_migrated_v2")) return;
  if (!localStorage.getItem("selectedTheme")) localStorage.setItem("selectedTheme", "BLACKSITE");
  if (!localStorage.getItem("neurodeckTheme")) localStorage.setItem("neurodeckTheme", "BLACKSITE");
  localStorage.setItem("neurodeck_origin_migrated_v2", "true");
  if (typeof addNotification === "function") addNotification("Updated", "App origin changed — UI preferences reset to defaults.", "info");
}

function _initBootHealthNotification(initialState) {
  if (!initialState.boot_health_status || initialState.boot_health_status === "healthy" || typeof addNotification !== "function") return;
  const level = initialState.boot_health_warning_count && Number(initialState.boot_health_warning_count) > 0 ? "warning" : "info";
  addNotification("Boot Recovery", initialState.boot_health_summary || "Startup self-heal applied recovery actions.", level);
}

async function _applyInitialState(initialState) {
  _initUpdateStatusBadges(initialState);
  _initSetupStateAndListeners(initialState);
  await _initRunDiskMigration();
  _initRunOriginMigration();
  const savedTheme = localStorage.getItem("selectedTheme");
  if (savedTheme) invoke("set_theme", { name: savedTheme }).then((theme) => { if (theme) applyThemeColors(theme); });
  initChat(); initSettings(); initTerminal(); initCanvas(); initNotificationCenter();
  initSessionBrowser(); initShortcutsOverlay(); initShortcutCustomization(); initOsThemeSync();
  const initialActiveTab = document.querySelector(".nav-tab.active");
  if (initialActiveTab) updateTabGlide(initialActiveTab);
  _initBootHealthNotification(initialState);
  initCommandPalette(); initQuickSwitcher(); initGameContextPanel();
  initTunnelClient(); initFileShare(); initBrowser();
  initAgentView(); initMemoryView(); initRadialMenu(); initManualModal();
  checkOnboarding();
}`);

// ── Split _navTabClick into sub-helpers ───────────────────────────────────────
src = replaceFunction(src, '_navTabClick', `function _navAnimateTransition(outgoing, incoming, direction, currentViewId) {
  if (outgoing) {
    outgoing.classList.remove("active");
    outgoing.classList.add(\`view-exit-\${direction}\`);
    setTimeout(() => outgoing.classList.remove(\`view-exit-\${direction}\`), 300);
    if (currentViewId === "view-ide") deactivateIdeView();
  }
  if (incoming) {
    const enterDir = direction === "right" ? "left" : "right";
    incoming.classList.remove("view-enter-left", "view-enter-right");
    incoming.classList.add(\`view-enter-\${enterDir}\`);
    void incoming.offsetWidth;
    incoming.classList.add("active");
    incoming.classList.remove(\`view-enter-\${enterDir}\`);
  }
}

function _navActivateSideEffects(targetViewName) {
  if (targetViewName === "terminal" && window.ptyTerminalFitAddon) {
    setTimeout(() => { try { window.ptyTerminalFitAddon.fit(); } catch (e) { console.error("Error fitting terminal:", e); } }, 50);
  }
  if (targetViewName === "ssh") {
    if (!window.sshTerminal) initSshTerminal();
    setTimeout(() => { try { window.sshTerminalFitAddon?.fit(); } catch (e) {} }, 50);
  }
  if (targetViewName === "share") {
    Promise.all([initSshProfilesFromDisk(), initFtpProfilesFromDisk(), initSftpProfilesFromDisk()])
      .then(() => { renderSshProfilesSettings(); renderFtpProfiles(); renderSftpProfiles(); });
  }
  if (targetViewName === "git" && typeof initGitView === "function") initGitView();
  if (targetViewName === "api-lab" && typeof initApiLabView === "function") initApiLabView();
  if (targetViewName === "cli-maker" && typeof initCliMakerView === "function") initCliMakerView();
  if (targetViewName === "graph" && typeof initGraphView === "function") initGraphView();
  if (targetViewName === "scheduler" && typeof initSchedulerView === "function") initSchedulerView();
  if (targetViewName === "workflow" && typeof initWorkflowView === "function") initWorkflowView();
  if (targetViewName === "ide" && typeof initIdeView === "function") initIdeView();
  if (targetViewName === "orchestrator" && typeof initOrchestrator === "function") initOrchestrator();
  if (targetViewName === "share" && typeof initTorrentClient === "function") initTorrentClient();
}

function _navTabClick(tab, navTabs) {
  const targetViewName = tab.getAttribute("data-view");
  const targetViewId = \`view-\${targetViewName}\`;
  if (targetViewId === currentViewId) return;

  const tabsArray = Array.from(navTabs);
  const currentIdx = tabsArray.findIndex((t) => t.getAttribute("data-view") === currentViewId.replace("view-", ""));
  const targetIdx = tabsArray.indexOf(tab);
  const direction = targetIdx > currentIdx ? "right" : "left";

  navTabs.forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  updateTabGlide(tab);
  ensureTabVisible(tab);
  saveViewState(currentViewId);

  const outgoing = document.getElementById(currentViewId);
  const incoming = document.getElementById(targetViewId);
  _navAnimateTransition(outgoing, incoming, direction, currentViewId);
  currentViewId = targetViewId;
  recordViewSwitch(targetViewId);

  requestAnimationFrame(() => restoreViewState(targetViewId));
  updateBreadcrumb(targetViewName);
  updateContextualSidebar(targetViewName);
  showContextualTip(targetViewName);
  _navActivateSideEffects(targetViewName);
}`);

fs.writeFileSync('frontend/src/main.js', src);
console.log('Done. Total lines:', src.split('\n').length);
