# NEURODECK AAAA Screen Inventory

> Generated: 2026-06-17
> Source: `scripts/ui/screen-inventory-audit.js` + manual enrichment
> Total screens: 37 feature views + shell + onboarding + modal systems

## Legend

| Column | Meaning |
|---|---|
| Route | Nav/route ID rendered by `App.tsx` |
| Component | Primary exported component |
| File | Relative path from repo root |
| Parent Layout | `NeurodeckShell` for all feature views |
| Lines | Approximate file size |
| Quality | Pre-redesign assessment (TBD = assessed in Phase 3) |
| Refactor | Yes/No/Maybe based on size/age/audit history |
| Risk | Low/Medium/High based on file size and IPC surface |

## Feature Views

| Route | Component | File | Lines | Quality | Refactor | Risk |
|---|---|---|---|---|---|---|
| academy | `AcademyView` | `frontend/src/react/features/academy/AcademyView.tsx` | 184 | TBD | Maybe | Low |
| agent | `AgentsView` | `frontend/src/react/features/agents/AgentsView.tsx` | 106 | TBD | Maybe | Low |
| api-lab | `ApiLabView` | `frontend/src/react/features/api-lab/ApiLabView.tsx` | 194 | TBD | Maybe | Low |
| browser | `BrowserView` | `frontend/src/react/features/browser/BrowserView.tsx` | 377 | TBD | Yes | High |
| cache | `CacheView` | `frontend/src/react/features/cache/CacheView.tsx` | 89 | TBD | Maybe | Low |
| canvas | `CanvasView` | `frontend/src/react/features/canvas/CanvasView.tsx` | 236 | TBD | Maybe | Medium |
| cli-maker | `CliMakerView` | `frontend/src/react/features/cli-maker/CliMakerView.tsx` | 956 | TBD | Yes | High |
| diagnostics | `DiagnosticsView` | `frontend/src/react/features/diagnostics/DiagnosticsView.tsx` | 589 | TBD | Yes | Medium |
| docs | `DocsView` | `frontend/src/react/features/docs/DocsView.tsx` | 280 | TBD | Maybe | Low |
| execution | `ExecutionView` | `frontend/src/react/features/execution/ExecutionView.tsx` | 141 | TBD | Maybe | Low |
| exports | `ExportsView` | `frontend/src/react/features/exports/ExportsView.tsx` | 125 | TBD | Maybe | Low |
| fonts | `FontManagerView` | `frontend/src/react/features/fonts/FontManagerView.tsx` | 170 | TBD | Maybe | Low |
| git | `GitView` | `frontend/src/react/features/git/GitView.tsx` | 451 | TBD | Yes | Medium |
| graph | `GraphView` | `frontend/src/react/features/graph/GraphView.tsx` | 519 | TBD | Yes | Medium |
| ide | `IDEView` | `frontend/src/react/features/ide/IDEView.tsx` | 1039 | TBD | Yes | High |
| maintenance | `MaintenanceView` | `frontend/src/react/features/maintenance/MaintenanceView.tsx` | 150 | TBD | Maybe | Low |
| mcp | `MCPView` | `frontend/src/react/features/mcp/MCPView.tsx` | 447 | TBD | Yes | Medium |
| memory | `MemoryView` | `frontend/src/react/features/memory/MemoryView.tsx` | 601 | TBD | Yes | Medium |
| models | `ModelsView` | `frontend/src/react/features/models/ModelsView.tsx` | 262 | TBD | Maybe | Low |
| orchestrator | `OrchestratorView` | `frontend/src/react/features/orchestrator/OrchestratorView.tsx` | 585 | TBD | Yes | Medium |
| plugins | `PluginsView` | `frontend/src/react/features/plugins/PluginsView.tsx` | 916 | TBD | Yes | High |
| project | `ProjectView` | `frontend/src/react/features/project/ProjectView.tsx` | 227 | TBD | Maybe | Low |
| prompt-lab | `PromptLabView` | `frontend/src/react/features/prompt-lab/PromptLabView.tsx` | 657 | TBD | Yes | Medium |
| recovery | `RecoveryView` | `frontend/src/react/features/recovery/RecoveryView.tsx` | 220 | TBD | Maybe | Low |
| remote | `RemoteView` | `frontend/src/react/features/remote/RemoteView.tsx` | 384 | TBD | Maybe | Medium |
| scheduler | `SchedulerView` | `frontend/src/react/features/scheduler/SchedulerView.tsx` | 220 | TBD | Maybe | Low |
| security | `SecurityView` | `frontend/src/react/features/security/SecurityView.tsx` | 496 | TBD | Yes | Medium |
| sessions | `SessionsView` | `frontend/src/react/features/sessions/SessionsView.tsx` | 116 | TBD | Maybe | Low |
| settings | `SettingsView` | `frontend/src/react/features/settings/SettingsView.tsx` | 1528 | TBD | Yes | High |
| share | `ShareView` | `frontend/src/react/features/share/ShareView.tsx` | 767 | TBD | Yes | High |
| ssh | `SSHView` | `frontend/src/react/features/ssh/SSHView.tsx` | 226 | TBD | Maybe | Low |
| sync | `SyncView` | `frontend/src/react/features/sync/SyncView.tsx` | 424 | TBD | Yes | Medium |
| terminal | `TerminalView` | `frontend/src/react/features/terminal/TerminalView.tsx` | 2 | TBD | Maybe | Low |
| themes | `ThemesView` | `frontend/src/react/features/themes/ThemesView.tsx` | 515 | TBD | Yes | Medium |
| torrent | `TorrentView` | `frontend/src/react/features/torrent/TorrentView.tsx` | 774 | TBD | Yes | High |
| tunnel | `TunnelView` | `frontend/src/react/features/tunnel/TunnelView.tsx` | 154 | TBD | Maybe | Low |
| workspace | `WorkspaceView` | `frontend/src/react/features/workspace/WorkspaceView.tsx` | 167 | TBD | Maybe | Low |

## Shell & Layout Components

| Route/Screen | Component | File | Purpose | Risk |
|---|---|---|---|---|
| App shell | `NeurodeckShell` | `frontend/src/react/components/layout/NeurodeckShell.tsx` | Root layout: title bar, sidebars, view container | High |
| Title bar | `TitleBar` | `frontend/src/react/components/layout/TitleBar.tsx` | Window chrome, drag region | Medium |
| Primary sidebar | `PrimarySidebar` | `frontend/src/react/components/layout/PrimarySidebar.tsx` | Main navigation rail | Medium |
| Secondary rail | `SecondaryRail` | `frontend/src/react/components/layout/SecondaryRail.tsx` | Context sidebar | Medium |
| Controller hint bar | `ControllerHintBar` | `frontend/src/react/components/layout/ControllerHintBar.tsx` | Deck button hints | Low |
| Error boundary | `ViewErrorBoundary` | `frontend/src/react/components/system/ViewErrorBoundary.tsx` | Per-view error boundary | Low |
| Global error boundary | `ErrorBoundary` | `frontend/src/react/components/system/ErrorBoundary.tsx` | Top-level error boundary | Low |

## Modal / Overlay / Command Systems

| Screen | Component | File | Purpose | Risk |
|---|---|---|---|---|
| Command palette | `CommandPalette` | `frontend/src/react/components/command/CommandPalette.tsx` | Global command/search | Medium |
| Onboarding | `OnboardingModal` + steps | `frontend/src/react/components/onboarding/` | First-run wizard | Medium |
| Modal system | `Modal` / `DSModal` | `primitives/Modal.tsx`, `design-system/components/feedback/Modal.tsx` | Modal wrapper | Low |
| Toast system | `Toast` / `DSToast` | `primitives/Toast.tsx`, `design-system/components/feedback/Toast.tsx` | Toast notifications | Low |
| Confirm dialog | `ConfirmDialog` | `design-system/components/feedback/ConfirmDialog.tsx` | Confirmation modal | Low |

## State, IPC, and Data Dependencies (High-Level)

Most feature views consume one or more of:
- `useNeuroDeckState()` — global app state
- `bridgeAdapter` — Rust sidecar HTTP/WebSocket bridge
- `ControllerContext` — gamepad/keyboard navigation
- `ThemeProvider` — active theme and DS tokens

Per-screen IPC/state mapping will be produced in `ipc-screen-map.md` during Phase 3.

## Accessibility & Controller Status (Pre-Assessment)

| Concern | Status |
|---|---|
| All views have `data-controller-screen` | ✅ 38 screens registered |
| Sidebar nav items have `aria-current="page"` | ✅ Verified in June 15 audit |
| `IconButton` requires `aria-label` | ✅ Fixed in June 15 audit |
| Modal focus trap | ✅ Delegated to DS modal |
| Reduced motion support | ✅ Verified in `tokens.css` |
| Per-screen loading/empty/error states | TBD — Phase 3 assessment |
| Per-screen keyboard/controller navigation | TBD — Phase 3 assessment |

## Refactor Priority Queue

### High Risk / High Impact (refactor first)
1. `SettingsView` — largest settings surface
2. `CliMakerView` — very large, complex
3. `PluginsView` — very large
4. `BrowserView` — large browser integration surface
5. `IDEView` — large IDE integration
6. `ShareView` / `TorrentView` — large network features

### Medium Risk
7. `MemoryView`, `SyncView`, `ThemesView`, `GraphView`, `OrchestratorView`, `MCPView`, `SecurityView`, `PromptLabView`, `DiagnosticsView`, `GitView`

### Low Risk / Smaller Views
- Remaining 17 smaller views

## Notes

- `TerminalView.tsx` is only 2 lines; the real terminal UI is in `TerminalScreen.tsx`.
- The June 15 E2E audit surveyed 28 features and found no static inline color styles.
- Legacy `_legacy/` directories are intentionally excluded from TypeScript and should not be imported.
