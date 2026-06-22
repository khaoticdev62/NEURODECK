# NeuroDeck OS — Handoff Document

## Current state

**Epics 0–2 complete; Epics 3, 4, 5, 6, and 7 partially complete by design; the Recovery Service slice of Epic 11 is real; Epic 8's Workflow Engine is real (Agent Runtime fully deferred).** `RecoveryService` (`core/recovery/`) records a real content-snapshot checkpoint before every file overwrite; `FileService.write()` is unconditionally checkpointed. This closed Epic 7's read-only gap: Build Studio (`/build`) has real editing and save. `/recovery` and `/storage` are real Recovery Service screens. `/automations` (Workflow Library), `/automations/forge` (Workflow Forge — a controller-friendly ordered step list, not a graph canvas), and `/automations/runs/:runId` (Workflow Run Detail) are real: `tool-action` steps run through the exact same Epic 4 `ActionQueue` pipeline as a Command Palette action, `user-approval` steps genuinely pause a run pending a real human decision, `condition`/`validator` use structured comparisons (never `eval()`). Agent Runtime (§17) is deferred in full — an agent with no model to plan with would be an empty shell, confirmed with the user before starting Epic 8. Local Git plus remote operations, ND-028 Direct terminal mode, and ND-029 Command Builder remain real partial slices from Epic 6. AI generation, real LSP for non-TS/JS languages, structural code editing, Git restore/discard/force-push, other file operations (copy/move/rename/delete), AI decision/Script/Parallel/Merge/Rollback workflow node types, and the other 15 of 16 Epic 11 screens remain incomplete.

### What exists right now

```text
Neurodeck/
├── NeuroDeck_OS_Complete_Platform_Implementation_Bundle.zip   (original, untouched)
├── specs/                          (4 spec documents — source of truth)
├── docs/
│   ├── security/NDX_SECURITY_ARCHITECTURE.md
│   └── implementation/NDX_IMPLEMENTATION_LEDGER.md  (Epic 0/1/2/3/4/5 findings)
├── src/
│   ├── main/                       (window lifecycle, security baseline, real IPC)
│   │   ├── security/               (windowSecurity.ts, urlPolicy.ts + tests)
│   │   └── ipc/                    (index.ts, registerWorkspaceHandlers.ts, registerFileHandlers.ts — all Zod-validated, return NdxResult)
│   ├── preload/                    (index.ts — narrow `window.ndx` contextBridge: workspaces.*, files.*; no business logic)
│   ├── renderer/src/
│   │   ├── App.tsx                 (renders AppProviders)
│   │   ├── app/
│   │   │   ├── providers/AppProviders.tsx   (ErrorBoundary > Toast > FocusEngine > AiSafety > Workspace > DisplayMode > Router)
│   │   │   ├── error-boundaries/RootErrorBoundary.tsx
│   │   │   ├── routing/ (routes.tsx, RouterRoot.tsx, EpicBoundaryPlaceholder.tsx)
│   │   │   └── shell/ShellLayout.tsx (+ __tests__) — mounts CoreToolsBootstrap, CommandPalette, ActivityAndNotificationsOverlay, EmergencyStopOverlay, WorkspaceSwitcherOverlay globally
│   │   ├── components/
│   │   │   ├── navigation/  (SystemRail, NavigationRail + NavigationRailItem [real focus nodes], ContextPanel, ControllerHint, BottomControllerRail)
│   │   │   ├── overlays/    (Modal [closes on real `back` action], ConfirmationDialog, CriticalConfirmationDialog, Toast [+ history/mute] + __tests__)
│   │   │   ├── feedback/UXState.tsx (Empty/Error/Offline/Restricted states)
│   │   │   └── primitives/  (ControllerButton [ref-forwarding], StatusBadge, cn)
│   │   ├── controller/
│   │   │   ├── adapters/    (controllerAction.ts, gamepadAdapter.ts + gamepadPolling.ts [pure], keyboardAdapter.ts [+ editable-target guard] + __tests__)
│   │   │   ├── focus/       (FocusRegistry.ts, focusGeometry.ts, focusTypes.ts, FocusEngineProvider.tsx [+ onAction, haptics], useFocusable.ts, useFocusEngine.ts + __tests__)
│   │   │   ├── haptics/     (hapticsService.ts [+ capability guard], hapticPatterns.ts + __tests__)
│   │   │   ├── mappings/    (standardGamepadMapping.ts, keyboardMapping.ts, controllerGlyphs.ts)
│   │   │   └── testing/     (testAdapter.ts, FocusDebugOverlay.tsx [dev-only])
│   │   ├── ai-safety/        (contracts/plan.ts, contracts/permission.ts, ToolRegistry.ts, PermissionBroker.ts, AuditLog.ts, ActionQueue.ts, AiSafetyProvider.tsx, useAiSafety.ts, useActionQueueRecords.ts, CoreToolsBootstrap.tsx, tools/resetHapticsIntensityTool.ts + __tests__)
│   │   ├── features/
│   │   │   ├── onboarding/  (FirstRunWelcome.tsx, ControllerCalibration.tsx, useControllerActionLog.ts + __tests__)
│   │   │   ├── home/        (HomeCommandCenter.tsx + __tests__)
│   │   │   ├── command-palette/ (CommandPalette.tsx [Screens + Tools domains], CommandPaletteResultRow.tsx, CommandPaletteToolRow.tsx + __tests__)
│   │   │   ├── activity/    (ActivityCenter.tsx, NotificationCenter.tsx, ActivityAndNotificationsOverlay.tsx + __tests__)
│   │   │   ├── ai-canvas/   (ExecutionTimeline.tsx, EmergencyStopOverlay.tsx + __tests__)
│   │   │   ├── approvals/   (ApprovalQueue.tsx + __tests__)
│   │   │   └── workspaces/  (WorkspaceContext.ts, useWorkspaces.ts, WorkspaceProvider.tsx, WorkspaceHub.tsx, WorkspaceDetail.tsx, WorkspaceSwitcherOverlay.tsx, FileManager.tsx, FilePreview.tsx + __tests__)
│   │   ├── services/ipc/    (ndxBridge.ts, workspaceClient.ts, fileClient.ts + __tests__ — typed wrappers over `window.ndx`)
│   │   ├── state/           (displayMode.tsx, displayModeContext.ts, useDisplayMode.ts)
│   │   └── __tests__/App.test.tsx, testUtils.tsx (shared renderWithProviders helper, now wraps WorkspaceProvider too)
│   ├── shared/contracts/            (error.ts, workspace.ts, file.ts, ipcChannels.ts, bridge.ts, index.ts — real, no longer placeholder)
│   └── core/
│       ├── persistence/JsonStore.ts (+ __tests__ — real temp-dir tests, atomic write)
│       ├── workspaces/WorkspaceStore.ts (+ __tests__)
│       ├── files/FileService.ts (+ __tests__ — real symlink-escape test)
│       ├── git/GitService.ts (+ __tests__ — real temporary-repository and real bare-remote tests)
│       ├── terminal/TerminalService.ts, TerminalPathPolicy.ts (+ __tests__ — real PTY, real path-traversal/symlink rejection)
│       ├── recovery/RecoveryService.ts (+ __tests__ — real checkpoints, real snapshot files, real retention/pruning)
│       └── workflows/WorkflowStore.ts, WorkflowRunStore.ts (+ __tests__ — real versioned definitions, real run history)
│   (renderer) workflows/ — WorkflowEngine, evaluateCondition, WorkflowRunnerProvider/Context + __tests__
│   (renderer) features/workflows/ — WorkflowLibrary, WorkflowForge, WorkflowRunDetail + __tests__
│   (renderer) features/build-studio/ — ProjectTree, CodeEditor (Monaco, now editable+savable), DiagnosticsPanel, SymbolNavigator, BuildStudio, useOpenFiles, detectLanguage, monacoWorkers + __tests__
│   (renderer) features/recovery/ — RecoveryTimeline.tsx (ND-052+ND-053), StorageAndRecovery.tsx (ND-047) + __tests__
│       (agents/audit/browser/models/permissions/remote/system/workflows — still empty; the AI safety pipeline lives in src/renderer/src/ai-safety/ for now, see ledger)
├── e2e/app.spec.ts                 (Playwright Electron boot smoke test — asserts shell roles)
├── electron.vite.config.ts, tsconfig*.json, vitest.config.mts, playwright.config.ts
├── package.json                    (scripts: typecheck, lint, test, test:e2e, build, build:linux/win/mac)
├── CLAUDE.md / IMPLEMENTATION_CHECKLIST.md / HANDOFF.md
```

**Validation, all currently green:**

```bash
npm run typecheck   # 0 errors
npm run lint         # 0 errors, 0 warnings
npm run test         # 287/287 unit tests passing across 59 files
npm run build        # electron-vite build succeeds (current bundle evidence in implementation ledger)
npm run test:e2e     # 1/1 Playwright Electron smoke test passing
```

## What to do next

1. **Epic 8's Workflow Engine landed; Agent Runtime is fully deferred to Epic 9.** An agent with no model to plan with would be an empty shell — confirmed this split with the user before starting. When Epic 9's Model Router lands, building Agent Runtime (§17, ND-016, ND-017) and the workflow engine's AI decision node type are the natural next steps that depend on it.
2. **The Workflow Engine is sequential, not an arbitrary DAG** (see scope note in `shared/contracts/workflow.ts`). Script, Parallel branch, Merge, and Rollback node types are deferred — Script needs a new headless (non-interactive) terminal-execution primitive (the existing `TerminalService` is built for live PTY sessions); Parallel/Merge/Rollback need the full graph model this slice doesn't build. Don't add these without expanding the run model first.
3. **Recovery Service (Epic 11 slice) landed, and it closed Epic 7's read-only gap.** Build Studio now has real editing and save. The other 15 of 16 Epic 11 items (System Metrics, Dashboard, Controller Settings, Display/Theme, Network/VPN, Privacy, Integrations, Updates, Quick Access full build, Power Menu, Error Recovery, About/Diagnostics) remain deferred — each needs its own service this slice didn't build.
4. **Any new file-write feature must go through `RecoveryService.recordCheckpoint()` before `FileService.write()`, every time.** Follow the orchestration pattern in `registerFileHandlers.ts`'s `fileWrite` handler (read previous content → checkpoint → write) — don't add a second write path that skips this.
5. **Copy/move/rename/delete/compress/extract/secure-delete (Epic 5) and Git restore/discard/force-push/branch-delete (Epic 6) are still deferred** — each needs its own recovery-checkpoint shape (a move/delete isn't the same kind of event as a content overwrite); the `RecoveryService` built this slice is scoped to `file-write` events only.
6. **Git Service remote operations (fetch/pull/push/stash/conflict detection) landed in Epic 6.** Remaining Git gaps: restore/discard, force push, branch create/delete, AI commit-message assistance, and a merge-conflict resolution UI (status reports conflicts via `hasConflicts`; there is no in-app merge tool yet — resolve via the terminal or an external tool).
7. AI intent-to-command proposals remain blocked on Epic 9's real model router. Return to ND-028 History/Split/Remote only with real supporting services; do not fabricate them.
8. Do not mark Git Service or ND-025 complete until restore/discard, force push, branch create/delete, pull requests, recovery branches, and a real conflict-resolution UI are real and tested. Do not mark Build Studio or ND-022 complete until structural edits and predictive editing are real and tested (saving is now real). Do not mark Epic 8 complete until Agent Runtime and the deferred workflow node types are real and tested.
9. Alternatively, **finish more of Epic 3/4's deferred screens** if a dependency becomes available sooner (e.g. if Epic 9's Model Router lands out of order, ND-013 AI Command Canvas and ND-005 AI Provider Setup both become buildable).
10. Keep `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` current as each epic lands — it's not a one-time artifact.
11. **Phase A (core, Epics 0–12) must fully land before Phase B (platform completion, Epics X1–X15) begins.** Explicit instruction from `specs/START_HERE_NeuroDeck_OS_Complete_Platform.md`.
12. Record every story using the Story Completion Template (mega-prompt §38) or Supplemental Story Completion Contract (supplemental §56), and check it against the Acceptance Gates in `IMPLEMENTATION_CHECKLIST.md` before marking anything done.
13. **Read the Epic 2 ledger entry's "A real, production-relevant bug found and fixed" section before building more components that register refs with external libraries** — `react-router`'s `Link` churns its ref on every render, and anything that treats ref-detach as "this really unmounted" needs the same microtask-deferral pattern `FocusRegistry.unregister()` uses.
14. **`HapticsService` and `GamepadAdapter` both guard against `navigator.getGamepads` not existing** — apply the same `typeof navigator.getGamepads === 'function'` check to any new Gamepad API consumer.
15. **The typed IPC layer pattern is now established** (`shared/contracts/` → `src/main/ipc/` → `src/preload/index.ts`'s `window.ndx` → `src/renderer/src/services/ipc/`) — follow it for every new main-process-needing tool/service rather than inventing a new shape. Add new methods to the `NdxBridge` interface in `shared/contracts/bridge.ts` and new channel names to `ipcChannels.ts`.
16. **Any new fetch-on-mount effect must avoid `react-hooks/set-state-in-effect`** — don't call a function (or inline code) that sets state synchronously before its first `await` directly in an effect body; either inline the fetch so all `setState` calls are inside the `.then()`/await continuation, or seed the initial state from props/dependencies instead of imperatively flipping it back in the effect, or give the state a new-object-reference field (e.g. a nonce) instead of nulling it out. This lint rule's static analysis doesn't reliably trace through `useCallback`-wrapped async functions called from an effect — when in doubt, inline the fetch. See the Epic 5, Epic 7, and Epic 11 ledger entries' "A real bug found and fixed" sections for real examples (`WorkspaceProvider`, `FileManager`, `FilePreview`, `BuildStudio`'s reveal-line effect, `RecoveryTimeline`'s mount fetch).
17. **Monaco Editor must stay locally bundled, never CDN-loaded** — `loader.config({ monaco })` in `CodeEditor.tsx` is what enforces this; don't remove it. If `dompurify` (a Monaco transitive dependency) gets a new CVE, check `package.json`'s `overrides` entry first before reaching for a Monaco version bump.
18. **When testing code that submits through the real `ActionQueue`** (workflow tool-action steps, or anything else built on it), remember `submit()` parks ungranted capabilities as `pending-approval` and never auto-executes — grant the capability first in test setup (or call `queue.approve()`) if the test expects auto-execution. This is correct, intentional `ActionQueue` behavior, not a bug — see the Epic 8 ledger entry's "A real bug found and fixed" section.
19. **Steam Input / native adapter remains an open gap** — physical Steam Deck rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button aren't reachable via the standard Gamepad API. Revisit if/when that becomes a priority.

## Key open decisions (need a product/owner call before or during Epic 9 / Epic X4)

- **AI provider(s) for v1.** The spec defines a Model Router and routing profiles (mega-prompt §18) but does not mandate a specific provider. Decide which cloud and/or local model providers ship first.
- **Extension marketplace scope for v1.** Epic X3 (signed extension marketplace, SDK, CLI) is platform-completion work — confirm whether it's in scope for the first shippable release or deferred to a later milestone.
- **Distribution/packaging target confirmation.** The spec assumes SteamOS Game Mode + Desktop Mode (Epic 12). Confirm no additional Linux distro targets are required for v1.
- **Sync provider(s) for Epic X7.** Supplemental §20.3 implies pluggable sync providers; none are named. Decide default provider(s) before building the sync engine.
- **Steam Input integration priority.** Confirm whether physical rear-grip-button support (L4/L5/R4/R5, Quick Access) is required for v1 or can ship without it, given the standard Gamepad API can't reach those inputs.

## Risks and constraints to carry forward

- **No mocked completion is acceptable anywhere.** A coding agent must not report a screen, service, or epic complete based on routes, UI scaffolds, static cards, or mocked data. Completion requires real services, typed IPC, controller traversal, failure states, tests, and ledger evidence.
- **Controller-first is a hard requirement, not a stretch goal.** Every feature must be fully usable with a controller alone from the moment it ships; touch/mouse are optional accelerators only.
- **AI destructive actions always require the full review pipeline** (Intent → Plan → Policy → Permission → Review → Typed tool call → Validation → Audit → Recovery checkpoint) — this pipeline is now real (`ActionQueue`), just not yet fed by an actual AI/model.
- **Offline-first is non-negotiable** for the systems listed in supplemental §3.6 (shell nav, local workspaces, files, terminal, local Git, installed local models, local search, local workflows, controller settings, recovery, installed docs).
- The wireframe spec outranks the implementation prompts whenever they conflict — see the precedence order in `CLAUDE.md` §2.
- **Tracked, accepted risk:** `npm audit` reports 5 vulnerabilities, all confined to Vitest's dev/UI server dependency chain (devDependency only, never packaged). Revisit at the Epic 12 security pass — see `docs/security/NDX_SECURITY_ARCHITECTURE.md` §7.
- **Typed cross-process IPC (§14) is now real** (Epic 5) — `shared/contracts/`, `src/main/ipc/`, `window.ndx`. Follow this established pattern for every future main-process-needing feature.
- **Steam Input gap (Epic 2):** physical controller access to `voice`/`keyboard`/`ai.actions`/`execute` and 6 of the 9 spec'd chords requires Steam Input or a native adapter that doesn't exist yet — documented, not silently missing.
- **Epic 3's remaining deferred screens** each have a named blocking dependency (Epic 8 task runtime, Epic 9 Model Router, Epic 10 profiles/credentials) — don't build them with fabricated data.
- **Epic 4's deferred ND-013 AI Command Canvas** needs Epic 9's Model Router — same rule applies.
- **Epic 5's `write()` is real (Epic 11); copy/move/rename/delete/compress/extract remain deferred** — each needs its own recovery-checkpoint shape beyond the `file-write` kind this slice built.
- **Epic 6's deferred Git restore/discard/force-push/branch-delete** need either Git-specific recovery-event kinds (the current `RecoveryService` only handles `file-write`) or an explicit irreversibility warning surface that doesn't exist yet.
- **Epic 7's Build Studio now has real save** (Epic 11 unblocked it, confirmed with the user before building it read-only first, then extending it). Structural edits/predictive editing/voice-to-code remain deferred — those need a real code-fix provider or Epic 9's model router, not Recovery.
- **The Recovery Service slice of Epic 11 is real; the other 15 of 16 Epic 11 items are not** — don't assume System Metrics, Controller Settings, Display/Theme, Network/VPN, Privacy, Integrations, Updates, Quick Access (full build), Power Menu, Error Recovery, or About/Diagnostics exist just because "Epic 11" shows up as partially complete.
- **Epic 8's Workflow Engine is real; Agent Runtime is not.** An agent with no model to plan with would be an empty shell — confirmed with the user this would be fully deferred to Epic 9, not built as a fake shell now. ND-016 Agent Operations Center and ND-017 Agent Detail don't exist.
- **The Workflow Engine is sequential, not a graph executor** — AI decision, Script, Parallel branch, Merge, and Rollback node types are not implemented. Don't add them without first expanding the run model (currently a flat ordered list of steps) to support branching/looping/concurrency.

## Where to look for detail

- Screen-by-screen UX requirements (layout, states, controller actions): wireframe spec §8 (ND-001 through ND-056) and supplemental §5 for the additional screens.
- IPC/service contracts: mega-prompt §14, §19–§30; supplemental §50.
- AI safety pipeline: mega-prompt §15 (plan/tool schemas, planner boundaries, prompt injection), §16 (permission broker).
- Test strategy: mega-prompt §34; supplemental §52.
- Performance budgets: mega-prompt §33; supplemental §53.
- Security gates: mega-prompt §6, §40; supplemental §54, §57.
- Epic 0/1/2/3/4/5 evidence and decisions: `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`.
- Current security posture: `docs/security/NDX_SECURITY_ARCHITECTURE.md`.
