# Electron Replacement Matrix

This matrix documents the transition from Tauri API constructs to Electron IPC handlers and preload API mappings.

| Former Tauri Feature / API | Electron Main Process IPC Channel | Electron Preload API Wrapper | Source File |
|---|---|---|---|
| Native File Save Dialog | `show-save-dialog` | `window.electronAPI.showSaveDialog` | [preload.js](file:///electron/preload.js#L61) |
| Native File Open Dialog | `show-open-dialog` | `window.electronAPI.showOpenDialog` | [preload.js](file:///electron/preload.js#L62) |
| OS Keychain / Safe Storage | `safe-storage-encrypt`, `safe-storage-decrypt`, `safe-storage-available` | `window.electronAPI.safeStorageEncrypt`, `safeStorageDecrypt`, `isSafeStorageAvailable` | [preload.js](file:///electron/preload.js#L64-L69) |
| WebContents Browser Integration | `browser-open`, `browser-navigate`, `browser-back`, etc. | `window.electronAPI.browserOpen`, `browserNavigate`, `browserBack`, etc. | [preload.js](file:///electron/preload.js#L78-L110) |
| Kiosk Mode / Window Control | `set-kiosk`, `get-is-kiosk` | `window.electronAPI.setKiosk`, `getIsKiosk` | [preload.js](file:///electron/preload.js#L71-L73) |
| External URI Shell Execution | `open-external` | `window.electronAPI.openExternal` | [preload.js](file:///electron/preload.js#L60) |
| Notification Request Permission | `request-notification-permission` | `window.electronAPI.requestNotificationPermission` | [preload.js](file:///electron/preload.js#L75-L76) |
| Language Server Protocol (LSP) | `lsp:start-server`, `lsp:stop-server`, etc. | `window.neurodeck.lsp.startServer`, etc. | [preload.js](file:///electron/preload.js#L130-L154) |
| Model Operations and Prompts | `models:list`, `models:status`, etc. | `window.neurodeck.models.list`, etc. | [preload.js](file:///electron/preload.js#L156-L161) |
| Session Management | `sessions:create`, `sessions:list`, etc. | `window.neurodeck.sessions.create`, etc. | [preload.js](file:///electron/preload.js#L163-L169) |
| Memory Storage / Retrieval | `memory:search`, `memory:write`, etc. | `window.neurodeck.memory.search`, etc. | [preload.js](file:///electron/preload.js#L171-L175) |
| Diagnostics & Connection Matrix | `diagnostics:connection-matrix`, etc. | `window.neurodeck.diagnostics.getConnectionMatrix`, etc. | [preload.js](file:///electron/preload.js#L177-L185) |
| System Settings | `settings:get`, `settings:set`, etc. | `window.neurodeck.settings.get`, etc. | [preload.js](file:///electron/preload.js#L187-L191) |

## Verification Status

All listed channels are verified to exist in both:
- `electron/ipc-channels.js` (Main Process single-source-of-truth constants)
- `electron/preload.js` (Exposed contextBridge bindings)
- Frontend client usage in `frontend/src/` (e.g. `bridgeAdapter.ts` and `neurobridge.js`)
