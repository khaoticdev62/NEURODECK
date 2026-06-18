# 54. Privacy Center

**Category:** J — Settings  
**Complexity:** Tier 2  
**Status:** Partial (`features/settings/panels/PrivacyPanel.tsx`)  
**Shell:** Full App Shell (Settings sub-view)

---

## Purpose

Control all privacy-related settings: telemetry, chat history retention, memory auto-save, and data export/deletion.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Privacy Center                        [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Privacy Center                                                        │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │                                                                         │
│      │  [TELEMETRY]                                                            │
│      │  Share anonymous usage statistics                    [Toggle: Off]     │
│      │  Help improve NEURODECK without sending any         ↑ off by default   │
│      │  personal data, chat content, or API keys.                             │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [CHAT & SESSION DATA]                                                  │
│      │  Save chat history                                  [Toggle: On]       │
│      │  Auto-save memory from conversations               [Toggle: On]        │
│      │  Include session data in backups                   [Toggle: On]        │
│      │  Session retention period                           [30 days ▼]        │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [PRIVACY MODE]                                                         │
│      │  Enable Privacy Mode                               [Toggle: Off]       │
│      │  When on: masks memory content in UI; disables                         │
│      │  auto-memory save; hides session names.                                │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [DATA ACTIONS]                                                         │
│      │  [↓ Export All My Data]    [🗑 Delete All Sessions]    [🗑 Wipe Memory] │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Toggle  [B] Back  [X] Export  [Y] Privacy Mode       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Toggle (per setting)  
**IPC:** `window.neurodeck.system.saveSetting(key, value)`  
**Outcome:** Setting saved; immediate effect (memory masking, auto-save, etc.)

---

## Secondary Actions

- **↓ Export All My Data** — `window.neurodeck.system.exportUserData()` → downloads zip
- **🗑 Delete All Sessions** — `ConfirmDialog` (critical) → `window.neurodeck.sessions.deleteAll()`
- **🗑 Wipe Memory** — `ConfirmDialog` (critical): "Delete all 347 memory items permanently?" → `window.neurodeck.memory.wipeAll()`

---

## States

### Privacy Mode Active
- Top-of-page `Banner` component (tone `info`): "Privacy Mode active — memory is masked and auto-save is disabled."
- Memory and session sections show masked/disabled indicators

### Telemetry On
- Additional bullet list: "What we collect: app crash reports, feature usage counts" (no chat content, no personal data)

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getSettings()`, `saveSetting(key, val)`, `exportUserData()` |
| `window.neurodeck.sessions` | `deleteAll()` |
| `window.neurodeck.memory` | `wipeAll()` |

---

## Accessibility Notes

- Toggles: `role="switch"`, `aria-checked`, `aria-label="[setting name]"`
- Destructive buttons: `aria-label="Delete all sessions — this cannot be undone"`
- `ConfirmDialog` for destructive actions: `role="alertdialog"`, Cancel focused by default

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/settings/panels/PrivacyPanel.tsx` (exists — make standalone navigable view)

Privacy Mode toggle: immediately writes `privacy_mode: true` to config; memory list component reads this flag and masks content. Auto-save toggle also reads this flag.

Telemetry is off by default. If turned on, only sends anonymous counters — never chat content, API keys, or personal data.
