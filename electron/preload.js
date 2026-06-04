const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API for Electron-specific features.
// Core invoke/listen goes through neurobridge.js (fetch + WebSocket to localhost).

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  versions: {
    app: process.env.npm_package_version || '1.8.0',
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  // Expose the bridge port chosen by the main process so neurobridge.js can use it
  getBridgePort: () => ipcRenderer.invoke('get-bridge-port'),

  // Shell / OS integrations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Safe storage (OS keychain wrapper)
  safeStorageEncrypt: (plain) => ipcRenderer.invoke('safe-storage-encrypt', plain),
  safeStorageDecrypt: (encrypted) => ipcRenderer.invoke('safe-storage-decrypt', encrypted),
  isSafeStorageAvailable: () => ipcRenderer.invoke('safe-storage-available'),

  // Window control
  setKiosk: (enabled) => ipcRenderer.invoke('set-kiosk', enabled),
  getIsKiosk: () => ipcRenderer.invoke('get-is-kiosk'),

  // Notifications
  requestNotificationPermission: () => ipcRenderer.invoke('request-notification-permission'),
});

// Also expose NEURODECK_PORT synchronously for neurobridge.js bootstrap
// The main process sets this env var before the renderer loads.
contextBridge.exposeInMainWorld('NEURODECK_PORT', process.env.NEURODECK_PORT || '9477');
