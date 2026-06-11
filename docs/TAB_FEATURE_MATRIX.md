# NEURODECK Tab Feature Matrix

This matrix tracks the migration and production-readiness status of all NEURODECK tabs/screens. 

## Definition of Done (Production Contract)
To be marked as `✅ Done`, a tab must satisfy:
1. **Typed IPC:** All data fetching uses strictly-typed API calls via `window.neurodeck` (no raw `fetch` in React components).
2. **Real Data:** No mock constants, no fake UI elements, no "placeholder success states".
3. **No Direct Node/FS:** Adheres to Electron `contextIsolation`. File system or OS calls must occur in the Main process.
4. **Resilient UX:** Graceful error handling, handles loading/offline states.
5. **Deck-First Aesthetics:** Controller navigation supported, 1280x800 optimized, cohesive dark tactical glass theme.

## Core Features Migration Matrix

| Feature Tab | Legacy Module | React Component | Typed IPC | Real Data | Controller UX | No Node in Renderer | Status |
|---|---|---|---|---|---|---|---|
| **Diagnostics** | N/A | `DiagnosticsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Chat / Session** | `chat.js` | `SessionsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Canvas / Execution** | `canvas.js` | `CanvasView.tsx` / `ExecutionView.tsx`| ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Settings** | `settings.js` | `SettingsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Terminal** | `terminal.js` | `TerminalView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Plugins** | `plugins.js` | `PluginsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Memory / Cache** | `memory.js` | `MemoryView.tsx` / `CacheView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Git** | `git.js` | `GitView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Graph** | `graph_view.js` | `GraphView.tsx` | ❌ | ❌ | ❌ | ❌ | ⏳ Pending |
| **API Lab** | `api_lab.js` | `ApiLabView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **CLI Maker** | `cli_maker.js` | `CliMakerView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Scheduler** | `scheduler_view.js` | `SchedulerView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Prompt Lab** | `ctrl_prompt.js` | `PromptLabView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Remote Control** | `remote.js` | `RemoteView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |

## Additional Modern Features Matrix
*These features may not have a direct 1:1 legacy equivalent but are part of the new React architecture.*

| Feature Tab | React Component | Typed IPC | Real Data | Controller UX | No Node in Renderer | Status |
|---|---|---|---|---|---|---|
| **Browser** | `BrowserView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Docs** | `DocsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Exports** | `ExportsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Fonts** | `FontManagerView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **IDE** | `IDEView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Maintenance** | `MaintenanceView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Models** | `ModelsView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Orchestrator** | `OrchestratorView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Project** | `ProjectView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Recovery** | `RecoveryView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Security** | `SecurityView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Share** | `ShareView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **SSH** | `SSHView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Themes** | `ThemesView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Torrent** | `TorrentView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Tunnel** | `TunnelView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |
| **Workspace** | `WorkspaceView.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ Done |

---

**Next Immediate Steps:**
- Complete the `verify-*.ts` scripts to enforce the production gate.
- Select the next high-priority tab (e.g., `SessionsView.tsx` or `SettingsView.tsx`) to migrate to the `✅ Done` state.
