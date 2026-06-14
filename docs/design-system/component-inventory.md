# NEURODECK Component Inventory

All reusable primitives live in `frontend/src/react/components/primitives/`.

---

## Primitive Components

| Component | File | Status | Notes |
|---|---|---|---|
| `Badge` | `Badge.tsx` | Active | Status chips and labels |
| `Button` | `Button.tsx` | Active | Primary / secondary / ghost variants |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Active | Accessible confirmation modal with focus trap |
| `DeckButtonHint` | `DeckButtonHint.tsx` | Active | Steam Deck gamepad button hint overlay |
| `Divider` | `Divider.tsx` | Active | Horizontal rule with optional label |
| `EmptyState` | `EmptyState.tsx` | Active | Centered icon + title + description for empty views |
| `ErrorState` | `ErrorState.tsx` | Active | Error display with retry action |
| `FocusTrapContainer` | `FocusTrapContainer.tsx` | Active | Traps focus for modals/drawers |
| `FormRow` | `FormRow.tsx` | Active | Label + input row with error slot |
| `FormSection` | `FormSection.tsx` | Active | Grouped form fields with heading |
| `IconButton` | `IconButton.tsx` | Active | Icon-only button with accessible name |
| `LoadingState` | `LoadingState.tsx` | Active | Spinner + message for async states |
| `MetricCard` | `MetricCard.tsx` | Active | Stat card: label + value + optional delta |
| `Modal` | `Modal.tsx` | Active | Full accessible modal: role, title, focus trap, backdrop |
| `Panel` | `Panel.tsx` | Active | Glassmorphism surface card |
| `PlaceholderView` | `PlaceholderView.tsx` | Active | Stub view for unimplemented features |
| `Select` | `Select.tsx` | Active | Styled native select with label |
| `Skeleton` | `Skeleton.tsx` | Active | Content placeholder shimmer |
| `StatusChip` | `StatusChip.tsx` | Active | Color-coded status pill |
| `Tabs` | `Tabs.tsx` | Active (new) | ARIA-compliant tabs: TabGroup / TabList / Tab / TabPanels / TabPanel |
| `TextInput` | `TextInput.tsx` | Active | Labeled text input with error state |
| `Toast` | `Toast.tsx` | Active | Transient notification with live region announcement |
| `Toggle` | `Toggle.tsx` | Active | Accessible toggle switch (role=switch) |
| `Tooltip` | `Tooltip.tsx` | Active | Hover/focus tooltip via Radix or custom |

---

## Layout Components

Located in `frontend/src/react/components/layout/`:

| Component | File | Notes |
|---|---|---|
| `NeurodeckShell` | `NeurodeckShell.tsx` | Root app shell — title bar, sidebar, main content area, skip link |
| `PrimarySidebar` | `PrimarySidebar.tsx` | Left nav with view buttons, #settings-btn, #notif-btn, #command-palette-btn |
| `TitleBar` | `TitleBar.tsx` | Electron custom title bar |

---

## Tabs Primitive Usage

```tsx
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '../primitives/Tabs';

<TabGroup value={activeTab} onChange={setActiveTab} className="flex h-full flex-col">
  <TabList aria-label="Section navigation" className="flex gap-1 border-b border-nd-text-muted/15">
    <Tab value="overview" className="..." activeClassName="text-nd-accent" inactiveClassName="text-nd-text-muted">
      Overview
    </Tab>
    <Tab value="settings" className="..." activeClassName="text-nd-accent" inactiveClassName="text-nd-text-muted">
      Settings
    </Tab>
  </TabList>
  <TabPanels className="flex-1 overflow-auto p-4">
    <TabPanel value="overview"><OverviewContent /></TabPanel>
    <TabPanel value="settings"><SettingsContent /></TabPanel>
  </TabPanels>
</TabGroup>
```

ARIA contract:
- `TabList` renders `role="tablist"` with Arrow key navigation
- `Tab` renders `role="tab"` with `aria-selected`, `aria-controls`, roving `tabIndex`
- `TabPanel` renders `role="tabpanel"` with `aria-labelledby`, `tabIndex={0}`
- IDs are auto-generated via `useId()` in `TabGroup` — no manual id management needed

---

## EmptyState Usage

```tsx
import { EmptyState } from '../primitives/EmptyState';
import { BookOpen } from 'lucide-react';

<EmptyState
  icon={BookOpen}
  title="No documents indexed"
  description="Add a folder path to start indexing your documentation."
/>
```

The icon receives `aria-hidden="true"` automatically. Title renders as a heading, description as muted paragraph.

---

## Accessibility Notes

- `Modal` and `ConfirmDialog` use `FocusTrapContainer` — focus cannot escape while open.
- `Toast` components emit to a `role="status"` live region for screen reader announcements.
- `IconButton` always requires an `aria-label` prop (enforced by TypeScript).
- `Toggle` uses `role="switch"` with `aria-checked`.
- `EmptyState` icons use `aria-hidden="true"` to suppress decorative icon from screen readers.
