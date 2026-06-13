const { contextBridge, ipcRenderer } = require('electron');

// NOTE: Sandbox=true preload scripts cannot require() relative files.
// Keep these constants in sync with electron/ipc-channels.js
const IPC = Object.freeze({
  // App / runtime
  GET_BRIDGE_PORT: 'get-bridge-port',
  GET_RUNTIME_MANIFEST: 'get-runtime-manifest',
  GET_SECURITY_FLAGS: 'security:get-flags',

  // OS shell integration
  OPEN_EXTERNAL: 'open-external',
  SHOW_SAVE_DIALOG: 'show-save-dialog',
  SHOW_OPEN_DIALOG: 'show-open-dialog',

  // Safe storage (OS keychain)
  SAFE_STORAGE_AVAILABLE: 'safe-storage-available',
  SAFE_STORAGE_ENCRYPT: 'safe-storage-encrypt',
  SAFE_STORAGE_DECRYPT: 'safe-storage-decrypt',

  // Window control
  SET_KIOSK: 'set-kiosk',
  GET_IS_KIOSK: 'get-is-kiosk',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE_TOGGLE: 'window:maximize-toggle',
  WINDOW_CLOSE: 'window:close',

  // Notifications
  REQUEST_NOTIFICATION_PERMISSION: 'request-notification-permission',

  // Browser (WebContentsView)
  BROWSER_OPEN: 'browser-open',
  BROWSER_NAVIGATE: 'browser-navigate',
  BROWSER_BACK: 'browser-back',
  BROWSER_FORWARD: 'browser-forward',
  BROWSER_GET_URL: 'browser-get-url',
  BROWSER_HIDE: 'browser-hide',
  BROWSER_SHOW: 'browser-show',
  BROWSER_SET_BOUNDS: 'browser-set-bounds',
  BROWSER_GET_CONTENT: 'browser-get-content',
  BROWSER_SAVE_TO_MEMORY: 'browser-save-to-memory',
  BROWSER_RELOAD: 'browser-reload',
  BROWSER_ZOOM_IN: 'browser-zoom-in',
  BROWSER_ZOOM_OUT: 'browser-zoom-out',
  BROWSER_ZOOM_RESET: 'browser-zoom-reset',
  BROWSER_FIND: 'browser-find',
  BROWSER_STOP_FIND: 'browser-stop-find',

  // Bookmarks
  BROWSER_BOOKMARK_ADD: 'browser-bookmark-add',
  BROWSER_BOOKMARK_REMOVE: 'browser-bookmark-remove',
  BROWSER_BOOKMARK_LIST: 'browser-bookmark-list',

  // History
  BROWSER_HISTORY_LIST: 'browser-history-list',
  BROWSER_HISTORY_CLEAR: 'browser-history-clear',

  // Reader mode
  BROWSER_READER_MODE: 'browser-reader-mode',

  // Ad blocker
  BROWSER_ADBLOCK_TOGGLE: 'browser-adblock-toggle',
  BROWSER_ADBLOCK_STATUS: 'browser-adblock-status',

  // NeuroBrowse Multi-tab (New)
  BROWSER_CREATE_TAB: "browser:create-tab",
  BROWSER_CLOSE_TAB: "browser:close-tab",
  BROWSER_SWITCH_TAB: "browser:switch-tab",
  BROWSER_DUPLICATE_TAB: "browser:duplicate-tab",
  BROWSER_NAVIGATE_NEW: "browser:navigate",
  BROWSER_GO_BACK_NEW: "browser:go-back",
  BROWSER_GO_FORWARD_NEW: "browser:go-forward",
  BROWSER_RELOAD_NEW: "browser:reload",
  BROWSER_HARD_RELOAD: "browser:hard-reload",
  BROWSER_STOP_NEW: "browser:stop",
  BROWSER_FIND_IN_PAGE: "browser:find-in-page",
  BROWSER_SET_ZOOM: "browser:set-zoom",
  BROWSER_SET_BOUNDS_NEW: "browser:set-bounds",
  BROWSER_HIDE_NEW: "browser:hide",
  BROWSER_SHOW_NEW: "browser:show",
  BROWSER_GET_TABS: "browser:get-tabs",
  BROWSER_GET_ACTIVE_TAB: "browser:get-active-tab",
  BROWSER_GET_TAB_STATE: "browser:get-tab-state",
  BROWSER_GET_PROFILES: "browser:get-profiles",
  BROWSER_SET_PROFILE: "browser:set-profile",
  BROWSER_CLEAR_DATA: "browser:clear-data",
  BROWSER_CLEAR_BROWSER_DATA: "browser:clear-browser-data",
  BROWSER_GET_HISTORY: "browser:get-history",
  BROWSER_DELETE_HISTORY: "browser:delete-history",
  BROWSER_CLEAR_HISTORY: "browser:clear-history",
  BROWSER_GET_BOOKMARKS: "browser:get-bookmarks",
  BROWSER_ADD_BOOKMARK: "browser:add-bookmark",
  BROWSER_DELETE_BOOKMARK: "browser:delete-bookmark",
  BROWSER_GET_DOWNLOADS: "browser:get-downloads",
  BROWSER_CANCEL_DOWNLOAD: "browser:cancel-download",
  BROWSER_OPEN_DOWNLOAD: "browser:open-download",
  BROWSER_SHOW_DOWNLOAD: "browser:show-download",
  BROWSER_GET_PERMISSIONS: "browser:get-permissions",
  BROWSER_SET_PERMISSION: "browser:set-permission",
  BROWSER_RESPOND_TO_PERMISSION: "browser:respond-to-permission",
  BROWSER_OPEN_DEVTOOLS: "browser:open-devtools",
  BROWSER_GET_DIAGNOSTICS: "browser:get-diagnostics",
  BROWSER_NORMALIZE_URL: "browser:normalize-url",

  // Browser VPN
  VPN_LIST_PROFILES: 'vpn:list-profiles',
  VPN_GET_PROFILE: 'vpn:get-profile',
  VPN_CREATE_PROFILE: 'vpn:create-profile',
  VPN_UPDATE_PROFILE: 'vpn:update-profile',
  VPN_DELETE_PROFILE: 'vpn:delete-profile',
  VPN_IMPORT_CONFIG: 'vpn:import-config',
  VPN_VALIDATE_CONFIG: 'vpn:validate-config',
  VPN_LIST_TEMPLATES: 'vpn:list-templates',
  VPN_CONNECT: 'vpn:connect',
  VPN_DISCONNECT: 'vpn:disconnect',
  VPN_VERIFY: 'vpn:verify',
  VPN_REPAIR: 'vpn:repair',
  VPN_GET_STATUS: 'vpn:get-status',
  VPN_GET_EVIDENCE: 'vpn:get-evidence',
  VPN_GET_RECOVERY_EVENTS: 'vpn:get-recovery-events',
  VPN_SET_KILL_SWITCH: 'vpn:set-kill-switch',
  VPN_APPLY_BROWSER_PROXY: 'vpn:apply-browser-proxy',
  VPN_CLEAR_BROWSER_PROXY: 'vpn:clear-browser-proxy',
  VPN_GET_PROVIDER_MATRIX: 'vpn:get-provider-matrix',
  VPN_EXPORT_REDACTED_PROFILE: 'vpn:export-redacted-profile',

  // Diagnostics
  DIAGNOSTICS_PING_RENDERER: 'diagnostics:ping-renderer',
  DIAGNOSTICS_PONG_RENDERER: 'diagnostics:pong-renderer',

  // Models & Settings
  MODELS_LIST: 'models:list',
  MODELS_STATUS: 'models:status',
  MODELS_RUN_PROMPT: 'models:run-prompt',
  MODELS_CANCEL: 'models:cancel',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_VALIDATE: 'settings:validate',

  // Theme & Wallpaper Overhaul (New)
  THEME_GET: "theme:get",
  THEME_SET: "theme:set",
  THEME_LIST: "theme:list",
  WALLPAPER_GET: "wallpaper:get",
  WALLPAPER_SET: "wallpaper:set",
  WALLPAPER_LIST: "wallpaper:list"
});

// Expose a minimal API for Electron-specific features.
// Core invoke/listen goes through neurobridge.js (fetch + WebSocket to localhost).
// All channel names come from ipc-channels.js so they can't drift.

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info (synchronous — read from env, no IPC needed)
  platform: process.platform,
  versions: {
    app: process.env.npm_package_version || '1.8.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  // Expose the bridge port chosen by the main process so neurobridge.js can use it
  getBridgePort: () => ipcRenderer.invoke(IPC.GET_BRIDGE_PORT),
  getRuntimeManifest: () => ipcRenderer.invoke(IPC.GET_RUNTIME_MANIFEST),
  getSecurityFlags: () => ipcRenderer.invoke(IPC.GET_SECURITY_FLAGS),

  // Shell / OS integrations
  openExternal: (url) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),
  showSaveDialog: (options) => ipcRenderer.invoke(IPC.SHOW_SAVE_DIALOG, options),
  showOpenDialog: (options) => ipcRenderer.invoke(IPC.SHOW_OPEN_DIALOG, options),

  // Safe storage (OS keychain wrapper)
  // Returns { ok: true, ciphertext } or { ok: false, error }
  safeStorageEncrypt: (plain) => ipcRenderer.invoke(IPC.SAFE_STORAGE_ENCRYPT, plain),
  // Returns { ok: true, plaintext } or { ok: false, error }
  safeStorageDecrypt: (encrypted) => ipcRenderer.invoke(IPC.SAFE_STORAGE_DECRYPT, encrypted),
  isSafeStorageAvailable: () => ipcRenderer.invoke(IPC.SAFE_STORAGE_AVAILABLE),

  // Window control
  setKiosk: (enabled) => ipcRenderer.invoke(IPC.SET_KIOSK, enabled),
  getIsKiosk: () => ipcRenderer.invoke(IPC.GET_IS_KIOSK),

  // Notifications
  requestNotificationPermission: () => ipcRenderer.invoke(IPC.REQUEST_NOTIFICATION_PERMISSION),

  // Browser (WebContentsView)
  browserOpen: (url) => ipcRenderer.invoke(IPC.BROWSER_OPEN, url),
  browserNavigate: (url) => ipcRenderer.invoke(IPC.BROWSER_NAVIGATE, url),
  browserBack: () => ipcRenderer.invoke(IPC.BROWSER_BACK),
  browserForward: () => ipcRenderer.invoke(IPC.BROWSER_FORWARD),
  browserReload: () => ipcRenderer.invoke(IPC.BROWSER_RELOAD),
  browserGetUrl: () => ipcRenderer.invoke(IPC.BROWSER_GET_URL),
  browserHide: () => ipcRenderer.invoke(IPC.BROWSER_HIDE),
  browserShow: () => ipcRenderer.invoke(IPC.BROWSER_SHOW),
  browserSetBounds: (bounds) => ipcRenderer.invoke(IPC.BROWSER_SET_BOUNDS, bounds),
  browserGetContent: () => ipcRenderer.invoke(IPC.BROWSER_GET_CONTENT),
  browserSaveToMemory: () => ipcRenderer.invoke(IPC.BROWSER_SAVE_TO_MEMORY),
  browserZoomIn: () => ipcRenderer.invoke(IPC.BROWSER_ZOOM_IN),
  browserZoomOut: () => ipcRenderer.invoke(IPC.BROWSER_ZOOM_OUT),
  browserZoomReset: () => ipcRenderer.invoke(IPC.BROWSER_ZOOM_RESET),
  browserFind: (text) => ipcRenderer.invoke(IPC.BROWSER_FIND, text),
  browserStopFind: () => ipcRenderer.invoke(IPC.BROWSER_STOP_FIND),

  // Bookmarks
  browserBookmarkAdd: (title, url) => ipcRenderer.invoke(IPC.BROWSER_BOOKMARK_ADD, { title, url }),
  browserBookmarkRemove: (url) => ipcRenderer.invoke(IPC.BROWSER_BOOKMARK_REMOVE, { url }),
  browserBookmarkList: () => ipcRenderer.invoke(IPC.BROWSER_BOOKMARK_LIST),

  // History
  browserHistoryList: () => ipcRenderer.invoke(IPC.BROWSER_HISTORY_LIST),
  browserHistoryClear: () => ipcRenderer.invoke(IPC.BROWSER_HISTORY_CLEAR),

  // Reader mode
  browserReaderMode: () => ipcRenderer.invoke(IPC.BROWSER_READER_MODE),

  // Ad blocker
  browserAdblockToggle: () => ipcRenderer.invoke(IPC.BROWSER_ADBLOCK_TOGGLE),
  browserAdblockStatus: () => ipcRenderer.invoke(IPC.BROWSER_ADBLOCK_STATUS),

  // Listen for browser events from main process
  onBrowserEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('browser-event', handler);
    return () => ipcRenderer.removeListener('browser-event', handler);
  },

  // Diagnostics roundtrip: renderer replies to main-process pings
  onDiagnosticsPing: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(IPC.DIAGNOSTICS_PING_RENDERER, handler);
    return () => ipcRenderer.removeListener(IPC.DIAGNOSTICS_PING_RENDERER, handler);
  },
  diagnosticsPong: (requestId) => ipcRenderer.invoke(IPC.DIAGNOSTICS_PONG_RENDERER, makeRequest({ requestId })),
});

// Expose the new typed window.neurodeck API for secure connection wiring
const makeRequest = (payload = {}) => ({
  requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: new Date().toISOString(),
  source: 'renderer',
  schemaVersion: '1.0.0',
  payload
});

contextBridge.exposeInMainWorld('neurodeck', {
  lsp: {
    startServer: (language, command, args) => ipcRenderer.invoke('lsp:start-server', makeRequest({ language, command, args })),
    stopServer: (language) => ipcRenderer.invoke('lsp:stop-server', makeRequest({ language })),
    initializeWorkspace: (language, rootUri) => ipcRenderer.invoke('lsp:initialize-workspace', makeRequest({ language, rootUri })),
    openDocument: (language, uri, content) => ipcRenderer.invoke('lsp:open-document', makeRequest({ language, uri, content })),
    changeDocument: (language, uri, content, version) => ipcRenderer.invoke('lsp:change-document', makeRequest({ language, uri, content, version })),
    closeDocument: (language, uri) => ipcRenderer.invoke('lsp:close-document', makeRequest({ language, uri })),
    getDiagnostics: (language, uri) => ipcRenderer.invoke('lsp:get-diagnostics', makeRequest({ language, uri })),
    completion: (language, uri, line, character) => ipcRenderer.invoke('lsp:completion', makeRequest({ language, uri, line, character })),
    hover: (language, uri, line, character) => ipcRenderer.invoke('lsp:hover', makeRequest({ language, uri, line, character })),
    definition: (language, uri, line, character) => ipcRenderer.invoke('lsp:definition', makeRequest({ language, uri, line, character })),
    format: (language, uri) => ipcRenderer.invoke('lsp:format', makeRequest({ language, uri })),
    
    // Subscriptions
    onDiagnostics: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('lsp-diagnostics', handler);
      return () => ipcRenderer.removeListener('lsp-diagnostics', handler);
    },
    onStatusChanged: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('lsp-status-changed', handler);
      return () => ipcRenderer.removeListener('lsp-status-changed', handler);
    }
  },
  
  models: {
    list: () => ipcRenderer.invoke('models:list', makeRequest({})),
    status: () => ipcRenderer.invoke('models:status', makeRequest({})),
    runPrompt: (prompt, provider, model) => ipcRenderer.invoke('models:run-prompt', makeRequest({ prompt, provider, model })),
    cancel: () => ipcRenderer.invoke(IPC.MODELS_CANCEL, makeRequest({}))
  },
  
  sessions: {
    create: () => ipcRenderer.invoke('sessions:create', makeRequest({})),
    list: () => ipcRenderer.invoke('sessions:list', makeRequest({})),
    load: (id) => ipcRenderer.invoke('sessions:load', makeRequest({ id })),
    save: (payload) => ipcRenderer.invoke('sessions:save', makeRequest({ payload })),
    delete: (id) => ipcRenderer.invoke('sessions:delete', makeRequest({ id }))
  },
  
  memory: {
    search: (query) => ipcRenderer.invoke('memory:search', makeRequest({ query })),
    write: (content) => ipcRenderer.invoke('memory:write', makeRequest({ content })),
    delete: (id) => ipcRenderer.invoke('memory:delete', makeRequest({ id }))
  },
  
  diagnostics: {
    getConnectionMatrix: () => ipcRenderer.invoke('diagnostics:connection-matrix', makeRequest({})),
    runHealthProbe: (id) => ipcRenderer.invoke('diagnostics:run-probe', makeRequest({ id })),
    subscribeConnectionEvents: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('diagnostics-connection-changed', handler);
      return () => ipcRenderer.removeListener('diagnostics-connection-changed', handler);
    }
  },
  
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', makeRequest({ key })),
    set: (key, value) => ipcRenderer.invoke('settings:set', makeRequest({ key, value })),
    validate: (key, value) => ipcRenderer.invoke(IPC.SETTINGS_VALIDATE, makeRequest({ key, value }))
  },

  ide: {
    detectProject: (workspacePath) =>
      ipcRenderer.invoke('ide:detect-project', makeRequest({ workspacePath })),
    runCommand: (command, args, cwd, safety, label, commandId) =>
      ipcRenderer.invoke('ide:run-command', makeRequest({ command, args, cwd, safety, label, commandId })),
    cancelCommand: (commandId) =>
      ipcRenderer.invoke('ide:cancel-command', makeRequest({ commandId })),
    getCommandHistory: () =>
      ipcRenderer.invoke('ide:get-command-history', makeRequest({})),
    getPredictions: (filePath, languageId, cursorLine, cursorChar, diagnosticsCount, snippetIds, commandTemplates, lspCompletions) =>
      ipcRenderer.invoke('ide:get-predictions', makeRequest({
        filePath, languageId, cursorLine, cursorChar,
        diagnosticsCount: diagnosticsCount ?? 0,
        snippetIds: snippetIds ?? [],
        commandTemplates: commandTemplates ?? [],
        lspCompletions: lspCompletions ?? [],
      })),
    applySnippet: (snippetId, languageId) =>
      ipcRenderer.invoke('ide:apply-snippet', makeRequest({ snippetId, languageId })),

    onCommandOutput: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('ide:command-output', handler);
      return () => ipcRenderer.removeListener('ide:command-output', handler);
    },
    onCommandExit: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('ide:command-exit', handler);
      return () => ipcRenderer.removeListener('ide:command-exit', handler);
    },
  },

  controller: {
    getIdeActionMap: () =>
      ipcRenderer.invoke('controller:get-ide-action-map', makeRequest({})),
    setIdeMode: (mode) =>
      ipcRenderer.invoke('controller:set-ide-mode', makeRequest({ mode })),
    onIdeModeChanged: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('controller:ide-mode-changed', handler);
      return () => ipcRenderer.removeListener('controller:ide-mode-changed', handler);
    },
  },

  theme: {
    get: () => ipcRenderer.invoke('theme:get', makeRequest({})),
    set: (settings) => ipcRenderer.invoke('theme:set', makeRequest({ settings })),
    list: () => ipcRenderer.invoke('theme:list', makeRequest({})),
  },

  wallpaper: {
    get: () => ipcRenderer.invoke('wallpaper:get', makeRequest({})),
    set: (id) => ipcRenderer.invoke('wallpaper:set', makeRequest({ id })),
    list: () => ipcRenderer.invoke('wallpaper:list', makeRequest({})),
  },

  browser: {
    createTab: (url, profileId) => ipcRenderer.invoke('browser:create-tab', makeRequest({ url, profileId })).then(r => r.ok ? r.data : null),
    closeTab: (tabId) => ipcRenderer.invoke('browser:close-tab', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    switchTab: (tabId) => ipcRenderer.invoke('browser:switch-tab', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    duplicateTab: (tabId) => ipcRenderer.invoke('browser:duplicate-tab', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    getTabs: () => ipcRenderer.invoke('browser:get-tabs', makeRequest({})).then(r => r.ok ? r.data : []),
    getActiveTab: () => ipcRenderer.invoke('browser:get-active-tab', makeRequest({})).then(r => r.ok ? r.data : null),
    navigate: (tabId, url) => ipcRenderer.invoke('browser:navigate', makeRequest({ tabId, url })).then(r => r.ok ? r.data : null),
    goBack: (tabId) => ipcRenderer.invoke('browser:go-back', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    goForward: (tabId) => ipcRenderer.invoke('browser:go-forward', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    reload: (tabId) => ipcRenderer.invoke('browser:reload', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    hardReload: (tabId) => ipcRenderer.invoke('browser:hard-reload', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    stop: (tabId) => ipcRenderer.invoke('browser:stop', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    getTabState: (tabId) => ipcRenderer.invoke('browser:get-tab-state', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    clearBrowserData: (scope) => ipcRenderer.invoke('browser:clear-browser-data', makeRequest({ scope })).then(r => r.ok ? r.data : null),
    findInPage: (tabId, text, findNext) => ipcRenderer.invoke('browser:find-in-page', makeRequest({ tabId, text, findNext })).then(r => r.ok ? r.data : null),
    setZoom: (tabId, zoomFactor) => ipcRenderer.invoke('browser:set-zoom', makeRequest({ tabId, zoomFactor })).then(r => r.ok ? r.data : null),
    setBounds: (bounds) => ipcRenderer.invoke('browser:set-bounds', makeRequest(bounds)).then(r => r.ok ? r.data : null),
    hide: () => ipcRenderer.invoke('browser:hide', makeRequest({})).then(r => r.ok ? r.data : null),
    show: () => ipcRenderer.invoke('browser:show', makeRequest({})).then(r => r.ok ? r.data : null),
    getProfiles: () => ipcRenderer.invoke('browser:get-profiles', makeRequest({})).then(r => r.ok ? r.data : []),
    setProfile: (tabId, profileId) => ipcRenderer.invoke('browser:set-profile', makeRequest({ tabId, profileId })).then(r => r.ok ? r.data : null),
    clearData: (profileId, options) => ipcRenderer.invoke('browser:clear-data', makeRequest({ profileId, options })).then(r => r.ok ? r.data : null),
    getHistory: (profileId) => ipcRenderer.invoke('browser:get-history', makeRequest({ profileId })).then(r => r.ok ? r.data : []),
    deleteHistory: (id) => ipcRenderer.invoke('browser:delete-history', makeRequest({ id })).then(r => r.ok ? r.data : null),
    clearHistory: (profileId) => ipcRenderer.invoke('browser:clear-history', makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    getBookmarks: (profileId) => ipcRenderer.invoke('browser:get-bookmarks', makeRequest({ profileId })).then(r => r.ok ? r.data : []),
    addBookmark: (url, title, profileId) => ipcRenderer.invoke('browser:add-bookmark', makeRequest({ url, title, profileId })).then(r => r.ok ? r.data : null),
    deleteBookmark: (id) => ipcRenderer.invoke('browser:delete-bookmark', makeRequest({ id })).then(r => r.ok ? r.data : null),
    getDownloads: () => ipcRenderer.invoke('browser:get-downloads', makeRequest({})).then(r => r.ok ? r.data : []),
    cancelDownload: (id) => ipcRenderer.invoke('browser:cancel-download', makeRequest({ id })).then(r => r.ok ? r.data : null),
    openDownload: (id) => ipcRenderer.invoke('browser:open-download', makeRequest({ id })).then(r => r.ok ? r.data : null),
    showDownload: (id) => ipcRenderer.invoke('browser:show-download', makeRequest({ id })).then(r => r.ok ? r.data : null),
    getPermissions: () => ipcRenderer.invoke('browser:get-permissions', makeRequest({})).then(r => r.ok ? r.data : []),
    setPermission: (payload) => ipcRenderer.invoke('browser:set-permission', makeRequest(payload)).then(r => r.ok ? r.data : null),
    respondToPermission: (requestId, decision) => ipcRenderer.invoke('browser:respond-to-permission', makeRequest({ requestId, decision })).then(r => r.ok ? r.data : null),
    openDevTools: (tabId) => ipcRenderer.invoke('browser:open-devtools', makeRequest({ tabId })).then(r => r.ok ? r.data : null),
    getDiagnostics: () => ipcRenderer.invoke('browser:get-diagnostics', makeRequest({})).then(r => r.ok ? r.data : null),
    normalizeUrl: (url) => ipcRenderer.invoke('browser:normalize-url', makeRequest({ url })).then(r => r.ok ? r.data : { url }),
    saveToMemory: () => ipcRenderer.invoke('browser-save-to-memory', makeRequest({})).then(r => r.ok ? r.data : null),
    onBrowserEvent: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('browser-event', handler);
      return () => ipcRenderer.removeListener('browser-event', handler);
    },
  },

  vpn: {
    listProfiles: () => ipcRenderer.invoke(IPC.VPN_LIST_PROFILES, makeRequest({})).then(r => r.ok ? r.data : []),
    getProfile: (profileId) => ipcRenderer.invoke(IPC.VPN_GET_PROFILE, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    createProfile: (payload) => ipcRenderer.invoke(IPC.VPN_CREATE_PROFILE, makeRequest(payload)).then(r => r.ok ? r.data : null),
    updateProfile: (payload) => ipcRenderer.invoke(IPC.VPN_UPDATE_PROFILE, makeRequest(payload)).then(r => r.ok ? r.data : null),
    deleteProfile: (profileId) => ipcRenderer.invoke(IPC.VPN_DELETE_PROFILE, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    importConfig: (text, kind) => ipcRenderer.invoke(IPC.VPN_IMPORT_CONFIG, makeRequest({ text, kind })).then(r => r.ok ? r.data : null),
    validateConfig: (text, kind) => ipcRenderer.invoke(IPC.VPN_VALIDATE_CONFIG, makeRequest({ text, kind })).then(r => r.ok ? r.data : null),
    listTemplates: () => ipcRenderer.invoke(IPC.VPN_LIST_TEMPLATES, makeRequest({})).then(r => r.ok ? r.data : []),
    connect: (profileId, browserProfileId) => ipcRenderer.invoke(IPC.VPN_CONNECT, makeRequest({ profileId, browserProfileId })).then(r => r.ok ? r.data : null),
    disconnect: (profileId) => ipcRenderer.invoke(IPC.VPN_DISCONNECT, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    verify: (profileId) => ipcRenderer.invoke(IPC.VPN_VERIFY, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    repair: (profileId) => ipcRenderer.invoke(IPC.VPN_REPAIR, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    getStatus: (profileId) => ipcRenderer.invoke(IPC.VPN_GET_STATUS, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
    getEvidence: (profileId) => ipcRenderer.invoke(IPC.VPN_GET_EVIDENCE, makeRequest({ profileId })).then(r => r.ok ? r.data : []),
    getRecoveryEvents: () => ipcRenderer.invoke(IPC.VPN_GET_RECOVERY_EVENTS, makeRequest({})).then(r => r.ok ? r.data : []),
    setKillSwitch: (profileId, enabled) => ipcRenderer.invoke(IPC.VPN_SET_KILL_SWITCH, makeRequest({ profileId, enabled })).then(r => r.ok ? r.data : null),
    applyBrowserProxy: (profileId, browserProfileId) => ipcRenderer.invoke(IPC.VPN_APPLY_BROWSER_PROXY, makeRequest({ profileId, browserProfileId })).then(r => r.ok ? r.data : null),
    clearBrowserProxy: (profileId, browserProfileId) => ipcRenderer.invoke(IPC.VPN_CLEAR_BROWSER_PROXY, makeRequest({ profileId, browserProfileId })).then(r => r.ok ? r.data : null),
    getProviderMatrix: () => ipcRenderer.invoke(IPC.VPN_GET_PROVIDER_MATRIX, makeRequest({})).then(r => r.ok ? r.data : []),
    exportRedactedProfile: (profileId) => ipcRenderer.invoke(IPC.VPN_EXPORT_REDACTED_PROFILE, makeRequest({ profileId })).then(r => r.ok ? r.data : null),
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
    maximizeToggle: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE_TOGGLE),
    close: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
  },
  dependency: {
    getStatus: () => ipcRenderer.invoke('dependency:get-status', makeRequest({})),
    install: (id) => ipcRenderer.invoke('dependency:install', makeRequest({ id })),
    cancel: (id) => ipcRenderer.invoke('dependency:cancel', makeRequest({ id })),
    onProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('dependency:progress', handler);
      return () => ipcRenderer.removeListener('dependency:progress', handler);
    }
  }
});

// Also expose NEURODECK_PORT synchronously for neurobridge.js bootstrap
// The main process sets this env var or passes it in process.argv before the renderer loads.
const portArg = process.argv.find(arg => arg.startsWith('--neurodeck-port='));
const neurodeckPort = portArg ? portArg.split('=')[1] : (process.env.NEURODECK_PORT || '9477');
contextBridge.exposeInMainWorld('NEURODECK_PORT', neurodeckPort);
