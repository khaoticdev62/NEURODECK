# 36. Terminal

**Category:** H — Network  
**Complexity:** Tier 3  
**Status:** Exists (`features/terminal/TerminalView.tsx` + `TerminalScreen.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Full PTY shell sessions with multi-tab support, xterm.js rendering, and SSH integration.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Terminal                              [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TAB STRIP]                                                            │
│ Rail │  [⊕] [Shell 1 ×] [Shell 2 ×] [SSH: dev-box ×]  [+ New Tab]           │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [TERMINAL CANVAS — xterm.js fills 100%]                               │
│      │                                                                         │
│      │  user@machine:~/projects/neurodeck$                                    │
│      │  ▌                                                                     │
│      │                                                                         │
│      │  (xterm.js PTY output — monospace, themed)                             │
│      │                                                                         │
│      │                                                                         │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [STATUS BAR]                                                           │
│      │  Session: main_pty_session  ·  bash  ·  PID 14234  ·  [↺ Restart]    │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Input Mode  [B] Back  [X] Autocomplete  [☰] New Tab  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Tab Strip | Custom tab bar | PTY tabs + SSH tabs | `role="tablist"` |
| Terminal Canvas | `<div id="xterm-container">` | xterm.js Terminal instance | Full canvas; no overflow clip |
| Status Bar | `<footer>` | Session ID, shell, PID, restart | 32px height |

---

## Primary Action

**Label:** Input (direct typing into xterm)  
**IPC:** WebSocket `pty:input` → `{ id, data }`  
**Outcome:** Keystrokes forwarded to PTY

---

## Secondary Actions

- **+ New Tab** — `pty_spawn` (new session ID)
- **↺ Restart** — `pty_kill` → 150ms delay → `pty_spawn` (same session ID)
- **[X] Autocomplete** — trigger `get_autocomplete_suggestions(session_id, prefix)`
- **SSH tab** — spawns ssh session via `pty_spawn` with `args: ["ssh", "user@host"]`

---

## States

### Connecting
- Status: "Connecting…" spinner
- Canvas blank

### Active
- xterm.js renders PTY output; cursor blinks

### Session Exited
- Banner: "Process exited with code 0. [↺ Restart]"
- Canvas output still visible

### SSH Disconnected
- Banner: "SSH connection lost. [↺ Reconnect]"

### IPC Disconnected
- Banner: `ErrorState` "Backend Unavailable — PTY bridge offline"

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.terminal` | `pty_spawn(id, args)`, `pty_kill(id)`, `pty_input(id, data)`, `get_autocomplete_suggestions(id, prefix)` |
| WebSocket | `pty_output { id, data }`, `pty_exit { id, code }` |

---

## Controller Navigation

- **D-pad / Left stick** — scroll terminal history (up/down)
- **[A]** — enter gamepad input mode (virtual keyboard / DeckCode)
- **[B]** — exit terminal, return to previous view
- **[X]** — trigger autocomplete
- **[☰]** — new tab menu
- **Hint bar**: `[A] Input  [B] Back  [X] Complete  [☰] New Tab`

---

## Keyboard / Mouse Fallback

- Direct typing forwards to PTY
- `Ctrl+Shift+T` — new tab
- `Ctrl+Shift+W` — close current tab
- `Ctrl+Shift+C` — copy selection
- `Ctrl+Shift+V` — paste

---

## Accessibility Notes

- Terminal: `role="application"` on xterm container; xterm.js has built-in screen reader announcements
- Tab strip: `role="tablist"` / `role="tab"` / `aria-selected`
- Status bar announcements: `aria-live="polite"` for session exit/restart

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/terminal/TerminalView.tsx` (exists)

Multiple sessions in `PtyState.sessions` keyed by session ID. Main session: `"main_pty_session"`. SSH sessions: `"ssh_session_[timestamp]"`.

**CRITICAL:** always `pty_kill` before `pty_spawn` for the same ID. Allow 150ms delay between kill and spawn.
