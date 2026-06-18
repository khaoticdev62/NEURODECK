# 58. Keyboard Shortcuts

**Category:** J — Settings  
**Complexity:** Tier 1  
**Status:** Partial — overlay in `App.tsx`  
**Shell:** Full-screen Modal overlay

---

## Purpose

View all keyboard shortcuts, customize bindings, and search for specific actions.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL HEADER]                                                                │
│  Keyboard Shortcuts                  [Search shortcuts…]  [✕]                 │
├──────────────────────────────────────────────────────────────────────────────── │
│  [CATEGORY TABS]                                                               │
│  [All] [Navigation] [Chat] [Terminal] [Agent] [Canvas] [System]               │
├──────────────────────────────────────────────────────────────────────────────── │
│  [SHORTCUT TABLE]                                                              │
│                                                                                │
│  Navigation                                                                    │
│  ─────────────────────────────────────────────────────────────────────────     │
│  Open Chat                           [Ctrl] + [1]            [Edit]           │
│  Open Terminal                        [Ctrl] + [2]            [Edit]           │
│  Open Agents                          [Ctrl] + [3]            [Edit]           │
│  Open Models                          [Ctrl] + [4]            [Edit]           │
│  Open Memory                          [Ctrl] + [5]            [Edit]           │
│  Command Palette                      [Ctrl] + [K]            [Edit]           │
│  Global Search                        [Ctrl] + [Shift] + [F]  [Edit]          │
│                                                                                │
│  Chat / Workspace                                                              │
│  ─────────────────────────────────────────────────────────────────────────     │
│  Send message                         [Enter]                                  │
│  New line                             [Shift] + [Enter]                        │
│  Focus prompt input                   [/]                                      │
│  New session                          [Ctrl] + [N]            [Edit]           │
│                                                                                │
│  [Reset All to Defaults]                                                       │
├──────────────────────────────────────────────────────────────────────────────── │
│  [FOOTER]                                                                      │
│  [Close]                                             [Export Shortcuts]       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Edit (per shortcut)  
**Outcome:** Row enters "press new shortcut" capture mode; Escape cancels

---

## Secondary Actions

- **Search** — live filter by action name or key combination
- **Reset All to Defaults** — `ConfirmDialog` → resets all customizations
- **Export Shortcuts** — downloads shortcuts as `.json` for backup

---

## States

### Capture Mode (editing a shortcut)
- Row shows: "Press any key combination…" with "Escape to cancel"
- Conflict detection: if key is already bound, shows "⚠ Conflicts with: [action]"

### Conflict
- `Badge` tone `warning` on the conflicting row

### Filtered / Search
- Only matching rows shown; empty search → `EmptyState` "No shortcuts match '[query]'"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getShortcuts()`, `setShortcut(action, keys)`, `resetShortcuts()` |

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Keyboard Shortcuts"`, `FocusTrapContainer`
- Shortcut table: `role="table"` / `role="row"` / `role="cell"`
- Capture mode: `aria-live="assertive"` announces "Listening for new shortcut"
- Key combination display: `<kbd>` elements for each key

---

## Developer Implementation Notes

**Path:** Extract from `App.tsx` shortcut overlay into `components/shortcuts/KeyboardShortcutsModal.tsx`

Trigger: `Ctrl+?` or `?` when not in text input. Shortcuts stored in `localStorage("nd:shortcuts")` on top of defaults. Key capture: use `keydown` event listener with `event.preventDefault()` during capture mode.
