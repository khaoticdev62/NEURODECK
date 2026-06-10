const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('./ipc-channels');

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
});

// Also expose NEURODECK_PORT synchronously for neurobridge.js bootstrap
// The main process sets this env var before the renderer loads.
contextBridge.exposeInMainWorld('NEURODECK_PORT', process.env.NEURODECK_PORT || '9477');
