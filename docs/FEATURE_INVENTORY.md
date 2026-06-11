# NEURODECK Feature Inventory

This document serves as the exhaustive inventory of all features, tabs, screens, modals, and background services in the NEURODECK codebase. It maps the legacy Vanilla JS (`frontend/src/main.js`) features against the modern React architecture (`frontend/src/react/features/*`).

## Legacy Features (Vanilla JS - `frontend/src/main.js` / `frontend/src/*.js`)
*These features represent the original Electron/Tauri/Lua implementation. They are slated for migration.*

### Core Views
- **Chat / Terminal:** `chat.js`
- **Canvas:** `canvas.js`
- **Settings:** `settings.js`
- **Terminal (PTY/SSH/SFTP):** `terminal.js`
- **Agent:** `agent.js`
- **Memory (Vector DB):** `memory.js`
- **Dashboard:** `dashboard.js`
- **Git:** `git.js`
- **API Lab:** `api_lab.js`
- **CLI Maker:** `cli_maker.js`
- **Graph View:** `graph_view.js`
- **Scheduler:** `scheduler_view.js`
- **Prompt Lab (Ctrl Prompt):** `ctrl_prompt.js`
- **Remote Control:** `remote_control_view.js`

### Overlays & Services
- **Notifications:** `notifications.js`
- **OAuth Login Modal:** `main.js` (Device Flow)
- **Live Backgrounds (Canvas/CSS):** `main.js` (`LiveBackgroundManager`)
- **Controller/Keyboard Navigation:** `shortcuts.js`, `focus-trap.js`
- **Radial Menu:** `radial.js`
- **Command Palette:** `palette-commands.js`

---

## Modern React Features (`frontend/src/react/features/`)
*These represent the new architecture components. Many are currently scaffolding or partially implemented and must be brought up to the strict Production Contract (Typed IPC, no mocks, LSP integration, fallback resilience).*

| Feature Directory | React Component |
|---|---|
| `agents` | `AgentsView.tsx` |
| `api-lab` | `ApiLabView.tsx` |
| `browser` | `BrowserView.tsx` |
| `cache` | `CacheView.tsx` |
| `canvas` | `CanvasView.tsx` |
| `cli-maker` | `CliMakerView.tsx` |
| `diagnostics` | `DiagnosticsView.tsx` *(Production Ready)* |
| `docs` | `DocsView.tsx` |
| `execution` | `ExecutionView.tsx` |
| `exports` | `ExportsView.tsx` |
| `fonts` | `FontManagerView.tsx` |
| `git` | `GitView.tsx` |
| `graph` | `GraphView.tsx` |
| `ide` | `IDEView.tsx` |
| `maintenance` | `MaintenanceView.tsx` |
| `memory` | `MemoryView.tsx` |
| `models` | `ModelsView.tsx` |
| `orchestrator` | `OrchestratorView.tsx` |
| `plugins` | `PluginsView.tsx` |
| `project` | `ProjectView.tsx` |
| `prompt-lab` | `PromptLabView.tsx` |
| `recovery` | `RecoveryView.tsx` |
| `remote` | `RemoteView.tsx` |
| `scheduler` | `SchedulerView.tsx` |
| `security` | `SecurityView.tsx` |
| `sessions` | `SessionsView.tsx` |
| `settings` | `SettingsView.tsx` (includes `LiveWallpaperPanel.tsx`) |
| `share` | `ShareView.tsx` |
| `ssh` | `SSHView.tsx` |
| `terminal` | `TerminalView.tsx` |
| `themes` | `ThemesView.tsx` |
| `torrent` | `TorrentView.tsx` |
| `tunnel` | `TunnelView.tsx` |
| `workspace` | `WorkspaceView.tsx` |

## Migration Target
All modern React features must fulfill the **Tab Completion Contract**:
1. **Strict Types:** Props, State, and Preload API strictly typed.
2. **Real Data:** Mocks replaced with real IPC adapters (`bridgeAdapter.ts` -> `window.neurodeck`).
3. **No Direct Node/FS:** The renderer must never directly access the filesystem.
4. **Resilience:** Graceful error handling (e.g., `not_configured`, `offline`).
5. **Aesthetics & Navigation:** 1280x800 optimized, controller-friendly, dark tactical glass theme.
