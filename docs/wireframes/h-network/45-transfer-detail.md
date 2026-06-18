# 45. Transfer Detail

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** New — drawer in Sync view  
**Shell:** Drawer (480px) from Sync view

---

## Purpose

View full progress, speed, and status of an active or completed file transfer.

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                 │
│  Transfer: neurodeck-backup.zip         [✕]      │
├──────────────────────────────────────────────────┤
│  [PROGRESS ZONE]                                 │
│                                                  │
│  ████████████████████░░░░   82% complete         │
│  24.7 MB / 30.1 MB   ·   Speed: 4.2 MB/s        │
│  ETA: ~1m 24s                                    │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [METADATA]                                      │
│                                                  │
│  File       neurodeck-backup.zip                 │
│  Size       30.1 MB                              │
│  To         deck-001 (192.168.1.12)              │
│  Protocol   LAN P2P (Warpinator)                 │
│  Started    2026-06-17 15:42:03                  │
│  Checksum   SHA-256 (verified on completion)     │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [LOG]                                           │
│  15:42:03  Connected to peer                     │
│  15:42:04  Transfer started                      │
│  15:42:08  24.7 MB sent…                         │
│                                                  │
├──────────────────────────────────────────────────┤
│  [FOOTER]                                        │
│  [Pause]                             [Cancel]    │
└──────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Pause / Resume  
**IPC:** `window.neurodeck.sync.pauseTransfer(id)` / `resumeTransfer(id)`  
**Outcome:** Transfer pauses/resumes

---

## Secondary Actions

- **Cancel** — `ConfirmDialog` → `window.neurodeck.sync.cancelTransfer(id)`

---

## States

### Active Transfer
- Progress bar; ETA shown; Pause + Cancel

### Paused
- Progress bar frozen; "Resume" replaces "Pause"

### Complete
- 100% progress; "✓ Transfer complete — SHA-256 verified"
- Footer: "[Close]" only

### Failed
- `ErrorState` inline: "Transfer failed — [reason]"
- Footer: "[Retry]  [Close]"

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.sync` | `getTransfer(id)`, `pauseTransfer(id)`, `resumeTransfer(id)`, `cancelTransfer(id)` |
| WebSocket | `transfer:progress { id, bytes, total, speed }`, `transfer:complete { id }`, `transfer:error { id, reason }` |

---

## Accessibility Notes

- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`
- Speed/ETA: `aria-live="off"` (too frequent; update on milestone changes only)
- Completion: `aria-live="polite"` announces "Transfer complete"

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/sync/TransferDetailDrawer.tsx` — **New file**

Live updates via `transfer:progress` WebSocket events. `speed` is in bytes/sec; format as "X MB/s" client-side. Checksum verification happens server-side on completion; `transfer:complete` includes `{ verified: true }` flag.
