# NDX Implementation Ledger

Required by `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` §4.3. This document must stay current throughout implementation — update it as part of every epic, not just at the end of Epic 0.

---

## Repository baseline (Epic 0)

| Item                                | Finding                                                                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State before Epic 0                 | Pre-bootstrap. Only `specs/`, `CLAUDE.md`, `IMPLEMENTATION_CHECKLIST.md`, `HANDOFF.md` existed. No package manager, no source code, no git history.                   |
| Package manager                     | npm (lockfile: `package-lock.json`)                                                                                                                                   |
| Scaffold tool                       | `@quick-start/create-electron` (electron-vite's official scaffolder), template `react-ts`                                                                             |
| Electron version                    | 39.x (`^39.2.6`)                                                                                                                                                      |
| React version                       | 19.x                                                                                                                                                                  |
| TypeScript version                  | 5.9.x                                                                                                                                                                 |
| Tailwind version                    | 4.x, integrated via `@tailwindcss/vite` (no `tailwind.config.js` needed — v4 uses CSS-first config via `@import 'tailwindcss'` in `src/renderer/src/assets/base.css`) |
| Bundler/packaging                   | `electron-vite` (build) + `electron-builder` (packaging, configured for win/mac/linux targets in `electron-builder.yml`)                                              |
| Main process entry                  | `src/main/index.ts`                                                                                                                                                   |
| Preload entry                       | `src/preload/index.ts`                                                                                                                                                |
| Renderer root                       | `src/renderer/src/main.tsx` → `App.tsx`                                                                                                                               |
| Routing                             | Not yet implemented (Epic 1 — route registry)                                                                                                                         |
| State management                    | Not yet implemented (Epic 1+, `src/renderer/src/state/`)                                                                                                              |
| IPC                                 | Generic `@electron-toolkit/preload` wrapper only, unused by app code; no typed contracts yet (Epic 4)                                                                 |
| Database/storage                    | Not yet implemented (Epic 5+)                                                                                                                                         |
| Controller/gamepad support          | Not yet implemented (Epic 2)                                                                                                                                          |
| Focus management                    | Not yet implemented (Epic 2)                                                                                                                                          |
| Terminal/Git/Browser/Model services | Not yet implemented (Epics 6, 9, 10)                                                                                                                                  |
| Test frameworks                     | Vitest (unit, jsdom) + Testing Library (React) + Playwright (`@playwright/test`, Electron E2E)                                                                        |
| CI/CD                               | Not yet configured — no `.github/workflows` or equivalent exists                                                                                                      |
| SteamOS packaging                   | Not yet configured beyond electron-builder's generic linux target (Epic 12)                                                                                           |
| Security settings                   | See `docs/security/NDX_SECURITY_ARCHITECTURE.md`                                                                                                                      |
| Accessibility support               | Not yet implemented (Epic 1+, Epic 12 accessibility pass)                                                                                                             |

## Architecture findings

- The mega-prompt's `src/` ownership tree (§7) places renderer-owned folders (`app`, `controller`, `features`, `components`, `state`, `services`) directly under `src/`. electron-vite's actual build tooling expects renderer source under `src/renderer/src/` (governed by `tsconfig.web.json` and the renderer Vite config) — those folders were created under `src/renderer/src/` instead to match the real build boundary. `shared/` (contracts/schemas/errors/constants/types) was kept at the top level (`src/shared/`) since it must be importable from `main`, `preload`, and `renderer` alike, and is aliased as `@shared/*` in all three electron-vite build targets plus both tsconfigs and `vitest.config.mts`.
- **Recorded deviation from spec §7, resolved per the conflict-precedence rule in `CLAUDE.md` §2** (existing repository architecture / build tooling outranks the implementation prompt's illustrative tree when they conflict on mechanics rather than intent). The ownership boundaries and folder names are unchanged; only their position relative to `src/renderer/src/` differs.
- All ownership folders for Epics 1–12 and the `core/` service folders are scaffolded as empty directories with `.gitkeep` placeholders — intentionally inert, no logic, no fake exports.

## Security findings

See `docs/security/NDX_SECURITY_ARCHITECTURE.md` for full detail. Summary:

- **Found and fixed:** scaffold defaulted to `sandbox: false` and unconditional `shell.openExternal` for any URL — both violated the mandatory baseline (§6) and were corrected in `src/main/security/windowSecurity.ts` before any feature code was written.
- **Found and fixed:** dead non-isolated fallback branch in `src/preload/index.ts` (two `@ts-ignore` comments) — removed since `contextIsolation: true` is now mandatory and unconditional.
- **Accepted, tracked risk:** `npm audit` reports 5 vulnerabilities, all confined to the Vitest dev/UI server dependency chain (devDependency only, not packaged). Revisit at Epic 12 security pass.
- **Forward note:** the generic `@electron-toolkit/preload` IPC wrapper is wider than spec's narrow-typed-API requirement; acceptable now only because no feature code uses it. Epic 4 must replace it with typed/Zod-validated contracts before any IPC-using feature ships.

## Controller findings

Not applicable yet — no controller runtime exists (Epic 2 is the first epic that introduces it). Nothing to audit.

## Mock/stub inventory (danger-pattern search, §4.2)

Searched `mock|fake|stub|placeholder|TODO|FIXME|coming soon|setTimeout|Math\.random|sampleData|demoData|hardcoded|@ts-ignore|eslint-disable|catch \{\}|console\.log|localStorage|sessionStorage` across the repo (excluding `specs/`, `node_modules/`, `.git/`):

| Match              | File                                                     | Classification                                                                                                                       |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@ts-ignore` ×2    | `src/preload/index.ts` (pre-cleanup)                     | Dead code from scaffold's non-isolated fallback branch — **removed**, see Security findings above.                                   |
| `mock`/`fake`/etc. | `CLAUDE.md`, `IMPLEMENTATION_CHECKLIST.md`, `HANDOFF.md` | Documentation-only references (these terms appear because the docs describe the _prohibition_ on mocks). Not code. No action needed. |
| `mock`/`fake`/etc. | `package-lock.json`                                      | Dependency tree metadata (package names/descriptions containing these substrings incidentally). Not code. No action needed.          |

No production mocks, stubs, placeholders, fake data, or `console.log` statements exist in `src/` as of Epic 0 completion. This is expected and correct — no features have been built yet for there to be anything to fake.

## Screen inventory status

0 of 56 core screens (ND-001–ND-056) implemented. 0 of the supplemental screens implemented. This is expected at Epic 0 — screen work begins at Epic 1 (shell) and Epic 3 (first screens, ND-001–ND-012).

## IPC inventory

No application-defined IPC channels exist. The only IPC surface is `@electron-toolkit/preload`'s generic `electronAPI`, exposed but unused by any feature code (`window.api` is an empty object, reserved for Epic 4's typed contracts).

## Test inventory

| Suite                              | Location                                        | Count    | Status                   |
| ---------------------------------- | ----------------------------------------------- | -------- | ------------------------ |
| Unit — `urlPolicy` pure predicates | `src/main/security/__tests__/urlPolicy.test.ts` | 11 tests | Passing                  |
| Component — baseline `App` shell   | `src/renderer/src/__tests__/App.test.tsx`       | 1 test   | Passing                  |
| E2E — Electron boot smoke test     | `e2e/app.spec.ts`                               | 1 test   | Passing (see note below) |

**E2E environment note:** the sandboxed dev shell this was built in exports `ELECTRON_RUN_AS_NODE=1` globally, which forces Electron's native bootstrap into plain-Node mode for _any_ child process that inherits it — including Playwright's `_electron.launch()`. The fix (deleting the key from the env object passed to `electron.launch`, not just setting it to `''` — Electron checks for the variable's _presence_, not its value) is now baked into `e2e/app.spec.ts` itself, so the test is robust on any host, not just this one.

## Work sequence

Following `IMPLEMENTATION_CHECKLIST.md` Phase A, Epic 0 → Epic 12, then Phase B Epic X1 → X15. Epic 0 is now complete; Epic 1 (Shell and design system) is next.

## Decisions and assumptions

1. **AI provider(s), extension marketplace v1 scope, additional Linux packaging targets, sync provider(s)** — all flagged as open product decisions in `HANDOFF.md`; none block Epic 0–3 work.
2. **Renderer-owned folder placement** — see Architecture findings above; folders live under `src/renderer/src/` rather than directly under `src/` to match electron-vite's real build boundaries, preserving the spec's ownership _names_ and _boundaries_ exactly.
3. **Vitest dependency vulnerabilities accepted as a tracked, dev-only risk** rather than forcing a breaking major-version upgrade mid-baseline — see Security findings.
4. **Tailwind v4's CSS-first configuration** was used instead of a `tailwind.config.js` (v3 style) since the spec only mandates "Tailwind CSS" generically and v4 is the current stable release; design tokens will be formalized in Epic 1 §8.1 regardless of which Tailwind config style hosts them.

## Completed items with evidence

### Epic 0 — Baseline and safety

- [x] **Repository audit** — see Repository baseline table above.
- [x] **Ledger created** — this document.
- [x] **Build repair / project scaffolded and building** — evidence: `npm run build` succeeds (electron-vite builds main 2.73 kB, preload 0.42 kB, renderer with Tailwind CSS 7.36 kB + JS bundle).
- [x] **Test baseline established** — evidence: `npm run test` → 2 files, 12 tests passing; `npm run test:e2e` → 1 test passing.
- [x] **Security baseline applied** — evidence: `docs/security/NDX_SECURITY_ARCHITECTURE.md`; hardened `webPreferences` in `src/main/index.ts` via `HARDENED_WEB_PREFERENCES`; navigation/external-link allowlisting in `src/main/security/`.
- [x] **Mock/stub inventory completed** — see table above; zero production mocks found; one dead-code finding (preload fallback) fixed.
- [x] **Dead-code analysis** — preload non-isolated fallback branch removed (see Security findings); no other dead code identified (codebase is new, nothing has had a chance to rot).

**Validation evidence (all run from repo root, all green):**

```text
npm run typecheck   → tsc --noEmit (node) + tsc --noEmit (web): 0 errors
npm run lint        → eslint --cache .: 0 errors, 0 warnings
npm run test        → vitest run: 2 files, 12 tests passed
npm run build       → typecheck + electron-vite build: succeeded, 0 errors
npm run test:e2e    → playwright test: 1 passed
npm audit           → 5 vulnerabilities, all in vitest's dev-only dependency chain (accepted, tracked — see Security findings)
```

## Remaining risks

- Vitest dependency chain vulnerabilities (dev-only, tracked for Epic 12).
- `applyNavigationPolicy` lacks an integration test against a live `BrowserWindow` (only pure predicates are unit tested) — tracked for Epic 12 security pass.
- Generic (non-typed) IPC wrapper exposed but unused — must not be load-bearing for any feature before Epic 4 lands typed contracts.

## Deferred items with explicit reason

- **Typed IPC contracts, permission broker, audit log** — deferred to Epic 4; no AI runtime or tool registry exists yet to define contracts against.
- **CI/CD workflow configuration** — not part of Epic 0's defined scope (mega-prompt assigns this to Epic 12 packaging/hardening); local validation commands (`typecheck`, `lint`, `test`, `build`, `test:e2e`) are documented and passing in the meantime.

---

## Epic 1 — Shell and design system

### What was built

- **Design tokens** (`src/renderer/src/assets/tokens.css`): Tailwind v4 `@theme` block for colors/surfaces/text hierarchy/status colors/radius/shadow/type-scale/breakpoints (auto-generates matching utility classes), plus plain `:root` CSS variables for layout (safe inset, rail/panel widths, button/target sizing), motion durations, and z-index — categories that don't map to a Tailwind utility namespace. Includes `prefers-reduced-motion` and `prefers-contrast` media query overrides, and a `[data-display-mode='theater']` density multiplier consumed by `ShellLayout`.
- **Core primitives actually consumed by the shell**: `ControllerButton`, `StatusBadge`, `EmptyState`/`ErrorState`/`OfflineState`/`RestrictedState` (`components/feedback/UXState.tsx`), `Modal`, `ConfirmationDialog`, `CriticalConfirmationDialog`, `Toast`/`ToastProvider`, `SystemRail`, `NavigationRail`, `ContextPanel`, `ControllerHint`, `BottomControllerRail`.
- **Shell composition** (`app/shell/ShellLayout.tsx`): top system rail, primary nav rail, active view (`<Outlet/>`), context panel, bottom controller rail, per wireframe §3.2 default anatomy.
- **Display modes** (`state/displayMode.tsx` + `displayModeContext.ts` + `useDisplayMode.ts`): `standard`/`focus`/`split`/`theater` base modes plus a separate `overlayOpen` flag (overlay layers on top "without destroying underlying state" per spec, rather than being a fifth mutually-exclusive mode). Focus and split modes collapse the nav rail and context panel; theater mode only scales density via the token above.
- **Route registry** (`app/routing/routes.tsx`): 11 `RouteDefinition` entries (one per primary nav destination), each declaring routeId/screenId/title/owningEpic/controllerHints/restoreOnRevisit per mega-prompt §11. Routes render `EpicBoundaryPlaceholder` — an honest "ND-XXX, built in Epic N" message — rather than any screen content, since no screen implementations exist yet (Epic 3+).
- **Root error boundary** (`app/error-boundaries/RootErrorBoundary.tsx`): class-component boundary catching render errors, shown via `ErrorState` with a reset action.
- **`App.tsx`** now renders `AppProviders` (`RootErrorBoundary` → `ToastProvider` → `DisplayModeProvider` → `RouterRoot`), replacing the Epic 0 static placeholder.

### Architecture notes

- Non-component exports (context objects, hooks, data constants) were split into dedicated files (`systemRailStatus.ts`, `navigationDestinations.ts`, `defaultControllerHints.ts`, `toastContext.ts`/`useToast.ts`, `displayModeContext.ts`/`useDisplayMode.ts`) to satisfy `react-refresh/only-export-components` cleanly, rather than disabling the lint rule.
- `HashRouter` was used instead of `BrowserRouter` because the production renderer loads from `file://` (see `src/main/index.ts`), where path-based history can't resolve real filesystem routes.
- `SystemRail`'s workspace/profile/model/connection/VPN/battery/agent-activity fields render an explicit "—" unavailable state rather than fabricated data, since no backing services exist yet (Epics 5, 8, 9, 11 own that data). Only the clock is real (computed client-side). This is a deliberate application of supplemental §3.7 (no false hardware/service assumptions) one epic ahead of where it's formally introduced, because the rail had to render _something_ honest today.
- `BottomControllerRail` hints are static defaults (`[A] Open [B] Back [X] Actions [Y] Ask AI]`) since the focus engine that should drive per-element hints doesn't exist until Epic 2.

### Bugs found and fixed during implementation

- **`Modal` focus-trap effect re-ran on every parent re-render**, stealing focus back to the dialog container after each keystroke in any input inside a modal (caught by the `CriticalConfirmationDialog` typed-phrase test — typing "DELETE" only ever registered the first character). Root cause: the effect's dependency array included `onClose`, and callers pass a fresh closure every render. Fixed by reading `onClose` through a ref (synced via `useLayoutEffect`, not written during render — React 19's `react-hooks/refs` lint rule correctly flagged a same-render ref write) instead of as an effect dependency. This was a real, user-facing bug that would have broken every form-containing modal in later epics had it shipped.
- **`CriticalConfirmationDialog`'s original hold-to-confirm used a `requestAnimationFrame` polling loop** driven by `performance.now()`, which doesn't advance under Vitest's fake timers and made the 700ms hold untestable without flaky `act()` warnings. Replaced with a single `setTimeout(confirm, 700)` for the actual gating logic and a pure CSS `width`/`transition-duration` toggle for the visual fill — simpler, real, and directly testable with `vi.useFakeTimers()` + `vi.advanceTimersByTime()`.
- **Vitest never cleaned up the DOM between `it()` blocks** because `vitest.config.mts` doesn't set `test.globals: true`, so Testing Library's automatic `afterEach(cleanup)` detection never fired. Multiple tests touching the DOM in the same file (e.g. two `it()`s rendering `<App/>`) silently accumulated duplicate elements, causing ambiguous-match query failures. Fixed by adding an explicit `afterEach(cleanup)` to `vitest.setup.ts`. **This would have caused silent or confusing failures in every future test file with more than one DOM-rendering test case** — worth knowing about before writing more tests in Epic 2+.

### Test inventory additions

| Suite                                                                                                                | Location                                                            | Count |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----- |
| `Modal` (render/closed, dialog role, Escape-to-close, focus restoration)                                             | `components/overlays/__tests__/Modal.test.tsx`                      | 4     |
| `ConfirmationDialog` (required fields, confirm/cancel callbacks)                                                     | `components/overlays/__tests__/ConfirmationDialog.test.tsx`         | 2     |
| `CriticalConfirmationDialog` (no-accidental-tap, 700ms hold confirms, phrase gating)                                 | `components/overlays/__tests__/CriticalConfirmationDialog.test.tsx` | 3     |
| `Toast`/`ToastProvider` (render, manual dismiss, auto-dismiss, aria-live polite)                                     | `components/overlays/__tests__/Toast.test.tsx`                      | 4     |
| `ShellLayout` (standard anatomy, focus-mode rail collapse, theater density attribute)                                | `app/shell/__tests__/ShellLayout.test.tsx`                          | 3     |
| `App` (renders shell + home route, navigates between destinations) — rewritten from Epic 0's static-placeholder test | `__tests__/App.test.tsx`                                            | 2     |

Total: 29 tests passing (was 12 at end of Epic 0).

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 7 files, 29 tests passed
npm run build        → succeeded (renderer bundle: 23.89 kB CSS, 658.99 kB JS — Tailwind + react-router-dom added)
npm run test:e2e     → 1 passed (updated to assert banner/nav/Home-link roles instead of removed placeholder text)
```

### Deferred items with explicit reason

- **`FocusList`/`FocusGrid`/`FocusTree`/`VirtualizedFocusList`/`PaneGroup`** — deferred to Epic 2 (spatial focus engine) and Epic 7 (Build Studio split panes); building them without a real consumer would be exactly the "empty feature shell" pattern the spec forbids.
- **`PermissionDialog`/`CommandPalette`/`RadialActionMenu`/`ModelPicker`/`WorkspacePicker`** — deferred to Epics 4/5/9; each needs real data (permissions, models, workspaces) that doesn't exist yet.
- **`PredictiveInput`/`SecureInput`/`DiffViewer`/`LogViewer`/`MetricCard`/`TaskCard`/`WorkspaceCard`/`AgentCard`/`ModelCard`/`WorkflowCard`** — deferred to the epics that own the underlying data (Epics 2, 5, 6, 7, 8, 9).
- **Real `SystemRail` data wiring** (workspace/profile/model/connection/VPN/battery/agent activity) — deferred to Epics 5, 8, 9, 11 respectively; the rail's structure and "unavailable" states are final, only the data sources are pending.
- **Controller-driven `BottomControllerRail` hints** — deferred to Epic 2; hints are currently static defaults, not focus-reactive.

---

## Epic 2 — Controller runtime

### What was built

- **Semantic action layer** (`controller/adapters/controllerAction.ts`): the full `ControllerAction` union from wireframe §4.1, plus `press`/`hold`/`release` phases. Feature code only ever sees this — never raw button indices or key codes.
- **Real Gamepad API adapter** (`gamepadAdapter.ts` + pure `gamepadPolling.ts`): polls `navigator.getGamepads()` via `requestAnimationFrame`, normalizes standard-mapping buttons/axes to actions, with debouncing, 700ms hold detection, repeat delay/rate (400ms/120ms) for directional actions, a 0.35 dead zone on the left stick, and chord detection (LB+RB → home, LT+RT → workspace.switcher, Menu+B → emergency.stop) that suppresses the individual button actions while a chord is active. Real `gamepadconnected`/`gamepaddisconnected` handling drives controller-kind detection (`controllerGlyphs.ts`) for glyph adaptation.
- **Keyboard fallback adapter** (`keyboardAdapter.ts`): every action reachable from a keyboard — including the ones gated behind Steam Deck's rear grip buttons, which the standard Gamepad API can't observe at all (see below).
- **Test-mode injection adapter** (`testing/testAdapter.ts`): lets tests and the debug overlay drive the same action stream without hardware or DOM events.
- **Haptics service** (`haptics/hapticsService.ts` + `hapticPatterns.ts`): real `GamepadHapticActuator.playEffect('dual-rumble', ...)` integration, off/low/medium/high intensity scaling, honest capability detection (`isHapticsSupported`), and the full wireframe §4.4 event→pattern table (focus movement, pane boundary, selection, success, warning, destructive confirmation, invalid action, agent-approval-needed).
- **Spatial Focus Engine** (`focus/FocusRegistry.ts` + `focusGeometry.ts` + `focusTypes.ts`): focus node registration, deterministic directional navigation (explicit neighbor → same-group geometric → broad geometric → registered fallback → stay-put), modal trap stack with focus restoration to the invoker, focus-change pub/sub, and a guarantee that focus never lands on `document.body`.
- **React integration** (`focus/FocusEngineProvider.tsx`, `useFocusable.ts`, `useFocusEngine.ts`, `FocusEngineContext.ts`): wires the real adapters into the registry, exposes a generic `subscribe(action, handler)` stack for actions not routed through a focused node (`back`, `home`, `workspace.switcher`, `emergency.stop`), and a `useFocusable` hook for components to register themselves.
- **Live integration, not just infrastructure**: `NavigationRailItem` registers each of the 11 primary destinations as real focus nodes (Home gets initial focus); `Modal` subscribes to the `back` action so a real gamepad B-button press or keyboard Escape closes any open modal through the same engine.
- **Focus debug overlay** (`testing/FocusDebugOverlay.tsx`, dev-only): shows current focus, all registered nodes with group/disabled/hidden/priority, and trap depth.

### Honest scope gaps (not silently skipped — see checklist)

- **Steam Input / native adapter not built.** The standard W3C Gamepad API cannot observe Steam Deck's rear grip buttons (L4/L5/R4/R5), the Quick Access button, or the Steam button — only Steam Input or a native/SDL adapter can, and mega-prompt §9.1 lists both as _optional_. This means `voice`/`keyboard`/`ai.actions`/`execute` are reachable only via the keyboard fallback today, not from a physical controller. Revisit when/if Steam Input integration is prioritized.
- **6 of 9 spec chords not implemented.** Only the 3 reachable from standard-mapping buttons exist (LB+RB, LT+RT, Menu+B). The rest (`View+Y`, `L4+R4`, `L5+R5`, `LB+X`, `RB+X`, `Menu+View`) all involve grip/Quick-Access buttons unavailable via the generic Gamepad API — same root cause as above.
- **"Group-level transition" (wireframe §10.2 step 4) folded into the broad geometric search** rather than implemented as its own heuristic (e.g. deliberately jumping from the rightmost nav-rail item to the content pane's edge even without a perfectly-aligned candidate). The current broad search already covers the common case in testing; a dedicated heuristic can be added later if real screens expose a gap.
- **No per-controller/per-feature remapping UI.** The mapping tables (`standardGamepadMapping.ts`, `keyboardMapping.ts`) are real and complete, but there's no settings screen to customize them yet — that's ND-043 Controller Settings (Epic 11).
- **Duplicate-ID/unreachable-node detection not in the debug overlay.** `Map`-backed registration means a duplicate ID silently overwrites rather than collides, so detecting it needs separate instrumentation the overlay doesn't have yet.

### A real, production-relevant bug found and fixed

**React Router's `Link` churns its DOM ref on every render**, because it builds a fresh `mergeRefs(forwardedRef, prefetchRef)` closure inline in its render body (confirmed by reading `node_modules/react-router/dist/development/chunk-4ZMWKKQ3.mjs`) rather than memoizing it. `useFocusable`'s ref callback was itself perfectly stable, but `Link`/`NavLink` detaching and reattaching it on _every_ render — even when nothing structural changed — meant `FocusRegistry.unregister()` ran on every render of every nav item. Because `unregister()` reassigned focus immediately when the currently-focused node detached, and that reassignment's resulting state update re-rendered the _next_ node (whose `Link` ref then churned the same way), the whole nav rail cascaded through a refocus loop forever, tripping React's "Maximum update depth exceeded" guard on the very first render of `ShellLayout`/`App` after `NavigationRail` was wired to the focus engine.

**Fix:** `FocusRegistry.unregister()` now defers the "is this node still gone" check to a microtask (`queueMicrotask`). If the same ID gets re-registered before that microtask runs — which is exactly what happens on ref churn, since the new ref attaches synchronously right after the old one detaches in the same commit — the deferred reassignment is skipped entirely. A real removal (actual unmount) has no synchronous re-registration, so the deferred logic still runs normally. Covered by a new regression test (`'does not reassign focus when the node is re-registered before the microtask runs'`).

This was caught entirely by the test suite (`ShellLayout.test.tsx`, `App.test.tsx`) before ever reaching a real browser — would have been a hard crash-on-load in production with zero indication of cause beyond a generic React error.

### Test inventory additions

| Suite                                                                                                                      | Location                                                   | Count |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----- |
| `FocusRegistry` (navigation priority order, sibling transfer, trap stack, ref-churn cancellation, activate/context/assist) | `controller/focus/__tests__/FocusRegistry.test.ts`         | 11    |
| `processGamepadFrame` (press/hold/release, repeat, dead zone, chord detection)                                             | `controller/adapters/__tests__/gamepadPolling.test.ts`     | 9     |
| `KeyboardAdapter` (press/release/hold, native-repeat forwarding rules)                                                     | `controller/adapters/__tests__/keyboardAdapter.test.ts`    | 8     |
| `HapticsService`/`isHapticsSupported` (capability detection, intensity scaling/muting)                                     | `controller/haptics/__tests__/hapticsService.test.ts`      | 7     |
| `Modal` + `FocusEngineProvider` integration (`back` action closes a real modal, unrelated actions don't)                   | `components/overlays/__tests__/Modal.focusEngine.test.tsx` | 2     |

Total: 64 tests passing after the FocusRegistry/adapter/haptics suites (66 once the Modal integration tests are included) — was 29 at end of Epic 1.

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 12 files, 66 tests passed
npm run build        → succeeded (renderer bundle: 25.52 kB CSS, 682.23 kB JS)
npm run test:e2e     → 1 passed
```

### Deferred items with explicit reason

- **Steam Input / native (SDL) adapter** — optional per mega-prompt §9.1; revisit if/when physical rear-grip-button support is prioritized.
- **Remaining 6 of 9 chords, per-controller/per-feature remapping UI** — gated behind the same Steam Input gap, or behind a settings screen that doesn't exist until Epic 11.
- **`FocusList`/`FocusGrid`/`FocusTree`/`VirtualizedFocusList`** — still no consumer; the registry underneath them is real and tested, but the list-specific UI primitives wait for the epics that render actual lists (Epic 5+).
- **Group-level-transition heuristic** — current broad geometric search is a working substitute; a dedicated heuristic is deferred until a real screen demonstrates the gap.

---

## Epic 3 — Onboarding and global UX

### Scope decision (read this before assuming a screen is "missing")

The spec assigns 12 screens (ND-001 through ND-012) to this epic, but half of them require backend services owned by _later_ epics (Model Router: Epic 9; Workspace Service: Epic 5; typed IPC: Epic 4; profiles/credentials: Epic 10; agent/task runtime: Epic 4/8). Building those now would mean either fabricating data or shipping empty shells with no real consumer — both explicitly forbidden (mega-prompt §2.1, §2.5). So Epic 3 shipped the **6 screens that are honestly real today** and documented the other **6 as deferred with the specific blocking dependency**, rather than silently skipping them or faking them to hit a number. See `IMPLEMENTATION_CHECKLIST.md` for the per-screen breakdown.

**Built (real):** ND-003 First-Run Welcome, ND-004 Controller Calibration, ND-008 Home Command Center, ND-009 Universal Command Palette, ND-011 Activity Center, ND-012 Notification Center.

**Deferred (documented, not faked):** ND-001 Boot and Session Start, ND-002 Lock Screen, ND-005 AI Provider Setup, ND-006 Workspace Discovery, ND-007 Guided Controller Tutorial (only 2 of 7 lessons have real backing — not enough to justify the full screen), ND-010 Global Search (zero real content sources exist anywhere in the app yet).

### What was built

- **ND-003 First-Run Welcome** (`features/onboarding/FirstRunWelcome.tsx`): the four spec cards, registers a real focus node for "Begin setup," navigates to calibration.
- **ND-004 Controller Calibration** (`features/onboarding/ControllerCalibration.tsx`): live button-detection log via the new `onAction` observer (below), haptics intensity control that genuinely calls `HapticsService.setIntensity`/`trigger`, a real "Test haptics" action reporting honest `played`/`muted`/`unsupported` results, and a hold-to-confirm reset (`CriticalConfirmationDialog`). Dead zone and hold duration are shown as real read-only values pulled from the actual constants (`STICK_DEAD_ZONE`, `HOLD_THRESHOLD_MS`), not adjustable fake sliders — making them adjustable needs a config-threading refactor through `gamepadPolling.ts` deferred to Epic 11.
- **ND-008 Home Command Center** (`features/home/HomeCommandCenter.tsx`): renders the spec's own defined Empty State verbatim ("Create or discover a workspace") since there are genuinely zero workspaces. No Continue cards, pinned workspaces, or recommendations were fabricated to fill space.
- **ND-009 Universal Command Palette** (`features/command-palette/CommandPalette.tsx` + `CommandPaletteResultRow.tsx`): opens/toggles on the real `commands` action (Menu button / `M` key), modal-trapped via `FocusRegistry.pushTrap`, searches the real route registry (`NAVIGATION_DESTINATIONS`) with live substring filtering, Enter runs the top result. Only the "Screens" domain is real; the other 8 spec'd domains (files, symbols, workspaces, workflows, agents, settings, recent actions, commands) have no real source yet.
- **ND-011 Activity Center** (`features/activity/ActivityCenter.tsx`) and **ND-012 Notification Center** (`features/activity/NotificationCenter.tsx`), combined in **`ActivityAndNotificationsOverlay.tsx`** since wireframe §4.1 pairs both under the single `View` action — there's no separate controller trigger for each. Notification Center extends the Epic 1 `ToastProvider` with a real, persistent `history` array, per-category `muteCategory`/`unmuteCategory`, and collapsing of repeated identical events into one threaded card with a count — all genuinely affect behavior, not cosmetic.
- **`FocusEngineContext` gained two new real capabilities** used by the above: `onAction(listener)` — observes every raw controller action event regardless of routing, for "what did I just press" UI (calibration) — and `haptics: HapticsService` — exposed directly so screens can call `setIntensity`/`trigger` for real, not just internally inside the provider.
- **`ControllerButton` is now ref-forwarding** (`forwardRef`) so it can be registered with `useFocusable` directly, the same as a plain DOM element.
- **`KeyboardAdapter` gained a real input-conflict fix**: it now ignores nav/letter-key shortcuts when the event target is an editable element (`<input>`/`<textarea>`/`contenteditable`), except `confirm`/`back`. Without this, typing "form" into the new Command Palette search field would have fired `pin`/`inspect`/`commands` (letters F/R/M collide with the keyboard mapping) on every keystroke — found while building the search field, fixed before it ever reached a screen.

### A real bug found and fixed (again caught by the test suite, not by inspection)

**`HapticsService.getActuator()` crashed instead of reporting "unsupported"** when `navigator.getGamepads` doesn't exist at all (true in jsdom, and possibly true in some embedders) — it called `navigator.getGamepads()` unconditionally, unlike `GamepadAdapter`, which already had this exact guard from Epic 2. Surfaced as an unhandled promise rejection the moment `ControllerCalibration`'s "Test haptics" button was exercised in a test without a mocked Gamepad API. Fixed with the same capability check pattern (`typeof navigator.getGamepads === 'function'`) `GamepadAdapter.isSupported()` already used — this should have been applied consistently the first time; now both real Gamepad API consumers guard identically. Covered by a new regression test.

### Test inventory additions

| Suite                                                                                                                                                            | Location                                                               | Count |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| `FirstRunWelcome` (cards render, navigates to calibration)                                                                                                       | `features/onboarding/__tests__/FirstRunWelcome.test.tsx`               | 2     |
| `ControllerCalibration` (real hold-duration value, haptics intensity, honest unsupported result, navigation, hold-to-confirm reset)                              | `features/onboarding/__tests__/ControllerCalibration.test.tsx`         | 5     |
| `HomeCommandCenter` (empty state, no fabricated modules, navigation)                                                                                             | `features/home/__tests__/HomeCommandCenter.test.tsx`                   | 3     |
| `CommandPalette` (closed by default, opens/toggles on real `commands` action, filters, navigates+closes, closes on real `back` action)                           | `features/command-palette/__tests__/CommandPalette.test.tsx`           | 6     |
| `ActivityAndNotificationsOverlay` (opens on real `activity` action, honest empty states, shows real pushed notifications, closes on `back`)                      | `features/activity/__tests__/ActivityAndNotificationsOverlay.test.tsx` | 5     |
| `Toast` history/mute/collapse additions (history persists past dismissal, repeated events collapse, muted categories suppress the ephemeral toast but still log) | `components/overlays/__tests__/Toast.test.tsx`                         | +3    |
| `KeyboardAdapter` editable-target guard (suppresses shortcuts while typing, still allows confirm/back)                                                           | `controller/adapters/__tests__/keyboardAdapter.test.ts`                | +2    |
| `HapticsService` Gamepad-API-unavailable guard                                                                                                                   | `controller/haptics/__tests__/hapticsService.test.ts`                  | +1    |

Total: 93 tests passing — was 66 at end of Epic 2.

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 17 files, 93 tests passed
npm run build        → succeeded (renderer bundle: 26.07 kB CSS, 709.80 kB JS)
npm run test:e2e     → 1 passed
```

### Deferred items with explicit reason

- **ND-001, ND-002, ND-005, ND-006, ND-007, ND-010** — see "Scope decision" above; each needs a specific not-yet-built service.
- **Command Palette's 8 non-Screens search domains** (commands, files, symbols, workspaces, workflows, agents, settings, recent actions) — wait for the epics that produce that content (Epic 4/5/6/8/11).
- **Adjustable dead zone / hold duration / focus movement speed** — shown as real values, not editable; making them editable needs a config object threaded through `gamepadPolling.ts`/`GamepadAdapter`/`KeyboardAdapter`, planned for Epic 11 (Controller Settings) rather than half-built here.
- **Per-profile calibration persistence** — spec requires calibration "stored per controller profile"; no persistence layer exists yet (Epic 4/5), so haptics intensity changes only last for the current session.

---

## Epic 4 — AI safety runtime

### Scope decision

Mega-prompt §15's "AI Command Canvas and Action System" assumes a model that turns natural-language intent into a plan — that model doesn't exist until Epic 9 (Model Router). Building ND-013 (AI Command Canvas) now would mean fabricating "AI" plan proposals, which §2.1 explicitly forbids. So Epic 4 built the **real safety pipeline infrastructure** (plan schema, typed tool registry, permission broker, audit log, action queue) and the **three screens that manage real actions regardless of who/what submits them** (Execution Timeline, Approval Queue, Emergency Stop) — demonstrated end to end with **one genuinely real tool** (reset haptics intensity), submitted by the user through the Command Palette rather than by an AI that doesn't exist yet. ND-013 itself, and §15.4's prompt-injection resistance (nothing untrusted is ingested yet), are explicitly deferred.

This also means §14's full typed, Zod-validated, cross-process IPC layer is **not yet built**. The one real tool today is renderer-only (`HapticsService.setIntensity`, no filesystem/process access), so there is no real cross-process tool yet to justify the IPC contract layer — building it now would be infrastructure without a load-bearing consumer, the same anti-pattern avoided in Epics 1–3. This was flagged as a forward risk back in the Epic 0 ledger entry ("the preload bridge ... must be replaced by typed, Zod-validated contracts before any IPC-using feature ships") — it remains accurate: no IPC-using feature has shipped yet, so the gap is still honest, not overdue.

### What was built

- **Contracts** (`ai-safety/contracts/`): `plan.ts` (`ActionPlan`, `ActionStep`, `HarnessAction`, `HarnessActionRecord`, `RiskLevel`, `PlanStatus`, `ResourceScope`, `ImpactSummary`) and `permission.ts` (`PermissionCapability` — the subset of mega-prompt §16's list reachable by a tool that exists today; `PermissionScope` omits "current task"/"current workflow run" since no task/workflow runtime exists yet).
- **`ToolRegistry`**: real registration/lookup; invocation must match a registered tool (§15.3) — there is no "run an arbitrary string" path anywhere in the pipeline.
- **`PermissionBroker`**: real `evaluate`/`grant`/`revoke`/`consumeIfOnce` — capabilities are never auto-granted; "once" grants are consumed after a single use.
- **`AuditLog`**: real, append-only, in-memory (durable persistence needs Epic 5); notifies subscribers on every entry.
- **`ActionQueue`**: the actual pipeline tying the three together — `submit()` evaluates the broker and either auto-runs (if already granted) or parks the action as `pending-approval`; `approve()`/`deny()` resolve it; `emergencyStop()`/`resume()` implement ND-054's pause/resume; every transition is audited.
- **React integration** (`AiSafetyProvider.tsx`, `AiSafetyContext.ts`, `useAiSafety.ts`, `useActionQueueRecords.ts`): instantiated once via the `useState(() => new X())` lazy-init pattern (same one used for `FocusEngineProvider` in Epic 2, for the same `react-hooks/refs` lint reason).
- **The one real tool** (`tools/resetHapticsIntensityTool.ts`): low-risk, reversible, genuinely calls `HapticsService.setIntensity('medium')`. Registered once via `CoreToolsBootstrap.tsx` (mounted in `ShellLayout`), reachable from the Command Palette's new **Tools** domain alongside the existing Screens domain.
- **ND-014 AI Execution Timeline** (`features/ai-canvas/ExecutionTimeline.tsx`): real lifecycle list (queued/running/passed/failed/cancelled) of actually-submitted actions; cancel button for pending/queued ones.
- **ND-015 Approval Queue** (`features/approvals/ApprovalQueue.tsx`): real pending-approval cards (REQUEST/Requested by/Reason/Scope/Risk/Reversible per spec layout), Approve once / Deny wired to the real broker.
- **ND-054 Emergency Stop** (`features/ai-canvas/EmergencyStopOverlay.tsx`): subscribes to the real `emergency.stop` action (already wired in Epic 2 via the Menu+B chord and F1 key) and toggles pause/resume on the actual queue. Spec's "Terminate safe processes" and "Explain" buttons were omitted — there's no real safe/unsafe process classification (no terminal yet, Epic 6) or explanation feature (no AI yet, Epic 9) to back them; building them would be decorative.
- **Command Palette gained a real "Tools" domain** (`CommandPaletteToolRow.tsx`): running a tool submits through the real `ActionQueue`; if approval is required, it pushes a real `approval-required` toast (Epic 3's Notification Center) pointing at the Approval Queue — the review step is never silently skipped.

### Test inventory additions

| Suite                                                                                                                                  | Location                                                     | Count |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| `PermissionBroker` (evaluate/grant/revoke/once-consumption/listGrants)                                                                 | `ai-safety/__tests__/PermissionBroker.test.ts`               | 5     |
| `ToolRegistry` (register/get/list)                                                                                                     | `ai-safety/__tests__/ToolRegistry.test.ts`                   | 3     |
| `AuditLog` (record/order/notify/unsubscribe)                                                                                           | `ai-safety/__tests__/AuditLog.test.ts`                       | 4     |
| `ActionQueue` (submit/approve/deny/cancel/emergencyStop/resume, success/failure paths, once-grant consumption, listener notifications) | `ai-safety/__tests__/ActionQueue.test.ts`                    | 12    |
| `ApprovalQueue` (empty state, real pending card fields, approve runs the tool, deny doesn't)                                           | `features/approvals/__tests__/ApprovalQueue.test.tsx`        | 4     |
| `ExecutionTimeline` (empty state, granted action reaches Passed with real result message, cancel)                                      | `features/ai-canvas/__tests__/ExecutionTimeline.test.tsx`    | 3     |
| `EmergencyStopOverlay` (opens+pauses on real action, cancels pending actions, toggles resume, Keep paused doesn't resume)              | `features/ai-canvas/__tests__/EmergencyStopOverlay.test.tsx` | 4     |
| `CommandPalette` Tools domain (real submission, approval-required toast, no agent-side skip)                                           | `features/command-palette/__tests__/CommandPalette.test.tsx` | +1    |

Total: 129 tests passing — was 93 at end of Epic 3.

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 24 files, 129 tests passed
npm run build        → succeeded (renderer bundle: 26.13 kB CSS, 728.72 kB JS)
npm run test:e2e     → 1 passed
```

### Deferred items with explicit reason

- **ND-013 AI Command Canvas** — no model/planner exists (Epic 9); deferred rather than fabricated.
- **§15.4 Prompt injection resistance** — nothing untrusted is ingested yet (no browser/terminal/file content pipelines — Epics 5/6/10); the defenses described are moot until there's untrusted content to defend against.
- **§14 Typed cross-process IPC contracts** — the one real tool is renderer-only; no real cross-process tool exists yet to justify building the IPC layer. Revisit the moment Epic 5/6 introduce a tool needing main-process access (filesystem, shell).
- **Spec's "Terminate safe processes" / "Explain" buttons on Emergency Stop** — no safe/unsafe process classification or AI explanation feature exists to back them.
- **Per-capability permission UI customization** (ND-015's "Customize: change scope, approve specific files only, read-only instead...") — only "Approve once" and "Deny" are wired; the richer customization options need real per-file/per-resource scoping that doesn't exist until Epic 5/6 tools have actual file/resource arguments to scope.

## Epic 5 — Workspaces and files

### Scope decision

This is the first epic with a real reason to cross the main/renderer process boundary: workspaces need durable persistence (`app.getPath('userData')`) and file browsing needs Node's `fs`, neither of which the renderer can do directly under the hardened `contextIsolation`/`sandbox` baseline from Epic 0. That's exactly the trigger the Epic 4 ledger entry flagged for revisiting §14's typed IPC layer — so Epic 5 builds it for real: Zod-validated request/response schemas in `shared/contracts/`, normalized `NdxError`/`NdxResult` shapes, and a narrow `window.ndx` preload bridge (replacing the unused generic `@electron-toolkit/preload` wrapper, which is now uninstalled).

File operations are scoped to **read-only** (list/read/stat) on purpose. Mega-prompt §2.4's "no destructive action without a real recovery path" is non-negotiable, and copy/move/rename/delete/compress/extract/secure-delete are all destructive or semi-destructive — every one of them needs the Recovery Service (Epic 11) before it can ship honestly. Building any of them now would mean either skipping the recovery requirement or faking it; read-only listing/reading needed neither, so that's where the line is drawn.

Workspace Detail (ND-019) ships with only its Overview and Files tabs real. The spec's other seven tabs (Sessions, Git, Tasks, Models, Permissions, Environment, History) each need a service this epic doesn't own (Epic 6 terminal/Git, Epic 8 tasks/workflows, Epic 9 models, Epic 10 environment). File Preview (ND-027) ships with only text/code preview real — Markdown rendering, images, PDF, audio, video, archive contents, and diff views each need a dedicated renderer that doesn't exist yet; showing raw text instead of a fake rich preview is the honest behavior until each one is built.

### What was built

- **Shared IPC contracts** (`src/shared/contracts/`): `error.ts` (`NdxError`, `NdxResult<T>`, `nextCorrelationId()`, `ndxError()`), `workspace.ts` and `file.ts` (Zod schemas + inferred types for every request/response shape), `ipcChannels.ts` (single source of truth for channel name strings), `bridge.ts` (the `NdxBridge` interface — defined in `shared`, not `preload`, specifically so renderer code can reference it without crossing into preload's separate TypeScript project and tripping the composite-project file-listing rule).
- **`JsonStore<T>`** (`core/persistence/JsonStore.ts`): generic JSON-file persistence with atomic writes (temp file + rename, so a crash mid-write can't corrupt the existing file). Tested against real temp directories (`os.tmpdir()`), not mocked `fs`.
- **`WorkspaceStore`** (`core/workspaces/WorkspaceStore.ts`): real `list`/`create`/`remove`/`get`, built on `JsonStore`. `create()` verifies the folder actually exists and is a directory (via real `fs.stat`) before persisting it — rejects files and missing paths with real errors, not silently.
- **`FileService`** (`core/files/FileService.ts`): real `list`/`read` scoped to a workspace root. The path-traversal defense (`resolveWithinRoot`) uses `fs.realpath` on both the root and the resolved target — this catches not just literal `../` strings but **symlink-based escapes** (a symlink inside the workspace pointing to a directory outside it), verified by a real test that creates an actual symlink via `fs.symlink` and confirms it's rejected.
- **Main-process IPC wiring** (`src/main/ipc/`): `registerWorkspaceHandlers.ts` and `registerFileHandlers.ts` — every handler parses its payload with the matching Zod schema before touching the store/service, and returns a typed `NdxResult` (never throws across the IPC boundary). `workspace.pickFolder` uses Electron's real `dialog.showOpenDialog`. `src/main/index.ts` now tracks the live `BrowserWindow` reference and calls `registerIpcHandlers()` once on `app.whenReady()`.
- **New preload bridge** (`src/preload/index.ts`): replaced the generic `@electron-toolkit/preload` `electronAPI`/`window.electron`/`window.api` exposure (confirmed unused anywhere in the renderer) with a narrow `window.ndx` object — `workspaces.{list,create,remove,pickFolder}` and `files.{list,read}` — each method maps to exactly one validated channel via `ipcRenderer.invoke`, never a raw `send`/`on` passthrough. The `@electron-toolkit/preload` package itself was uninstalled.
- **Renderer IPC clients** (`renderer/src/services/ipc/`): `ndxBridge.ts` (the `getNdxBridge()`/`bridgeUnavailableError()` guard so a missing bridge produces a real typed error instead of a `TypeError` crash), `workspaceClient.ts`, `fileClient.ts`.
- **`WorkspaceProvider`** (`features/workspaces/WorkspaceProvider.tsx` + `WorkspaceContext.ts` + `useWorkspaces.ts`): real workspace list/active-workspace state, mounted in `AppProviders` between `AiSafetyProvider` and `DisplayModeProvider`. "Active workspace" is renderer-only UI state today — it doesn't yet persist across restarts, since that needs the "UI resume state" piece of the spec's workspace record, deferred until something else (Epic 6 sessions, Epic 8 tasks) needs resuming too.
- **ND-018 Workspace Hub** (`WorkspaceHub.tsx`): real cards backed by `WorkspaceStore`; "Add workspace" opens the genuine native folder picker.
- **ND-019 Workspace Detail** (`WorkspaceDetail.tsx`): Overview (name/root path/created date — only fields that are actually real) and Files tabs.
- **ND-020 Workspace Switcher** (`WorkspaceSwitcherOverlay.tsx`): opens on the real `workspace.switcher` action (the LT+RT chord wired back in Epic 2), modal-trapped, switches the real active workspace.
- **ND-026 File Manager** (`FileManager.tsx`): real directory listing for the active workspace with breadcrumb navigation, read-only.
- **ND-027 File Preview** (`FilePreview.tsx`): real text/code content rendering, with a real truncation notice for files over the 256 KB preview cap.
- **Routes wired**: `/workspaces` → Workspace Hub, `/workspaces/detail` → Workspace Detail, `/files` → File Manager (all previously epic-boundary placeholders).

### A real bug found and fixed

Two `react-hooks/set-state-in-effect` lint errors (a React Compiler rule new to this epic's code, not previously triggered): `WorkspaceProvider`'s mount effect called `void refresh()`, and `refresh()`'s first synchronous statement was `setLoading(true)` — a synchronous setState call disguised behind an async function call. Fixed by inlining the mount-only fetch directly in the effect so every `setState` call happens inside the `.then()` continuation, never synchronously in the effect body. The same pattern recurred in `FileManager` and `FilePreview` (both called `setLoading(true)` synchronously before their first `await`) — fixed by initializing `loading` from the relevant prop/state (`Boolean(activeWorkspace)` / `Boolean(relativePath)`) instead of imperatively flipping it back to `true` inside the effect on every dependency change.

### Test inventory additions

| Suite                                                                                                                                             | Location                                                          | Count |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----- |
| `JsonStore` (default value, write/read real JSON, creates parent dirs, no leftover temp file, full overwrite)                                     | `core/persistence/__tests__/JsonStore.test.ts`                    | 5     |
| `WorkspaceStore` (empty list, create from real dir, rejects missing/non-dir paths, remove, persists across instances)                             | `core/workspaces/__tests__/WorkspaceStore.test.ts`                | 6     |
| `FileService` (list/read real files, subdirectory listing, rejects `../` escape, rejects symlink escape, directory-as-file rejection, truncation) | `core/files/__tests__/FileService.test.ts`                        | 8     |
| `workspaceClient` (bridge-unavailable fallback, delegates list/create/remove/pickFolder)                                                          | `renderer/src/services/ipc/__tests__/workspaceClient.test.ts`     | 5     |
| `fileClient` (bridge-unavailable fallback, delegates list/read)                                                                                   | `renderer/src/services/ipc/__tests__/fileClient.test.ts`          | 3     |
| `WorkspaceHub` (empty state, real list, add-from-picker flow, remove flow)                                                                        | `features/workspaces/__tests__/WorkspaceHub.test.tsx`             | 4     |
| `FileManager` (no-workspace empty state, real listing, directory navigation, real preview on file activation)                                     | `features/workspaces/__tests__/FileManager.test.tsx`              | 4     |
| `WorkspaceSwitcherOverlay` (opens/closes on real `workspace.switcher` action, empty state, switches active workspace)                             | `features/workspaces/__tests__/WorkspaceSwitcherOverlay.test.tsx` | 4     |
| `WorkspaceDetail` (no-workspace empty state, real Overview metadata, switches to real File Manager)                                               | `features/workspaces/__tests__/WorkspaceDetail.test.tsx`          | 3     |

Total: 171 tests passing — was 129 at end of Epic 4.

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 33 files, 171 tests passed
npm run build        → succeeded (renderer bundle: 26.38 kB CSS, 881.45 kB JS; main bundle grew from 2.73 kB to 12.77 kB with real IPC code)
npm run test:e2e     → 1 passed
```

### Deferred items with explicit reason

- **All destructive file operations** (write/copy/move/rename/duplicate/compress/extract/trash/secure-delete) — every one needs a real recovery path first; Recovery Service is Epic 11.
- **Workspace Detail's Sessions/Git/Tasks/Models/Permissions/Environment/History tabs** — each needs a service this epic doesn't own (Epic 6/8/9/10).
- **Multi-source workspace discovery** (Git repos, Steam library, SSH hosts, removable storage) — only the manual native folder picker is real; ND-006 (Workspace Discovery) remains partial from Epic 3.
- **File Preview's images/PDF/audio/video/archive/diff support** — each needs its own renderer; only text/code preview is real.
- **AI actions on file preview** (Summarize/Explain/etc.) — no AI/model exists yet (Epic 9).
- **Recovery integration/checkpoints** — explicitly out of scope since no destructive operations exist yet to checkpoint.
- **Workspace "branch/health/last-opened" card fields** (spec's richer Workspace Hub card) — need Git (Epic 6) and task/session state (Epic 8).

---

## Epic 6 — Local Git foundation (partial)

### Requirement

Begin mega-prompt §22 with a real, workspace-scoped Git adapter and expose the safe local operations needed to unblock Workspace Detail's Git tab. This is one slice of Epic 6, not completion of the full Git Service or ND-025.

### Implementation and real integration

- `core/git/GitService.ts` runs the installed Git executable with `execFile` argument arrays and a fixed workspace `cwd`; no shell interpolation is used.
- Real repository detection, porcelain-v2 status, diff, stage, unstage, commit, local branch listing/checkout, and log operations are implemented.
- Zod request contracts, fixed IPC channel names, main-process handlers, the frozen preload bridge, and typed renderer client extend the established Epic 5 process boundary.
- `WorkspaceGitTab.tsx` renders the current branch, ahead/behind counts, staged and unstaged changes, editable commit message, local branches, and real commit history. `WorkspaceDetail.tsx` now mounts it as the third real tab.

### Controller behavior and states

- Tab selection, stage/unstage, commit, and checkout use `ControllerButton`, so they register with the Spatial Focus Engine and remain controller-operable.
- Loading, non-repository, operation-error, empty staged/unstaged, and empty-history states are explicit.
- A lifecycle defect inherited in the unfinished work was fixed: initial IPC reads now update state only from the asynchronous continuation, cancel state updates after unmount, and show a real error state instead of remaining on `Loading…` after failure.

### Security and remaining risks

- Git executes only in the main process; the renderer receives no process or filesystem capability.
- User values are passed as discrete `execFile` arguments, not through a shell command string.
- Push is not bundled with commit. No remote mutation is exposed in this slice.
- Still deferred: fetch, pull, push, restore/discard, stash, conflict detection, remote inspection, recovery branches, AI commit-message assistance, diff UI, and the dedicated ND-025 screen. Restore/discard must wait for Epic 11 recovery or an explicit irreversibility review.

### Tests and evidence

- `GitService.test.ts`: 8 tests against real temporary Git repositories, covering non-repositories, branch/status, staged and untracked changes, stage/unstage, commit, diff, checkout, and history.
- `WorkspaceDetail.test.tsx`: Git tab wiring and workspace ID delegation added.
- `npm run typecheck` → 0 errors.
- `npm run lint` → 0 errors, 0 warnings.
- `npm run test` → 34 files, 180 tests passed.
- `npm run build` → succeeded (main 22.68 kB, preload 3.63 kB, renderer CSS 26.43 kB / JS 892.57 kB).
- `npm run test:e2e` → 1 Playwright Electron smoke test passed. On the managed Windows runner this must execute outside the filesystem sandbox because Chromium needs write access to its runtime GPU/cache profile.

### ND-025 and diff-view continuation

- Added the dedicated `/git` route and `GitControlCenter.tsx`, while reusing the same Git workstation inside Workspace Detail instead of creating a second state or service silo.
- The controller-first three-pane layout keeps changed files and commit controls, the selected patch, and branch/history context visible together at 1280×800. Every file row, stage action, branch checkout, and commit action uses `ControllerButton`.
- `GitDiffViewer.tsx` renders Git output as React text nodes only. Added, removed, hunk, and context lines use existing semantic design tokens; no raw HTML is accepted.
- Local commit now opens the shared confirmation surface showing the exact editable message, staged-file count, branch, and explicit statement that no push occurs.
- Fixed porcelain parsing for paths containing spaces and files with simultaneous index/worktree changes. A file with both patches now appears once in Staged and once in Changes so each exact diff remains selectable.
- Untracked files now receive a real no-index unified diff instead of an empty preview.
- Checkout is restricted to an exact local branch returned by Git before invocation, preventing option-like or arbitrary checkout targets from crossing the service boundary.

Updated evidence: `GitService.test.ts` now has 11 real-repository tests; `GitControlCenter.test.tsx` has 3 UI/integration tests covering workspace gating, diff selection, and exact commit review. Full validation: 35 files, 186 tests passed; typecheck and lint pass with zero errors/warnings; production build succeeds (main 23.73 kB, preload 3.63 kB, renderer CSS 28.67 kB / JS 901.12 kB).

ND-025 remains partial: remotes, pull requests, recovery branches, AI commit-message assistance, push review, and recovery-backed discard are not fabricated.

---

## Epic 6 — Terminal Service foundation (partial)

### Requirement

Implement the real local PTY/service and cross-process lifecycle required by mega-prompt §21 before building ND-028 or ND-029. This slice does not claim terminal UI, SSH, proposals, intent mode, or privileged-command approval.

### Implementation and integration

- Added `node-pty` as the production PTY dependency. Interactive sessions never use `exec`.
- `TerminalService` owns up to eight concurrent sessions, platform shell selection, input, resize, output streaming, cancellation, exit status, workspace identity, and a bounded 1 MiB output snapshot.
- `TerminalPathPolicy` resolves both workspace root and requested relative cwd with `realpath`, rejects parent traversal, non-directories, and symlinks escaping the workspace.
- Fixed Zod contracts and IPC channels cover create/list/snapshot/write/resize/terminate plus typed data/exit events. Preload validates event payloads and exposes listener-specific unsubscribe functions rather than raw `ipcRenderer` access.
- Main-process shutdown disposes listeners and terminates active PTYs.
- The renderer client is ready for ND-028 but no screen is presented as complete.

### Security and safety

- Renderer requests cannot select the shell executable, pass spawn arguments, or provide an absolute trusted cwd.
- Secret-like inherited environment-variable names are removed before shell launch; essential non-secret platform variables remain available.
- Session count, dimensions, input message size, and retained output are bounded.
- AI/generated and privileged commands are not accepted by a separate shortcut path. ND-029 must integrate the existing plan/policy/permission/review pipeline.

### Tests and remaining scope

- `TerminalService.test.ts` uses real PTYs to prove streaming output, resize, snapshots, termination/exit state, and workspace-isolated multiple sessions.
- `TerminalPathPolicy.test.ts` proves valid subdirectories, parent/file rejection, and real symlink escape rejection.
- `terminalClient.test.ts` covers bridge absence, method delegation, and streaming subscription cleanup.
- Full validation: typecheck and lint pass with zero errors/warnings; 38 files and 195 tests pass; production build succeeds (main 35.25 kB, preload 6.60 kB, renderer CSS 28.67 kB / JS 902.25 kB); Electron E2E smoke test passes with the native PTY dependency loaded; `npm audit --omit=dev` reports zero runtime vulnerabilities.
- Deferred: ND-028, ND-029, persisted history, search, copy selection, SSH terminals, structured proposals, intent mode, privileged-command classification/review, and richer secret redaction.

### ND-028 Universal Terminal — Direct mode (partial)

- Added `/terminal` as a real lazy-loaded route. `@xterm/xterm` and `@xterm/addon-fit` are isolated in a 428.83 kB route chunk instead of increasing the initial renderer bundle.
- `UniversalTerminal.tsx` provides a controller-focusable session rail, real workspace and Git-branch context, create/select/terminate lifecycle, live running/exited status, and explicit empty/error/loading states.
- `TerminalViewport.tsx` owns one xterm instance, forwards user input to the real PTY, fits/resizes with the viewport, and renders ANSI terminal output without raw HTML.
- Snapshot hydration and live events now carry monotonic per-session sequence numbers. Events received during hydration are queued, already-snapshotted events are discarded, and only newer events append, preventing duplicate or reordered terminal text.
- Termination now requires the shared confirmation dialog and explicitly warns that foreground processes will stop.
- Stable merged refs prevent focus registration churn; the xterm surface, new-session action, session selectors, and termination action register with the Spatial Focus Engine.
- `UniversalTerminal.test.tsx` covers workspace gating, real client delegation, create/select, branch context, reviewed termination, and exit state. `TerminalViewport.test.tsx` proves ordered snapshot/event hydration. E2E now opens the lazy terminal route.
- Full validation: typecheck and lint pass with zero errors/warnings; 40 files and 198 tests pass; Electron E2E passes; runtime audit reports zero vulnerabilities. Production build: main 35.49 kB, preload 6.70 kB, initial renderer CSS 29.47 kB / JS 905.83 kB, lazy terminal CSS 7.11 kB / JS 428.83 kB.

ND-028 remains partial: Command Builder, Intent, History, Split, Remote, AI suggestions/explanations, search, copy selection, and richer controller text entry are not fabricated.

### ND-029 Command Builder (partial)

- Added a lazy `/terminal/builder` route and linked it from Universal Terminal.
- The editor models Program, Subcommand, Flag, Value, Path, Pipe, Redirect, Conditional, and Environment blocks. Values and paths receive POSIX/PowerShell/cmd-specific quoting; only allowlisted operator block values can emit shell control syntax.
- A deterministic classifier labels known local, network/install, destructive, and privileged patterns. The classifier informs risk presentation and tool choice but is not the security boundary.
- Four fixed terminal tools (`low`, `medium`, `high`, `privileged`) are globally registered with static capabilities/risk. Every submit revokes the applicable prior grant, enters `ActionQueue`, and requires explicit approval before `writeTerminal` appends Enter.
- Approval Queue now renders exact command and target fields from the action arguments. This prevents a compromised or incorrect caller description from hiding the actual terminal payload.
- Command blocks, type cycling, values, target session, copy, add/remove, and review actions register with the Spatial Focus Engine. Running-session exit events remove stale targets.
- `commandBuilderModel.test.ts` covers quoting, operator allowlisting, environment syntax, risk classification, and tool routing. `terminalCommandTools.test.ts` covers fixed registrations, argument validation, and real client delegation. `CommandBuilder.test.tsx` proves the command remains unexecuted until Approval Queue approval, then reaches the selected terminal exactly once.
- Full validation: typecheck and lint pass with zero errors/warnings; 43 files and 205 tests pass. Production build succeeds with a 16.39 kB lazy Command Builder chunk; main 35.49 kB, preload 6.70 kB, initial renderer CSS 29.95 kB / JS 910.32 kB. Runtime audit remains zero production vulnerabilities.

ND-029 remains partial: context-aware option catalogs, local man-page explanations, saved reusable actions, remote targets, and AI-generated/intent proposals are not fabricated.

### Git Service remote operations (continuation)

Closed the gap the Epic 6 Git Service entry flagged: "Still deferred: fetch, pull, push, restore/discard, stash, conflict detection, remote inspection." Fetch/pull/push, stash, remote inspection, and conflict detection are now real; restore/discard remain deferred (need Epic 11 Recovery).

- `GitService.remotes()` parses `git remote -v` into fetch/push URLs per remote. `fetch()`/`pull()`/`push()` each validate the remote name against the real configured remote list before invoking Git — an unknown remote name throws before any process spawns, closing the same kind of argument-injection class `checkout()` already guards against for branch names.
- `pull()` uses `--no-rebase` (always a merge, never a silent rebase that could rewrite local commit identity). `push()` has no force flag and cannot acquire one — force push stays unimplemented, matching §22's "force push is critical risk."
- `GitStatus` gained a real `hasConflicts` field, derived from porcelain v2's unmerged (`u`) entries against the standard XY conflict-code set (`DD`, `AU`, `UD`, `UA`, `DU`, `AA`, `UU`) — not a guess, the same codes Git's own documentation defines for merge conflicts.
- `stashSave()`/`stashList()`/`stashPop()` wrap `git stash push/list/pop`, parsed with the same field/record-separator technique already used for `log()`.
- IPC: `git.remotes`, `git.fetch`, `git.pull`, `git.push`, `git.stashSave`, `git.stashList`, `git.stashPop` added to `shared/contracts/git.ts`, `ipcChannels.ts`, `bridge.ts`, `registerGitHandlers.ts`, the preload bridge, and `gitClient.ts` — same validated-payload, typed-`NdxResult` pattern as every other Epic 5/6 IPC surface.
- `WorkspaceGitTab.tsx` gained a Remote section (Fetch/Pull buttons, direct — they're non-destructive merges a user can already retry) and Push (always behind its own `ConfirmationDialog`, separate from the commit review, showing the exact branch/remote/push URL being pushed to) and a Stash section (Save/list/Pop).

### Tests and evidence

- `GitServiceRemote.test.ts` (new, 6 tests) uses a real bare Git remote (`git init --bare`) and a second real clone to test fetch/pull/push and conflict detection end to end — not mocked Git output. Covers: real remote listing, unknown-remote rejection on fetch/pull/push, real push verified by cloning fresh and checking the pushed commit, real fetch+pull of a commit made by a second clone (status `behind` count verified before and after), real stash save/list/pop round-trip, and a real merge conflict (two clones edit the same line, push, pull) verified through `status().hasConflicts` and the conflicted path appearing in `changes`.
- Existing `GitControlCenter.test.tsx` and `WorkspaceDetail.test.tsx` mocks updated to include `remotes`/`stashList` stubs — `WorkspaceGitTab`'s refresh now calls them on every mount, so a stub missing those methods crashes the component during the test's effect, not just at the assertion. Caught by running the full suite, not just the new test file.
- Full validation: typecheck and lint pass with zero errors/warnings; 44 files and 211 tests pass (up from 205). Production build succeeds: main 42.36 kB, preload 8.16 kB, initial renderer CSS 29.95 kB / JS 917.39 kB, lazy terminal CSS 7.11 kB / JS 428.26 kB, lazy Command Builder JS 16.39 kB. `npm run test:e2e` passes. `npm audit --omit=dev` reports zero vulnerabilities.

Remaining Git Service gaps: restore/discard (needs Epic 11 Recovery or an explicit irreversibility warning the UI doesn't have yet), force push, branch creation/deletion, AI commit-message assistance, and the diff UI's read-only-vs-interactive-conflict-resolution mode (status reports conflicts; there is no merge-tool UI to resolve them yet — the user must resolve conflicts via an external tool or the terminal already built in this epic).

## Epic 7 — Build Studio (partial, read-only)

### Scope decision

Build Studio's core feature is editing and saving code, but file writes are deferred until Epic 11's Recovery Service — the same rule that kept Epic 5's File Manager read-only. Asked the user directly how to handle this conflict before starting; the answer was to build a real read-only editor now rather than add an ad hoc, non-Recovery-backed save path. The editor, tabs, diagnostics, and symbol navigation are all genuinely real; there is no save, no Edit mode (editing without ever being able to save would be misleading, not just incomplete), and no AI coding panel (no model router yet — Epic 9).

The other major scope question was LSP. Standing up real language servers (tsserver as a subprocess, JSON-RPC, etc.) per language is one of the largest items in the entire spec. Monaco Editor ships its own TypeScript/JavaScript language service as a bundled Web Worker — the actual TypeScript compiler, not a fake — giving real diagnostics, real navigation-tree symbols, and real hover/completion for TS/JS specifically, with zero extra infrastructure. Every other language gets Monaco's built-in Monarch syntax highlighting only; there is no semantic language service for them, and that's stated honestly in the UI rather than faked.

### What was built

- **Dependencies**: `monaco-editor` + `@monaco-editor/react`, bundled locally via Vite's `?worker` import pattern (`monacoWorkers.ts`) — no CDN load, required by the offline-first/no-cloud-dependency rule. `loader.config({ monaco })` (in `CodeEditor.tsx`) points `@monaco-editor/react` at the locally bundled package instead of its CDN default. Added an `overrides` entry pinning `dompurify` to `^3.4.11` — the version `monaco-editor@0.55.1` pulled in transitively (`3.2.7`) had a long list of known XSS CVEs; the override closes them without needing a Monaco downgrade. `npm audit --omit=dev` confirms zero production vulnerabilities after the override.
- **`detectLanguage.ts`**: pure, tested, file-extension → Monaco language id mapping.
- **`ProjectTree.tsx`**: real, lazily-expanded directory tree, reusing the exact same `FileService`/`listFiles` IPC path File Manager uses — no separate or weaker file-access surface for Build Studio.
- **`useOpenFiles.ts`**: tab state — open/close/switch, real `readFile` IPC, real per-file error state (e.g. permission errors surface in the tab, not a console error).
- **`CodeEditor.tsx`**: thin Monaco wrapper, always `readOnly: true`, one model per open path (Monaco's `path` prop keys its internal model cache).
- **`DiagnosticsPanel.tsx`** (ND-024): grouped by severity then file, real `monaco.editor.IMarker`s, live-updated via `monaco.editor.onDidChangeMarkers` (diagnostics arrive asynchronously after the TS worker finishes semantic analysis — this is not a one-shot read).
- **`SymbolNavigator.tsx`** (ND-023): real navigation-tree symbols via `monaco.languages.typescript.getTypeScriptWorker()`/`getJavaScriptWorker()` → `getNavigationTree()` — the same data VS Code's own outline view is built on. Honest "No symbol provider for this language" message for everything else, rather than a misleadingly empty list.
- **`BuildStudio.tsx`** (ND-021): orchestrates the above, plus a minimal Git summary strip (branch + change count) reusing `getGitStatus` from Epic 6 — no duplicate Git state. Wired at `/build`, lazy-loaded (Monaco is large — see bundle evidence below).

### A real bug found and fixed

`react-hooks/set-state-in-effect`: the "jump to line" effect called `editorInstance.revealLineInCenter()`/`setPosition()` (legitimate — driving an external system from React state) followed by `setPendingReveal(null)` to "consume" the pending jump — that trailing call is exactly the synchronous-setState-in-effect pattern Epic 5 already hit three times. Fixed by giving `pendingReveal` a `nonce: Date.now()` field instead of nulling it out — every new jump request is a genuinely new object reference, so the effect re-fires on each click even for a repeated line, and there's nothing left to reset.

### Tests and evidence

| Suite                                                                                          | Location                                                    | Count |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----- |
| `detectLanguage` (extension mapping, case-insensitivity, fallback, nested-dot paths)           | `features/build-studio/__tests__/detectLanguage.test.ts`    | 4     |
| `useOpenFiles` (open/activate, no-refetch-if-already-open, real error capture, close+fallback) | `features/build-studio/__tests__/useOpenFiles.test.ts`      | 4     |
| `ProjectTree` (real top-level listing, real subdirectory expansion, open-file callback)        | `features/build-studio/__tests__/ProjectTree.test.tsx`      | 3     |
| `DiagnosticsPanel` (empty state, severity grouping/ordering, select callback)                  | `features/build-studio/__tests__/DiagnosticsPanel.test.tsx` | 3     |
| `SymbolNavigator` (unsupported-language message, empty state, nested symbols + jump)           | `features/build-studio/__tests__/SymbolNavigator.test.tsx`  | 3     |

Total: 228 tests passing (up from 215). Monaco's own editor internals are not re-tested — it's an established, independently-maintained library; tests cover only the real logic this slice adds around it (tabs, tree, diagnostics/symbol extraction and grouping).

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 49 files, 228 tests passed
npm run build        → succeeded (main 42.36 kB, preload 8.16 kB, initial renderer CSS 29.95 kB / JS 918.33 kB,
                         lazy terminal JS 428.26 kB, lazy Build Studio JS 7,341.19 kB — Monaco ships every
                         bundled language's tokenizer; this is the known cost of the full editor engine and
                         is lazy-loaded only when /build is visited, never part of the initial bundle)
npm run test:e2e     → 1 passed
npm audit --omit=dev → 0 vulnerabilities
```

### Deferred items with explicit reason

- **Save/autosave/external-change detection** — needs Epic 11's Recovery Service; this was a direct scope decision confirmed with the user before building.
- **Edit/Review/Debug/Test modes** — no save (Edit mode without save is misleading), no AI diff target (Review), no debugger integration (Debug), no test runner integration (Test). Only Navigate (implicitly, the whole read-only experience) is real.
- **Real LSP for non-TS/JS languages** — standing up per-language language servers is one of the largest items in the spec; Monaco's bundled TS worker covers TS/JS only.
- **Structural edits** (extract method, wrap block, add import, rename symbol, etc.) — most need a real save path; rename specifically needs safe multi-file write coordination, which doesn't exist without Recovery.
- **Predictive token wheel, voice-to-code, AI radial menu** — need Epic 9's model router.
- **Task runner, AI coding panel** — task runner needs a real "run configuration" concept not yet defined; AI coding panel needs Epic 9.
- **Split panes** — not built this slice; single active editor pane only.
- **Peek/Rename/Find references/Pin (Symbol Navigator), Explain/Add to AI context** — need deeper language-service integration or Epic 9 respectively.

## Epic 11 — System integration (Recovery Service slice only)

### Scope decision

Epic 11 ("System integration") is 16 items: System Metrics, Dashboard, Controller Settings, Display/Theme, Network/VPN, Privacy, Storage+Recovery, Integrations, Updates, Quick Access, Power Menu, Recovery Timeline, Before/After Diff, Emergency Stop (already real, Epic 4), Error Recovery, About/Diagnostics. Asked the user directly which slice to prioritize; the answer was the Recovery Service specifically, since it's what every prior epic's "deferred — needs Recovery" notes were pointing at (Epic 5's file writes, Epic 6's Git restore/discard, Epic 7's editor save). Building Recovery first, rather than working the full 16-item list in spec order, unblocks real work in three already-shipped epics instead of producing 16 thin, mostly-unblocked screens.

The other 15 items remain genuinely deferred — not silently skipped. They each need a service this epic doesn't build (System Metrics, model storage accounting, browser data, log-file inventory, package/update infrastructure).

### What was built

- **`RecoveryService`** (`core/recovery/RecoveryService.ts`): real checkpoints stored entirely outside the user's own workspace, under `app.getPath('userData')/recovery/<workspaceId>/` — an index file (`index.json`, via the existing `JsonStore`) plus one real snapshot file per checkpoint that had previous content. Checkpoints never collide with the user's Git history or get swept up by `git clean`. Retention: the newest 50 checkpoints per workspace are kept; older ones are pruned along with their real snapshot files on disk.
- **`FileService.write()`** (`core/files/FileService.ts`): the first real destructive file operation. Added `resolveForWrite()` — a write-safe sibling to the existing `resolveWithinRoot()` that resolves the *parent* directory via `realpath` (closing the same symlink-escape gap) while allowing the leaf file itself to not exist yet, which `resolveWithinRoot()` couldn't do (its `realpath` call requires the full target to already exist). Also added `readIfExists()` (returns `null` on `ENOENT` instead of throwing) to capture "previous content or null" before a write.
- **Orchestration lives in the IPC handler, not either service**: `registerFileHandlers.ts`'s `fileWrite` handler always calls `fileService.readIfExists()` → `recoveryService.recordCheckpoint()` → `fileService.write()`, in that order, with no code path that reaches `FileService.write()` without a checkpoint being recorded first. This was a deliberate placement choice — putting the orchestration in either service would create either a circular dependency (`FileService` importing `RecoveryService` or vice versa) or a "trust the caller to call both" footgun.
- **Restore is itself recorded as a new checkpoint** (`registerRecoveryHandlers.ts`'s `recoveryRestore` handler calls `fileService.write()` under the hood) — restoring isn't a special unchecked path; it's "write this content back," which means restoring is itself undoable. A real redo path falls out of this for free, not as a special case.
- **`recoveryDiff` handler**: real unified diff (via the `diff` npm package's `createTwoFilesPatch`) between the checkpoint's snapshot content and the file's current content — reused by the renderer's existing `GitDiffViewer` component (no second diff-rendering component built).
- **Build Studio gained real Save** (Epic 7's read-only gap, closed): `useOpenFiles` gained `updateContent`/`saveFile`; `CodeEditor` is no longer hard-coded `readOnly: true` and gained an `onChange` prop; `BuildStudio.tsx` wires Ctrl+S (via `editor.addCommand`, reading the latest `saveFile` through a ref to avoid a stale closure from the one-time `onMount` callback) and a visible Save button with a dirty-tab indicator (`●`).
- **ND-052 Recovery Timeline + ND-053 Before/After Diff** (`features/recovery/RecoveryTimeline.tsx`): combined into one screen the same way ND-025 Git Control Center wraps its diff viewer — real checkpoint list, real diff on selection, real "Restore to this point" behind its own `ConfirmationDialog` (separate review surface, same pattern as Epic 6's push review). Scoped to "File changes" only — package installation/settings/workflow/Git/agent/system-config events need recovery-event kinds and services this slice doesn't build.
- **ND-047 Storage and Recovery** (`features/recovery/StorageAndRecovery.tsx`): real recovery-checkpoint storage summary (count + total snapshot bytes) and a link into the Recovery Timeline. Disk usage/model storage/workspace cache/browser data/logs/trash are shown as an honestly-labeled "not real yet" section rather than fabricated numbers — directly satisfies §47's "no one-click magic cleanup that hides what's being deleted" by having nothing fake to show.
- **Dependency**: added `diff`/`@types/diff` (pure JS, MIT, no native build step — unlike `node-pty`, no toolchain risk).

### A real bug found and fixed

`react-hooks/set-state-in-effect` recurred a third time (after Epic 5's `WorkspaceProvider`/`FileManager`/`FilePreview`): `RecoveryTimeline`'s mount effect called a `useCallback`-wrapped `refresh()` function whose only `await` precedes every `setState` call — genuinely async, no synchronous setState in the effect body. The lint rule still flagged it, suggesting its static analysis doesn't reliably trace through `useCallback`-wrapped async functions called from an effect. Fixed with the same pattern as before: inline the fetch directly in the effect (with an `active` flag for cancellation-safety) instead of calling the named callback. The named `refresh()` callback is kept for use from event handlers (e.g., after a restore), where this lint rule doesn't apply.

### Tests and evidence

| Suite                                                                                                    | Location                                                  | Count |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| `RecoveryService` (empty state, snapshot capture, new-file case, ordering, workspace isolation, storage summary, retention+real file cleanup) | `core/recovery/__tests__/RecoveryService.test.ts`             | 7     |
| `FileService.readIfExists`/`write` (create, overwrite, subdirectory, traversal rejection, symlink-escape rejection, no leftover temp file) | `core/files/__tests__/FileService.test.ts` (+10 to existing) | 10    |
| `useOpenFiles` save paths (dirty tracking, real save success updates `savedContent`, real save failure preserves it and records `saveError`) | `features/build-studio/__tests__/useOpenFiles.test.ts` (+3) | 3     |
| `RecoveryTimeline` (active-workspace gate, empty state, real checkpoint list + diff load, reviewed restore + refresh) | `features/recovery/__tests__/RecoveryTimeline.test.tsx`       | 4     |
| `StorageAndRecovery` (active-workspace gate, real storage summary, navigation to Recovery Timeline)      | `features/recovery/__tests__/StorageAndRecovery.test.tsx`     | 3     |

Total: 253 tests passing (up from 246).

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 52 files, 253 tests passed
npm run build        → succeeded (initial renderer JS 930.33 kB, lazy Build Studio JS unchanged at ~7.34 MB)
npm run test:e2e     → 1 passed
npm audit --omit=dev → 0 vulnerabilities
```

### Deferred items with explicit reason

- **The other 15 of 16 Epic 11 items** (System Metrics, Dashboard, Controller Settings, Display/Theme, Network/VPN, Privacy, Integrations, Updates, Quick Access full build, Power Menu, Error Recovery, About/Diagnostics) — each needs a service this slice doesn't build.
- **Copy/move/rename/delete/compress/extract/secure-delete** (Epic 5's File Service) — each needs its own recovery-checkpoint shape (a move/delete isn't the same kind of event as a content overwrite); only `write()` shipped this slice.
- **Git restore/discard/force-push/branch-delete** (Epic 6) — still need either Recovery integration for Git-specific events or an explicit irreversibility warning surface; the `RecoveryService` built this slice is scoped to `file-write` events, not Git history rewrites.
- **Recovery Timeline's Revert event/Branch from point/Export snapshot** — need recovery-event kinds beyond `file-write`.
- **Before/After Diff's Previous/next change, Accept/reject chunk, Explain change, Run validation** — need chunk-level apply infrastructure or Epic 9's model router.
- **Build Studio's structural edits, predictive editing, voice-to-code** — structural edits need a real code-fix provider beyond this slice; predictive/voice need Epic 9.
