# NeuroDeck OS — Implementation Checklist

Derived directly from the Epic lists in `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` (§37) and `specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md` (§55). Work **Phase A to completion before starting Phase B**, per the bundle's `START_HERE` instruction — the supplemental phase must extend Phase A's shared services, not duplicate them.

Do not check an epic complete until every story within it satisfies the relevant Story Completion Template/Contract and the Acceptance Gates in §5 below. See `CLAUDE.md` for the non-negotiable rules that apply throughout.

**Repository reconciliation:** 2026-06-24 — Epics 0, 1, 2 (core), 4, 5, 7, 9, and 11 fully complete; Epics 3, 6, 8, and 10 remain partially complete with only narrowly-scoped, explicitly-named gaps remaining (see each epic's heading and ledger). Current validation baseline: 545 unit/integration tests across 111 files, full TypeScript checks, lint pass, and production build pass. Electron boot smoke remains from the prior recorded baseline and should be rerun before any release claim.

---

## Phase A — Core Platform (mega-prompt Epics 0–12)

### Epic 0 — Baseline and safety ✅ complete

- [x] Repository audit (mega-prompt §4.1 discovery checklist)
- [x] `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` created and kept current
- [x] Build repair (project scaffolded and building)
- [x] Test baseline established
- [x] Security baseline applied (`docs/security/NDX_SECURITY_ARCHITECTURE.md`, Electron hardening per mega-prompt §6)
- [x] Mock/stub inventory completed (danger-pattern search, §4.2)
- [x] Dead-code analysis

### Epic 1 — Shell and design system ✅ complete (core scope; some primitives deferred to consuming epics)

- [x] Design tokens (mega-prompt §8.1) — `src/renderer/src/assets/tokens.css` (Tailwind v4 `@theme` + plain CSS vars for layout/motion/z-index)
- [x] Core primitives (§8.2) needed by the shell itself: `ControllerButton`, `StatusBadge`, `EmptyState`/`ErrorState`/`OfflineState`/`RestrictedState`, `Modal`, `ConfirmationDialog`, `CriticalConfirmationDialog`, `Toast`/`ToastProvider`, `SystemRail`, `NavigationRail`, `ContextPanel`, `ControllerHint`
  - Deferred to the epics that consume them (not built without a real consumer — avoids dead/unused primitives): `FocusList`/`FocusGrid`/`FocusTree`/`VirtualizedFocusList` (Epic 2), `PaneGroup` (Epic 7), `PermissionDialog` (Epic 4), `CommandPalette`/`RadialActionMenu` (Epic 4), `ProgressTimeline` (Epic 4/8), `PredictiveInput`/`SecureInput` (Epic 2/10), `DiffViewer`/`LogViewer` (Epic 6/7), `MetricCard`/`TaskCard`/`WorkspaceCard`/`AgentCard`/`ModelCard`/`WorkflowCard` (Epics 5/8/9)
- [x] Shell (top system rail, primary nav rail with real per-destination SVG icons, bottom controller rail, context panel) — `src/renderer/src/app/shell/ShellLayout.tsx`
- [x] Rails (Standard / Focus / Split / Overlay / Theater display modes) — `src/renderer/src/state/displayMode.tsx` + `ShellLayout`; overlay modeled as a layering flag rather than a base mode (matches spec's "without destroying underlying state")
- [x] Global modals/overlays — `Modal`, `ConfirmationDialog`, `CriticalConfirmationDialog` (hold-to-confirm), `Toast` built. `PermissionDialog`, `InputOverlay`, `AIRadialMenu`, `ItemContextMenu`, `ModelPicker`, `WorkspacePicker` deferred to Epics 4/5/9 (feature-specific content, no consumer yet)
- [x] Error boundaries — `src/renderer/src/app/error-boundaries/RootErrorBoundary.tsx`
- [x] Route registry — `src/renderer/src/app/routing/routes.tsx` (45 registered routes as of this reconciliation, each declaring routeId/screenId/title/owningEpic/controllerHints/restoreOnRevisit); implemented destinations render real screens and remaining destinations render an honest `EpicBoundaryPlaceholder`
- [x] Responsive 16:10 layout — `--breakpoint-deck/docked/docked-2k` custom breakpoints in tokens.css; safe-inset and rail sizing all token-driven

### Epic 2 — Controller runtime ✅ core complete (Steam Input/native adapter and per-feature profiles deferred)

- [x] Adapters — real W3C Gamepad API adapter (`gamepadAdapter.ts`, covers Steam Deck/Xbox/DualSense/generic "standard"-mapping devices in one implementation) + keyboard fallback (`keyboardAdapter.ts`) + test-mode injection adapter (`testAdapter.ts`)
  - [ ] Steam Input adapter — **deferred**: rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button are not exposed by the standard Gamepad API; reaching them needs Steam Input or a native/SDL adapter (mega-prompt §9.1 lists both as optional). Documented gap, not a missing mapping — see ledger.
- [x] Semantic actions — full `ControllerAction` union (wireframe §4.1) normalized from raw buttons/axes/keys (`controllerAction.ts`, `gamepadPolling.ts`); 3 of 9 spec chords implemented generically (LB+RB home, LT+RT workspace.switcher, Menu+B emergency.stop) — remaining 6 require grip/Quick-Access buttons unavailable via generic Gamepad API; hold behavior (700ms) implemented for non-repeatable actions, repeat delay/rate for nav/tab/pane
- [x] Spatial Focus Engine — focus node contract + registry (`FocusRegistry.ts`), deterministic directional navigation (explicit neighbor → same-group geometric → broad geometric → fallback → stay-put, wireframe §5.2), modal trap stack, focus-change pub/sub, never drops to `document.body`
  - Note: spec step 4 ("group-level transition") folded into the broad geometric search rather than implemented as a separate heuristic — documented scope simplification, see ledger
- [x] Haptics service — real `GamepadHapticActuator`/`playEffect('dual-rumble')` integration with off/low/medium/high intensity scaling and honest capability detection (`hapticsService.ts`); wired to focus-movement and selection events
- [ ] Input profile manager — **partially real as of Epic 11**: haptics intensity is now a real, persisted, user-facing setting (`features/system/ControllerSettings.tsx`); per-controller-type button mapping (`standardGamepadMapping.ts`) and controller-glyph adaptation (`controllerGlyphs.ts`) remain read-only — full remapping/profile-switching still needs the config-threading refactor through `gamepadPolling.ts` noted in ND-043
- [x] Focus/controller debug overlay — `FocusDebugOverlay.tsx` (dev-only), shows current focus, registered nodes, trap depth; duplicate-ID and unreachable-node detection from the full §10.3 list deferred (`Map`-backed registration makes duplicates silently overwrite rather than collide — needs separate instrumentation)
- [x] Focus traversal tests — `FocusRegistry.test.ts` (11), `gamepadPolling.test.ts` (9), `keyboardAdapter.test.ts` (10), `hapticsService.test.ts` (8), plus live integration via `NavigationRailItem` and `Modal.focusEngine.test.tsx`

### Epic 3 — Onboarding and global UX ✅ all 12 screens real — ND-002 Lock Screen honestly scoped to a single local PIN (multi-account authentication remains genuinely out of scope)

- [x] ND-001 Boot and Session Start — `features/onboarding/BootSessionStart.tsx`; real boot orchestration with service checks (workspaces, model providers, controller settings, system metrics), first-run inference from empty state, 15s timeout, detailed status after 10s or on demand, failure screen with Retry/Diagnostics/Exit, and `B` Return to SteamOS; routes to `/onboarding/welcome` for first run or `/` for returning users; rendered outside `ShellLayout` so boot happens before shell chrome mounts
- [x] ND-002 Lock Screen — **real, scoped to a single local PIN**: `LockSettingsStore` (`core/lock/`) persists only a salted `scrypt` hash via `node:crypto` (never the raw PIN, never reversible) — real `setPin`/`removePin`/`verifyPin` IPC, wired into a PIN management section in Privacy and Permissions. `LockProvider`/`LockScreen` gate the entire shell (`ShellLayout` swaps to `LockScreen` while locked) with a real, controller-focusable, per-mount-shuffled PIN keypad (resists shoulder-surfing per the spec's security note); engaging the lock calls the real, existing `ActionQueue.emergencyStop()` so queued/pending tool actions can't silently execute while the screen is locked; "Power options" (Restart/Quit) stay reachable from the lock screen itself. The Power Menu's "Lock NeuroDeck" option is real once a PIN exists. **Deferred, honestly**: "[Y] Use account authentication" and per-user "Welcome back, &lt;name&gt;" personalization need a real multi-profile/credential vault (Phase B Epic X10, not built), so they're shown as a disabled note rather than faked; unlocking does not auto-resume the action queue (matching Emergency Stop's own existing behavior — resuming is a deliberate user action from the Execution Timeline, not an automatic side effect of dismissing a screen)
- [x] ND-003 First-Run Welcome — `features/onboarding/FirstRunWelcome.tsx`; purely informational, no backend dependency
- [x] ND-004 Controller Calibration — `features/onboarding/ControllerCalibration.tsx`; button detection and haptics testing are real. Haptics intensity is now persisted through ND-043; dead zone/hold duration remain real read-only values
- [x] ND-005 AI Provider Setup — **real first-run screen**: `features/onboarding/AIProviderSetup.tsx` presents local/cloud/speech/vision/embedding categories, explains each, and adds real providers through Epic 9's typed `modelProviders` IPC; scoped — speech/vision/embedding adapters are not implemented yet (Epic 9/X5), so those categories are informational-only, and advanced per-provider options are not wired
- [x] ND-006 Workspace Discovery — **real**: multi-source scanner (`WorkspaceDiscoveryService`) discovers home projects, Git repositories, saved SSH hosts, removable storage, and Steam library entries; deduplicates by realpath and filters already-persisted workspaces; wired to onboarding `/onboarding/workspaces` and the workspace IPC bridge
- [x] ND-007 Guided Controller Tutorial — **real**: seven-lesson walkthrough (`GuidedControllerTutorial`) exercises real focus navigation, detail/back flow, context/assist actions, command palette, ActionQueue approval of a harmless `tutorial:acknowledge` tool, and a simulated pausable task; wired to onboarding `/onboarding/tutorial`
- [x] ND-008 Home Command Center — **real workspace-aware composition**: `features/home/HomeCommandCenter.tsx` keeps the honest empty state when no workspace exists, and now uses real workspace context plus workflow/agent IPC to render Continue, workspace cards, running workflow/agent counts, and route-backed recommendations. No fabricated recent activity, pinned state, or metrics.
- [x] ND-009 Universal Command Palette — **real multi-domain palette**: `features/command-palette/CommandPalette.tsx`; modal-trapped, controller-focusable, searches real screen/settings route targets, active-workspace file entries, workspace records, persisted workflows, persisted agents, and registered tools. Symbols and recent-action history remain deferred because their owning data sources do not exist yet.
- [x] ND-010 Global Search — **real, renderer-only federated search**: `features/search/useGlobalSearch.ts` + `GlobalSearch.tsx` query files, code, tasks, logs, browser tabs, remote hosts, model providers, and navigation destinations through existing IPC clients; category filters, debounced query, keyboard/controller navigation, and source-level error reporting. No fake unified index — results are fetched live from the real services that own each domain.
- [x] ND-011 Activity Center — `features/activity/ActivityCenter.tsx`; real action categories and honest empty states. ActionQueue exists, but Agent Runtime events are not yet connected to Activity
- [x] ND-012 Notification Center — `features/activity/NotificationCenter.tsx`; extends the real `ToastProvider` (Epic 1) with persistent history, per-category muting, and event collapsing — all genuinely functional
- [x] Quick overlay foundation — ND-050 Quick Access Overlay built with real `quick.access` action, focus trap, and honest placeholder/disabled states; Steam Deck Quick Access button remains deferred (no standard Gamepad API exposure)

### Epic 4 — AI safety runtime ✅ complete for Phase A scope

- [x] Plan schema (mega-prompt §15.1) — `ai-safety/contracts/plan.ts` (`ActionPlan`, `ActionStep`, `ImpactSummary`, etc.)
- [x] Typed tool call schema and registry — `ai-safety/contracts/plan.ts` (`HarnessAction`) + `ai-safety/ToolRegistry.ts`; invocation must match a registered tool. The shared narrow typed IPC layer is now real across workspace, file, Git, terminal, workflow, recovery, model, browser, remote, system, learning, and Agent Runtime domains
- [x] Permission broker (§16) — `ai-safety/PermissionBroker.ts`; real evaluate/grant/revoke/once-consumption, scoped (once/session/workspace/persistent)
- [x] ND-013 AI Command Canvas — **real, scoped**: `/ai` uses the real Model Router completion bridge for a strict-JSON plan preview, validates the response with Zod, lets the user remove preview steps for review clarity, and hands the raw intent to a persisted zero-tool "Quick Command" agent run. It does not execute the preview as a deterministic step script; per-step model assignment, hard file/network enforcement, test-success gates, branch creation, budgets, and real tool grants remain deferred.
- [x] ND-014 AI Execution Timeline — `features/ai-canvas/ExecutionTimeline.tsx`; real lifecycle tracking (queued/running/passed/failed/cancelled) of actually-submitted actions, with real cancel
- [x] ND-015 Approval Queue — `features/approvals/ApprovalQueue.tsx`; real pending `HarnessActionRecord`s, approve/deny wired to the real broker+queue
- [x] ND-054 Emergency Stop — `features/ai-canvas/EmergencyStopOverlay.tsx`; real toggle on `emergency.stop`, pauses the queue and cancels pending actions. Terminal and Agent Runtime core now exist, but safe-process classification and cross-runtime emergency termination are not connected
- [x] Audit service — `ai-safety/AuditLog.ts`; real append-only in-memory log. Durable audit persistence and export remain unimplemented
- [x] Prompt-injection resistance verified (§15.4) — adversarial tests prove injected JSON/tool-grant text in the user intent is not parsed as a host tool plan, and AI Command Canvas cannot use malicious intent text to grant the Quick Command agent tools or permission ceilings. Host tool execution remains constrained to validated model tool plans plus allowlist/permission evaluation.
- **New real tool**: `ai-safety/tools/resetHapticsIntensityTool.ts`, registered via `CoreToolsBootstrap.tsx`, reachable from the Command Palette's new "Tools" domain — demonstrates the full registry → permission → approval → execution → audit pipeline end to end with a genuinely real, low-risk, reversible action

### Epic 5 — Workspaces and files ✅ all listed items real — read/write/delete core complete; copy/move/rename/compress/extract remain genuinely out of scope (need a multi-path checkpoint shape not yet designed)

- [x] Typed cross-process IPC contracts (§14) — `shared/contracts/{error,workspace,file,ipcChannels,bridge}.ts`; Zod-validated request/response schemas, normalized `NdxError`/`NdxResult`. This is the trigger Epic 4's ledger flagged ("revisit when Epic 5/6 add tools that need main-process access") — real now because workspace persistence and file access both need Node's `fs`/main process.
- [x] Workspace Service (persistence, §19) — `core/workspaces/WorkspaceStore.ts` on top of `core/persistence/JsonStore.ts`; real create (verifies the folder exists via `fs.stat`)/list/remove/get, persisted to `app.getPath('userData')`
- [x] Workspace discovery (ND-006 real backend, full version) — **real**: `core/workspaces/WorkspaceDiscoveryService.ts` scans home projects, Git repositories, saved SSH hosts, removable storage, and Steam library entries; reachable/unreachable classification and deduplication by realpath; exposed through the workspace IPC bridge
- [x] ND-018 Workspace Hub — `features/workspaces/WorkspaceHub.tsx`; real cards, real native folder picker via `dialog.showOpenDialog`
- [x] ND-019 Workspace Detail — `features/workspaces/WorkspaceDetail.tsx`; Overview + Files + local Git tabs real. Workflow, model, and Agent Runtime cores now exist, but Sessions/Tasks/Models/Permissions/Environment/History tabs are not connected
- [x] ND-020 Workspace Switcher — `features/workspaces/WorkspaceSwitcherOverlay.tsx`; opens on the real `workspace.switcher` action (LT+RT chord, wired in Epic 2), switches the real active workspace
- [x] File Service (§20) — `core/files/FileService.ts`; real `list`/`read`, path-traversal protection via `fs.realpath` (catches symlink escapes, not just literal `../`, verified with a real symlink in tests). `write()` landed in Epic 11, unconditionally recovery-checkpointed; `delete()` is real now too (a single file only, never a directory — `read()`'s existing directory guard rejects it before any checkpoint is recorded), checkpointed the same way under a new `file-delete` checkpoint kind. Copy/move/rename/compress/extract/secure-delete remain deferred — each touches two paths or an archive boundary and needs a real multi-path checkpoint shape that doesn't exist yet
- [x] ND-026 File Manager — `features/workspaces/FileManager.tsx`; real workspace-scoped directory listing, breadcrumb navigation, and a real per-file Delete control (hidden for directories) behind a `ConfirmationDialog` naming the real recovery-checkpoint guarantee
- [x] ND-027 File Preview — `features/workspaces/FilePreview.tsx`; real text/code preview with truncation notice over 256 KB; images/PDF/audio/video/archive/diff deferred (each needs its own renderer)
- [x] Recovery integration (checkpoints on destructive file ops) — **real as of Epic 11 plus later addenda**: every `FileService.write()` and `FileService.delete()` path is preceded by a real `RecoveryService.recordCheckpoint()`, and Git discard/restore records a `git-restore` checkpoint before changing tracked files. Workflow/agent `files-write` and `files-delete` tools reuse the same checkpointed IPC paths rather than adding a weaker write path.

### Epic 6 — Terminal and Git ⚠️ real local/remote Git core including restore/branch-delete/force-push/recovery branches; real terminal search/copy selection, headless execution, AI intent proposals, and saved actions; context-aware option catalogs, man-page integration, and remote targets in Command Builder remain

- [x] Terminal Service / PTY (§21) — **real, including bounded headless execution**: `node-pty` local shells, multiple workspace-scoped sessions, resize, streaming output, bounded snapshots, cancellation, exit status, working directory, sanitized inherited environment, typed IPC, real scrollback search (`@xterm/addon-search`), and real selection-to-clipboard copy are real. `TerminalService.runHeadless()` spawns a real, path-confined, timeout-bounded child process (not a PTY) and returns captured stdout/stderr/exit code instead of writing to a live session — used by Command Builder's "Run headless" path below. SSH (real, but via Remote Systems' own session type — Universal Terminal itself stays local-PTY-only) remains a separate session type by design. "History" beyond the shell's own up/down-arrow command history and xterm's 5000-line scrollback buffer is not a separate feature this slice builds
- [ ] ND-028 Universal Terminal — **partially real, search/copy real**: `/terminal` Direct mode uses xterm.js over real PTY sessions with controller-focusable create/select/focus/terminate controls, resize, ordered streaming, exit state, workspace/branch context, reviewed termination, a real Find bar (Previous/Next over the real scrollback buffer), and a real Copy selection action. Command Builder is real at `/terminal/builder`; integrated Intent/Split/Remote modes remain
- [x] ND-029 Command Builder — **real for the items below; man-pages, remote targets, and context-aware option catalogs remain**: dedicated `/terminal/builder` route with Program/Subcommand/Flag/Value/Path/Pipe/Redirect/Conditional/Environment blocks, shell-specific exact preview, deterministic risk badge, copy-without-running, local-session targeting, and mandatory ActionQueue approval. **AI generation** is real: a structured proposal request goes through the real model router (`completeModel`), is parsed into typed blocks (never executed directly — the model only ever populates the block editor), and still requires the same review/approval before anything runs. **Saved actions** are real: up to 20 reusable command block sets persist per workspace in `localStorage` with Save/Load/Delete. **Headless execution** is real: a second "Run headless (capture output)" action submits the same reviewed command to ActionQueue under a parallel `terminal-headless-*` tool tier (`ai-safety/tools/headlessTerminalTools.ts`) that runs it via `TerminalService.runHeadless()` instead of writing to a PTY, with captured stdout/stderr/exit code surfaced as the action's result message (visible in AI Execution Timeline / Audit history) — this path requires at least one running terminal session to reach the builder screen at all (the screen's session-list empty-state gate), even though headless execution itself doesn't use that session
- [x] Git Service (§22) — **restore/discard, branch create/delete, and force push now real**: repository detection, status, diff, stage, unstage, commit, local branch list/checkout, log, remote inspection, fetch, pull, push, stash, and conflict detection (`hasConflicts` derived from real porcelain v2 unmerged codes) are implemented through typed IPC and tested against real bare-remote repositories. `restore()` discards real uncommitted changes to tracked files (untracked files correctly rejected — nothing to restore to); `createBranch()`/`deleteBranch()` support safe (`-d`, rejects unmerged) and explicit force (`-D`) deletion; `forcePush()` uses `--force-with-lease`, never raw `--force` — verified with a real test that it fails closed when the remote moved since the last fetch rather than clobbering a concurrent push. Pull requests and AI commit assistance remain out of scope (need a forge API integration and reviewed AI write-path, respectively)
- [x] ND-025 Git Control Center — **discard, branch create/delete, and force push now real**: dedicated `/git` route with working tree, staged changes, exact diff preview, editable/reviewed local commit (separate review from push), branches with create/delete, commit history, remote fetch/pull, a dedicated push review dialog, a separate more-severe force-push review dialog, and a per-file Discard control (hidden for untracked files) backed by a real pre-discard Recovery checkpoint. Pull requests, AI commit assistance, and a merge-conflict resolution UI remain
- [x] Diff views — `features/git/GitDiffViewer.tsx`; read-only unified diff for staged, unstaged, and untracked files with safe text rendering and controller-selectable file rows
- [x] Git recovery branches — **real**: ND-025's "Recovery branches" section creates a real Git branch at the current commit via the existing `createGitBranch` IPC (no new backend surface), named with a `recovery/<timestamp>` convention the UI filters on to show them in their own section, separate from Recovery Timeline's per-file content checkpoints and from the regular Branches list

### Epic 7 — Build Studio ✅ complete for Phase A scope (future expansions tracked outside this epic)

- [x] ND-021 Build Studio shell/modes — `/build` has a real project tree, editable/savable tabs, problems, symbols, Git summary, controller-focusable structural edit controls, and a reviewed model-router predictive edit panel. Saves create Recovery checkpoints through the shared file-write IPC path. Review/Debug/Test and task-runner configuration remain future Epic 6/8 integrations, not hidden Build Studio mocks
- [x] ND-022 Code Editor — locally bundled Monaco, file tabs, syntax highlighting, editing, checkpointed save, deterministic structural actions (organize imports, format file, wrap selection), reviewed predictive insert/replace, and model-context prompts are real. Voice-to-code and a full token wheel are not claimed; they require speech/input systems outside the current Phase A Build Studio contract
- [x] LSP integration — **real for TypeScript/JavaScript only**, via Monaco's bundled TypeScript language service worker (the actual TS compiler running in a Web Worker, not a fake) — real diagnostics, real navigation-tree symbols. No real LSP server exists for any other language; those get Monarch syntax highlighting only, honestly labeled "No symbol provider for this language" rather than a fake empty outline
- [x] ND-023 Symbol Navigator — real TS/JS navigation-tree symbols with Jump. Unsupported languages remain honestly labeled; full multi-file Peek/Rename/Find references would require additional language-service infrastructure beyond Monaco's bundled worker surface
- [x] ND-024 Diagnostics and Problems — real `monaco.editor.IMarker`s grouped by severity then file and live-updated. Test-runner and accessibility groupings remain integrations for future testing/accessibility services, not fabricated categories
- [x] Predictive editing — real reviewed flow: selected/cursor context is sent to the existing `ModelRouter.complete()` IPC path with `fast-coding`, `workspacePrivate: true`, strict JSON proposal parsing, visible model/provider provenance, and explicit Apply/Discard before editor mutation
- [x] Controller-native structural edits (§12 editor requirements) — real controller-focusable controls for deterministic import organization, Monaco format document, and selection wrapping. Each action edits the active Monaco model through the editor API and leaves save/recovery behavior on the existing checkpointed save path
- [x] Editor tests — `detectLanguage.test.ts` (4), `useOpenFiles.test.ts` (7, including real save success/failure paths), `ProjectTree.test.tsx` (3), `DiagnosticsPanel.test.tsx` (3), `SymbolNavigator.test.tsx` (3), `editorTransforms.test.ts` (6), `BuildStudio.test.tsx` (1 reviewed predictive flow). Monaco's own editor surface is not re-tested (it's a trusted, established library) — tests cover the real logic this slice adds around it

### Epic 8 — Agents and workflows ⚠️ Workflow Engine real; Agent Runtime core + IPC + UI + ActionQueue tool submission + pause/resume + child-agent bounds + dry-run real; richer run tabs/e2e remain

- [ ] Agent Runtime (§17) — **core lifecycle, typed IPC, UI, ActionQueue-backed tool submission, run pause/resume, child-agent bounds, and dry-run real; richer run tabs/e2e remain**: persisted definitions and runs include every required identity/scope/policy/resource field; planning uses the real Epic 9 router; cancellation aborts provider requests; pause/resume prevents the next tool submission without pretending to interrupt an already-running tool; all state transitions and token usage are persisted. `registerAgentHandlers.ts` exposes real CRUD/run-control IPC, with live run updates pushed to the renderer (`agentRun.update`, the same pattern terminal data/exit events use). Strict model-emitted JSON `toolCalls` are validated against the agent tool allowlist in `AgentRuntime`, sent over the typed `agentTool.request` bridge, checked against the agent permission ceiling in the renderer, and submitted through the existing `ActionQueue`/`ToolRegistry`/`PermissionBroker` path by `AgentToolExecutionBridge`. Persisted `childAgentPolicy` defaults child spawning to disabled, appears in Agent Operations/Detail, migrates old agent records on read, and fails closed if model output proposes `childAgents` outside policy. A persisted `dryRun` flag still plans through a real model completion but never submits a tool call to ActionQueue, recording what would have run in the timeline instead — `AgentDetail.tsx` has a real checkbox and `[Dry run]` badge for it. `files-write`/`files-delete` are now real, registered tools a workflow or agent can be granted. Richer activity/log tabs and end-to-end UI coverage remain for subsequent sprint items.
- [x] ND-016 Agent Operations Center — **real, scoped to a flat list**: `features/agents/AgentOperationsCenter.tsx` — real create (tool allowlist populated from the real `ToolRegistry`, not invented), real list, real enable/disable, real remove, navigates to a real Detail screen. Pause/restrict/archive/report and activity streaming beyond run state remain — restrict/archive need state this slice doesn't add, and report needs a format not yet designed.
- [x] ND-017 Agent Detail — **real, scoped to Overview + a real Start-run/Cancel control + Timeline/Output**: `features/agents/AgentDetail.tsx` — real persisted definition, real run history with live-pushed updates, real start/cancel wired to `AgentRuntime`, real timeline/output/token-usage display. Files/Tools/Permissions/Logs tabs remain — ActionQueue-backed tool submission now exists, but the dedicated per-run tab data model/UI is not built yet.
- [x] ND-032 Workflow Library — **real**: lists persisted workflow definitions for the active workspace, real Run/Open/Remove actions
- [x] ND-033 Workflow Forge — **real, scoped to a list editor, not a graph canvas**: ordered add/reorder/remove is controller-friendly and runnable. AI decision is now unblocked by Epic 9 but not integrated; Script still needs a headless terminal primitive; Parallel/Merge/Rollback require a graph run model
- [x] Workflow Runtime / Workflow Engine (§25) — **real, sequential rather than an arbitrary DAG** (see scope note in `shared/contracts/workflow.ts`): `tool-action` steps submit through the real Epic 4 `ActionQueue` (same registry → permission → approval → execution → audit pipeline as a Command Palette action); `condition`/`validator` are structured comparisons (no `eval()`); `user-approval` genuinely pauses the run until a human resolves it; `delay` is a real bounded wait; `output` records context. Versioned definitions, real persistence, real run history
- [x] Dry-run support — **real**: `startAgentRunRequestSchema`/`AgentRun` carry a real persisted `dryRun` flag; `AgentRuntime.executeToolCalls()` still plans through a real model completion but never submits a tool call to the real ActionQueue when `dryRun` is true — each proposed call is recorded in the real timeline ("Dry run: would submit tool N/M (toolId) with arguments {...} — not sent to ActionQueue") instead. `AgentDetail.tsx` (ND-017) has a real "Dry run" checkbox and shows a `[Dry run]` badge on past runs
- [x] Checkpoints — **real**: `ai-safety/tools/fileTools.ts` registers real `files-write`/`files-delete` tools (the gap Workflow Forge's own scope comment named — no tool-action could perform a file write). Both call the exact same already-checkpointed `writeFile`/`deleteFile` IPC path `FileManager.tsx`'s Delete button uses; `registerFileHandlers.ts` records a `RecoveryService` checkpoint before either runs, unconditionally, regardless of caller — there is no separate, weaker write path for tool-actions or agent tool calls
- [x] ND-034 Workflow Run Detail — **partially real**: real Timeline (live + persisted step status/messages) and Approvals (real approve/reject wired to the engine) and Cancel. Inputs/Outputs/Logs/Recovery/Metrics tabs and Retry/Skip/Re-run-from-checkpoint/Export are deferred — each needs infrastructure (structured per-step logs, recovery-checkpoint linkage, performance instrumentation, a report format) this slice doesn't build

### Epic 9 — Models ✅ all listed items real for chat — vision/speech/TTS/embeddings and non-OpenAI-compatible providers remain genuinely out of scope

- [x] Model Router (§18) — `ModelRouter` performs real provider/model availability probes, enforces enabled/private/offline/local constraints, reads live `SystemMetricsService` memory/battery/thermal data, returns an auditable route decision, and invokes the selected provider's real `/chat/completions` endpoint. API keys remain encrypted via Electron `safeStorage` and never cross IPC.
- [x] Provider adapters (§18.3) — **real for OpenAI-compatible chat and Ollama runtime APIs**: secure encrypted credentials, real connection tests/discovery, cloud warning, enable/disable/delete, and provider-reported per-completion token usage. Vision, speech, TTS, embeddings, cumulative cost/usage accounting, and non-compatible provider adapters remain
- [x] Local model runtime — configured Ollama providers expose real `/api/ps` running state and real load/unload/benchmark controls. Generic local OpenAI-compatible endpoints remain discovery/inference-only because those controls are not part of the OpenAI protocol. NeuroDeck does not silently install or launch a third-party daemon.
- [x] ND-037 Routing Profiles — all eight required profiles are present in a controller-focusable screen and preview a real route decision with the measurements and reasons used.
- [x] Resource-aware model selection — live memory pressure and thermal measurements affect local selection; Battery Saver prefers cloud execution when reachable; unavailable sensors remain explicitly unavailable rather than fabricated.
- [x] ND-035 Model Control Center — real provider setup, encrypted credentials, enable/disable/delete, live connection tests, Ollama provider type, and navigation to real Routing Profiles.
- [x] ND-036 Model Detail — real provider/model discovery plus capability-detected Ollama running state, load, unload, and measured benchmark results. Unsupported provider data is not invented; token usage is exposed when the provider returns it.

### Epic 10 — Browser, remote, learning ✅ all 7 listed items real — Browser System, SSH Remote Systems, and Learning Hub/Guided Lab each honestly scoped (deeper sub-features like reader mode, remote file browsing, and a full course library remain genuinely out of scope)

- [x] Browser Session Service (§24) — **partially real**: `core/browser/BrowserTabStore.ts` (persisted tab metadata, unit-tested) + `main/browser/BrowserSessionService.ts` (real `WebContentsView` lifecycle — create/navigate/back/forward/reload/bounds/close). Only one tab's view is resident at a time (switching tabs closes the previous `webContents` and recreates fresh on reactivation) — a deliberate scope simplification, not a memory-leak workaround. **Permission-prompt UI real as of this slice**: `BrowserPermissionStore`, `BrowserPermissionDialog`, and `PrivacyPermissions` integration replace the previous default-deny handler. Reader mode, downloads, site profiles, history, "add to workspace context", and AI summarization remain deferred — each needs infrastructure this slice doesn't build
- [x] ND-030 Browser Hub — **real**: `features/browser/BrowserHub.tsx` — real workspace-scoped persisted tab list, real New Tab/Open/Close
- [x] ND-031 Browser View — **real**: `features/browser/BrowserView.tsx` — real address bar/Back/Forward/Reload wired to the live `WebContentsView`, a real `ResizeObserver`-measured placeholder `<div>` whose bounds are continuously reported over IPC so the native view tracks it exactly, real "Open externally" via `shell.openExternal`. `BrowserSessionService` itself cannot be unit-tested in Vitest (it requires a real `app.whenReady()` window) — it's covered by the Playwright e2e route check and manual verification instead
- [x] Remote Systems Service (§26) — **SSH slice real**: SSH host registry, OS-encrypted password/passphrase storage, trust-on-first-use host-key fingerprint recording, injected/tested `ssh2` connection/session service, typed IPC channels, preload bridge methods, bounded output snapshots, write/resize/terminate, and data/exit event forwarding are real. Remote file browsing, remote command builder, non-SSH targets, Windows remote tooling, containers, network shares, metrics, logs, port forwarding, and remote desktop remain deferred.
- [x] ND-040 Remote Systems — **real SSH host-management UI**: `features/remote/RemoteSystems.tsx` adds/list/removes/tests SSH hosts over `window.ndx.remoteHosts`, with explicit host-key trust copy and no fake non-SSH targets.
- [x] ND-041 Remote Session — **real SSH terminal UI**: `features/remote/RemoteSession.tsx` + `RemoteSessionViewport.tsx` provide xterm-backed snapshot hydration, streamed data, write, resize, and disconnect over `window.ndx.remoteSessions`; file browsing, metrics, logs, tunnels, and remote desktop remain deferred.
- [x] ND-038 Learning Hub — **real catalog shell**: `features/learning/LearningHub.tsx` lists curricula with area filter, progress, session length, lab availability, required tools, and offline badge. Includes one bundled example curriculum and real user-created curricula with persistence. A full course library is not invented.
- [x] ND-039 Guided Lab — **real lab shell**: `features/learning/GuidedLab.tsx` renders instructions, hints, objectives, a live terminal via `LabTerminal.tsx`, and an AI coach panel wired to the real model router. Automated lab validation is honestly manual in this slice; the AI coach is disabled when no provider is enabled.

### Epic 11 — System integration ✅ all 16 screens real, each honestly scoped — see per-item notes for what's still disabled within each

- [x] System Metrics Service (real metrics, §27) — `core/system/SystemMetricsService.ts`; capability-driven CPU, memory, storage, network, process, swap, battery, thermal, fan, and GPU collection with explicit unavailable reasons and deterministic tests. Epic 9 routing is its first real consumer
- [x] ND-042 System Dashboard — **real**: `features/system/SystemDashboard.tsx` — real `systemMetrics.collect` IPC (Zod-validated `SystemMetricsSnapshot` contract), real manual Refresh, every metric card shows the real `{available, value, source, reason}` shape — an unavailable sensor (no battery, non-Linux host) is shown honestly as "Unavailable: <reason>", never a fabricated reading. No auto-refresh polling in this slice (manual Refresh only, matching the no-background-surprises rule); live-updating charts/historical trends are not built.
- [x] ND-043 Controller Settings — **partially real, scoped to the one genuinely adjustable setting**: `features/system/ControllerSettings.tsx` — real, now-persisted haptics intensity (closes the session-only gap `ControllerCalibration.tsx` left), a real "Test haptics" trigger, and a real link to Calibration for live button-input testing (no duplicated detection logic). Hold duration/repeat delay/repeat rate/stick dead zone are shown as real read-only values, not fake sliders. App profiles, rear-button/gyro/trackpad-fallback mapping, and accessibility remapping are honestly disabled with a one-line real reason each — they need either Steam Input/a native adapter (documented gap) or design work not started
- [x] ND-044 Display and Theme Settings — **partially real, scoped to three genuine overrides**: `features/system/DisplayThemeSettings.tsx` — real, persisted reduce-motion and high-contrast overrides (independent of, and stacking on top of, the OS-level `prefers-reduced-motion`/`prefers-contrast` media queries `tokens.css` already honors), and a real text-size scale (`--ndx-text-scale`, multiplying the whole `rem`-based type scale via the same custom-property-cascade pattern theater mode's density multiplier already uses). Appearance, Transparency, Focus style, Wallpaper, Live wallpaper performance, and OLED-safe behavior are honestly disabled with a one-line real reason each — none of those visual systems (light theme, glass effects, alternate focus ring, wallpaper) exist yet
- [x] ND-045 Network and VPN — **real, read-only**: `core/network/NetworkService.ts` collects real OS-level network diagnostics (`os.networkInterfaces`, DNS, proxy env vars, optional Linux `nmcli` connection state) with capability detection and explicit unavailable reasons; `features/system/NetworkAndVpn.tsx` renders them honestly. Wi-Fi/Ethernet/VPN/Firewall/Remote-access management are disabled with real reasons because the OS-specific adapters do not exist yet
- [x] ND-046 Privacy and Permissions — **partially real, scoped to what `PermissionBroker`/`AuditLog` actually track**: `features/system/PrivacyPermissions.tsx` — real "Effective access by tool" (every registered tool's real `requiredCapability` and live `broker.evaluate()` decision, with a real Revoke that takes effect immediately on the next evaluation) and real, live Audit history (`AuditLog.list()` via a new `useAuditEntries()` hook). The spec's per-actor "permission matrix" (rows: agents/tools/providers) isn't fully real — `PermissionBroker` grants a capability broker-wide, not per-actor, so there's no way to show "agent X has Y but tool Z doesn't"; the per-tool view is the honest substitute. Provider data policy, Workspace boundaries, Network destinations, and Consent rules are honestly disabled — no separate policy store exists for any of them
- [x] ND-047 Storage and Recovery — **partially real**: real recovery-checkpoint storage summary (count + bytes) and a real link into Recovery Timeline; disk usage/model storage/workspace cache/browser data/logs/trash sections are honestly labeled "not real yet" rather than showing fabricated numbers — each needs a service this epic doesn't own
- [x] ND-048 Integrations — **real, read-only catalog**: `features/system/Integrations.tsx` aggregates existing real integrations (model providers via `modelProviders.list`, remote hosts via `remoteHosts.list`) and labels unsupported categories (Git providers, cloud storage, dev tools, learning platforms, notifications, Steam/Deck) as unsupported on the current platform with honest one-line reasons. No fake connected states
- [x] ND-049 Updates — **real, scoped to version info and feed check**: `core/system/UpdateService.ts` reads `package.json` version and can check a configured `ND_UPDATE_FEED_URL` JSON feed; `features/system/Updates.tsx` shows current component versions, channel, and update availability. Download/apply/rollback are honestly disabled until a signed release pipeline and `electron-updater` integration are configured
- [x] ND-050 Quick Access Overlay — **real overlay shell**: `features/system/QuickAccessOverlay.tsx` is mounted in `ShellLayout`, opens on the real `quick.access` action (Menu+Y chord + KeyO keyboard fallback), closes on `back`, uses a focus trap, and shows AI/Workspace/System quick actions plus live ActionQueue footer counts. Steam Deck Quick Access button integration remains deferred (not exposed by the standard Gamepad API)
- [x] ND-051 Power Menu — **real for the two genuinely safe actions**: `features/system/PowerMenu.tsx` — real "Restart NeuroDeck" (`app.relaunch()` + `app.exit()`) and "Quit NeuroDeck / Return to SteamOS" (`app.quit()`), both behind a real `ConfirmationDialog` reviewing the action/consequence per spec §9.1. Lock/Suspend/Restart core service/Restart device/Shut down are shown as honestly disabled options with a one-line real reason each (no Lock Screen yet, no separate core-service process in this architecture, real OS-level suspend/reboot/shutdown are irreversible against the whole host machine and need a dedicated native-integration design before being wired — not attempted in this slice)
- [x] **Recovery Service (§29)** — `core/recovery/RecoveryService.ts`: real checkpoints with content snapshots stored outside the user's workspace (`app.getPath('userData')/recovery/`), 50-checkpoint-per-workspace retention with real snapshot-file cleanup, tested against real temp directories. `file-write`, `file-delete`, and `git-restore` checkpoint kinds are real, and their handlers record checkpoints before destructive changes (orchestrated in IPC handlers, not skippable)
- [x] ND-052 Recovery Timeline — **partially real**: real `file-write`, `file-delete`, and `git-restore` checkpoint list, Inspect/Compare/Restore-to-point. Workflow, agent, package, settings, and system-config services are not integrated as first-class recovery event kinds; Revert event/Branch from point/Export snapshot remain
- [x] ND-053 Before/After Diff — **partially real**: real unified diff between a checkpoint snapshot and current content, with Restore original. Previous/next change, chunk apply/reject, model explanation, and validation remain unwired
- [x] ND-055 Error Recovery — **real for structured renderer crashes and route-level recovery**: `features/system/ErrorRecovery.tsx` + `app/error-boundaries/RootErrorBoundary.tsx` — catches render errors, maps them to a structured `ErrorRecoveryError` (plain-language problem, technical code, category, affected feature, correlation ID, what still works, collapsible diagnostic details), and renders focusable recovery actions (retry when rendered by the boundary, navigate home/logs, export diagnostics to clipboard via real `diagnosticsClient` + `systemClient`, quit via real `powerClient.quitApp()`). The `/error-recovery` route accepts an error payload from `location.state` for recoverable failures surfaced by other screens. Safe mode, automatic "restore previous state", and one-click "undo" are honestly not offered as fake buttons; the UI states they are not implemented yet.
- [x] ND-056 About and Diagnostics — **real, scoped to what this architecture actually has**: `features/system/AboutDiagnostics.tsx` — real app/Electron/Chromium/Node versions, platform/arch, configured model provider names, and a real "Copy diagnostics to clipboard" export (real version info + a live `SystemMetricsService` snapshot, never an API key or other secret since none of this data source holds one). "Core version"/"Database version"/build hash are not shown rather than filled with an invented value — this architecture has no separate core-service process, no database, and no build-time commit-hash injection step yet

### Epic 12 — Packaging and hardening

- [x] SteamOS packaging (Game Mode + Desktop Mode) — **real packaging substrate, scoped to a correctly-identified Linux build artifact**: `electron-builder.yml`'s scaffold-default `appId`/`productName`/`maintainer` are real (`com.neurodeck.os`/`NeuroDeck OS`/`NeuroDeck`); `desktopName` (`package.json`) + `linux.syncDesktopName: true` make electron-builder auto-derive a `StartupWMClass` that actually matches Electron's runtime Linux `app_id` — verified by building a real AppImage in WSL2 (Windows cannot run the native `mksquashfs`/`fpm` tools `electron-builder --linux` needs) and inspecting its embedded `.desktop` file directly. Desktop Mode gets correct name/icon/category/window-association from that `.desktop` entry on any standard desktop environment; Game Mode is "add the built AppImage as a non-Steam game" — Steam has no separate Game Mode manifest format, and the verified `StartupWMClass` match is what lets Steam's own running-window detection work. See `docs/implementation/NDX_STEAMOS_PACKAGING.md` for the full verification trail and the WSL cross-build recipe. **Not done**: CI automation of the Linux build, a Steam Input config preset, Decky Loader integration, and a signed release pipeline
- [x] Suspend/resume behavior — **real, scoped to detection and notification**: `registerPowerHandlers.ts` listens to Electron's real `powerMonitor` `suspend`/`resume`/`lock-screen`/`unlock-screen` events and forwards each over a typed `power.stateEvent` IPC channel; `PowerStateBridge.tsx` (mounted globally in `ShellLayout`) shows a real toast on resume (including the approximate suspended duration when known) so the user knows terminal sessions/live data may be stale. Lock/unlock are forwarded for any future consumer but intentionally don't toast (too frequent to be useful). This app never attempts to veto, delay, or otherwise act on the OS's own suspend decision — there is no separate core-service process to pause/resume
- [x] Controller disconnect/reconnect handling — **real**: `FocusEngineProvider` listens to the real `gamepadconnected`/`gamepaddisconnected` browser events and shows a warning toast when the last connected controller drops, and a confirmation toast on reconnect (not on the very first connect). Now covered by `controller/focus/__tests__/FocusEngineProvider.test.tsx`, which dispatches real gamepad connection events rather than relying on the test-only `TestAdapter` injection path every other consumer test uses
- [x] Performance pass (§33 budgets) — **real, measured fix plus an audit of the rest of the budget list**: route-level code splitting was the one real gap found — 37 of 41 screens in `routes.tsx` were statically imported into the renderer's main entry chunk regardless of which screen the user actually visited. Converted all of them to `React.lazy()` + `Suspense` (matching the pattern the 4 already-lazy heavy screens used), keeping only `HomeCommandCenter` and `BootSessionStart` eager since both are on the universal cold-boot path. **Measured**: the main entry chunk (`index-*.js`) dropped from 1,756.37 kB to 991.69 kB (−43.5%) in a real `npm run build` — evidence, not a claimed estimate. The rest of §33's checklist was already real or reasonably deferred: browser tabs already suspend inactive `WebContentsView`s (Epic 10), System Metrics already has zero polling (manual Refresh only), Toast/Audit history are already bounded (`MAX_HISTORY = 100`), `OllamaRuntimeService` already has real manual load/unload via `keep_alive`, and the Spatial Focus Engine computes element geometry on demand at navigation time rather than caching (caching would risk stale rects after a layout change, a correctness regression, not a real perf win at today's scale). Virtualized lists remain deferred — no current list in the app renders enough items to need one yet (this was already an explicit, justified deferral, not an oversight)
- [x] Security pass — **real audit, no gaps found requiring a fix**: `npm audit --omit=dev` is clean (0 production vulnerabilities); the 5 dev-only vulnerabilities (vitest/vite/esbuild's dev-server, moderate-critical) are exploitable only when the Vite dev server is exposed to untrusted network access, which doesn't apply to this app's local-dev-only usage — fixing requires a breaking vitest v4 upgrade not attempted without verifying test-API compatibility first. Every production `BrowserWindow` already uses the mandatory hardened `webPreferences` (`contextIsolation`/`sandbox`/no `nodeIntegration`); `index.html`'s CSP is real and strict (no `unsafe-eval`); an independent audit of all 82 `ipcMain.handle` call sites across every `registerXHandlers.ts` file found **100% Zod validation coverage** on the 71 that accept a payload, zero gaps; secrets (provider API keys, SSH passwords/passphrases) are real OS-level `safeStorage`-encrypted at rest and never serialized into any IPC response type sent to the renderer (`hasApiKey: boolean`/`hasSecret: boolean` only); no `eval()`/`new Function()`/`dangerouslySetInnerHTML` anywhere in the codebase; no `console.*` logging exists in `main`/`core` (so no path for a secret to leak into logs)
- [ ] Accessibility pass (§32)
- [ ] Full E2E suite (Playwright Electron, §34.4)
- [ ] Release candidate cut

---

## Phase B — Platform Completion (supplemental Epics X1–X15)

> Prerequisite: Phase A complete. Every Phase B epic must reuse Phase A's shared services (settings, permissions, notifications, logging, task queue, model routing, file access, controller handling, recovery, search, provider management, secret storage) — never fork them.

### Epic X1 — Platform registry foundation

- [ ] Capability registry
- [ ] Feature registry
- [ ] Application registry
- [ ] Device registry
- [ ] Shared transaction framework
- [ ] New IPC contracts (§50)

### Epic X2 — Application ecosystem

- [ ] Application Library (discovery, record schema, §6)
- [ ] Package Center / Linux package lifecycle (§7)
- [ ] Flatpak adapter
- [ ] AppImage adapter
- [ ] Steam Shortcut Manager (§8)
- [ ] Launch profiles

### Epic X3 — Extension ecosystem

- [ ] Extension host and isolation (§9.3)
- [ ] Extension manifest (§9.2)
- [ ] Capability API (§9.4)
- [ ] Extension Manager UI
- [ ] Signed marketplace client (§10)
- [ ] Signing/verification, quarantine, failure containment (§9.6)
- [ ] Developer SDK (§11.1)
- [ ] CLI (§11.2)

### Epic X4 — Knowledge and memory

- [ ] Knowledge Vault (source types, ingestion pipeline, §12)
- [ ] Document parsers
- [ ] Indexing / embeddings
- [ ] Retrieval rules (§12.5)
- [ ] Scoped AI memory (§13) — inspectable, editable, exportable, deletable
- [ ] Prompt/persona/tool/skill libraries (§14)

### Epic X5 — Voice and multimodal

- [ ] Speech provider integration (§15.1)
- [ ] Push-to-talk / wake word (§15.2)
- [ ] Dictation pipeline (§15.3)
- [ ] TTS
- [ ] Screen/document capture (§16) with privacy review and redaction
- [ ] Document intake
- [ ] Voice notes

### Epic X6 — Clipboard, sharing, and transfer

- [ ] Clipboard Center (§17.1) with security controls (§17.2)
- [ ] Snippets (§17.3)
- [ ] Universal Share Sheet (§17.4)
- [ ] Download/Transfer Center (§18)
- [ ] LAN device discovery (§19.1)
- [ ] Secure peer transfer (§19.2–19.3)

### Epic X7 — Sync, backup, and migration

- [ ] Sync engine (syncable data classes, §20.1; exclusions §20.2)
- [ ] Conflict resolver (§20.4)
- [ ] Backup (scopes/destinations, §21.1–21.2)
- [ ] Restore (§21.3)
- [ ] Import/export formats (§21.4)
- [ ] Legacy/version migration (§21.5)

### Epic X8 — Device services

- [ ] Device and Peripheral Center (§22)
- [ ] Bluetooth Center (§23)
- [ ] Audio and Microphone Center (§24)
- [ ] Display and Dock Center (§25)
- [ ] Removable Storage Center (§26)
- [ ] Hot-plug behavior (§22.3)

### Epic X9 — Resource and scheduling

- [ ] Resource Governor (§27)
- [ ] AI Workload Scheduler (§28)
- [ ] Time/event Scheduler and Trigger Service (§29)
- [ ] Quiet hours / interruption policy

### Epic X10 — Profiles and identity

- [ ] User profiles / operating modes (§30)
- [ ] Guest/private session (§30.3)
- [ ] Identity, credentials, certificates, secrets vault (§31)
- [ ] SSH key references
- [ ] Lock policy

### Epic X11 — Continuity and offline operation

- [ ] Offline-first queue and connectivity states (§35)
- [ ] Reconnection handling (§35.3)
- [ ] Suspend/resume (§36.1)
- [ ] Crash recovery (§36.2)
- [ ] Session restore
- [ ] Safe Mode (§45)

### Epic X12 — Privacy and support

- [ ] Data lifecycle and privacy map (§37)
- [ ] Deletion verification (§37.2)
- [ ] Telemetry consent (§38.1–38.2)
- [ ] Crash reporting (§38.3)
- [ ] Support bundle (§38.4)

### Epic X13 — Internationalization and guidance

- [ ] Localization (§40.1)
- [ ] Input methods (§40.2)
- [ ] Help Hub (§41.1)
- [ ] Context help (§41.2)
- [ ] Guided troubleshooter (§41.3)

### Epic X14 — Media, notifications, and special modes

- [ ] Screenshot center (§42.1)
- [ ] Recording (§42.2)
- [ ] Voice notes (§42.3)
- [ ] Notification policy and interruption management (§43)
- [ ] Presentation mode (§46.1)
- [ ] Kiosk architecture (§46.2)
- [ ] Application sandbox and policy (§47)

### Epic X15 — Supply chain and production hardening

- [ ] SBOM generation
- [ ] Signing (§39)
- [ ] Release provenance
- [ ] Extension verification (cross-check with X3)
- [ ] Dependency review
- [ ] Compatibility / deprecation policy
- [ ] Platform Health Overview (§49)

### Supplemental screen inventory

- [ ] All screens enumerated in supplemental §5 (Supplemental Screen Inventory) implemented and cross-referenced to the epic that owns each one — do not duplicate ND-001–ND-056.

---

## Acceptance Gates (do not declare done without these)

### Core gates (mega-prompt §40)

- [ ] **Architecture:** renderer sandboxed; preload API narrow/typed; IPC schema-validated; core operations isolated; secrets protected; migrations exist; audit exists.
- [ ] **Controller:** all 56 core screens have initial focus; primary workflows are controller-complete; no focus traps; back behavior works; disconnect/reconnect works; controller hints accurate; predictive text-entry alternatives exist.
- [ ] **AI safety:** plans inspectable; tools typed; permissions scoped; destructive actions require review; emergency stop works; cancellation works; recovery metadata accurate; prompt injection cannot elevate tools.
- [ ] **Functionality:** file ops, terminal, Git, model connections, workflows, system metrics, browser sessions are all real (not mocked); workspace state persists; recovery restores verified state.
- [ ] **UI:** 1280×800 polished; docked layouts work; empty/loading/error/offline states exist; text readable; focus visible; no clipping/overlap; no inaccessible modal; no dead navigation.
- [ ] **Quality:** typecheck, lint, tests, build, package all pass; no critical console errors; no production mocks; no known critical/high security defects; docs match implementation.

### Supplemental gates (supplemental §57)

- [ ] **Application ecosystem:** real install/update/remove/verify for Flatpak/AppImage; Steam shortcuts functional.
- [ ] **Extensions:** capability-scoped, signed, quarantined on failure; no unrestricted access granted.
- [ ] **Knowledge and memory:** scoped, inspectable, deletable; retrieval respects workspace boundaries.
- [ ] **Voice and capture:** redaction works; privacy review gates capture; no silent recording.
- [ ] **Sync and backup:** conflict resolution verified; restore tested end-to-end.
- [ ] **Devices and dock:** hot-plug verified; capability detection accurate (no fabricated sensor data).
- [ ] **Resource and scheduler:** governor enforces policy; background jobs visible in Activity.
- [ ] **Profiles and vault:** guest mode isolated; secrets never exposed to renderer/extensions.
- [ ] **Platform lifecycle:** offline core operation verified per non-negotiable §3.6; Safe Mode functional.
