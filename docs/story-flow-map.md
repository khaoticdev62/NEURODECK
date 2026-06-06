# Story Flow Map

Updated: 2026-06-06

## Story: First App Launch

### User Goal

Open NEURODECK and reach the main Chat workspace.

### Entry Points

- Route: Electron renderer root
- Navigation source: app startup
- Deep link: none
- Menu action: native launch

### Preconditions

- Auth state: none
- Required data: built renderer assets
- Required permissions: local bridge optional for UI shell
- Required settings: none

### Happy Path

1. User launches Electron.
2. Production HTML provides the app shell.
3. `main.js` hydrates controls and sets Chat active.
4. Boot overlay detaches.
5. User sees usable primary navigation.

### Alternate Paths

- Empty data: shell still renders.
- Existing data: memory/settings modules hydrate later.
- Invalid input: not applicable.
- Permission denied: bridge features may fail independently.
- Cancel/back: not applicable.
- Retry: relaunch app.

### Failure Paths

- Network failure: nonblocking for shell.
- IPC failure: feature calls fail, shell remains navigable.
- Missing data: fixed missing shell DOM.
- Validation error: not applicable.
- Unexpected error: console diagnostics.

### UI States Required

- Loading: boot overlay
- Empty: feature-specific panels
- Error: feature-specific status lines
- Success: active Chat shell
- Disabled: unavailable feature buttons
- Focused: nav/settings controls
- Hover: buttons/tabs
- Active: current tab/panel
- Selected: Share tabs and primary nav tabs

### Tests Required

- Unit: existing frontend unit tests
- Component: gap, no component framework
- Integration: existing module tests
- E2E: navigation validation
- Accessibility: axe suite
- Visual: gap, no visual baseline

### Coverage Status

Covered for startup shell and navigation.

## Story: Navigate Between Primary Views

### User Goal

Move between all 12 primary workspaces.

### Entry Points

- Route: current renderer document
- Navigation source: top nav, command palette, quick switcher, radial menu
- Deep link: none
- Menu action: command palette actions

### Preconditions

- App shell loaded.
- View panels exist.

### Happy Path

1. User activates a nav item.
2. Current view saves state.
3. Target tab becomes active.
4. Target panel becomes visible and interactive.
5. Inactive panels become `hidden` and `inert`.

### Alternate Paths

- Keyboard-only: focus tab and press Enter.
- Command palette: Ctrl+K, search, Enter.
- Radial: backtick opens overlay.
- Recent view: Ctrl+Tab opens quick switcher.

### Failure Paths

- Missing panel: navigation test fails.
- Hidden focus conflict: fixed with `hidden` plus `inert`.

### UI States Required

Active, inactive, focused, hidden, inert.

### Tests Required

E2E navigation, keyboard, accessibility.

### Coverage Status

Covered.

## Story: Update Settings Panel

### User Goal

Open settings and navigate to a configuration section.

### Entry Points

- Route: current renderer document
- Navigation source: settings button, command palette
- Deep link: none
- Menu action: settings command

### Preconditions

- Settings overlay exists.
- `initSettings()` has wired controls.

### Happy Path

1. User opens settings.
2. Focus trap activates.
3. User clicks or keyboard-activates a sidebar button.
4. `activateSettingsPanel()` updates `.active`, `hidden`, `inert`, and `data-settings-theme`.
5. User closes with Escape or close button.

### Alternate Paths

- Saved active panel is restored.
- Invalid panel falls back to General.

### Failure Paths

- Missing `data-settings-theme`: fixed.
- Focus trapped in hidden panel: fixed with `inert`.

### UI States Required

Open, closed, focused, active, hidden, inert.

### Tests Required

Keyboard and axe E2E.

### Coverage Status

Covered for panel activation and close focus return.

## Story: Import Memory

### User Goal

Import a memory backup file.

### Entry Points

- Route: `view-memory`
- Navigation source: primary nav

### Preconditions

- Memory view exists.

### Happy Path

1. User opens Memory.
2. User activates Import.
3. Hidden file input opens file picker.
4. Selected file is processed by the memory module.

### Failure Paths

- File input lacked label: fixed.
- Refresh icon button lost text after icon enhancement: fixed.

### Coverage Status

Partial. Accessibility and shell render covered; native file picker flow requires manual/Electron-specific QA.

