# 72. IPC Connector Map

**Category:** M — Developer  
**Complexity:** Tier 2  
**Status:** New (`features/developer/IPCConnectorMapView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Interactive reference map of all `window.neurodeck.*` IPC connectors, their commands, WebSocket events, and current live status.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · IPC Connector Map                     [─] [□] [×]      │
├──────┬──────────────────────────────────────────┬───────────────────────────────┤
│ Nav  │  [LEFT — CONNECTOR LIST]                 │  [RIGHT — CONNECTOR DETAIL]  │
│ Rail │                                          │                               │
│      │  [Search connectors…]                    │  window.neurodeck.ai          │
│      │                                          │  AI / LLM commands            │
│      │  🟢 .ai                                  │  Status: 🟢 Online            │
│      │  🟢 .agents                              │                               │
│      │  🟢 .sessions                            │  ─────────────────────────── │
│      │  🟢 .memory                              │  [COMMANDS]                   │
│      │  🟢 .models                              │                               │
│      │  🟢 .terminal                            │  send_command(params)         │
│      │  🟢 .browser                             │  → POST /api/send_command     │
│      │  🟢 .plugins                             │                               │
│      │  🟢 .scheduler                           │  get_context_stats()          │
│      │  🟢 .sync                                │  → POST /api/get_context_stats│
│      │  🟢 .git                                 │                               │
│      │  🟢 .docs                                │  [WEBSOCKET EVENTS]           │
│      │  🟢 .diagnostics                         │                               │
│      │  🟢 .security                            │  ai:token { chunk }           │
│      │  🟢 .system                              │  ai:done { sessionId }        │
│      │  🔴 .vpn (not implemented)               │  ai:error { message }         │
│      │  🔴 .updates (not implemented)           │                               │
│      │                                          │  [▶ Test] [📋 Copy Schema]    │
├──────┴──────────────────────────────────────────┴───────────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [X] Test  [Y] Copy Schema           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Status Indicators

- 🟢 Implemented and online
- 🟡 Implemented but backend offline
- 🔴 Not yet implemented (stub)

---

## Primary Action

**Label:** ▶ Test (per command)  
**Outcome:** Opens inline test panel — enter JSON args, fire command, see raw response

---

## Secondary Actions

- **📋 Copy Schema** — copies OpenAPI-style JSON schema for the connector
- **Search** — filter connector list by name or command
- **Connector status refresh** — re-pings `/health` + connector status

---

## States

### Backend Offline
- All connectors show 🟡 status; "Backend unavailable" banner

### Stub Connector Selected
- Right panel: `EmptyState` "This connector is planned but not yet implemented."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.diagnostics` | `getConnectorStatus()`, `getConnectorSchema(name)` |

---

## Accessibility Notes

- Connector list: `role="list"` + `role="listitem"` + `aria-selected` for active item
- Status dot: `aria-label="[connector]: [status]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/IPCConnectorMapView.tsx` — **New file**

Schema data loaded from `assets/connector-schema.json` (generated from `bridgeAdapter.ts` types). Live status from `diagnostics.getConnectorStatus()`. Test panel sends live IPC calls — only available in development builds or when developer mode is enabled in Feature Flags.
