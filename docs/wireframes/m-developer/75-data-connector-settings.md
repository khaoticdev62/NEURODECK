# 75. Data Connector Settings

**Category:** M — Developer  
**Complexity:** Tier 2  
**Status:** New (`features/developer/DataConnectorsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Configure external data integrations — third-party API connections, webhook endpoints, and data source bindings used by agents and workflows.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Data Connectors                       [─] [□] [×]      │
├──────┬──────────────────────────────────────────┬───────────────────────────────┤
│ Nav  │  [LEFT — CONNECTOR LIST]                 │  [RIGHT — CONNECTOR CONFIG]  │
│ Rail │                                          │                               │
│      │  [+ Add Connector]                       │  GitHub Connector            │
│      │                                          │  ─────────────────────────── │
│      │  🟢 GitHub API                           │  Status: 🟢 Connected        │
│      │  🟡 Notion (token expired)               │  Last synced: 2m ago         │
│      │  🔴 Slack (not configured)               │                               │
│      │                                          │  Configuration               │
│      │                                          │  Base URL                    │
│      │                                          │  https://api.github.com      │
│      │                                          │                               │
│      │                                          │  API Token                   │
│      │                                          │  [●●●●●●●●●●●●] [👁 Reveal] │
│      │                                          │                               │
│      │                                          │  Scopes (read-only shown)    │
│      │                                          │  repo, read:user, read:org   │
│      │                                          │                               │
│      │                                          │  Use in:                     │
│      │                                          │  ☑ Agent tools               │
│      │                                          │  ☑ Workflow steps            │
│      │                                          │  ☐ Memory auto-tagging       │
│      │                                          │                               │
│      │                                          │  [Test Connection] [Delete]  │
├──────┴──────────────────────────────────────────┴───────────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [X] Add  [Y] Test                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Test Connection  
**IPC:** `window.neurodeck.system.testDataConnector(id)`  
**Outcome:** Live API call; shows "✓ Connected" or error

---

## Secondary Actions

- **+ Add Connector** — opens connector template picker → config form
- **👁 Reveal token** — 10s auto-mask
- **Delete** — `ConfirmDialog` → `window.neurodeck.system.deleteConnector(id)`
- **Save changes** — writes updated config

---

## States

### No Connectors
- `EmptyState` variant `action`: "No data connectors configured. Connect external APIs to use them in agents and workflows."
- Action: "+ Add Connector"

### Token Expired (🟡)
- Right panel: `Banner` tone `warning` "Token expired — re-enter API credentials"

### Test Failed
- Inline `ErrorState` with HTTP error code and message

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `listConnectors()`, `getConnector(id)`, `saveConnector(config)`, `testDataConnector(id)`, `deleteConnector(id)` |

---

## Accessibility Notes

- Connector list: `role="list"` / `role="listitem"` / `aria-selected`
- Status: `aria-label="[connector]: [status]"`
- Token reveal: `aria-label="Reveal API token"` + timer countdown `aria-live="polite"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/DataConnectorsView.tsx` — **New file**

Connector API tokens stored in OS keychain via `secrets.rs`. Connector metadata (name, base URL, scopes, enabled features) stored in `user_config_dir()/data/connectors.json`. Connector templates (GitHub, Notion, Slack, generic HTTP) defined in `assets/connector-templates.json`.
