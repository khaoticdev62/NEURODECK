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
});

/** All channels that may be handled in main.js. */
const ALLOWED_CHANNELS = new Set(Object.values(IPC));

module.exports = { IPC, ALLOWED_CHANNELS };
