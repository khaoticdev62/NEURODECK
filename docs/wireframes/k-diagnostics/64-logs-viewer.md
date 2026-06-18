# 64. Logs Viewer

**Category:** K — Diagnostics  
**Complexity:** Tier 2  
**Status:** New (`features/diagnostics/LogsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

View, filter, search, and export NEURODECK application logs (Rust backend + Electron frontend).

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Logs                                  [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TOOLBAR]                                                              │
│ Rail │  [Search logs…]  [Level: All ▼]  [Category: All ▼]  [↺ Live]  [↓ Export] │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [LOG TABLE]                                                            │
│      │                                                                         │
│      │  Timestamp        Level    Category    Message                          │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  15:43:12.847     INFO     pty         PTY session spawned: main_pty_session │
│      │  15:43:12.291     DEBUG    bridge      POST /api/pty_spawn → 200        │
│      │  15:43:11.003     WARN     llm         Embedding skipped: empty vector  │
│      │  15:42:58.771     ERROR    memory      Failed to write memory item: disk full │
│      │  15:42:47.120     INFO     session     Session saved: "RAG research"   │
│      │                                                                         │
│      │  [Log count: 2,441]  [Oldest: 15:30:01]  [Newest: 15:43:12]           │
│      │                                                                         │
│      │  [LOAD MORE — 50 more entries]                                          │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Copy  [B] Back  [X] Filter  [Y] Export               │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level Color Coding

- `ERROR` — `--nd-status-error` (red)
- `WARN` — `--nd-status-warning` (amber)
- `INFO` — `--nd-text-secondary`
- `DEBUG` — `--nd-text-muted`

---

## Primary Action

**Label:** ↓ Export  
**IPC:** `window.neurodeck.diagnostics.exportLogs(filter)` → downloads log file  
**Outcome:** `.log` or `.json` file downloaded

---

## Secondary Actions

- **Search** — live text filter (client-side for loaded entries; server-side search for deeper search)
- **Level filter** — ERROR / WARN / INFO / DEBUG
- **Category filter** — pty, bridge, llm, memory, session, lua, agent, etc.
- **↺ Live** — toggle live-tail mode (new log entries appended in real time via WebSocket)
- **Copy row** — copies single log entry to clipboard

---

## States

### Empty (no logs)
- `EmptyState` info: "No logs found. Logs are generated as you use NEURODECK."

### Live Mode Active
- "↺ Live" button highlighted; new log rows slide in at top; auto-scroll to newest

### Live Mode Paused (user scrolled up)
- Banner: "Live paused — scroll to bottom to resume" with [Resume] button

### Search Active
- Matching terms highlighted in log message column

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.diagnostics` | `getLogs(filter, offset, limit)`, `exportLogs(filter)` |
| WebSocket | `log:entry { ts, level, category, message }` (live mode) |

---

## Accessibility Notes

- Log table: `role="log"` with `aria-live="polite"` in live mode (or `"off"` when paused)
- Table: `role="table"` / `role="columnheader"` / `role="cell"`
- Error rows: `aria-label="Error: [message]"` so screen readers flag severity
- **Security:** Logs must be pre-filtered server-side to redact API keys, session tokens, and passwords before returning to frontend

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/diagnostics/LogsView.tsx` — **New file**

Logs stored in `user_config_dir()/logs/`. Backend returns paginated log entries (50 per page). Live mode: subscribe to `log:entry` WebSocket event. Redaction happens in Rust before the log entry is emitted — never log API keys or request bodies.
