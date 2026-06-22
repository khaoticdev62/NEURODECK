# NeuroDeck OS — Handoff Document

## Current state

**Epics 0–2 complete; Epic 3 partially complete** (6 of 12 onboarding/global-UX screens are real and shipped; 6 are explicitly deferred behind documented backend dependencies — see `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`'s Epic 3 "Scope decision"). The app has a real Gamepad API + keyboard input layer, a working Spatial Focus Engine, haptics, and now real screens: First-Run Welcome, Controller Calibration, Home Command Center, Universal Command Palette, Activity Center, and Notification Center.

### What exists right now

```text
Neurodeck/
├── NeuroDeck_OS_Complete_Platform_Implementation_Bundle.zip   (original, untouched)
├── specs/                          (4 spec documents — source of truth)
├── docs/
│   ├── security/NDX_SECURITY_ARCHITECTURE.md
│   └── implementation/NDX_IMPLEMENTATION_LEDGER.md  (Epic 0/1/2/3 findings)
├── src/
│   ├── main/                       (window lifecycle, security baseline)
│   │   └── security/               (windowSecurity.ts, urlPolicy.ts + tests)
│   ├── preload/                    (narrow contextBridge, no business logic)
│   ├── renderer/src/
│   │   ├── App.tsx                 (renders AppProviders)
│   │   ├── app/
│   │   │   ├── providers/AppProviders.tsx   (ErrorBoundary > Toast > FocusEngine > DisplayMode > Router)
│   │   │   ├── error-boundaries/RootErrorBoundary.tsx
│   │   │   ├── routing/ (routes.tsx, RouterRoot.tsx, EpicBoundaryPlaceholder.tsx)
│   │   │   └── shell/ShellLayout.tsx (+ __tests__) — mounts CommandPalette + ActivityAndNotificationsOverlay globally
│   │   ├── components/
│   │   │   ├── navigation/  (SystemRail, NavigationRail + NavigationRailItem [real focus nodes], ContextPanel, ControllerHint, BottomControllerRail)
│   │   │   ├── overlays/    (Modal [closes on real `back` action], ConfirmationDialog, CriticalConfirmationDialog, Toast [+ history/mute] + __tests__)
│   │   │   ├── feedback/UXState.tsx (Empty/Error/Offline/Restricted states)
│   │   │   └── primitives/  (ControllerButton [now ref-forwarding], StatusBadge, cn)
│   │   ├── controller/
│   │   │   ├── adapters/    (controllerAction.ts, gamepadAdapter.ts + gamepadPolling.ts [pure], keyboardAdapter.ts [+ editable-target guard] + __tests__)
│   │   │   ├── focus/       (FocusRegistry.ts, focusGeometry.ts, focusTypes.ts, FocusEngineProvider.tsx [+ onAction, haptics], useFocusable.ts, useFocusEngine.ts + __tests__)
│   │   │   ├── haptics/     (hapticsService.ts [+ capability guard], hapticPatterns.ts + __tests__)
│   │   │   ├── mappings/    (standardGamepadMapping.ts, keyboardMapping.ts, controllerGlyphs.ts)
│   │   │   └── testing/     (testAdapter.ts, FocusDebugOverlay.tsx [dev-only])
│   │   ├── features/
│   │   │   ├── onboarding/  (FirstRunWelcome.tsx, ControllerCalibration.tsx, useControllerActionLog.ts + __tests__)
│   │   │   ├── home/        (HomeCommandCenter.tsx + __tests__)
│   │   │   ├── command-palette/ (CommandPalette.tsx, CommandPaletteResultRow.tsx + __tests__)
│   │   │   └── activity/    (ActivityCenter.tsx, NotificationCenter.tsx, ActivityAndNotificationsOverlay.tsx + __tests__)
│   │   ├── state/           (displayMode.tsx, displayModeContext.ts, useDisplayMode.ts)
│   │   ├── services/        (still empty ownership dir — Epic 4+)
│   │   └── __tests__/App.test.tsx, testUtils.tsx (shared renderWithProviders helper)
│   ├── shared/                     (contracts/schemas/errors/constants/types — empty, Epic 4+)
│   └── core/                       (actions/permissions/models/... — empty, Epic 4+)
├── e2e/app.spec.ts                 (Playwright Electron boot smoke test — asserts shell roles)
├── electron.vite.config.ts, tsconfig*.json, vitest.config.mts, playwright.config.ts
├── package.json                    (scripts: typecheck, lint, test, test:e2e, build, build:linux/win/mac)
├── CLAUDE.md / IMPLEMENTATION_CHECKLIST.md / HANDOFF.md
```

**Validation, all currently green:**

```bash
npm run typecheck   # 0 errors
npm run lint         # 0 errors, 0 warnings
npm run test         # 93/93 unit tests passing (was 66 at end of Epic 2)
npm run build        # electron-vite build succeeds (renderer: 26.07 kB CSS, 709.80 kB JS)
npm run test:e2e     # 1/1 Playwright Electron smoke test passing
```

## What to do next

1. **Finish Epic 3, or move to Epic 4 — your call.** The 6 deferred Epic 3 screens (ND-001, ND-002, ND-005, ND-006, ND-007, ND-010) are each blocked on a specific later epic's service (see the ledger). It's reasonable to either: (a) proceed to Epic 4 (AI safety runtime) now and circle back to finish these screens once their dependencies exist, or (b) explicitly pull a dependency forward if a deferred screen becomes a priority. Either way, don't build them with fake data to "complete" Epic 3 prematurely.
2. **Epic 4 — AI safety runtime** is next in Phase A order: plan schema, typed tool registry, permission broker, approval queue, execution timeline, emergency stop, audit. This is also what unblocks ND-005 (AI Provider Setup) and most of ND-007 (Guided Controller Tutorial).
3. Keep `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` current as each epic lands — it's not a one-time artifact.
4. **Phase A (core, Epics 0–12) must fully land before Phase B (platform completion, Epics X1–X15) begins.** Explicit instruction from `specs/START_HERE_NeuroDeck_OS_Complete_Platform.md`.
5. Record every story using the Story Completion Template (mega-prompt §38) or Supplemental Story Completion Contract (supplemental §56), and check it against the Acceptance Gates in `IMPLEMENTATION_CHECKLIST.md` before marking anything done.
6. **Read the Epic 2 ledger entry's "A real, production-relevant bug found and fixed" section before building more components that register refs with external libraries** — `react-router`'s `Link` churns its ref on every render, and anything that treats ref-detach as "this really unmounted" needs the same microtask-deferral pattern `FocusRegistry.unregister()` uses.
7. **`HapticsService` and `GamepadAdapter` both now guard against `navigator.getGamepads` not existing** — if you add a third real Gamepad API consumer, apply the same `typeof navigator.getGamepads === 'function'` check rather than assuming it exists (Epic 3 caught this gap once already).
8. **Steam Input / native adapter remains an open gap** — physical Steam Deck rear grip buttons (L4/L5/R4/R5), Quick Access, and the Steam button aren't reachable via the standard Gamepad API. Revisit if/when that becomes a priority; until then `voice`/`keyboard`/`ai.actions`/`execute` only work from the keyboard fallback.

## Key open decisions (need a product/owner call before or during Epic 9 / Epic X4)

- **AI provider(s) for v1.** The spec defines a Model Router and routing profiles (mega-prompt §18) but does not mandate a specific provider. Decide which cloud and/or local model providers ship first.
- **Extension marketplace scope for v1.** Epic X3 (signed extension marketplace, SDK, CLI) is platform-completion work — confirm whether it's in scope for the first shippable release or deferred to a later milestone.
- **Distribution/packaging target confirmation.** The spec assumes SteamOS Game Mode + Desktop Mode (Epic 12). Confirm no additional Linux distro targets are required for v1.
- **Sync provider(s) for Epic X7.** Supplemental §20.3 implies pluggable sync providers; none are named. Decide default provider(s) before building the sync engine.
- **Steam Input integration priority.** Confirm whether physical rear-grip-button support (L4/L5/R4/R5, Quick Access) is required for v1 or can ship without it, given the standard Gamepad API can't reach those inputs.

## Risks and constraints to carry forward

- **No mocked completion is acceptable anywhere.** A coding agent must not report a screen, service, or epic complete based on routes, UI scaffolds, static cards, or mocked data. Completion requires real services, typed IPC, controller traversal, failure states, tests, and ledger evidence.
- **Controller-first is a hard requirement, not a stretch goal.** Every feature must be fully usable with a controller alone from the moment it ships; touch/mouse are optional accelerators only.
- **AI destructive actions always require the full review pipeline** (Intent → Plan → Policy → Permission → Review → Typed tool call → Validation → Audit → Recovery checkpoint).
- **Offline-first is non-negotiable** for the systems listed in supplemental §3.6 (shell nav, local workspaces, files, terminal, local Git, installed local models, local search, local workflows, controller settings, recovery, installed docs).
- The wireframe spec outranks the implementation prompts whenever they conflict — see the precedence order in `CLAUDE.md` §2.
- **Tracked, accepted risk:** `npm audit` reports 5 vulnerabilities, all confined to Vitest's dev/UI server dependency chain (devDependency only, never packaged). Revisit at the Epic 12 security pass — see `docs/security/NDX_SECURITY_ARCHITECTURE.md` §7.
- **Forward note for Epic 4:** the preload bridge currently exposes `@electron-toolkit/preload`'s generic IPC wrapper (unused by any feature). It must be replaced by typed, Zod-validated contracts before any IPC-using feature ships — don't let it become a back door for ad hoc channels.
- **Steam Input gap (Epic 2):** physical controller access to `voice`/`keyboard`/`ai.actions`/`execute` and 6 of the 9 spec'd chords requires Steam Input or a native adapter that doesn't exist yet — documented, not silently missing.
- **Epic 3's 6 deferred screens** each have a named blocking dependency (Epic 4 typed IPC, Epic 5 Workspace Service, Epic 8 task runtime, Epic 9 Model Router, Epic 10 profiles/credentials) — don't build them with fabricated data just to mark Epic 3 "done."

## Where to look for detail

- Screen-by-screen UX requirements (layout, states, controller actions): wireframe spec §8 (ND-001 through ND-056) and supplemental §5 for the additional screens.
- IPC/service contracts: mega-prompt §14, §19–§30; supplemental §50.
- Test strategy: mega-prompt §34; supplemental §52.
- Performance budgets: mega-prompt §33; supplemental §53.
- Security gates: mega-prompt §6, §40; supplemental §54, §57.
- Epic 0/1/2/3 evidence and decisions: `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`.
- Current security posture: `docs/security/NDX_SECURITY_ARCHITECTURE.md`.
