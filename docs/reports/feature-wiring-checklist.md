# NEURODECK Feature Wiring Checklist

> Generated: 2026-06-17 · Updated: 2026-06-19 (frontend offline/legacy fallback audit, Academy screen added)  
> Scope: all `docs/wireframes`, `docs/epics`, React feature views (`src/renderer/features`), and Rust bridge commands (`src-tauri/src/commands/mod.rs`).  
> Classification: **Wired** = real UI + real backend (or no backend needed and UI complete); **Partial** = UI or backend exists but has mock data, fallback, missing sub-features, or is embedded/unrouted; **Stubbed** = no meaningful implementation.

---

## Executive Summary

| Layer | Wired | Partial | Stubbed | Notes |
|-------|-------|---------|---------|-------|
| Wireframes (78 screens) | 41 | 37 | 0 | Global Search and Notification Center are now wired; VPN mock profiles removed; Academy (#78) added 2026-06-19 — was missing from the original 77-screen catalog entirely. |
| Epics (7) | 5 | 2 | 0 | Partial epics are blocked by marketplace or embedded sub-screens. |
| Bridge commands | ~395 | ~15 | 2 safe no-ops | 412 registered commands; only `models.cancel` and `settings.validate` are intentional no-ops in `electron/preload.js`. |

### Key Findings
- **No `todo!()` / `unimplemented!()` markers** were found in `src-tauri/src/**/*.rs`.
- **Two accepted stubs** in `electron/preload.js`: `models.cancel` (no sidecar cancel endpoint) and `settings.validate` (validation happens on `settings:set`).
- **Global Search** is now wired to the `universal_search` backend command and returns sessions, memory, and projects.
- **Notification Center** now listens to real bridge events (transfers, plugin reloads, workflows, downloads, etc.) and shows a dismissible list.
- **VPN / Networking** no longer uses `MOCK_PROFILES`; profiles are persisted in `localStorage` until a dedicated backend is added.
- **2026-06-19 documentation debt**: `CLAUDE.md`'s "Frontend Module Split" section (the `chat.js`/`agent.js`/`memory.js`/... ES-module table) and "The One Big File Problem" describe a vanilla-JS `main.js` architecture that no longer exists — the frontend is fully React under `src/renderer/`, routed by `AppViewRouter.tsx`. That section of CLAUDE.md should be treated as historical, not current, until rewritten.

---

## Frontend Offline/Legacy Fallback Audit (2026-06-19, corrected)

Grepped `src/renderer/services/bridge/domains/*.ts` and view components for offline-fallback / legacy-API-fallback patterns and verified each against the real backend, the actual Electron preload surface, **and the IPC handler registry** — an initial pass of this audit incorrectly assumed `window.neurodeck.*` was dead legacy code (a grep for the literal `window.neurodeck =` assignment found nothing); it is in fact live, exposed via `contextBridge.exposeInMainWorld('neurodeck', {...})` in `electron/preload.js:261`, a *second*, parallel transport (Electron IPC → main process → sidecar HTTP) alongside the direct `bridgeInvoke` HTTP path. Each `window.neurodeck.X.Y()` call only works if a matching `ipcMain` handler is registered for that exact channel in `electron/ipc-handlers.js` — Electron throws "No handler registered" otherwise, which is not the same as a soft fallback.

| Pattern | Location | Verdict | Evidence |
|---|---|---|---|
| Offline chat draft + provider-health fallback | `ai.ts:7-48,81-83` | ✅ Acceptable — real backend exists (`send_command`, provider health probes); only activates when the bridge is genuinely unreachable. | Relates to row #10 Workspace Chat (Wired) and #6 Dashboard (Wired). |
| `window.electronAPI`-gated browser commands | `browser.ts` (navigate/back/forward/bookmarks/history/reader-mode/ad-blocker) | ✅ Acceptable — `electronAPI` is genuinely exposed via `contextBridge.exposeInMainWorld('electronAPI', ...)` in `electron/preload.js:158`; the empty-result branch only fires outside Electron. | Relates to row #38 Browser / Web Tools (Wired). |
| `window.neurodeck.ide.*` IPC relay | `ide.ts:28-113` → `electron/preload.js:325-344` → `electron/ipc-handlers.js` | ✅ Live, not dead — every channel (`ide:detect-project`, `ide:run-command`, `ide:cancel-command`, `ide:get-command-history`, `ide:get-predictions`, `ide:apply-snippet`) has a registered `guard(IPC.IDE_*, ...)` handler. This is the real, primary path; `ide.ts`'s empty-array returns only fire outside Electron. | Relates to row #28 File Manager (Partial for an unrelated reason — no dedicated File Manager wireframe, not this). |
| `window.neurodeck.memory.*` IPC relay | `memory.ts` → `electron/preload.js:303-307` → `electron/ipc-handlers.js:167-177` | ⚠️ **Real bug found and fixed** — `memory:search`/`memory:write` have registered handlers that relay to the real sidecar (`memory_list`, `memory_add_fact`), but **`memory:delete` had no handler registered anywhere in `ipc-handlers.js`**. Since `window.neurodeck.memory` is always truthy in Electron, `memory.ts`'s `delete()` *always* took this branch and would throw on every call — deleting a memory record via the UI was broken. Fixed 2026-06-19: `delete()` now calls `bridgeInvoke("memory_delete", ...)` directly, matching the pattern already used by `pin`/`clear`/`exportAll` in the same file. | Row #26 Memory Context Manager — was incorrectly marked fully Wired; `delete` is now actually fixed rather than just assumed fine. |
| `window.neurodeck.models.runPrompt` IPC relay | `ai.ts:86-112,199-200` → `electron/preload.js:288-293` → `electron/ipc-handlers.js:133` (`MODELS_RUN_PROMPT`) | ✅ Live and registered — real relay path, not dead code. | Relates to row #10 Workspace Chat (Wired). |
| `transfer_profiles` → `localStorage` fallback | `transfer.ts:10-69` | ✅ Acceptable — `transfer_profiles` is a real, implemented Rust command; the localStorage path is defensive (e.g. older sidecar build). | Relates to row #43 Sync / File Transfer (Wired) — status confirmed correct. |
| Academy Portfolio → `localStorage` fallback | `PortfolioView.tsx:85-91` (`neurodeck_academy_portfolio_local`) | ✅ Acceptable — real backend commands exist: `academy_get_progress`, `academy_save_portfolio_entry`, `academy_list_portfolio` (`src-tauri/src/commands/mod.rs:9965-9990`). | New row #78 Academy added below — classified **Wired**. |

**Conclusion:** one genuine wiring bug was found and fixed (`memory.delete` via an unregistered IPC channel). Every other `window.neurodeck.*` path checked is a live, registered second transport (Electron IPC relay), not dead legacy code — the lesson being that "no plain assignment found" is insufficient evidence of dead code when `contextBridge.exposeInMainWorld` is in play; always check the IPC handler registry, not just the preload exposure, before calling a relay path "fine."

---

## A — Startup

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 1 | Boot Screen | Exists | `index.html` boot loader | Wired | N/A | Wired | Real boot DOM exists. |
| 2 | Splash Loading | Exists | `index.html` #boot-loader | Wired | N/A | Wired | Splash DOM exists. |
| 3 | Onboarding Wizard | Exists | `OnboardingModal` + `src/renderer/onboarding/*` | Wired | Wired | Wired | Uses `get_personas`, `get_themes`, `save_gemini_api_key`, `start_oauth_flow`, etc. |
| 4 | Quick Start Hub | New | `QuickStartView.tsx` | Wired | N/A | Wired | Static welcome steps; navigates to real views. |

## B — Shell

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 5 | App Shell | Exists | `NeurodeckShell`, `TitleBar`, `PrimarySidebar`, `SecondaryRail` | Wired | N/A | Wired | Layout, nav, controller hints implemented. |
| 6 | Dashboard | New | `DashboardView.tsx` | Wired | Wired | Wired | Calls `neurodeckApi.diagnostics.get()` and `contextStats()`. |
| 7 | Global Search | New | `GlobalSearch.tsx` | Wired | Wired | Wired | Calls `universal_search`; surfaces sessions, memory, and projects. |
| 8 | Command Palette | Exists | `CommandPalette.tsx` | Wired | N/A | Wired | Dispatches real view changes; static command list is UI-only by design. |
| 9 | Notification Center | Exists | Inline panel in `AppOverlays.tsx` | Wired | Wired | Wired | Subscribes to bridge events (transfers, plugin reloads, workflows, downloads, etc.) and shows dismissible list. |

## C — Workspace

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 10 | Workspace Chat | Exists | `WorkspaceView.tsx` | Wired | Wired | Wired | Full chat + RAG injection via `send_command`. |
| 11 | Focus Mode | New | `FocusModeOverlay.tsx` | Partial | N/A | Partial | Overlay exists but not routed/wired to global focus state. |
| 12 | Split Workspace | New | `SplitWorkspaceLayout.tsx` | Partial | N/A | Partial | Component exists but is not routed in `AppViewRouter.tsx`. |
| 13 | Prompt Library | Partial | `PromptLibraryView.tsx` | Wired | Wired | Wired | Calls `promptdrive_list_saved_prompts`, `promptdrive_save_prompt`, import/export. |
| 14 | Prompt Builder | Partial | `PromptBuilderView.tsx` | Wired | Wired | Wired | Live preview + `promptdrive_save_prompt`; sends to chat. |

## D — Agents

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 15 | Agent Manager | Exists | `AgentsView.tsx` | Wired | Wired | Wired | Lists agents, starts/stops, uses `list_agents`, `start_agent`, `stop_agent`. |
| 16 | Agent Builder | New | `AgentBuilderDrawer.tsx` | Wired | N/A | Wired | Drawer used by `AgentsView`; creates `AgentDefinition`. |
| 17 | Agent Run Detail | New | `AgentRunDetail.tsx` | Wired | Wired | Wired | Drawer listens to bridge `agent_step` events. |
| 18 | Persona Manager | New | `PersonaManagerView.tsx` | Partial | Wired | Partial | Calls optional `getPersonas`/`setPersona`; falls back to `FALLBACK_PERSONAS`. |
| 19 | Automation / Task Runner | Exists | `OrchestratorView.tsx` | Wired | Wired | Wired | Uses workflow + orchestrator commands. |

## E — Models

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 20 | Model Manager | Exists | `ModelsView.tsx` | Wired | Wired | Wired | Lists models, probes, compatibility. |
| 21 | Local Model Import | New | `LocalModelImportWizard.tsx` | Partial | Partial | Partial | Embedded in `ModelsView`; limited backend command surface. |
| 22 | Provider Manager | Partial | `ProviderManagerView.tsx` | Wired | Wired | Wired | Calls `list_provider_runtimes`, `get_provider_health`, `test_connection`. |
| 23 | API Key Vault | Partial | `ApiKeyVaultView.tsx` | Wired | Wired | Wired | Calls `save_gemini_api_key`, `get_gemini_api_key`, etc. |
| 24 | Runtime Settings | Partial | Embedded in `SettingsView.tsx` | Partial | Partial | Partial | Some settings wired (`set_config`); runtime-specific knobs incomplete. |
| 25 | Model Marketplace | New | `ModelCatalogPanel.tsx` | Partial | Partial | Partial | Panel exists; marketplace backend/catalog not fully implemented. |

## F — Memory

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 26 | Memory Context Manager | Exists | `MemoryView.tsx` | Wired | Wired | Wired | `memory_search`, `memory_add_fact`, `memory_delete`, etc. |
| 27 | Project Context Manager | Exists | `ProjectView.tsx` | Wired | Wired | Wired | `create_project`, `list_projects`, `get_project_memory`, etc. |
| 28 | File Manager | Partial | `IDEView.tsx` file tree | Partial | Wired | Partial | Workspace file commands exist, but dedicated File Manager wireframe not implemented. |
| 29 | Memory Detail | New | `MemoryDetailDrawer.tsx` | Partial | Wired | Partial | Drawer embedded in `MemoryView`; reads from state. |
| 30 | Context Indexing | New | `ContextIndexingPanel.tsx` | Partial | Wired | Partial | Calls `index_directory`; panel is embedded/limited. |

## G — Sessions

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 31 | Session Browser | Exists | `SessionsView.tsx` | Wired | Wired | Wired | `list_sessions`, `load_session_by_id`, `delete_session`, etc. |
| 32 | Session Detail | New | `SessionDetailDrawer.tsx` | Partial | Wired | Partial | Drawer embedded in `SessionsView`. |
| 33 | Export Manager | Exists | `ExportsView.tsx` | Wired | Wired | Wired | `export_session_markdown`, `export_session_content`, support bundle. |
| 34 | Backup & Restore | New | `BackupRestoreView.tsx` | Partial | Partial | Partial | View exists; dedicated backup/restore commands are limited (`memory_backup_auto`, `memory_restore_backup`). |
| 35 | Archive Manager | Exists | `ArchiveView.tsx` | Wired | Wired | Wired | Archives sessions via session commands. |

## H — Network

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 36 | Terminal | Exists | `TerminalView.tsx` / `TerminalScreen.tsx` | Wired | Wired | Wired | `pty_spawn`, `pty_write`, `pty_kill`, SSH sessions. |
| 37 | Terminal Session Manager | Partial | `TerminalSessionManagerOverlay.tsx` | Partial | Wired | Partial | Overlay exists; session management mostly in `TerminalScreen`. |
| 38 | Browser / Web Tools | Exists | `BrowserView.tsx` | Wired | Wired | Wired | WebContentsView + `browser_open_session`, `browser_save_to_memory`, etc. |
| 39 | Browser Tab Manager | Partial | Embedded in `BrowserView.tsx` | Partial | Wired | Partial | Tabs managed inside BrowserView; no standalone manager. |
| 40 | Download Manager | New | `DownloadManager.tsx` | Partial | N/A | Partial | Component exists but embedded; no backend download-tracking commands. |
| 41 | VPN / Networking | New | `VPNView.tsx` | Partial | Partial | Partial | Calls optional `neurodeckApi.network` methods; profiles persisted in `localStorage` instead of mocked. |
| 42 | Network Profiles | New | `NetworkProfileDrawer.tsx` | Partial | Stubbed | Partial | Drawer exists; no VPN profile CRUD backend. |
| 43 | Sync / File Transfer | Exists | `SyncView.tsx` + `ShareView.tsx` | Wired | Wired | Wired | `start_file_transfer`, `respond_to_transfer`, `sync_now`, etc. |
| 44 | Device Pairing | New | `DevicePairingModal.tsx` | Partial | Partial | Partial | Modal exists; pairing uses transfer group code. |
| 45 | Transfer Detail | New | `TransferDetailDrawer.tsx` | Partial | Wired | Partial | Drawer embedded in `SyncView` / `ShareView`. |

## I — Customization

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 46 | Plugin Manager | Exists | `PluginsView.tsx` | Wired | Wired | Wired | `list_plugins`, `toggle_plugin`, `install_plugin`, `uninstall_plugin`. |
| 47 | Plugin Detail | Partial | Embedded in `PluginsView.tsx` | Partial | Wired | Partial | Detail panel exists; no standalone route. |
| 48 | Plugin Permissions | New | `PluginPermissionsView.tsx` | Partial | Wired | Partial | View routed; uses permission-profile commands. |
| 49 | Lua Automation | New | `LuaScriptsView.tsx` | Partial | Wired | Partial | View routed; calls `run_lua`, `list_lua_commands`. |
| 50 | Theme Manager | Exists | `ThemesView.tsx` | Wired | Wired | Wired | `get_themes`, `set_theme`, `save_custom_themes`. |
| 51 | Theme Editor | New | `ThemeEditorDrawer.tsx` | Partial | Wired | Partial | Drawer embedded in `ThemesView`. |
| 52 | Wallpaper Manager | Partial | `LiveWallpaperPanel.tsx` + `wallpaperManager.ts` | Partial | N/A | Partial | UI for selecting wallpapers; live rendering in `CanvasWallpaperRenderer.tsx`. |

## J — Settings

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 53 | Settings | Exists | `SettingsView.tsx` | Wired | Wired | Wired | `get_config`, `set_config`, provider/model/key settings. |
| 54 | Privacy Center | Partial | `PrivacySettingsPanel.tsx` | Partial | Wired | Partial | Panel inside Settings; `set_memory_privacy`, `unlock_sealed_records`. |
| 55 | Security Center | Exists | `SecurityView.tsx` | Wired | Wired | Wired | Rate-limit info, sandbox, `security_report`. |
| 56 | Permissions Manager | New | `PermissionsView.tsx` | Partial | Wired | Partial | Routed view; uses permission-profile commands. |
| 57 | Controller Profile Editor | New | `ControllerProfileView.tsx` | Partial | N/A | Partial | Routed view; likely local state only. |
| 58 | Keyboard Shortcuts | Partial | Inline overlay in `AppOverlays.tsx` | Partial | N/A | Partial | Static shortcut reference; no rebinding persistence. |
| 59 | Storage Manager | Partial | `StorageView.tsx` | Partial | Partial | Partial | View exists; storage metrics may be local/limited. |
| 60 | Update Center | New | `UpdateCenterView.tsx` | Partial | N/A | Partial | Routed view; static/local update UI. |
| 61 | About / System Info | New | `AboutView.tsx` | Wired | Wired | Wired | Calls `get_system_info`, `get_version`. |

## K — Diagnostics

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 62 | Diagnostics Health | Exists | `DiagnosticsView.tsx` | Wired | Wired | Wired | Real probes + connection matrix. |
| 63 | Telemetry Dashboard | New | `TelemetryDashboardTab.tsx` | Partial | Wired | Partial | Tab embedded in `DiagnosticsView`; uses telemetry data. |
| 64 | Logs Viewer | New | `LogsView.tsx` | Partial | Partial | Partial | View routed; log streaming backend not clearly wired. |
| 65 | Error Recovery | Exists | `RecoveryView.tsx` | Wired | Wired | Wired | `evaluate_recovery`, `record_recovery_event`, `reset_session`. |
| 66 | Safe Mode | New | `SafeModeScreen.tsx` | Partial | N/A | Partial | Routed screen; mostly informational. |
| 67 | UI Rollback | New | `UIRollbackView.tsx` | Wired | Wired | Wired | Calls rollback scripts/checkpoints. |

## L — Help

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 68 | Viewfinder Tutorial | New | `OnboardingViewfinder` / `TutorialOverlay` | Partial | N/A | Partial | Overlay exists; static walkthrough. |
| 69 | Help / Docs Hub | Exists | `DocsView.tsx` | Wired | Wired | Wired | Loads docs and `get_default_docs_path`. |
| 70 | Feature Tour Library | New | `FeatureTourView.tsx` | Partial | N/A | Partial | Static tour list in localStorage. |
| 71 | Release Notes | New | `ReleaseNotesView.tsx` | Wired | N/A | Wired | Displays release notes (static asset). |

## M — Developer

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 72 | IPC Connector Map | New | `IPCConnectorMapView.tsx` | Wired | Wired | Wired | Reads connection matrix and IPC channel list. |
| 73 | Developer Console | New | `DevConsoleView.tsx` | Wired | Wired | Wired | Can invoke arbitrary bridge commands. |
| 74 | Feature Flags | New | `FeatureFlagsView.tsx` | Partial | N/A | Partial | LocalStorage-only toggles; no server-side gating. |
| 75 | Data Connector Settings | New | `DataConnectorsView.tsx` | Partial | Partial | Partial | View exists; data-connector backend commands not found. |

## N — Brand

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 76 | Brand Assets | New | `BrandAssetsView.tsx` | Wired | N/A | Wired | Static brand asset library; functional UI. |
| 77 | Release Checklist | New | `ReleaseChecklistView.tsx` | Partial | N/A | Partial | Static checklist UI; not wired to CI gate status. |

## O — Academy (added 2026-06-19; missing from original 77-screen catalog)

| # | Screen | Doc Status | View / Component | Frontend | Backend | Overall | Evidence |
|---|--------|------------|------------------|----------|---------|---------|----------|
| 78 | Academy / Learning Portfolio | Missing from `docs/wireframes/_index.md` | `AcademyView.tsx` + `PortfolioView.tsx` | Wired | Wired | Wired | `academy_get_progress`, `academy_save_progress`, `academy_save_portfolio_entry`, `academy_list_portfolio`, `academy_complete_lab`, `academy_mentor_query` all call real `crate::academy::*` functions; `localStorage` fallback in `PortfolioView.tsx` is defensive only, see fallback audit above. |


---

## Epic Wiring Checklist

| Epic | Title | Frontend | Backend | Overall | Evidence |
|------|-------|----------|---------|---------|----------|
| EPIC-001 | Onboarding Wizard | Wired | Wired | Wired | 11-step wizard + real auth/persona/theme/diagnostic commands. |
| EPIC-002 | Repository Restructuring | Wired | N/A | Wired | Duplicate cleanup done; `cargo check` / build clean. |
| EPIC-003 | Project Knowledge Spaces & Universal Search | Wired | Wired | Wired | Project/search backend wired; Global Search UI now calls `universal_search`. |
| EPIC-004 | Fallow Quality & Static Analysis | Wired | N/A | Wired | Dead-code, duplicate, and dependency gates pass. |
| EPIC-005 | Trust, Provenance & Citations | Wired | Wired | Partial | `rag_sources` event + browser save-to-memory wired; citation UX is complete but not independently tested. |
| EPIC-006 | Security Hardening & Rate Limiting | Wired | Wired | Wired | Token bucket, error redaction, CSP, sanitized markdown all implemented. |
| EPIC-007 | Hermes Lua Extension Framework | Wired | Wired | Wired | `plugins/hermes.lua` loads; plugin install/uninstall/toggle commands real. |

---

## Backend Command Audit

- **Registered bridge commands:** 412 (extracted from `src-tauri/src/commands/mod.rs`).
- **Intentional no-ops / safe stubs:**
  - `electron/preload.js:251` — `models.cancel: () => Promise.resolve({ ok: true })` — no sidecar cancel endpoint.
  - `electron/preload.js:281` — `settings.validate: () => Promise.resolve({ valid: true })` — validation occurs on `settings:set`.
- **`todo!()` / `unimplemented!()` markers:** 0 found in `src-tauri/src/**/*.rs`.
- **Command groups that are largely real but have limited/partial coverage:**
  - VPN / network (no dedicated profile CRUD commands).
  - Local model import / marketplace (no catalog import backend).
  - Logs viewer (no streaming log command).
  - Data connectors (no connector CRUD commands).
  - Download manager (no download-tracking commands).

---

## Contradictions / Disputed Status

| Source A | Source B | Resolution |
|----------|----------|------------|
| `docs/TAB_FEATURE_MATRIX.md` marks almost every tab `✅ Done`. | `docs/wireframes/_index.md` counts 14 Partial + 37 New (this checklist finds 39 Partial + 0 Stubbed). | Matrix is over-optimistic; this checklist uses source-level evidence. |
| `docs/wireframes/_index.md` lists #06 Dashboard as `New`. | `DashboardView.tsx` exists and calls real diagnostics. | Reclassified as **Wired** in this checklist. |
| `docs/wireframes/_index.md` lists #13 Prompt Library / #14 Prompt Builder as `Partial`. | Views call real `promptdrive_*` commands. | Reclassified as **Wired**. |
| `docs/wireframes/_index.md` lists #16 Agent Builder / #17 Agent Run Detail / #18 Persona Manager as `New`. | Components exist and are used; Persona Manager has fallback personas. | Agent Builder/Run Detail = **Wired**; Persona Manager = **Partial**. |

---

## Top Priority Stubs / Partial Gaps

1. **Model Marketplace** — implement catalog backend or integrate with `hf_search_models`.
2. **Logs Viewer** — add backend log-tail / log-list command.
3. **Data Connector Settings** — implement connector CRUD backend.
4. **Release Checklist** — wire to `scripts/verify/` gate results.
5. **VPN / Networking backend** — add real VPN profile CRUD commands (UI now uses `localStorage`).

---

## Methodology

1. Parsed `docs/wireframes/_index.md` for the 77-screen catalog and doc statuses.
2. Mapped each wireframe to a route/component via `src/renderer/app/AppViewRouter.tsx` and `src/renderer/types/seed.ts`.
3. Scanned `src/renderer/features/**/*` for `neurodeckApi`, `bridgeAdapter`, `window.neurodeck`, `MOCK_*`, `STATIC_*`, `FALLBACK_*`, and `PlaceholderView`.
4. Extracted all 412 command names from `src-tauri/src/commands/mod.rs`.
5. Grepped `src-tauri/src/**/*.rs` for `todo!()`, `unimplemented!()`, `// stub`, and intentional no-ops.
6. Cross-referenced `docs/reports/backend/backend-inventory.json`, `backend-readiness-report.json`, `mock-data-findings.json`, and `fallow-dead-code.json`.
7. Classified each item by actual source wiring rather than doc status alone.

### 2026-06-19 re-verification pass
8. Re-grepped `src/renderer/services/bridge/domains/*.ts` for offline/legacy-fallback patterns not caught by step 3 (`ai.ts`, `browser.ts`, `ide.ts`, `memory.ts`, `transfer.ts`, `PortfolioView.tsx`); confirmed each against the live `electron/preload.js` surface and `src-tauri/src/commands/mod.rs` rather than assuming a fallback branch implies missing wiring — see the new "Frontend Offline/Legacy Fallback Audit" section above.
9. **Correction**: an initial pass of this step wrongly concluded `window.neurodeck` was dead/unassigned (grepped only for a literal `window.neurodeck =` assignment, which doesn't exist because it's exposed via `contextBridge.exposeInMainWorld('neurodeck', {...})` in `electron/preload.js:261`). Re-checked properly by tracing each `window.neurodeck.X.Y()` channel through `electron/ipc-registry.js` → `electron/ipc-handlers.js` to confirm a handler is actually registered. This found one real bug (`memory:delete` had no handler — see audit table above, now fixed) and confirmed every other channel checked (`ide.*`, `models.runPrompt`, `memory.search`/`write`) is live and correctly relays to the real sidecar commands.
10. Found Academy/Portfolio (`AcademyView.tsx` / `PortfolioView.tsx`, routed as `academy` in `AppViewRouter.tsx`) was entirely absent from the original 77-screen catalog; added as row #78, classified Wired after confirming its backend commands are real.
