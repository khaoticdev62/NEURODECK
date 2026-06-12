/**
 * IPC Channel Registry
 * Single source of truth for all IPC channels.
 */
'use strict';

const IPC_CHANNELS = Object.freeze({
  // App / Bridge / OS shell integration (Existing)
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
  
  // Browser WebContentsView (Existing)
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
  BROWSER_BOOKMARK_ADD: 'browser-bookmark-add',
  BROWSER_BOOKMARK_REMOVE: 'browser-bookmark-remove',
  BROWSER_BOOKMARK_LIST: 'browser-bookmark-list',
  BROWSER_HISTORY_LIST: 'browser-history-list',
  BROWSER_HISTORY_CLEAR: 'browser-history-clear',
  BROWSER_READER_MODE: 'browser-reader-mode',
  BROWSER_ADBLOCK_TOGGLE: 'browser-adblock-toggle',
  BROWSER_ADBLOCK_STATUS: 'browser-adblock-status',

  // Language Server Protocol (LSP) (New Target)
  LSP_START_SERVER: "lsp:start-server",
  LSP_STOP_SERVER: "lsp:stop-server",
  LSP_INITIALIZE_WORKSPACE: "lsp:initialize-workspace",
  LSP_OPEN_DOCUMENT: "lsp:open-document",
  LSP_CHANGE_DOCUMENT: "lsp:change-document",
  LSP_CLOSE_DOCUMENT: "lsp:close-document",
  LSP_COMPLETION: "lsp:completion",
  LSP_HOVER: "lsp:hover",
  LSP_DEFINITION: "lsp:definition",
  LSP_FORMAT: "lsp:format",

  // LLM Models & AI Providers (New Target)
  MODELS_LIST: "models:list",
  MODELS_STATUS: "models:status",
  MODELS_RUN_PROMPT: "models:run-prompt",

  // Chat Sessions (New Target)
  SESSIONS_CREATE: "sessions:create",
  SESSIONS_LIST: "sessions:list",
  SESSIONS_SAVE: "sessions:save",

  // Memory (New Target)
  MEMORY_SEARCH: "memory:search",
  MEMORY_WRITE: "memory:write",

  // Diagnostics & Telemetry (New Target)
  DIAGNOSTICS_CONNECTION_MATRIX: "diagnostics:connection-matrix",
  DIAGNOSTICS_RUN_PROBE: "diagnostics:run-probe",

  // Settings (New Target)
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",

  // IDE Predictive Coding (New)
  IDE_DETECT_PROJECT: "ide:detect-project",
  IDE_RUN_COMMAND: "ide:run-command",
  IDE_CANCEL_COMMAND: "ide:cancel-command",
  IDE_GET_COMMAND_HISTORY: "ide:get-command-history",
  IDE_GET_PREDICTIONS: "ide:get-predictions",
  IDE_APPLY_SNIPPET: "ide:apply-snippet",

  // Controller IDE (New)
  CONTROLLER_GET_IDE_ACTION_MAP: "controller:get-ide-action-map",
  CONTROLLER_SET_IDE_MODE: "controller:set-ide-mode"
});

const ALLOWED_CHANNELS = new Set(Object.values(IPC_CHANNELS));

/**
 * Validate that there are no duplicate values in the channel list
 */
function validateRegistry() {
  const values = Object.values(IPC_CHANNELS);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    throw new Error('Duplicate channel registration found in IPC Registry!');
  }
}

validateRegistry();

module.exports = {
  IPC: IPC_CHANNELS,
  ALLOWED_CHANNELS
};
