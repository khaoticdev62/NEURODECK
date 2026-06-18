# 44. Device Pairing

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** New — modal in Sync view  
**Shell:** Modal dialog from Sync view

---

## Purpose

Pair a second NEURODECK device for encrypted cross-device session and memory sync.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────┐
│  [MODAL HEADER]                                      │
│  Pair a Device                              [✕]      │
├──────────────────────────────────────────────────────┤
│  [STEP 1 — SHOW PAIRING CODE]                        │
│                                                      │
│  On the other device, open NEURODECK and go to       │
│  Sync → Pair Device, then enter this code:           │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │              4729 - B8KC                     │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Code expires in: 04:32  [↺ Regenerate]              │
│                                                      │
│  — or enter a code from the other device —          │
│                                                      │
│  [  Enter pairing code…  ] [Pair]                   │
│                                                      │
│  ─────────────────────────────────────────────────── │
│  [PAIRED DEVICES LIST]                               │
│                                                      │
│  🟢 deck-001  ·  Paired 2026-06-01  [Unpair]        │
│  🔴 desktop   ·  Last seen 5d ago   [Unpair]        │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [FOOTER]                                            │
│  [Close]                                             │
└──────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Pair (submit code from other device)  
**IPC:** `window.neurodeck.sync.pairDevice(code)`  
**Outcome:** Devices paired; encrypted sync key exchanged; device appears in list

---

## Secondary Actions

- **↺ Regenerate** — new pairing code (old code invalidated)
- **Unpair** — `ConfirmDialog` → `window.neurodeck.sync.unpairDevice(deviceId)`

---

## States

### Generating Code
- Spinner in code box while backend generates TOTP-style pairing code

### Code Ready
- Countdown timer active

### Code Expired
- Code box: "Expired" badge; "Regenerate" button prominent

### Pairing Success
- Toast "Device paired successfully"; device appears in list

### Pairing Failed
- Inline error: "Invalid or expired code. Try again."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sync` | `generatePairingCode()`, `pairDevice(code)`, `listPairedDevices()`, `unpairDevice(id)` |

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Pair a Device"`, `FocusTrapContainer`
- Pairing code: `aria-label="Pairing code: 4729 B8KC"` (readable format)
- Countdown: `role="timer"` with `aria-live="off"` (don't announce every second)

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/sync/DevicePairingModal.tsx` — **New modal component**

Pairing code is TOTP-style 8-character code generated server-side with 5-minute expiry. Key exchange uses HTTPS-encrypted sync via `sync.rs`. Paired device list persisted in `user_config_dir()/data/sync/paired_devices.json`.
