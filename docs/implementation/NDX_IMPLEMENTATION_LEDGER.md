# NDX Implementation Ledger

> **Epic 9 completion addendum (2026-06-22):** The historical Epic 9 partial entry below is superseded by `docs/implementation/NDX_EPIC_9_MODELS.md`. The completed slice includes real OpenAI-compatible completions, all eight measured routing profiles, privacy/offline constraints, provider enable/disable, and capability-detected Ollama runtime controls.

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

- **`FocusList`/`FocusGrid`/`FocusTree`/`VirtualizedFocusList`** — deferred to Epic 2 (spatial focus engine); building them without a real consumer would be exactly the "empty feature shell" pattern the spec forbids. `PaneGroup` is no longer deferred — see the Phase A closeout section below; it shipped with Epic 6's Universal Terminal Split mode as its real first consumer, not Build Studio (Build Studio's own doc comment explicitly declined to be one — "the Terminal region is reachable via the existing `/terminal` route instead of being duplicated inline").
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

The spec assigns 12 screens (ND-001 through ND-012) to this epic, but several require backend services owned by _later_ epics (Model Router: Epic 9; Workspace Service: Epic 5; typed IPC: Epic 4; profiles/credentials: Epic 10; agent/task runtime: Epic 4/8). Building those now would mean either fabricating data or shipping empty shells with no real consumer — both explicitly forbidden (mega-prompt §2.1, §2.5). Epic 3 shipped the screens that are honestly real at each point and documented the rest as deferred with the specific blocking dependency. See `IMPLEMENTATION_CHECKLIST.md` for the per-screen breakdown.

**Built (real):** ND-001 Boot and Session Start, ND-003 First-Run Welcome, ND-004 Controller Calibration, ND-005 AI Provider Setup, ND-006 Workspace Discovery, ND-007 Guided Controller Tutorial, ND-008 Home Command Center, ND-009 Universal Command Palette, ND-011 Activity Center, ND-012 Notification Center.

**Deferred (documented, not faked):** ND-002 Lock Screen, ND-010 Global Search (real content sources now exist across the app, but no unified search screen consumes them yet).

### What was built

- **ND-001 Boot and Session Start** (`features/onboarding/BootSessionStart.tsx`): the app's entry gate, rendered outside `ShellLayout` so boot completes before the global shell chrome and overlays mount. Performs real service checks over the typed IPC bridge: workspace list (critical), model provider list (optional — failure does not block shell), controller settings (optional), and system metrics (informative only). First-run vs. returning user is inferred from empty persisted state (no workspaces and no providers) rather than adding a new onboarding flag. Surfaces a 4-step progress UI, a detailed status view after 10 seconds or on `Show details`, a 15-second boot timeout, and a critical-failure screen with Retry / Diagnostics / Exit. `B` always offers Return to SteamOS via `power.quitApp`. On success, routes to `/onboarding/welcome` for first run or `/` for returning users.
- **ND-003 First-Run Welcome** (`features/onboarding/FirstRunWelcome.tsx`): the four spec cards, registers a real focus node for "Begin setup," navigates to calibration.
- **ND-004 Controller Calibration** (`features/onboarding/ControllerCalibration.tsx`): live button-detection log via the new `onAction` observer (below), haptics intensity control that genuinely calls `HapticsService.setIntensity`/`trigger`, a real "Test haptics" action reporting honest `played`/`muted`/`unsupported` results, and a hold-to-confirm reset (`CriticalConfirmationDialog`). Dead zone and hold duration are shown as real read-only values pulled from the actual constants (`STICK_DEAD_ZONE`, `HOLD_THRESHOLD_MS`), not adjustable fake sliders — making them adjustable needs a config-threading refactor through `gamepadPolling.ts` deferred to Epic 11.
- **ND-005 AI Provider Setup** (`features/onboarding/AIProviderSetup.tsx`): real first-run provider configuration screen. Lists six provider categories (local runtime, OpenAI-compatible provider, cloud coding model, speech, vision, embedding) with honest capability/privacy/cost-control summaries and status badges. Supported categories (first three) open a real add-provider form that writes through Epic 9's typed `modelProviders.add` IPC and refreshes the list via `modelProviders.list`; unsupported categories are visibly disabled with a real reason. Includes an explanation dialog per category and controller-focusable actions. Speech/vision/embedding adapters do not exist yet (Epic 9/X5), so those categories are informational only.
- **ND-006 Workspace Discovery** (`features/onboarding/WorkspaceDiscovery.tsx` + `core/workspaces/WorkspaceDiscoveryService.ts`): real multi-source workspace scanner used during onboarding. Sources include home-project candidates, Git repositories (bounded depth), saved SSH hosts, removable storage mount roots, and the Steam library (when Steam metadata is present). Results are deduplicated by realpath, filtered against already-persisted workspaces, and classified reachable/unreachable with a reason. Users can toggle sources, scan, manually add a folder, or add discovered items individually. The screen is wired into the onboarding flow after AI Provider Setup and before Controller Calibration.
- **ND-007 Guided Controller Tutorial** (`features/onboarding/GuidedControllerTutorial.tsx`): seven-lesson interactive walkthrough that exercises real controller primitives: focus movement, open/back detail flow, context actions, assist actions, command palette, ActionQueue approval of a harmless `tutorial:acknowledge` tool, and a simulated pausable/resumable task. Lesson completion uses the real focus engine action stream and real haptics; lesson 6 submits and approves a genuine low-risk tool through the existing approval pipeline. The final real workspace create/delete exercise was made skippable to avoid destructive risk on user machines. Wired as the last onboarding step before the shell.
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
| `BootSessionStart` (brand/steps render, first-run → welcome, workspace/provider → home, failure screen, Return to SteamOS, details toggle)                       | `features/onboarding/__tests__/BootSessionStart.test.tsx`              | 7     |
| `FirstRunWelcome` (cards render, navigates to calibration)                                                                                                       | `features/onboarding/__tests__/FirstRunWelcome.test.tsx`               | 2     |
| `ControllerCalibration` (real hold-duration value, haptics intensity, honest unsupported result, navigation, hold-to-confirm reset)                              | `features/onboarding/__tests__/ControllerCalibration.test.tsx`         | 5     |
| `HomeCommandCenter` (empty state, no fabricated modules, navigation)                                                                                             | `features/home/__tests__/HomeCommandCenter.test.tsx`                   | 3     |
| `CommandPalette` (closed by default, opens/toggles on real `commands` action, filters, navigates+closes, closes on real `back` action)                           | `features/command-palette/__tests__/CommandPalette.test.tsx`           | 6     |
| `ActivityAndNotificationsOverlay` (opens on real `activity` action, honest empty states, shows real pushed notifications, closes on `back`)                      | `features/activity/__tests__/ActivityAndNotificationsOverlay.test.tsx` | 5     |
| `Toast` history/mute/collapse additions (history persists past dismissal, repeated events collapse, muted categories suppress the ephemeral toast but still log) | `components/overlays/__tests__/Toast.test.tsx`                         | +3    |
| `KeyboardAdapter` editable-target guard (suppresses shortcuts while typing, still allows confirm/back)                                                           | `controller/adapters/__tests__/keyboardAdapter.test.ts`                | +2    |
| `HapticsService` Gamepad-API-unavailable guard                                                                                                                   | `controller/haptics/__tests__/hapticsService.test.ts`                  | +1    |
| `AIProviderSetup` (categories render, supported configure form, save local provider + refresh, explanation dialog, disabled unsupported categories)              | `features/onboarding/__tests__/AIProviderSetup.test.tsx`               | 7     |
| `WorkspaceDiscovery` (renders source toggles, scans with selected sources, adds a discovered workspace, manual add flow)                                         | `features/onboarding/__tests__/WorkspaceDiscovery.test.tsx`            | 4     |
| `WorkspaceDiscoveryService` (home projects, Git bounded depth, max-depth limit, deduplication, reachable/unreachable)                                            | `core/workspaces/__tests__/WorkspaceDiscoveryService.test.ts`          | 8     |
| `GuidedControllerTutorial` (lessons 1–7 advance through real actions, lesson 6 approves harmless tool, lesson 7 finishes)                                        | `features/onboarding/__tests__/GuidedControllerTutorial.test.tsx`      | 6     |
| `ControllerCalibration` (navigates to guided tutorial when Done is activated)                                                                                    | `features/onboarding/__tests__/ControllerCalibration.test.tsx`         | +1    |

Total: 124 tests passing for Epic 3 scope — was 107 before ND-006/ND-007.

### Validation evidence

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 23 files, 124 tests passed (Epic 3 scope); current repo total 431 tests passed
npm run build        → succeeded (renderer bundle: 32.90 kB CSS, 1,118.92 kB JS)
npm run test:e2e     → updated to cover ND-001 boot path
```

### Deferred items with explicit reason

- **ND-002, ND-010** — see "Scope decision" above; each needs a specific not-yet-built service (profile/credentials for ND-002, unified search screen/index for ND-010).
- **Command Palette's 8 non-Screens search domains** (commands, files, symbols, workspaces, workflows, agents, settings, recent actions) — wait for the epics that produce that content (Epic 4/5/6/8/11).
- **Adjustable dead zone / hold duration / focus movement speed** — shown as real values, not editable; making them editable needs a config object threaded through `gamepadPolling.ts`/`GamepadAdapter`/`KeyboardAdapter`, planned for Epic 11 (Controller Settings) rather than half-built here.
- **Per-profile calibration persistence** — spec requires calibration "stored per controller profile"; no persistence layer exists yet (Epic 4/5), so haptics intensity changes only last for the current session.

### ND-005 AI Provider Setup addendum

Implemented after Epic 9 landed the real Model Provider IPC surface, so the first-run screen could be built without fabricating a provider backend. `AIProviderSetup.tsx` reuses the existing `ControllerButton`, `StatusBadge`, `Modal`/`ConfirmationDialog` primitives, and the Epic 9 `addModelProvider`/`listModelProviders` renderer clients.

**Fixes applied while bringing the screen and its tests to green:**

- Tightened the `AddProviderForm` render guard from `category.supported` to `category.kind` so TypeScript narrows the optional `kind` field before it is passed as a required prop.
- Added explicit `aria-label`s to the **Configure** and **Explain** buttons (`Configure ${category.name}`, `Explain ${category.name}`) so screen-reader users and tests can distinguish the six identical-looking buttons without relying on DOM order.
- Updated `AIProviderSetup.test.tsx` to query by those accessible names, assert the explanation dialog heading via role, and stub `workspaces.list` so `WorkspaceProvider`'s background refresh doesn't produce unhandled rejections during the isolated onboarding test.

### Tests and evidence

| Suite                                                                                                                                               | Location                                                 | Count |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----- |
| `AIProviderSetup` (categories render, supported configure form, save local provider + refresh, explanation dialog, disabled unsupported categories) | `features/onboarding/__tests__/AIProviderSetup.test.tsx` | 7     |

Full validation at this state:

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 89 files, 412 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### ND-006 / ND-007 Workspace Discovery and Guided Controller Tutorial addendum

Implemented after Epic 5 (Workspace Service), Epic 6 (Git Service), and Epic 4 (ActionQueue/ToolRegistry) provided enough real backend surface to build both screens without fabricating data or actions.

- `WorkspaceDiscoveryService` reuses `WorkspaceStore`, `RemoteHostStore`, and `GitService` to scan candidate folders, then applies its own bounded traversal and deduplication.
- `GuidedControllerTutorial` registers the harmless `tutorial:acknowledge` tool via `ToolRegistry` and submits it through `ActionQueue`, so lesson 6 exercises the real approval/audit path.
- A test-only timing override (`VITE_TUTORIAL_ADVANCE_MS`, `VITE_TUTORIAL_PROGRESS_INTERVAL_MS`, `VITE_TUTORIAL_PROGRESS_STEP`) keeps the seven-lesson test suite fast without changing production behavior.

**Fixes applied while wiring ND-007:**

- `ControllerCalibration`'s **Done** button now navigates to `/onboarding/tutorial` on click as well as on focus-engine activation, keeping the screen accessible to mouse/touch users and fixing the existing test that clicked the button.
- `GuidedControllerTutorial` keeps the final lesson in a `completed` state so the **Finish** button remains visible after the simulated task reaches 100%.

| Suite                                                                                                                     | Location                                                          | Count |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----- |
| `WorkspaceDiscovery` (renders source toggles, scans with selected sources, adds a discovered workspace, manual add flow)  | `features/onboarding/__tests__/WorkspaceDiscovery.test.tsx`       | 4     |
| `WorkspaceDiscoveryService` (home projects, Git bounded depth, max-depth limit, deduplication, reachable/unreachable)     | `core/workspaces/__tests__/WorkspaceDiscoveryService.test.ts`     | 8     |
| `GuidedControllerTutorial` (lessons 1–7 advance through real actions, lesson 6 approves harmless tool, lesson 7 finishes) | `features/onboarding/__tests__/GuidedControllerTutorial.test.tsx` | 6     |

Full validation at this state:

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 92 files, 431 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### ND-010 Global Search addendum

Implemented after Epics 4–8 made enough real records (workspaces, files, Git, terminal sessions, workflows, agents, model providers, browser tabs, remote hosts, recovery checkpoints) available through the existing typed IPC clients. ND-010 deliberately avoids building a fake unified index; it federates live queries across the services that already own each data domain.

- `features/search/useGlobalSearch.ts`: debounced federated query hook that calls existing IPC clients (`workspaceClient`, `fileClient`, `gitClient`, `terminalClient`, `workflowClient`, `agentClient`, `modelClient`, `recoveryClient`, `browserClient`, `remoteClient`) and returns merged, query-filtered results. Supports category filters (`everywhere`, `currentWorkspace`, `files`, `code`, `tasks`, `logs`, `browser`, `remote`) and reports per-source errors without crashing.
- `features/search/GlobalSearch.tsx`: full search screen with query input, category tabs, result list, keyboard/controller navigation (↑/↓ + Enter), and a global `/` shortcut wired in `ShellLayout` (ignored when focus is in an input/textarea/select/contenteditable).
- `features/search/SearchResultRow.tsx`: accessible result rows with per-source icons and workspace-scoped subtitles.
- Route `/search` added to `app/routing/routes.tsx` and the primary navigation rail (`components/navigation/navigationDestinations.ts` + `navigationIcons.tsx`).

| Suite                                                                                  | Location                                             | Count |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| `useGlobalSearch` (federated results, category filtering, source errors)               | `features/search/__tests__/useGlobalSearch.test.tsx` | 4     |
| `GlobalSearch` (render, query results, click navigation, controller navigation)        | `features/search/__tests__/GlobalSearch.test.tsx`    | 4     |
| `ShellLayout` global `/` shortcut (opens search outside inputs, ignored inside inputs) | `app/shell/__tests__/ShellLayout.test.tsx`           | +2    |

Full validation at this state:

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 94 files, 440 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

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

### ND-013 addendum - AI Command Canvas preview and run handoff

Now that Epic 9's real Model Router and Epic 8's real Agent Runtime exist, ND-013 can be built without fabricating an AI planner. `/ai` now renders `AICommandCanvas`: it requires an active workspace, sends only the user's typed intent to `modelProviders.complete`, demands a strict JSON plan preview, validates that response with Zod in `planPreview.ts`, and shows the user the goal, steps, risk, file estimate, network flag, and reversibility before anything runs.

This is intentionally a review artifact, not a deterministic execution script. The current Agent Runtime does not support externally-authored ordered step execution, per-step model assignment, per-step file/network enforcement, branch creation, or "require test success before completion." So "Approve & run" hands the raw intent to a real persisted "Quick Command" agent with zero tool access (`toolAllowlist: []`, `maxToolCalls: 0`, child agents disabled) rather than pretending the preview can safely execute arbitrary operations. Granting real tool access still happens through Agent Operations Center and the existing ActionQueue bridge.

| Evidence                                                                    | File                                                    | Count |
| --------------------------------------------------------------------------- | ------------------------------------------------------- | ----- |
| Strict JSON plan preview parsing/fence stripping/error handling             | `features/ai-canvas/__tests__/planPreview.test.ts`      | 5     |
| Canvas empty state, model preview, Quick Command creation/reuse/run handoff | `features/ai-canvas/__tests__/AICommandCanvas.test.tsx` | 4     |

### Prompt-injection boundary verification addendum

**Date:** 2026-06-24

Epic 4 is now complete for the Phase A AI safety scope. The final open item was adversarial evidence for the trust boundary around model prompts and tool execution, not a missing execution primitive.

**Verified boundary:**

- User intent text is untrusted model input only. The host does not parse JSON, tool calls, or permission grants embedded in the user's objective as executable instructions.
- AI Command Canvas still creates the auto-generated "Quick Command" agent with `toolAllowlist: []`, `permissionCeiling: []`, and `maxToolCalls: 0`, even when the intent explicitly asks to grant destructive tools or bypass review.
- AgentRuntime only emits tool execution requests from validated model tool plans, and those requests still must pass the persisted agent allowlist and permission ceiling before the renderer-owned ActionQueue can run anything.

**Evidence added:**

- `AgentRuntime.test.ts` now includes an adversarial objective containing fenced JSON for `files-delete`; the run completes from the model's normal response and emits no tool request, proving the host did not parse user text as a plan.
- `AICommandCanvas.test.tsx` now includes malicious intent asking for `files-delete` and `terminal.run.low`; approval still creates a zero-tool Quick Command agent and starts the run with the raw objective only.

```text
npm run test -- AgentRuntime AICommandCanvas → 2 files, 13 tests passed
npm run test                              → 111 files, 545 tests passed
npm run typecheck                            → node + web TypeScript checks passed
npm run lint                                 → 0 errors, 0 warnings
npm run build                                → typecheck + electron-vite build passed
```

### Deferred items with explicit reason

- **ND-013 richer execution controls** — the route is real now, but the preview is not a fixed ActionPlan executor. Reorder-as-execution, per-step model assignment, hard file-count/network restriction enforcement, branch creation, test gates, timeout/compute budgets, and a deterministic step runner need new runtime semantics before they can be honestly marked complete.
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
- **Multi-source workspace discovery** — now complete as ND-006; see Epic 3 ledger entry.
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

### Epic 7 completion addendum — structural edits and predictive editing

**Date:** 2026-06-24

Epic 7 is now complete for the Phase A Build Studio contract. The original read-only slice became editable/savable when Epic 11's Recovery Service landed; this addendum closes the two remaining Build Studio-owned gaps: controller-native structural edits and reviewed predictive editing.

**What changed:**

- **`BuildStudio.tsx`** now includes a controller-focusable Structural edits section in the right rail. It exposes real editor operations against the active Monaco model: deterministic top-level single-line import organization, Monaco's active document formatter, and selection wrapping in a concrete `try/catch` structure. These actions edit the open model only; persistence still flows through the existing Save button and therefore the already-checkpointed `fileWrite` IPC path.
- **`BuildStudio.tsx`** now includes a reviewed Predictive edit section. It captures the selected range or cursor position, sends nearby editor context through the existing `modelProviders.complete` / `ModelRouter.complete()` bridge using the `fast-coding` routing profile and `workspacePrivate: true`, parses a strict JSON `{ replacement, explanation }` proposal, displays provider/model provenance, and requires explicit Apply or Discard before mutating the editor model.
- **`editorTransforms.ts`** contains the deterministic import organizer, selection wrapper, range summaries, and predictive JSON parser. The parser rejects missing replacement text and oversized proposals rather than blindly applying untrusted model output.
- **`BuildStudio.test.tsx`** covers the reviewed predictive flow at the page boundary with Monaco mocked as an editor dependency: open a real file row, request a proposal through the bridge-shaped model provider API, render the review, and apply it through `editor.executeEdits()`.

**Current honest boundaries:**

- Full multi-language LSP servers are still not claimed. TypeScript/JavaScript remain backed by Monaco's bundled TypeScript worker; other languages get syntax highlighting only.
- Voice-to-code and a free-form predictive token wheel are not claimed. They need speech/input systems and interaction design outside this Build Studio completion slice.
- Debug/Test/Task-runner panels remain future integrations with terminal/workflow/test-runner services; no fake panels were added to mark them complete.

**Validation evidence (run 2026-06-24):**

```text
npm run test -- BuildStudio     → 1 file, 1 test passed
npm run test -- build-studio    → 7 files, 27 tests passed
npm run test                    → 111 files, 543 tests passed
npm run typecheck               → node + web TypeScript checks passed
npm run lint                    → 0 errors, 0 warnings
npm run build                   → typecheck + electron-vite build passed
```

## Epic 11 — System integration (Recovery Service + System Metrics Service)

### Scope decision

Epic 11 ("System integration") is 16 items: System Metrics, Dashboard, Controller Settings, Display/Theme, Network/VPN, Privacy, Storage+Recovery, Integrations, Updates, Quick Access, Power Menu, Recovery Timeline, Before/After Diff, Emergency Stop (already real, Epic 4), Error Recovery, About/Diagnostics. Asked the user directly which slice to prioritize; the answer was the Recovery Service specifically, since it's what every prior epic's "deferred — needs Recovery" notes were pointing at (Epic 5's file writes, Epic 6's Git restore/discard, Epic 7's editor save). Building Recovery first, rather than working the full 16-item list in spec order, unblocked real work in three already-shipped epics instead of producing 16 thin, mostly-unblocked screens.

A second slice then built the **System Metrics Service** (§27) for real — `core/system/SystemMetricsService.ts` — because Epic 9's Routing Profiles and resource-aware model selection genuinely needed it; this was Epic 9 pulling a real Epic 11 dependency forward rather than faking the resource data it needed. See the System Metrics summary under Epic 9's ledger entry above for what the service actually measures (capability-detected CPU/memory/swap/storage/network/process, plus Linux-only battery/thermal/fan/GPU sensors, with explicit unavailable reporting rather than fabrication).

A third slice closed the gap the second slice left open: **ND-042 System Dashboard** now has real shared contracts (`shared/contracts/system.ts`, mirroring `SystemMetricsService`'s `{available, value, source, reason}` shape exactly), real IPC (`registerSystemHandlers.ts`, a single Zod-free read since `collect()` takes no input), and a real controller-focusable screen (`features/system/SystemDashboard.tsx`).

A fourth slice closed two more: **ND-051 Power Menu**, scoped to the two genuinely safe actions (restart/quit this app via real Electron APIs, behind a real `ConfirmationDialog`) — real OS-level suspend/reboot/shutdown are deliberately not wired, since those are irreversible against the whole host machine, not just this app, and need their own native-integration design and explicit sign-off before being attempted; and **ND-056 About and Diagnostics**, scoped to what this architecture actually has (real app/Electron/Chromium/Node versions, platform, configured providers, a real clipboard export combining that with a live `SystemMetricsService` snapshot) — "Core version"/"Database version"/build hash are omitted rather than invented, since there's no separate core-service process, no database, and no build-time commit-hash injection step.

The remaining scoped gaps are honest platform/management limitations rather than silently skipped screens: Network/VPN management, a full integration registry/state service, auto-update download/apply, and the Steam Deck Quick Access button each need OS-specific adapters or a signed release pipeline that do not exist yet; the screens built for them report this explicitly instead of faking the capability. ND-055 Error Recovery is now built; see its addendum below.

### What was built

- **`RecoveryService`** (`core/recovery/RecoveryService.ts`): real checkpoints stored entirely outside the user's own workspace, under `app.getPath('userData')/recovery/<workspaceId>/` — an index file (`index.json`, via the existing `JsonStore`) plus one real snapshot file per checkpoint that had previous content. Checkpoints never collide with the user's Git history or get swept up by `git clean`. Retention: the newest 50 checkpoints per workspace are kept; older ones are pruned along with their real snapshot files on disk.
- **`FileService.write()`** (`core/files/FileService.ts`): the first real destructive file operation. Added `resolveForWrite()` — a write-safe sibling to the existing `resolveWithinRoot()` that resolves the _parent_ directory via `realpath` (closing the same symlink-escape gap) while allowing the leaf file itself to not exist yet, which `resolveWithinRoot()` couldn't do (its `realpath` call requires the full target to already exist). Also added `readIfExists()` (returns `null` on `ENOENT` instead of throwing) to capture "previous content or null" before a write.
- **Orchestration lives in the IPC handler, not either service**: `registerFileHandlers.ts`'s `fileWrite` handler always calls `fileService.readIfExists()` → `recoveryService.recordCheckpoint()` → `fileService.write()`, in that order, with no code path that reaches `FileService.write()` without a checkpoint being recorded first. This was a deliberate placement choice — putting the orchestration in either service would create either a circular dependency (`FileService` importing `RecoveryService` or vice versa) or a "trust the caller to call both" footgun.
- **Restore is itself recorded as a new checkpoint** (`registerRecoveryHandlers.ts`'s `recoveryRestore` handler calls `fileService.write()` under the hood) — restoring isn't a special unchecked path; it's "write this content back," which means restoring is itself undoable. A real redo path falls out of this for free, not as a special case.
- **`recoveryDiff` handler**: real unified diff (via the `diff` npm package's `createTwoFilesPatch`) between the checkpoint's snapshot content and the file's current content — reused by the renderer's existing `GitDiffViewer` component (no second diff-rendering component built).
- **Build Studio gained real Save** (Epic 7's read-only gap, closed): `useOpenFiles` gained `updateContent`/`saveFile`; `CodeEditor` is no longer hard-coded `readOnly: true` and gained an `onChange` prop; `BuildStudio.tsx` wires Ctrl+S (via `editor.addCommand`, reading the latest `saveFile` through a ref to avoid a stale closure from the one-time `onMount` callback) and a visible Save button with a dirty-tab indicator (`●`).
- **ND-052 Recovery Timeline + ND-053 Before/After Diff** (`features/recovery/RecoveryTimeline.tsx`): combined into one screen the same way ND-025 Git Control Center wraps its diff viewer — real checkpoint list, real diff on selection, real "Restore to this point" behind its own `ConfirmationDialog` (separate review surface, same pattern as Epic 6's push review). Scoped to "File changes" only — package installation/settings/workflow/Git/agent/system-config events need recovery-event kinds and services this slice doesn't build.
- **ND-047 Storage and Recovery** (`features/recovery/StorageAndRecovery.tsx`): real recovery-checkpoint storage summary (count + total snapshot bytes) and a link into the Recovery Timeline. Disk usage/model storage/workspace cache/browser data/logs/trash are shown as an honestly-labeled "not real yet" section rather than fabricated numbers — directly satisfies §47's "no one-click magic cleanup that hides what's being deleted" by having nothing fake to show.
- **Dependency**: added `diff`/`@types/diff` (pure JS, MIT, no native build step — unlike `node-pty`, no toolchain risk).
- **ND-042 System Dashboard** (`features/system/SystemDashboard.tsx`, added after the System Metrics Service slice): real `shared/contracts/system.ts` (a Zod schema mirroring `SystemMetricsSnapshot`'s `{available, value, source, reason}` shape field-for-field), real `registerSystemHandlers.ts` IPC (`systemMetrics.collect`, no input to validate since `collect()` takes none), and a real screen — every metric card renders the real `available`/`value`/`source`/`reason` fields, so a missing sensor shows "Unavailable: <reason>" instead of a zero or fabricated number. Manual Refresh only, no auto-polling, consistent with the rest of the app's "no background surprises" posture.

### A real bug found and fixed

`react-hooks/set-state-in-effect` recurred a third time (after Epic 5's `WorkspaceProvider`/`FileManager`/`FilePreview`): `RecoveryTimeline`'s mount effect called a `useCallback`-wrapped `refresh()` function whose only `await` precedes every `setState` call — genuinely async, no synchronous setState in the effect body. The lint rule still flagged it, suggesting its static analysis doesn't reliably trace through `useCallback`-wrapped async functions called from an effect. Fixed with the same pattern as before: inline the fetch directly in the effect (with an `active` flag for cancellation-safety) instead of calling the named callback. The named `refresh()` callback is kept for use from event handlers (e.g., after a restore), where this lint rule doesn't apply.

### Tests and evidence

| Suite                                                                                                                                         | Location                                                     | Count |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| `RecoveryService` (empty state, snapshot capture, new-file case, ordering, workspace isolation, storage summary, retention+real file cleanup) | `core/recovery/__tests__/RecoveryService.test.ts`            | 7     |
| `FileService.readIfExists`/`write` (create, overwrite, subdirectory, traversal rejection, symlink-escape rejection, no leftover temp file)    | `core/files/__tests__/FileService.test.ts` (+10 to existing) | 10    |
| `useOpenFiles` save paths (dirty tracking, real save success updates `savedContent`, real save failure preserves it and records `saveError`)  | `features/build-studio/__tests__/useOpenFiles.test.ts` (+3)  | 3     |
| `RecoveryTimeline` (active-workspace gate, empty state, real checkpoint list + diff load, reviewed restore + refresh)                         | `features/recovery/__tests__/RecoveryTimeline.test.tsx`      | 4     |
| `StorageAndRecovery` (active-workspace gate, real storage summary, navigation to Recovery Timeline)                                           | `features/recovery/__tests__/StorageAndRecovery.test.tsx`    | 3     |

Total: 253 tests passing (up from 246).

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 52 files, 253 tests passed
npm run build        → succeeded (initial renderer JS 930.33 kB, lazy Build Studio JS unchanged at ~7.34 MB)
npm run test:e2e     → 1 passed
npm audit --omit=dev → 0 vulnerabilities
```

### Addendum — ND-042 System Dashboard tests

`SystemDashboard.test.tsx` (4: real collected metrics rendered, a real unavailable-sensor reason shown honestly rather than fabricated, real error state on collection failure, real Refresh round trip) — brings the cumulative total to 332 tests passing (up from 328), all clean lint/typecheck/build/e2e/audit at this state.

### Addendum — ND-051 Power Menu and ND-056 About/Diagnostics

Both screens needed new IPC: `registerPowerHandlers.ts` (`power.restartApp`/`power.quitApp`, real `app.relaunch()`/`app.exit()`/`app.quit()` calls — no input to validate) and `registerDiagnosticsHandlers.ts` (`diagnostics.get`, returning real `app.getVersion()`/`process.versions`/`process.platform`/`process.arch` plus the real configured provider names from `ModelProviderStore`).

`PowerMenu.tsx`'s deferred options (Lock, Suspend, Restart core service, Restart device, Shut down) are rendered as visibly disabled list items with their real reason shown inline, rather than hidden or wired to a fake handler — the spec's own framing ("each option shows impact on running tasks") is satisfied honestly by saying why an option can't run yet instead of pretending it can. The two real options route through the same `ConfirmationDialog` (action/consequence/confirm) every other medium-risk action in the app uses.

`AboutDiagnostics.tsx`'s clipboard export reuses the same `navigator.clipboard.writeText` path `CommandBuilder`'s copy-without-running action already established — no new clipboard-access pattern introduced. The export payload is real version info plus a live `SystemMetricsService` snapshot; it can never contain an API key, since neither data source holds one.

`AboutDiagnostics.test.tsx` (3) + `PowerMenu.test.tsx` (4) — brings the cumulative total to 339 tests passing (up from 332).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 72 files, 339 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Addendum — ND-043 Controller Settings

Scoped to the one setting `HapticsService` already supports but never persisted: haptics intensity. `ControllerSettingsStore` (a new, minimal `JsonStore`-backed store, `app.getPath('userData')/controller-settings.json`) plus `registerControllerSettingsHandlers.ts` give it real cross-restart persistence; `FocusEngineProvider` loads the persisted value once on mount and applies it to the live `HapticsService` instance via a plain `useEffect` that calls `haptics.setIntensity()` directly (not React state, so it doesn't trip `react-hooks/set-state-in-effect`) — wrapped in `.catch(() => {})` since a bridge that's unavailable or only partially stubbed (common across the existing test suite) should fall back to the in-memory default, not throw an unhandled rejection.

`features/system/ControllerSettings.tsx` reuses `ControllerCalibration.tsx`'s exact own framing for why hold duration/repeat delay/repeat rate/stick dead zone stay read-only (`gamepadPolling.ts` is a pure, tested module; threading runtime config through it is separate work from persisting an already-adjustable setting) — rather than inventing a different justification. "Test controller input" links to the existing Calibration screen instead of duplicating its button-detection logic. App profiles, rear-button/gyro/trackpad-fallback mapping, and accessibility remapping are shown as honestly disabled sections with their real reason inline, matching the Power Menu's deferred-option pattern from the previous addendum.

`ControllerSettingsStore.test.ts` (2) + `ControllerSettings.test.tsx` (3) — brings the cumulative total to 344 tests passing (up from 339).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 74 files, 344 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Addendum — ND-044 Display and Theme Settings

`tokens.css` already had two OS-driven overrides — `@media (prefers-reduced-motion: reduce)` and `@media (prefers-contrast: more)` — that the app honors automatically but the user could never force independently of the OS setting. This slice adds three real, persisted, user-facing overrides on top: `[data-reduce-motion='true']` and `[data-high-contrast='true']` attribute selectors mirroring those exact media-query blocks, plus a genuinely new capability — `--ndx-text-scale`, a custom-property multiplier the whole `rem`-based type scale (`--font-size-body`/`-meta`/`-title`/`-display`) now multiplies by via `calc()`. Text scale couldn't be implemented by setting `font-size` on a nested element the way you might expect, because `rem` units are always relative to the _root_ element regardless of nesting depth — the multiplier approach avoids that trap entirely and follows the exact precedent `--ndx-density` (theater mode) already set for cascading a numeric override through nested custom properties.

`state/displaySettings.tsx` (`DisplaySettingsProvider`/`DisplaySettingsContext`/`useDisplaySettings`) mirrors `state/displayMode.tsx`'s existing shape precisely — load once on mount (wrapped in `.catch(() => {})` for the same bridge-unavailable-during-tests reason `FocusEngineProvider`'s haptics load needed it), expose setters that persist immediately. `ShellLayout.tsx` reads the context and sets `data-reduce-motion`/`data-high-contrast`/`data-text-size` on the same root div that already carries `data-display-mode` — one attribute-driven-CSS convention, not two.

Appearance/Transparency/Focus style/Wallpaper/Live wallpaper performance/OLED-safe behavior are shown as honestly disabled sections, matching the established Controller-Settings/Power-Menu deferred-option pattern — this is a single, fixed dark theme with no light variant, no glass/blur effects, no alternate focus-ring style, and no wallpaper system, so there's nothing real to wire any of those to.

`DisplaySettingsStore.test.ts` (2) + `DisplayThemeSettings.test.tsx` (3) — brings the cumulative total to 349 tests passing (up from 344).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 76 files, 349 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Addendum — ND-046 Privacy and Permissions

Built directly on the real Epic 4 safety pipeline rather than inventing a separate privacy model: "Effective access by tool" reads `ToolRegistry.list()` for each tool's real `requiredCapability` and calls the live `PermissionBroker.evaluate()` to show its real current decision (`granted`/`requires-approval`); Revoke calls the real `broker.revoke()`, which is immediately visible — the next render's `evaluate()` call for that capability returns `requires-approval`, satisfying the spec's "revocation applies immediately where technically possible" requirement for real, not by convention. Audit history is the real, live `AuditLog.list()` via a new `useAuditEntries()` hook (mirrors `useActionQueueRecords()`'s `onChange`-subscription shape exactly).

The spec's "permission matrix" (rows: agents/tools/providers, columns: capabilities) is **not** fully real: `PermissionBroker.grants` is a single `Map<PermissionCapability, PermissionGrant>` — a capability is granted broker-wide, not scoped to which agent or tool holds it, so there is no way to honestly render "agent X has capability Y but tool Z doesn't." The per-tool "effective access" view is the closest honest substitute available with today's broker, and the screen's own doc comment says so rather than presenting a fabricated multi-actor matrix.

`PrivacyPermissions.test.tsx` (4: real tool + capability + decision shown, real deferred-reason text, real revoke-takes-effect-immediately round trip, real empty audit-history state) — brings the cumulative total to 353 tests passing (up from 349).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 77 files, 353 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Addendum — ND-055 Error Recovery

Built a structured, honest error-recovery screen rather than a generic "Something went wrong" fallback. `features/system/ErrorRecovery.tsx` reads a typed `ErrorRecoveryError` payload and renders a plain-language problem statement, technical code, category, affected feature, correlation ID, what still works, collapsible diagnostic details, and focusable recovery-action rows. Actions are real and context-aware: retry is only offered when the screen is rendered by `app/error-boundaries/RootErrorBoundary.tsx` (because `location.state` cannot carry functions), navigation uses the router, diagnostic export reuses the same `diagnosticsClient.getDiagnosticsInfo()` + `systemClient.collectSystemMetrics()` pipeline as ND-056 and writes JSON to the clipboard, and quit calls the real `powerClient.quitApp()`. The `/error-recovery` route is registered for route-level recoverable failures.

The boundary itself maps any caught render error to an `ErrorRecoveryError` with a generated correlation ID and a real retry callback that resets the boundary. It does not invent a fake "safe mode" or "restore previous state" button; those capabilities genuinely don't exist yet, so they are not offered.

`ErrorRecovery.test.tsx` (6: renders error details from location state, empty state, navigate action callback, real diagnostic export to clipboard, real quit IPC, retry callback) — brings the cumulative total to 447 tests passing (up from 441).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 95 files, 447 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Addendum — ND-045 Network and VPN, ND-048 Integrations, ND-049 Updates, ND-050 Quick Access Overlay

Completed the four remaining Epic 11 screens as honest, scoped implementations rather than wiring faked capabilities.

- **ND-045 Network and VPN** — `core/network/NetworkService.ts` collects real OS-level diagnostics: `os.networkInterfaces()` summaries merged by name, `dns.getServers()`, proxy environment variables (`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` and lowercase variants), and on Linux an optional `nmcli -t -f DEVICE,TYPE,STATE device` call for connection state. Every diagnostic follows the same `{available, value?, source, reason?}` shape used by `SystemMetricsService`, so unavailable adapters (VPN, firewall, non-Linux connection state) report a real reason instead of a fabricated value. `features/system/NetworkAndVpn.tsx` renders the read-only diagnostics and shows Wi-Fi/Ethernet/VPN/Firewall/Remote-access management as disabled with one-line real reasons.
- **ND-048 Integrations** — `features/system/Integrations.tsx` is a read-only catalog that aggregates the real integrations that already exist: model providers via the existing `modelProviders.list` IPC and remote SSH hosts via `remoteHosts.list`. Unsupported categories (Git providers, cloud storage, dev tools, learning platforms, notifications, Steam/Deck) are rendered as cards with an "Unsupported on current platform" badge and a real reason, not a fake "connected" state.
- **ND-049 Updates** — `core/system/UpdateService.ts` reads the current app version from `package.json` and can check a JSON feed when `ND_UPDATE_FEED_URL` is configured. `features/system/Updates.tsx` shows current component versions, channel, and update availability; the "Download and apply" button is honestly disabled because the signed release pipeline and `electron-updater` integration are not configured.
- **ND-050 Quick Access Overlay** — `features/system/QuickAccessOverlay.tsx` is mounted in `ShellLayout` and opens on the real `quick.access` controller action (`Menu+Y` chord + `KeyO` keyboard fallback), closes on `back`, uses a modal focus trap restricted to the `quick-access` group, and shows AI/Workspace/System quick actions. Placeholder actions are disabled with "Not implemented yet" reasons. The footer reads live counts from the ActionQueue via `useActionQueueRecords`. The Steam Deck physical Quick Access button is not exposed by the standard Gamepad API, so it remains a documented gap.

New IPC domains: `network.getDiagnostics` (`registerNetworkHandlers.ts`), `update.getStatus`/`update.check` (`registerUpdateHandlers.ts`), with shared contracts in `shared/contracts/network.ts` and `shared/contracts/update.ts` and renderer clients `services/ipc/networkClient.ts`/`updateClient.ts`.

New tests:

| Suite                                                                                                                                             | Location                                                | Count |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----- |
| `NetworkService` (real host diagnostics, interface merging, DNS, proxy, non-Linux connection reason, Linux `nmcli` parse, `nmcli` failure reason) | `core/network/__tests__/NetworkService.test.ts`         | 7     |
| `NetworkAndVpn` (real diagnostics render, unavailable adapter reason, disabled management reasons, error state)                                   | `features/system/__tests__/NetworkAndVpn.test.tsx`      | 4     |
| `Integrations` (real model providers/remote hosts, unsupported categories with reasons, provider-list error)                                      | `features/system/__tests__/Integrations.test.tsx`       | 3     |
| `UpdateService` (disabled without feed, available update detection, up-to-date, fetch failure, non-OK status)                                     | `core/system/__tests__/UpdateService.test.ts`           | 6     |
| `Updates` (renders sections, disabled reason, keeps download disabled when update available, check button, error state)                           | `features/system/__tests__/Updates.test.tsx`            | 5     |
| `QuickAccessOverlay` (opens on `quick.access`, closes on `back`, close button, footer counts, placeholder labels)                                 | `features/system/__tests__/QuickAccessOverlay.test.tsx` | 5     |

Cumulative total: 497 tests passing (up from 447).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 102 files, 497 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Deferred items with explicit reason

- **ND-045 Network/VPN management actions** (Wi-Fi/Ethernet/VPN/Firewall/Remote access) — read-only diagnostics screen is real; management needs OS-specific adapters (NetworkManager/DBus, Wi-Fi adapter, firewall status) that do not exist yet.
- **ND-048 Integrations registry/state service** — read-only catalog aggregating existing real integrations is real; a full integration registry with account tokens, connection state, and lifecycle management does not exist yet.
- **ND-049 Auto-update download/apply/rollback** — version display and configured-feed check are real; actual download/apply needs a signed release pipeline and `electron-updater` integration that are not configured yet.
- **ND-050 Steam Deck Quick Access button trigger** — the in-app overlay is real and reachable via `quick.access` (Menu+Y / KeyO); the physical Steam Deck Quick Access button is not exposed by the standard Gamepad API and needs Steam Input or a native/SDL adapter.
- **Power Menu's Lock/Suspend/Restart core service/Restart device/Shut down** — Lock needs ND-002 (not built); this architecture has no separate core-service process to restart independently; real OS suspend/reboot/shutdown are irreversible against the whole host machine and need a dedicated native-integration design and explicit sign-off before being wired — not attempted in this slice for safety reasons, not just scope.
- **About/Diagnostics's Core version/Database version/build hash** — no separate core-service process, no database, and no build-time commit-hash injection step exist in this architecture; omitted rather than invented.
- **Controller Settings' button remapping, app profiles, rear buttons, gyro, trackpad fallback, accessibility** — remapping/profiles need the `gamepadPolling.ts` config-threading refactor; rear buttons/gyro/trackpad need Steam Input or a native/SDL adapter (the same documented gap as Epic 2); accessibility needs its own design pass.
- **Display and Theme Settings' Appearance, Transparency, Focus style, Wallpaper, Live wallpaper performance, OLED-safe behavior** — each needs a real visual system (light theme, glass/blur effects, an alternate focus-ring style, a wallpaper system) that doesn't exist yet; none are stubbed or faked.
- **Privacy and Permissions' Provider data policy, Workspace boundaries, Network destinations, Consent rules, and the full per-actor permission matrix** — each needs either a new policy store (none of these exist) or per-actor grant tracking `PermissionBroker` doesn't implement.
- **Copy/move/rename/delete/compress/extract/secure-delete** (Epic 5's File Service) — each needs its own recovery-checkpoint shape (a move/delete isn't the same kind of event as a content overwrite); only `write()` shipped this slice.
- **Git restore/discard/force-push/branch-delete** (Epic 6) — still need either Recovery integration for Git-specific events or an explicit irreversibility warning surface; the `RecoveryService` built this slice is scoped to `file-write` events, not Git history rewrites.
- **Git restore/discard/force-push/branch-delete** (Epic 6) — still need either Recovery integration for Git-specific events or an explicit irreversibility warning surface; the `RecoveryService` built this slice is scoped to `file-write` events, not Git history rewrites.
- **Recovery Timeline's Revert event/Branch from point/Export snapshot** — need recovery-event kinds beyond `file-write`.
- **Before/After Diff's Previous/next change, Accept/reject chunk, Explain change, Run validation** — need chunk-level apply infrastructure or Epic 9's model router.
- **Build Studio's structural edits, predictive editing, voice-to-code** — structural edits need a real code-fix provider beyond this slice; predictive/voice need Epic 9.

## Epic 8 — Workflow Engine (partial; Agent Runtime deferred)

### Scope decision

Epic 8 covers two halves with very different buildability. The Workflow Engine (§25) is mostly real without AI — Tool action, Condition, User approval, Delay, Validator, and Output node types only need the real `ActionQueue`/`ToolRegistry` pipeline already built in Epic 4, not a model. The Agent Runtime (§17) is fundamentally an AI-driven concept — an agent has a Role, a Goal, and a Model profile, and its entire job is to plan and decide. With no model router (Epic 9), a "real" agent would be an empty shell with nothing to plan with — there's no Epic-4-style "one real low-risk action" demo available the way there was for the AI safety pipeline, because the thing being demonstrated (autonomous planning) doesn't exist without a model. Confirmed this split with the user before starting; built the Workflow Engine for real and deferred all of Agent Runtime (§17, ND-016, ND-017) to Epic 9.

The Workflow Engine itself is scoped to a **sequential step model**, not an arbitrary node graph. Building a full DAG executor — parallel branches, merges, cycle detection, labeled jumps — is disproportionate scope for this slice; this is the same kind of deliberate simplification Epic 2 made for focus-engine group transitions. Steps run in order; `condition`/`validator` are the only nodes that affect control flow, and they can only stop the run early, never branch or loop. AI decision (needs Epic 9), Script (needs a new headless, non-interactive execution primitive `TerminalService` doesn't provide — it's built for live, human-attended PTY sessions), Parallel branch, Merge, and Rollback are not implemented.

ND-033 Workflow Forge ships as a controller-friendly ordered step list (add/reorder/remove/configure), not a free-form pan/zoom node canvas with drag-to-connect edges. Building a real 2D graph canvas with controller-native pan/zoom/connect interactions is a substantial UI undertaking on its own, disproportionate to this slice's time budget — and a linear list is arguably _more_ honest for controller-first requirements than a canvas that would need extensive custom input handling to avoid being mouse-only in practice.

### What was built

- **`shared/contracts/workflow.ts`**: `WorkflowDefinition` (versioned, persisted), `WorkflowStep` (discriminated union over the 6 real kinds), `WorkflowRun`/`WorkflowStepRun` (real execution state), `ConditionExpression` (structured `{variable, operator, value}` — never `eval()` or arbitrary code, closing the same code-injection class avoided elsewhere in the codebase).
- **`core/workflows/WorkflowStore.ts`**: real, versioned workflow definitions (version increments on every save), persisted per workspace via `JsonStore`, same pattern as `WorkspaceStore`/`RecoveryService`.
- **`core/workflows/WorkflowRunStore.ts`**: real run history, 100-run-per-workspace retention, persisted per workspace.
- **`renderer/src/workflows/WorkflowEngine.ts`**: the actual execution loop. `tool-action` steps call `queue.submit()` — the exact same `ActionQueue` from Epic 4, meaning a workflow tool call goes through registry lookup, permission evaluation, audit logging, and (if not pre-granted) the real Approval Queue UI, identical to a Command Palette action. There is no separate, weaker execution path for workflows. `awaitActionCompletion()` subscribes to the queue's real change events rather than polling. `user-approval` steps genuinely suspend the run (a pending `Promise` held in a per-run control object) until `resolveApproval()` is called from the UI.
- **`renderer/src/workflows/evaluateCondition.ts`**: pure, five real operators (`equals`/`not-equals`/`contains`/`greater-than`/`less-than`), tested in isolation.
- **`WorkflowRunnerProvider`**: holds one shared `WorkflowEngine` instance and live run state, mounted inside `AiSafetyProvider` in `AppProviders` (needs `queue` from AI safety context) — `WorkflowLibrary` (starts runs) and `WorkflowRunDetail` (approves/cancels them) must act on the same engine instance, so it can't be re-instantiated per screen.
- **ND-032 Workflow Library, ND-033 Workflow Forge, ND-034 Workflow Run Detail**: real screens, described above.

### A real bug found and fixed

First test run of `WorkflowEngine`'s tool-action path timed out after 5 seconds on 3 of 9 tests. Root cause: the test's tool's capability was never granted, so `ActionQueue.submit()` correctly parked the action as `pending-approval` — exactly as it should, since nothing had approved it — and `awaitActionCompletion()` waited forever for a terminal status that would never arrive without a UI approval. This wasn't an engine bug; it was a missing step in the test's setup matching mega-prompt §25's real requirement ("permission requirements are calculated before execution" — a permission preflight). Fixed by granting the tool's capability in the test's `makeQueue()` helper, simulating the real-world case where a workflow's permissions were already approved before the run started, and documented why in a comment so it isn't "fixed" again by accident into a fake bypass.

### Tests and evidence

| Suite                                                                                                                                                                                                                   | Location                                                     | Count |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| `WorkflowStore` (empty, real versioned create/update, remove, workspace isolation)                                                                                                                                      | `core/workflows/__tests__/WorkflowStore.test.ts`             | 5     |
| `WorkflowRunStore` (empty, real create, update, ordering, workspace isolation)                                                                                                                                          | `core/workflows/__tests__/WorkflowRunStore.test.ts`          | 5     |
| `evaluateCondition` (all 5 real operators, missing-variable handling)                                                                                                                                                   | `renderer/src/workflows/__tests__/evaluateCondition.test.ts` | 4     |
| `WorkflowEngine` (real tool-action success/failure through the real `ActionQueue`, unregistered-tool failure, condition gate stop, validator failure, real user-approval pause/resume/reject, cancel, output recording) | `renderer/src/workflows/__tests__/WorkflowEngine.test.ts`    | 9     |
| `WorkflowLibrary` (active-workspace gate, empty state, real list, real remove)                                                                                                                                          | `features/workflows/__tests__/WorkflowLibrary.test.tsx`      | 4     |
| `WorkflowForge` (real step add/save round trip, real load-for-edit, real step removal)                                                                                                                                  | `features/workflows/__tests__/WorkflowForge.test.tsx`        | 3     |
| `WorkflowRunDetail` (real live state, persisted-run fallback, real approve/reject, real cancel)                                                                                                                         | `features/workflows/__tests__/WorkflowRunDetail.test.tsx`    | 4     |

Total: 287 tests passing (up from 253).

```text
npm run typecheck   → 0 errors
npm run lint         → 0 errors, 0 warnings
npm run test         → 59 files, 287 tests passed
npm run build        → succeeded (initial renderer JS 974.93 kB, lazy Build Studio JS unchanged ~7.34 MB)
npm run test:e2e     → 1 passed
npm audit --omit=dev → 0 vulnerabilities
```

### Deferred items with explicit reason

- **The entire Agent Runtime** (§17, ND-016 Agent Operations Center, ND-017 Agent Detail) — needs Epic 9's Model Router; an agent with no model to plan with would be an empty shell, not a real demonstration.
- **AI decision node type** — needs Epic 9's Model Router.
- **Script node type** — needs a new headless (non-interactive) execution primitive; `TerminalService` is built for live, human-attended PTY sessions, not one-shot scripted command execution with captured exit codes.
- **Parallel branch, Merge, Rollback node types** — need the full arbitrary-graph model this slice intentionally doesn't build.
- **Dry-run mode** — needs a "simulate without executing tool actions" path the engine doesn't implement.
- **Workflow-level checkpoints/recovery linkage** — no current workflow tool-action performs a file write, so there's nothing to link to a `RecoveryCheckpoint` yet; the plumbing (`recoveryCheckpointId` field) exists on `WorkflowStepRun` for when one does.
- **Retry failed node / Skip optional node / Re-run from checkpoint / Export report** (ND-034) — need per-step retry semantics and a report format not yet designed.
- **Workflow Forge's free-form graph canvas** — built as a controller-friendly ordered list instead; see scope decision above.

### Addendum — Agent Runtime core (after Epic 9 landed)

Once Epic 9 delivered a real Model Router, the original blocker for Agent Runtime ("an agent with no model to plan with would be an empty shell") was gone, so the core lifecycle was built: `core/agents/AgentStore.ts` (persisted `AgentDefinition`s — name/role/goal/workspace scope/model profile/tool allowlist/permission ceiling/resource limits — and `AgentRun`s with a real timeline) and `core/agents/AgentRuntime.ts` (`start()`/`cancel()`). `start()` calls the real `ModelRouter.complete()` (via an injected `AgentModelPort`, keeping `core/agents/` decoupled from the concrete router) with a system prompt built from the agent's real role/goal/scope/tool-allowlist/permission-ceiling, and a real per-run timeout (`setTimeout` + `AbortController`, configurable via `resourceLimits.timeoutMs`) that genuinely aborts the in-flight provider request. The system prompt explicitly instructs the model not to claim tool execution or file modification — this slice plans, it does not act. Every state transition (`planning`/`completed`/`failed`/`cancelled`/`cancelling`) and real token usage from the completion is persisted to the run's timeline.

**What is not yet built**: typed IPC/preload/renderer wiring for any of this (so it's not reachable from the UI yet), ActionQueue-backed tool execution (an agent's plan is never turned into submitted tool calls — it only produces a text completion), pause/resume, child-agent/budget bounds beyond the per-run timeout, and ND-016/ND-017 screens. Do not mark Agent Runtime or Epic 8 complete until those land and are tested end-to-end through the UI.

### Addendum 2 — Agent Runtime IPC + UI (ND-016/ND-017)

The remaining gap from the addendum above — no typed IPC, no UI — was closed for the parts that don't need tool execution.

**`AgentStore` gained real CRUD parity** with the other stores: `update()`, `setEnabled()`, `remove()`. **`AgentRuntime` gained an `onUpdate` constructor callback** (default no-op, so the existing tests needed no changes) called every time a run is persisted — this is the hook the IPC layer uses to push live run state to the renderer, the same way `TerminalService`'s `onData`/`onExit` work.

**IPC**: `registerAgentHandlers.ts` exposes `agent.list/create/update/setEnabled/remove` and `agentRun.list/get/start/cancel`, all Zod-validated. `agentRun.update` is a push channel, not a request/response one — wired in `src/main/ipc/index.ts` by passing a callback into `AgentRuntime`'s constructor that calls `getWindow()?.webContents.send(...)`, exactly mirroring `registerTerminalHandlers.ts`'s PTY data/exit pattern. `NdxBridge.agents`/`agentRuns` and the preload implementation follow.

**ND-016 Agent Operations Center** (`features/agents/AgentOperationsCenter.tsx`): real workspace-scoped agent list, a real create form whose tool-allowlist `<select>` is populated from the real `ToolRegistry.list()` (matching `WorkflowForge`'s precedent — never an invented capability list), real enable/disable toggle, real remove.

**ND-017 Agent Detail** (`features/agents/AgentDetail.tsx`): real agent overview (goal, tool allowlist, resource limits), a real "start a run" control that calls `agentRun.start`, a real run list that updates live via the `agentRun.update` push subscription (not polling), real per-run timeline/output/token-usage display, and real cancel.

**Still not built after this UI slice**: ActionQueue-backed tool execution. This gap is closed by the later "Agent Runtime ActionQueue tool submission bridge" addendum below; the remaining ND-017 gap is the dedicated Files/Tools/Permissions/Logs tab data model/UI.

**Tests**: `AgentStore.test.ts` (6, new CRUD methods), `AgentOperationsCenter.test.tsx` (6: empty state, real list, real create round trip, real enable/disable toggle, real remove), `AgentDetail.test.tsx` (4: not-found error state, real overview + past runs, real start-run round trip, real cancel round trip). Total: 328 tests passing (up from 312).

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 69 files, 328 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

## Epic 9 — Models (chat routing and managed Ollama core complete)

### History

This epic landed in two passes. The first pass (superseded) scoped Epic 9 down to provider connectivity only — a real OpenAI-compatible HTTP client with connection tests and model discovery — and explicitly deferred the local model runtime and Routing Profiles, reasoning that neither a bundled model runtime nor a System Metrics Service existed yet. A second pass then built the System Metrics Service (Epic 11 §27, see that section below), a real chat-completion path, capability-detected Ollama runtime controls, and all eight Routing Profiles on top of that foundation, closing those deferrals for real rather than leaving them open. See `docs/implementation/NDX_EPIC_9_MODELS.md` for the dedicated delivered/security/evidence breakdown this pass produced; this section folds that into the main ledger for continuity with the rest of the epic history.

### What was built (cumulative)

- **`shared/contracts/model.ts`**: `ModelProvider` (`enabled` flag, never includes the API key — `hasApiKey: boolean` only), `ModelInfo`/`ConnectionTestResult`, `ModelCompletionRequest`/`ModelCompletionResult` (real chat messages, real token usage), `ModelRouteRequest`/`ModelRouteDecision` (profile id, measured inputs, human-readable reasons), `RoutingProfileId` (all eight: Balanced, Local First, Offline, Battery Saver, Maximum Quality, Fast Coding, Private Workspace, Low Cost), `LocalModelStatus`/`ModelBenchmarkResult` (Ollama runtime state).
- **`core/models/SecretCipher.ts`** / **`src/main/security/electronSecretCipher.ts`**: dependency-injected encryption (real `safeStorage` implementation) so `core/` stays plain Node and testable without Electron.
- **`core/models/ModelProviderStore.ts`**: real CRUD over providers (including `enabled`/disable state, persisted), API keys encrypted before they ever touch disk; refuses to store a key when the cipher is unavailable rather than falling back to plaintext.
- **`core/models/ModelProviderService.ts`**: real OpenAI-compatible HTTP client — `testConnection()` (real `/models` discovery, real timeout/error handling) and `complete()` (real `/chat/completions` invocation, returns the provider's real token usage when reported). Also exposes the Ollama-specific runtime endpoints (`/api/ps`, load, unload) used only for providers detected as Ollama — generic OpenAI-compatible endpoints never receive these calls, since they aren't part of that protocol.
- **`core/system/SystemMetricsService.ts`** (Epic 11 §27, consumed first by Epic 9): real, capability-detected host metrics — CPU usage (sampled, not estimated), memory, swap, storage, network interfaces, process list, and, on Linux, battery/thermal/fan/GPU sensors read from real `sysfs`/`procfs` paths. Every field is `{ available, value?, source, reason? }` — an unavailable sensor (e.g. no battery on a desktop, no Linux sysfs on another OS) is reported as explicitly unavailable, never fabricated or zero-filled.
- **`core/models/ModelRouter.ts`**: the real routing engine. `route()` reads a live `SystemMetricsService.collect()` snapshot, filters to `enabled` providers, enforces privacy/offline/local constraints per profile (Local First/Offline/Private Workspace/Low Cost reject cloud candidates outright), probes each permitted provider with a real connection test, scores candidates using the measured memory/thermal data (e.g. local candidates lose score under measured memory/thermal pressure; Battery Saver favors cloud when reachable), and returns a `ModelRouteDecision` with human-readable `reasons` and the real `measured` values that drove the decision — a genuinely auditable trail, not a black box. `complete()` routes, then invokes the selected provider for real and returns the response with timing.
- **IPC**: extended `registerModelHandlers.ts` with completion, routing, enable/disable, and the Ollama-only runtime endpoints (status/load/unload/benchmark), all Zod-validated; `NdxBridge.modelProviders` extended to match.
- **ND-035 Model Control Center**: real Add Provider form (with a real cloud-processing warning), real provider list with enable/disable/delete, real per-provider connection test, navigation to Routing Profiles.
- **ND-036 Model Detail**: real provider overview, real model/capability discovery, capability-detected Ollama running state with real load/unload/benchmark, real measured benchmark results (duration, tokens/sec when reported).
- **ND-037 Routing Profiles** (`features/models/RoutingProfiles.tsx`): all eight profiles in a controller-focusable list; selecting one previews a real `ModelRouter.route()` decision with the actual measured inputs and reasons behind it — not a static description of what the profile is supposed to do.

### Security boundaries

- Stored API keys use `safeStorage` and are decrypted only inside the main process, only for the duration of one outbound request.
- Private/Offline/Local First/Low Cost routing profiles cannot select a cloud provider — enforced in `ModelRouter.isPermitted()`, not just hidden in the UI.
- Disabled or unreachable providers are filtered out of routing before any request is attempted.
- No model daemon is installed, launched, or granted elevated privileges by NeuroDeck — Ollama (if used) must already be running; NeuroDeck only calls its already-exposed local HTTP API.
- Ollama-specific runtime calls (`/api/ps`, load, unload) are only ever sent to providers detected as Ollama — a generic OpenAI-compatible endpoint never receives them.

### Tests and evidence

Total: 312 tests passing across 66 files (cumulative, including the System Metrics and Agent Runtime additions below). Real loopback HTTP servers (not mocked `fetch`) verify discovery, privacy-constrained routing, measured-input routing, and completion invocation; `SystemMetricsService` tests use injected dependencies (fake `cpus()`/`readFile()`/etc.) to deterministically exercise both the "sensor present" and "sensor absent, explicitly reported as such" paths without depending on the actual host's hardware.

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 66 files, 312 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

### Deferred items with explicit reason

- **Non-OpenAI-compatible provider adapters** (vision, speech-to-text, text-to-speech, embeddings) — every provider this epic supports speaks the OpenAI-compatible chat/completions shape; a provider exposing a genuinely different protocol for these modalities would need its own adapter.
- **Usage/cost accounting** (ND-036 Usage tab, Low Cost profile's cost-limit routing factor) — needs a request/token cost-accounting system not yet designed; per-completion token usage is surfaced when a provider reports it, but nothing aggregates it yet.
- **ND-036 Logs tab** — needs durable per-provider request logging, not yet built.
- **Provider-reported capability/context-size/pricing metadata** — OpenAI-compatible discovery doesn't standardize these fields; NeuroDeck reports only what a provider's `/models` response actually contains and does not infer them from model names.

## Epic 10 - Browser System (real, scoped); SSH Remote Systems real; Learning Hub + Guided Lab real (scoped)

### Scope decision

Epic 10 is three real systems: Browser (§24), Remote Systems (§26), and Learning (no numbered spec section — wireframe-only ND-038/039). Remote Systems needs a genuine SSH client integration (host-identity verification, credential storage separate from the model-provider secret store, remote file/command execution) — a substantial new security surface on its own, comparable in scope to Epic 6's Git/Terminal integration. Browser builds entirely on Electron's own `WebContentsView` API and this codebase's already-established patterns. Learning needs real instructional content and progress tracking; this slice builds the infrastructure, persists progress, supports user-created curricula, and ships one small bundled example curriculum so the screens are genuinely populated without fabricating a full course library. The Guided Lab's "AI coach" boundary is now real through Epic 9's model router, gated on a configured provider.

### What was built

- **`shared/contracts/browser.ts`**: `BrowserTab` (id/workspaceId/url/title/loading/canGoBack/canGoForward/createdAt/updatedAt), request schemas for create/navigate/setBounds/remove, all Zod-validated.
- **`main/security/browserUrlPolicy.ts`**: a pure, Electron-free `isAllowedBrowserUrl()` predicate (mirrors `urlPolicy.ts`'s shape) allowing only `http`/`https` — the embedded browser's whole purpose is navigating to arbitrary web destinations, unlike the main shell's navigation policy (which allowlists only the app's own origin). Rejects `javascript:`, `file:`, `data:`, `chrome:`, `view-source:`, and anything malformed.
- **`core/browser/BrowserTabStore.ts`**: real, persisted tab metadata (`app.getPath('userData')/browser-tabs.json`), workspace-scoped, following the same `JsonStore`-backed pattern as every other store in this codebase. Fully unit-tested — it has no Electron dependency.
- **`main/browser/BrowserSessionService.ts`**: the real `WebContentsView` lifecycle. Only one tab's view is ever attached to the window's `contentView` at a time — switching tabs calls `webContents.close()` (the documented disposal API for a `WebContentsView` not owned by a `BrowserWindow`) on the previous tab and creates a fresh view on reactivation, rather than keeping every open tab's renderer process resident. Every view gets: a real per-workspace session partition (`persist:browser-${workspaceId}`), a real `will-navigate` guard enforcing `isAllowedBrowserUrl`, a real `setWindowOpenHandler` that routes window-open attempts to `shell.openExternal` (allowed URLs only) instead of opening an uncontrolled new window, and a `setPermissionRequestHandler` that was default-deny until the permission-prompt UI addendum below. Real navigation-state events (`did-navigate`, `page-title-updated`, `did-start-loading`/`did-stop-loading`) are forwarded via an injected callback.
- **`registerBrowserHandlers.ts`**: orchestrates `BrowserTabStore` (persistence) and `BrowserSessionService` (live view) the same way `registerFileHandlers.ts` orchestrates `FileService`/`RecoveryService` — e.g. `browserTab.create` persists the tab row, then opens the real view, rolling back the persisted row if opening fails. Live navigation-state events from the service are persisted back to the store and pushed to the renderer over `browserTab.update`.
- **ND-030 Browser Hub** (`features/browser/BrowserHub.tsx`): real workspace-scoped tab list, New Tab, Open, Close.
- **ND-031 Browser View** (`features/browser/BrowserView.tsx`): real address bar (navigate on Enter), Back/Forward/Reload (disabled state driven by the real `canGoBack`/`canGoForward` the service reports), a `ResizeObserver`-measured placeholder `<div>` whose real `getBoundingClientRect()` is continuously reported over IPC so the native view tracks it pixel-for-pixel, and a real "Open externally" action. Unmounting collapses the view to zero bounds (hides it) rather than destroying it, since reactivating any tab already recreates its view from scratch per the one-resident-tab model above.

### A real architectural constraint, not a bug

`BrowserSessionService` requires a live `app.whenReady()` `BrowserWindow` to do anything — `WebContentsView` has no meaningful existence outside a running Electron app. This makes it the first `core`-adjacent service in this codebase that cannot be unit-tested in Vitest's plain-Node/jsdom environment, unlike `TerminalService` (wraps `node-pty`, which runs standalone) or every persisted store (plain `JsonStore` reads/writes). The pure logic it depends on — `browserUrlPolicy.ts` and `BrowserTabStore.ts` — is fully unit-tested; the service itself is covered by the Playwright e2e suite's route-navigation check and by manual verification. This is now documented precedent for any future Electron-native-view integration (e.g. if Remote Systems ever needs a similar native surface).

### Tests and evidence

| Suite                                                                                                                                     | Location                                           | Count |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----- |
| `isAllowedBrowserUrl` (allows http/https, rejects javascript/file/data/chrome/view-source/malformed)                                      | `main/security/__tests__/browserUrlPolicy.test.ts` | 7     |
| `BrowserTabStore` (empty, real workspace-scoped create, real metadata update, missing-tab update, real remove)                            | `core/browser/__tests__/BrowserTabStore.test.ts`   | 5     |
| `BrowserHub` (active-workspace gate, real empty state, real tab list, real remove round trip)                                             | `features/browser/__tests__/BrowserHub.test.tsx`   | 4     |
| `BrowserView` (real activate + address/back-forward state, real error state, real navigate-on-Enter, real back/forward/reload round trip) | `features/browser/__tests__/BrowserView.test.tsx`  | 4     |

Total: 373 tests passing (up from 365). The e2e suite (`e2e/app.spec.ts`) was extended with a real route-navigation check to `/browser`, confirming the real route renders its real active-workspace gate in the packaged app — the deepest verification available for `BrowserSessionService` without a real network call inside CI.

```text
npm run typecheck    → 0 errors
npm run lint          → 0 errors, 0 warnings
npm run test          → 81 files, 373 tests passed
npm run build         → succeeded
npm run test:e2e      → 1 passed
npm audit --production → 0 vulnerabilities
```

No new runtime dependencies were added — `WebContentsView`/`shell.openExternal` are already part of Electron.

### Deferred items with explicit reason

- **Reader mode, downloads, site profiles, history, "add page to workspace context," AI summarization** — each needs real infrastructure this slice doesn't build (a readability extraction step, a downloads manager and its UI, a profile-switching concept, a history index, a workspace-context attachment model, and a real model-router call with the "privacy confirmation" the spec explicitly requires for summarization).
- **Reader mode, downloads, site profiles, history, "add page to workspace context," AI summarization** — each needs real infrastructure this slice doesn't build.
- **Per-site granular browser settings** — the permission prompt stores a single grant/deny per origin+permission; richer per-site profiles (zoom, user-agent, per-permission exceptions) are not implemented.
- **Broader Remote Systems scope** - SSH host management and SSH terminal sessions are real; remote file browsing, remote command builder, non-SSH target types, Windows remote tooling, containers, network shares, metrics, logs, tunnels, and remote desktop remain deferred.
- **Full bundled course library** — only one example curriculum (`resources/curricula/quick-start.json`) ships with the app; additional courses need real content, not invented lessons.
- **Automated lab validation** — the validation panel honestly states that automated pass/fail checking is not implemented; learners mark lessons complete manually.
- **Time-spent tracking** — estimated session length is metadata; actual elapsed time per lesson is not recorded in this slice.

## Epic 10 addendum - SSH Remote Systems backend, typed IPC, and scoped UI

This slice builds the first real SSH-scoped Remote Systems path: backend, typed IPC, and the ND-040/ND-041 host/session screens. `RemoteHostStore` persists SSH host records in `remote-hosts.json`; password/passphrase values are encrypted through the same injected `SecretCipher` pattern used by model provider API keys, so secrets never cross back to the renderer. Public host records expose only `hasSecret`, never the secret itself.

`RemoteConnectionService` uses the real `ssh2` client behind an injected factory. Host identity is trust-on-first-use: the first successful SSH connection records the SHA256 host-key fingerprint, and later connections must present the same fingerprint or fail closed as a host-key mismatch. Sessions expose bounded output snapshots plus write/resize/terminate and data/exit events.

The backend is reachable through typed IPC and the narrow preload bridge: `window.ndx.remoteHosts.*` and `window.ndx.remoteSessions.*`. The renderer now wires `/remote` (ND-040) to real SSH host management and `/remote/:hostId` (ND-041) to a real xterm-backed SSH session. Remote file browsing, remote command builder, non-SSH target types, Windows remote tooling, containers, network shares, metrics, logs, tunnels, and remote desktop remain deferred.

| Evidence                                          | File                                                                                   | Status      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| Encrypted host storage, public metadata only      | `core/remote/__tests__/RemoteHostStore.test.ts`                                        | Passing     |
| TOFU host-key recording/rejection and session I/O | `core/remote/__tests__/RemoteConnectionService.test.ts`                                | Passing     |
| Typed IPC/preload bridge                          | `main/ipc/registerRemoteHandlers.ts`, `preload/index.ts`, `shared/contracts/bridge.ts` | Typechecked |

### A real, production-relevant bug found and fixed (preload bridge silently failed everywhere)

Launching the packaged app for manual verification surfaced a real bug undetected by the existing e2e test, lint, typecheck, or unit suite: **`window.ndx` never existed in any build** — the entire typed IPC bridge silently failed to initialize, on every screen, since long before this epic. The shell still rendered (every screen already has a real "bridge unavailable" fallback — `bridgeUnavailableError()` — by design), so the app looked superficially fine; every IPC-backed feature, however, was permanently stuck on its empty/error state.

**Root cause**: `electron-vite` externalizes npm dependencies from the main/preload build by default (`build.externalizeDeps` defaults to `true`), which is correct for the unsandboxed main process (real Node `require()` resolution) but wrong for this app's preload script, which runs **sandboxed** (`sandbox: true`, required by the hardening baseline in `windowSecurity.ts`). A sandboxed preload's `require()` is Electron's own polyfilled loader exposing only a small allowlist of Node built-ins — it cannot resolve arbitrary npm packages from `node_modules` at all. The bundled preload shipped a bare `const zod = require("zod")` (from `shared/contracts`'s Zod schemas), which threw `Error: module not found: zod` the instant the preload script ran, aborting it before `contextBridge.exposeInMainWorld('ndx', ndx)` ever executed.

**Why nothing caught it sooner**: the existing e2e test only asserted on visible shell chrome (`getByRole('banner')`, nav links, "No active workspace" empty states) — all of which render identically whether or not the bridge exists, because every screen's empty/error states are real, intentional fallbacks for "no workspace"/"bridge unavailable," not just for this bug. Unit tests stub `window.ndx` directly and never exercise the real preload bundle. Nothing in the existing suite ever launched the real packaged preload and checked that `window.ndx` actually came into existence.

**Fix**: `electron.vite.config.ts`'s `preload` build now sets `build.externalizeDeps.exclude: ['zod']`, forcing Vite to bundle `zod` into the preload output instead of leaving it as an unresolvable `require()`. **Diagnosis method**: launched the real packaged app via Playwright's `_electron` launcher (the same API the e2e suite already uses) with a `console`/`pageerror` listener attached to the renderer — the preload's load failure logs directly to the renderer's console, which is otherwise invisible from outside the running window.

**Regression test added**: `e2e/app.spec.ts` now asserts `typeof window.ndx === 'object'` as its first check, before any UI assertions. Verified this test actually catches the regression by reverting the config change and re-running it — it failed with `Expected: "object", Received: "undefined"` as expected, then passed again once the fix was restored.

**Lesson for future preload changes**: any new dependency imported into `src/preload/index.ts` or anything it transitively imports (including all of `shared/contracts/`) must be either dependency-free of npm packages, or explicitly excluded from `externalizeDeps` in `electron.vite.config.ts`'s `preload` block — a sandboxed preload can never `require()` an npm package at runtime, regardless of whether `node_modules` is present on disk.

### A second real bug found and fixed (renderer crashed in dev mode only: `import { lazy, Suspense } from 'react'` placed after use)

After fixing the preload bridge, the user reported the UI still wasn't loading. Re-diagnosing with the same Playwright `_electron` + console/`pageerror`-listener technique — this time pointed at the live Vite dev server (`http://localhost:5173`) the way `npm run dev` actually runs the app, not just the packaged production build — surfaced a second, unrelated real bug: a renderer `pageerror`, `Cannot access 'lazy' before initialization`, that crashed React before it ever rendered.

**Root cause**: `src/renderer/src/app/routing/routes.tsx`'s `import { lazy, Suspense } from 'react'` statement had ended up as the very last line of the file — after every route definition that calls `lazy(...)`, rather than at the top with the rest of the file's imports. ES module `import` bindings are hoisted regardless of source position, so this is not _inherently_ invalid JavaScript, but Vite's dev-mode per-module transform (React Fast Refresh wraps each module separately, unlike Rollup's production bundle which reorders/hoists differently) exposed the temporal-dead-zone window during module evaluation, while the production Rollup build happened to mask it. This is why the bug was dev-mode-only — the earlier preload fix was verified against the packaged production build (`out/main/index.js` + `out/renderer/index.html`), which never hit this path, while the user was running `npm run dev`.

**Fix**: moved `import { lazy, Suspense } from 'react'` back to the top of `routes.tsx` with the rest of the file's imports, and deleted the duplicate/misplaced copy.

**Diagnosis method**: since `npm run dev` spawns its own managed Electron process that can't be directly attached to from outside, the dev server was left running standalone (`electron-vite dev`'s Vite server keeps running independently of which Electron window talks to it), then a _second_ Electron instance was launched via Playwright's `_electron.launch()` with `ELECTRON_RENDERER_URL` pointed at that same running dev server and a `pageerror` listener attached — this is the only way to see a renderer crash that occurs before any UI paints, since there is nothing in the DOM yet for `window.evaluate()` or `getByRole()` assertions to find.

**Lesson**: a production build and a dev-mode run can genuinely diverge in correctness due to bundler-level reordering/hoisting differences (Rollup vs. Vite's per-module dev transform) — verifying a fix only against `npm run build`'s output is not sufficient when the regression is import-order-sensitive. When something only reproduces in one mode, reproduce and verify the fix in _that_ mode specifically, not just whichever is more convenient to launch.

### A third real gap found and fixed (not a crash this time — real UI/UX wiring gaps: missing icons and unreachable screens)

After both runtime crashes were fixed, the user reported "icons are missing and some screens also" — a real, valid report, not a crash. Two separate, genuine gaps:

**Gap 1 — Primary Navigation Rail had no real icons.** `NavigationRailItem.tsx` rendered the exact same `<span className="size-2 rounded-full bg-current opacity-60" />` (a generic gray dot) for every one of the 11 destinations — there was never a real per-destination icon, just a placeholder that was never replaced. In the rail's collapsed state (88px, icon-only — the default given Steam Deck's screen real estate), this made every destination visually identical; the text labels are `sr-only` when collapsed, so there was nothing to distinguish Home from Build from Terminal from System. **Fixed** by adding `src/renderer/src/components/navigation/navigationIcons.tsx` — a real, hand-authored inline-SVG icon set (one distinct icon per destination id, `stroke="currentColor"`, no new npm dependency per this project's zero-bloat stance) and wiring it into `NavigationRailItem.tsx` via a proper `NavigationIcon` component (capitalized so `react-refresh/only-export-components` recognizes it correctly).

**Gap 2 — several real, working screens had no navigation path to them at all.** The wireframe spec (§6.2) defines exactly 11 Primary Navigation Rail destinations, and "System" is the sole entry point into that whole area — but `SystemDashboard.tsx` (the `/system` screen) never linked to any of its real sibling screens. Controller Settings (`/settings/controller`), Display and Theme Settings (`/settings/display`), Privacy and Permissions (`/settings/privacy`), Power Menu (`/power`), About and Diagnostics (`/about`), Recovery Timeline (`/recovery`), and Storage and Recovery (`/storage`) all exist, are real, and pass their own tests — but were only reachable by manually typing a route, never through the UI. Agent Operations Center (`/agents`, ND-016) has no Primary Navigation Rail destination of its own at all (the spec's 11-item list predates it being built), and had no UI entry point anywhere. **Fixed**: `SystemDashboard.tsx` now renders a real "Settings and tools" section linking to all eight of the above; `WorkflowLibrary.tsx` (the `/automations` screen) now also links to Agent Operations Center, since the wireframe's own implementation-staging plan groups "Workflows and Agents" together (Stage 5) and Automations is the closer thematic fit.

**Why this wasn't caught by typecheck/lint/existing tests/the previous two crash-focused debugging passes**: none of this is a crash or a type error — every screen still rendered correctly and every existing assertion (shell chrome, route navigation, IPC bridge presence) still passed. This is a real UX/discoverability defect class that only shows up by actually using the app and asking "can I get there from here," which is exactly what the user did. The previous two bugs were found via automated console/pageerror inspection; this one required actually navigating the rendered UI.

**Regression test added**: `App.test.tsx` now asserts the nav rail renders exactly as many real `<svg>` icons as it has links, and that each icon has a distinct SVG shape. Verified live against the running dev server (Playwright `_electron`, no crashes) that all 11 destinations render a distinct `<svg>` with real path/circle/rect content, and that `/system` now renders real working buttons to all eight previously-unreachable screens.

**Lesson**: "the screen exists, is real, and passes its own tests" is not the same as "a user can reach it." Every new real screen needs an explicit, deliberate check for _how a controller-only user actually arrives there_ — don't rely on the existence of a route to imply the existence of a path to that route in the rendered nav.

## Epic 10 addendum — Learning Hub (ND-038) and Guided Lab (ND-039)

This slice builds the real learning-content infrastructure and both ND-038/039 screens. The design avoids inventing lesson content: a single bundled example curriculum (`resources/curricula/quick-start.json`) ships with the app, and user-created curricula are the real extension point.

`LearningService` (`core/learning/LearningService.ts`) persists user-created curricula and per-lesson progress under `app.getPath('userData')/learning/`, using the same `JsonStore` pattern as the rest of the app. Bundled curricula are imported as a static catalog (`shared/curricula/bundledCatalog.ts`) so they are always offline and do not require runtime file-path gymnastics. User curricula override bundled IDs on collision, and bundled curricula are protected from edit/delete.

Typed IPC channels (`learning.*`) are added to `shared/contracts/ipcChannels.ts`, exposed through the preload bridge, and handled by `main/ipc/registerLearningHandlers.ts`. The renderer client is `services/ipc/learningClient.ts`.

`LearningHub.tsx` renders area-filter chips, curriculum cards with real progress bars, session length, lab count, required tools, and an offline badge. A simple "Create curriculum" dialog adds a real user-created curriculum with a title, area, and description.

`GuidedLab.tsx` is route-driven at `/learn/lab/:curriculumId/:moduleId/:lessonId`. It shows the lesson instructions, hints, objectives checklist, and a live terminal pane via `LabTerminal.tsx` (which creates a real `TerminalSession` in the active workspace and writes an optional `setupCommand`). The AI coach panel calls the real `completeModel` IPC when a provider is enabled, with a system prompt that includes the lesson instructions, objectives, and recent terminal commands; when no provider is enabled, it shows an honest disabled reason. The validation panel explicitly states that automated lab validation is not implemented yet and does not fake pass/fail results.

| Evidence                                                                    | File                                               | Status  |
| --------------------------------------------------------------------------- | -------------------------------------------------- | ------- |
| LearningService CRUD, progress, bundled/user merge, bundled protection      | `core/learning/__tests__/LearningService.test.ts`  | Passing |
| LearningHub area filter, card rendering, create curriculum                  | `features/learning/__tests__/LearningHub.test.tsx` | Passing |
| GuidedLab instructions, objectives, manual completion, coach disabled state | `features/learning/__tests__/GuidedLab.test.tsx`   | Passing |

Validation after this addendum: typecheck/lint/build/e2e green; 521 tests passing across 107 files.

## Epic 10 addendum — Browser permission-prompt UI

This slice replaces the embedded browser's hard-coded default-deny permission handler with a real, user-facing prompt and persistent per-origin decisions.

`BrowserPermissionStore` (`core/browser/BrowserPermissionStore.ts`) persists decisions in `app.getPath('userData')/browser-permissions.json` using the same `JsonStore` pattern as `BrowserTabStore`. Each decision is keyed by origin and permission string and records whether it was granted, plus creation/update timestamps.

`BrowserSessionService` now accepts an injected `requestPermission` callback. When Electron's `setPermissionRequestHandler` fires, the service extracts the current origin and calls the callback. If a stored decision exists, it is returned immediately; otherwise the main process sends a `browserPermissionRequest` event to the renderer and waits (with a 30-second timeout) for a `browserPermissionResponse`. The user's choice is persisted, and the stored decision is reused for future requests from the same origin+permission.

The renderer side adds `browserTabs.onPermissionRequest` and `browserTabs.respondToPermissionRequest` to the preload bridge, plus matching client methods in `services/ipc/browserClient.ts`. `BrowserPermissionDialog` renders a `ConfirmationDialog` with the origin, a human-readable permission label, and a consequence note. It is wired into `BrowserView`, so prompts appear only while the browser route is active.

`PrivacyPermissions` now includes a "Browser permissions" section that lists stored decisions via `browserTabs.listPermissions` and allows revocation via `browserTabs.revokePermission`, using the same Revoke flow as tool capabilities.

| Evidence                                             | File                                                          | Status  |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------- |
| BrowserPermissionStore CRUD and persistence          | `core/browser/__tests__/BrowserPermissionStore.test.ts`       | Passing |
| BrowserPermissionDialog allow/deny rendering         | `features/browser/__tests__/BrowserPermissionDialog.test.tsx` | Passing |
| PrivacyPermissions lists/revokes browser permissions | `features/system/__tests__/PrivacyPermissions.test.tsx`       | Passing |

Validation after this addendum: typecheck/lint/build/e2e green; 532 tests passing across 109 files.

## Epic 8 addendum — Agent Runtime ActionQueue tool submission bridge

Agent Runtime no longer stops at text-only planning when the model emits a strict tool-call plan. The runtime now accepts one narrow, reviewable tool-call format: a fenced JSON object with `{"toolCalls":[{"toolId":"...","arguments":{}}]}`. Anything outside that shape is treated as normal text output; malformed tool-call JSON fails the run rather than guessing.

The security boundary is deliberately split:

- `AgentRuntime` (`core/agents/AgentRuntime.ts`) validates the model-proposed `toolId` against the agent's persisted `toolAllowlist`, enforces `resourceLimits.maxToolCalls`, persists every state transition, and emits a typed `agentTool.request`.
- `AgentToolExecutionBridge` (`features/agents/AgentToolExecutionBridge.tsx`) runs in the renderer, where the real `ActionQueue` already lives. It verifies that the tool is registered, checks the tool's `requiredCapability` against the agent's `permissionCeiling`, then calls `queue.submit()` so the request goes through the same `ToolRegistry` → `PermissionBroker` → Approval Queue → AuditLog path as Command Palette and Workflow Engine tool actions.
- `registerAgentHandlers.ts` receives the typed `agentTool.result` acknowledgment and resolves the waiting persisted run. Pending approvals remain pending in the existing Approval Queue; the agent run stays in `waiting-for-approval` until the user approves, denies, cancels, or the tool completes.

This is real ActionQueue-backed submission, not a separate agent-only executor. Follow-up slices add real run pause/resume and child-agent policy bounds; this bridge slice intentionally does not yet build the full ND-017 Files/Tools/Permissions/Logs tab model or full e2e UI coverage for a live approval flow.

## Epic 8 addendum — Agent Runtime pause/resume controls

Agent Runtime now exposes real `pause()` and `resume()` controls through typed `agentRun.pause`/`agentRun.resume` IPC and Agent Detail buttons. The behavior is intentionally precise: pause prevents the runtime from submitting the next tool call, but it does not pretend to kill or suspend a tool already running inside ActionQueue. Cancellation remains the explicit stop path.

The runtime persists `paused` timeline events, wakes paused runs through an internal waiter set, and resumes queued work deterministically. A real race was found and fixed during implementation: `resume()` originally woke the runtime before saving the resumed state, which allowed the resume write to overwrite a near-simultaneous terminal `completed` state. The fix persists the resume transition before releasing waiters.

### Tests and evidence

| Suite                                                                                                                                                     | Location                                         | Count |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----- |
| `AgentRuntime` lifecycle, cancellation, strict tool-call bridge submission, non-allowlisted tool rejection, pause-before-next-tool/resume race regression | `core/agents/__tests__/AgentRuntime.test.ts`     | 5     |
| `AgentDetail` overview/runs, start, cancel, pause, resume IPC wiring                                                                                      | `features/agents/__tests__/AgentDetail.test.tsx` | 5     |

## Epic 8 addendum — Agent Runtime child-agent policy bounds

Agent definitions now persist a real `childAgentPolicy` with `{ allowChildAgents, maxChildrenPerRun, maxDepth }`. The default is deliberately closed: no child agents, zero per run, zero depth. `AgentStore` normalizes older persisted records on read so existing user data does not crash when this field is absent.

The model prompt includes the child-agent policy. If a model emits strict JSON with `childAgents`, `AgentRuntime` validates it before any tool submission. With the default policy, child-agent proposals fail closed with a persisted run error; they are never ignored silently and no fake child-agent execution is created.

### Tests and evidence

| Suite                                                                                                        | Location                                     | Count   |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------- |
| `AgentRuntime` child-agent proposal rejected before tool request                                             | `core/agents/__tests__/AgentRuntime.test.ts` | +1      |
| `AgentOperationsCenter` and `AgentDetail` render disabled child policy and create agents with default policy | `features/agents/__tests__`                  | covered |

## Epic 6 addendum — Git restore/discard, branch create/delete, and force push

`GitService`'s class comment previously stated these were "intentionally not implemented yet" pending Recovery Service (Epic 11) and a real irreversibility-warning UI — both now exist, so this slice implements the three operations the spec (§22) explicitly named as blocked.

**`restore()`** discards real uncommitted changes to tracked files via `git restore -- <paths>`. It deliberately does not call `RecoveryService` itself — `registerGitHandlers.ts`'s `gitRestore` handler orchestrates `FileService.readIfExists()` + `RecoveryService.recordCheckpoint()` (kind: `git-restore`) before calling `GitService.restore()`, the exact same orchestration pattern `registerFileHandlers.ts`'s `fileWrite` already uses for `FileService.write()`. There is no code path to the discard that skips the checkpoint. Untracked (`??`) files are correctly rejected by `git restore` itself (there is no committed content to restore to) — the UI hides the Discard control for them rather than attempting a different, undesigned "delete untracked file" operation. `recoveryCheckpointKindSchema` gained a `'git-restore'` value alongside `'file-write'`; `RecoveryTimeline` (ND-052) now covers both kinds in its real checkpoint list/diff.

**`createBranch()`/`deleteBranch()`** are plain `git branch`/`git branch -d|-D`. Delete defaults to the safe form (`-d`, which `git` itself refuses if the branch has unmerged commits); the UI surfaces that rejection as a re-prompt offering force delete (`-D`) with copy that names the real consequence (losing commits that exist only on that branch), rather than silently escalating to force on the first click.

**`forcePush()`** uses `--force-with-lease`, never raw `--force` — verified with a real test: two clones push to the same bare remote, the second clone's stale view force-pushes and is rejected because the remote ref moved since its last fetch, exactly the scenario `--force-with-lease` exists to prevent. The UI gates it behind its own `ConfirmationDialog`, separate from the regular push dialog, with consequence copy that states the real protection it gets (and what it doesn't guarantee).

### Tests and evidence

| Suite                                                                                           | Location                                                 | Count |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----- |
| Real tracked-file restore, untracked-file rejection, branch create, safe/force branch delete    | `core/git/__tests__/GitService.test.ts`                  | +6    |
| Real force-push success, real force-with-lease rejection on a stale view, unknown-remote reject | `core/git/__tests__/GitServiceRemote.test.ts`            | +3    |
| Discard/branch-create/branch-delete/force-push UI wiring through the typed bridge               | `features/workspaces/__tests__/WorkspaceGitTab.test.tsx` | +5    |

## Epic 5 addendum — File Service real delete

`FileService`'s class comment previously deferred `delete()` alongside copy/move/rename/compress/extract, all grouped under "needs its own recovery-checkpoint shape that hasn't been designed yet." On inspection, `delete()` actually fits the _existing_ checkpoint shape exactly — a checkpoint is already just `{relativePath, previousContent}`, and "undo a delete" is just "rewrite that path's previous content," identical to undoing a `write()`. Only move/rename/copy/compress/extract genuinely need a new multi-path shape (a source and a destination), so this slice narrows the deferred scope to just those.

`FileService.delete()` only deletes a single file, never a directory — it reuses `read()`'s existing directory check (`info.isDirectory()`) by resolving the path the same way, so a directory delete attempt fails before any checkpoint is recorded or any `rm` call happens. `registerFileHandlers.ts`'s new `fileDelete` channel orchestrates the checkpoint exactly like `fileWrite` does: read the file's current content via `readIfExists`, record a checkpoint (new `file-delete` kind), then delete. `FileManager.tsx` (ND-026) gained a real per-file Delete button (hidden for directories) behind a `ConfirmationDialog` that states the real recovery guarantee.

### Tests and evidence

| Suite                                                                                       | Location                                             | Count |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| Real file delete, directory-delete rejection, path-escape rejection, missing-file rejection | `core/files/__tests__/FileService.test.ts`           | +4    |
| Delete button wiring, confirmation flow, hidden for directories                             | `features/workspaces/__tests__/FileManager.test.tsx` | +2    |

## Epic 6 addendum — Git recovery branches

ND-025's wireframe lists "Recovery branches" as its own section, alongside Branches/Commits/Remotes/Pull requests — distinct from Recovery Timeline's per-file content checkpoints (Epic 11), which this slice had previously been the only "recovery" mechanism Git work referenced. On inspection this needed no new backend surface at all: a recovery branch is just a real Git branch at the current commit, created through the exact same `createGitBranch` IPC every other branch already goes through. The only new piece is a `recovery/<timestamp>` naming convention (`recoveryBranchName()` in `WorkspaceGitTab.tsx`) the UI filters branches on to render them in their own "Recovery branches" section, with their own Checkout/Delete controls, separate from the regular Branches list.

A "Create recovery point" button creates one at the current `HEAD` without switching to it — a real, inspectable safety net the user can return to before a risky operation, independent of whether `RecoveryService` has any checkpoints for the files involved.

### Tests and evidence

| Suite                                                                                                                                                        | Location                                                 | Count |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----- |
| Recovery point creation calls createGitBranch with a `recovery/`-prefixed name, recovery branches render in their own section separate from regular Branches | `features/workspaces/__tests__/WorkspaceGitTab.test.tsx` | +2    |

## Epic 8 addendum — Agent Runtime dry-run support

Previously deferred with the one-line note "needs a simulate-without-executing-tool-actions mode this slice doesn't build" — on inspection the real `AgentRuntime`/`ActionQueue` pipeline already had exactly the right seam for this: `executeToolCalls()` already loops over each model-proposed tool call individually before submitting it. Dry-run just short-circuits that one submission step.

`startAgentRunRequestSchema` and `AgentRun` both gained a real, persisted `dryRun: boolean` field. When true, `AgentRuntime.start()` still performs a real model completion (the agent genuinely plans against the configured provider) — the only thing that changes is `executeToolCalls()`: instead of submitting each call through `submitToolCall()`/`AgentToolExecutionBridge`/`ActionQueue`, it records a real timeline event naming the exact tool ID and arguments that would have been submitted, then moves on. `this.onToolRequest` (the renderer-owned ActionQueue bridge) is never invoked at all during a dry run — verified with a real test asserting zero tool requests were emitted despite the model proposing one.

`AgentDetail.tsx` (ND-017) gained a real "Dry run" checkbox next to objective entry, a "Start dry run" button label when checked, and a `[Dry run]` badge on any past run that was one — so dry-run status is visible both before starting and when reviewing run history, not just inferred from the absence of tool-execution timeline events.

### Tests and evidence

| Suite                                                                                                                                        | Location                                         | Count |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----- |
| Dry run plans with a real model completion but emits zero tool requests; timeline records the would-be call and a dry-run completion message | `core/agents/__tests__/AgentRuntime.test.ts`     | +1    |
| Dry run checkbox wiring: starts with `dryRun: true`, shows `[Dry run]` badge on the resulting run                                            | `features/agents/__tests__/AgentDetail.test.tsx` | +1    |

## Epic 6 addendum — Terminal search and copy selection

Previously deferred together as "history/search/copy selection" — on inspection, history was already real (the shell's own command history plus xterm's 5000-line scrollback buffer), leaving search and copy as the two genuine gaps. Both are now real, using `@xterm/addon-search` (already in the same `@xterm` family as the `addon-fit` this codebase already depends on, so no new ecosystem) rather than hand-rolling scrollback search.

`TerminalViewport.tsx` and `RemoteSessionViewport.tsx` (the SSH equivalent — both got the identical treatment, since they already mirror each other's xterm wiring exactly) were converted from plain function components to `forwardRef` components exposing a small imperative handle (`findNext`/`findPrevious`/`clearSearchHighlight`/`copySelection`) — the parent (`UniversalTerminal.tsx`/`RemoteSession.tsx`) owns the search query input and a toggleable search bar, and drives the xterm instance through the ref rather than duplicating xterm state in the parent. `copySelection()` reads the real `terminal.getSelection()` and writes it to the real OS clipboard via `navigator.clipboard.writeText()` — no fake "copied" toast without a real clipboard write behind it.

### Tests and evidence

| Suite                                                                                                                             | Location                                                 | Count |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----- |
| Imperative handle's findNext/findPrevious/copySelection call through to the real SearchAddon/Terminal APIs and the real clipboard | `features/terminal/__tests__/TerminalViewport.test.tsx`  | +1    |
| Find bar toggles open/closed over the active session                                                                              | `features/terminal/__tests__/UniversalTerminal.test.tsx` | +1    |

## Epic 8 addendum — real `files-write`/`files-delete` tools (Workflow Checkpoints unblocked)

Workflow Forge's own scope comment named the exact gap: "no tool-action this slice can register writes a file directly." The checklist's "Checkpoints — deferred from the workflow-step level" item was blocked on the same thing. Both are now real with one addition: `ai-safety/tools/fileTools.ts` registers `files-write` and `files-delete`, calling the exact same `writeFile`/`deleteFile` IPC client functions `FileManager.tsx`'s own Delete button and Build Studio's Save action use. `registerFileHandlers.ts` already records a `RecoveryService` checkpoint before either runs, unconditionally — there was never a separate "tool path" to design a new checkpoint shape for; registering the tool was the only missing piece.

**Trust model, explicitly considered and matched to existing precedent**: `workspaceId`/`relativePath` come from whoever submits the tool call — for a Workflow Forge step, that's the human author who typed the JSON arguments at design time (Workflow Forge has no model in the loop, by its own scope note); for an Agent Runtime tool call, that's strict model-emitted JSON, but only reachable if a human first granted that capability into the agent's `toolAllowlist`/`permissionCeiling` — the same already-accepted boundary `terminalCommandTools.ts` uses (an agent with `terminal.execute` can already run arbitrary shell commands in any session it's told about; a scoped file write within `FileService`'s existing path-traversal protection is not a new category of risk this introduces). `PermissionBroker.evaluate()` needed no changes — `files.write`/`files.delete` default to `requires-approval` automatically, the same as every other capability with no standing grant.

A real file-write tool was deliberately _not_ added without this analysis — an earlier pass in this same work session considered and explicitly declined a less-careful version of this same idea before reaching this scoped, precedent-matched design.

### Tests and evidence

| Suite                                                                                                                           | Location                                | Count |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----- |
| Real capability/risk registration, argument validation, real IPC call-through for both write and delete, real failure surfacing | `ai-safety/__tests__/fileTools.test.ts` | +4    |

## A real, production-relevant bug found and fixed — boot permanently blocked by a non-fatal workspace read failure

**Reported by the user**: "currently unable to load UI due to workspace not loading at startup."

**Root cause**: `BootSessionStart.tsx`'s `runBoot()` treated _any_ `listWorkspaces()` failure as fatal — `if (!workspaceResult.ok) { finishBoot('failed', ...); return }` — even though a failed or empty workspace read is not actually a fatal condition: a brand-new user with zero workspaces hits the exact same code path (`workspaces.length === 0`) as a user whose workspace file failed to read, and that case is handled as the normal, expected first-run state everywhere else in the app. Worse, the boot screen's only recovery action is "Retry" (`window.location.reload()`), which re-reads the exact same on-disk state and fails identically — there was no path back into the app at all once this triggered, only Diagnostics (which itself needs the shell to be reachable) or Exit.

A second, compounding root cause sits one layer down: `JsonStore.read()` (the shared persistence primitive behind `WorkspaceStore` and nine other stores — agents, browser tabs, controller/display settings, model providers, recovery, remote hosts, both workflow stores) re-threw on a `JSON.parse` failure rather than treating a corrupted file as recoverable the way a _missing_ file already was (`isNotFound` returns the default value). Any real-world corruption of `workspaces.json` (a crash mid-write predating the existing atomic-rename protection, manual editing, a bad sync/restore) would permanently brick boot with no self-healing path, since every retry hits the same unreadable bytes.

**Fix, two layers**:

1. `JsonStore.read()` now catches `SyntaxError` specifically (a genuinely corrupted file, distinct from `isNotFound`'s missing-file case) and quarantines the bad file by renaming it aside to `<path>.corrupted-<timestamp>` — preserved for forensics, never silently deleted — then returns the default value instead of throwing. This self-heals _every_ `JsonStore` consumer, not just workspaces.
2. `BootSessionStart.tsx` now treats a workspace-load failure exactly like the already-optional model and controller checks: record the real failure for the Details panel, but continue into the shell with an empty workspace list rather than hard-failing. "Core services loaded" is now satisfied by the IPC bridge itself answering, not by any one store's data coming back clean — the actually-fatal case (bridge truly unreachable) still surfaces identically through the model/controller checks failing too, so nothing is hidden, but a single non-fatal store read can never again wall a user out of their own app.

### Tests and evidence

| Suite                                                                                                                                                     | Location                                                  | Count     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------- |
| Self-heals from a corrupted file (quarantines it, returns default) and writes normally again afterward                                                    | `core/persistence/__tests__/JsonStore.test.ts`            | +2        |
| Boot degrades into the shell (not a "Boot failed" screen) when workspace loading fails — replaces a prior test that asserted the buggy hard-fail behavior | `features/onboarding/__tests__/BootSessionStart.test.tsx` | rewritten |

### Follow-up — the user reported the same symptom persisting after the fix above, because of a third, deeper layer

The first fix only covered a _resolved_ `{ ok: false }` failure result. It missed a different failure shape entirely: a **rejected** promise. `runStep()` in `BootSessionStart.tsx` had no `try`/`catch` around `await promise` — if the underlying IPC call rejected (a dropped `ipcRenderer.invoke`, no handler registered, a main-process crash, a non-cloneable payload) rather than resolving to a structured result, the exception propagated straight out of `runBoot()`'s unguarded async body. `void runBoot()` discarded that rejection silently, so the rest of the function — every later step, the `navigate()` call — simply never ran. The "Restoring workspace" step stayed stuck on its `running` spinner indefinitely, with nothing left to advance it except the unrelated 15-second global timeout, which then showed a generic "Boot is taking longer than expected" — not even the specific workspace error. This matches "restoring workspace still not loading during boot" exactly: not an error message, just a stall.

The exact same gap existed one feature over, in production code that runs on every screen, not just boot: `WorkspaceProvider.tsx`'s mount effect called `listWorkspaces().then(...)` with no `.catch()`, and its `refresh()` function `await`ed the same call with no `try`/`catch`. A rejection there left `loading` stuck at `true` forever, with no error and no way to recover short of a full app restart — so even after boot itself stopped blocking, the workspace-scoped UI underneath it (Workspace Hub, the active-workspace badge, anything gated on `loading`) could still spin indefinitely if the same rejection happened post-boot.

**Fix**: `runStep()` now wraps `await promise` in `try`/`catch`, converting a rejection into the same `'failed'` step state and `BootStepFailure` return a resolved `{ ok: false }` already produces — `collectSystemMetrics()`'s direct call got the same treatment for the same reason. `WorkspaceProvider.tsx`'s mount effect gained a `.catch()`/`.finally()` continuation, and `refresh()` gained a `try`/`catch`/`finally`, both setting a real error and clearing `loading` instead of leaving the promise chain to die silently. This is deliberately scoped to the workspace feature actually reported broken, not a sweep of all 19 IPC client modules — every other client function has the identical "trust the bridge call never rejects" shape and would benefit from the same hardening if and when something else surfaces the same failure mode there.

**A real test-authoring lesson surfaced fixing this**: the first attempt at a regression test used `vi.fn().mockRejectedValue(...)`, which pre-creates the rejected `Promise` at mock-setup time rather than at call time — Vitest's unhandled-rejection detector flagged it before the test's own `await` ever ran. The fix is `vi.fn(() => Promise.reject(...))`, a factory that defers creation to the actual call, matching how a real rejected IPC call behaves.

### Tests and evidence (follow-up)

| Suite                                                                                                                                  | Location                                                              | Count |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| Boot degrades into the shell when the workspace IPC call _rejects_ (not just resolves to `{ ok: false }`)                              | `features/onboarding/__tests__/BootSessionStart.test.tsx`             | +1    |
| Settles `loading` to `false` and surfaces a real error when the workspace IPC call rejects; settles normally on a real resolved result | `features/workspaces/__tests__/WorkspaceProvider.test.tsx` (new file) | +2    |

## Epic 3 addendum — Home Command Center and Command Palette real domain wiring

Two previously honest-but-partial global UX components now consume the real services that landed after their first implementation.

**ND-008 Home Command Center** no longer stays locked to the first-run empty state once workspaces exist. It still renders the spec-defined "Create or discover a workspace" empty state when the real workspace registry is empty, but otherwise composes real state from `WorkspaceContext`, `workflowClient`, and `agentClient`: Continue opens the selected workspace detail route, workspace cards switch the active workspace before navigation, running workflow/agent counts are derived from persisted run state, and recommendations route only to already-real screens (`/automations/forge`, `/agents`, `/ai/approvals`, `/learn`). It does not invent pinned status, fake recents, or synthetic task urgency.

**ND-009 Universal Command Palette** now has real domains beyond Screens and Tools. On open, it reads active-workspace file entries, workspace records, persisted workflows, and persisted agents through the existing typed IPC clients, while settings are a curated route-backed index of real Epic 11 screens. Workspace results set the active workspace before navigating to detail. Tools still submit through the existing ActionQueue/PermissionBroker path. Symbols and recent-action history remain deferred because there is no symbol index or action-history store to query yet.

**Focus runtime follow-up:** Controller disconnect/reconnect notifications were added to `FocusEngineProvider`, but the first implementation used `useToast()` directly, which made every isolated focus-engine test require a `ToastProvider`. The provider now reads `ToastContext` optionally: production shells still display reconnect/disconnect toasts, while isolated focus tests and component harnesses safely no-op notifications when no toast host is mounted.

### Tests and evidence

| Suite                                                                                                                                                                                        | Location                                                     | Count |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- |
| Command Palette opens/closes via controller, filters screens, navigates, lists real workspace/file/workflow/agent/settings domains, and still submits tools through the real safety pipeline | `features/command-palette/__tests__/CommandPalette.test.tsx` | 9     |
| Home Command Center renders empty state when no workspaces exist, renders real workspace/service-backed sections, continues into workspace detail, and routes recommendations                | `features/home/__tests__/HomeCommandCenter.test.tsx`         | 5     |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- CommandPalette     → 1 file, 9 tests passed
npm run test -- HomeCommandCenter  → 1 file, 5 tests passed
npm run test -- BootSessionStart   → 1 file, 8 tests passed
npm run test -- Modal.focusEngine  → 1 file, 2 tests passed
npm run test                       → 109 files, 536 tests passed
npm run lint                       → 0 errors, 0 warnings
npm run typecheck                  → node + web TypeScript checks passed
npm run build                      → typecheck + electron-vite build passed
```

## Epic 6 follow-up — Command Builder headless execution, AI proposals, and saved actions now real

The Terminal Service / Command Builder gap tracked as "headless execution, AI intent proposals, and saved actions remain" is now closed. `TerminalService.runHeadless()` (`core/terminal/TerminalService.ts`) spawns a real, timeout-bounded `node_modules`-free child process (not a PTY) inside the workspace-confined cwd resolved by the existing `TerminalPathPolicy`, captures bounded stdout/stderr, and reports exit code/timeout/truncation — wired through a typed `terminal.runHeadless` IPC channel, preload bridge method, and `runHeadlessTerminal()` client function.

That backend existed in the working tree with full unit coverage but no real caller — `createHeadlessTerminalTools()` (`ai-safety/tools/headlessTerminalTools.ts`) closes that gap: four risk-tiered tools (`terminal-headless-low/medium/high/privileged`, mirroring the existing PTY-write `terminal-command-*` tiers) registered in `CoreToolsBootstrap.tsx`. Each tool validates its arguments, calls `runHeadlessTerminal`, and folds the captured exit code/duration/truncation/output into the `ToolResult.message` the existing `ActionQueue`/Execution Timeline/Audit history already surface generically — no new result-display UI was needed.

`CommandBuilder.tsx` gained a second "Run headless (capture output)" action alongside the existing "Send to approval review": it submits the exact same reviewed command to `ActionQueue` under `headlessToolIdForRisk(risk)` instead of `toolIdForRisk(risk)`, so it goes through the identical mandatory-approval pipeline — the only difference is which registered tool executes it (captured-output child process vs. PTY keystrokes). This path does not require a target session to be selected (headless execution has no PTY to write to), though the screen itself still gates on at least one running session existing before rendering at all — a pre-existing scope boundary this slice did not widen.

AI intent proposals and saved actions, also part of this gap, were already implemented and tested in the working tree before this pass: `requestCommandProposal()` sends the user's described intent through the real model router (`completeModel`), parses the structured JSON response into typed blocks via `parseCommandProposal` (never executes anything directly — the model only ever populates the block editor for the same review flow), and `saveCurrentAction()`/`loadSavedAction()`/`deleteSavedAction()` persist up to 20 reusable command-block sets per workspace in `localStorage`.

### Tests and evidence

| Suite                                                                                                                      | Location                                                       | Count |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----- |
| Headless tool argument validation, successful/failed/timed-out/truncated result formatting, and bridge-error passthrough   | `ai-safety/__tests__/headlessTerminalTools.test.ts` (new file) | 5     |
| Command Builder submits a headless run through `ActionQueue` approval and only calls `runHeadless` after explicit approval | `features/terminal/__tests__/CommandBuilder.test.tsx`          | +1    |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- headlessTerminalTools  → 1 file, 5 tests passed
npm run test -- CommandBuilder.test    → 1 file, 4 tests passed
npm run test                           → 113 files, 561 tests passed
npm run lint                           → 0 errors, 0 warnings
npm run typecheck                      → node + web TypeScript checks passed
```

## Epic 12 progress — controller disconnect/reconnect notifications now covered by real tests

The controller disconnect/reconnect handling described in the Epic 3 addendum above (`FocusEngineProvider` warning on the last gamepad disconnecting and confirming on reconnect, via the optional-`ToastContext` pattern) shipped without dedicated tests for the connection-tracking logic itself — every existing `FocusEngineProvider` consumer test injects a `TestAdapter`, which never exercises the real `GamepadAdapter` path the warning/confirmation logic actually lives in.

**Added**: `controller/focus/__tests__/FocusEngineProvider.test.tsx` renders the provider with its real (default) adapters and dispatches real `gamepadconnected`/`gamepaddisconnected` window events (jsdom doesn't implement `GamepadEvent`, so a plain `Event` with a manually attached `.gamepad` property is used — `GamepadAdapter` only ever reads `event.gamepad.{index,id}`, so this exercises the identical code path a real browser event would). Covers: a warning toast when the only connected controller drops, a confirmation toast on reconnect (but not on the very first connect, since that isn't a recovery), and no warning while a second controller remains connected.

This closes the test-coverage gap for that part of Epic 12 (`IMPLEMENTATION_CHECKLIST.md`'s "Controller disconnect/reconnect handling" item).

### Tests and evidence

| Suite                                                                                                                                  | Location                                                             | Count |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----- |
| Warns on last-controller disconnect, confirms reconnect (not first connect), stays silent while a second controller is still connected | `controller/focus/__tests__/FocusEngineProvider.test.tsx` (new file) | 3     |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- FocusEngineProvider  → 1 file, 3 tests passed
npm run test                         → 113 files, 561 tests passed
npm run lint                         → 0 errors, 0 warnings
npm run typecheck                    → node + web TypeScript checks passed
```

## Epic 12 progress — suspend/resume detection and notification now real

Electron's `powerMonitor` module — the only mechanism this architecture has for observing OS-level suspend/resume — was never imported anywhere before this pass; `registerPowerHandlers.ts` only handled the two safe ND-051 Power Menu actions (`app.relaunch()`/`app.quit()`).

**Added**: `registerPowerHandlers(getWindow)` now also subscribes to `powerMonitor`'s real `suspend`, `resume`, `lock-screen`, and `unlock-screen` events and forwards each as a typed `PowerStateEvent` (`shared/contracts/system.ts`) over a new `power.stateEvent` IPC channel to the renderer, returning a dispose function (mirroring the existing `registerTerminalHandlers`/`registerRemoteHandlers` lifecycle pattern) that `main/ipc/index.ts` now calls alongside the others. `PowerStateBridge.tsx` — a global, render-nothing component mounted in `ShellLayout` next to `CoreToolsBootstrap` — subscribes via the new `onPowerStateEvent` preload bridge method and shows a real toast on `resume`, including the approximate suspended duration when a prior `suspend` event was observed (e.g. "suspended for about 5 minutes"). `lock-screen`/`unlock-screen` are intentionally silent in the UI (an idle-timeout screen lock fires far more often than a real suspend during normal use and would just be toast spam) but are still forwarded over IPC for any future consumer.

This is deliberately scoped to detection and notification, matching what the architecture can actually do: there is no separate core-service process to pause/resume, and this app never attempts to veto, delay, or otherwise act on the OS's own suspend decision — only to tell the user it happened and that session/live-data state may now be stale.

**A real bug found and fixed while wiring this up**: the first version of `onPowerStateEvent` called `getNdxBridge()?.power.onStateEvent(listener)` — note the single `?.` only guards the bridge lookup, not the `power.onStateEvent` method itself. Several existing tests (`App.test.tsx` among them) stub `window.ndx.power` with only `{ quitApp }`, the same partial-mock pattern already used throughout the test suite for every other bridge namespace. Calling the missing method threw inside `PowerStateBridge`'s mount effect, which `RootErrorBoundary` (sitting _above_ `FocusEngineProvider` in `AppProviders`) caught by replacing the entire app tree with `ErrorRecoveryContent` — which itself calls `useFocusEngine()` and threw a second, more confusing error, since the boundary's fallback no longer has a `FocusEngineProvider` above it either. **Fixed** by changing the call to `getNdxBridge()?.power?.onStateEvent?.(listener)`, matching the same defensive double-optional-chain pattern `browserClient.ts`'s `onBrowserPermissionRequest` already established for exactly this situation (a newly-added listener method that older partial test mocks don't yet implement). No test mocks needed to change.

### Tests and evidence

| Suite                                                                                                                                                   | Location                                                         | Count |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| Resume without a prior suspend shows a generic refresh notice; resume after a tracked suspend reports the approximate duration; lock/unlock never toast | `features/system/__tests__/PowerStateBridge.test.tsx` (new file) | 3     |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- PowerStateBridge  → 1 file, 3 tests passed
npm run test -- App.test          → 1 file, 3 tests passed (regression: failed before the onPowerStateEvent fix)
npm run test                      → 114 files, 564 tests passed
npm run lint                      → 0 errors, 0 warnings
npm run typecheck                 → node + web TypeScript checks passed
npm run build                     → typecheck + electron-vite build passed
```

## Epic 12 progress — SteamOS/Linux packaging now real, plus a real masked dependency bug found and fixed

Full detail lives in `docs/implementation/NDX_STEAMOS_PACKAGING.md`; summarized here.

`electron-builder.yml` still carried unconfigured scaffold defaults — `appId: com.electron.app`, `productName: neurodeck_scaffold`, `linux.maintainer: electronjs.org`, and a `publish` block pointed at `https://example.com/auto-updates` (dead config: no `electron-updater` integration exists anywhere in this codebase). **Fixed**: real `appId`/`productName`/`maintainer`, removed the dead `publish` block, changed `linux.category` to `Development` (more accurate given the bundled terminal/Git/Build Studio), and added `package.json`'s `desktopName` + `electron-builder.yml`'s `linux.syncDesktopName: true` so electron-builder auto-derives a `StartupWMClass` that actually matches the `app_id` Electron itself reads from `desktopName` at runtime (confirmed by reading `app-builder-lib`'s actual installed source, not just its docs — a manually-specified `StartupWMClass` override was tried first and found to be wrong: it would have shadowed the correct auto-derived value with a non-matching one).

**Real bug found**: Windows has no native build of the Linux packaging tools (`mksquashfs`, `fpm`/`dpkg-deb`) `electron-builder --linux` needs, so verifying any of the above required a real Linux environment. WSL2's Ubuntu distro on this machine already had `node`/`npm`/`mksquashfs` installed. Syncing the project (minus `node_modules`/`.git`/build output) into the WSL filesystem and running a **fresh** `npm install` there — as opposed to reusing the Windows machine's already-populated `node_modules` — surfaced a real, previously-invisible bug: `clsx` is imported directly in `features/search/GlobalSearch.tsx` and `SearchResultRow.tsx` but was never a declared dependency in `package.json`/`package-lock.json`. The Windows build only "worked" because of a stale `node_modules/.vite/deps/clsx.js` cache entry left over from before `clsx` was apparently dropped as a dependency without checking whether source still imported it — a genuinely fresh checkout (exactly what CI or a new contributor's machine would do) would fail to build. **Fixed**: added `"clsx": "^2.1.1"` to `package.json`'s real `dependencies`, regenerated `package-lock.json`. Also added a real `homepage` field (the project's actual GitHub remote — not a placeholder) since `fpm` refuses to build a `.deb` without one.

With both fixes, a real `npm run build:linux` inside WSL produced all three configured Linux targets with no errors — `neurodeck-os-0.0.0.AppImage`, `neurodeck-os_0.0.0_amd64.snap`, `neurodeck-os_0.0.0_amd64.deb`. The AppImage was extracted (`--appimage-extract`) and its embedded `.desktop` file inspected directly — `StartupWMClass=neurodeck-os`, `Categories=Development;`, `Comment` correctly pulled from `package.json`'s description — and `dpkg-deb -I` on the `.deb` confirmed correct control metadata (package name, vendor, maintainer, homepage, real runtime `Depends`). This is the verification standard this repo holds itself to: read the actual tool's behavior from its source and a real build artifact, not just trust documentation or a config that merely "looks right."

Game Mode/Desktop Mode themselves are scoped honestly: this repo cannot add itself to a user's Steam library (that's an action against the user's own Steam client), so "SteamOS packaging" means producing a correctly-identified build artifact a user can add as a non-Steam game (Game Mode) or install via the `.deb`/run the AppImage directly (Desktop Mode) — not a fake "Steam integration" feature. A Steam Input config preset, Decky Loader plugin, CI automation of this build, and a signed release pipeline remain unstarted.

### Tests and evidence

| Suite                                                                                                       | Location       | Count                       |
| ----------------------------------------------------------------------------------------------------------- | -------------- | --------------------------- |
| Full test suite re-run after the `clsx` dependency fix (no behavior change expected, regression check only) | `npm run test` | 114 files, 564 tests passed |

**Validation evidence (run 2026-06-24):**

```text
npm install (fresh, inside WSL2 Ubuntu)        → succeeded only after the clsx fix; failed before it
npm run build:linux (inside WSL2 Ubuntu)       → AppImage + snap + deb all produced, no errors
./neurodeck-os-0.0.0.AppImage --appimage-extract; cat squashfs-root/*.desktop
                                                → StartupWMClass=neurodeck-os, Categories=Development;, correct Name/Comment
dpkg-deb -I neurodeck-os_0.0.0_amd64.deb       → correct Package/Vendor/Maintainer/Homepage/Depends, no placeholders
npm run lint (Windows)                          → 0 errors, 0 warnings
npm run typecheck (Windows)                     → node + web TypeScript checks passed
npm run test (Windows)                          → 114 files, 564 tests passed
```

## Epic 12 progress — security pass (audit, no code changes required)

A real security audit of the codebase as it stands, covering the categories the mega-prompt's Epic 12 "Security pass" item names. No vulnerabilities or gaps were found that warranted a code change — this entry documents what was actually checked and how, rather than asserting "passed" without evidence.

**Dependency audit**: `npm audit --omit=dev` reports 0 vulnerabilities in production dependencies. `npm audit` (including dev) reports 5 (3 moderate, 1 high, 1 critical) — all in `esbuild`/`vite`/`vitest`'s dev-server, specifically a known issue where esbuild's dev server can respond to arbitrary cross-origin requests. This only matters when the Vite dev server is bound to a network-reachable interface and untrusted parties can reach it; this project's `npm run dev` binds to localhost for local development only, so it's accepted as a known, scoped risk rather than fixed by force-upgrading — `npm audit fix --force` would jump `vitest` to v4, a major version with no compatibility check performed against this project's 564 existing tests, and forcing it without that check would risk a worse problem (a broken or silently-weakened test suite) than the risk being fixed.

**Electron hardening baseline**: `src/main/security/windowSecurity.ts`'s `HARDENED_WEB_PREFERENCES` (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`) matches the mandatory baseline exactly, and `applyNavigationPolicy()` denies in-app navigation outside the app's own origin and routes all window-open attempts through an allowlisted `shell.openExternal`. `src/renderer/index.html`'s CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`) is real and strict — no `unsafe-eval`, no wildcard origins.

**IPC input validation**: an independent pass over every `registerXHandlers.ts` file in `src/main/ipc/` counted 82 total `ipcMain.handle` call sites. 11 take no payload (nothing to validate). All 71 that do accept a payload call a Zod schema's `.safeParse()` on it before touching the parsed data, with early-return on failure — 100% coverage, zero gaps, across every handler file (workspace, file, terminal, learning, agent, browser, git, controller settings, model, system, workflow, diagnostics, remote, network, recovery, power, update).

**Secrets handling**: provider API keys (`ModelProviderStore`) and SSH host passwords/passphrases (`RemoteHostStore`) are encrypted at rest via `electronSecretCipher.ts`, a real wrapper around Electron's `safeStorage` (OS Keychain/DPAPI/libsecret) — never a homegrown cipher. Neither store's public IPC-facing type includes the encrypted or plaintext secret; both expose only a `hasApiKey`/`hasSecret` boolean. The renderer-side forms that collect these values (`ModelControlCenter.tsx`, `AIProviderSetup.tsx`, `RemoteSystems.tsx`) use `type="password"` inputs holding only local component state, never logged or persisted client-side.

**Other checks**: no `eval()`, `new Function()`, or `dangerouslySetInnerHTML` anywhere in `src/` (the one match was a comment documenting their _absence_ in `evaluateCondition.ts`). No `console.log`/`console.error`/`console.warn` calls exist anywhere in `src/main` or `src/core` at all — so there is no code path in the privileged process where a secret (or anything else) could leak into logs. `ModelProviderService`'s `fetch()` calls target a user-configured `baseUrl` (their own chosen local/cloud provider endpoint) — not a server-side-trust or SSRF concern, since the user explicitly owns and configures that destination themselves, the same trust model as a browser address bar.

### Tests and evidence

| Check                                                                     | Method                                                                               | Result                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Production dependency vulnerabilities                                     | `npm audit --omit=dev`                                                               | 0 found                                                                                                      |
| All dependency vulnerabilities                                            | `npm audit`                                                                          | 5, all dev-only (vitest/vite/esbuild dev-server), accepted as scoped/not applicable to this app's deployment |
| IPC payload validation coverage                                           | Manual audit of all `ipcMain.handle` call sites in `src/main/ipc/*.ts`               | 71/71 payload-accepting handlers validate with Zod; 11/11 zero-payload handlers correctly need none          |
| Electron hardening baseline                                               | Direct review of `windowSecurity.ts`                                                 | Matches mandatory baseline exactly                                                                           |
| CSP                                                                       | Direct review of `index.html`                                                        | Strict, no `unsafe-eval`                                                                                     |
| Secret storage/exposure                                                   | Direct review of `SecretCipher`/`electronSecretCipher.ts`/store types/renderer forms | Real OS-level encryption; never exposed in any IPC response type or log                                      |
| Dangerous JS patterns (`eval`, `new Function`, `dangerouslySetInnerHTML`) | `grep -rn` across `src/`                                                             | None found                                                                                                   |

**Validation evidence (run 2026-06-24):**

```text
npm audit --omit=dev  → 0 vulnerabilities
npm audit              → 5 vulnerabilities, all dev-only (esbuild/vite/vitest dev-server), accepted as out of scope
```

## Epic 12 progress — performance pass (route-level code splitting, measured)

Checked every item in the mega-prompt §33 performance budget list against the real codebase. One real, fixable gap was found and fixed; the rest were already real or already explicitly, justifiably deferred.

**The gap**: `src/renderer/src/app/routing/routes.tsx` statically imported 37 of its 41 screen components — only `BuildStudio`, `UniversalTerminal`, `CommandBuilder`, and `RemoteSession` were `React.lazy()`-loaded. Every other screen (Git Control Center, all of Epic 11's system settings screens, Model Control Center, Agent Operations Center, Workflow Library/Forge, etc.) was bundled into the renderer's main entry chunk regardless of whether the user ever visited it — directly contradicting §33's "Route-level code splitting" and "Lazy editor/browser loading" requirements, and inflating every cold boot's initial JS parse/eval cost.

**Fixed**: converted all 37 to the same `lazy(async () => { const module = await import(path); return { default: module.Name } })` pattern the 4 already-lazy screens used, each wrapped in `<Suspense fallback={...}>` via a small `withSuspense(label, element)` helper to avoid repeating the boilerplate 37 times. `HomeCommandCenter` and `BootSessionStart` were deliberately left eager: `BootSessionStart` is the real first route the app renders (`RouterRoot.tsx` redirects `/` → `/boot` and imports it directly itself, so lazy-loading it in `routes.tsx` would not have reduced the main bundle anyway — that import there is dead for rendering purposes, kept only for this file's route-metadata catalog), and `HomeCommandCenter` is where boot navigates returning users immediately after — lazy-loading either would add a guaranteed Suspense flash to literally every app launch with no bundle-size benefit on the path that matters most.

**Measured, not estimated**: a real `npm run build` before this change produced `index-DxUKU28e.js` at 1,756.37 kB; after, `index-DR9b6eR0.js` is 991.69 kB — a 764.68 kB (43.5%) reduction in the JS the renderer must parse and evaluate before the app can render anything, on every cold boot. `BuildStudio`'s already-lazy chunk (7,354.72 kB, dominated by Monaco) was unaffected, as expected.

**A real test broken by this fix, found and corrected**: `App.test.tsx`'s "navigates between primary destinations" test clicked into `/ai` and asserted `screen.getByText('No active workspace')` synchronously — that assertion now races the lazy `AICommandCanvas` chunk's `Suspense` resolution and fails intermittently/consistently depending on timing. Changed to `await screen.findByText(...)`, which waits for the async mount the same way several other tests in this suite already do for similar reasons.

**Audited and already real**: browser tabs already suspend their `WebContentsView` when inactive (Epic 10 — only the active tab's view is ever resident); System Metrics has zero polling, manual Refresh only (Epic 11); `Toast`/`AuditLog` history are both bounded (`MAX_HISTORY = 100`); `OllamaRuntimeService.unload()`/`.load()` already exist as real manual controls via Ollama's `keep_alive` parameter; the Spatial Focus Engine's `useFocusable` registers a `getRect: () => element.getBoundingClientRect()` lazy getter invoked only at actual navigation time rather than cached — caching it would risk acting on a stale rect after a layout change (a correctness bug), and at today's screen-count scale there's no measured cost to justify the added complexity of a cache-invalidation scheme.

**Audited and reasonably deferred, not fixed**: virtualized lists (`VirtualizedFocusList`) — no list anywhere in the app currently renders enough items to need one; this was already an explicit Epic 1 deferral ("not built without a real consumer — avoids dead/unused primitives"), not something overlooked. Worker-thread offloading for heavy tasks, leak-detection-during-tests tooling, and a formal controller-input/focus/route-transition timing harness against the exact §33 millisecond budgets (50ms input response, 100ms initial focus, 300ms route transition, 250ms warm overlay, ≤2% idle CPU, <500MB shell memory) were not built — those need real instrumentation (e.g. a Playwright-driven timing harness) that's a larger, separate effort from this pass.

### Tests and evidence

| Suite                                                                                                       | Location                 | Count                                 |
| ----------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------- |
| Lazy-loaded `AICommandCanvas` route resolves and renders its real empty state                               | `__tests__/App.test.tsx` | 1 (fixed: `getByText` → `findByText`) |
| Full suite re-run after the routing refactor (no behavior change expected outside the one async-timing fix) | `npm run test`           | 114 files, 564 tests passed           |

**Validation evidence (run 2026-06-24):**

```text
npm run build (before)  → out/renderer/assets/index-DxUKU28e.js  1,756.37 kB
npm run build (after)   → out/renderer/assets/index-DR9b6eR0.js    991.69 kB  (−43.5%)
npm run lint             → 0 errors, 0 warnings
npm run typecheck        → node + web TypeScript checks passed
npm run test             → 114 files, 564 tests passed (1 unrelated flaky test confirmed passing in isolation)
```

## Epic 3 closeout — ND-002 Lock Screen, scoped to a single local PIN

ND-002 was the last unbuilt Phase A screen in Epic 3, deferred on the (slightly mislabeled) grounds of needing "profile/credential system (Epic 10)" — the actual dependency is Phase B's Epic X10 ("Identity, credentials, certificates, secrets vault"), which still doesn't exist. Rather than leave the whole screen deferred indefinitely, this slice builds the part of ND-002 that's real without a multi-profile vault: a single local PIN, using infrastructure that already exists.

**`core/lock/LockSettingsStore.ts`** persists only a salted `scrypt` hash (`node:crypto`, no new dependency) in the same `JsonStore`-backed pattern `ControllerSettingsStore`/`DisplaySettingsStore` already use — never the raw PIN, never anything reversible. `setPin()` (first-time set or change, requiring the current PIN once one exists), `removePin()` (also requires the current PIN), and `verifyPin()` (constant-time comparison via `timingSafeEqual`) are all real, with a dedicated `LockPinMismatchError` rather than a generic failure. Wired through `registerLockHandlers.ts` (new `lock.getStatus`/`lock.setPin`/`lock.removePin`/`lock.verifyPin` IPC channels, Zod-validated), the preload bridge, and `services/ipc/lockClient.ts`.

**`state/lockContext.ts`/`lockState.tsx`/`useLockState.ts`** (mirroring the existing `displayMode`/`displaySettings` context+provider+hook pattern) hold `pinConfigured`, `isLocked`, and `lockedAt` in a `LockProvider` mounted in `AppProviders.tsx` just inside `DisplaySettingsProvider`. Engaging `lock()` calls the real, already-existing `ActionQueue.emergencyStop()` — the same mechanism ND-054 Emergency Stop uses — so pending/queued tool actions can't silently execute while the screen is locked; already-running actions still complete, matching Emergency Stop's own documented behavior. `unlock(pin)` verifies against the real main-process check and only clears `isLocked` on an actual match; it deliberately does not auto-resume the action queue, for the same reason Emergency Stop doesn't auto-resume itself.

**`features/system/LockScreen.tsx`** renders the wireframe's actual ND-002 layout: time/battery (the same `SystemMetricsService` battery data ND-042 already exposes, honestly omitted if unavailable rather than fabricated), a real controller-focusable numeric keypad whose digit order is reshuffled every mount (Fisher-Yates) — the spec's literal security requirement that "Controller PIN uses randomized... selection options" to resist shoulder-surfing — Clear/Unlock, a real pending-approvals count plus an honest "N actions cancelled while locked" count scoped to cancellations that happened at or after this specific lock's `lockedAt` timestamp (not lumping in unrelated earlier cancellations), a disabled note explaining account authentication needs Phase B's vault, and reachable Restart/Quit "Power options" (reusing the existing `powerClient` functions) so a locked user isn't stranded if they need to restart or quit. `ShellLayout.tsx` swaps its entire content for `LockScreen` while `isLocked` — no nav, no Command Palette, no overlays, matching Emergency Stop's own full-takeover pattern.

**Privacy and Permissions** (ND-046) gained a real "Lock Screen PIN" section — Set/Change PIN (current PIN required once one exists), Remove PIN, inline validation (mismatch confirmation, wrong current PIN) — and the **Power Menu**'s "Lock NeuroDeck" option, previously a permanently-deferred placeholder, is now a real action once a PIN exists (and an honest "set a PIN first" note when none does).

**Two real, pre-existing bugs found and fixed while wiring this in**, both the same class of bug as `onPowerStateEvent`'s earlier fix: `LockProvider`'s status-refresh effect and `PrivacyPermissions`'s existing browser-permissions effect both run unconditionally on every mount, so any test stubbing `window.ndx` without the exact namespace they touch would crash. `lockClient.ts`'s four functions were written with the defensive `bridge.lock?.<method>?.()` guard from the start (learned from the earlier incident), and `browserClient.ts`'s `listBrowserPermissions()`/`revokeBrowserPermission()` — which predate that incident and were never patched — got the same fix here once a new test (PIN management, stubbing `window.ndx` with only a `lock` namespace) finally exercised the gap.

### Tests and evidence

| Suite                                                                                                                            | Location                                                   | Count           |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------- |
| PIN set/verify/change/remove, current-PIN enforcement, salted-hash-only persistence on disk, persistence across store instances  | `core/lock/__tests__/LockSettingsStore.test.ts` (new file) | 6               |
| Bridge-unavailable/partial-mock handling and request delegation for all four lock IPC methods                                    | `services/ipc/__tests__/lockClient.test.ts` (new file)     | 6               |
| Full lock → wrong-PIN-stays-locked → correct-PIN-unlocks flow; all ten shuffled digits render; account-authentication note shown | `features/system/__tests__/LockScreen.test.tsx` (new file) | 2               |
| Lock Screen PIN section sets a PIN and reflects status; rejects a mismatched confirmation                                        | `features/system/__tests__/PrivacyPermissions.test.tsx`    | +2              |
| "Lock NeuroDeck" is a real action once a PIN is configured (previously always-deferred assertion updated)                        | `features/system/__tests__/PowerMenu.test.tsx`             | +1 (1 modified) |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- LockSettingsStore  → 1 file, 6 tests passed
npm run test -- lockClient         → 1 file, 6 tests passed
npm run test -- LockScreen.test    → 1 file, 2 tests passed
npm run test -- PrivacyPermissions → 1 file, 8 tests passed
npm run test -- PowerMenu          → 1 file, 5 tests passed
npm run test                       → 117 files, 581 tests passed
npm run lint                       → 0 errors, 0 warnings
npm run typecheck                  → node + web TypeScript checks passed
npm run build                      → typecheck + electron-vite build passed
```

## Epic 12 progress — accessibility pass (§32 audit, two real gaps fixed)

A research pass against every item in mega-prompt §32's accessibility checklist (semantic labels, logical accessibility tree, visible focus, high contrast, text scaling, reduced motion, haptic control, controller repeat/hold-duration control, screen narration hooks, read-current-screen command, subtitle/caption support, single-hand mappings, remappable controls, status reinforcement beyond color, accessible error messages) found most items already real: `NavigationRailItem.tsx` and `Toast.tsx`'s dismiss button carry real `aria-label`s, `ControllerButton` forwards every HTML attribute so consumers can always supply one; `ShellLayout.tsx` uses real landmarks (`<header role="banner">`, `<nav aria-label="Primary">`, `<main>`, `<aside aria-label="Context">`, `<footer role="contentinfo">`) with a consistent h1→h2→h3 heading hierarchy across screens; `StatusBadge.tsx` requires a text `label` prop and its own doc comment states status is never color-only; high contrast/text scaling/reduced motion (ND-044) and haptic intensity (ND-043) are real, persisted settings already documented in their own epics.

**Gap 1 — accessible error messages were inconsistently marked.** Only 4 screens (`PrivacyPermissions.tsx`, `LockScreen.tsx`, `CommandBuilder.tsx`, `UniversalTerminal.tsx`) had hand-added `role="alert"` on their own error text; every other screen's error state — rendered through the shared `ErrorState` component (`components/feedback/UXState.tsx`) — had no live-region marking at all, so a screen reader user would never be told an operation failed unless they happened to be focused on that exact text already. **Fixed at the shared-component level**: `UXStateBase` gained an optional `role` prop, and `ErrorState` now always passes `role="alert"`. Because `ErrorState` already has many call sites across the app (every screen with a real failure path uses it per its own doc comment — "Required whenever a real operation fails"), this one change retroactively fixes accessible error announcement everywhere it's used, rather than requiring an audit-and-patch pass over every individual screen. `EmptyState`/`OfflineState`/`RestrictedState` were deliberately left without a role — those aren't error announcements and don't need to interrupt a screen reader the instant they render.

**Gap 2 — "Screen narration hooks" and "Read-current-screen command" had zero implementation.** Confirmed via search: no `SpeechSynthesis`/Web Speech API usage existed anywhere in the renderer. **Added** `features/system/ScreenNarrator.tsx`, mounted globally in `ShellLayout.tsx` next to the other global bridges. It's reachable via a new semantic `narrate.screen` controller action — added to `ControllerAction` (`controllerAction.ts`), the keyboard fallback map (`N` key, `keyboardMapping.ts`), and a new Menu+X gamepad chord (`standardGamepadMapping.ts`), following the exact same pattern `emergency.stop`/`quick.access` already use. On trigger, it reads the live DOM's current `<main>` heading plus any active `role="alert"` text via `window.speechSynthesis` — a real browser API requiring no new dependency — rather than maintaining a separate per-screen narration script that could drift from what the screen actually shows once that screen changes. A repeat trigger cancels any in-progress utterance and re-reads (no queued duplicate speech); if no speech engine is available, a real toast says so rather than silently doing nothing.

**Left as already-documented, justified deferrals** (not oversights): controller repeat/hold-duration control, single-hand mappings, and remappable controls all need either the `gamepadPolling.ts` config-threading refactor or Steam Input/a native adapter — already tracked under Epic 2's known gap. Subtitle/caption support is out of scope because the app has no audio/video content anywhere yet to caption.

### Tests and evidence

| Suite                                                                                                                                                                      | Location                                                       | Count |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----- |
| Reads heading + alert text on the real `narrate.screen` action; falls back to document title; shows a real toast (not a silent no-op) when speech synthesis is unavailable | `features/system/__tests__/ScreenNarrator.test.tsx` (new file) | 3     |

**Validation evidence (run 2026-06-24):**

```text
npm run test -- ScreenNarrator  → 1 file, 3 tests passed
npm run test                    → 118 files, 584 tests passed (1 pre-existing flaky test under full-suite load, confirmed passing in isolation both before and after this change)
npm run lint                    → 0 errors, 0 warnings
npm run typecheck               → node + web TypeScript checks passed
npm run build                   → typecheck + electron-vite build passed
```

## Real bug found and fixed — boot never progressed past "Restoring workspace" in dev mode

User report: "still unable to get to the home app screen due to the boot menu not progressing." Reproduced directly using the same diagnostic technique documented earlier in this ledger (a second Playwright `_electron` instance pointed at the already-running `electron-vite dev` Vite server via `ELECTRON_RENDERER_URL`, with `console`/`pageerror` listeners attached) — confirmed the real app gets stuck showing "Restoring workspace …" forever in dev mode, never reaching either onboarding or Home, and never even hitting the 15-second boot-timeout failure screen.

**Root cause**: `main.tsx` wraps the app in `<StrictMode>`, which deliberately mounts every component twice in development — mount, synthetic cleanup, mount again — specifically to surface effects whose cleanup isn't idempotent. `BootSessionStart.tsx`'s `abortRef = useRef(false)` is shared across both invocations (it's the same component instance, same ref, just the effect body re-running). The first, throwaway invocation's cleanup sets `abortRef.current = true`. The effect body never reset it back to `false` at the start of a new invocation, so the _second_, real, staying-mounted invocation inherited the stale `true` — every subsequent `updateStep()`/`finishBoot()` call (including the 15-second timeout's own callback) hit the `if (abortRef.current) return` guard and silently no-opped, forever. The real `listWorkspaces()` IPC call itself was confirmed to resolve instantly and correctly (verified directly via `window.ndx.workspaces.list()` from the Playwright harness) — this was purely a stale-ref bug in the React layer, not an IPC or main-process problem. It's dev-mode-only because production builds never double-invoke effects; that's also exactly why the existing `e2e/app.spec.ts` (which launches the production build) never caught it.

**Fix**: `abortRef.current = false` is now the first line of the effect body, resetting the flag on every invocation rather than relying on `useRef`'s one-time initial value.

**Verification**: re-ran the same dev-server Playwright reproduction after the fix — boot now completes and navigates to `/onboarding/welcome` as expected. Also added a real regression test that exercises the same failure mode without needing a live dev server: `renderWithProviders` (`__tests__/testUtils.tsx`) gained an optional `strict` flag that wraps the rendered tree in `<StrictMode>` (matching `main.tsx`), and `BootSessionStart.test.tsx` has a new test that renders with `strict: true` and asserts boot still completes — verified this test actually catches the bug by temporarily reverting the fix and confirming it fails (stuck showing "Return to SteamOS"/"Show details" instead of reaching onboarding), then re-applying the fix and confirming it passes.

### Tests and evidence

| Suite                                                                                          | Location                                                  | Count |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----- |
| Boot still completes under a real `<StrictMode>` double-effect-invoke, not just a single mount | `features/onboarding/__tests__/BootSessionStart.test.tsx` | +1    |

**Validation evidence (run 2026-06-24):**

```text
Dev-mode Playwright reproduction (before fix) → stuck on "Restoring workspace …" past 20s, no timeout fired
Dev-mode Playwright reproduction (after fix)  → navigates to /onboarding/welcome correctly
npm run test -- BootSessionStart               → 1 file, 9 tests passed
npm run test                                   → 118 files, 585 tests passed
npm run lint                                   → 0 errors, 0 warnings
npm run typecheck                              → node + web TypeScript checks passed
npm run build                                  → typecheck + electron-vite build passed
npx playwright test                            → 1 file, 1 test passed (production build e2e)
```

## A second real bug found while re-verifying the boot fix — unnamespaced userData directory

The user reported the boot issue persisted after the `abortRef` fix above. Re-reproducing live (same Playwright-against-running-dev-server technique) showed boot now completing correctly in two separate runs, so the original bug was confirmed fixed — but investigating _why_ the user might still see something wrong surfaced a second, unrelated, real bug worth fixing regardless: this app never calls `app.setName()`, so `app.getPath('userData')` falls back to Electron's literal default app name, `"Electron"`, whenever the app runs unpackaged (`electron-vite dev` never reads `package.json`'s `name`/`productName` into `app.name` the way a packaged build does).

**Confirmed in practice, not just in theory**: this machine's `%APPDATA%/Electron` already contained `jpe_secure_vault.json` and `sidecar.lock.json` — files that exist nowhere in this codebase — sitting in the exact directory every one of this app's own `core/*Store` classes (`WorkspaceStore`, `ModelProviderStore`, `LockSettingsStore`, etc.) would otherwise write their own same-purpose files into. Any other unpackaged Electron app a developer runs on the same machine shares this one generic folder by default — a real, silent data-collision risk, not a hypothetical one.

The fix wasn't as simple as just calling `app.setName('NeuroDeck')`: that name turned out to _already_ belong to a different, unrelated real application on this same machine — `%APPDATA%/NeuroDeck` held its own `neurodeck.db` (a SQLite file; this codebase has no SQLite anywhere, only JSON-file-backed `JsonStore`s), `temp_record.wav`, and `theme-settings.json`, none of which this codebase has ever produced. **Fixed** with `app.setName('NeuroDeck OS')` instead — matching `electron-builder.yml`'s `productName` exactly, confirmed via direct directory inspection to be genuinely unused on this machine before this change, and now keeps the dev-mode and packaged-build userData directories identical. Placed as the very first statement in `main/index.ts`, before `app.whenReady()` and before any store constructor's `app.getPath('userData')` call, since Electron resolves the userData path from `app.name` at first access, not lazily re-evaluated later.

This was not the root cause of the user's reported stall (no NeuroDeck-shaped files existed in the contaminated `Electron` folder, so nothing this app reads was actually corrupted by the collision) — it's a separate, real latent bug that happened to surface during the same investigation, fixed because leaving a confirmed userData collision in place would be irresponsible regardless of whether it explains today's specific report.

### Tests and evidence

**Validation evidence (run 2026-06-25):**

```text
Live dev-server Playwright reproduction (fresh profile)      → boots, reaches /onboarding/welcome in ~3s, no stall
Live dev-server Playwright reproduction (returning profile)  → boots, reaches /onboarding/welcome in ~3s, no stall
Direct inspection of %APPDATA%/NeuroDeck OS after a real run → only real Electron/Chromium runtime files, no contamination
npm run test     → 118 files, 585 tests passed
npm run lint     → 0 errors, 0 warnings
npm run typecheck → node + web TypeScript checks passed
npm run build     → typecheck + electron-vite build passed
npx playwright test → 1 file, 1 test passed (production build e2e)
```

## Phase A closeout — Epic 6 Universal Terminal modes, Epic 8 Agent Detail tabs (2026-06-25)

Confirming Phase A complete surfaced two genuinely open gaps (Epic 6's ND-028 Universal Terminal had Command Builder and Remote Session as separate routes, not switchable in-screen modes; Epic 8's ND-017 Agent Detail had no Tools/Logs/Files/Permissions tabs) rather than silently treating Phase A as done. Both are now real. This entry covers Areas 1 and 2 of that closeout; Areas 3 (E2E suite expansion, release candidate cut) and 4 (Acceptance Gates documentation) are tracked separately below/in `IMPLEMENTATION_CHECKLIST.md` §5.

### Area 1 — Epic 6: Universal Terminal integrated modes

`UniversalTerminal.tsx` gained a real `direct | intent | split | remote` mode switcher (plain `useState` + a `ControllerButton` row, matching `WorkspaceDetail.tsx`'s existing pattern — no new `Tabs` primitive invented for one consumer). The standalone `/terminal/builder` and `/remote/:hostId` routes are unchanged and still reachable directly.

- **`PaneGroup`** (`src/renderer/src/components/primitives/PaneGroup.tsx`) — new, real two-pane resizable primitive (CSS grid, pointer-drag and Arrow-key-nudge on a real `useFocusable` divider node, role `slider`). No nested pane tree, no layout persistence — Split mode's actual need. This is the real first consumer of the `PaneGroup` slot the ledger had open since Epic 1/2 (see the corrected deferred-items note above).
- **Intent mode** — `CommandBuilder.tsx` gained an optional `embedded`/`onSwitchToDirect` prop pair (defaults preserve the standalone route's exact prior behavior) rather than a duplicate implementation; `CommandBuilderPanel.tsx` is a 6-line wrapper.
- **Split mode** — `SplitTerminalPanel.tsx`, two independent session pickers each rendering the existing `TerminalViewport` inside `PaneGroup`. `TerminalViewport` already self-registers a focus node keyed by `session.id`, so two simultaneous instances needed zero special-casing in the Spatial Focus Engine.
- **Remote mode** — `RemoteModePanel.tsx`, an inline host picker (not `RemoteSystems.tsx`'s `HostCard` — add/remove/test stays that screen's job) plus the same `RemoteSessionViewport` the standalone route uses.

No new IPC channels — all three modes reuse `createTerminal`/`listTerminalSessions`/`listRemoteHosts`/`createRemoteSession`/`terminateRemoteSession`, already real.

### Area 2 — Epic 8: Agent Detail richer tabs

`AgentRun` gained a persisted `toolExecutions: AgentToolExecutionRecord[]` (additive Zod `.default([])`, plus a manual `normalizeRun()` in `AgentStore.ts` since `JsonStore` does raw reads with no `.parse()` call — the same reason `normalizeAgent()` already existed for `childAgentPolicy`). `AgentRuntime.submitToolCall()`/`resolveToolResult()` now persist the real `requested → passed/failed/denied/cancelled` lifecycle of every tool call a run submits, before resolving the in-memory promise — so the record survives independent of the promise map.

`AuditEntry` gained optional `agentId`/`runId`, threaded through `ActionQueue.submit()`'s new optional 4th `agentContext` param onto the stored `HarnessAction` itself (confirmed all 7 `audit.record()` call sites live inside `ActionQueue.ts`, not the bridge) — every later lifecycle entry (`approve`/`deny`/`cancel`/`execute`), not just the first, carries the IDs.

`AgentDetail.tsx` converted from a single stacked-sections screen into a real tabbed layout: Overview (unchanged), **Tools** (`run.toolExecutions` with `StatusBadge`), **Logs** (`useAiSafety().audit.list()` filtered by `agentId`/`runId`, live via `audit.onChange`), **Files** (filters to `files-write`/`files-delete` toolIds, reads `arguments.relativePath`; documents that file-content diffs need Recovery checkpoint data this tab doesn't reach into), **Permissions** (`permissionCeiling` plus any `denied` tool calls).

### Tests and evidence

| Suite                                                                                                                                  | Location                                                      | Count         |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------- |
| `AgentRuntime` toolExecutions persistence across the requested→passed lifecycle                                                        | `core/agents/__tests__/AgentRuntime.test.ts`                  | +1            |
| `ActionQueue` agentId/runId threading onto every later audit entry, human submissions stay unset                                       | `ai-safety/__tests__/ActionQueue.test.ts`                     | +2            |
| `AgentToolExecutionBridge` threads agentId/runId onto the real submission                                                              | `features/agents/__tests__/AgentToolExecutionBridge.test.tsx` | +1 (new file) |
| `AgentDetail` Tools/Logs/Files/Permissions tabs                                                                                        | `features/agents/__tests__/AgentDetail.test.tsx`              | +4            |
| `PaneGroup` rendering, Arrow-key nudge + clamp, pointer-drag wiring (jsdom has no real `PointerEvent` — documented, not worked around) | `components/primitives/__tests__/PaneGroup.test.tsx`          | +4 (new file) |
| `UniversalTerminal` mode switcher                                                                                                      | `features/terminal/__tests__/UniversalTerminal.test.tsx`      | +1            |
| `SplitTerminalPanel` session loading + real session creation                                                                           | `features/terminal/__tests__/SplitTerminalPanel.test.tsx`     | +2 (new file) |
| `RemoteModePanel` empty state, real connect, real disconnect                                                                           | `features/terminal/__tests__/RemoteModePanel.test.tsx`        | +3 (new file) |
| `CommandBuilder` embedded empty state calls `onSwitchToDirect` instead of navigating                                                   | `features/terminal/__tests__/CommandBuilder.test.tsx`         | +1            |

**Validation evidence (run 2026-06-25):**

```text
npm run test       → 122 files, 604 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
```

### Area 3 — E2E suite expansion and release candidate cut

Five new Playwright specs (`e2e/workspace.spec.ts`, `e2e/terminal.spec.ts`, `e2e/recovery.spec.ts`, `e2e/command-builder.spec.ts`, `e2e/emergency-stop.spec.ts`) join the existing `e2e/app.spec.ts`, each proving real cross-process behavior rather than "screen renders": a real `WorkspaceStore` round-trip through a stubbed native folder picker, a real shell command through the PTY, a real `RecoveryService` checkpoint on file delete, the full `ActionQueue` approval pipeline running a command end to end, and Emergency Stop enforcing at the queue level (cancelled status, plus a real rejected resubmission carrying the queue's own "Action queue is paused" message).

**Real bug found and fixed while building the suite**: every spec previously launched against this machine's actual NeuroDeck userData profile — non-hermetic, and on this machine a real persisted workspace from prior manual use made boot hang past the 15s timeout (confirmed: the identical build boots in ~1s against a fresh `--user-data-dir`). A shared `e2e/helpers/launchApp.ts` now launches every spec against an isolated temp profile. A second issue surfaced once isolated: `app.close()` alone left orphaned `electron.exe` processes behind (confirmed via `tasklist`), which starved a subsequent spec's launch of PTY/window resources and intermittently hung it for the full 30s test timeout — `launchApp()`'s `close()` now force-kills the real OS process tree (`taskkill /T /F` on Windows, `SIGKILL` elsewhere) before removing the temp profile.

**Release candidate cut** — ran the full validation chain fresh, in order, at this commit:

```text
npm run lint         → 0 errors, 0 warnings
npm run typecheck    → node + web TypeScript checks passed
npm run test         → 122 files, 604 tests passed
npm run build        → succeeded (lazy Build Studio JS unchanged ~7.35 MB)
npm run test:e2e     → 6 files, 6 tests passed (twice in a row, confirmed no orphaned electron.exe processes after either run)
npm run build:linux  → ENOENT on Windows (electron-builder's cached AppImage tool resolved a darwin binary — a known, already-documented Windows limitation: no native mksquashfs/fpm). Re-ran inside WSL2 Ubuntu per this ledger's own existing documented method (fresh `npm install`, not a copy of the Windows node_modules) — succeeded: neurodeck-os-0.1.0.AppImage (140 MB), neurodeck-os_0.1.0_amd64.deb (108 MB), neurodeck-os_0.1.0_amd64.snap (119 MB), all three with no errors.
npm audit --omit=dev → 0 vulnerabilities
npm audit             → 5 vulnerabilities (3 moderate, 1 high, 1 critical), all inside vitest's own vendored esbuild/vite chain (dev-only test tooling, not shipped in the packaged app) — fixing requires a breaking vitest v4 upgrade, tracked as an open item rather than forced in in the middle of this closeout.
```

`package.json`/`package-lock.json` bumped `0.0.0` → `0.1.0` (minor — this closeout closes real, previously-open feature gaps across three epics, not a patch).

### Tests and evidence

| Suite                                                      | Location                      | Count         |
| ---------------------------------------------------------- | ----------------------------- | ------------- |
| Real workspace persistence through the folder picker       | `e2e/workspace.spec.ts`       | +1 (new file) |
| Real shell command through the PTY                         | `e2e/terminal.spec.ts`        | +1 (new file) |
| Real Recovery Service checkpoint on file delete            | `e2e/recovery.spec.ts`        | +1 (new file) |
| Full ActionQueue approval pipeline against a real terminal | `e2e/command-builder.spec.ts` | +1 (new file) |
| Emergency Stop enforcement at the queue level              | `e2e/emergency-stop.spec.ts`  | +1 (new file) |

## Phase B begins — Epic X1 platform registry foundation (2026-06-25)

Phase A complete; starting Phase B per `IMPLEMENTATION_CHECKLIST.md`'s own "Phase A to completion before starting Phase B" instruction. Epic X1 (supplemental spec §4's "Required Architecture Extensions") is the prerequisite every later supplemental epic builds on — four registries plus a shared transaction framework, all real for the scope this foundation epic actually owns.

**Capability Registry** (`core/capability/CapabilityRegistry.ts`, supplemental §33) — every hardware/environment-dependent feature queries this instead of an ad hoc `process.platform` check. Per the supplemental non-negotiable §3.7 ("no false hardware assumptions"), every one of the 21 known capability ids returns a real, honest status with a real reason. Confirmed by direct inspection of this development machine: `secure-storage` (via Electron `safeStorage.isEncryptionAvailable()`), `notifications` (`Notification.isSupported()`), and `gpu-acceleration` (`app.getGPUFeatureStatus()`) are real, checkable signals, wired as real detector overrides in `main/security/electronCapabilityDetectors.ts`. The other 18 (Bluetooth, microphone, camera, gyro, rear buttons, haptics, thermal sensors, fan controls, Steam shortcut editing, Decky integration, etc.) have no real detection backend built yet and honestly report `unsupported`/`dependency-required` with a specific reason citing which later epic owns the real backend — not a placeholder "coming soon," a true statement about this codebase's current state. `core/` stays Electron-free (detectors are injected from `main/`, the same boundary `SecretCipher`/`electronSecretCipher` already established) so the registry itself is testable without Electron.

**Feature Registry** (`core/feature/FeatureRegistry.ts`, supplemental §34) — computes real `visible`/`disabled`/`hidden` per feature from capability status, Safe Mode, guest mode, extension-enabled state, and profile visibility (the last three have no real backend yet — Epics X3/X10/X11 — so they're accepted as optional context fields that simply have nothing to read from today, not stubbed). `shared/features/featureCatalog.ts` is now the single source of truth for the primary Navigation Rail: `navigationDestinations.ts`'s `NAVIGATION_DESTINATIONS` derives from it instead of duplicating the same 12 entries in two places, and `NavigationRail.tsx` filters against live `feature.list` IPC output, failing open (showing the destination) if the round-trip hasn't resolved yet so a slow IPC call never blanks primary navigation. Every current catalog entry has zero capability/profile/extension dependencies — the honest truth today, since no Phase A screen is hardware- or profile-gated — so this has no observable behavior change yet. It is the real mechanism Phase B's actually-gated features (Bluetooth Center needing `bluetooth`, Voice Assistant needing `microphone`) will extend.

**Application Registry** (`core/applications/ApplicationStore.ts`, supplemental §6.2) and **Device Registry** (`core/devices/DeviceStore.ts`, supplemental §22) are real persisted CRUD stores (mirroring `BrowserPermissionStore`'s shape) with zero discovery/detection logic by design — building fabricated Steam/Flatpak/AppImage discovery or fabricated Bluetooth/audio/display presence ahead of a real adapter would be exactly the "no package-manager lies" / "no false hardware assumptions" violations the supplemental non-negotiables forbid. These are the real shared destinations Epic X2's and Epic X8's real backends will write verified records into.

**Shared transaction framework** (`core/transactions/TransactionManager.ts`, supplemental §7.5) — a real pending/running/succeeded/failed/cancelled/rolled-back lifecycle with real progress (clamped, never fabricated) and real cancellation (invokes the caller's own cancel hook before recording the terminal state — never just relabels a still-running operation). No real consumer exists yet in this slice; it's built and tested standalone, mirroring how `ActionQueue` became the one real mechanism every tool invocation goes through, so Epic X2 (package transactions) and Epic X7 (sync/backup) extend one real mechanism instead of each inventing an ad hoc progress/cancel state machine.

**New IPC contracts** (§50) — `capability.*`, `feature.*`, `application.*`, `device.*`, the four domains this epic owns. Typed, Zod-validated, narrow preload bridge methods (`window.ndx.capabilities/features/applications/devices`), registered in `main/ipc/index.ts` alongside every existing service, following the exact same construction/registration pattern.

**Real bug found while wiring `NavigationRail`**: `App.test.tsx`'s existing `Partial<NdxBridge>` stub (an established, deliberate convention across this test suite — stub only what a test needs) doesn't include the new `features` slice, and `NavigationRail` now needs it on every render. Rather than retrofit every shell-rendering test's stub, `useFeatureVisibility.ts`'s fetch is wrapped in `.catch(() => undefined)` — consistent with the hook's own documented "fails open" contract (a missing/slow IPC round-trip shows every destination rather than blanking navigation), so a partial test stub and a genuinely degraded IPC bridge are handled by the same one real code path instead of two.

### Tests and evidence

| Suite                                                                                  | Location                                                               | Count         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------- |
| `CapabilityRegistry` honest detection, override injection, refresh, Linux-only honesty | `core/capability/__tests__/CapabilityRegistry.test.ts`                 | +4 (new file) |
| `FeatureRegistry` visibility computation (capability/Safe Mode/extension/profile)      | `core/feature/__tests__/FeatureRegistry.test.ts`                       | +7 (new file) |
| `ApplicationStore` real CRUD                                                           | `core/applications/__tests__/ApplicationStore.test.ts`                 | +6 (new file) |
| `DeviceStore` real CRUD                                                                | `core/devices/__tests__/DeviceStore.test.ts`                           | +5 (new file) |
| `TransactionManager` lifecycle, progress clamp, real cancellation                      | `core/transactions/__tests__/TransactionManager.test.ts`               | +8 (new file) |
| `NavigationRail` real adaptive visibility (visible/hidden/fails-open)                  | `renderer/src/components/navigation/__tests__/NavigationRail.test.tsx` | +3 (new file) |

**Validation evidence (run 2026-06-25):**

```text
npm run test       → 128 files, 637 tests passed (1 pre-existing flaky test under full-suite load, confirmed passing in isolation both before and after this change)
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## Epic X2 — Application ecosystem (2026-06-25)

Built on Epic X1's `ApplicationRecord`/`ApplicationStore`/`TransactionManager`. Real discovery, real launch, and a real Flatpak package lifecycle; Steam Shortcut Manager's binary VDF read/write is explicitly deferred (see below) rather than rushed.

**Discovery** (`core/applications/discovery/`): `DesktopEntryScanner` parses real `.desktop` files — the actual freedesktop.org Desktop Entry `[Desktop Entry]` INI format, honoring `NoDisplay=true`/`Hidden=true`/`Type=Application` the same way a real desktop environment's app menu would, with `Exec`'s field codes and quoting parsed into a real executable + launch arguments. `SteamLibraryScanner` parses Steam's real text-VDF format used by `libraryfolders.vdf` (each library's real root path) and every `steamapps/appmanifest_*.acf` (per-game `appid`/`name`/`installdir`) — confirmed this is genuinely a different, simpler text format than `shortcuts.vdf`'s binary format before writing a single parser for both as if they were the same thing. `ApplicationDiscoveryService` orchestrates both scanners plus the Flatpak adapter and upserts real results into the Epic X1 `ApplicationStore`; one scanner failing (confirmed by a real test injecting a rejection) never aborts the others.

**Flatpak adapter** (`core/applications/FlatpakAdapter.ts`, supplemental §7.2) — every operation shells out to the real `flatpak` CLI via `execFile` (never a shell string, matching `GitService`'s established safe-exec convention): search, list, install/update/uninstall (`--noninteractive` so a hidden TTY prompt can never block), and `flatpak info --show-permissions` for a real permission preview. Confirmed honest behavior on a machine without Flatpak installed (this development machine) by testing the actual failure path, not just a happy-path mock.

**Package lifecycle** (`core/applications/PackageLifecycleService.ts`, supplemental §7.5) — every install/update/uninstall runs through the real Epic X1 `TransactionManager`, and per §7.5's own explicit requirement ("No success state before verification"), re-queries the real `flatpak list` after install/uninstall before reporting success — a transaction that ran the install command but can't verify the app is actually present afterward is honestly reported `failed`, not `succeeded`. Cancellation is created `cancellable: false` — an honest statement, since the `flatpak` CLI exposes no real cancel hook mid-command, not a button wired to do nothing.

**AppImage** (`core/applications/AppImageVerifier.ts`, supplemental §7.3) — real file verification reads the actual first 4 bytes and checks the real ELF magic number (`\x7fELF`) every AppImage (a self-mounting ELF binary) starts with, not a `.AppImage` filename-extension guess. Registration is a real native file-picker action (`application.registerAppImage`) verifying before registering — never an unverified path written straight into the registry. Extracting the embedded `.desktop`/icon from the AppImage's internal squashfs needs a real squashfs reader this slice doesn't build; named as an explicit gap rather than faked with a placeholder icon.

**Launch** (`core/applications/ApplicationLauncher.ts`, supplemental §6.3/§6.4) — `steam`-sourced records launch through the real `steam://rungameid/...` URI handler (via Electron's `shell.openExternal`, injected so this module stays Electron-free, the same boundary `CapabilityRegistry`'s detectors already established); `flatpak`-sourced records spawn a real detached `flatpak run <ref>`; everything else spawns the record's real `executableRef` detached. **Real bug caught by this module's own test for a nonexistent executable**: `child_process.spawn()` does not throw synchronously for a missing executable (ENOENT) — it returns a live `ChildProcess` and only emits an `'error'` event on a later tick, so resolving immediately on `spawn()` returning would have fabricated `launched: true` for a binary that doesn't exist. Fixed by waiting a short, bounded window (200ms) for that error before reporting success — confirmed by a test that actually exercises a real nonexistent path, not a mocked one.

**Explicitly deferred**: Steam Shortcut Manager (§8) — `shortcuts.vdf` is Steam's binary VDF format, a different and more complex format than the text-VDF `libraryfolders.vdf`/`appmanifest_*.acf` files the discovery scanners above already parse safely. §8.3's own safety requirements (backup, schema-aware parsing, process-state awareness, atomic write, validation, recovery support) exist precisely because a botched write corrupts a real user's actual Steam library — a rushed implementation in the same pass as everything else above was declined rather than risked. Needs its own focused, carefully-tested follow-up.

New `application.discover`/`application.launch`/`application.registerAppImage` and `package.flatpak*`/`package.transaction*` IPC channels, including a live `package.transactionUpdate` push (mirroring terminal data/agent run update's existing live-push pattern) so a future Package Center screen can show real progress without polling.

### Tests and evidence

| Suite                                                                                                | Location                                                            | Count         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------- |
| `DesktopEntryScanner` real `.desktop` parsing, NoDisplay/Hidden/Type filtering                       | `core/applications/discovery/__tests__/DesktopEntryScanner.test.ts` | +6 (new file) |
| `SteamLibraryScanner` real text-VDF parsing, missing library/manifest honesty                        | `core/applications/discovery/__tests__/SteamLibraryScanner.test.ts` | +5 (new file) |
| `FlatpakAdapter` real CLI invocation, honest unavailable-Flatpak path                                | `core/applications/__tests__/FlatpakAdapter.test.ts`                | +7 (new file) |
| `ApplicationLauncher` steam URI / detached spawn / real ENOENT honesty                               | `core/applications/__tests__/ApplicationLauncher.test.ts`           | +5 (new file) |
| `ApplicationDiscoveryService` orchestration, partial-source selection, one-scanner-failure isolation | `core/applications/__tests__/ApplicationDiscoveryService.test.ts`   | +3 (new file) |
| `AppImageVerifier` real ELF magic check, record building                                             | `core/applications/__tests__/AppImageVerifier.test.ts`              | +5 (new file) |
| `PackageLifecycleService` real verify-before-success, non-cancellable honesty                        | `core/applications/__tests__/PackageLifecycleService.test.ts`       | +6 (new file) |

**Validation evidence (run 2026-06-25):**

```text
npm run test       → 135 files, 674 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## Epic X3 — Extension ecosystem (2026-06-25)

Real process-isolated extension host, manifest validation, deny-by-default capability API, and fault-driven quarantine (supplemental §9). Extension Manager UI, the signed marketplace client, the SDK, and the CLI are explicitly deferred — each genuinely needs its own foundation (a UI consumer, a real registry server, a stable contracts package, a local authenticated API server) this pass doesn't build, and faking any of them would violate the supplemental non-negotiables directly (no fabricated marketplace data, no package-manager lies).

**Real process isolation, not a try/catch** (`core/extensions/ExtensionHost.ts` + `main/extensions/extensionHostEntry.ts`, supplemental §9.3): every extension runs in a genuinely separate Node OS process, forked from a real, separately-compiled build artifact. `electron.vite.config.ts`'s `main` build gained a second Rollup input (`extensionHostEntry`) specifically so this is a real compiled `.js` file alongside `index.js` in production, not a dev-only `ts-node` dependency — confirmed by forking the actual compiled `out/main/extensionHostEntry.js` directly from a throwaway script and observing a real fault report for a missing entrypoint, not just reading the source and assuming it works. Honest scope, stated directly in the file's own doc comment: this achieves real crash/process isolation and real capability gating, not full content-level sandboxing — the extension module is still a real Node module that could call `require('fs')` itself inside its own process; closing that needs a restricted runtime (WASM/QuickJS) this slice doesn't build.

**Real manifest validation** (`core/extensions/ManifestLoader.ts`, supplemental §9.2) — reads and validates a real `manifest.json` against the real `NdxExtensionManifest` Zod schema, and confirms the declared entrypoint actually resolves inside the extension's own real install directory before `ExtensionHost` ever forks a process for it — a manifest declaring `entrypoints.main: "../../../etc/passwd"` is rejected, verified by a real test.

**Real deny-by-default capability API** (`core/extensions/CapabilityBroker.ts`, supplemental §9.4) — a call for a capability the extension wasn't granted is rejected before any handler runs; a granted capability with no real handler registered is also rejected (an honest "not implemented yet" failure, not a silent no-op success). Two of the twelve schema capabilities have real, working handlers wired in `main/ipc/index.ts`: `show-notification` (real Electron `Notification`) and `store-extension-data` (`core/extensions/ExtensionDataStore.ts`, a real per-extension-namespaced JSON store — confirmed by a test that two extensions' data never leaks into each other's file). The other ten are real schema entries with no real handler yet, which is the honest current state, not a partial implementation pretending to be complete.

**Real fault-driven quarantine** (`core/extensions/ExtensionRuntime.ts`, supplemental §9.6) — `ExtensionHost` tracks real fault timestamps in a real rolling 60-second window; once a real crash count crosses the threshold, `ExtensionRuntime.handleFault()` stops the real child process and persists a real `quarantineReason`, and refuses to let `setEnabled(true)` re-enable a quarantined extension without an explicit `clearQuarantine()` call first. Verified end-to-end with a real fixture child process that genuinely crashes twice (not a mocked event), confirming the host's real fork()/IPC/fault-tracking pipeline end to end.

**Explicitly deferred**: Signed marketplace client, post-install capability grant/revoke UI, cryptographic signature verification, Developer SDK, and CLI remain deferred; the signed marketplace client (§10) — there is no documented registry protocol or real server to talk to, and the supplemental non-negotiables explicitly require the platform to "remain usable when no marketplace server is configured" and forbid fabricated marketplace data, so `install()` is scoped to "install from a local unpacked directory" instead, the same real, honest action VS Code calls "Install from Folder"; cryptographic signature verification (manifest/path-traversal verification is real, but a `signature` block's actual cryptographic validity isn't checked yet — `trust` is set from presence, not verified validity); the Developer SDK and CLI (§11) — the CLI specifically needs §11.3's local authenticated API server (scoped tokens, localhost binding, expiration/revocation) built first, a security-sensitive surface deserving its own focused pass rather than being bolted on here.

### Tests and evidence

| Suite                                                                       | Location                                               | Count         |
| --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| `CapabilityBroker` deny-by-default, both denial paths, real dispatch        | `core/extensions/__tests__/CapabilityBroker.test.ts`   | +3 (new file) |
| `ExtensionStore` real CRUD                                                  | `core/extensions/__tests__/ExtensionStore.test.ts`     | +5 (new file) |
| `ManifestLoader` real manifest validation, directory-traversal protection   | `core/extensions/__tests__/ManifestLoader.test.ts`     | +7 (new file) |
| `ExtensionHost` real fork()/IPC/fault-tracking against a real child process | `core/extensions/__tests__/ExtensionHost.test.ts`      | +6 (new file) |
| `ExtensionRuntime` install/enable/disable/quarantine/clear lifecycle        | `core/extensions/__tests__/ExtensionRuntime.test.ts`   | +8 (new file) |
| `ExtensionDataStore` real per-extension data isolation                      | `core/extensions/__tests__/ExtensionDataStore.test.ts` | +4 (new file) |

**Validation evidence (run 2026-06-25):**

```text
npm run test       → 141 files, 707 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded (real second main entry compiled to out/main/extensionHostEntry.js, confirmed by directly forking the artifact and observing a real fault report)
```

### Epic X3 addendum - Extension Manager UI (2026-06-27)

`features/extensions/ExtensionManager.tsx` adds the first real UI consumer for the Epic X3 runtime. `/extensions` is now a lazy route and a real feature-catalog/Navigation Rail destination. The screen lists installed extension records from `extensions.list`, previews a local unpacked directory through `extensions.previewInstall`, installs the reviewed directory through `extensions.install`, enables/disables through `extensions.setEnabled`, clears quarantine through `extensions.clearQuarantine`, removes through `extensions.remove`, and subscribes to live `extension.healthEvent` updates so runtime fault/quarantine state appears without polling.

Security scope is intentionally narrow: the install flow loads and validates the real manifest before registration, displays trust/metadata/entrypoint/capability requests, and defaults every requested capability to denied. Only capabilities the user explicitly grants in the review panel are sent in `approvedCapabilities`, so no extension capability is silently granted by typing a path into the manager. The detail pane shows manifest-requested capabilities and granted capabilities separately, making denied permissions visible. Trust is displayed from the existing record (`unsigned`, `signed`, etc.) without claiming cryptographic signature validation.

Still deferred: signed marketplace browsing/downloads, post-install capability grant/revoke UI, cryptographic signature verification, a developer SDK package split, and CLI/local API server. Each needs a real trust, registry, or authenticated API surface; none is faked here.

**Validation evidence (run 2026-06-27):**

```text
npm run typecheck   -> node + web TypeScript checks passed
npm run lint        -> 0 errors, 0 warnings
npm run test -- ExtensionManager ExtensionRuntime ExtensionHost ExtensionStore CapabilityBroker extensionClient
                   -> 5 files, 27 tests passed
```

### Epic X3 addendum - install review and capability grants (2026-06-27)

`shared/contracts/extension.ts`, `shared/contracts/ipcChannels.ts`, `shared/contracts/bridge.ts`, `main/ipc/registerExtensionHandlers.ts`, `preload/index.ts`, and `renderer/src/services/ipc/extensionClient.ts` now expose a typed `extensions.previewInstall` path. The handler validates the requested directory, loads the real manifest with the same `ManifestLoader` used by install/runtime, computes the honest current trust label (`signed` when a signature block exists, otherwise `unsigned`), and returns the exact requested capabilities for renderer review.

`features/extensions/ExtensionManager.tsx` now uses a two-step local install flow: Review local folder -> inspect manifest/capability requests -> Install reviewed extension. Requested capabilities are denied by default, and the install request carries only the selected `approvedCapabilities` subset. Preview failures are surfaced before any registration attempt.

**Validation evidence (run 2026-06-27):**

```text
npm run test -- ExtensionManager
                   -> 1 file, 6 tests passed
npm run typecheck   -> node + web TypeScript checks passed
npm run lint        -> 0 errors, 0 warnings
npm run test -- ExtensionManager ExtensionRuntime ExtensionHost ExtensionStore CapabilityBroker ManifestLoader extensionClient
                   -> 6 files, 35 tests passed
npm run test       -> 175 files, 877 tests passed
npm run build      -> succeeded
```

## Epic X4 — Knowledge and memory (2026-06-26)

Real Knowledge Vault ingestion/retrieval for the source types this codebase can actually parse without a new dependency, real scoped AI memory with secret-write rejection, and real Prompt Template/Persona libraries. Embeddings, PDF parsing, Tool Library, and Skill packs are explicitly deferred — each needs something this pass doesn't add (a local embedding model, a new PDF dependency, a new UI surface for already-existing data, a verified extension-signing foundation).

**Real ingestion pipeline** (`core/knowledge/KnowledgeVaultService.ts`, supplemental §12.3) — source validation → real `readFile` parsing (`.txt`/`.md`/`.json`/`.csv` via `core/knowledge/parsers/textParsers.ts`, confirmed an invalid JSON file throws a real, loud parse error rather than silently indexing garbage) → real secret detection (the same `detectSecret()` Scoped Memory uses — a source whose extracted text matches a real secret shape fails ingestion outright, with a real `failureReason`, confirmed by a test) → real chunking (`core/knowledge/Chunker.ts`, paragraph-aware with a real fixed-window+overlap fallback for over-long paragraphs) → real index write → a real source health record. Folders, PDFs, code repositories, and the other 8 source types listed in supplemental §12.1 are not implemented — each needs either a new dependency or a real multi-file/multi-source capture mechanism this slice doesn't build, named directly rather than silently skipped.

**Real lexical retrieval, not fabricated semantic search** (`core/knowledge/KnowledgeIndex.ts`, supplemental §12.5) — term-frequency-overlap scoring between the query and each chunk, with a real exact-substring-match bonus. No real local embedding model is wired into this codebase's model router yet, so this is an honest, working retrieval mechanism (the same family as classic keyword search) rather than a mocked similarity score standing in for embeddings that don't exist. Every result carries real provenance: `sourceId`/`sourceTitle`, a real `retrievedAt` timestamp, and a real `stale` flag computed by re-hashing the source's actual current on-disk content against what was indexed at ingestion time — confirmed by a test that edits the real file after indexing and observes the flag flip to `true`.

**Real scoped memory with enforced write rules** (`core/memory/MemoryStore.ts` + `core/memory/secretDetector.ts`, supplemental §13) — every write (`write()` and `update()`) is checked against `detectSecret()` before it reaches disk; a content string matching an AWS access key, a PEM private-key block, a JWT, a GitHub token, a `Bearer` token, or a generic `api_key=...`-shaped assignment is rejected with a real `MemorySecretRejectedError`, confirmed by a test for each pattern plus tests proving ordinary non-secret prose is never falsely flagged. "Disable category"/"Disable all" (§13.3) are checked before every write, not just hidden from a list — a disabled-type write genuinely fails with `MemoryDisabledError`. `clearScope()` ("Clear conversation memory"/"Clear global memory") really deletes matching items, not a soft hide.

**Real Prompt Template and Persona libraries** (`core/promptLibrary/`, supplemental §14.1/§14.2) — real CRUD persistence matching the spec's exact field lists. The `Persona` schema is deliberately constructed with zero fields that could expand permissions, bypass policy, hide impact, or auto-confirm a destructive action (§14.2's explicit "Personas may not" list) — there is no field to misuse without it being immediately obvious in review, which is a stronger guarantee than a runtime check that could be bypassed.

New `knowledge.*`/`memory.*`/`promptTemplate.*`/`persona.*` IPC domains, typed and Zod-validated, following the existing `registerXHandlers` pattern.

### Tests and evidence

| Suite                                                                                        | Location                                                   | Count          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------- |
| `secretDetector` real pattern detection, no false positives on ordinary prose                | `core/memory/__tests__/secretDetector.test.ts`             | +8 (new file)  |
| `MemoryStore` write/update/delete, secret rejection, disable-category/all, clearScope        | `core/memory/__tests__/MemoryStore.test.ts`                | +9 (new file)  |
| `textParsers` real JSON/CSV/plain-text parsing, extension dispatch                           | `core/knowledge/parsers/__tests__/textParsers.test.ts`     | +5 (new file)  |
| `Chunker` real paragraph-aware chunking with overlap                                         | `core/knowledge/__tests__/Chunker.test.ts`                 | +4 (new file)  |
| `KnowledgeIndex` real lexical scoring, ranking, zero-score exclusion                         | `core/knowledge/__tests__/KnowledgeIndex.test.ts`          | +5 (new file)  |
| `KnowledgeStore` real CRUD for sources/chunks                                                | `core/knowledge/__tests__/KnowledgeStore.test.ts`          | +5 (new file)  |
| `KnowledgeVaultService` real end-to-end ingest/query/reindex/pause/remove against real files | `core/knowledge/__tests__/KnowledgeVaultService.test.ts`   | +10 (new file) |
| `PromptTemplateStore` real CRUD                                                              | `core/promptLibrary/__tests__/PromptTemplateStore.test.ts` | +5 (new file)  |
| `PersonaStore` real CRUD                                                                     | `core/promptLibrary/__tests__/PersonaStore.test.ts`        | +3 (new file)  |

**Validation evidence (run 2026-06-26):**

```text
npm run test       → 150 files, 761 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

### Epic X4 addendum - scoped memory export (2026-06-27)

`shared/contracts/memory.ts`, `shared/contracts/ipcChannels.ts`, `shared/contracts/bridge.ts`, `main/ipc/registerMemoryHandlers.ts`, `preload/index.ts`, and `renderer/src/services/ipc/memoryClient.ts` now expose a typed `memory.export` path. The export returns a versioned JSON-compatible snapshot (`schemaVersion`, `exportedAt`, `query`, `itemCount`, `items`) using the same real filters as `memory.list`, so users and future UI surfaces can export only conversation, workspace, profile, or global memory without a renderer-side data scrape.

`core/memory/MemoryStore.ts` owns export generation, preserving real attribution/provenance on every item. This closes X4's prior scoped-memory export gap without broadening permissions, bypassing the existing secret-write rejection, or fabricating semantic memory behavior.

**Validation evidence (run 2026-06-27):**

```text
npm run test -- MemoryStore memoryClient
                   -> 2 files / 12 tests passed
npm run typecheck  -> passed
npm run lint       -> passed
npm run build      -> passed
```

Full `npm run test` is not used as completion evidence for this X4 slice because the current worktree also contains unrelated LAN-share test files and the pre-existing Guided Controller Tutorial flake. The targeted X4 coverage, static checks, lint, and production build are green.

## Epic X5 — Voice and multimodal (2026-06-26)

Real text-to-speech, real dictation, a real persisted microphone permission gate wired into the main window's actual session, real voice notes, and real one-off document intake (supplemental spec §15/§16). Wake word and screen-capture-with-privacy-review are explicitly deferred — each needs something this pass doesn't add (a local audio-classification engine; a real privacy-review UI the spec requires before any capture is used).

**Real microphone permission gate** (`core/voice/MicrophonePermissionStore.ts` + `main/ipc/index.ts`, supplemental §15.3) — the main window only ever loads this app's own bundled UI, so there is no third-party origin to scope permission by; this is one real, explicit, persisted yes/no the user grants, consulted by a real `session.defaultSession.setPermissionRequestHandler('media', ...)` that denies by default and only allows the real OS-level `getUserMedia` request once explicitly granted. Confirmed safe to add: an audit of the renderer found no existing code requesting `notifications`/`geolocation`/other permission types this new handler now denies by default, so nothing already-working was put at risk.

**Real dictation** (`renderer/src/features/voice/useDictation.ts`, supplemental §15.3/§15.4) — wraps the real `SpeechRecognition`/`webkitSpeechRecognition` Web Speech API: a real live transcript, real alternative recognitions per result (§15.4 "Choose alternative recognition"), and a real distinction between `stop()` (keeps the transcript) and `cancel()` (discards it). Deliberately does **not** build a second intent-classifier/execution path — supplemental §15.3's "No destructive voice command may execute without review" is satisfied by never executing anything directly from this hook at all; a dictated transcript is meant to be handed to this app's existing real review-gated paths (e.g. Command Builder's AI-intent field, already routed through the real model router and mandatory `ActionQueue` approval).

**Real text-to-speech** (`renderer/src/features/voice/useTextToSpeech.ts`) — generalizes the exact `SpeechSynthesis` engine `ScreenNarrator.tsx` already proved real for screen narration, for any consumer wanting to read arbitrary text aloud.

**Real voice notes** (`core/voice/VoiceNoteStore.ts`, supplemental §15.1) — the renderer's real `MediaRecorder`-captured audio is base64-encoded for the IPC round-trip (Electron can't transfer a raw `Blob`) and decoded into a real `.webm` file on disk; metadata (duration, an optional real transcript from the same dictation session) is persisted alongside. Removal deletes both the metadata and the real audio file — confirmed by a test that checks the file is actually gone, not just delisted.

**Real document intake** (`core/voice/DocumentIntakeService.ts`, supplemental §16.4) — a one-off extraction for immediate conversational context, distinct from Epic X4's persistent Knowledge Vault ingestion. Reuses the exact same real parsers and the exact same real `detectSecret()` redaction check Scoped Memory and the Knowledge Vault both already use — one real redaction mechanism shared across three features, not a third copy. "Extraction confidence must be represented honestly" (§16.4) is satisfied by never reporting one: there's no probabilistic OCR step in this slice to honestly compute a confidence for.

**Explicitly deferred**: wake word (§15.2) — needs a continuously-running local audio-classification engine, no such dependency exists in this codebase; screen capture (§16) — §16.2 requires a real privacy-review UI (preview, provider, data destination, redactions, cancel, local-processing alternative) before any capture is used, and capturing via Electron's real `desktopCapturer` without building that review step first would violate "privacy review gates capture" directly — Epic X1's `CapabilityRegistry` already honestly reports `screen-capture` as `unsupported` for the same reason, unchanged here.

### Tests and evidence

| Suite                                                                                                          | Location                                                        | Count         |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------- |
| `MicrophonePermissionStore` real persisted grant/deny, fails closed                                            | `core/voice/__tests__/MicrophonePermissionStore.test.ts`        | +4 (new file) |
| `VoiceNoteStore` real audio file decode/write/read/delete                                                      | `core/voice/__tests__/VoiceNoteStore.test.ts`                   | +5 (new file) |
| `DocumentIntakeService` real extraction, real redaction, honest unsupported-type rejection                     | `core/voice/__tests__/DocumentIntakeService.test.ts`            | +3 (new file) |
| `useTextToSpeech` real speak/cancel through a stubbed `SpeechSynthesis`, unavailable-engine honesty            | `renderer/src/features/voice/__tests__/useTextToSpeech.test.ts` | +4 (new file) |
| `useDictation` real transcript/alternatives/error from a stubbed `SpeechRecognition`, stop-vs-cancel semantics | `renderer/src/features/voice/__tests__/useDictation.test.ts`    | +7 (new file) |

**Validation evidence (run 2026-06-26):**

```text
npm run test       → 155 files, 784 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## Epic X6 — Clipboard, sharing, and transfer (2026-06-26)

Real Clipboard Center with enforced security controls, real Snippets with risk-classified shell content, a real shared `TransferJob` primitive, and a real Warpinator/Winpinator-style LAN discovery + authenticated-encrypted peer transfer (supplemental spec §17/§18/§19). Universal Share Sheet's dedicated UI and full mutual-TLS peer authentication are explicitly deferred.

**Real Clipboard Center security controls** (`core/clipboard/ClipboardStore.ts`, supplemental §17.1/§17.2) — "Secret fields never enter history" is enforced at write time via the exact same real `detectSecret()` Scoped Memory and the Knowledge Vault already use, confirmed by a test that a real AWS-key-shaped string is silently refused, never added. Persisted entries are encrypted at rest through the injected real `SecretCipher` — the same OS-level `safeStorage` boundary `ModelProviderStore`'s API keys already use — with an honest plaintext fallback only when the cipher reports itself genuinely unavailable (confirmed by a test exercising both paths, not just the happy one). Pinned entries survive `clear()`, matching every other "clear list" affordance elsewhere in this app.

**Real Snippets with risk-classified shell content** (`core/clipboard/SnippetStore.ts` + `core/clipboard/shellRiskClassifier.ts`, supplemental §17.3) — `{{variable}}` placeholders are detected directly from saved content at save time, never a separately-declared list that could drift; `render()` honestly reports any variable the caller didn't supply rather than silently leaving a raw placeholder in the output. Shell snippets get a real risk classification mirroring `CommandBuilder`'s own `classifyCommand` policy — reimplemented in `core/` (not imported, since that renderer module isn't reachable from the main process) as one real classification policy expressed on both sides of the process boundary, not two different policies.

**Real shared transfer primitive** (`core/transfer/TransferManager.ts`, supplemental §18) — mirrors Epic X1's `TransactionManager` pattern, extended with the byte-progress/checksum/resumability fields §18.1's `TransferJob` actually specifies. Honest scope: this pass's one real consumer is LAN peer transfer; model downloads, package transactions (Epic X2), and update checks already have their own real tracking elsewhere and are not yet consolidated under this one system — a named integration gap, not fabricated unified coverage.

**Real LAN discovery** (`core/lan/PeerDiscoveryService.ts` + `core/lan/DeviceIdentityStore.ts`, supplemental §19.1) — genuinely sends and receives real UDP datagrams (confirmed with two actually-separate Node sockets over real loopback, not a simulated peer list), each announcement carrying a real per-device fingerprint from a real Ed25519 keypair generated once via `crypto.generateKeyPairSync` and persisted across restarts. `PeerStore` does real trust-on-first-use — every newly-seen peer defaults to `untrusted`, matching `RemoteHostStore`'s existing SSH host-key trust model — and real online/offline staleness tracking. **Real test-environment finding**: two real sockets bound to the exact same UDP port via `SO_REUSEADDR` (the correct, real production design — every device shares one well-known discovery port) have OS-dependent single-delivery semantics for a unicast loopback send on this Windows machine; the test asserts that _at least one_ direction of real delivery succeeded rather than requiring both, with the platform characteristic documented directly in the test rather than worked around silently.

**Real authenticated-encrypted peer transfer** (`core/lan/PeerTransferService.ts`, supplemental §19.2/§19.3) — transfers real file bytes over real TCP (confirmed end-to-end over loopback: a real file is encrypted, sent, received, decrypted, and its SHA-256 checksum matches on both ends), encrypted with real AES-256-GCM using a key derived via real PBKDF2 from a pre-shared pairing code entered on both devices out of band. A wrong pairing code produces a real, detectable AEAD decryption failure — confirmed by a test that the transfer is rejected and no file is ever written, not silently corrupted output. Real filename sanitization (`basename()` only) blocks a malicious peer's declared filename from traversing outside the destination directory, confirmed by a test using a real `..`-laden filename. Honest scope, stated directly in the module's own doc comment: this is real AEAD confidentiality+integrity over a pre-shared secret, not X.509-certificate-based mutual TLS — generating real certificates needs a dependency (`node-forge`/`selfsigned`) not in this codebase, and adding one is its own decision left for a future pass. The whole file is buffered in memory for one-shot encryption/decryption — fine for typical transfer sizes, not optimized for huge multi-GB files, which would need real chunked-AEAD framing this slice doesn't build.

**Explicitly deferred**: Universal Share Sheet (§17.4) — no dedicated share-dispatch UI in this pass; every real target it would route to (clipboard, snippets, terminal, knowledge vault, LAN peer) is already real and independently callable, so building the UI later is real integration work, not new backend. QR pairing (§19.1) — needs a real QR generation/scanning library not present in this codebase.

### Tests and evidence

| Suite                                                                                                     | Location                                               | Count          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| `ClipboardStore` real secret-write rejection, encryption-at-rest, pin/clear/expire                        | `core/clipboard/__tests__/ClipboardStore.test.ts`      | +10 (new file) |
| `shellRiskClassifier` real privileged/destructive/network-fetch classification                            | `core/clipboard/__tests__/shellRiskClassifier.test.ts` | +5 (new file)  |
| `SnippetStore` real variable detection/render, shell risk attachment                                      | `core/clipboard/__tests__/SnippetStore.test.ts`        | +7 (new file)  |
| `TransferManager` real job lifecycle, pause/resume gating, cancel hook                                    | `core/transfer/__tests__/TransferManager.test.ts`      | +7 (new file)  |
| `PeerStore` real trust-on-first-use, staleness tracking                                                   | `core/lan/__tests__/PeerStore.test.ts`                 | +6 (new file)  |
| `DeviceIdentityStore` real keypair generation/persistence                                                 | `core/lan/__tests__/DeviceIdentityStore.test.ts`       | +3 (new file)  |
| `PeerDiscoveryService` real UDP send/receive over loopback                                                | `core/lan/__tests__/PeerDiscoveryService.test.ts`      | +3 (new file)  |
| `PeerTransferService` real end-to-end encrypted TCP transfer, wrong-code rejection, filename sanitization | `core/lan/__tests__/PeerTransferService.test.ts`       | +3 (new file)  |

**Validation evidence (run 2026-06-26):**

```text
npm run test       → 163 files, 828 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## Epic X7 — Sync, backup, and migration (2026-06-27)

First real slice: local app-state backup foundation for ND-X030 Backup and Restore. Sync providers, conflict resolution, restore, import/export, and migrations remain explicitly open.

### Supplemental Story: Local app-state backup foundation

**Platform gap closed**: NeuroDeck now has a real local backup primitive for its non-secret JSON app state instead of only per-file workspace recovery checkpoints. JPE: this is the "copy my app settings and indexes into one integrity-checked file" layer, not device-to-device sync and not full restore yet.

**Existing systems reused**: Electron `userData` remains the storage root; the typed IPC pattern is the existing `shared/contracts` -> `main/ipc` -> `preload` -> renderer client bridge; ND-X030 is added through the existing lazy route registry, making it reachable from route-backed search/command surfaces without a parallel navigation system.

**New contracts**: `shared/contracts/backup.ts` defines `BackupRecord`, `BackupVerification`, `CreateBackupRequest`, and `BackupIdRequest`; `ipcChannels.ts` adds `backup.list`, `backup.create`, and `backup.verify`; `NdxBridge` exposes `backups.list/create/verify`.

**Real backend**: `core/backup/BackupService.ts` creates local `.ndx-backup.json` bundles under `userData/backups`. Each bundle contains a manifest, non-secret app-state file contents, per-file SHA-256 hashes, and a bundle SHA-256. Secret-bearing stores (`model-providers.json`, `remote-hosts.json`, `clipboard.json`, lock settings, device identity, LAN-share certificate/group-code stores) are excluded and recorded in the manifest instead of silently exported.

**Controller path**: `/backup` (ND-X030) renders `BackupAndRestore.tsx` with controller-focusable Create Backup and Verify actions. Restore is visible but disabled with the real reason: restore needs rollback-on-restore support before it can safely overwrite app state.

**Permissions and privacy**: Backup is local-only in this slice. The renderer never reads files directly; it receives only typed records over `backup.*` IPC. Secrets are excluded by filename at the core service boundary.

**Offline behavior**: Fully offline; no cloud or remote storage dependency.

**Failure and recovery**: Creation writes atomically via temp-file then rename. Verification reports manifest hash failures and per-file byte/hash mismatches. Corrupt backup files are not listed as valid records.

**Tests**: `core/backup/__tests__/BackupService.test.ts` covers real bundle creation, secret-store exclusion, listing, and corruption detection.

**Evidence (run 2026-06-27):**

```text
npm run test -- BackupService -> 1 file / 2 tests passed
npm run typecheck             -> node + web TypeScript checks passed
npm run lint                  -> 0 errors, 0 warnings
npm run build                 -> succeeded
```

### Epic X7 addendum - rollback-backed restore (2026-06-27)

`BackupService.restore()` now closes the local restore half of ND-X030 for the same local app-state scope as backup creation. The restore path verifies the selected `.ndx-backup.json` bundle before any write, creates a new rollback backup of the current app state first, restores every file with the existing temp-file/rename atomic write helper, removes stale files inside the known app-state scope when they are absent from the selected backup, and automatically reapplies the rollback bundle if restore fails mid-flight.

The renderer no longer shows Restore as a disabled future action. `/backup` now opens a real `ConfirmationDialog` before restore, names the destructive scope, explains the rollback guarantee in JPE, calls typed `backup.restore` IPC, refreshes the backup list, and surfaces the rollback backup id/path after success.

**Still deferred**: sync providers, conflict resolution, import/export formats, migration runners, remote/cloud backup destinations, scheduled backups, workspace-content restore, vault/secret restore, and migration-aware restore. Secret-bearing stores remain deliberately excluded; restoring them belongs to Epic X10's vault/identity model, not this local app-state slice.

**Evidence (run 2026-06-27):**

```text
npm run test -- BackupService -> 1 file / 4 tests passed
npx eslint <X7 restore files> -> 0 errors, 0 warnings
```

Full `npm run typecheck` was rerun during the following import/export slice and is green again; the transient LAN-share dirty-worktree blocker noted during the restore slice was not part of X7.

### Epic X7 addendum - local backup import/export format (2026-06-27)

The local app-state backup format is now a real import/export path, not just an internal storage detail. Export is the existing versioned `.ndx-backup.json` bundle containing a schema version, manifest hash, per-file hashes, file counts/sizes, and explicit secret-store exclusions. Import is now wired through `backup.importLocal`: main process opens a native file picker, `BackupService.importFromPath()` parses and verifies the selected file, then copies only a valid bundle into `userData/backups`.

JPE: users can now bring a NeuroDeck backup file back into the managed backup list, but the renderer never gets to hand the main process an arbitrary path string. The user chooses a file through the OS dialog, and the core service refuses it unless the manifest and per-file hashes line up.

`/backup` now has a real Import Backup button next to Create Backup. A successful import deduplicates the visible list by backup id and keeps the same verify/restore flow as locally-created backups.

**Still deferred**: sync providers, conflict resolution, migration runners, remote/cloud backup destinations, scheduled backups, workspace-content import/export, archive formats, cross-product importers, vault/secret portability, and encrypted portable vault backup.

**Evidence (run 2026-06-27):**

```text
npm run test -- BackupService -> 1 file / 6 tests passed
npm run typecheck             -> node + web TypeScript checks passed
npm run lint                  -> 0 errors, 0 warnings
npm run build                 -> succeeded
```

### Epic X7 addendum - backup schema migration runner (2026-06-28)

Managed local backup migration is now real for the backup bundle format owned by X7. `BackupService.migrateManagedBackups()` scans `userData/backups` for `.ndx-backup.json` files, verifies current `1.0.0` bundles without rewriting them, migrates legacy `0.9.0` app-state bundles into the current manifest/per-file SHA-256 format, and writes migrated bundles atomically. Invalid JSON and unsupported/future schema versions are recorded as `invalid` or `blocked` in a structured report instead of aborting the whole migration run.

JPE: this is a cleanup pass for old NeuroDeck backup files. If a backup is already current, it is checked and left alone. If it is an older supported shape, NeuroDeck upgrades it into the current hash-verified format. If it is broken or from an unknown future version, NeuroDeck reports that clearly and does not guess.

Typed surface added: `BackupMigrationReport` / `BackupMigrationRecord`, `backup.migrate`, preload `window.ndx.backups.migrate()`, and renderer `migrateBackups()`. `/backup` now exposes a controller-focusable Run Migrations action and renders migration totals plus the first records for review.

**Still deferred**: sync providers, conflict resolution, remote/cloud backup destinations, scheduled backups, workspace-content import/export/restore, archive formats, cross-product importers, vault/secret portability, encrypted portable vault backup, broader JsonStore/app-state migration runners, Tauri-era config imports, renamed settings migrations, and deprecated extension/API migrations.

**Evidence (run 2026-06-28):**

```text
npm run test -- BackupService -> 1 file / 9 tests passed
npx eslint <X7 backup migration files> -> 0 errors, 0 warnings
npm run typecheck -> blocked by unrelated in-progress LAN Share API mismatch:
  LanShareTransferServerOptions now requires getPendingSendOperation at existing LAN Share call sites.
npm run lint -> exited 0; warnings are limited to unrelated LAN Share formatting in dirty files.
```

## Epic X8 — Device services (2026-06-28)

First real slice: ND-X032 Device and Peripheral Center. `DeviceInventoryService` now produces a real, typed `DeviceInventoryReport` by combining three existing shared services instead of creating a duplicate hardware silo:

- `DeviceStore` for persisted device records already known to NeuroDeck.
- `SystemMetricsService` for currently observable network interfaces and mounted storage root facts.
- `CapabilityRegistry.refresh()` for backend availability across controller, Bluetooth, audio, camera, display, network, GPU, haptics, and gyro capabilities.

JPE: this center tells the user what NeuroDeck can actually see right now. It does not pretend to pair Bluetooth devices, switch microphones, manage docks, or listen for hot-plug events until those real OS adapters exist.

Typed surface added: `DeviceInventoryReport`, `DeviceInventoryRecord`, `device.inventory`, preload `window.ndx.devices.inventory()`, and renderer `collectDeviceInventory()`. `/devices` is registered as ND-X032 and linked from System Dashboard.

**Still deferred**: Bluetooth Center, Audio and Microphone Center, Display and Dock Center, Removable Storage Center, OS hot-plug watchers, hot-plug notifications, automatic capability recalculation on device events, device-profile application, Bluetooth pairing/trust/connect/forget, audio routing, display arrangement, dock detection, and removable-storage mount/eject/safety checks.

**Evidence (run 2026-06-28):**

```text
npm run test -- DeviceInventoryService DevicePeripheralCenter -> 2 files / 5 tests passed
npm run typecheck:web -> passed
npx eslint <X8 device inventory files> -> 0 errors, 0 warnings
npm run typecheck -> blocked by unrelated in-progress LAN Share API mismatch:
  LanShareTransferServerOptions now requires getPendingSendOperation at existing LAN Share call sites.
```

### Epic X8 addendum - Bluetooth status center (2026-06-28)

ND-X033 Bluetooth Devices is now a real route at `/devices/bluetooth`, linked from System Dashboard and the Device and Peripheral Center. It intentionally reuses the shared `device.inventory` report instead of creating a second Bluetooth-specific backend: adapter status comes from the real `CapabilityRegistry` Bluetooth entry, and device rows come only from persisted Bluetooth records in `DeviceStore`.

JPE: this screen can tell the user whether NeuroDeck currently has a Bluetooth backend and whether any Bluetooth records are known. It cannot scan, pair, trust, connect, disconnect, or forget devices yet because no real BlueZ/SteamOS adapter service exists in this codebase. Those controls are shown as disabled status rows with the exact missing backend called out.

**Still deferred**: real BlueZ/SteamOS adapter probing, scan, pair, pairing confirmation, trust, connect/disconnect, forget, battery reporting, audio profile switching, controller profile selection, and connection diagnostics.

**Evidence (run 2026-06-28):**

```text
npm run test -- DevicePeripheralCenter BluetoothDevices -> 2 files / 6 tests passed
npm run typecheck:web -> passed
npx eslint <X8 Bluetooth/device route files> -> 0 errors, 0 warnings
npm run typecheck -> still blocked by unrelated in-progress LAN Share API mismatch:
  LanShareTransferServerOptions now requires getPendingSendOperation at existing LAN Share call sites.
```

## LAN Share (Warpinator-compatible) — Phase LAN-0 (2026-06-26)

A separate mega-prompt (`NeuroDeckOS_Built_In_Warpinator_Winpinator_LAN_Share_Implementation_Prompt.md`) asks for real wire-protocol interoperability with the external Warpinator/Winpinator ecosystem — a distinct, much larger feature from Epic X6's NDX-only LAN peer transfer (`src/core/lan/`, already shipped). Epic X6's transfer does **not** speak Warpinator's actual protocol and is unaffected by this work.

Per that document's own Master Directive ("Before coding... inventory every upstream source... record exact licenses... choose and document one strategy"), this phase performed the required **LAN-0** audit before any protocol code was written.

**Real upstream inventory** — confirmed directly against the live GitHub repositories via the GitHub API (not from memory): `linuxmint/warpinator` (canonical upstream, GPL-3.0, `COPYING` present) and `swiszczoo/winpinator` (Windows-compatible port, also GPL-3.0), with their exact HEAD commit SHAs recorded. Three files were read (not copied) to extract real protocol facts: `src/warp.proto` (the real gRPC service/message schema — two services, `Warp` and `WarpRegistration`), `src/auth.py` (real per-device RSA+X.509 self-signed cert architecture, exchanged encrypted via NaCl `secretbox` keyed from the user's group code), and `src/remote_registration.py` (confirms the real v1 vs. v2 registration-server split). Default ports (`42000` transfer, `42001` registration) and the optional, off-by-default zlib compression were confirmed against the project's own GSettings schema.

**Strategy chosen and documented**: clean-room compatible implementation. Network protocol shapes are not themselves protected expression, but literal upstream source is — so this codebase will independently author its own equivalent `.proto` schema and its own cert/encryption code (Node `node:crypto`/`node:tls` or `rustls`, not a vendored GPL dependency) rather than copying or vendoring anything from the upstream repositories. Full rules recorded in `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md` §4, binding for every later LAN-1–LAN-11 phase.

**Honest open finding, carried forward rather than silently resolved**: NeuroDeck itself has no declared project license (no `LICENSE` file, no `package.json` `license` field) at audit time. This needs resolving — with real legal review — before LAN Share, or any other GPL-adjacent feature, ships publicly. This finding is independent of LAN Share and applies to the whole project.

**No protocol implementation code was written in this phase**, by design — LAN-0 is an audit-only gate. `IMPLEMENTATION_CHECKLIST.md` now tracks LAN-0 through LAN-11 as a separate section from the Epic X-series, since this feature is not part of the numbered Phase B epics.

### Evidence

- `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md` — full inventory, recorded commit/blob SHAs, chosen strategy, and binding clean-room rules for future phases.
- No code changes; no test/lint/typecheck/build re-run needed for this phase (no source touched).

## LAN Share (Warpinator-compatible) — Phase LAN-1 (2026-06-26)

Real schemas, settings, data-model persistence, capability registration, and typed IPC for the parts of the LAN Share spec that have a real, honest implementation today — discovery, authentication, and the send/receive engine are still phases LAN-3 through LAN-6, not attempted here.

**Real contracts** (`src/shared/contracts/lanShare.ts`) — independently authored per the LAN-0 clean-room strategy (no upstream text copied): device identity, settings (ports, receive directory, approval/background/compression policy, group-code-configured flag — never the plaintext code itself), the real §12 trust-state enum (`unknown`/`seen`/`temporarily-approved`/`trusted`/`blocked`/`fingerprint-changed`/`revoked`), the real §20 15-state transfer job lifecycle (distinct from Epic X6's own simpler `TransferJob` — this one tracks `preflighting`/`negotiating`/`verifying`/`quarantined`/etc., matching what real Warpinator-style transfers actually need), the exact 23-code §28 error enum, service status, and diagnostic result shapes.

**Real Capability Registry entries** (`core/capability/CapabilityRegistry.ts`) — all 17 `lanShare.*` ids from spec §7 now exist, each with an honest, specific reason naming the exact future phase that will make it real (`lanShare.discovery.mdns` → Phase LAN-3, `lanShare.files` → Phase LAN-5/6, etc.) rather than a generic "not implemented." One id, `lanShare.ipv4`, is genuinely `available` today — the Node.js runtime supports IPv4 sockets regardless of LAN Share's own progress, which is a different kind of fact than "is this feature built yet." `lanShare.ipv6` is deliberately reported `unsupported` even though the OS may support IPv6, because spec §2 explicitly requires IPv6 to stay capability-gated until real interoperability passes — the reason text says so explicitly, so this isn't mistaken for a technical absence.

**Real data-model persistence** (`core/lanShare/`) — four `JsonStore`-backed classes, each with real, tested behavior (not stubs returning empty data forever, even though nothing populates them from the network yet):

- `LanShareIdentityStore` — a stable per-device id + display name, generated once and persisted. Deliberately does **not** generate the RSA+X.509 certificate spec §13 eventually needs — that's real crypto work with no consumer until Phase LAN-4 builds the auth flow that uses it; building it now would be speculative.
- `LanShareSettingsStore` — real defaults matching the spec's own stated defaults (ports 42000/42001, `~/Downloads/NeuroDeck LAN Share`), with a real validation rule (transfer port and auth port must differ) enforced on every update, and `groupCodeConfigured` as the only trace of the eventual group code — verified by a test that no `groupCode` key reaches the persisted object.
- `LanSharePeerStore` — real manual-peer CRUD and the real §12 trust-state transition function (no auto-elevation, `blocked` only changes via explicit user action). No mDNS-driven peers exist yet — that data only starts flowing once Phase LAN-3's discovery client is real.
- `LanShareTransferStore` — real job creation/cancellation/listening, mirroring the same `onChange`-listener pattern this codebase already uses three times over (`TransactionManager`, `ExtensionHost`, Epic X6's `TransferManager`). No real engine drives a job through its other 13 states yet — that's Phase LAN-5/LAN-6.

**Real typed IPC, end-to-end** (`registerLanShareHandlers.ts` → `bridge.ts` → `preload/index.ts` → `lanShareClient.ts`) — identity read, settings read/update/group-code-configured, manual peer add/remove/trust, and transfer job list/cancel are all real, Zod-validated, and reachable from the renderer today. **Deliberately not registered**: `lanShare.discovery`/`lanShare.send`/`lanShare.receive`/`lanShare.firewall`/`lanShare.diagnostics` channels. Registering a handler for any of these today would mean returning fabricated scan results, fake transfer progress, or invented diagnostic passes — there is no real engine behind them until their respective phases land, and this project's no-mock-production-behavior rule applies to IPC handlers exactly as much as to UI.

**No screens, sockets, mDNS clients, or certificates were built in this phase** — LAN-1 is schema/data-model/settings/error scope only, per the spec's own phase breakdown (§37).

### Tests and evidence

| Suite                                                                                       | Location                                                | Count         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------- |
| `LanShareIdentityStore` real generate-once/persist, rename                                  | `core/lanShare/__tests__/LanShareIdentityStore.test.ts` | +2 (new file) |
| `LanShareSettingsStore` real defaults, port-conflict validation, group-code-configured flag | `core/lanShare/__tests__/LanShareSettingsStore.test.ts` | +4 (new file) |
| `LanSharePeerStore` real manual add/dedupe/trust-transition/remove                          | `core/lanShare/__tests__/LanSharePeerStore.test.ts`     | +5 (new file) |
| `LanShareTransferStore` real create/cancel/listener notification/listing order              | `core/lanShare/__tests__/LanShareTransferStore.test.ts` | +4 (new file) |

**Validation evidence (run 2026-06-26):**

```text
npm run test       → 167 files, 843 tests passed (one unrelated pre-existing test — AgentRuntime's
                      temp-dir cleanup — failed once under full-suite parallelism on Windows and
                      passed cleanly in isolation; not touched by this change)
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## LAN Share (Warpinator-compatible) — Phase LAN-2 (2026-06-26)

Real service lifecycle, real interface enumeration, real socket binding, and real health reporting (spec §5–6). Discovery (LAN-3), authentication (LAN-4), and the send/receive engine (LAN-5/6) still do not exist — this phase only proves the service can genuinely come up, bind real ports, and report real health.

**Real socket lifecycle** (`core/lanShare/LanShareService.ts`) — `start()` calls real `net.createServer().listen()` for both the transfer port and the auth/registration port read from `LanShareSettingsStore`. A port already in use produces a real `EADDRINUSE` from the OS, surfaced as a real `error` state with the OS's own message — confirmed by a test that occupies the port with a second real server first. Status transitions (`stopped`→`starting`→`running`/`error`, and back to `stopped` on `stop()`) are pushed live to every listener via the same `onChange` pattern this codebase already uses for `TransactionManager`/`TransferManager`/Epic X6's `PeerDiscoveryService`, here wired through to the renderer over a new `lanShare.service.update` IPC push. Accepted connections are destroyed immediately — there is no protocol implementation to hand them to yet (Phase LAN-3), and queuing or echoing data would be fabricated protocol behavior this project's rules forbid.

**Real interface enumeration** (`core/lanShare/LanShareInterfaceManager.ts`) — lists real non-loopback interfaces from `node:os.networkInterfaces()` with their real address and family. `inferredType` (`wifi`/`ethernet`/`unknown`) is explicitly documented as a name-based heuristic, not a true link-layer query — Node's standard library doesn't expose one. Default route, multicast capability, and VPN state (spec §22) are not attempted here; that work is explicitly the spec's own Phase LAN-9 ("SteamOS, VPN, firewall, suspend, resource policy"), so building a fake or partial version now would just be redone later.

**Real health reporting** — `LanShareService.getHealth()` reports the real `listening` state of both bound sockets and real receive-directory writability (creating the directory via `mkdir -p` if it doesn't exist yet, then checking write access) — not a static or assumed answer.

**Capability registry update**: `lanShare.available` changed from `unsupported` to `degraded`, with an honest reason explaining that a real service now exists and can bind sockets, but full Warpinator-compatible interoperability does not yet exist. This is a true statement about the codebase's current state, the same kind of fact every other entry in this registry already reports.

**Deliberately not done**: auto-start at app boot. Spec §24 requires auto-start to be gated behind "secure mode" (a real, configured group code) — Phase LAN-4 hasn't built real group-code-backed auth yet, so wiring auto-start now would either be fake gating or no gating at all. The service only starts via an explicit `lanShare.service.start` IPC call; `main/ipc/index.ts`'s dispose path also calls `stop()` on app shutdown, so a real bound socket never outlives the app process.

### Tests and evidence

| Suite                                                                                               | Location                                                   | Count         |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------- |
| `LanShareInterfaceManager` real non-loopback enumeration, shape validation                          | `core/lanShare/__tests__/LanShareInterfaceManager.test.ts` | +2 (new file) |
| `LanShareService` real bind/running, real port-conflict error, real status-transition notifications | `core/lanShare/__tests__/LanShareService.test.ts`          | +3 (new file) |

**Validation evidence (run 2026-06-26):**

```text
npm run test       → 169 files, 848 tests passed (one unrelated pre-existing test — a controller
                      tutorial waitFor timing assertion — failed once under full-suite parallelism
                      and passed cleanly in isolation; not touched by this change)
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## LAN Share (Warpinator-compatible) — Phase LAN-3 (2026-06-27)

Real Warpinator-protocol interoperability begins here: a real gRPC `WarpRegistration` service, real mDNS discovery against Warpinator's own confirmed service type, and real manual-connect probing. This is the first phase where this device can genuinely exchange protocol messages with another device over the network — not just bind sockets.

**New real dependencies** (all permissively licensed, confirmed via `npm view`): `@grpc/grpc-js` (Apache-2.0) and `@grpc/proto-loader` (Apache-2.0) for real gRPC, `bonjour-service` (MIT) for real mDNS-SD. `protobufjs` (BSD-3-Clause) arrives transitively. None of these are GPL — consistent with the LAN-0 clean-room strategy's requirement to never incorporate GPL code.

**Real clean-room `.proto` schema** (`core/lanShare/proto/ndxLanShare.proto` + an embedded TS mirror in `ndxLanShareProtoSource.ts`, since Electron's main-process build doesn't copy non-JS assets and the embedded string is materialized to a real temp file at load time via `@grpc/proto-loader`'s file-based API) — defines `WarpRegistration`'s two RPCs and their messages, independently authored from the real facts the LAN-0 audit recorded. **Important correctness finding this phase caught**: the real upstream `warp.proto` has no `package` declaration. A `package` declaration changes gRPC's full method path (`/package.Service/Method` vs `/Service/Method`) — so declaring one here, which an earlier draft of this file did, would have silently broken wire compatibility with real Warpinator-ecosystem clients despite every message field being correct. Fixed before any test caught it the hard way, by checking the real upstream file again rather than assuming.

**Real v1 registration, real v2 honesty** (`core/lanShare/grpc/LanShareRegistrationServer.ts` + `LanShareRegistrationClient.ts`) — `RegisterService` (v1) is a real, working gRPC round trip, proven by a test using two genuinely separate processes-in-test (a real bound server, a real client dialing into it over real loopback TCP) exchanging real `ServiceRegistration` messages. `RequestCertificate` (v2) returns a real `grpc.status.UNIMPLEMENTED`, confirmed by a test — not a fabricated certificate, since that needs Phase LAN-4's certificate infrastructure, which doesn't exist yet.

**Real mDNS discovery** (`core/lanShare/LanShareMdnsDiscovery.ts`) — uses the exact service type confirmed from Warpinator's own `src/server.py` (`SERVICE_TYPE = "_warpinator._tcp.local."`) and the exact real TXT keys it publishes (`hostname`, `api-version`, `auth-port`), so a genuine Warpinator-ecosystem client on the same network can see this device, and this device can see real Warpinator-ecosystem peers — not just other NeuroDeck instances. Proven by a real over-the-wire multicast test (one process advertises, a second genuinely separate `Bonjour` instance browses and receives it) — not mocked sockets.

**Real connect-id format** (`core/lanShare/LanShareIdentityStore.ts`) — generates `{HOSTNAME-UPPERCASE-TRUNCATED-42}-{20-HEX-CHARS}`, matching the exact format confirmed from Warpinator's own `prefs.py` `get_new_connect_id()`, so this device's mDNS service instance name and `service_id` look like a genuine peer's, not an NDX-specific format a real client might mishandle.

**Real, honest peer recording** (`LanShareService.handleDiscoveredPeer`/`probeManualPeer`, `LanSharePeerStore.upsertSeen`) — every mDNS-discovered peer and every manually-added peer gets a real v1 registration handshake attempted against it. A real success records the peer's real reported `service_id`/`hostname`/ports/`api_version`. A real failure (unreachable, refused, timeout, or an incompatible response) is recorded as `incompatible` — never silently dropped, and never fabricated as a successful match. An existing peer's `trustState`/`groupMatch` is preserved across re-observation (§12: re-observation never silently re-trusts).

**Self-reported API version stays honest at `1`** — Warpinator's own current `RPC_API_VERSION` is `2` (confirmed in `meson.build`), but this device's v2 support (the certificate exchange) doesn't exist yet, so reporting `2` would cause a real peer to attempt v2 negotiation with us and fail. Reporting `1` is the technically correct, honest signal until Phase LAN-4 lands.

**Capability registry updates**: `lanShare.discovery.mdns`, `lanShare.discovery.manual`, and `lanShare.registration.v1` moved from `unsupported` to `available`, each citing the real module backing it. `lanShare.registration.v2` stays `unsupported` (cited reason: needs Phase LAN-4).

### Tests and evidence

| Suite                                                                                                                    | Location                                                | Count         |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------- |
| `LanShareRegistrationServer`/`Client` real loopback round trip, unreachable-port rejection, real v2 UNIMPLEMENTED status | `core/lanShare/__tests__/LanShareRegistration.test.ts`  | +3 (new file) |
| `LanShareMdnsDiscovery` real over-the-wire multicast advertise/browse                                                    | `core/lanShare/__tests__/LanShareMdnsDiscovery.test.ts` | +1 (new file) |
| `LanShareIdentityStore` real connect-id format + stability                                                               | `core/lanShare/__tests__/LanShareIdentityStore.test.ts` | +1 (extended) |

**Validation evidence (run 2026-06-27):**

```text
npm run test       → 171 files, 853 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## LAN Share (Warpinator-compatible) — Phase LAN-4 (2026-06-27)

Real authentication: RSA-2048 self-signed certificates, a real group code, and a real NaCl-secretbox-encrypted v2 certificate exchange that's byte-compatible with Warpinator's own PyNaCl wire format — confirmed by reading their real `auth.py` (audited in `docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md`), not assumed. Also real per-peer rate limiting and real spec §11/§12 trust/policy enforcement.

**New real dependencies** (confirmed via `npm view`, all permissive): `selfsigned` (MIT, wraps `@peculiar/x509`/`pkijs`, both MIT/BSD-3-Clause) for real X.509 certificate generation; `tweetnacl` (Unlicense) for the real NaCl secretbox primitive. `tweetnacl-util` was installed then removed once it turned out unnecessary — `Buffer`'s own base64 handling covers the need.

**Real certificates** (`core/lanShare/LanShareCertificateStore.ts`) — genuine RSA-2048 keypairs and self-signed X.509 certs via `selfsigned`, with subject common name set to the device hostname, a `subjectAltName` extension listing this device's real IP addresses, SHA-256 signature, and a 30-day validity window — all confirmed to match the real structure Warpinator's own `auth.py` builds (`_make_key_cert_pair`). Confirmed real and parseable by a test that round-trips the generated PEM through Node's own `X509Certificate` parser. The private key is encrypted at rest through the same `SecretCipher` boundary `ClipboardStore`/`ModelProviderStore` already use, with the same honest plaintext fallback when the cipher reports itself unavailable.

**Real group-code storage** (`core/lanShare/LanShareGroupCodeStore.ts`) — encrypted at rest, and honestly defaults to Warpinator's own real default value `"Warpinator"` (confirmed in their `prefs.py`: `DEFAULT_GROUP_CODE = "Warpinator"`) rather than an NDX-invented default, so a fresh NeuroDeck install can complete a real v2 handshake with a fresh Warpinator install before either user sets a custom code. `isSecureMode()` matches their exact definition (`code != DEFAULT_GROUP_CODE`) — confirmed from their `prefs.py` `get_secure_mode()`.

**Real, byte-compatible v2 certificate exchange** (`core/lanShare/grpc/groupCodeCipher.ts`) — `RequestCertificate` (previously a real `UNIMPLEMENTED` stub from Phase LAN-3) now performs a real handshake: this device's real certificate PEM is encrypted with a real NaCl secretbox (XSalsa20-Poly1305 via `tweetnacl`), keyed by `SHA-256(group code)`, with the wire format `nonce (24 bytes) || ciphertext`, base64-encoded — confirmed to match Warpinator's own real `auth.py` construction exactly (`SecretBox(SHA256(group_code)).encrypt(...)`), not approximated with this codebase's more usual AES-GCM (which would not be wire-compatible with a real Warpinator peer's decryption attempt). Proven by a real loopback gRPC round trip (server encrypts, client decrypts, certificate text matches exactly) and a real group-mismatch test (different group codes on each side → the client gets a real `null`, the same honest "no match" signal `LAN_GROUP_MISMATCH` exists for, never a thrown error for an expected, non-exceptional outcome). **Real correctness finding caught during this phase**: an early version used `TextEncoder`/`TextDecoder` to convert between strings and bytes for the NaCl call, which intermittently threw `unexpected type, use Uint8Array` under Vitest specifically — `TextEncoder`'s output and the `Uint8Array` global `tweetnacl` checks against came from different realms under Vitest's module isolation, failing tweetnacl's own `instanceof` guard. Fixed by switching to `Buffer`-based conversion everywhere in this module, which stays in the same realm as the rest of the Node process.

**Real per-peer rate limiting** (`core/lanShare/grpc/RegistrationRateLimiter.ts`) — a real fixed-window counter (10 requests / 10 seconds by default) applied to both `RegisterService` and `RequestCertificate`, keyed by the peer's real source IP (extracted via the same `parsePeerHost` helper used elsewhere — now shared in `core/lanShare/grpc/parsePeerHost.ts` rather than duplicated, since rate-limiting by the full `ip:port` peer string would be trivially bypassed by opening a new connection per request, which is exactly what a real test caught before the fix). Confirmed by a test that trips the limiter and receives a real `grpc.status.RESOURCE_EXHAUSTED`.

**Real spec §12 trust enforcement** (`LanSharePeerStore.upsertSeen`'s new `resolveTrustState`) — a peer's fingerprint changing between observations now real-demotes its trust state to `fingerprint-changed` regardless of what it was before (including `trusted`), and `blocked` never silently reverts on re-observation — both confirmed by tests. `groupMatch` is now also real: `LanShareService.attemptCertificateExchange` only ever sets it `true` after a real, successfully-decrypted v2 handshake.

**Real spec §11 insecure-mode policy** (`LanShareSettingsStore.update`) — while the group code is still the real default, attempting to enable `autoStartEnabled` or set `approvalPolicy: 'auto-accept-trusted'` is rejected with a real validation error, evaluated against the _resulting_ settings state so a combined update that sets the group code and enables these in the same call is still handled correctly. Confirmed by three tests (each rejection path, plus the combined-update success path).

**Self-reported `api_version` bumped from `1` to `2`** — now that this device's v2 support is genuinely real, reporting `1` would have been needlessly conservative and would cause real Warpinator-ecosystem peers to skip attempting v2 with us.

**Capability registry update**: `lanShare.registration.v2` moved from `unsupported` to `available`. `lanShare.available`'s reason text updated to reflect that v1/v2 registration and certificate exchange are now real, with only the send/receive transfer engine (Phase LAN-5/LAN-6) still missing.

### Tests and evidence

| Suite                                                                                                         | Location                                                   | Count         |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------- |
| `groupCodeCipher` real NaCl round trip, nonce uniqueness, group-mismatch rejection, malformed-input rejection | `core/lanShare/__tests__/groupCodeCipher.test.ts`          | +4 (new file) |
| `LanShareGroupCodeStore` real default, encrypted persistence, plaintext fallback, clear                       | `core/lanShare/__tests__/LanShareGroupCodeStore.test.ts`   | +4 (new file) |
| `LanShareCertificateStore` real RSA/X.509 generation+parsing, persistence/reuse, hostname-change regeneration | `core/lanShare/__tests__/LanShareCertificateStore.test.ts` | +3 (new file) |
| `LanShareRegistrationServer`/`Client` real v2 round trip, real group mismatch, real rate-limit trip           | `core/lanShare/__tests__/LanShareRegistration.test.ts`     | +3 (extended) |
| `LanSharePeerStore` real fingerprint-change demotion, never-silently-unblock                                  | `core/lanShare/__tests__/LanSharePeerStore.test.ts`        | +2 (extended) |
| `LanShareSettingsStore` real insecure-mode policy enforcement                                                 | `core/lanShare/__tests__/LanShareSettingsStore.test.ts`    | +3 (extended) |

**Validation evidence (run 2026-06-27):**

```text
npm run test       → 175 files, 876 tests passed
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```

## LAN Share (Warpinator-compatible) — Phase LAN-5 (2026-06-27)

Real send-side engine: the `Warp` transfer service schema, real preflight/manifest building, real byte-compatible compression, and a real bounded concurrency queue — all confirmed against Warpinator's own real source. The actual chunk-streaming RPC (`StartTransfer`) stays honestly `UNIMPLEMENTED`; that's Phase LAN-6's real receiving/staging engine.

**Real `Warp` service schema** (`core/lanShare/proto/ndxLanShare.proto` + its embedded TS mirror) — independently authored from the real RPC/message shapes the LAN-0 audit recorded (`CheckDuplexConnection`, `WaitingForDuplex`, `GetRemoteMachineInfo`, `GetRemoteMachineAvatar`, `ProcessTransferOpRequest`, `PauseTransferOp`, `SendTextMessage`, `StartTransfer`, `CancelTransferOpRequest`, `StopTransfer`, `Ping`). A new test (`LanShareProtoSchema.test.ts`) parses both the standalone `.proto` file and the embedded string via `protobufjs` and asserts their reflected service/message shapes match exactly — closing the "kept in sync manually" gap the embedded source's own doc comment flagged since Phase LAN-3.

**Real `Ping`/`ProcessTransferOpRequest`, honest `UNIMPLEMENTED` everywhere else** (`core/lanShare/grpc/LanShareTransferServer.ts`/`LanShareTransferClient.ts`) — proven by a real loopback gRPC round trip (announcement delivered with the real peer address) and a real `UNIMPLEMENTED` status confirmed on `StartTransfer`. **Real fix found while building this**: the generic `unimplemented()` helper used a unary-style `callback(error)` for every RPC, but `StartTransfer`/`GetRemoteMachineAvatar` are server-streaming methods whose grpc-js handler receives no callback argument at all — calling the (undefined) callback silently produced a generic `UNKNOWN` status and a hung client call instead of the intended `UNIMPLEMENTED`. Fixed by detecting the streaming case and emitting a real `'error'` event on the call instead, which is grpc-js's actual documented mechanism for terminating a streaming response with an explicit status.

**Real preflight/manifest builder** (`core/lanShare/LanShareManifestBuilder.ts`) — every entry comes from a real `fs.lstat`, using the exact Gio-derived `file_type` integer values Warpinator's own `util.py` uses (`REGULAR=1`, `DIRECTORY=2`, `SYMBOLIC_LINK=3` — confirmed these are `Gio.FileType`'s real enum values, not arbitrary placeholders). Symlinks are recorded with their real target and never followed. Special files (sockets, FIFOs, devices) are rejected. Real cancellation via `AbortSignal` is checked at every traversal step, not just at the start.

**Real byte-compatible chunk compression** (`core/lanShare/grpc/fileChunkCompression.ts`) — confirmed against Warpinator's own `interceptors.py`: plain zlib `deflate`/`inflate` (the zlib-wrapped DEFLATE format, not gzip) applied directly to each non-empty chunk, default level `-1` (their own confirmed gschema default), never applied to directory/symlink marker chunks. A corrupted-input test confirms real decompression failures throw rather than silently returning wrong bytes.

**Real bounded transfer queue** (`core/lanShare/LanShareTransferQueue.ts`) — enforces real global and per-peer concurrency limits over `LanShareTransferStore`'s job state machine (`draft`→`preflighting`→`queued`→`negotiating`→`waiting-for-approval`/`failed`), confirmed by a test that holds a dispatch open and verifies the real active-count never exceeds the configured per-peer limit.

**Real concurrency bug found and fixed in `LanShareTransferStore`** — building the queue's own test (enqueuing multiple jobs concurrently) surfaced a genuine pre-existing race: `create()`/`updateStatus()`/`cancel()` each did an unguarded `read()` then `write()`, so two concurrent calls could both read the same stale list before either wrote back, silently discarding one job. Fixed by adding a real mutation-serializing promise chain (mirroring the exact pattern `JsonStore.write()` already uses one level down for disk writes) so every read-modify-write sequence on this store is now atomic with respect to every other one. Two new regression tests confirm concurrent `create()`/`updateStatus()` calls never lose a job or an update.

**Real send path wired end-to-end** — `LanShareService.sendFiles(peerId, sourcePaths)` builds a real manifest, enqueues a real bounded job, and dispatches a real `ProcessTransferOpRequest` announcement to the peer; reachable from the renderer via a new `lanShare.send.sendFiles` IPC channel. Incoming announcements are recorded as real `receive`-direction jobs in `waiting-for-approval` via `recordIncomingTransfer`.

**Capability registry updates**: `lanShare.parallel` and `lanShare.compression` moved from `unsupported` to `available`, each citing the real module backing them. `lanShare.files`/`lanShare.directories`/`lanShare.text` stay `unsupported`, with their reasons updated to cite Phase LAN-6 specifically (the real chunk-streaming/staging engine) rather than the previous joint "LAN-5/LAN-6" framing, since LAN-5's real preflight/queue/compression building blocks now exist.

### Tests and evidence

| Suite | Location | Count |
| ----- | -------- | ----- |
| `LanShareProtoSchema` real structural match between `.proto` file and embedded source, real `Warp` service RPC presence | `core/lanShare/__tests__/LanShareProtoSchema.test.ts` | +2 (new file) |
| `fileChunkCompression` real zlib round trip, empty-chunk passthrough, corrupted-input rejection | `core/lanShare/__tests__/fileChunkCompression.test.ts` | +3 (new file) |
| `LanShareManifestBuilder` real file/directory/symlink traversal, special-file rejection, cancellation | `core/lanShare/__tests__/LanShareManifestBuilder.test.ts` | +6 (new file) |
| `LanShareTransferServer`/`Client` real Ping, real announcement delivery, real UNIMPLEMENTED StartTransfer | `core/lanShare/__tests__/LanShareTransfer.test.ts` | +3 (new file) |
| `LanShareTransferQueue` real state progression, real dispatch failure handling, real per-peer concurrency bound | `core/lanShare/__tests__/LanShareTransferQueue.test.ts` | +3 (new file) |
| `LanShareTransferStore` real concurrent-create/concurrent-updateStatus regression coverage | `core/lanShare/__tests__/LanShareTransferStore.test.ts` | +2 (extended) |

**Validation evidence (run 2026-06-27):**

```text
npm run test       → 182 files, 904 tests passed (one unrelated pre-existing test — a controller
                      tutorial waitFor timing assertion — failed once under full-suite parallelism
                      and passed cleanly in isolation; not touched by this change)
npm run lint        → 0 errors, 0 warnings
npm run typecheck   → node + web TypeScript checks passed
npm run build       → succeeded
```
