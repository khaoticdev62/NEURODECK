# 43. Sync / File Transfer

**Category:** H — Network  
**Complexity:** Tier 3  
**Status:** Exists (`features/sync/SyncView.tsx` + `features/share/ShareView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Cross-device file transfer, LAN P2P sharing via Warpinator protocol, and encrypted cross-device session sync.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Sync & Transfer                       [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TABS]                                                                 │
│ Rail │  [LAN Transfer]  [Device Sync]  [Warpinator]                           │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  === LAN TRANSFER TAB ===                                               │
│      │                                                                         │
│      │  [PEERS]                                                                │
│      │  🟢 deck-001  (192.168.1.12)  [Send Files →]                          │
│      │  🟢 desktop   (192.168.1.5)   [Send Files →]                          │
│      │  (Discovering peers via mDNS…)                                         │
│      │                                                                         │
│      │  [TRANSFER HISTORY]                                                     │
│      │  ✓ neurodeck-backup.zip → deck-001   12m ago   [Re-send]              │
│      │  ✓ canvas-export.png → desktop        1h ago    [Re-send]              │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [SEND PANEL]                                                           │
│      │  [Browse file…]  or  drag a file here                                  │
│      │  To: [Select peer ▼]                                                   │
│      │  [Send]                                                                 │
│      │                                                                         │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  === DEVICE SYNC TAB ===                                                │
│      │  (See Device Pairing — screen 44)                                      │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Send  [B] Back  [X] Select Peer  [Y] Browse File     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Send  
**IPC:** `window.neurodeck.sync.sendFile(peerId, filePath)`  
**Outcome:** File transfer begins; progress shown in Transfer History

---

## Secondary Actions

- **Refresh peers** — `window.neurodeck.sync.discoverPeers()` (mDNS)
- **Re-send** — re-initiates previous transfer
- **Device Sync tab** — cross-device encrypted sync settings and history

---

## States

### Discovering Peers
- Spinner "Discovering peers via mDNS…"
- Send panel disabled until at least one peer found

### No Peers
- `EmptyState` in peers zone: "No devices found on this network. Ensure NEURODECK is running on other devices."

### Transfer Active
- History item shows progress bar; see Transfer Detail (screen 45) for full progress drawer

### Transfer Failed
- `Badge` tone `error` on history item; "Retry" button

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.sync` | `discoverPeers()`, `sendFile(peerId, path)`, `listTransfers()` |
| `window.neurodeck.transfer` | `getWarpinatorStatus()`, `startWarpinatorService()` |
| WebSocket | `transfer:progress`, `transfer:complete`, `transfer:error` |

---

## Accessibility Notes

- Peer list: `role="list"` + `aria-live="polite"` (new peers appear dynamically)
- Transfer progress: `role="progressbar"` + `aria-live="polite"` for state changes

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/sync/SyncView.tsx` (exists)

LAN transfer uses mDNS peer discovery (`mdns-sd` pinned to `0.11` with `HashMap<String, String>` properties). Warpinator gRPC server runs on port 42000 in `transfer.rs`.
