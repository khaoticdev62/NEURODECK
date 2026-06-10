# Application Audit Map

> **Updated:** 2026-06-10 — v6 React frontend migration reflected. Sections marked **[v6]** cover the React layer; unmarked sections remain accurate for the Electron/Rust layers.

## App Overview

NEURODECK is an Electron 36 + Rust sidecar desktop application built for Steam Deck and desktop Linux/Windows. It combines an AI chat workspace, PTY terminal, canvas editor, agent execution loop, vector memory, plugin system, file/network tooling, and handheld-native navigation into a single fullscreen shell.

The Electron shell acts as a thin, secure wrapper: it manages the window, OS integrations, and the lifecycle of the Rust sidecar. All AI, terminal, and data logic runs inside the Rust sidecar process (formerly the Tauri backend). The frontend communicates with the sidecar over a local HTTP/WebSocket bridge, not through Electron IPC.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 36 |
| Sidecar (backend) | Rust 1.92.0 |
| Frontend **[v6]** | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| IPC bridge **[v6]** | `neurobridge.js` HTTP POST + WebSocket to Rust sidecar |
| State management **[v6]** | `useNeuroDeckState` reducer + `NeuroDeckSelectors` |
| Design tokens **[v6]** | CSS custom properties (`--nd-*`) mapped to Tailwind `nd.*` colors |
| UI terminal | xterm.js |
| Scripting | Lua 5.4 via mlua (vendored) |
| AI providers | Gemini, Ollama, HuggingFace, Kimi |
| Networking | FTP, SFTP, LAN tunnel, P2P transfer, canvas collab |
| Testing | Vitest (unit), Rust tests (integration), Playwright (E2E) |
| Packaging | electron-builder — Windows NSIS, Linux AppImage/deb, macOS DMG |

---

## Electron Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process (electron/main.js)               │
│  - Custom neurodeck:// protocol                         │
│  - Sidecar spawn + lifecycle + health polling           │
│  - Window management (splash + main)                   │
│  - Tray icon                                            │
│  - IPC handlers (file dialogs, safe storage, kiosk)    │
│  - URL/navigation security enforcement                  │
│  - Permission request handler (deny-by-default)         │
└────────────────────┬────────────────────────────────────┘
                     │  contextBridge
                     │  (electron/preload.js — sandboxed)
                     │
┌────────────────────▼────────────────────────────────────┐
│  Renderer Process (frontend/dist via neurodeck://)      │
│  contextIsolation=true, nodeIntegration=false,          │
│  sandbox=true                                           │
│                                                         │
│  window.electronAPI — narrow OS bridge API              │
│  window.NEURODECK_PORT — bridge port for neurobridge.js │
└────────────────────┬────────────────────────────────────┘
                     │  neurobridge.js
                     │  HTTP POST /api/{command}
                     │  WebSocket ws://127.0.0.1:{port}/ws
                     │
┌────────────────────▼────────────────────────────────────┐
│  Rust Sidecar (target/release/app)                      │
│  - axum HTTP + WebSocket bridge                         │
│  - All AI, terminal, memory, storage, plugin logic      │
│  - Rate limiting, command validation, path sanitization │
└─────────────────────────────────────────────────────────┘
```

---

## Main Process Responsibilities

- Register `neurodeck://` as a privileged scheme for stable localStorage origin
- Find a free port (default 9477) and start the Rust sidecar
- Poll sidecar `/health` endpoint until ready, then show the main window
- Enforce URL validation on all navigation and new-window events
- Enforce permission deny-by-default via `session.setPermissionRequestHandler`
- Serve IPC requests from the preload bridge (see IPC Channel Inventory)
- Manage tray and graceful shutdown (SIGTERM → SIGKILL)

---

## Preload API Surface

Exposed via `contextBridge.exposeInMainWorld('electronAPI', ...)`. TypeScript types in `electron/preload.d.ts`.

| Method | IPC Channel | Purpose |
|---|---|---|
| `getBridgePort()` | `get-bridge-port` | Returns the port the Rust sidecar is on |
| `openExternal(url)` | `open-external` | Opens validated http/https URL in OS browser |
| `showSaveDialog(opts)` | `show-save-dialog` | OS save-file dialog |
| `showOpenDialog(opts)` | `show-open-dialog` | OS open-file dialog |
| `safeStorageEncrypt(str)` | `safe-storage-encrypt` | OS keychain encryption |
| `safeStorageDecrypt(str)` | `safe-storage-decrypt` | OS keychain decryption |
| `isSafeStorageAvailable()` | `safe-storage-available` | Keychain availability check |
| `setKiosk(bool)` | `set-kiosk` | Toggle fullscreen/kiosk mode |
| `getIsKiosk()` | `get-is-kiosk` | Query kiosk state |
| `requestNotificationPermission()` | `request-notification-permission` | Notification permission |

Also exposed: `window.NEURODECK_PORT` (string) — synchronous bridge port for `neurobridge.js`.

---

## IPC Channel Inventory

| Channel | Direction | Caller | Handler | Payload | Auth / Validation | Risk |
|---|---|---|---|---|---|---|
| `get-bridge-port` | renderer → main | neurobridge.js bootstrap | returns `bridgePort` int | none | none needed | Low |
| `open-external` | renderer → main | frontend link handlers | calls `safeOpenExternal` | `url: string` | validates http/https protocol | Low |
| `show-save-dialog` | renderer → main | export flows | `dialog.showSaveDialog` | Electron DialogOptions | Electron sanitizes | Low |
| `show-open-dialog` | renderer → main | import/open flows | `dialog.showOpenDialog` | Electron DialogOptions | Electron sanitizes | Low |
| `safe-storage-available` | renderer → main | settings check | `safeStorage.isEncryptionAvailable` | none | none | Low |
| `safe-storage-encrypt` | renderer → main | API key storage | `safeStorage.encryptString` | `plain: string`, max 64 KB | type + length check | Medium |
| `safe-storage-decrypt` | renderer → main | API key retrieval | `safeStorage.decryptString` | `encrypted: string`, max 128 KB | type + length check | Medium |
| `set-kiosk` | renderer → main | Steam Deck kiosk toggle | `mainWindow.setKiosk` | `enabled: boolean` | coerced to Boolean | Low |
| `get-is-kiosk` | renderer → main | UI state sync | `mainWindow.isKiosk()` | none | none | Low |
| `request-notification-permission` | renderer → main | notification setup | returns `Notification.permission` | none | none | Low |

---

## Renderer Responsibilities

- All UI rendering: views, chat, terminal, canvas, settings, modals
- `neurobridge.js`: HTTP/WebSocket calls to the Rust sidecar for all data operations
- `main.js`, `state.js`, and ES modules: view routing, state management, event wiring
- The renderer has zero direct access to Node.js, the filesystem, or OS APIs

---

## Core Features

- AI chat with streaming responses
- Prompt and persona switching
- PTY terminal with multiple sessions
- Live code canvas with preview
- Autonomous agent execution loop
- Memory search, pinning, and fact storage
- Browser and remote-control tooling
- File transfer, FTP, SFTP, and tunnel support
- SSH session management
- PromptLab and command generation tools
- Plugin auto-loading and custom slash commands
- Mini IDE with multi-LSP support (rust-analyzer, pylsp, typescript-language-server, lua-language-server, clangd, gopls, bash-language-server)

---

## Routes / Views **[v6]**

NEURODECK does not use HTTP page routing. Navigation is a `ViewId` union type managed by `useNeuroDeckState` reducer.

| View ID | Component | Section |
|---|---|---|
| `workspace` | `WorkspaceView` | Core |
| `terminal` | `TerminalView` | Core |
| `canvas` | `CanvasView` | Core |
| `agents` | `AgentsView` | Core |
| `memory` | `MemoryView` | Core |
| `prompt-lab` | `PromptLabView` | Core |
| `browser` | `BrowserView` | Tools |
| `docs` | `DocsView` | Tools |
| `share` | `ShareView` | Tools |
| `tunnel` | `TunnelView` | Tools |
| `remote` | `RemoteView` | Tools |
| `ssh` | `SSHView` | Tools |
| `models` | `ModelsView` | System |
| `plugins` | `PluginsView` | System |
| `sessions` | `SessionsView` | System |
| `settings` | `SettingsView` | System |
| `diagnostics` | `DiagnosticsView` | System |
| `security` | `SecurityView` | Security & Ops |
| `themes` | `ThemesView` | Security & Ops |
| `exports` | `ExportsView` | Security & Ops |
| `maintenance` | `MaintenanceView` | Security & Ops |
| `recovery` | `RecoveryView` | Security & Ops |

---

## API Routes

Frontend-to-backend interaction uses the HTTP/WebSocket bridge (`neurobridge.js`):

- **Commands:** `POST http://127.0.0.1:{port}/api/{command}` with JSON body
- **Events:** WebSocket `ws://127.0.0.1:{port}/ws` — broadcast channel from sidecar

Notable backend command groups:

- Chat and LLM: `send_command`, `cancel_generation`, `execute_command_stream`
- Sessions and memory: `save_session`, `load_session_by_id`, `memory_list_all`, `memory_delete`, `memory_pin`
- Terminal and SSH: `pty_spawn`, `pty_write`, `pty_resize`, `pty_kill`
- Agent and canvas: `agent_step`, `agent_exec_code`, canvas collaboration commands
- File/network: FTP, SFTP, tunnel, transfer commands
- System: config, personas, themes, autocomplete, diagnostics, TTS/STT, security helpers

---

## Auth and Permission Boundaries

- The Electron main process is the trust boundary for OS-level operations (file dialogs, keychain, kiosk).
- All renderer-supplied IPC payloads are validated before use.
- Only `http:` and `https:` URLs may be opened externally — all other protocols are blocked.
- All permission requests (camera, microphone, geolocation, MIDI) are denied except notifications.
- Gemini API access depends on a locally configured API key (stored in OS keychain via safeStorage).
- Sync and remote collaboration flows must treat remote data as untrusted.
- Lua plugins are trusted code loaded from the local `plugins/` directory.
- Shell/PTY execution is privileged and validates arguments in the Rust sidecar (see `docs/SECURITY_AUDIT_2026-05-26.md`).

---

## User Roles

- Local operator: primary end user on Steam Deck or desktop
- Power user: manages sessions, plugins, prompts, and models
- Collaborator: joins shared canvas or transfer workflows
- Developer/maintainer: edits plugins, config, and release metadata

---

## Settings and Preferences

- Provider selection and API key management
- Gemini, Ollama, and local model settings
- Theme and persona selection
- Voice/TTS and STT settings
- Haptics toggle
- Sync enablement and endpoint settings
- Custom personas and plugin toggles
- SSH, FTP, and transfer-related preferences

---

## Navigation System

- Single-window Electron shell with tab switching
- Radial gamepad menu and keyboard shortcuts for quick tab access
- Settings modal and command palette overlays
- Context-driven focus changes for chat, terminal, canvas, and dialog surfaces

---

## Major Components **[v6]**

### Electron Layer
| Component | File | Purpose |
|---|---|---|
| Main process | `electron/main.js` | Window, sidecar lifecycle, IPC, security |
| IPC channel registry | `electron/ipc-channels.js` | Channel name constants + allowlist |
| Preload | `electron/preload.js` | contextBridge API surface |

### React Component Registry
**Foundation:** `Badge`, `Button`, `IconButton`, `Panel`, `DeckButtonHint`

**Layout:** `TitleBar` (TopStatusBar with live chips), `PrimarySidebar`, `SecondaryRail`

**Workspace:** `ChatViewport`, `InputConsole`, `ResponseCard`

**Cards:** `AgentCard`, `ModelCard`, `PluginCard`, `SessionCard`, `TelemetryWidget`

**Systems:** `MemoryPanel`, `DiagnosticsPanel`

**Overlay:** `CommandPalette`, `SettingsView`

### Rust Sidecar
| Module | Purpose |
|---|---|
| `lib.rs` | `AppState`, personas, themes, game detection |
| `bridge.rs` | axum HTTP + WebSocket server on `127.0.0.1:9477` |
| `llm.rs` | Gemini streaming SSE, Ollama inference, `generate_embedding` |
| `promptdrive.rs` | PromptDrive packs, templates, slots, macros, suggestions |
| `pty_manager.rs` | PTY sessions via `portable-pty` |
| `memory.rs` | Cosine-similarity vector DB |
| `commands/` | session, config, system, agent, browser, api_lab, cli_maker, git, ide |
| `deckcode/` | DeckCode schema parsing, input loop, bindings resolver, IPC dispatch |

---

## Shared Libraries and Utilities **[v6]**

| Module | Purpose |
|---|---|
| `frontend/src/neurobridge.js` | Drop-in `@tauri-apps/api` replacement — HTTP + WebSocket IPC |
| `frontend/src/react/services/bridgeAdapter.ts` | Typed React service layer over neurobridge |
| `frontend/src/react/state/useNeuroDeckState.ts` | Central reducer + selectors + dispatch |
| `frontend/src/react/utils/autocomplete/` | Trie + fuzzy client-side autocomplete engine |
| `frontend/src/react/utils/controller/action-registry.ts` | ActionId enum + Steam Deck default bindings |
| `frontend/src/react/utils/agents/default-agents.ts` | 5 default agent definitions |
| `electron/ipc-channels.js` | IPC channel name constants + allowed-channel set |
| `frontend/src/react/types/electron.d.ts` | TypeScript declarations for `window.electronAPI` |

---

## Data Models

- Config: `Config`, `LlmConfig`, `ThemeConfig`, `SyncConfig`
- Personas: built-in and custom persona records
- Sessions: chat transcripts, metadata, and export payloads
- Memory records: content + metadata + cosine-similarity vectors
- PTY sessions: session IDs, shell state, resize state
- Collaboration: workspace state, peers, presence, approvals
- Transfer records: peer info, status, progress
- Diagnostics: boot pipeline steps and health summaries

---

## External Integrations

- Google Gemini API
- Ollama (local LLM)
- OS keychain (Electron safeStorage — Windows DPAPI, macOS Keychain, Linux Secret Service)
- Steam Deck / Steam Input
- FTP and SFTP servers
- LAN peers for Warpinator file transfer and canvas collaboration
- Google OAuth device flow
- Optional speech tools and local system executables

---

## Native OS Integrations

- **File dialogs:** `dialog.showSaveDialog`, `dialog.showOpenDialog` via IPC
- **OS keychain:** `safeStorage.encryptString` / `decryptString` via IPC
- **Kiosk/fullscreen:** `mainWindow.setKiosk` + `setFullScreen` via IPC
- **Tray icon:** Minimize to tray with context menu
- **Notifications:** `Notification.permission` (OS permission granted on first use)
- **System browser:** `shell.openExternal` for validated http/https URLs only

---

## File System Access Points

All filesystem access happens inside the Rust sidecar — never directly in the renderer. Key paths:

- `user_config_dir()/data/memory/` — vector memory DB
- `user_config_dir()/data/personas.json` — custom personas
- `user_config_dir()/sessions/` — chat session storage
- `user_config_dir()/exports/` — export artifacts
- `user_config_dir()/logs/` — application logs
- `plugins/` — Lua plugin directory (loaded at startup)
- `llm-term.toml` — application config (resolved via path logic in `config.rs`)

---

## Protocol and Deep-Link Handlers

- `neurodeck://` — custom Electron file protocol serving `frontend/dist/`. Path traversal protected — requests outside `frontend/dist/` return `NET::ERR_FILE_NOT_FOUND`.
- External URLs — opened via `shell.openExternal` after validating `http:` or `https:` protocol only.
- No deep link / URL scheme handler registered for incoming OS-level deep links (future work).

---

## Auto-Update Flow

- `electron-builder.yml` configures `publish.provider: generic` pointing to `https://releases.neurodeck.app`.
- The in-app auto-update mechanism is not yet wired (Electron's `autoUpdater` module is not imported in `main.js`). Update notification and download UI is future work.
- macOS builds use `hardenedRuntime: true` with `build/entitlements.mac.plist` to prepare for notarization.

---

## Security-Sensitive Flows

- Saving and reading API keys (OS keychain via `safeStorage`)
- Executing shell or agent-generated commands (Rust sidecar validates all commands)
- Plugin loading at startup (Lua plugins from `plugins/` directory)
- FTP/SFTP download and upload path validation
- Sync encryption and conflict handling
- Canvas collaboration and remote control (LAN peers)
- Browser automation / external process launching
- File-system reads of user-provided paths (validated in `security.rs`)
- External URL opening (validated in `main.js` — http/https only)
- OS permission requests (denied by default in `main.js`)

---

## Accessibility-Sensitive Flows

- Keyboard and gamepad navigation
- Command palette and radial menu focus behavior
- Dialogs and settings forms (focus trap via `focus-trap.js`)
- Tab switching and active-state feedback
- Error and loading announcements in streamed views
- Steam Deck touch-target sizing and viewport fit (1280×800)

---

## Performance-Sensitive Screens

- Chat timeline (message virtualization via intersection observer)
- Terminal sessions (PTY streaming, xterm.js rendering)
- Canvas editor and live preview (Monaco + iframe)
- Memory list (cosine search + pagination)
- Agent execution and streamed output
- Mini IDE with LSP completions and diagnostics

---

## Current Risk Areas

- Shell and network helpers in the Rust sidecar remain the most security-sensitive code paths — see `docs/SECURITY_AUDIT_2026-05-26.md`
- Auto-update is not yet wired — users must manually update until `autoUpdater` is integrated
- `plugins/` directory is trusted without sandboxing — a malicious Lua plugin has full `execute()` access
- The `main.js` and `lib.rs` god-file pattern remains the highest maintenance risk — incremental extraction is ongoing
- Modal-heavy UI requires continued focus and zoom testing at 1280×800 and 200% zoom
- Electron Fuses (runtime lockdown) are not yet configured — see `docs/electron-security.md`
