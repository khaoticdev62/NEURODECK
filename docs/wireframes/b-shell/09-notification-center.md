# 09. Notification Center

**Category:** B — Shell  
**Complexity:** Tier 2  
**Status:** Exists (notifications overlay in `App.tsx`; needs formalization)  
**Shell:** Side Panel Overlay (slides in from right, z-40)

---

## Purpose

Show app alerts, warnings, completed actions, diagnostics events, and updates in a consolidated, dismissible panel.

---

## Primary User Goal

Review and clear alerts without losing current work.

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [PANEL HEADER]                                  │
│  🔔 Notifications              [Clear all] [✕]  │
├──────────────────────────────────────────────────┤
│  [FILTER CHIPS]                                  │
│  [All]  [Errors]  [Warnings]  [Info]  [Actions]  │
├──────────────────────────────────────────────────┤
│  [QUIET MODE TOGGLE]                             │
│  Quiet mode  ○────●  (suppress toasts)           │
├──────────────────────────────────────────────────┤
│  [NOTIFICATION LIST — scrollable]                │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🔴 ERROR                        2m ago     │  │
│  │ Plugin "bmad.lua" failed to load           │  │
│  │ [Open Diagnostics]  [Dismiss]              │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🟡 WARNING                      10m ago    │  │
│  │ Storage 85% full                           │  │
│  │ [Open Storage Manager]  [Dismiss]          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🟢 INFO                        1h ago      │  │
│  │ Session exported successfully              │  │
│  │ [Open File]  [Dismiss]                     │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Panel Header | Custom | Title "Notifications", Clear All button, Close (✕) | Sticky |
| Filter Chips | Tab chip row | All / Errors / Warnings / Info / Actions | Active chip underlined |
| Quiet Mode | `Toggle` | Suppress toast banners while center is open | Persisted to localStorage |
| Notification List | Scrollable card list | Notification cards per event | Newest first |

---

## Notification Card Structure

```
┌──────────────────────────────────────────────┐
│ [Severity dot]  [Category]       [Timestamp] │
│ [Message — 1–2 lines]                        │
│ [Action button(s)]        [Dismiss ✕]        │
└──────────────────────────────────────────────┘
```

**Severity:** error (red `●`), warning (amber `●`), info (blue `●`), success (green `●`)  
**Unread indicator:** Blue left border on unread notifications; removed on focus/hover

---

## Notification Types

| Type | Category | Typical Source | Action |
|------|----------|---------------|--------|
| Plugin load error | Error | `lua.rs` plugin loader | Open Diagnostics |
| Model unavailable | Error | LLM runtime | Open Models |
| Low storage | Warning | Storage monitor | Open Storage Manager |
| IPC disconnected | Error | bridge health poll | Retry Connection |
| Session exported | Success | Export Manager | Open File |
| Agent completed | Info | Agent runner | Open Agent Run Detail |
| Update available | Info | Update checker | Open Update Center |
| Memory limit near | Warning | Memory DB | Open Memory Manager |

---

## Primary Action

**Label:** Action buttons vary per notification  
**Outcome:** Navigates to related screen or executes the relevant action

---

## Secondary Actions

- **Clear All** — removes all notifications (with `ConfirmDialog` if any are unread errors)
- **Dismiss (✕ per card)** — removes one notification
- **Filter chip** — narrows visible notifications by severity
- **Quiet Mode toggle** — suppresses new toast banners (panel stays open)
- **Close (✕ header)** — closes the panel

---

## States

### No Notifications
- `EmptyState` compact: icon `Bell`, title "All clear", description "No alerts right now."

### Warnings Present
- Panel badge on nav footer notification icon shows count
- Warning items amber-bordered

### Critical Alert
- Error item red-bordered with `role="alert"`
- `aria-live="assertive"` fires on critical notification arrival

### Action Required
- Notification item has `Badge` tone `warning` "Action required"
- Not dismissible until action taken or explicitly skipped

### Notification Muted
- Quiet mode banner at top: "Quiet mode active — toasts suppressed"
- Incoming notifications added silently to panel

---

## IPC Dependencies

The notification center receives events pushed from the backend via WebSocket and also accumulates client-side app events:

| Event Source | Event | Condition |
|-------------|-------|-----------|
| `window.neurodeck.plugins` | `plugin:error` | Plugin load failure |
| `window.neurodeck.models` | `model:status` | Runtime health change |
| `window.neurodeck.system` | `storage:low` | Storage threshold crossed |
| `window.neurodeck.diagnostics` | `health:degraded` | Health check failure |
| Bridge WebSocket | Any fatal event | Backend push |
| Client-side | Export complete, session save, agent done | App events |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate notification cards
- **D-pad Left/Right:** Switch filter chips
- **A (confirm):** Activate focused notification's primary action button
- **B:** Close panel
- **X:** Dismiss focused notification
- **LB / RB:** Previous / next filter
- **Hint bar:** `[A] Open  [B] Close  [X] Dismiss  [LB/RB] Filter`

---

## Keyboard / Mouse Fallback

- **Tab:** Cycle through interactive elements (filter chips → notification cards → action buttons)
- **Enter / Space:** Activate focused button
- **Escape:** Close panel
- **Delete / Backspace (on card):** Dismiss focused notification

---

## Accessibility Notes

- Panel: `role="dialog"`, `aria-modal="true"`, `aria-label="Notification center"` — side panel, not full overlay
- `FocusTrapContainer` while open
- Critical notifications: `role="alert"`, `aria-live="assertive"` when added
- Standard notifications: `aria-live="polite"` region
- Unread count badge on trigger button: `aria-label="Notifications, [N] unread"`
- Dismiss buttons: `aria-label="Dismiss: [notification message]"`
- Filter chips: `role="tab"` pattern with `aria-selected`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/notifications/NotificationCenter.tsx` (formalize existing overlay)

**Notification data model:**
```typescript
interface AppNotification {
  id: string
  severity: "error" | "warning" | "info" | "success"
  category: string
  message: string
  timestamp: number
  read: boolean
  actions?: Array<{ label: string; action: () => void }>
  dismissible: boolean
}
```

**State:** `state.notifications: AppNotification[]` in global state; add to `NeuroDeckAction` union

**Trigger:** Notification icon in `PrimarySidebar` footer → `dispatch({ type: "toggle-notifications" })`

**Quiet mode:** `localStorage("nd:quiet-mode")` boolean — checked by toast system before displaying banners

**Badge count:** `state.notifications.filter(n => !n.read).length` — shown on nav icon
