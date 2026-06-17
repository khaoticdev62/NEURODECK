# AAAA Screen Redesign — Phase 2 Results

> Date: 2026-06-17
> Scope: Shared Component & Shell Hardening

## Shell Components

### `frontend/src/react/App.tsx` (inline shell)

**Previous issues**
- `#app-shell` was focusable (`tabIndex={0}`) but had `outline-none`, creating an invisible focus landmark.
- Controller prompt overlay had no focus trap or Escape handling.
- Quick switcher overlay had no focus trap or Escape handling.
- Quick switcher listbox lacked `aria-activedescendant`.
- Overlay backdrops used inconsistent z-index tokens (`z-[var(--nd-z-modal)]` vs `z-modal`).

**Refactor actions**
- Removed `tabIndex={0}` from `#app-shell`.
- Wrapped Controller prompt and Quick switcher dialogs in `FocusTrapContainer` with `onEscape`.
- Added `aria-activedescendant` to quick-switcher listbox and stable IDs on each option.
- Normalized all modal overlay backdrops to `z-modal` class.

**Accessibility improvements**
- Focus is now trapped in both overlays.
- Escape closes both overlays.
- Screen readers follow visual focus in quick switcher.

### `frontend/src/react/components/layout/TitleBar.tsx`

**Previous issue**
- Decorative traffic-light dots were not hidden from screen readers.

**Refactor action**
- Added `aria-hidden="true"` to the decorative dots container.

### `frontend/src/react/components/layout/SecondaryRail.tsx`

**Previous issues**
- Collapse toggle was `h-8 w-8` (32 px), below AAAA 44 px minimum.
- Context-used progress bar had no `role="progressbar"` or ARIA values.

**Refactor actions**
- Changed collapse toggle to `min-h-touch min-w-touch`.
- Added `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label` to the progress bar.

### `frontend/src/react/components/primitives/FocusTrapContainer.tsx`

**Previous issue**
- Did not forward refs, preventing overlay containers from being queried/restored by callers.

**Refactor action**
- Rewrote with `forwardRef` so callers can pass a ref.

## Core Primitives

### `frontend/src/react/components/primitives/Toast.tsx`

**Previous issues**
- Hardcoded `role="status"` overrode DS logic that assigns `role="alert"` for error/warning toasts.
- Toasts auto-dismissed without pausing on hover/focus.

**Refactor actions**
- Removed hardcoded `role="status"`; DS now decides alert vs status by tone.
- Added pause-on-hover/focus behavior with remaining-time tracking.

### `frontend/src/react/components/primitives/Tabs.tsx`

**Previous issue**
- Tab buttons used `min-h-[40px]`, below AAAA 44 px minimum.

**Refactor action**
- Replaced with `min-h-touch`.

### `frontend/src/react/components/primitives/Button.tsx`

**Previous issue**
- `size="xs"` rendered `h-7` (28 px), below AAAA 44 px minimum.

**Refactor action**
- Replaced `h-7` with `min-h-touch` so xs buttons keep compact padding but meet the minimum hit target.

### `frontend/src/react/components/primitives/Panel.tsx`

**Previous issue**
- Panel `<section>` had no `aria-labelledby` link to its header title.

**Refactor action**
- Generated a stable header ID with `useId` and wired `aria-labelledby` when a title is present.

## Tooling / Dependencies

- Installed `fallow` CLI locally for real codebase intelligence.
- Installed missing peer dependencies `@testing-library/dom` and `@types/react-dom` so frontend tests type-check.
- Fixed broken `ROOT` paths and cache-dir skipping in `scripts/verify/verify-no-tauri.ts`, `verify-no-dead-code.ts`, `verify-electron-replacements.ts`, and `verify-architecture-boundaries.ts`.

## Validation

| Check | Result |
|---|---|
| `npm run frontend:typecheck` | ✅ Pass |
| `npm run --prefix frontend lint` | ✅ 0 errors, 102 warnings |
| `npm run production:cleanup-gate` | ✅ Pass |
| `npm run --prefix frontend build` | ✅ Pass |
| `npm run --prefix frontend test` | ⚠️ 506 passed, 5 failed (pre-existing feature-view failures: MaintenanceView, OnboardingWizard, OrchestratorView, RecoveryView, SyncView) |
| Fallow baseline | Generated real data in `docs/audits/ui-redesign/fallow-baseline.md` |

---

# AAAA Screen Redesign — Phase 3 Batch A Results

> Date: 2026-06-17
> Scope: High-priority feature views: Settings, Browser, IDE, Torrent, plus audits of CLI Maker, Plugins, Share

## Audited Screens

All 7 screens in Batch A were audited:
- `SettingsView`
- `BrowserView`
- `IDEView`
- `TorrentView`
- `CliMakerView`
- `PluginsView`
- `ShareView`

Audit findings are summarized below per refactored screen. Full cross-view themes:
- Weak error handling (errors swallowed, no `ErrorState`).
- Hardcoded typography sizes (`text-[9px]`–`text-[11px]`).
- Mouse-first controller/keyboard navigation.
- Duplicate inline progress bars, status cards, toolbars.

## Refactored Screens

### `frontend/src/react/features/browser/BrowserView.tsx`

**Previous issues**
- Viewport suspended state used custom inline UI instead of shared `EmptyState`.
- VPN overlay used legacy `z-[var(--z-modal)]`.
- Browser viewport had no accessible label.
- Home button navigated to `https://example.com` placeholder.

**Refactor actions**
- Replaced suspended viewport block with `EmptyState` + `Button` action.
- Normalized VPN overlay z-index to `z-modal`.
- Added `aria-label="Browser viewport"` to the viewport.
- Changed home navigation to `about:blank`.

### `frontend/src/react/features/ide/IDEView.tsx`

**Previous issues**
- Used legacy non-`nd-*` token classes throughout (`text-text-primary`, `bg-surface-secondary`, `border-border-subtle`, `text-accent-primary`, etc.).
- **Invalid nested buttons**: tab `<button role="tab">` contained an `IconButton` close button.
- `shadow-glow-sm` class was undefined.
- No controller zones.

**Refactor actions**
- Replaced all legacy token classes with canonical `nd-*` tokens.
- Restructured editor tabs so the close `IconButton` is a sibling of the `role="tab"` button, not nested inside it.
- Replaced undefined `shadow-glow-sm` with `shadow-nd-elevation-card`.
- Added `data-controller-zone` attributes for ide, ide-workspace, and ide-editor zones.

### `frontend/src/react/features/settings/SettingsView.tsx`

**Previous issues**
- `SettingRow` title/description were not programmatically associated with the child control.
- Settings sidebar lacked `overflow-y-auto` and used `min-h-10` (40 px) nav items.
- Setting rows used arbitrary `min-h-[64px]`.

**Refactor actions**
- Rewrote `SettingRow` to generate stable IDs, clone the child control with `id`, and add `aria-labelledby` / `aria-describedby`.
- Added `overflow-y-auto scrollbar-thin` to the settings sidebar.
- Changed nav items to `min-h-touch` and rows to `min-h-touch`.

### `frontend/src/react/features/torrent/TorrentView.tsx`

**Previous issues**
- **Invalid nested buttons**: torrent row `<button>` contained checkbox `IconButton`, pause `IconButton`, and remove `IconButton`.
- Progress bar had no `role="progressbar"` or ARIA values.

**Refactor actions**
- Restructured torrent row: outer `<div>`, selectable content is a separate `<button>`, and action buttons are siblings.
- Added `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label` to the progress bar.

## Completed Batch A Screens

### `frontend/src/react/features/cli-maker/CliMakerView.tsx`

**Previous issues**
- Raw `<input>`, `<textarea>`, and `<select>` elements instead of shared primitives.
- Load failures silently fell back to `localStorage` samples with no user-facing error.
- Custom checkbox for “Send output directly to LLM” was not a `Toggle`.
- Category filter chips had 32 px touch targets.
- Shell-action warning banner lacked `role="alert"`.

**Refactor actions**
- Replaced raw form controls with `TextInput`, `Select`, and `Toggle` primitives.
- Added `loadError` state and `ErrorState` with retry when the sidecar cannot be reached.
- Replaced the prompt checkbox with `Toggle`.
- Bumped category filter chips to `min-h-touch min-w-[48px]`.
- Added `role="alert"` to the shell-action security warning.
- Added `role="button"`, `aria-pressed`, and Space/Enter handling to command list items.

### `frontend/src/react/features/plugins/PluginsView.tsx`

**Previous issues**
- Inline error banner was not the shared `ErrorState` component and lacked `role="alert"`.
- Validation warning box and dangerous-permission modal warning lacked `role="alert"`.
- An unused `eslint-disable` directive was present.

**Refactor actions**
- Replaced the inline error banner with `ErrorState` (supports retry and dismiss).
- Added `role="alert"` to validation failure and high-risk permission warning boxes.
- Removed the unused `eslint-disable-next-line react-hooks/exhaustive-deps` comment.

### `frontend/src/react/features/share/ShareView.tsx`

**Previous issues**
- LAN and Warpinator load errors were swallowed.
- Custom tabs had no arrow-key navigation or roving `tabIndex`.
- LAN peer list items were not keyboard-focusable.
- The Warpinator OS badge used `text-[9px]` (too small).
- Panels were hidden only via CSS `hidden` class without ARIA tabpanel wiring.

**Refactor actions**
- Added `loadError` states to both `LanPanel` and `WarpinatorPanel` and surfaced them with `ErrorState`.
- Implemented arrow-key (Left/Right/Home/End) tab navigation with roving `tabIndex`.
- Added `aria-controls`, `id`, `role="tabpanel"`, and `aria-labelledby` wiring to tabs and panels.
- Switched panel visibility to the HTML `hidden` attribute while keeping panels mounted for state.
- Made LAN peer list items focusable with `tabIndex={0}`, `role="listitem"`, and a visible focus ring.
- Replaced the tiny OS badge with a `Badge` component.

### `frontend/src/react/components/primitives/ErrorState.tsx`

**Refactor actions**
- Added optional `onClose` / `closeLabel` props so error blocks can be dismissed inline.

## Validation

| Check | Result |
|---|---|
| `npm run frontend:typecheck` | ✅ Pass |
| `npm run --prefix frontend lint` | ✅ 0 errors, 101 warnings |
| `npm run production:cleanup-gate` | ✅ Pass |
| `npm run --prefix frontend build` | ✅ Pass |
| `npm run --prefix frontend test` | ⚠️ 506 passed, 5 failed (pre-existing feature-view failures: MaintenanceView, OnboardingWizard, OrchestratorView, RecoveryView, SyncView) |

## Files Changed in Phase 3 Batch A

- `frontend/src/react/features/browser/BrowserView.tsx`
- `frontend/src/react/features/ide/IDEView.tsx`
- `frontend/src/react/features/settings/SettingsView.tsx`
- `frontend/src/react/features/torrent/TorrentView.tsx`
- `frontend/src/react/features/cli-maker/CliMakerView.tsx`
- `frontend/src/react/features/plugins/PluginsView.tsx`
- `frontend/src/react/features/share/ShareView.tsx`
- `frontend/src/react/components/primitives/ErrorState.tsx`
- `frontend/src/react/__tests__/primitives/IconButton.test.tsx`
- `frontend/src/react/__tests__/primitives/Toast.test.tsx`


---

# AAAA Screen Redesign — Phase 3 Batch B Results

> Date: 2026-06-17
> Scope: Full medium-risk tier — Themes, Prompt Lab, MCP, Security, Diagnostics, Graph, Orchestrator, Sync, Memory, Git

## Refactored Screens

### `frontend/src/react/features/themes/ThemesView.tsx`
- Migrated legacy semantic tokens to canonical `nd-*` tokens.
- Replaced raw prompt checkbox with `Toggle`.
- Kept the wallpaper opacity `<input type="range">` but added `role="slider"`, `aria-label`, `aria-valuemin/max/now`, and `min-h-touch`.
- Styled the import/export raw `<textarea>` elements with `nd-*` tokens and `min-h-touch`.
- Added `error` state and `ErrorState` for `updateSettings` / `resetToDefaults` failures.
- Added `min-h-touch` to theme/wallpaper card buttons.

### `frontend/src/react/features/prompt-lab/PromptLabView.tsx`
- Migrated all legacy semantic tokens to `nd-*`.
- Added `loadError` state and full-view `ErrorState` with retry/dismiss.
- Surfaced previously swallowed errors from `refreshSaved`, `refreshMacros`, `selectTemplate`, and initial load.
- Replaced suggestion search raw `<input>` with `TextInput`.
- Replaced slot-editor raw `<input>` and `<select>` with `TextInput` and `Select`.
- Kept multiline slot/preview `<textarea>` elements but styled them with `nd-*` tokens and `min-h-touch`.
- Added `listbox`/`option` roles, `aria-selected`, `aria-label`, and Enter/Space handlers to list buttons.
- Added `min-h-touch` to list items and macro rows.

### `frontend/src/react/features/mcp/MCPView.tsx`
- Migrated legacy tokens to `nd-*`.
- Added `loadError` state and `ErrorState` with retry/dismiss for `refresh()` failures.
- Added `min-h-touch` to buttons, inputs, and tool-whitelist row buttons.
- Tool-whitelist rows remain native `<button role="checkbox" aria-checked>` for keyboard accessibility.

### `frontend/src/react/features/security/SecurityView.tsx`
- Migrated legacy tokens to `nd-*`.
- Added `error` state and `ErrorState`; `refresh()` now catches and surfaces failures instead of silently falling through.
- Added `min-h-touch` to buttons and the agent-mapping `Select`.

### `frontend/src/react/features/diagnostics/DiagnosticsView.tsx`
- Migrated legacy tokens to `nd-*`.
- Replaced the inline matrix-error alert with `ErrorState` (retry + dismiss).
- Extracted `loadMatrix` so it can be reused for retry.
- Fixed nested interactive controls: connection rows are now plain containers, the selectable area is a separate `role="button"`, and the probe `IconButton` is a sibling.
- Added `min-h-touch` to the connection-row content area.

### `frontend/src/react/features/graph/GraphView.tsx`
- Migrated legacy tokens to `nd-*`.
- Added SVG keyboard accessibility:
  - `role="img"` and `aria-label` on the SVG.
  - `tabIndex={0}`, `role="button"`, and `aria-label` on each node.
  - Arrow-key navigation between nodes (Left/Right/Up/Down, wrapping).
  - Visible focus ring and expanded radius on focused nodes.
  - Persistent tooltip + `aria-live="polite"` region for screen-reader announcements.

### `frontend/src/react/features/orchestrator/OrchestratorView.tsx`
- Added `loadError` state and `ErrorState`; `loadList` / `loadWorkflow` now surface load failures instead of only logging them.
- Added an accessible `<label htmlFor="workflow-json-editor">` for the main JSON textarea and kept it as a styled multiline `<textarea>`.
- Added `min-h-touch` to header actions, Save Workflow button, and workflow list rows.
- Added `role="list"` / `role="listitem"` semantics to the workflow list.

### `frontend/src/react/features/sync/SyncView.tsx`
- Added `loadError` state and `ErrorState` (retry via `loadAll`, dismiss via `setLoadError(null)`).
- Surfaced previously empty `catch` blocks in `refreshTransfers`, `refreshPeers`, `refreshTrusted`, `groupCode("get")`, and `getInboxPath`.
- Tabs already use the local `Tab` primitive with `min-h-touch` and arrow-key navigation.

### `frontend/src/react/features/memory/MemoryView.tsx`
- Fixed remaining non-canonical token (`bg-nd-surface-base/40` → `bg-nd-surface/40`).
- Added `loadError` state and `ErrorState` for persistent load failures (semantic search and backup list).
- Added `min-h-touch` to toolbar action buttons, Add Fact button, and restore/confirm-restore buttons.

### `frontend/src/react/features/git/GitView.tsx`
- Added `loadError` and `diffError` states with `ErrorState` for branch-list, commit-log, and diff failures.
- Added `min-h-touch` to `FileItem` rows and branch checkout buttons.

## Validation

| Check | Result |
|---|---|
| `npm run frontend:typecheck` | ✅ Pass |
| `npm run --prefix frontend lint` | ✅ 0 errors, 101 warnings |
| `npm run production:cleanup-gate` | ✅ Pass |
| `npm run --prefix frontend build` | ✅ Pass |
| `npm run --prefix frontend test` | ⚠️ 506 passed, 5 failed (pre-existing feature-view failures: MaintenanceView, OnboardingWizard, OrchestratorView, RecoveryView, SyncView) |

## Files Changed in Phase 3 Batch B

- `frontend/src/react/features/themes/ThemesView.tsx`
- `frontend/src/react/features/prompt-lab/PromptLabView.tsx`
- `frontend/src/react/features/mcp/MCPView.tsx`
- `frontend/src/react/features/security/SecurityView.tsx`
- `frontend/src/react/features/diagnostics/DiagnosticsView.tsx`
- `frontend/src/react/features/graph/GraphView.tsx`
- `frontend/src/react/features/orchestrator/OrchestratorView.tsx`
- `frontend/src/react/features/sync/SyncView.tsx`
- `frontend/src/react/features/memory/MemoryView.tsx`
- `frontend/src/react/features/git/GitView.tsx`
