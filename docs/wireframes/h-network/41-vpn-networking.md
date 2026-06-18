# 41. VPN / Networking

**Category:** H — Network  
**Complexity:** Tier 2  
**Status:** New (`features/network/VPNView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Manage VPN connections, view network status, and configure network profiles for SteamOS and desktop environments.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Network                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]                                                               │
│ Rail │  Network & VPN                                                          │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [STATUS SUMMARY]                                                       │
│      │  🌐 Connected · 192.168.1.45 · Wi-Fi: NeuroDeck-5G                    │
│      │  🔒 VPN: Off                                                            │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [VPN PROFILES]                                                         │
│      │  WireGuard — Home Server                                               │
│      │  wg0 · 10.0.0.1                        [▶ Connect]  [✎] [🗑]          │
│      │                                                                         │
│      │  OpenVPN — Work                                                         │
│      │  udp:1194                               [▶ Connect]  [✎] [🗑]          │
│      │                                                                         │
│      │  [+ Add VPN Profile]                                                    │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [TUNNEL STATUS]                                                        │
│      │  SteamOS Game Mode bridge                                               │
│      │  TCP Tunnel: Port 9477 ↔ Port 9477    [🟢 Active]  [Stop]             │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Connect  [B] Back  [X] Add Profile  [Y] Status       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ▶ Connect (per VPN profile)  
**IPC:** `window.neurodeck.vpn.connect(profileId)`  
**Outcome:** VPN connection initiated; status updates to "Connecting…" → "Connected"

---

## Secondary Actions

- **✎ Edit profile** — opens Network Profiles editor (screen 42) for this profile
- **🗑 Delete profile** — `ConfirmDialog` → `window.neurodeck.vpn.deleteProfile(id)`
- **+ Add VPN Profile** — opens Network Profiles create form (screen 42)
- **Stop / Start tunnel** — `window.neurodeck.system.stopTunnel()` / `startTunnel()`

---

## States

### VPN Disconnected
- Profile row: "[▶ Connect]" button active

### VPN Connecting
- Profile row: spinner "Connecting…"; Connect button disabled

### VPN Connected
- Profile row: "[■ Disconnect]" replaces Connect; IP shown in status summary
- Status summary: 🔒 VPN: [profile name] · [vpn_ip]

### VPN Error
- `ErrorState` inline: "Connection failed — [reason]" + Retry

### No Profiles
- `EmptyState`: "No VPN profiles configured. Add a profile to get started."

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.vpn` | `listProfiles()`, `connect(id)`, `disconnect(id)`, `deleteProfile(id)` |
| `window.neurodeck.system` | `getNetworkStatus()`, `startTunnel()`, `stopTunnel()`, `getTunnelStatus()` |
| WebSocket | `vpn:connected`, `vpn:disconnected`, `vpn:error` |

---

## Accessibility Notes

- Connect/Disconnect: `aria-label="Connect VPN profile: [name]"` / `aria-label="Disconnect VPN: [name]"`
- VPN status: `role="status"` with `aria-live="polite"` for connection state changes
- Profile list: `role="list"` / `role="listitem"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/network/VPNView.tsx` — **New file**

VPN support depends on system tools (WireGuard tools / OpenVPN CLI) being installed. The backend invokes them via `spawn_blocking`. If tools are absent, show `ErrorState` "VPN tools not available — install wireguard-tools or openvpn."

Tunnel control maps to `tunnel.rs` — `start_tunnel_bridge` / `stop_tunnel_bridge`.
