# 56. Permissions Manager

**Category:** J — Settings  
**Complexity:** Tier 1  
**Status:** New (`features/security/PermissionsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Review and manage OS-level permissions granted to NEURODECK — file system, clipboard, microphone, notifications.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Permissions                           [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Permissions Manager                                                    │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │                                                                         │
│      │  [FILE SYSTEM]                                                          │
│      │  🟢 Read: ~/projects/neurodeck (Granted)            [Revoke]           │
│      │  🟡 Write: ~/Downloads (Limited)                    [Expand]           │
│      │  🔴 Read: /etc/hosts (Denied)                       [Request]          │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [CLIPBOARD]                                                            │
│      │  🟢 Read clipboard (Granted)                        [Revoke]           │
│      │  🟢 Write clipboard (Granted)                       [Revoke]           │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [MICROPHONE]                                                           │
│      │  🔴 Microphone access (Denied)   Used for voice input  [Request]       │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [NOTIFICATIONS]                                                        │
│      │  🟢 System notifications (Granted)                  [Revoke]           │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [NETWORK]                                                              │
│      │  🟢 Outbound connections (Granted) — AI APIs, updates                  │
│      │  🟢 Local binding port 9477 (Granted)                                  │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Request  [B] Back  [X] Revoke  [Y] Refresh           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Status Indicators

- 🟢 Granted — full access
- 🟡 Limited — partial or scoped
- 🔴 Denied — not granted; app functionality affected

---

## Primary Action

**Label:** Request (per denied permission)  
**IPC:** `window.neurodeck.system.requestPermission(type)` → triggers OS permission dialog  
**Outcome:** OS dialog shown; permission list refreshes after response

---

## Secondary Actions

- **Revoke** — `window.neurodeck.system.revokePermission(type)` (where supported by OS)
- **Refresh** — re-checks all permission states
- **Expand** — requests broader access for limited permissions

---

## States

### All Granted
- No 🔴 entries; "All permissions granted" summary at top

### Action Required
- `Banner` tone `warning`: "[N] permissions need attention"

### Unavailable on OS
- Some permissions not applicable on current OS — shown as "N/A" instead of status icon

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getPermissions()`, `requestPermission(type)`, `revokePermission(type)` |

---

## Accessibility Notes

- Permission rows: `role="listitem"`; status icon has `aria-label="Permission [status]: [name]"`
- Request/Revoke: `aria-label="Request [permission name] access"` / `aria-label="Revoke [permission name] access"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/security/PermissionsView.tsx` — **New file**

Permission model is informational on most platforms — actual OS permission dialogs are triggered via Electron's `systemPreferences.askForMediaAccess()` (macOS) or shown as guidance (Windows/Linux). Backend reports what it knows about its own access rights.
