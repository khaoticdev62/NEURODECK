# NEURODECK — Tauri → Electron Migration Handoff

> **Purpose**: This document provides everything an AI coding agent (ChatGPT, Claude, Gemini, Copilot, Cursor, etc.) needs to execute the migration of NEURODECK from Tauri v2 to Electron. Paste this into your LLM's context window alongside the codebase.

---

## 1. Project Identity

- **Name**: NEURODECK
- **Version**: 1.7.1 (codename: Sekhmet)
- **What it is**: A Tauri v2 desktop app — AI-powered terminal OS for Steam Deck. LLM chat, live code canvas, PTY shell, autonomous agent, vector memory, gamepad navigation, Lua plugins — all in one 1280×800 fullscreen window.
- **Languages**: Rust (backend, ~600K bytes), JavaScript/TypeScript (frontend, ~1.5M bytes), CSS (~500K bytes), Lua (25 plugins)
- **Current stack**: Tauri v2.11 + Rust 1.92 + Vite 8 + React 19 + xterm.js + marked.js
- **Target stack**: Electron 36 + same Rust backend as sidecar + same frontend

---

## 2. Why the Migration Is Tractable

A **bridge server already exists** in the Rust backend. When launched with `--bridge`, the binary starts an HTTP+WebSocket server on `localhost:9477` that exposes all 295 Tauri commands:

- `POST /api/{command}` — replaces `invoke(command, args)` 
- `GET /ws` — WebSocket replaces `listen(event, callback)`
- `GET /health` — returns `"NEURODECK_READY"` when sidecar is up

The dispatch table is in `src-tauri/src/commands/mod.rs` (4406 lines). Every command from the Tauri handler macro is already re-implemented in the `dispatch()` match. **No new backend code is needed.**

---

## 3. Architecture Map

### Current (Tauri)
```
Frontend (Vite/React) ──invoke()──► Tauri IPC ──► #[tauri::command] handlers
                       ◄──emit()───            ◄── app_handle.emit()
```

### Target (Electron + Sidecar)
```
Frontend (Vite/React) ──fetch()──► HTTP localhost:9477 ──► dispatch() in commands/mod.rs
                       ◄──WS────                        ◄── WsBroadcaster.emit()
```

### Electron Process Model
```
electron/main.js (Main Process)
  ├─ Spawns: neurodeck.exe --bridge (child process)
  ├─ Polls: GET /health until "NEURODECK_READY"
  ├─ Creates: BrowserWindow loading frontend/dist/index.html
  ├─ Manages: Tray icon, window lifecycle, auto-update
  └─ preload.js: contextBridge exposes neurodeck.invoke() / neurodeck.listen()

frontend/ (Renderer Process) — unchanged except import paths
  ├─ neurobridge.js: invoke() → fetch(), listen() → WebSocket
  └─ All existing JS/CSS/HTML
```

---

## 4. File Inventory (Key Files)

### Rust Backend (`src-tauri/src/`)
| File | Lines | Role | Migration Impact |
|---|---|---|---|
| `lib.rs` | 1513 | AppState, run(), bridge_server(), personas, themes, game detection | Remove Tauri `run()`, keep `run_bridge_server()` |
| `commands/mod.rs` | 4406 | Bridge dispatch table — ALL 295 commands | **No changes needed** |
| `commands/session.rs` | ~1000 | Chat session commands | No changes |
| `commands/system.rs` | ~2000 | System commands | No changes |
| `commands/agent.rs` | ~600 | Agent orchestration commands | No changes |
| `commands/config.rs` | ~400 | Config management | No changes |
| `commands/git.rs` | ~500 | Git integration | No changes |
| `commands/browser.rs` | ~300 | Headless Chrome | No changes |
| `bridge.rs` | 250 | HTTP+WS server (axum) — ServerState, WsBroadcaster, routes | **No changes needed** |
| `llm.rs` | 1749 | LlmProvider trait, Gemini/Ollama/HF/Kimi/OpenAI providers | No changes |
| `pty_manager.rs` | 338 | PTY sessions (portable-pty) — has `#[tauri::command]` functions | Remove Tauri decorators; bridge dispatch already handles PTY |
| `memory.rs` | 375 | Vector DB (cosine similarity, MMR search) | No changes |
| `lua.rs` | ~400 | mlua Lua 5.4 runtime, plugin loading | No changes (headless mode exists) |
| `config.rs` | 316 | Config struct, TOML load/save | No changes |
| `transfer.rs` | ~1000 | LAN P2P + Warpinator gRPC | No changes |
| `torrent.rs` | ~600 | fx-torrent download manager | No changes |
| `mcp.rs` | ~800 | MCP server integration | No changes |
| `orchestrator.rs` | ~400 | Multi-agent orchestration | No changes |
| `remote_control.rs` | ~1000 | Remote control WebSocket server | No changes |
| Other modules (15+) | ~3000 | Various features | No changes |

### Frontend (`frontend/src/`)
| File | Bytes | Role | Migration Impact |
|---|---|---|---|
| `main.js` | 623K | Main app, boot screen, routing, all views | **Replace all `invoke()`/`listen()` imports** |
| `app.css` | 503K | Entire design system | No changes |
| `chat.js` | 102K | Chat view | Replace imports |
| `settings.js` | 97K | Settings modal | Replace imports |
| `terminal.js` | 76K | Terminal view | Replace imports |
| `ctrl_prompt.js` | 68K | Prompt engineering UI | Replace imports |
| `workflow_view.js` | 50K | Workflow builder | Replace imports |
| `canvas.js` | 45K | Code canvas | Replace imports |
| `torrent.js` | 37K | Torrent downloader | Replace imports |
| `agent.js` | 33K | Agent UI | Replace imports |
| `cli_maker.js` | 27K | CLI maker | Replace imports |
| `orchestrator.js` | 25K | Orchestrator UI | Replace imports |
| `api_lab.js` | 24K | API testing lab | Replace imports |
| `ide_view.js` | 24K | IDE view | Replace imports |
| `icons.js` | 18K | Icon library | No changes |
| `memory.js` | 17K | Memory UI | Replace imports |
| `lsp_client.js` | 16K | LSP client | Replace imports |
| `shortcuts.js` | 16K | Keyboard shortcuts | Replace imports |
| `git.js` | 12K | Git UI | Replace imports |
| `graph_view.js` | 11K | Graph visualization | Replace imports |
| `remote_control_view.js` | 9K | Remote control | Replace imports |
| Other files (10+) | ~30K | Various utilities | Some import changes |

---

## 5. The Migration — Step by Step

### Step 1: Create Electron Shell

Create `electron/` directory at project root:

**`electron/main.js`**:
```javascript
const { app, BrowserWindow, Tray, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let sidecar;
const SIDECAR_PORT = process.env.NEURODECK_PORT || 9477;

function getSidecarPath() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  // In dev: use cargo-built binary
  // In production: extraResources path
  if (app.isPackaged) {
    return path.join(process.resourcesPath, `neurodeck${ext}`);
  }
  return path.join(__dirname, '..', 'src-tauri', 'target', 'release', `app${ext}`);
}

function spawnSidecar() {
  const bin = getSidecarPath();
  sidecar = spawn(bin, ['--bridge'], {
    env: { ...process.env, NEURODECK_PORT: String(SIDECAR_PORT) },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  sidecar.stdout.on('data', (data) => {
    const line = data.toString();
    if (line.includes('NEURODECK_READY')) {
      console.log('Sidecar ready');
    }
  });
  sidecar.stderr.on('data', (data) => console.error('[sidecar]', data.toString()));
  sidecar.on('exit', (code) => {
    console.log(`Sidecar exited: ${code}`);
    if (!app.isQuitting) spawnSidecar(); // Auto-restart
  });
}

async function waitForHealth(retries = 60) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${SIDECAR_PORT}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Sidecar failed to start');
}

app.whenReady().then(async () => {
  spawnSidecar();
  await waitForHealth();
  
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 800, minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.png'),
  });
  
  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL('http://localhost:1420');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (sidecar) sidecar.kill();
});
```

**`electron/preload.js`**:
```javascript
const { contextBridge } = require('electron');

const BRIDGE_URL = `http://127.0.0.1:${process.env.NEURODECK_PORT || 9477}`;
let ws = null;
const listeners = new Map();

function getWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  ws = new WebSocket(`ws://127.0.0.1:${process.env.NEURODECK_PORT || 9477}/ws`);
  ws.onmessage = (msg) => {
    const { event, payload } = JSON.parse(msg.data);
    const handlers = listeners.get(event) || [];
    handlers.forEach(fn => fn({ payload }));
  };
  ws.onclose = () => setTimeout(getWebSocket, 1000);
  return ws;
}

contextBridge.exposeInMainWorld('__TAURI__', {
  invoke: async (command, args = {}) => {
    const res = await fetch(`${BRIDGE_URL}/api/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  event: {
    listen: (event, callback) => {
      getWebSocket();
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
      return Promise.resolve(() => {
        const arr = listeners.get(event) || [];
        const idx = arr.indexOf(callback);
        if (idx >= 0) arr.splice(idx, 1);
      });
    },
    emit: async (event, payload) => {
      // Events from frontend to backend go via HTTP
      await fetch(`${BRIDGE_URL}/api/emit_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload }),
      });
    },
  },
});
```

> **CRITICAL**: The preload exposes `window.__TAURI__` with `invoke` and `event.listen` — this matches the existing frontend's expected API shape (`withGlobalTauri: true` in tauri.conf.json). If the frontend uses `window.__TAURI__.invoke()` directly (which it does), **no frontend import changes are needed at all** — the preload shims the entire API transparently!

### Step 2: Frontend Import Adaptation

Search all `.js` files for these import patterns and replace:

```javascript
// FIND:
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
const { invoke } = window.__TAURI__.core;

// REPLACE WITH (if using module imports):
// Option A: Use window.__TAURI__ global (preload handles this — NO CHANGES NEEDED if withGlobalTauri was true)
// Option B: Create neurobridge.js wrapper module
```

**Check**: Grep the codebase for how `invoke` is called:
```bash
grep -rn "invoke(" frontend/src/ --include="*.js" | head -20
grep -rn "__TAURI__" frontend/src/ --include="*.js" | head -20
grep -rn "from.*@tauri-apps" frontend/src/ --include="*.js" | head -20
```

If the frontend uses `window.__TAURI__.invoke()` (global Tauri mode), the preload handles everything and **zero frontend changes are needed**.

If it uses ES module imports, you need the search-replace.

### Step 3: Clean Up Cargo.toml

```diff
[build-dependencies]
-tauri-build = { version = "2.6.2", features = [] }

[dependencies]
-tauri = { version = "2.11.2", features = ["tray-icon"] }
-tauri-plugin-log = "2"
+clap = { version = "4", features = ["derive"] }
```

Everything else stays. The binary becomes a plain CLI that starts the bridge server.

### Step 4: Simplify main.rs

```rust
fn main() {
    // Parse CLI args
    let args: Vec<String> = std::env::args().collect();
    
    // Always run in bridge mode (Electron controls the UI)
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    rt.block_on(app_lib::run_bridge_server());
}
```

### Step 5: Remove Tauri-Specific Code from lib.rs

- Delete the `pub fn run()` function (Tauri app builder with generate_handler![])
- Keep `run_bridge_server()` as the entry point
- Remove `#[cfg_attr(mobile, tauri::mobile_entry_point)]`
- Remove `use tauri::Manager`
- The `#[tauri::command]` decorated functions in `pty_manager.rs` and elsewhere become dead code — the bridge dispatch handles everything

### Step 6: Build & Package

```bash
# Build Rust sidecar
cd src-tauri && cargo build --release

# Build frontend
cd frontend && npm run build

# Package Electron app
cd electron && npx electron-builder --config electron-builder.yml
```

**`electron-builder.yml`**:
```yaml
appId: com.neurodeck.app
productName: NEURODECK
directories:
  output: ../dist-electron
files:
  - electron/**/*
  - frontend/dist/**/*
extraResources:
  - from: src-tauri/target/release/app${ext}
    to: neurodeck${ext}
win:
  target: nsis
linux:
  target: [AppImage, deb]
mac:
  target: dmg
```

---

## 6. Gotchas & Tribal Knowledge

1. **Config path**: The binary reads `../llm-term.toml` (dev) or `./llm-term.toml` (deployed). In Electron sidecar mode, the working directory will be different. Set `cwd` when spawning the sidecar to match expected paths, or use the `~/.config/neurodeck/llm-term.toml` fallback.

2. **GEMINI_API_KEY**: Must be set as env var or stored in OS keychain. Pass it through when spawning the sidecar.

3. **PTY sessions**: The bridge dispatch handles `pty_spawn`/`pty_write`/`pty_kill` but the actual PTY reader thread emits events via the `WsBroadcaster` — this works in bridge mode.

4. **Lua plugins**: `LuaEngine::new_headless()` already exists and is used in bridge mode. Plugin loading works without Tauri.

5. **CSS Specificity Trap**: Never add `display: flex` to `#view-*` ID rules — kills tab switching. This is unchanged by migration but worth noting.

6. **Window size**: 1280×800 is the design target (Steam Deck). Electron's BrowserWindow should match.

7. **`suppaftp` sync calls**: All FTP operations use `spawn_blocking`. No changes needed.

8. **`mlua` vendored Lua 5.4**: First build takes 2–3 min. Normal.

9. **Multiple config file copies**: `llm-term.toml` exists at root, `src-tauri/`, `assets/`, `dist/`. Only `src-tauri/llm-term.toml` is read at runtime.

10. **Bridge port**: Default 9477, override with `NEURODECK_PORT` env var.

---

## 7. IPC Protocol Reference

### Command Invocation
```
POST http://127.0.0.1:9477/api/{command_name}
Content-Type: application/json
Body: { "arg1": "value1", "arg2": 42 }

Response: 200 OK with JSON result, or 422 with error string
```

### Event Streaming
```
GET ws://127.0.0.1:9477/ws

Messages (server → client):
{
  "event": "command_token",    // LLM streaming token
  "payload": { "token": "..." }
}
{
  "event": "pty_output",       // Terminal output
  "payload": { "id": "main_pty_session", "data": "..." }
}
{
  "event": "command_done",     // LLM generation complete
  "payload": { "status": "complete" }
}
{
  "event": "agent_started",    // Agent loop started
  "payload": { "goal": "...", "task_id": "..." }
}
```

### Key Commands (295 total)
| Category | Commands |
|---|---|
| System | `health`, `get_system_info`, `get_version`, `get_context_stats`, `debug_info` |
| Chat | `send_command`, `cancel_generation`, `get_messages`, `clear_messages` |
| Session | `new_session`, `save_session`, `load_session`, `list_sessions`, `reset_session` |
| Config | `get_config`, `set_config`, `set_model`, `set_provider` |
| Persona | `get_personas`, `set_persona` |
| PTY | `pty_spawn`, `pty_write`, `pty_kill`, `pty_resize` |
| Memory | `memory_add_fact`, `memory_search`, `memory_list`, `memory_delete`, `memory_clear` |
| Agent | `start_agent`, `stop_agent`, `agent_step`, `get_agent_status`, `get_agent_plan` |
| Git | `git_list_repos`, `git_open_repo`, `git_status`, `git_commit`, `git_push` |
| Lua | `run_lua`, `list_lua_commands`, `call_lua_command` |
| Transfer | `transfer_list_peers`, `transfer_list_active`, `transfer_cancel` |
| Plugins | `list_plugins` |
| Browser | `open_browser`, `browser_back`, `browser_forward` |
| Torrent | torrent_* family |
| Remote | remote_* family |
| IDE/LSP | lsp_*, ide_* family |

---

## 8. Files to Create (New)

| Path | Purpose |
|---|---|
| `electron/main.js` | Electron main process — sidecar lifecycle, window management |
| `electron/preload.js` | Context bridge — shims `window.__TAURI__` API |
| `electron/package.json` | Electron dependencies and scripts |
| `electron-builder.yml` | Packaging configuration |
| `scripts/build-sidecar.sh` | Cross-platform Rust build script |
| `scripts/build-sidecar.ps1` | Windows Rust build script |

## 9. Files to Modify

| Path | Change |
|---|---|
| `src-tauri/Cargo.toml` | Remove `tauri`, `tauri-build`, `tauri-plugin-log`; add `clap` |
| `src-tauri/src/main.rs` | Direct bridge mode entry (no Tauri runtime) |
| `src-tauri/src/lib.rs` | Remove Tauri `run()`, keep `run_bridge_server()` |
| `src-tauri/src/pty_manager.rs` | Remove `#[tauri::command]` decorators and `State<>` params |
| `frontend/package.json` | Remove `@tauri-apps/api` dependency |
| `frontend/vite.config.ts` | Remove Tauri-specific config |
| `package.json` (root) | Remove `@tauri-apps/cli`, add Electron scripts |
| Frontend JS files (40+) | Replace `@tauri-apps/api` imports (if using ES imports, not global) |

## 10. Files to Delete

| Path | Reason |
|---|---|
| `src-tauri/tauri.conf.json` | Tauri-specific configuration |
| `src-tauri/build.rs` | Tauri build script |

---

## 11. Success Criteria

- [ ] `neurodeck --bridge` starts standalone (no Tauri runtime)
- [ ] Electron shell spawns sidecar, polls health, opens window
- [ ] All 295 bridge commands work via HTTP POST
- [ ] WebSocket streaming works for LLM tokens, PTY output, agent events
- [ ] Frontend renders identically (same CSS, same layout, same boot screen)
- [ ] PTY terminal is fully interactive
- [ ] Settings persist across restarts
- [ ] Tray icon works (Windows/Linux)
- [ ] Packaging produces installable bundles (NSIS, AppImage)
- [ ] Gamescope 1280×800 mode works on Steam Deck (Linux)

---

*This document was generated for the NEURODECK project (v1.7.1-Sekhmet) on 2026-06-01. It is designed to be self-contained — paste it into any LLM context for full migration capability.*
