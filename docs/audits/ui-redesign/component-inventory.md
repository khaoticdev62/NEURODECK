# NEURODECK AAAA Component Inventory

> Date: 2026-06-17
> Scope: Shared React components and Design System components
> Phase: Phase 2 complete; Phase 3 pending

## Design System Components (Canonical)

Path: `frontend/src/design-system/components/`

| Component | File | Purpose | Consumers | Token Usage | Accessibility | Controller Support | Decision |
|---|---|---|---|---|---|---|---|
| `Button` | `core/Button.tsx` | Primary action button | Many | DS tokens | Focus visible, keyboard | Via focus | Keep / extend |
| `IconButton` | `core/IconButton.tsx` | Icon-only button | Many | DS tokens | `aria-label` required | Via focus | Keep |
| `Badge` | `core/Badge.tsx` | Status/count badge | Many | DS tokens | — | — | Keep |
| `Panel` | `core/Panel.tsx` | Titled content surface | Many | DS tokens | Section/heading | — | Keep |
| `Select` | `core/Select.tsx` | Dropdown select | Many | DS tokens | Label + listbox | Keyboard | Keep |
| `StatusChip` | `core/StatusChip.tsx` | Status indicator | Many | DS tokens | — | — | Keep |
| `TextInput` | `core/TextInput.tsx` | Text input | Many | DS tokens | Label, error, disabled | Keyboard | Keep |
| `Toggle` | `core/Toggle.tsx` | Switch toggle | Many | DS tokens | `role="switch"` | Keyboard | Keep |
| `Modal` | `feedback/Modal.tsx` | Modal dialog | Many | DS tokens | Focus trap, escape | B to close | Keep |
| `Toast` | `feedback/Toast.tsx` | Toast notification | Many | DS tokens | `aria-live`, `role="alert"` for error/warning | — | Keep |
| `ConfirmDialog` | `feedback/ConfirmDialog.tsx` | Confirmation dialog | Many | DS tokens | Focus trap | Yes | Keep |
| `AgentCard` | `systems/AgentCard.tsx` | Agent summary card | Agent views | DS tokens | — | — | Keep |
| `ModelCard` | `systems/ModelCard.tsx` | Model summary card | Model views | DS tokens | — | — | Keep |
| `SessionCard` | `systems/SessionCard.tsx` | Session summary card | Session views | DS tokens | — | — | Keep |

## React Adapter / Shared Components

Path: `frontend/src/react/components/`

| Component | File | Purpose | Consumers | Token Usage | Accessibility | Controller Support | Decision |
|---|---|---|---|---|---|---|---|
| `AgentCard` | `cards/AgentCard.tsx` | Legacy adapter for DS AgentCard | — | Delegates to DS | — | — | Keep as adapter |
| `ModelCard` | `cards/ModelCard.tsx` | Legacy adapter for DS ModelCard | — | Delegates to DS | — | — | Keep as adapter |
| `SessionCard` | `cards/SessionCard.tsx` | Legacy adapter for DS SessionCard | — | Delegates to DS | — | — | Keep as adapter |
| `CommandPalette` | `command/CommandPalette.tsx` | Global command palette | App shell | DS tokens | Search input, listbox | Yes | Keep / audit |
| `ControllerHintBar` | `layout/ControllerHintBar.tsx` | Deck button hint bar | Shell | DS tokens | — | N/A | Keep |
| `PrimarySidebar` | `layout/PrimarySidebar.tsx` | Main navigation | Shell | DS tokens | `aria-current` | Yes | Keep |
| `SecondaryRail` | `layout/SecondaryRail.tsx` | Context sidebar | Shell | DS tokens | Progress bar ARIA | — | Phase 2 fixed |
| `TitleBar` | `layout/TitleBar.tsx` | Window title bar | Shell | DS tokens | Window control labels | — | Phase 2 fixed |
| `OnboardingModal` + steps | `onboarding/` | First-run wizard | App shell | DS tokens | Step navigation | Yes | Keep / audit |
| `Badge` | `primitives/Badge.tsx` | Adapter for DS Badge | — | Delegates to DS | — | — | Keep as adapter |
| `Button` | `primitives/Button.tsx` | Adapter for DS Button | Many | Delegates to DS | Touch target enforced | — | Phase 2 fixed |
| `ConfirmDialog` | `primitives/ConfirmDialog.tsx` | Adapter for DS ConfirmDialog | — | Delegates to DS | — | — | Keep as adapter |
| `DeckButtonHint` | `primitives/DeckButtonHint.tsx` | Controller button hint | Many | DS tokens | — | N/A | Keep |
| `Divider` | `primitives/Divider.tsx` | Visual separator | Many | DS tokens | — | — | Keep |
| `EmptyState` | `primitives/EmptyState.tsx` | Empty state placeholder | Many | DS tokens | role + label | — | Keep |
| `ErrorState` | `primitives/ErrorState.tsx` | Error state placeholder | Many | DS tokens | role + label | — | Keep |
| `FocusTrapContainer` | `primitives/FocusTrapContainer.tsx` | Focus trap wrapper | Modals | — | Focus trap + Escape | — | Phase 2 fixed (forwardRef) |
| `FormSection` | `primitives/FormSection.tsx` | Form section wrapper | Settings | DS tokens | — | — | Keep |
| `IconButton` | `primitives/IconButton.tsx` | Adapter for DS IconButton | Many | Delegates to DS | `aria-label` required, touch target enforced | — | Keep as adapter |
| `LoadingState` | `primitives/LoadingState.tsx` | Loading spinner | Many | DS tokens | `role="status"` | — | Keep |
| `MetricCard` | `primitives/MetricCard.tsx` | Metric display card | Dashboards | DS tokens | — | — | Keep |
| `Modal` | `primitives/Modal.tsx` | Adapter for DS Modal | Many | Delegates to DS | Focus trap | — | Keep as adapter |
| `Panel` | `primitives/Panel.tsx` | Adapter for DS Panel CSS | Many | Legacy glass classes | `aria-labelledby` added | — | Phase 2 fixed |
| `PlaceholderView` | `primitives/PlaceholderView.tsx` | Placeholder screen | Unimplemented routes | DS tokens | — | — | Audit usage |
| `Select` | `primitives/Select.tsx` | Adapter for DS Select | Many | Delegates to DS | — | — | Keep as adapter |
| `Skeleton` | `primitives/Skeleton.tsx` | Loading skeleton | Many | DS tokens | `aria-busy` | — | Keep |
| `StatusChip` | `primitives/StatusChip.tsx` | Adapter for DS StatusChip | Many | Delegates to DS | — | — | Keep as adapter |
| `Tabs` | `primitives/Tabs.tsx` | Tab group | Many | DS tokens | Keyboard nav | L1/R1 | Phase 2 fixed |
| `TextInput` | `primitives/TextInput.tsx` | Adapter for DS TextInput | Many | Delegates to DS | — | — | Keep as adapter |
| `Toast` | `primitives/Toast.tsx` | Adapter/Provider for DS Toast | Many | Delegates to DS | Alert/status by tone, pause on hover/focus | — | Phase 2 fixed |
| `Toggle` | `primitives/Toggle.tsx` | Adapter for DS Toggle | Many | Delegates to DS | — | — | Keep as adapter |
| `Tooltip` | `primitives/Tooltip.tsx` | Tooltip wrapper | Many | DS tokens | — | — | Keep |
| `DiagnosticsPanel` | `systems/DiagnosticsPanel.tsx` | Diagnostics widget | Diagnostics view | DS tokens | — | — | Keep |
| `MemoryPanel` | `systems/MemoryPanel.tsx` | Memory widget | Memory view | DS tokens | — | — | Keep |
| `ChatViewport` | `workspace/ChatViewport.tsx` | Chat message list | Workspace | DS tokens | — | — | Keep |
| `InputConsole` | `workspace/InputConsole.tsx` | Chat input composer | Workspace | DS tokens | — | — | Keep |
| `ResponseCard` | `workspace/ResponseCard.tsx` | Chat response card | Workspace | DS tokens | — | — | Keep |
| `TelemetryWidget` | `workspace/TelemetryWidget.tsx` | Telemetry mini widget | Workspace | DS tokens | — | — | Keep |

## Shell (Inline in App.tsx)

The app shell is currently inlined in `frontend/src/react/App.tsx` rather than a standalone `AppShell` component. Phase 2 applied the following hardening to the inline shell:

- Removed invisible-focus `tabIndex={0}` from `#app-shell`.
- Added `FocusTrapContainer` to Controller prompt and Quick switcher overlays.
- Added `aria-activedescendant` to Quick switcher listbox.
- Normalized modal overlay z-index to `z-modal` class.

## Missing/Recommended Components

| Required Component | Status | Action |
|---|---|---|
| `AppShell` | Implicit in `App.tsx` | Consider extracting after Phase 3 if shell logic grows |
| `CustomTitleBar` | Exists as `TitleBar.tsx` | Keep |
| `NavItem` | Inline in `PrimarySidebar.tsx` | Extract if reused |
| `ScreenHeader` | Pattern exists but no standalone file | Extract if multiple screens use it |
| `Surface` | DS `Panel` covers most cases | Document mapping |
| `Tooltip` | Exists | Keep |
| `Popover` | Not found | Create if needed |
| `Drawer` | Not found | Create if needed |
| `KeyboardShortcutHint` | Not found | Create or map to `DeckButtonHint` |
| `FocusRing` | Exists as styling tokens | Verify focus ring styling is centralized |
| `Breadcrumb` | Not found | Create if needed |
| `SearchInput` | Pattern exists inside `CommandPalette` | Extract if reused |
| `SegmentedControl` | Not found | Create if needed |
| `Slider` | Not found | Create if needed |
| `Progress` | Inline in `SecondaryRail.tsx` | Extract if reused |
| `DataTable` | Not found | Create if needed |
| `LogViewer` | Not found | Create if needed |
| `TerminalFrame` | Not found; terminal uses `TerminalScreen.tsx` | Create/adapt if needed |
| `BrowserFrame` | Not found; browser uses `BrowserView.tsx` | Create/adapt if needed |
| `ChatMessage` / `ChatComposer` | Exists as `ResponseCard` / `InputConsole` | Keep |
| `PluginCard` / `ThemeCard` | Not found | Create if needed |

## Duplication Summary

The main duplication pattern is **legacy adapter + DS canonical component**. This is intentional per AGENTS.md. Adapters must stay thin and delegate fully to DS components.

## Phase 2 Files Changed

- `frontend/src/react/App.tsx`
- `frontend/src/react/components/layout/TitleBar.tsx`
- `frontend/src/react/components/layout/SecondaryRail.tsx`
- `frontend/src/react/components/primitives/FocusTrapContainer.tsx`
- `frontend/src/react/components/primitives/Toast.tsx`
- `frontend/src/react/components/primitives/Tabs.tsx`
- `frontend/src/react/components/primitives/Button.tsx`
- `frontend/src/react/components/primitives/Panel.tsx`
- `frontend/src/react/__tests__/primitives/IconButton.test.tsx`
- `frontend/src/react/__tests__/primitives/Toast.test.tsx`
