# UI Testing Strategy

Updated: 2026-06-06

## Testing Stack

- Unit: Vitest in `frontend`
- Component: none dedicated
- Integration: frontend module tests
- E2E: Playwright Electron in `e2e`
- Visual: Playwright screenshot baselines in `e2e/tests/visual.spec.ts`
- Accessibility: axe through Playwright
- Electron-specific: Playwright Electron harness

## Test Layers

1. Frontend unit tests: fast behavior checks.
2. Frontend production build: validates Vite bundle and shell.
3. Focused Electron E2E: validates shell, navigation, keyboard, and a11y.
4. Visual snapshot review: verifies the renderer shell against committed screenshots.
5. Manual Electron QA: still needed for native file pickers, tray, and OS integrations.

## What Must Be Tested

- All 12 primary tabs render and activate.
- Command palette routes to every primary view.
- Quick switcher and radial menu expose the expected view set.
- Settings panel activation works by mouse and keyboard.
- Dialogs and overlays close with Escape.
- Icon-only controls have accessible names.
- Hidden inactive views are not focusable.
- Steam Deck 1280x800 has no horizontal overflow.

## What Should Not Be Over-Tested

- Internal implementation details of `main.js`.
- Exact SVG path data.
- Transient animation timing.
- Live provider/network responses.

## Selectors Strategy

Use stable IDs and existing `data-testid` hooks:

- `data-testid="nav-tab-{view}"`
- `data-testid="view-{view}"`
- Stable overlay IDs like `#settings-overlay` and `#command-palette-overlay`

## Test Data Strategy

Use deterministic local data and mocked bridge responses from the E2E harness. Do not use production secrets or external services.

## Electron Testing Strategy

Renderer UI tests should not expose new unsafe IPC. Test through the same DOM and preload bridge behavior the app uses in production.

## Viewport / Window Size Strategy

Required focused sizes:

- 1280x800 Steam Deck
- 1280x720 handheld/common desktop
- 1024x768 compact desktop

## Story Flow Coverage

Covered:

- Startup shell
- Primary navigation
- Command palette navigation
- Settings panel keyboard flow
- Shortcut overlays

Partial:

- Memory import native file picker
- Browser external navigation
- Native menu/tray flows

## Navigation Coverage

Primary nav and command palette coverage is passing on `chromium-desktop`.

## Verified Result

Current focused verification on 2026-06-06:

- `npm.cmd run frontend:test`: 78 passed.
- `npm.cmd run frontend:typecheck`: passed.
- `npm.cmd run frontend:build`: passed with the existing `neurobridge.js` ineffective dynamic import warning.
- `npm.cmd run test -- --project=chromium-desktop tests/keyboard-nav.spec.ts tests/a11y.spec.ts`: 27 passed.
- `npm.cmd run test -- --project=chromium-desktop tests/navigation-validation.spec.ts`: 33 passed.
- `npm.cmd run test -- --project=chromium-desktop tests/electron-native.spec.ts tests/functional-views.spec.ts tests/memory-view.spec.ts tests/chat.spec.ts tests/edge-cases.spec.ts tests/settings-shell.spec.ts tests/settings-behavior.spec.ts tests/settings-tabs.spec.ts`: 79 passed.
- `npm.cmd run test -- --project=chromium-desktop tests/visual.spec.ts`: 14 failed, 1 skipped. Representative chat drift improved from 128143 different pixels to 23521 after restoring sidebar default collapse, breadcrumb strip, composer classes, and starter cards, but the visual baseline still needs explicit design reconciliation.

## Design System Coverage

The current tests cover design-system contracts indirectly through shell rendering, icon accessibility, modal focus, and tab/panel state.

## Accessibility Coverage

The axe suite covers all primary views plus settings, command palette, and shortcuts overlays. Critical and serious failures are treated as hard failures except color contrast.

## CI Strategy

Recommended CI gate for renderer UI changes:

1. `npm.cmd run frontend:test`
2. `npm.cmd run frontend:build`
3. `npm.cmd run test -- --project=chromium-desktop tests/navigation-validation.spec.ts`
4. `npm.cmd run test -- --project=chromium-desktop tests/keyboard-nav.spec.ts tests/a11y.spec.ts`
5. `npm.cmd run test -- --project=chromium-desktop tests/visual.spec.ts` when changing shell layout or view chrome.

## Known Gaps

- Visual screenshots exist, but the restored production shell does not yet meet the strict committed baselines.
- No Storybook/component story system.
- Native menu, tray, and OS file dialog flows need manual or specialized Electron tests.
