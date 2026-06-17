# NEURODECK Screen Inventory, Navigation & Alignment Audit

> Generated: 2026-06-17T13:18:38.963Z
> Command: `node scripts/ui/screen-inventory-audit.js`

## 1. View Inventory

| Feature ID | Component | File | Controller Screen | Lines |
|---|---|---|---|---|
| academy | `AcademyView` | frontend/src/react/features/academy/AcademyView.tsx | — | 184 |
| agents | `AgentsView` | frontend/src/react/features/agents/AgentsView.tsx | — | 106 |
| api-lab | `ApiLabView` | frontend/src/react/features/api-lab/ApiLabView.tsx | — | 194 |
| browser | `BrowserView` | frontend/src/react/features/browser/BrowserView.tsx | — | 377 |
| cache | `CacheView` | frontend/src/react/features/cache/CacheView.tsx | — | 89 |
| canvas | `CanvasView` | frontend/src/react/features/canvas/CanvasView.tsx | — | 236 |
| cli-maker | `CliMakerView` | frontend/src/react/features/cli-maker/CliMakerView.tsx | — | 956 |
| diagnostics | `DiagnosticsView` | frontend/src/react/features/diagnostics/DiagnosticsView.tsx | — | 589 |
| docs | `DocsView` | frontend/src/react/features/docs/DocsView.tsx | — | 280 |
| execution | `ExecutionView` | frontend/src/react/features/execution/ExecutionView.tsx | — | 141 |
| exports | `ExportsView` | frontend/src/react/features/exports/ExportsView.tsx | — | 125 |
| fonts | `FontManagerView` | frontend/src/react/features/fonts/FontManagerView.tsx | — | 170 |
| git | `GitView` | frontend/src/react/features/git/GitView.tsx | — | 451 |
| graph | `GraphView` | frontend/src/react/features/graph/GraphView.tsx | — | 519 |
| ide | `IDEView` | frontend/src/react/features/ide/IDEView.tsx | — | 1039 |
| maintenance | `MaintenanceView` | frontend/src/react/features/maintenance/MaintenanceView.tsx | — | 150 |
| mcp | `MCPView` | frontend/src/react/features/mcp/MCPView.tsx | — | 447 |
| memory | `MemoryView` | frontend/src/react/features/memory/MemoryView.tsx | — | 601 |
| models | `ModelsView` | frontend/src/react/features/models/ModelsView.tsx | — | 262 |
| orchestrator | `OrchestratorView` | frontend/src/react/features/orchestrator/OrchestratorView.tsx | — | 585 |
| plugins | `PluginsView` | frontend/src/react/features/plugins/PluginsView.tsx | — | 916 |
| project | `ProjectView` | frontend/src/react/features/project/ProjectView.tsx | — | 227 |
| prompt-lab | `PromptLabView` | frontend/src/react/features/prompt-lab/PromptLabView.tsx | — | 657 |
| recovery | `RecoveryView` | frontend/src/react/features/recovery/RecoveryView.tsx | — | 220 |
| remote | `RemoteView` | frontend/src/react/features/remote/RemoteView.tsx | — | 384 |
| scheduler | `SchedulerView` | frontend/src/react/features/scheduler/SchedulerView.tsx | — | 220 |
| security | `SecurityView` | frontend/src/react/features/security/SecurityView.tsx | — | 496 |
| sessions | `SessionsView` | frontend/src/react/features/sessions/SessionsView.tsx | — | 116 |
| settings | `SettingsView` | frontend/src/react/features/settings/SettingsView.tsx | — | 1528 |
| share | `ShareView` | frontend/src/react/features/share/ShareView.tsx | — | 767 |
| ssh | `SSHView` | frontend/src/react/features/ssh/SSHView.tsx | — | 226 |
| sync | `SyncView` | frontend/src/react/features/sync/SyncView.tsx | — | 424 |
| terminal | `TerminalView` | frontend/src/react/features/terminal/TerminalView.tsx | — | 2 |
| themes | `ThemesView` | frontend/src/react/features/themes/ThemesView.tsx | — | 515 |
| torrent | `TorrentView` | frontend/src/react/features/torrent/TorrentView.tsx | — | 774 |
| tunnel | `TunnelView` | frontend/src/react/features/tunnel/TunnelView.tsx | — | 154 |
| workspace | `WorkspaceView` | frontend/src/react/features/workspace/WorkspaceView.tsx | — | 167 |

## 2. Sidebar Navigation (navItems)

| ID | Label | Shortcut |
|---|---|---|
| **Automation** | | |
| scheduler | Scheduler |  |
| orchestrator | Orchestrator |  |
| sync | Sync |  |
| **Dev Tools** | | |
| canvas | Canvas |  |
| terminal | Terminal |  |
| ssh | SSH |  |
| ide | IDE |  |
| git | Git |  |
| api-lab | API Lab |  |
| cli-maker | CLI Maker |  |
| **Integrations** | | |
| mcp | MCP Server |  |
| **Knowledge** | | |
| project | Project |  |
| docs | Docs |  |
| prompt-lab | Prompt Lab |  |
| academy | Academy |  |
| graph | Graph |  |
| sessions | Sessions |  |
| **Mission Control** | | |
| chat | Chat |  |
| execution | Execution |  |
| agent | Agent |  |
| memory | Memory |  |
| **Network** | | |
| browser | Browser |  |
| tunnel | Tunnel |  |
| share | Share |  |
| torrent | Torrent |  |
| remote | Remote |  |
| **Security & Ops** | | |
| security | Security |  |
| themes | Themes |  |
| exports | Exports |  |
| maintenance | Maintenance |  |
| recovery | Recovery |  |
| **System** | | |
| models | Models |  |
| cache | Offline |  |
| plugins | Plugins |  |
| diagnostics | Diagnostics |  |
| settings | Settings |  |
| fonts | Fonts |  |

## 3. Route → Component Mappings

`renderView(routeId, <Component />)` calls in `App.tsx`. Some nav IDs have aliases.

| Nav ID(s) | Component | Route ID |
|---|---|---|
| chat / workspace | `WorkspaceView` | chat |
| execution | `ExecutionView` | execution |
| project | `ProjectView` | project |
| models | `ModelsView` | models |
| agent / agents | `AgentsView` | agent |
| memory | `MemoryView` | memory |
| sessions | `SessionsView` | sessions |
| cache | `CacheView` | cache |
| plugins | `PluginsView` | plugins |
| diagnostics | `DiagnosticsView` | diagnostics |
| canvas | `CanvasView` | canvas |
| terminal | `TerminalView` | terminal |
| ssh | `SSHView` | ssh |
| ide | `IDEView` | ide |
| git | `GitView` | git |
| api-lab | `ApiLabView` | api-lab |
| cli-maker | `CliMakerView` | cli-maker |
| browser | `BrowserView` | browser |
| tunnel | `TunnelView` | tunnel |
| share | `ShareView` | share |
| torrent | `TorrentView` | torrent |
| remote | `RemoteView` | remote |
| docs | `DocsView` | docs |
| prompt-lab | `PromptLabView` | prompt-lab |
| academy | `AcademyView` | academy |
| graph | `GraphView` | graph |
| scheduler | `SchedulerView` | scheduler |
| sync | `SyncView` | sync |
| orchestrator | `OrchestratorView` | orchestrator |
| settings | `SettingsView` | settings |
| security | `SecurityView` | security |
| themes | `ThemesView` | themes |
| exports | `ExportsView` | exports |
| maintenance | `MaintenanceView` | maintenance |
| recovery | `RecoveryView` | recovery |
| fonts | `FontManagerView` | fonts |
| mcp | `MCPView` | mcp |

## 4. Shell-Mounted Controller Screens

Values assigned to `data-controller-screen`.

| Controller Screen |
|---|
| `academy` |
| `agent` |
| `api-lab` |
| `app-shell` |
| `browser` |
| `cache` |
| `canvas` |
| `chat` |
| `cli-maker` |
| `diagnostics` |
| `docs` |
| `execution` |
| `exports` |
| `fonts` |
| `git` |
| `graph` |
| `ide` |
| `maintenance` |
| `mcp` |
| `memory` |
| `models` |
| `orchestrator` |
| `plugins` |
| `project` |
| `prompt-lab` |
| `recovery` |
| `remote` |
| `scheduler` |
| `security` |
| `sessions` |
| `settings` |
| `share` |
| `ssh` |
| `sync` |
| `terminal` |
| `themes` |
| `torrent` |
| `tunnel` |

## 5. Controller Actions

Registered actions from `action-registry.ts`.

| Action ID | Title | Category |
|---|---|---|
| OPEN_PROMPT_LIBRARY | Open Prompt Library | prompt |
| OPEN_COMMAND_PALETTE | Open Command Palette | command |
| ACCEPT_SUGGESTION | Accept Suggestion | prompt |
| NEXT_SUGGESTION | Next Suggestion | prompt |
| PREVIOUS_SUGGESTION | Previous Suggestion | prompt |
| EXECUTE_PROMPT | Execute Prompt | prompt |
| SAVE_PROMPT | Save Prompt | prompt |
| COMPLETE_PROMPT | Complete Prompt | prompt |
| START_MACRO_RECORDING | Start/Stop Macro Recording | macro |
| OPEN_AGENT_WHEEL | Open Agent Wheel | agent |
| REGENERATE | Regenerate | prompt |
| BACK | Back / Cancel | navigation |
| NAV_UP | Navigate Up | navigation |
| NAV_DOWN | Navigate Down | navigation |
| NAV_LEFT | Navigate Left | navigation |
| NAV_RIGHT | Navigate Right | navigation |
| IDE_ACCEPT_COMPLETION | Accept Completion | ide |
| IDE_NEXT_COMPLETION | Next Completion | ide |
| IDE_PREV_COMPLETION | Previous Completion | ide |
| IDE_DISMISS_COMPLETION | Dismiss Completion | ide |
| IDE_OPEN_COMMAND_WHEEL | Open Command Wheel | ide |
| IDE_FORMAT_FILE | Format File | ide |
| IDE_RUN_COMMAND | Run Command | ide |
| IDE_NEXT_DIAGNOSTIC | Next Diagnostic | ide |
| IDE_GO_TO_DEFINITION | Go to Definition | ide |
| IDE_TOGGLE_PREDICTIVE_BAR | Toggle Predictive Bar | ide |
| IDE_SAVE_FILE | Save File | ide |
| IDE_PREV_TAB | Previous Tab | ide |
| IDE_NEXT_TAB | Next Tab | ide |
| IDE_OPEN_SNIPPET_WHEEL | Open Snippet Wheel | ide |
| IDE_ACCEPT_SNIPPET | Accept Snippet | ide |
| IDE_NEXT_PLACEHOLDER | Next Snippet Placeholder | ide |
| IDE_PREV_PLACEHOLDER | Previous Snippet Placeholder | ide |
| IDE_CANCEL_COMMAND | Cancel Running Command | ide |
| IDE_CONFIRM_COMMAND | Confirm Command | ide |
| IDE_ENTER_EDIT_MODE | Enter Edit Mode | ide |
| IDE_ENTER_NAVIGATION_MODE | Enter Navigation Mode | ide |

## 6. Duplicate Controller Screens

| Controller Screen | Duplicate Components |
|---|---|
| — | — |

## 7. Nav Items Without Route Mappings

Sidebar items that do not appear in an `App.tsx` render condition.

| Nav ID | Label | Section |
|---|---|---|
| — | — | — |

## 8. Route Mappings Without Sidebar Items

Routes rendered in `App.tsx` that are not in `navItems`.

| Nav ID | Component | Route ID |
|---|---|---|
| — | — | — |

## 9. Alignment Audit Checklist

The following items require a rendered pass at 1280×800. Run `npm run dev`, navigate to each route, and inspect:

- [ ] Top nav bar height and left/right padding are consistent across all views.
- [ ] Side rail width and vertical position do not shift between views.
- [ ] Bottom status bar (if present) is anchored to the same bottom offset.
- [ ] View root uses `overflow: hidden` and has no horizontal scrollbar at 1280×800.
- [ ] Primary panel padding matches the 4px/8px grid (e.g., `p-4`, `gap-4`).
- [ ] No fixed-position chrome overlaps scrollable content.
- [ ] Modals/drawers are centered with identical overlay backgrounds.

## 10. Recommendations

1. If duplicate controller screens exist, consolidate into a single canonical view or rename.
2. If nav items lack route mappings, add the render branch or remove the dead nav item.
3. If route mappings lack nav items, decide if they should be exposed in the sidebar or are modal/overlay-only.
4. Use Chromatic/Playwright visual regression to lock chrome alignment after fixes.
