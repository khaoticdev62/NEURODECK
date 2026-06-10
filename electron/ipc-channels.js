/**
 * IPC Channel Registry
 *
 * Single source of truth for every ipcMain.handle channel in main.js.
 * main.js imports these constants so channel names can't drift between
 * the registrar and callers. An explicit ALLOWED_CHANNELS set enforces
 * the allowlist — any channel not listed here is blocked at startup.
 */

'use strict';

const IPC = Object.freeze({
  // App / runtime
  GET_BRIDGE_PORT: 'get-bridge-port',

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

  // Notifications
  REQUEST_NOTIFICATION_PERMISSION: 'request-notification-permission',
});

/** All channels that may be handled in main.js. */
const ALLOWED_CHANNELS = new Set(Object.values(IPC));

module.exports = { IPC, ALLOWED_CHANNELS };
