# 55. Security Center

**Category:** J — Settings  
**Complexity:** Tier 2  
**Status:** Exists (`features/security/SecurityView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Manage API key storage, keychain health, app lock settings, and security audit log.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Security                              [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Security Center                                                        │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  [KEYCHAIN STATUS]                                                      │
│      │  🟢 OS Keychain: Available (Windows Credential Locker)                 │
│      │  API keys are stored securely in the system keychain.                  │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [STORED SECRETS]                                                       │
│      │                                                                         │
│      │  Gemini API Key        [● STORED]  [👁 Reveal] [Rotate] [Delete]       │
│      │  HuggingFace Token     [● STORED]  [👁 Reveal] [Rotate] [Delete]       │
│      │  Kimi API Key          [○ NOT SET]             [+ Add]                 │
│      │  OpenAI Compat Key     [○ NOT SET]             [+ Add]                 │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [APP LOCK]                                                             │
│      │  Require PIN to open NEURODECK               [Toggle: Off]            │
│      │  Set/Change PIN                                               [→]      │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [AUDIT LOG]                                                            │
│      │  API key accessed · 2m ago · Workspace chat                            │
│      │  API key accessed · 1h ago · Workspace chat                            │
│      │  Key rotated (Gemini) · 2026-06-17                                     │
│      │  [View Full Log →]                                                      │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Reveal  [B] Back  [X] Add Key  [Y] View Log          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** 👁 Reveal (per key)  
**IPC:** `window.neurodeck.security.getApiKey(provider)` — key auto-masks after 10 seconds  
**Outcome:** Key revealed in place for 10s, then re-masked

---

## Secondary Actions

- **Rotate** — clears current key; opens Add flow with new input
- **Delete** — `ConfirmDialog` (critical) → `window.neurodeck.security.deleteApiKey(provider)`
- **+ Add** — inline input field + Save; `window.neurodeck.security.saveApiKey(provider, key)`
- **View Full Log →** — navigates to Logs Viewer (screen 64) filtered by `category=security`

---

## States

### Keychain Unavailable
- `ErrorState` at top: "OS Keychain unavailable — API keys cannot be stored securely. Check system keyring service."
- Add / Reveal actions disabled

### Reveal Active
- Key shown as plain text; countdown "Re-masking in 8s…"
- Clipboard copy auto-clears after 60s

### PIN Active
- App Lock toggle shows "On"; Set/Change PIN leads to 4-digit numeric input flow

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.security` | `getKeychainStatus()`, `getApiKey(provider)`, `saveApiKey(provider, key)`, `deleteApiKey(provider)`, `getAuditLog(limit)` |

---

## Accessibility Notes

- Reveal button: `aria-label="Reveal [provider] API key"` + `aria-expanded` while revealed
- Re-mask countdown: `aria-live="polite"` announces "Re-masking in 5 seconds"
- Audit log entries: `role="list"` / `role="listitem"` with accessible timestamps

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/security/SecurityView.tsx` (exists)

`keyring` pinned to `2.3` — uses `delete_password()` (not `delete_credential()` from v3.x). Key reveal: `getApiKey()` returns plain text; frontend sets 10s `setTimeout` to re-mask; DO NOT store key in component state longer than needed.
