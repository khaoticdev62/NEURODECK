const { contextBridge, ipcRenderer } = require('electron');

// NOTE: Sandbox=true preload scripts cannot require() relative files.
// Keep these constants in sync with electron/ipc-channels.js
const IPC = Object.freeze({
  GET_BRIDGE_PORT: 'get-bridge-port',
  OPEN_EXTERNAL: 'open-external',
  SHOW_SAVE_DIALOG: 'show-save-dialog',
  SHOW_OPEN_DIALOG: 'show-open-dialog',
  SAFE_STORAGE_AVAILABLE: 'safe-storage-available',
  SAFE_STORAGE_ENCRYPT: 'safe-storage-encrypt',
  SAFE_STORAGE_DECRYPT: 'safe-storage-decrypt',
  SET_KIOSK: 'set-kiosk',
  GET_IS_KIOSK: 'get-is-kiosk',
  REQUEST_NOTIFICATION_PERMISSION: 'request-notification-permission',
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

  // Listen for browser events from main process
  onBrowserEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('browser-event', handler);
    return () => ipcRenderer.removeListener('browser-event', handler);
  },
});

// Also expose NEURODECK_PORT synchronously for neurobridge.js bootstrap
// The main process sets this env var before the renderer loads.
contextBridge.exposeInMainWorld('NEURODECK_PORT', process.env.NEURODECK_PORT || '9477');
