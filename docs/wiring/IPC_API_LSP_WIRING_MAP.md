# IPC + API + LSP WIRING MAP

This document details the flow of data across the NEURODECK application layers. All calls originate in the React Renderer, pass through a secure Preload boundary, traverse typed IPC channels, get processed in the Electron Main process, interact with their target Service or the Rust Sidecar via HTTP/WS, and return formatted contracts.

---

## 1. Flow Diagram (Standard Blueprint)

```
[React Renderer Feature]
           ↓
    [Preload API Call]
           ↓  (Context Bridge: ipcRenderer.invoke)
      [IPC Channel]
           ↓  (Sender Origin & Size Validation)
 [Main Process Handler]
           ↓  (Service Layer / Request Routing)
[Rust Sidecar HTTP POST] ← (Localhost Interface)
           ↓
  [Response Contract]
           ↓  (Error Normalization: Result<T>)
[Preload Returns Promise]
           ↓
[State Update / UI Render]
           ↓
[Diagnostics healthProbe]  (Proof of Traffic)
```

---

## 2. Feature-Specific Wiring Mapping

### A. Language Server Protocol (LSP)

#### 1. Start Language Server
* **Renderer Feature**: IDE Code Intellisense Editor (`IDEView.tsx`)
* **Preload API**: `window.neurodeck.lsp.startServer(language, command, args)`
* **IPC Channel**: `lsp:start-server` (Schema validated)
* **Main Process Handler**: `electron/services/lsp/lsp-manager.js` -> `startServer()`
* **Service Layer**: Node `child_process.spawn()` of the selected language server binary (e.g. `pylsp` / `typescript-language-server`).
* **External API / Stdio**: Spawns language server subprocess in background, opens stdin/stdout.
* **Response Contract**: `NeurodeckResult<{ language: string, status: "starting" | "ready" }>`
* **Renderer State Update**: `lspStore` updates to `starting`.
* **UI Display**: Loading spinner in the IDE language indicator badge.
* **Verification Probe**: Spawns dummy server, sends `initialize` JSON-RPC request, verifies response, shuts down.

#### 2. Get Hover
* **Renderer Feature**: Editor hovering documentation tooltip
* **Preload API**: `window.neurodeck.lsp.hover(language, uri, line, character)`
* **IPC Channel**: `lsp:hover`
* **Main Process Handler**: `electron/services/lsp/lsp-manager.js` -> `getHover()`
* **Service Layer**: Sends `textDocument/hover` JSON-RPC request over `lsp-transport.js` to language server stdin.
* **Response Contract**: `NeurodeckResult<LspHover>` (see `LspHover` schema)
* **UI Display**: Markdown tooltip next to the cursor.

---

### B. LLM Models & AI Providers

#### 1. List Active Models
* **Renderer Feature**: Model Selector in TitleBar / Settings View
* **Preload API**: `window.neurodeck.models.list()`
* **IPC Channel**: `models:list`
* **Main Process Handler**: `electron/main.js` -> fetches from Rust sidecar `/api/ollama_list_models` / config.
* **Response Contract**: `NeurodeckResult<DiscoveredModel[]>`
* **UI Display**: Dropdown of active models and their status.

#### 2. Chat Execution
* **Renderer Feature**: Chat Workspace Chat Interface (`WorkspaceView.tsx`)
* **Preload API**: `window.neurodeck.models.runPrompt(payload)`
* **IPC Channel**: `models:run-prompt`
* **Main Process Handler**: Calls sidecar `/api/send_command` or streams via WebSocket listener.
* **Response Contract**: `NeurodeckResult<{ status: "streaming" | "done" }>`

---

### C. Chat Sessions

#### 1. Save Chat Session
* **Renderer Feature**: Sessions tab (`SessionsView.tsx`)
* **Preload API**: `window.neurodeck.sessions.save(payload)`
* **IPC Channel**: `sessions:save`
* **Main Process Handler**: Calls sidecar `/api/save_session`
* **Response Contract**: `NeurodeckResult<{ ok: true, file: string }>`

---

### D. Vector Memory

#### 1. Search Vector Memory
* **Renderer Feature**: Memory search drawer / Workspace context drawer
* **Preload API**: `window.neurodeck.memory.search(query)`
* **IPC Channel**: `memory:search`
* **Main Process Handler**: Calls sidecar `/api/memory_list` with filter/search
* **Response Contract**: `NeurodeckResult<{ records: MemoryRecord[] }>`

---

### E. Connections & Diagnostics

#### 1. Get Connection Health Matrix
* **Renderer Feature**: System Diagnostics tab (`DiagnosticsView.tsx`)
* **Preload API**: `window.neurodeck.diagnostics.getConnectionMatrix()`
* **IPC Channel**: `diagnostics:connection-matrix`
* **Main Process Handler**: `electron/services/diagnostics/connectionRegistry.js`
* **Response Contract**: `NeurodeckResult<ConnectionHealth[]>`
* **UI Display**: Green/Yellow/Red health matrix showing roundtrip latency and byte counters.
* **Verification Probe**: Calls `diagnostics.runHealthProbe(id)` for targeted test traffic.

---

### F. Settings

#### 1. Get Settings
* **Renderer Feature**: Settings dialog panels (`SettingsView.tsx`)
* **Preload API**: `window.neurodeck.settings.get(key)`
* **IPC Channel**: `settings:get`
* **Main Process Handler**: Calls sidecar `/api/get_config` or local store.
* **Response Contract**: `NeurodeckResult<unknown>`
