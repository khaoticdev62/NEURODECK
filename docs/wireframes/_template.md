# [##]. [Screen Name]

**Category:** [A–N]  
**Complexity:** [Tier 1 | Tier 2 | Tier 3]  
**Status:** [Exists | Partial | New]  
**Shell:** [Full App Shell | Full-Screen Override | Overlay / Drawer]

---

## Purpose

One sentence describing what this screen does.

---

## Primary User Goal

The single most important action the user wants to complete here.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · [Screen Title]                        [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────┬───────────────────┤
│ Nav  │                                                     │  Context Rail     │
│ Rail │  [SCREEN HEADER ZONE]                               │  (optional)       │
│      │  Title · Eyebrow · Primary Action Button            │                   │
│      ├─────────────────────────────────────────────────────┤                   │
│      │                                                     │                   │
│      │  [MAIN CONTENT ZONE]                                │                   │
│      │  (scrollable)                                       │                   │
│      │                                                     │                   │
│      ├─────────────────────────────────────────────────────┤                   │
│      │  [ACTION BAR ZONE]                                  │                   │
│      │  Secondary actions / status                         │                   │
├──────┴─────────────────────────────────────────────────────┴───────────────────┤
│ ControllerHintBar · [A] Confirm  [B] Back  [X] Action  [Y] Menu               │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Screen Header | `Panel` eyebrow + title | Title, eyebrow label, primary action | Sticky at top |
| Main Content | `Panel` body, `EmptyState`, list | Core data/controls | Scrollable |
| Action Bar | `Button` row | Secondary actions | Fixed bottom of content area |
| Context Rail | `SecondaryRail` panels | Related context | Optional; hidden on compact |

---

## Primary Action

**Label:** [Button text]  
**IPC:** `window.neurodeck.[namespace].[command]()`  
**Outcome:** [What happens]

---

## Secondary Actions

- [Action label] — [what it does]
- [Action label] — [what it does]

---

## States

### Loading
- Skeleton shimmer on main content area
- Primary action button disabled
- Status: "Loading…" in header eyebrow

### Empty
- `EmptyState` (variant: `deck`) centered in main content
- Icon: [Lucide icon name]
- Title: "[Empty state title]"
- Description: "[One-line explanation]"
- Action: `Button` variant `primary` → "[Primary empty action]"

### Populated / Ready
- [Describe what the screen looks like with data]

### Error
- `ErrorState` banner at top of main content
- `onRetry` → re-calls IPC command
- `onClose` → dismisses banner, shows last known state

### Permission Required
- `EmptyState` with `ShieldAlert` icon
- Title: "Permission Required"
- Description: "[Which permission and why]"
- Action: `Button` → opens Settings › [relevant section]

### IPC Disconnected / Runtime Unavailable
- `ErrorState` full-height
- Title: "Backend Unavailable"
- Message: "Cannot reach `window.neurodeck.[namespace]`"
- Action: "Retry Connection" → re-polls `/health`

---

## IPC Dependencies

| Connector | Commands Used | Event / Stream |
|-----------|--------------|---------------|
| `window.neurodeck.[namespace]` | `[command]` | `[event_name]` |

---

## Controller Navigation

- **D-pad / Left stick:** Navigate list items
- **A (confirm):** [Primary action]
- **B (back/cancel):** Navigate back / close drawer
- **X:** [Secondary action]
- **Y:** [Tertiary action / menu]
- **LB / RB:** Switch tabs (if tabbed)
- **LT / RT:** Scroll page
- **Hint bar:** `[A] [action]  [B] Back  [X] [action]  [Y] [action]`

---

## Keyboard / Mouse Fallback

- **Tab:** Move focus through interactive elements in DOM order
- **Arrow keys:** Navigate within list / tab group
- **Enter / Space:** Activate focused control
- **Escape:** Close drawer / modal / overlay
- **Ctrl+F / Cmd+F:** Focus search input (if present)

---

## Accessibility Notes

- Landmark: `<main>` wraps content area; `<nav>` for tab/section navigation
- Live region: `aria-live="polite"` on status/result area
- Focus management: On open, focus moves to first interactive element; on close, returns to trigger
- All icon-only buttons have `aria-label`
- Loading state: `aria-busy="true"` on content area

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/[category]/[ScreenName]View.tsx` ← [Exists | Partial | New]

**Reuse:**
- `Panel` for all content zones
- `EmptyState` (variant `deck`) for zero-data
- `ErrorState` with `onRetry` for fetch failures
- `Tabs` compound component for tabbed sections
- `Button` / `IconButton` for all actions
- `StatusChip` for status badges

**State:** Extend `useNeuroDeckState` or use local `useState` + `useEffect` for data fetching

**Key IPC to wire:**
```typescript
// Load data
const data = await window.neurodeck.[namespace].[command]()

// Listen for updates
window.neurodeck.[namespace].on('[event]', handler)
```

**New nav entry (if new view):** Add to `PrimarySidebar` nav group in `frontend/src/react/components/layout/PrimarySidebar.tsx`
