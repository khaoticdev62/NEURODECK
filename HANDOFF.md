# NeuroDeck OS — Handoff Document

## Current state

**Epics 0–2 complete; Epics 3, 4, and 5 partially complete by design; Epic 6 active.** Local Git integration includes a dedicated partial ND-025 Git Control Center. ND-028 Universal Terminal now has a real Direct mode: lazy-loaded xterm.js over the real PTY service, multiple session switching, workspace/Git context, ordered snapshot + live output, input/resize, exit state, controller focus registration, and reviewed termination. ND-029 and advanced terminal modes remain incomplete.

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
│       ├── git/GitService.ts (+ __tests__ — real temporary-repository tests)
│       └── (agents/audit/browser/models/permissions/recovery/remote/system/terminal/workflows — still empty; the AI safety pipeline lives in src/renderer/src/ai-safety/ for now, see ledger)
├── e2e/app.spec.ts                 (Playwright Electron boot smoke test — asserts shell roles)
├── electron.vite.config.ts, tsconfig*.json, vitest.config.mts, playwright.config.ts
├── package.json                    (scripts: typecheck, lint, test, test:e2e, build, build:linux/win/mac)
├── CLAUDE.md / IMPLEMENTATION_CHECKLIST.md / HANDOFF.md
```

**Validation, all currently green:**

```bash
npm run typecheck   # 0 errors
npm run lint         # 0 errors, 0 warnings
npm run test         # 198/198 unit tests passing across 40 files
npm run build        # electron-vite build succeeds (current bundle evidence in implementation ledger)
npm run test:e2e     # 1/1 Playwright Electron smoke test passing
```

## What to do next

1. **Continue Epic 6 with ND-029 Command Builder.** Build structured, editable command proposals and integrate the existing permission/review pipeline before any generated command can execute.
2. Return to ND-028's History/Split/Remote modes only when their real supporting services are available; do not fabricate them.
3. Do not mark Git Service or ND-025 complete until fetch/pull/push/restore/stash/conflict detection/remote inspection, remotes, pull requests, and recovery branches are real and tested.
4. Alternatively, **finish more of Epic 3/4's deferred screens** if a dependency becomes available sooner (e.g. if Epic 9's Model Router lands out of order, ND-013 AI Command Canvas and ND-005 AI Provider Setup both become buildable).
5. Keep `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` current as each epic lands — it's not a one-time artifact.
6. **Phase A (core, Epics 0–12) must fully land before Phase B (platform completion, Epics X1–X15) begins.** Explicit instruction from `specs/START_HERE_NeuroDeck_OS_Complete_Platform.md`.
7. Record every story using the Story Completion Template (mega-prompt §38) or Supplemental Story Completion Contract (supplemental §56), and check it against the Acceptance Gates in `IMPLEMENTATION_CHECKLIST.md` before marking anything done.
8. **Read the Epic 2 ledger entry's "A real, production-relevant bug found and fixed" section before building more components that register refs with external libraries** — `react-router`'s `Link` churns its ref on every render, and anything that treats ref-detach as "this really unmounted" needs the same microtask-deferral pattern `FocusRegistry.unregister()` uses.
9. **`HapticsService` and `GamepadAdapter` both guard against `navigator.getGamepads` not existing** — apply the same `typeof navigator.getGamepads === 'function'` check to any new Gamepad API consumer.
10. **The typed IPC layer pattern is now established** (`shared/contracts/` → `src/main/ipc/` → `src/preload/index.ts`'s `window.ndx` → `src/renderer/src/services/ipc/`) — follow it for every new main-process-needing tool/service rather than inventing a new shape. Add new methods to the `NdxBridge` interface in `shared/contracts/bridge.ts` and new channel names to `ipcChannels.ts`.
11. **Any new fetch-on-mount effect must avoid `react-hooks/set-state-in-effect`** — don't call a function (or inline code) that sets state synchronously before its first `await` directly in an effect body; either inline the fetch so all `setState` calls are inside the `.then()`/await continuation, or seed the initial state from props/dependencies instead of imperatively flipping it back in the effect. See the Epic 5 ledger entry's "A real bug found and fixed" section for three real examples (`WorkspaceProvider`, `FileManager`, `FilePreview`).
12. **All destructive file operations remain deferred until Epic 11's Recovery Service** — when building Epic 6's terminal (which can also mutate files via shell commands) or any future file-write feature, don't bypass this; route writes through Recovery once it exists.
13. **Steam Input / native adapter remains an open gap** — physical Steam Deck rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button aren't reachable via the standard Gamepad API. Revisit if/when that becomes a priority.

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
- **Epic 5's deferred destructive file operations** (write/copy/move/rename/delete/compress/extract) all need Epic 11's Recovery Service first — don't bypass this when Epic 6's terminal makes it tempting to add ad hoc file mutation.

## Where to look for detail

- Screen-by-screen UX requirements (layout, states, controller actions): wireframe spec §8 (ND-001 through ND-056) and supplemental §5 for the additional screens.
- IPC/service contracts: mega-prompt §14, §19–§30; supplemental §50.
- AI safety pipeline: mega-prompt §15 (plan/tool schemas, planner boundaries, prompt injection), §16 (permission broker).
- Test strategy: mega-prompt §34; supplemental §52.
- Performance budgets: mega-prompt §33; supplemental §53.
- Security gates: mega-prompt §6, §40; supplemental §54, §57.
- Epic 0/1/2/3/4/5 evidence and decisions: `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`.
- Current security posture: `docs/security/NDX_SECURITY_ARCHITECTURE.md`.
