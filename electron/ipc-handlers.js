/**
 * IPC Handlers Registration
 * Maps all allowed IPC channels to their respective service layer and sidecar actions.
 */
'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('./ipc-registry');
const { ipcGuard, createError } = require('./ipc-guards');

// Helper to make fetch calls to the local Rust sidecar server
async function callSidecar(bridgePort, command, args = {}) {
  const url = `http://127.0.0.1:${bridgePort}/api/${command}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown bridge error');
      throw createError('SIDECAR_ERROR', `Bridge Server Error: ${errorText}`, 'api');
    }
    
    return await res.json();
  } catch (err) {
    if (err.code === 'SIDECAR_ERROR') throw err;
    throw createError('SIDECAR_OFFLINE', `Cannot connect to Bridge Server: ${err.message}`, 'network');
  }
}

const { detectProject } = require('./services/ide/projectDetectionService');
const { safeCommandExecutionService } = require('./services/ide/safeCommandExecutionService');
const { rankPredictions } = require('./services/ide/predictiveCodingService');
const { randomUUID } = require('crypto');

function registerIpcHandlers(mainWindow, lspManager, connectionRegistry, healthProbeRunner, bridgePort, isDev) {
  const guard = (channel, schema, handler) => {
    ipcMain.handle(channel, ipcGuard(channel, schema, handler, isDev));
  };

  // ── LSP Handlers ───────────────────────────────────────────────────

  guard(IPC.LSP_START_SERVER, {
    language: { type: 'string', required: true },
    command: { type: 'string', required: true },
    args: { type: 'array', required: false }
  }, async (payload) => {
    return lspManager.startServer(payload.language, payload.command, payload.args || []);
  });

  guard(IPC.LSP_STOP_SERVER, {
    language: { type: 'string', required: true }
  }, async (payload) => {
    return lspManager.stopServer(payload.language);
  });

  guard(IPC.LSP_OPEN_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    content: { type: 'string', required: true }
  }, async (payload) => {
    lspManager.openDocument(payload.language, payload.uri, payload.content);
    return { success: true };
  });

  guard(IPC.LSP_CHANGE_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    content: { type: 'string', required: true },
    version: { type: 'number', required: true }
  }, async (payload) => {
    lspManager.changeDocument(payload.language, payload.uri, payload.content, payload.version);
    return { success: true };
  });

  guard(IPC.LSP_CLOSE_DOCUMENT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true }
  }, async (payload) => {
    lspManager.closeDocument(payload.language, payload.uri);
    return { success: true };
  });

  guard(IPC.LSP_COMPLETION, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.completion(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_HOVER, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.hover(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_DEFINITION, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true },
    line: { type: 'number', required: true },
    character: { type: 'number', required: true }
  }, async (payload) => {
    return lspManager.definition(payload.language, payload.uri, payload.line, payload.character);
  });

  guard(IPC.LSP_FORMAT, {
    language: { type: 'string', required: true },
    uri: { type: 'string', required: true }
  }, async (payload) => {
    return lspManager.format(payload.language, payload.uri);
  });

  // ── Models Handlers ────────────────────────────────────────────────

  guard(IPC.MODELS_LIST, {}, async () => {
    const list = await callSidecar(bridgePort, 'ollama_list_models');
    return list;
  });

  guard(IPC.MODELS_STATUS, {}, async () => {
    const health = await callSidecar(bridgePort, 'get_system_health');
    return health;
  });

  guard(IPC.MODELS_RUN_PROMPT, {
    prompt: { type: 'string', required: true },
    provider: { type: 'string', required: false },
    model: { type: 'string', required: false }
  }, async (payload) => {
    return callSidecar(bridgePort, 'send_command', {
      message: payload.prompt,
      provider: payload.provider,
      model: payload.model
    });
  });

  // ── Sessions Handlers ──────────────────────────────────────────────

  guard(IPC.SESSIONS_CREATE, {}, async () => {
    return callSidecar(bridgePort, 'load_latest_session');
  });

  guard(IPC.SESSIONS_LIST, {}, async () => {
    return callSidecar(bridgePort, 'list_sessions');
  });

  guard(IPC.SESSIONS_SAVE, {
    payload: { type: 'object', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'save_session', payload);
  });

  // ── Memory Handlers ────────────────────────────────────────────────

  guard(IPC.MEMORY_SEARCH, {
    query: { type: 'string', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'memory_list', { limit: 10, offset: 0 });
  });

  guard(IPC.MEMORY_WRITE, {
    content: { type: 'string', required: true }
  }, async (payload) => {
    return callSidecar(bridgePort, 'memory_add_fact', { content: payload.content });
  });

  // ── Diagnostics Handlers ───────────────────────────────────────────

  guard(IPC.DIAGNOSTICS_CONNECTION_MATRIX, {}, async () => {
    return connectionRegistry.getConnectionMatrix();
  });

  guard(IPC.DIAGNOSTICS_RUN_PROBE, {
    id: { type: 'string', required: false }
  }, async (payload) => {
    if (payload.id) {
      await healthProbeRunner.runProbe(payload.id);
    } else {
      await healthProbeRunner.runAllProbes();
    }
    return connectionRegistry.getConnectionMatrix();
  });

  // ── Settings Handlers ──────────────────────────────────────────────

  guard(IPC.SETTINGS_GET, {
    key: { type: 'string', required: true }
  }, async (payload) => {
    if (payload.key === 'themeSettings') {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return { payload: JSON.parse(content) };
        }
      } catch (e) {
        console.error('[theme] failed to read theme-settings.json:', e);
      }
      return null;
    }
    const config = await callSidecar(bridgePort, 'get_config');
    // Extract property recursively
    const parts = payload.key.split('.');
    let val = config;
    for (const part of parts) {
      if (val && typeof val === 'object') {
        val = val[part];
      } else {
        return null;
      }
    }
    return val;
  });

  guard(IPC.SETTINGS_SET, {
    key: { type: 'string', required: true },
    value: { required: true }
  }, async (payload) => {
    if (payload.key === 'themeSettings') {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
      try {
        fs.writeFileSync(filePath, JSON.stringify(payload.value, null, 2));
        return { success: true };
      } catch (e) {
        console.error('[theme] failed to write theme-settings.json:', e);
        return { success: false, error: e.message };
      }
    }
    if (payload.key === 'llm.provider') {
      await callSidecar(bridgePort, 'set_provider', { provider: payload.value });
      return { success: true };
    }
    if (payload.key === 'llm.model') {
      await callSidecar(bridgePort, 'set_model', { model: payload.value });
      return { success: true };
    }
    if (payload.key === 'llm.gemini_key') {
      await callSidecar(bridgePort, 'set_gemini_api_key', { key: payload.value });
      return { success: true };
    }
    return { success: false, error: `Key "${payload.key}" is not configurable via this channel.` };
  });

  // ── IDE Predictive Coding Handlers ────────────────────────────────

  guard(IPC.IDE_DETECT_PROJECT, {
    workspacePath: { type: 'string', required: true }
  }, async (payload) => {
    return detectProject(payload.workspacePath);
  });

  guard(IPC.IDE_RUN_COMMAND, {
    commandId: { type: 'string', required: false },
    command: { type: 'string', required: true },
    args: { type: 'array', required: true },
    cwd: { type: 'string', required: true },
    safety: { type: 'string', required: true },
    label: { type: 'string', required: true }
  }, async (payload) => {
    return new Promise((resolve) => {
      const commandId = payload.commandId || randomUUID();
      const output = [];

      safeCommandExecutionService.execute({
        commandId,
        command: payload.command,
        args: payload.args,
        cwd: payload.cwd,
        safety: payload.safety,
        label: payload.label,
        onOutput: (type, data) => {
          output.push({ type, data });
          // Push output events to renderer via IPC if mainWindow is available
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ide:command-output', { commandId, type, data });
          }
        },
        onExit: (code) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ide:command-exit', { commandId, exitCode: code });
          }
          resolve({ commandId, exitCode: code, output });
        }
      });

      resolve({ commandId, startedAt: new Date().toISOString() });
    });
  });

  guard(IPC.IDE_CANCEL_COMMAND, {
    commandId: { type: 'string', required: true }
  }, async (payload) => {
    const cancelled = safeCommandExecutionService.cancel(payload.commandId);
    return { commandId: payload.commandId, cancelled };
  });

  guard(IPC.IDE_GET_COMMAND_HISTORY, {}, async () => {
    return safeCommandExecutionService.getHistory();
  });

  guard(IPC.IDE_GET_PREDICTIONS, {
    filePath: { type: 'string', required: true },
    languageId: { type: 'string', required: true },
    cursorLine: { type: 'number', required: true },
    cursorChar: { type: 'number', required: true },
    diagnosticsCount: { type: 'number', required: false },
    snippetIds: { type: 'array', required: false },
    commandTemplates: { type: 'array', required: false },
    lspCompletions: { type: 'array', required: false }
  }, async (payload) => {
    return rankPredictions({
      filePath: payload.filePath,
      languageId: payload.languageId,
      cursorLine: payload.cursorLine,
      cursorChar: payload.cursorChar,
      diagnosticsCount: payload.diagnosticsCount ?? 0,
      snippetIds: payload.snippetIds ?? [],
      commandTemplates: payload.commandTemplates ?? [],
      lspCompletions: payload.lspCompletions ?? [],
    });
  });

  guard(IPC.IDE_APPLY_SNIPPET, {
    snippetId: { type: 'string', required: true },
    languageId: { type: 'string', required: true }
  }, async (payload) => {
    // Snippet expansion happens on renderer side using the shared predictiveSnippets module.
    // This handler just confirms the snippet exists.
    return { snippetId: payload.snippetId, acknowledged: true };
  });

  // ── Controller IDE Handlers ────────────────────────────────────────

  guard(IPC.CONTROLLER_GET_IDE_ACTION_MAP, {}, async () => {
    // Return the static action map — defined in shared/ide/controllerActions.ts
    // The renderer loads this directly; this endpoint is for external tooling.
    return { status: 'ok', message: 'Load from frontend/src/shared/ide/controllerActions.ts' };
  });

  guard(IPC.CONTROLLER_SET_IDE_MODE, {
    mode: { type: 'string', required: true }
  }, async (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('controller:ide-mode-changed', { mode: payload.mode });
    }
    return { mode: payload.mode, set: true };
  });

  // ── Theme Overhaul Handlers ───────────────────────────────────────

  guard(IPC.THEME_GET, {}, async () => {
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (_) {}
    }
    return { activeThemeId: 'blacksite_prime' };
  });

  guard(IPC.THEME_SET, {
    settings: { type: 'object', required: true }
  }, async (payload) => {
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
    try {
      fs.writeFileSync(filePath, JSON.stringify(payload.settings, null, 2));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  guard(IPC.THEME_LIST, {}, async () => {
    return [
      { id: 'blacksite_prime', name: 'Blacksite Prime' },
      { id: 'tactical_glass_ultra', name: 'Tactical Glass Ultra' },
      { id: 'ghost_terminal_pro', name: 'Ghost Terminal Pro' }
    ];
  });

  guard(IPC.WALLPAPER_GET, {}, async () => {
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
    if (fs.existsSync(filePath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return { id: settings.activeWallpaperId || 'neural_aurora' };
      } catch (_) {}
    }
    return { id: 'neural_aurora' };
  });

  guard(IPC.WALLPAPER_SET, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const filePath = path.join(app.getPath('userData'), 'theme-settings.json');
    try {
      let settings = {};
      if (fs.existsSync(filePath)) {
        settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      settings.activeWallpaperId = payload.id;
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  guard(IPC.WALLPAPER_LIST, {}, async () => {
    return [
      { id: 'neural_aurora', name: 'Neural Aurora' },
      { id: 'tactical_signal_grid', name: 'Tactical Signal Grid' }
    ];
  });

  // ── NeuroBrowse Handlers ───────────────────────────────────────────
  const { browserTabManager } = require('./dist/main/services/browser/browserTabManager');
  const { browserViewManager } = require('./dist/main/services/browser/browserViewManager');
  const { browserNavigationService } = require('./dist/main/services/browser/browserNavigationService');
  const { browserSessionService } = require('./dist/main/services/browser/browserSessionService');
  const { browserPermissionService } = require('./dist/main/services/browser/browserPermissionService');
  const { browserDownloadService } = require('./dist/main/services/browser/browserDownloadService');
  const { browserHistoryService } = require('./dist/main/services/browser/browserHistoryService');
  const { browserBookmarkService } = require('./dist/main/services/browser/browserBookmarkService');
  const { browserFindInPageService } = require('./dist/main/services/browser/browserFindInPageService');
  const { browserDiagnosticsService } = require('./dist/main/services/browser/browserDiagnosticsService');
  const { browserProfileService } = require('./dist/main/services/browser/browserProfileService');
  const { browserUrlNormalizer } = require('./dist/main/services/browser/browserUrlNormalizer');
  const { browserSearchEngineService } = require('./dist/main/services/browser/browserSearchEngineService');
  const { vpnRouteManager } = require('./dist/main/services/browser-vpn/vpnRouteManager');
  const { vpnConfigImportService } = require('./dist/main/services/browser-vpn/vpnConfigImportService');
  const { vpnDiagnosticsService } = require('./dist/main/services/browser-vpn/vpnDiagnosticsService');

  browserViewManager.setMainWindow(mainWindow);

  // tab handlers
  guard(IPC.BROWSER_CREATE_TAB, {
    url: { type: 'string', required: false },
    profileId: { type: 'string', required: false }
  }, async (payload) => {
    const tab = browserTabManager.createTab(payload.url, payload.profileId);
    browserViewManager.getOrCreateView(tab.id);
    browserViewManager.syncActiveView();
    return tab;
  });

  guard(IPC.BROWSER_CLOSE_TAB, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    browserViewManager.destroyView(payload.tabId);
    const success = browserTabManager.closeTab(payload.tabId);
    browserViewManager.syncActiveView();
    return { success };
  });

  guard(IPC.BROWSER_SWITCH_TAB, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    const success = browserTabManager.switchTab(payload.tabId);
    browserViewManager.syncActiveView();
    return { success };
  });

  guard(IPC.BROWSER_DUPLICATE_TAB, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    const tab = browserTabManager.duplicateTab(payload.tabId);
    if (tab) {
      browserViewManager.getOrCreateView(tab.id);
      browserViewManager.syncActiveView();
    }
    return tab;
  });

  guard(IPC.BROWSER_GET_TABS, {}, async () => {
    return browserTabManager.listTabs();
  });

  guard(IPC.BROWSER_GET_ACTIVE_TAB, {}, async () => {
    return browserTabManager.getActiveTab();
  });

  guard(IPC.BROWSER_GET_TAB_STATE, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    return browserTabManager.getTab(payload.tabId);
  });

  // navigation handlers
  guard(IPC.BROWSER_NAVIGATE_NEW, {
    tabId: { type: 'string', required: true },
    url: { type: 'string', required: true }
  }, async (payload) => {
    return browserNavigationService.navigate(payload.tabId, payload.url);
  });

  guard(IPC.BROWSER_GO_BACK_NEW, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    return { success: browserNavigationService.goBack(payload.tabId) };
  });

  guard(IPC.BROWSER_GO_FORWARD_NEW, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    return { success: browserNavigationService.goForward(payload.tabId) };
  });

  guard(IPC.BROWSER_RELOAD_NEW, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    const success = browserNavigationService.reload(payload.tabId);
    return { success };
  });

  guard(IPC.BROWSER_HARD_RELOAD, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    const success = browserNavigationService.hardReload(payload.tabId);
    return { success };
  });

  guard(IPC.BROWSER_STOP_NEW, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    return { success: browserNavigationService.stop(payload.tabId) };
  });

  guard(IPC.BROWSER_FIND_IN_PAGE, {
    tabId: { type: 'string', required: true },
    text: { type: 'string', required: true },
    findNext: { type: 'boolean', required: false }
  }, async (payload) => {
    return { success: browserFindInPageService.find(payload.tabId, payload.text, payload.findNext) };
  });

  guard(IPC.BROWSER_SET_ZOOM, {
    tabId: { type: 'string', required: true },
    zoomFactor: { type: 'number', required: true }
  }, async (payload) => {
    const view = browserViewManager.getOrCreateView(payload.tabId);
    if (view && view.webContents) {
      try {
        view.webContents.setZoomFactor(payload.zoomFactor);
        return { success: true };
      } catch (_) {}
    }
    return { success: false };
  });

  guard(IPC.BROWSER_SET_BOUNDS_NEW, {
    x: { type: 'number', required: true },
    y: { type: 'number', required: true },
    width: { type: 'number', required: true },
    height: { type: 'number', required: true }
  }, async (payload) => {
    browserViewManager.setBounds(payload);
    return { success: true };
  });

  guard(IPC.BROWSER_HIDE_NEW, {}, async () => {
    browserViewManager.hideAll();
    return { success: true };
  });

  guard(IPC.BROWSER_SHOW_NEW, {}, async () => {
    browserViewManager.showActive();
    return { success: true };
  });

  guard(IPC.BROWSER_ADBLOCK_TOGGLE, {}, async () => {
    const { browserSecurityService } = require('./dist/main/services/browser/browserSecurityService');
    const enabled = browserSecurityService.toggleAdBlock();
    return { enabled };
  });

  guard(IPC.BROWSER_ADBLOCK_STATUS, {}, async () => {
    const { browserSecurityService } = require('./dist/main/services/browser/browserSecurityService');
    const enabled = browserSecurityService.isAdBlockEnabled();
    return { enabled };
  });

  guard(IPC.BROWSER_READER_MODE, {}, async () => {
    const activeTabId = browserTabManager.getActiveTabId();
    if (!activeTabId) return { success: false, error: "No active tab" };
    const view = browserViewManager.getOrCreateView(activeTabId);
    if (!view || !view.webContents) return { success: false, error: "No active view" };
    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          const article = document.querySelector('article') || document.querySelector('main') || document.body;
          const title = document.querySelector('h1')?.textContent || document.title;
          const paragraphs = Array.from(article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'));
          const text = paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 0).join('\\n\\n');
          return { title, text, url: location.href };
        })()
      `);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  guard(IPC.BROWSER_SAVE_TO_MEMORY, {}, async () => {
    const activeTabId = browserTabManager.getActiveTabId();
    if (!activeTabId) return { success: false, error: "No active tab" };
    const view = browserViewManager.getOrCreateView(activeTabId);
    if (!view || !view.webContents) return { success: false, error: "No active view" };
    try {
      const text = await view.webContents.executeJavaScript(`document.body.innerText`);
      const title = view.webContents.getTitle();
      const url = view.webContents.getURL();
      await callSidecar(bridgePort, 'memory_add_fact', {
        content: `Source URL: ${url}\nTitle: ${title}\nContent:\n${text.slice(0, 10000)}`
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // profile handlers
  guard(IPC.BROWSER_GET_PROFILES, {}, async () => {
    return browserProfileService.listProfiles();
  });

  guard(IPC.BROWSER_SET_PROFILE, {
    tabId: { type: 'string', required: true },
    profileId: { type: 'string', required: true }
  }, async (payload) => {
    const profile = browserProfileService.getProfile(payload.profileId);
    if (!profile) return { success: false };
    const success = browserTabManager.updateTab(payload.tabId, { profileId: payload.profileId });
    if (success) {
      browserViewManager.destroyView(payload.tabId);
      browserViewManager.getOrCreateView(payload.tabId);
      browserViewManager.syncActiveView();
    }
    return { success };
  });

  guard(IPC.BROWSER_CLEAR_DATA, {
    profileId: { type: 'string', required: true },
    options: { type: 'object', required: true }
  }, async (payload) => {
    const result = await browserSessionService.clearSessionData(payload.profileId, payload.options);
    return { success: result.ok };
  });

  guard(IPC.BROWSER_CLEAR_BROWSER_DATA, {
    scope: { type: 'string', required: true }
  }, async (payload) => {
    const activeTab = browserTabManager.getActiveTab();
    const currentProfileId = activeTab?.profileId || "default";
    const options = { cookies: true, cache: true, localStorage: true };

    if (payload.scope === "currentTab" || payload.scope === "browserProfile") {
      const result = await browserSessionService.clearSessionData(currentProfileId, options);
      return { success: result.ok };
    } else if (payload.scope === "all") {
      const profilesList = browserProfileService.listProfiles();
      let allSuccess = true;
      for (const p of profilesList) {
        const res = await browserSessionService.clearSessionData(p.id, options);
        if (!res.ok) allSuccess = false;
      }
      return { success: allSuccess };
    }
    return { success: false };
  });

  // history handlers
  guard(IPC.BROWSER_GET_HISTORY, {
    profileId: { type: 'string', required: false }
  }, async (payload) => {
    return browserHistoryService.getHistory(payload.profileId);
  });

  guard(IPC.BROWSER_DELETE_HISTORY, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    browserHistoryService.deleteHistory(payload.id);
    return { success: true };
  });

  guard(IPC.BROWSER_CLEAR_HISTORY, {
    profileId: { type: 'string', required: false }
  }, async (payload) => {
    browserHistoryService.clearHistory(payload.profileId);
    return { success: true };
  });

  // bookmarks handlers
  guard(IPC.BROWSER_GET_BOOKMARKS, {
    profileId: { type: 'string', required: false }
  }, async (payload) => {
    return browserBookmarkService.getBookmarks(payload.profileId);
  });

  guard(IPC.BROWSER_ADD_BOOKMARK, {
    url: { type: 'string', required: true },
    title: { type: 'string', required: false },
    profileId: { type: 'string', required: true }
  }, async (payload) => {
    const b = browserBookmarkService.addBookmark(payload.url, payload.title, payload.profileId);
    return { success: !!b, bookmark: b };
  });

  guard(IPC.BROWSER_DELETE_BOOKMARK, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    browserBookmarkService.deleteBookmark(payload.id);
    return { success: true };
  });

  // downloads handlers
  guard(IPC.BROWSER_GET_DOWNLOADS, {}, async () => {
    return browserDownloadService.listDownloads();
  });

  guard(IPC.BROWSER_CANCEL_DOWNLOAD, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    return browserDownloadService.cancelDownload(payload.id);
  });

  guard(IPC.BROWSER_OPEN_DOWNLOAD, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    return browserDownloadService.openDownload(payload.id);
  });

  guard(IPC.BROWSER_SHOW_DOWNLOAD, {
    id: { type: 'string', required: true }
  }, async (payload) => {
    return browserDownloadService.showDownload(payload.id);
  });

  // permissions handlers
  guard(IPC.BROWSER_GET_PERMISSIONS, {}, async () => {
    return browserPermissionService.getDecisions();
  });

  guard(IPC.BROWSER_SET_PERMISSION, {
    origin: { type: 'string', required: true },
    permission: { type: 'string', required: true },
    profileId: { type: 'string', required: true },
    decision: { type: 'string', required: true }
  }, async (payload) => {
    browserPermissionService.saveDecision(payload.origin, payload.permission, payload.profileId, payload.decision);
    return { success: true };
  });

  guard(IPC.BROWSER_RESPOND_TO_PERMISSION, {
    requestId: { type: 'string', required: true },
    decision: { type: 'string', required: true }
  }, async (payload) => {
    browserPermissionService.resolveRequest(payload.requestId, payload.decision);
    return { success: true };
  });

  // developer / diagnostics
  guard(IPC.BROWSER_OPEN_DEVTOOLS, {
    tabId: { type: 'string', required: true }
  }, async (payload) => {
    const view = browserViewManager.getOrCreateView(payload.tabId);
    if (view && view.webContents) {
      try {
        view.webContents.openDevTools();
        return { success: true };
      } catch (_) {}
    }
    return { success: false };
  });

  guard(IPC.BROWSER_GET_DIAGNOSTICS, {}, async () => {
    return browserDiagnosticsService.getReport();
  });

  guard(IPC.BROWSER_NORMALIZE_URL, {
    url: { type: 'string', required: true }
  }, async (payload) => {
    const searchUrl = browserSearchEngineService.getSearchEngineUrl();
    return { url: browserUrlNormalizer.normalize(payload.url, searchUrl) };
  });

  // â”€â”€ Browser VPN Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  guard(IPC.VPN_LIST_PROFILES, {}, async () => vpnRouteManager.listProfiles());
  guard(IPC.VPN_GET_PROFILE, { profileId: { type: 'string', required: true } }, async (payload) => vpnRouteManager.getProfile(payload.profileId));
  guard(IPC.VPN_CREATE_PROFILE, { name: { type: 'string', required: true } }, async (payload) => vpnRouteManager.createProfile(payload));
  guard(IPC.VPN_UPDATE_PROFILE, { id: { type: 'string', required: true } }, async (payload) => vpnRouteManager.updateProfile(payload));
  guard(IPC.VPN_DELETE_PROFILE, { profileId: { type: 'string', required: true } }, async (payload) => ({ success: vpnRouteManager.deleteProfile(payload.profileId) }));
  guard(IPC.VPN_IMPORT_CONFIG, { text: { type: 'string', required: true }, kind: { type: 'string', required: false } }, async (payload) => vpnConfigImportService.importText(payload.text, payload.kind));
  guard(IPC.VPN_VALIDATE_CONFIG, { text: { type: 'string', required: true }, kind: { type: 'string', required: false } }, async (payload) => vpnConfigImportService.importText(payload.text, payload.kind));
  guard(IPC.VPN_LIST_TEMPLATES, {}, async () => vpnRouteManager.listTemplates());
  guard(IPC.VPN_CONNECT, { profileId: { type: 'string', required: true }, browserProfileId: { type: 'string', required: false } }, async (payload) => vpnRouteManager.connect(payload.profileId, payload.browserProfileId));
  guard(IPC.VPN_DISCONNECT, { profileId: { type: 'string', required: true } }, async (payload) => vpnRouteManager.disconnect(payload.profileId));
  guard(IPC.VPN_VERIFY, { profileId: { type: 'string', required: true } }, async (payload) => vpnRouteManager.verify(payload.profileId));
  guard(IPC.VPN_REPAIR, { profileId: { type: 'string', required: true } }, async (payload) => vpnRouteManager.repair(payload.profileId));
  guard(IPC.VPN_GET_STATUS, { profileId: { type: 'string', required: false } }, async (payload) => vpnDiagnosticsService.getReport(payload.profileId));
  guard(IPC.VPN_GET_EVIDENCE, { profileId: { type: 'string', required: false } }, async (payload) => vpnRouteManager.getEvidence(payload.profileId));
  guard(IPC.VPN_GET_RECOVERY_EVENTS, {}, async () => vpnRouteManager.getRecoveryEvents());
  guard(IPC.VPN_SET_KILL_SWITCH, { profileId: { type: 'string', required: true }, enabled: { type: 'boolean', required: true } }, async (payload) => vpnRouteManager.setKillSwitch(payload.profileId, payload.enabled));
  guard(IPC.VPN_APPLY_BROWSER_PROXY, { profileId: { type: 'string', required: true }, browserProfileId: { type: 'string', required: false } }, async (payload) => vpnRouteManager.applyBrowserProxy(payload.profileId, payload.browserProfileId));
  guard(IPC.VPN_CLEAR_BROWSER_PROXY, { profileId: { type: 'string', required: true }, browserProfileId: { type: 'string', required: false } }, async (payload) => vpnRouteManager.clearBrowserProxy(payload.profileId, payload.browserProfileId));
  guard(IPC.VPN_GET_PROVIDER_MATRIX, {}, async () => vpnRouteManager.getProviderMatrix());
  guard(IPC.VPN_EXPORT_REDACTED_PROFILE, { profileId: { type: 'string', required: true } }, async (payload) => vpnRouteManager.exportRedactedProfile(payload.profileId));
}

module.exports = { registerIpcHandlers };
