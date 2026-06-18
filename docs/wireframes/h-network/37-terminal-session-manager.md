# 37. Terminal Session Manager

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** Partial (tab strip inside `TerminalView.tsx`)  
**Shell:** Drawer from Terminal view

---

## Purpose

View, rename, switch, and close all active PTY and SSH terminal sessions.

---

## Layout Zones

```
┌───────────────────────────────────────────────┐
│  [DRAWER HEADER]                              │
│  Terminal Sessions                   [✕]      │
├───────────────────────────────────────────────┤
│  [SESSION LIST]                               │
│                                               │
│  🟢 Shell 1 · bash · PID 14234              │
│     main_pty_session · Active                 │
│     [Switch] [Rename] [Kill]                  │
│                                               │
│  🟢 Shell 2 · bash · PID 14891              │
│     shell2_pty_session · Active               │
│     [Switch] [Rename] [Kill]                  │
│                                               │
│  🔵 SSH: dev-box · ssh user@192.168.1.5      │
│     ssh_session_1718636400 · Connected        │
│     [Switch] [Rename] [Kill]                  │
│                                               │
│  🔴 Shell 3 · exited (code 1)               │
│     shell3_pty_session · Exited               │
│     [Restart] [Remove]                        │
│                                               │
├───────────────────────────────────────────────┤
│  [FOOTER]                                     │
│  [+ New Shell]   [+ New SSH Session]          │
└───────────────────────────────────────────────┘
```

---

## Status Indicators

- 🟢 — active PTY
- 🔵 — SSH connected
- 🟡 — connecting
- 🔴 — exited / error

---

## Primary Action

**Label:** Switch (per session)  
**IPC:** `dispatch({ type: "set-active-pty-tab", sessionId })`  
**Outcome:** Terminal view switches to that session tab; drawer closes

---

## Secondary Actions

- **Rename** — inline rename via `contenteditable` span; Enter to confirm
- **Kill** — `ConfirmDialog` → `window.neurodeck.terminal.pty_kill(id)`
- **Restart** — `pty_kill` → 150ms → `pty_spawn` (same ID)
- **Remove** — removes exited session from list (no IPC needed)
- **+ New Shell** — `pty_spawn` with new unique ID
- **+ New SSH Session** — opens SSH connection form inline

---

## States

### Loading
- `Skeleton` × 2

### No Sessions
- `EmptyState`: "No terminal sessions. Start a new shell." → "New Shell" button

### All Exited
- All items show 🔴 status; prominent "Restart All" action at footer

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.terminal` | `listSessions()`, `pty_spawn(id, args)`, `pty_kill(id)` |

---

## Accessibility Notes

- List: `role="list"` / `role="listitem"`
- Status icons: `aria-label="[status]: [session name]"` on the badge
- Kill/Restart: `aria-label="Kill session: [name]"` etc.

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/terminal/TerminalSessionManager.tsx` — **New drawer component** triggered from terminal header button.

Session list is derived from shared `ptyState.sessions` map already maintained in `TerminalView.tsx`.
