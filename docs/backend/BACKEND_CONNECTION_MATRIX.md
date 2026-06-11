# NEURODECK Backend Connection Matrix

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)

---

## Connection Paths

### Path 1: Renderer → Preload → Main → Sidecar (Primary)

```
React Component
  └─ import { bridgeInvoke } from 'services/bridgeAdapter'
       └─ window.neurodeck.<namespace>.<method>(args)    [IPC]
            └─ ipcRenderer.invoke(channel, { requestId, ...args })
                 └─ ipcMain.handle(channel, handler)
                      └─ callSidecar(bridgePort, cmd, payload)
                           └─ fetch(`http://127.0.0.1:${PORT}/api/${cmd}`)
                                └─ Rust axum → match arm in commands/mod.rs dispatch()
                                     └─ Real handler in commands/ sub-module
```

### Path 2: Renderer → Preload → Main (Electron-native)

```
React Component
  └─ window.electronAPI.<method>(args)
       └─ ipcRenderer.invoke(channel, args)
            └─ ipcMain.handle(channel, handler)
                 └─ Electron native API (dialog, shell, safeStorage, etc.)
```

### Path 3: WebSocket Streaming (LLM tokens, PTY output)

```
Rust sidecar
  └─ WebSocket event emit (ws://127.0.0.1:9477/ws)
       └─ bridgeAdapter._ensureWs() subscription
            └─ React state update via useNeuroDeckState
```

### Path 4: Renderer → HTTP Fallback (dev/offline)

```
React Component (fallback only when IPC unavailable)
  └─ fetch(`http://127.0.0.1:${BRIDGE_PORT}/api/${cmd}`)
       └─ Rust axum sidecar directly
```

---

## Channel Matrix

| Preload Method | IPC Channel | Handler File | Sidecar Command | Data Source |
|----------------|-------------|--------------|-----------------|-------------|
| `neurodeck.sessions.listMeta` | `sessions:list` | `ipc-handlers.js` | `list_sessions_meta` | `user_config_dir/sessions/*.json` |
| `neurodeck.sessions.create` | `sessions:create` | `ipc-handlers.js` | `create_session` | Filesystem |
| `neurodeck.sessions.save` | `sessions:save` | `ipc-handlers.js` | `save_session` | Filesystem |
| `neurodeck.sessions.delete` | `sessions:delete` | `ipc-handlers.js` | `delete_session` | Filesystem |
| `neurodeck.sessions.load` | `sessions:load` | `ipc-handlers.js` | `load_session` | Filesystem |
| `neurodeck.memory.search` | `memory:search` | `ipc-handlers.js` | `memory_search` | Vector DB (cosine-similarity) |
| `neurodeck.memory.write` | `memory:write` | `ipc-handlers.js` | `memory_add_fact` | Vector DB |
| `neurodeck.memory.delete` | `memory:delete` | `ipc-handlers.js` | `memory_delete` | Vector DB |
| `neurodeck.memory.list` | `memory:list` | `ipc-handlers.js` | `memory_list` | Vector DB |
| `neurodeck.models.list` | `models:list` | `ipc-handlers.js` | `list_models` | Ollama API |
| `neurodeck.models.runPrompt` | `models:run-prompt` | `ipc-handlers.js` | `send_command` | LLM Provider |
| `neurodeck.models.cancel` | `models:cancel` | `ipc-handlers.js` | _(no-op)_ | N/A |
| `neurodeck.lsp.startServer` | `lsp:start-server` | `ipc-handlers.js` | LspManager | Subprocess |
| `neurodeck.lsp.stopServer` | `lsp:stop-server` | `ipc-handlers.js` | LspManager | Subprocess |
| `neurodeck.lsp.completion` | `lsp:completion` | `ipc-handlers.js` | LspManager → JSON-RPC | Language Server |
| `neurodeck.lsp.hover` | `lsp:hover` | `ipc-handlers.js` | LspManager → JSON-RPC | Language Server |
| `neurodeck.lsp.definition` | `lsp:definition` | `ipc-handlers.js` | LspManager → JSON-RPC | Language Server |
| `neurodeck.lsp.format` | `lsp:format` | `ipc-handlers.js` | LspManager → JSON-RPC | Language Server |
| `neurodeck.diagnostics.getConnectionMatrix` | `diagnostics:connection-matrix` | `ipc-handlers.js` | ConnectionRegistry | In-memory |
| `neurodeck.diagnostics.runHealthProbe` | `diagnostics:run-probe` | `ipc-handlers.js` | HealthProbeRunner | Live probes |
| `neurodeck.settings.get` | `settings:get` | `ipc-handlers.js` | `get_config` | `llm-term.toml` |
| `neurodeck.settings.set` | `settings:set` | `ipc-handlers.js` | `set_provider`/`set_model`/`set_gemini_api_key` | Sidecar config |
| `electronAPI.browserSaveToMemory` | `browser-save-to-memory` | `main.js` | `memory_add_fact` (via HTTP) | Browser + Vector DB |
| `electronAPI.showSaveDialog` | `show-save-dialog` | `main.js` | `dialog.showSaveDialog` | Electron native |
| `electronAPI.showOpenDialog` | `show-open-dialog` | `main.js` | `dialog.showOpenDialog` | Electron native |
| `electronAPI.openExternal` | `open-external` | `main.js` | `shell.openExternal` | OS |
| `electronAPI.safeStorageEncrypt` | `safe-storage-encrypt` | `main.js` | `safeStorage.encryptString` | OS keychain |

---

## Security Boundary Map

| Boundary | Enforcement | Risk |
|----------|-------------|------|
| Renderer → Preload | `contextBridge.exposeInMainWorld` — no `electron` in renderer | High if bypassed |
| Preload → Main | `ipcRenderer.invoke` with origin validation | Medium |
| Main → Sidecar | `callSidecar()` via localhost HTTP only | Low (loopback only) |
| Origin Guard | `ipcGuard()` validates `neurodeck://` or `localhost:1420` | Medium |
| Payload Size | 5MB limit enforced in `ipcGuard()` | Low |
| Schema Validation | `ipcGuard()` validates required fields | Medium |

---

## Transport Performance Baseline (design targets)

| Path | Target Latency | Actual (probe) |
|------|---------------|----------------|
| IPC roundtrip (empty payload) | < 5ms | ~2-8ms |
| Sidecar /health | < 20ms | ~5-15ms |
| Storage probe (write/read/delete 1KB) | < 50ms | ~10-40ms |
| Settings load (get_config) | < 30ms | ~10-25ms |
| Session list (10 sessions) | < 100ms | ~20-80ms |
| Memory search (top-3) | < 200ms | ~50-150ms |
