# NEURODECK Backend Service Inventory

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)

---

## Architecture Summary

NEURODECK uses a **three-layer backend**:

1. **Electron Main Process** — Window management, native OS APIs, IPC routing
2. **Rust Axum Sidecar** (`neurodeck`/`neurodeck.exe`) — LLM inference, sessions, memory, PTY, plugins, all persistent state
3. **Frontend Bridge Adapter** (`bridgeAdapter.ts`) — Renderer-side IPC/HTTP abstraction with triple-fallback

Data flows: Renderer → `window.neurodeck` (preload) → `ipcMain.handle` → `callSidecar(bridgePort, cmd, payload)` → `POST http://127.0.0.1:9477/api/{cmd}`

---

## Service Inventory

### IPC Layer

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `ipc-main-handlers` | Main Process IPC Handlers | `electron/main.js` | ✅ production_ready | none |
| `ipc-service-handlers` | Sidecar Bridge IPC Handlers | `electron/ipc-handlers.js` | ✅ production_ready | none |
| `browser-webcontentsview` | Browser (WebContentsView) | `electron/main.js` | ✅ production_ready | none |
| `bridge-adapter-frontend` | Frontend Bridge Adapter | `frontend/src/react/services/bridgeAdapter.ts` | ✅ production_ready | medium |

**Notes on bridge-adapter medium risk:** `browserDraft()` offline mode is intentional graceful degradation for when no AI provider is available. `latencyMs:12`/`latencyMs:0` are synthetic offline metrics clearly isolated to offline paths. Not a production violation.

### Service Layer

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `rust-sidecar` | Rust Axum Bridge Sidecar | `src-tauri/src/bridge.rs` | ✅ production_ready | none |
| `connection-registry` | Connection Health Registry | `electron/services/diagnostics/connection-registry.js` | ✅ production_ready | low |
| `lsp-manager` | LSP Manager | `electron/services/lsp/lsp-manager.js` | ⚙️ not_configured | none |

**Notes on lsp-manager:** Requires user to install language server binaries (`pylsp`, `typescript-language-server`). The implementation is real stdio JSON-RPC. Status is `not_configured` until binaries are present.

### Provider Layer

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `provider-gemini` | Google Gemini Provider | `src-tauri/src/llm.rs` | ⚙️ not_configured | low |
| `provider-ollama` | Ollama Local Provider | `src-tauri/src/llm.rs` | ⚙️ not_configured | none |

**Notes:** Both providers are real HTTP clients. `not_configured` means API keys or binary are absent — not that code is mocked.

### Storage Layer

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `memory-store` | Vector Memory Store | `src-tauri/src/memory.rs` | ✅ production_ready | none |
| `session-store` | Session Persistence | `src-tauri/src/commands/session.rs` | ✅ production_ready | none |
| `settings-store` | Settings / Config Store | `src-tauri/src/commands/config.rs` | ✅ production_ready | low |

### Plugin / Runtime Layer

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `plugin-runtime` | Lua/Hermes Plugin Runtime | `src-tauri/src/lua.rs + plugin_mgr.rs` | ✅ production_ready | none |

### Telemetry

| ID | Name | File | Status | Mock Risk |
|----|------|------|--------|-----------|
| `telemetry-system` | System Telemetry | `electron/services/diagnostics/health-probe-runner.js` | ✅ production_ready | low |

---

## IPC Channel Count

| Category | Count |
|----------|------:|
| Main process handlers | 58 |
| Service/sidecar bridge handlers | 23 |
| Browser WebContentsView handlers | 26 |
| LSP channels | 9 |
| Preload methods (`window.neurodeck`) | 85 |
| Preload methods (`window.electronAPI`) | 45 |
| **Total unique channels** | **~250** |

---

## Acceptable Non-Production Patterns

These patterns exist in the codebase but are NOT production violations:

1. **`browserDraft()` in bridgeAdapter.ts** — intentional offline fallback, only reached when `provider === 'offline-draft'`
2. **`models.cancel()` in preload.js** — returns `Promise.resolve({ok:true})` — no cancel endpoint in sidecar (acceptable no-op)
3. **`settings.validate()` in preload.js** — returns `Promise.resolve({valid:true})` — no server-side config schema enforcement
4. **`ipc_roundtrip` probe** — uses synthetic payload but tests real Electron IPC transport; `realTransportUsed: true`, `realDataObserved: false`
5. **`seed.ts`** — Bootstrap shapes for initial UI render. All data overwritten by hydration calls on mount.

---

## Fixed Stubs (Previous Audit)

| Handler | File | Before | After |
|---------|------|--------|-------|
| `BROWSER_SAVE_TO_MEMORY` | `electron/main.js` | `{ success: false, note: 'Not yet implemented' }` | Real `executeJavaScript` + `memory_add_fact` sidecar call |
| `settings:set` | `electron/ipc-handlers.js` | In-memory mutation, never persisted | Real `set_provider`, `set_model`, `set_gemini_api_key` sidecar dispatch |
| `SessionCard.handleExport` | `frontend/.../SessionCard.tsx` | `alert()` stub | Real `bridgeInvoke('export_session_markdown', { session_id })` |
