# NeuroDeck OS — Implementation Checklist

Derived directly from the Epic lists in `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` (§37) and `specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md` (§55). Work **Phase A to completion before starting Phase B**, per the bundle's `START_HERE` instruction — the supplemental phase must extend Phase A's shared services, not duplicate them.

Do not check an epic complete until every story within it satisfies the relevant Story Completion Template/Contract and the Acceptance Gates in §5 below. See `CLAUDE.md` for the non-negotiable rules that apply throughout.

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
- [x] Shell (top system rail, primary nav rail, bottom controller rail, context panel) — `src/renderer/src/app/shell/ShellLayout.tsx`
- [x] Rails (Standard / Focus / Split / Overlay / Theater display modes) — `src/renderer/src/state/displayMode.tsx` + `ShellLayout`; overlay modeled as a layering flag rather than a base mode (matches spec's "without destroying underlying state")
- [x] Global modals/overlays — `Modal`, `ConfirmationDialog`, `CriticalConfirmationDialog` (hold-to-confirm), `Toast` built. `PermissionDialog`, `InputOverlay`, `AIRadialMenu`, `ItemContextMenu`, `ModelPicker`, `WorkspacePicker` deferred to Epics 4/5/9 (feature-specific content, no consumer yet)
- [x] Error boundaries — `src/renderer/src/app/error-boundaries/RootErrorBoundary.tsx`
- [x] Route registry — `src/renderer/src/app/routing/routes.tsx` (11 primary destinations, each declaring routeId/screenId/title/owningEpic/controllerHints/restoreOnRevisit); routes render an honest `EpicBoundaryPlaceholder` until their owning epic builds the real screen
- [x] Responsive 16:10 layout — `--breakpoint-deck/docked/docked-2k` custom breakpoints in tokens.css; safe-inset and rail sizing all token-driven

### Epic 2 — Controller runtime ✅ core complete (Steam Input/native adapter and per-feature profiles deferred)

- [x] Adapters — real W3C Gamepad API adapter (`gamepadAdapter.ts`, covers Steam Deck/Xbox/DualSense/generic "standard"-mapping devices in one implementation) + keyboard fallback (`keyboardAdapter.ts`) + test-mode injection adapter (`testAdapter.ts`)
  - [ ] Steam Input adapter — **deferred**: rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button are not exposed by the standard Gamepad API; reaching them needs Steam Input or a native/SDL adapter (mega-prompt §9.1 lists both as optional). Documented gap, not a missing mapping — see ledger.
- [x] Semantic actions — full `ControllerAction` union (wireframe §4.1) normalized from raw buttons/axes/keys (`controllerAction.ts`, `gamepadPolling.ts`); 3 of 9 spec chords implemented generically (LB+RB home, LT+RT workspace.switcher, Menu+B emergency.stop) — remaining 6 require grip/Quick-Access buttons unavailable via generic Gamepad API; hold behavior (700ms) implemented for non-repeatable actions, repeat delay/rate for nav/tab/pane
- [x] Spatial Focus Engine — focus node contract + registry (`FocusRegistry.ts`), deterministic directional navigation (explicit neighbor → same-group geometric → broad geometric → fallback → stay-put, wireframe §5.2), modal trap stack, focus-change pub/sub, never drops to `document.body`
  - Note: spec step 4 ("group-level transition") folded into the broad geometric search rather than implemented as a separate heuristic — documented scope simplification, see ledger
- [x] Haptics service — real `GamepadHapticActuator`/`playEffect('dual-rumble')` integration with off/low/medium/high intensity scaling and honest capability detection (`hapticsService.ts`); wired to focus-movement and selection events
- [ ] Input profile manager — **deferred**: per-controller-type button mapping exists (`standardGamepadMapping.ts`) and controller-glyph adaptation exists (`controllerGlyphs.ts`), but no user-facing remapping/profile-switching UI yet (that's ND-043 Controller Settings, Epic 11)
- [x] Focus/controller debug overlay — `FocusDebugOverlay.tsx` (dev-only), shows current focus, registered nodes, trap depth; duplicate-ID and unreachable-node detection from the full §10.3 list deferred (`Map`-backed registration makes duplicates silently overwrite rather than collide — needs separate instrumentation)
- [x] Focus traversal tests — `FocusRegistry.test.ts` (11), `gamepadPolling.test.ts` (9), `keyboardAdapter.test.ts` (8), `hapticsService.test.ts` (7), plus live integration via `NavigationRailItem` (real focus nodes registered) and `Modal.focusEngine.test.tsx` (controller `back` closes a real modal)

### Epic 3 — Onboarding and global UX ⚠️ partially complete (6 of 12 screens real; 6 deferred — see ledger)

- [ ] ND-001 Boot and Session Start — **deferred**: status items (restoring workspace, checking model runtime) need services from Epics 5/9; building it now would be 3-of-4 fake checks
- [ ] ND-002 Lock Screen — **deferred**: needs profile/credential system (Epic 10) and workflow-pause state (Epic 8)
- [x] ND-003 First-Run Welcome — `features/onboarding/FirstRunWelcome.tsx`; purely informational, no backend dependency
- [x] ND-004 Controller Calibration — `features/onboarding/ControllerCalibration.tsx`; button detection and haptics intensity are real (Epic 2 runtime); dead zone/hold duration shown as real read-only values, not fake sliders (adjustability deferred to Epic 11)
- [ ] ND-005 AI Provider Setup — **deferred**: needs Model Router (Epic 9) and secure secret storage (Epic 4/10); a form that can't actually connect to anything would be fake
- [ ] ND-006 Workspace Discovery — **partially real as of Epic 5**: the manual native folder picker (`WorkspaceHub`) is real; multi-source scanning (Git repos, Steam library, SSH hosts, removable storage) still needs those respective services (Epic 6/10)
- [ ] ND-007 Guided Controller Tutorial — **deferred**: only 2 of 7 lessons (move focus, open/back) have real backing today; the rest need AI plans/approval (Epic 4) and task pause/resume (Epic 8)
- [x] ND-008 Home Command Center — `features/home/HomeCommandCenter.tsx`; renders the spec's own defined Empty State ("Create or discover a workspace") since zero workspaces genuinely exist; Continue/Pinned/Recommendations modules wait for Epic 5/8
- [x] ND-009 Universal Command Palette — `features/command-palette/CommandPalette.tsx`; real, modal-trapped, searches the real route registry ("Screens" domain only — files/workspaces/workflows/agents/settings domains wait for their owning epics)
- [ ] ND-010 Global Search — **deferred**: zero real content sources exist (files/conversations/tasks/logs/browser history/learning content all need unbuilt services); would be a pure empty shell
- [x] ND-011 Activity Center — `features/activity/ActivityCenter.tsx`; real categories, honest empty state (no action queue/agent runtime exists yet — Epic 4/8)
- [x] ND-012 Notification Center — `features/activity/NotificationCenter.tsx`; extends the real `ToastProvider` (Epic 1) with persistent history, per-category muting, and event collapsing — all genuinely functional
- [ ] Quick overlay foundation — still deferred to Epic 11 (full ND-050 build)

### Epic 4 — AI safety runtime ⚠️ core pipeline complete; AI Command Canvas and typed cross-process IPC deferred (see ledger)

- [x] Plan schema (mega-prompt §15.1) — `ai-safety/contracts/plan.ts` (`ActionPlan`, `ActionStep`, `ImpactSummary`, etc.)
- [x] Typed tool call schema and registry — `ai-safety/contracts/plan.ts` (`HarnessAction`) + `ai-safety/ToolRegistry.ts`; invocation must match a registered tool, no arbitrary-string path. §14's full cross-process typed-IPC layer is **deferred** — the one real tool today is renderer-only (no fs/exec needed), so there's no real cross-process tool yet to justify building the IPC contract layer; revisit when Epic 5/6 add tools that need main-process access.
- [x] Permission broker (§16) — `ai-safety/PermissionBroker.ts`; real evaluate/grant/revoke/once-consumption, scoped (once/session/workspace/persistent)
- [ ] ND-013 AI Command Canvas — **deferred**: no model/planner exists (Epic 9) to turn natural-language intent into a plan; building the screen now would mean fabricating "AI" plan proposals
- [x] ND-014 AI Execution Timeline — `features/ai-canvas/ExecutionTimeline.tsx`; real lifecycle tracking (queued/running/passed/failed/cancelled) of actually-submitted actions, with real cancel
- [x] ND-015 Approval Queue — `features/approvals/ApprovalQueue.tsx`; real pending `HarnessActionRecord`s, approve/deny wired to the real broker+queue
- [x] ND-054 Emergency Stop — `features/ai-canvas/EmergencyStopOverlay.tsx`; real toggle on the `emergency.stop` action (Menu+B/F1, wired in Epic 2), pauses the queue and cancels pending actions for real. Spec's "Terminate safe processes"/"Explain" buttons omitted — no safe/unsafe process classification or explain feature exists without a terminal (Epic 6) or agent runtime (Epic 8)
- [x] Audit service — `ai-safety/AuditLog.ts`; real append-only log, in-memory only (durable persistence needs Epic 5)
- [ ] Prompt-injection resistance verified (§15.4) — **deferred**: nothing untrusted is ingested yet (no browser/terminal/file content pipelines exist — Epics 5/6/10); moot until there's untrusted content to defend against
- **New real tool**: `ai-safety/tools/resetHapticsIntensityTool.ts`, registered via `CoreToolsBootstrap.tsx`, reachable from the Command Palette's new "Tools" domain — demonstrates the full registry → permission → approval → execution → audit pipeline end to end with a genuinely real, low-risk, reversible action

### Epic 5 — Workspaces and files ⚠️ read-only by design; destructive file ops wait for Recovery Service (see ledger)

- [x] Typed cross-process IPC contracts (§14) — `shared/contracts/{error,workspace,file,ipcChannels,bridge}.ts`; Zod-validated request/response schemas, normalized `NdxError`/`NdxResult`. This is the trigger Epic 4's ledger flagged ("revisit when Epic 5/6 add tools that need main-process access") — real now because workspace persistence and file access both need Node's `fs`/main process.
- [x] Workspace Service (persistence, §19) — `core/workspaces/WorkspaceStore.ts` on top of `core/persistence/JsonStore.ts`; real create (verifies the folder exists via `fs.stat`)/list/remove/get, persisted to `app.getPath('userData')`
- [ ] Workspace discovery (ND-006 real backend, full version) — **deferred**: only the manual native folder picker is real; Git repos/Steam library/SSH hosts/removable storage scanning still need those respective services (Epic 6/10)
- [x] ND-018 Workspace Hub — `features/workspaces/WorkspaceHub.tsx`; real cards, real native folder picker via `dialog.showOpenDialog`
- [x] ND-019 Workspace Detail — `features/workspaces/WorkspaceDetail.tsx`; Overview + Files + local Git tabs real; Sessions/Tasks/Models/Permissions/Environment/History deferred (need Epic 8/9/10 services)
- [x] ND-020 Workspace Switcher — `features/workspaces/WorkspaceSwitcherOverlay.tsx`; opens on the real `workspace.switcher` action (LT+RT chord, wired in Epic 2), switches the real active workspace
- [x] File Service (§20) — `core/files/FileService.ts`; real `list`/`read`, path-traversal protection via `fs.realpath` (catches symlink escapes, not just literal `../`, verified with a real symlink in tests). Write/copy/move/rename/delete/compress/extract/secure-delete **deferred** — every one is destructive and needs the Recovery Service (Epic 11) first
- [x] ND-026 File Manager — `features/workspaces/FileManager.tsx`; real workspace-scoped directory listing, breadcrumb navigation, read-only
- [x] ND-027 File Preview — `features/workspaces/FilePreview.tsx`; real text/code preview with truncation notice over 256 KB; images/PDF/audio/video/archive/diff deferred (each needs its own renderer)
- [ ] Recovery integration (checkpoints on file ops) — **deferred**: no destructive operations exist yet to checkpoint; revisit with Epic 11

### Epic 6 — Terminal and Git

- [ ] Terminal Service / PTY (§21) — **partially real**: `node-pty` local shells, multiple workspace-scoped sessions, resize, streaming output, bounded snapshots, cancellation, exit status, working directory, sanitized inherited environment, and typed IPC are real; history/search/copy selection/SSH/proposals/Command Builder/intent mode remain
- [ ] ND-028 Universal Terminal — **partially real**: `/terminal` Direct mode uses xterm.js over real PTY sessions with controller-focusable create/select/focus/terminate controls, resize, ordered streaming, exit state, workspace/branch context, and reviewed termination; Command Builder/Intent/History/Split/Remote modes and AI suggestions remain
- [ ] ND-029 Command Builder
- [ ] AI intent-to-command proposals (reviewed, not auto-executed)
- [ ] Git Service (§22) — **partially real**: repository detection, status, diff, stage, unstage, commit, local branch list/checkout, and log are implemented through typed IPC; fetch/pull/push/restore/stash/conflict detection/remote inspection remain
- [ ] ND-025 Git Control Center — **partially real**: dedicated `/git` route with working tree, staged changes, exact diff preview, editable/reviewed local commit, branches, and commit history; remotes, pull requests, recovery branches, AI commit assistance, and push review remain
- [x] Diff views — `features/git/GitDiffViewer.tsx`; read-only unified diff for staged, unstaged, and untracked files with safe text rendering and controller-selectable file rows
- [ ] Git recovery branches

### Epic 7 — Build Studio

- [ ] ND-021 Build Studio shell/modes
- [ ] ND-022 Code Editor
- [ ] LSP integration
- [ ] ND-023 Symbol Navigator
- [ ] ND-024 Diagnostics and Problems
- [ ] Predictive editing
- [ ] Controller-native structural edits (§12 editor requirements)
- [ ] Editor tests

### Epic 8 — Agents and workflows

- [ ] Agent Runtime (§17)
- [ ] ND-016 Agent Operations Center
- [ ] ND-017 Agent Detail
- [ ] ND-032 Workflow Library
- [ ] ND-033 Workflow Forge (graph canvas, node types)
- [ ] Workflow Runtime / Workflow Engine (§25)
- [ ] Dry-run support
- [ ] Checkpoints
- [ ] ND-034 Workflow Run Detail

### Epic 9 — Models

- [ ] Model Router (§18)
- [ ] Provider adapters (§18.3)
- [ ] Local model runtime
- [ ] ND-037 Routing Profiles
- [ ] Resource-aware model selection
- [ ] ND-035 Model Control Center
- [ ] ND-036 Model Detail

### Epic 10 — Browser, remote, learning

- [ ] Browser Session Service (§24)
- [ ] ND-030 Browser Hub
- [ ] ND-031 Browser View
- [ ] Remote Systems Service (§26)
- [ ] ND-040 Remote Systems
- [ ] ND-041 Remote Session
- [ ] ND-038 Learning Hub
- [ ] ND-039 Guided Lab (with AI coach boundaries)

### Epic 11 — System integration

- [ ] System Metrics Service (real metrics, §27)
- [ ] ND-042 System Dashboard
- [ ] ND-043 Controller Settings
- [ ] ND-044 Display and Theme Settings
- [ ] ND-045 Network and VPN
- [ ] ND-046 Privacy and Permissions
- [ ] ND-047 Storage and Recovery
- [ ] ND-048 Integrations
- [ ] ND-049 Updates
- [ ] ND-050 Quick Access Overlay (full build)
- [ ] ND-051 Power Menu
- [ ] ND-052 Recovery Timeline
- [ ] ND-053 Before/After Diff
- [ ] ND-055 Error Recovery
- [ ] ND-056 About and Diagnostics

### Epic 12 — Packaging and hardening

- [ ] SteamOS packaging (Game Mode + Desktop Mode)
- [ ] Suspend/resume behavior
- [ ] Controller disconnect/reconnect handling
- [ ] Performance pass (§33 budgets)
- [ ] Security pass
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
