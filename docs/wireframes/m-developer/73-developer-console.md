# 73. Developer Console

**Category:** M — Developer  
**Complexity:** Tier 3  
**Status:** New (`features/developer/DevConsoleView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Live REPL for executing raw IPC commands, inspecting WebSocket events, and debugging NEURODECK internals — available only when developer mode is enabled.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Dev Console  [⚠ Developer Mode]      [─] [□] [×]      │
├──────┬──────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TABS]                                                                 │
│ Rail │  [REPL] [Events] [State] [Network]                                     │
│      ├──────────────────────────────────────────────────────────────────────────┤
│      │  === REPL TAB ===                                                        │
│      │                                                                          │
│      │  [OUTPUT — scrollable, newest at bottom]                                │
│      │  > get_config()                                                         │
│      │  ← { "llm": { "model": "gemini-2.5-flash", ... } }                     │
│      │                                                                          │
│      │  > memory_list_facts({ limit: 5 })                                      │
│      │  ← { "facts": [...] }                                                   │
│      │                                                                          │
│      │  [ERROR] 15:44:12 — unknown command: "foo"                              │
│      │                                                                          │
│      ├──────────────────────────────────────────────────────────────────────────┤
│      │  [INPUT]                                                                 │
│      │  > [invoke("command_name", { ...args })               ] [Send]          │
│      │                                                                          │
│      ├──────────────────────────────────────────────────────────────────────────┤
│      │  === EVENTS TAB ===                                                      │
│      │  Live WebSocket event log:                                              │
│      │  15:44:08  pty_output        { id: "main", data: "$ " }                │
│      │  15:44:07  telemetry:update  { cpu: 12, ram: 1200 }                    │
│      │  [Pause]  [Clear]  [Filter: All ▼]                                     │
├──────┴──────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Send  [B] Back  [X] Clear  [Y] Tab Switch            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Send  
**IPC:** `window.neurodeck[connector][command](args)` — raw execute from input  
**Outcome:** Response appended to REPL output

---

## Secondary Actions

- **Clear output** — clears REPL history (no IPC)
- **Events tab** — live event log with pause/clear/filter
- **State tab** — JSON view of current Redux-like app state snapshot
- **Network tab** — HTTP request log for all IPC bridge calls

---

## States

### Developer Mode Off
- `ErrorState` full-screen: "Developer mode is not enabled. Enable it in Feature Flags."
- Link to Feature Flags (screen 74)

### Backend Offline
- REPL input disabled; `ErrorState` banner "Backend unavailable"

---

## Security Gate

This view is **only accessible when Feature Flag `developer_mode` is `true`**.

Never show in production builds where developer mode was never enabled. Commands executed here bypass the confirmation gate (no `window.confirm`) since this is an intentional developer tool.

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| All `window.neurodeck.*` connectors | Arbitrary commands via REPL input |

---

## Accessibility Notes

- REPL output: `role="log"`, `aria-live="polite"` (new responses announced)
- Input: `role="textbox"`, `aria-label="Developer console input"`
- Tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/DevConsoleView.tsx` — **New file**

REPL input: parse JS-like syntax client-side → extract connector + command + args → call via `window.neurodeck`. Command history via `localStorage("nd:dev-console-history")` (last 100 entries), navigable with Up/Down arrow keys like a real terminal. Syntax highlighting in output via simple `<span>` colorization (no library).
