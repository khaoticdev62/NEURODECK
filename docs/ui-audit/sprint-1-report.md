# UI Audit Sprint 1 Report

Date: 2026-06-15
Scope: blocker-first implementation pass after repository discovery.

## Summary

This sprint fixed confirmed blockers in the React UI contract, accessibility landmarks, command palette behavior, controller focus metadata, E2E bridge mocks, and stale visual baselines. It did not add mocked product data or fake UI states.

## Issues Fixed

### 1. Button Variant Contract Broke Shared Views

- File path: `frontend/src/react/components/primitives/Button.tsx`
- Component/view/screen: Button primitive adapter
- Severity: High
- Exact defect: Shared views used `variant="outline"`, but the primitive type and adapter only accepted `primary`, `secondary`, `ghost`, and `danger`. This broke `frontend:typecheck`.
- Reproduction path: run `npm.cmd run frontend:typecheck`.
- Evidence: TypeScript reported `Type '"outline"' is not assignable to type 'ButtonVariant'` in `GitView.tsx` and `MemoryView.tsx`.
- Fix strategy: Add `outline` to the existing primitive adapter without introducing a parallel component system.
- Actual code change: Added `outline` to `ButtonVariant`, mapped it to DS `secondary`, and applied transparent token-safe outline styling.
- Validation result: `npm.cmd run frontend:typecheck` passed.

### 2. ModelCard Test Used Obsolete API And Accessible Name

- File path: `frontend/src/react/__tests__/components/cards/ModelCard.test.tsx`
- Component/view/screen: ModelCard tests
- Severity: Medium
- Exact defect: Tests passed removed `onSelect` props and queried an obsolete button label.
- Reproduction path: run targeted Vitest for `ModelCard.test.tsx`.
- Evidence: Vitest failed on prop/type mismatch and accessible-name lookup.
- Fix strategy: Align the tests to the current production component API and real accessible label.
- Actual code change: Removed obsolete `onSelect` props and updated the query to `Mark Llama 3.1 8B as ready`.
- Validation result: Targeted Vitest passed, 15 tests across ModelCard and Button.

### 3. Controller Default Focus Target Was Missing

- File path: `frontend/src/react/App.tsx`
- Component/view/screen: view wrapper rendered by `renderView`
- Severity: High
- Exact defect: The main view content had no controller default focus target, failing controller navigation graph validation.
- Reproduction path: run `npm.cmd run check:focus-graphs`.
- Evidence: `App main content is missing a controller default focus target.`
- Fix strategy: Add the existing controller metadata to the view wrapper, not a new focus system.
- Actual code change: Added `data-controller-default="true"` to the active view wrapper.
- Validation result: `npm.cmd run check:focus-graphs` passed.

### 4. Active Navigation State Was Not Exposed To E2E Contract

- File path: `frontend/src/react/components/layout/PrimarySidebar.tsx`
- Component/view/screen: PrimarySidebar
- Severity: High
- Exact defect: Active nav buttons had visual active styling but no literal `.active` class expected by navigation and design-system tests.
- Reproduction path: run `navigation-validation.spec.ts` or `design-system-audit.spec.ts`.
- Evidence: E2E expected `button[data-view].active`, but active buttons lacked the class.
- Fix strategy: Preserve existing styling and add the class contract only for active buttons.
- Actual code change: Added `active` into the active class branch.
- Validation result: Targeted Playwright passed, 81 passed and 1 skipped.

### 5. Command Palette Overlay Did Not Expose Open State Class

- File path: `frontend/src/react/components/command/CommandPalette.tsx`
- Component/view/screen: CommandPalette
- Severity: High
- Exact defect: The overlay opened visually but no longer exposed `.active`, causing command palette and navigation E2E helpers to fail.
- Reproduction path: click `#command-palette-btn`, then assert `#command-palette-overlay.active`.
- Evidence: Playwright received `pointer-events-auto opacity-100` without `active`.
- Fix strategy: Add the class contract when `state.commandOpen` is true.
- Actual code change: Added `active` to the open branch of the overlay class list.
- Validation result: Command palette tests passed in targeted Playwright.

### 6. Command Palette Search Input Lacked Accessible Name

- File path: `frontend/src/react/components/command/CommandPalette.tsx`
- Component/view/screen: CommandPalette search input
- Severity: Medium
- Exact defect: Visible interactive input relied on placeholder text and had no accessible name.
- Reproduction path: run `design-system-audit.spec.ts`, section 12.1.
- Evidence: Audit warning flagged `<input id="command-palette-input">`.
- Fix strategy: Add a direct accessible label.
- Actual code change: Added `aria-label="Command palette search"`.
- Validation result: Design-system audit passed.

### 7. Open Settings Command Was A Dead UI State

- File path: `frontend/src/react/components/command/CommandPalette.tsx`
- Component/view/screen: CommandPalette command registry
- Severity: High
- Exact defect: `Open Settings` set `view: "settings"`, but settings is an overlay, not a rendered view route.
- Reproduction path: open command palette, run `Open Settings`.
- Evidence: Static route map has no `renderView("settings", ...)`; settings overlay is opened through `onOpenSettings`.
- Fix strategy: Wire the command to the existing settings-panel path.
- Actual code change: Changed the command from `view: "settings"` to `settingsPanel: "general"`.
- Validation result: Targeted Playwright command palette and settings audit passed.

### 8. Shell Settings And Notifications Handlers Were Not Passed Through

- File path: `frontend/src/react/components/layout/NeurodeckShell.tsx`
- Component/view/screen: NeurodeckShell / PrimarySidebar integration
- Severity: High
- Exact defect: `PrimarySidebar` supports `onOpenSettings` and `onOpenNotifications`, but `NeurodeckShell` did not pass them. If that shell wrapper is active, footer buttons render but do nothing.
- Reproduction path: render through `NeurodeckShell` and click the settings footer button.
- Evidence: Code inspection showed `<PrimarySidebar state={state} dispatch={dispatch} />` without handlers.
- Fix strategy: Pass existing props through; do not add new modal state.
- Actual code change: Added `onOpenSettings={() => props.openSettings("general")}` and `onOpenNotifications={() => props.setNotificationsOpen(true)}`.
- Validation result: Typecheck and build passed.

### 9. Title Bar Missed Banner Landmark

- File path: `frontend/src/react/components/layout/TitleBar.tsx`
- Component/view/screen: TitleBar
- Severity: Medium
- Exact defect: The title bar rendered as `<header>` but did not expose `role="banner"` required by the design audit contract.
- Reproduction path: run `design-system-audit.spec.ts`, section 11.1.
- Evidence: Playwright found zero `header[role='banner']` nodes.
- Fix strategy: Add the role to the existing header element.
- Actual code change: Added `role="banner"`.
- Validation result: Design-system audit passed.

### 10. E2E Tests Used Stale View Internals

- File paths:
  - `e2e/tests/navigation-validation.spec.ts`
  - `e2e/tests/browser-load.spec.ts`
- Component/view/screen: Navigation validation, Browser load
- Severity: Medium
- Exact defect: Tests referenced stale internal selectors such as `.tunnel-kicker`, `.share-view-kicker`, `.prompt-lab-container`, and `.nav-tab[data-view="browser"]`.
- Reproduction path: run targeted Playwright navigation specs.
- Evidence: Playwright could activate routes but failed to find those old internal classes.
- Fix strategy: Use stable public contracts: `data-testid` view roots and `button[data-view="browser"]`.
- Actual code change: Updated selectors to stable view roots and current nav button selector.
- Validation result: Targeted Playwright passed.

### 11. E2E Bridge Mock Naming Drift

- File paths:
  - `e2e/pages/AppPage.ts`
  - `e2e/support/tauri-mock.ts`
  - `e2e/tests/command-palette.spec.ts`
- Component/view/screen: E2E support layer
- Severity: Medium
- Exact defect: Quick Switcher setup could load before the shared bridge mock existed; helper names still implied Tauri-only runtime in a pure Electron bridge app.
- Reproduction path: run `command-palette.spec.ts`.
- Evidence: Quick Switcher test setup was manually reloading after mock setup and carried stale naming.
- Fix strategy: Reuse the existing init-script mock consistently and add a bridge-named helper without breaking imports.
- Actual code change: Added `mockBridgeBackend()` alias, made Quick Switcher setup call the mock before navigation, and updated support comments.
- Validation result: Command palette and Quick Switcher tests passed.

### 12. Visual Baselines Were Stale

- File paths:
  - `e2e/tests/design-system-audit.spec.ts-snapshots/audit-chat-1280x800-chromium-desktop-win32.png`
  - `e2e/tests/design-system-audit.spec.ts-snapshots/audit-settings-1280x800-chromium-desktop-win32.png`
- Component/view/screen: Chat default view, Settings modal at 1280x800
- Severity: Medium
- Exact defect: Functional and design checks passed, but snapshot PNGs represented an older UI state and failed against the current production UI.
- Reproduction path: run `design-system-audit.spec.ts`, sections 13.1 and 13.2.
- Evidence: Playwright reported 0.06 to 0.07 image diff ratios; manual inspection showed stale snapshots missing current settings panels and onboarding controls.
- Fix strategy: Update only the two stale baselines through Playwright update mode after inspecting actual vs expected.
- Actual code change: Regenerated the two snapshot PNGs with `--update-snapshots`.
- Validation result: Design-system audit passed.

## Validation Results

- `node scripts\validate-design-system.js`: passed.
- `npm.cmd run frontend:typecheck`: passed.
- `npm.cmd -w frontend run lint`: passed with 112 existing warnings and 0 errors.
- `npm.cmd run frontend:build`: passed.
- `npm.cmd run check:focus-graphs`: passed.
- `npm.cmd run check:controller-actions`: passed.
- Targeted Vitest for `ModelCard.test.tsx` and `Button.test.tsx`: passed, 15 tests.
- Targeted Playwright from `e2e/`: `navigation-validation.spec.ts command-palette.spec.ts design-system-audit.spec.ts --project chromium-desktop`: passed, 81 passed and 1 skipped.

## Residual Risk

- Lint still reports 112 warnings from pre-existing `any` and hook dependency debt. This sprint did not broaden scope into those warnings because they were not newly introduced blockers.
- Full E2E suite was not run in this sprint; the targeted blocker suite was run and passed.
- Existing unrelated dirty files were not modified as part of this sprint: `infra/telemetry/health.json`, `llm-term.toml`, and `reports/models/self-healing-evidence.json`.
