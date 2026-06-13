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
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE_TOGGLE: 'window:maximize-toggle',
  WINDOW_CLOSE: 'window:close',
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
  MODELS_CANCEL: "models:cancel",

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
  DIAGNOSTICS_PING_RENDERER: "diagnostics:ping-renderer",
  DIAGNOSTICS_PONG_RENDERER: "diagnostics:pong-renderer",

  // Settings (New Target)
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  SETTINGS_VALIDATE: "settings:validate",

  // IDE Predictive Coding (New)
  IDE_DETECT_PROJECT: "ide:detect-project",
  IDE_RUN_COMMAND: "ide:run-command",
  IDE_CANCEL_COMMAND: "ide:cancel-command",
  IDE_GET_COMMAND_HISTORY: "ide:get-command-history",
  IDE_GET_PREDICTIONS: "ide:get-predictions",
  IDE_APPLY_SNIPPET: "ide:apply-snippet",

  // Controller IDE (New)
  CONTROLLER_GET_IDE_ACTION_MAP: "controller:get-ide-action-map",
  CONTROLLER_SET_IDE_MODE: "controller:set-ide-mode",

  // Dependency Installer
  DEPENDENCY_GET_STATUS: 'dependency:get-status',
  DEPENDENCY_INSTALL: 'dependency:install',
  DEPENDENCY_CANCEL: 'dependency:cancel',

  // Theme & Wallpaper Overhaul (New)
  THEME_GET: "theme:get",
  THEME_SET: "theme:set",
  THEME_LIST: "theme:list",
  WALLPAPER_GET: "wallpaper:get",
  WALLPAPER_SET: "wallpaper:set",
  WALLPAPER_LIST: "wallpaper:list"
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
