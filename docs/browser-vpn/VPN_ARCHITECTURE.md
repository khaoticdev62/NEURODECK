# VPN Architecture

## Scope

This document describes the architecture of NEURODECK's browser-scoped VPN and proxy subsystem. It covers the renderer-to-main-process flow, supported route modes and protocols, traffic isolation, and integration with the browser view.

## Important Boundary

The VPN feature is implemented **inside the Electron main process**, not in the Rust sidecar. The Rust sidecar has no VPN-specific bridge commands; it only probes for `openvpn`, `wg`, and `wg-quick` during terminal environment detection and exposes a `vpn_only` flag on transfer profiles.

## High-Level Flow

```
Renderer (BrowserVpnPanel / VPNView)
       |
       | typed preload API: window.neurodeck.vpn.*
       v
Preload script (electron/preload.js)
       |
       | allowlisted IPC channels
       v
Main-process IPC handlers (electron/ipc-handlers.js)
       |
       | dispatch
       v
Browser VPN services (electron/dist/main/services/browser-vpn/)
       |
       | spawn / setProxy / verify
       v
OS tunnel or Electron session proxy
```

## Layer Responsibilities

| Layer               | Key Files                                                                                                       | Responsibility                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Renderer UI         | `src/renderer/features/browser-vpn/BrowserVpnPanel.tsx`, `src/renderer/features/network/VPNView.tsx`            | Profile selection, status display, connect/disconnect, diagnostics. |
| Browser integration | `src/renderer/features/browser/BrowserView.tsx`, `useBrowser.ts`, `GlobalToolbar.tsx`                           | Show VPN state in browser chrome, block/allow navigation.           |
| Preload             | `electron/preload.js`                                                                                           | Exposes only the allowlisted VPN methods to the renderer.           |
| IPC registry        | `electron/ipc-channels.js`, `electron/ipc-registry.js`                                                          | Defines and validates allowed VPN channels.                         |
| Main handlers       | `electron/ipc-handlers.js`                                                                                      | Payload validation and dispatch to services.                        |
| Services            | `src/main/services/browser-vpn/vpnRouteManager.ts`, `vpnConnectionVerifier.ts`, `vpnKillSwitchService.ts`, etc. | Tunnel lifecycle, verification, kill switch.                        |

## Route Modes and Protocols

| Route mode          | Protocol                                              | Mechanism                                                           |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `system_tunnel`     | `openvpn`                                             | Spawn `openvpn --config <path>`.                                    |
| `system_tunnel`     | `wireguard`                                           | Spawn `wg-quick up <path>`.                                         |
| `system_tunnel`     | `system_networkmanager` / `provider_cli`              | Use `nmcli connection import` + `up`.                               |
| `browser_proxy`     | `socks5_proxy` / `http_proxy` / `https_proxy` / `pac` | `session.setProxy()` on the browser partition.                      |
| `external_verified` | `external`                                            | No tunnel; only verification probes confirm external VPN is active. |

## Traffic Isolation

Traffic isolation is achieved through Electron `session` partitions:

- Each browser profile gets its own `Session` object.
- VPN/proxy settings are applied per-partition, not globally.
- The kill switch cancels navigation, sub-resource requests, and downloads for profiles attached to an inactive VPN profile.

## Browser Profile Mapping

VPN profiles declare `browserProfileIds`. If empty, the `"default"` browser profile is used. This lets a single VPN profile protect multiple browser identities, or one identity at a time.

## Data Flow

### Connect

1. User selects a VPN profile and clicks **Connect**.
2. `vpn:connect` IPC calls `VpnRouteManager.connect(profileId)`.
3. `VpnRouteManager` resolves the route mode and protocol.
4. For `system_tunnel`, it spawns the appropriate OS binary.
5. For `browser_proxy`, it applies proxy settings to the partition session.
6. For `external_verified`, it runs verification probes and marks the profile verified.
7. State transitions are emitted to the renderer via `vpn:state-change`.

### Disconnect

1. `vpn:disconnect` calls `VpnRouteManager.disconnect(profileId)`.
2. Child processes are killed.
3. Proxy settings are reset.
4. Kill-switch enforcement is evaluated; if enabled, browser traffic for mapped profiles is blocked.

## Operational Notes

- Real system tunnels require host binaries (`openvpn`, `wg-quick`, `nmcli`) and usually elevated privileges.
- The Rust sidecar is unaware of VPN state. Chat/agent features cannot currently reason about whether VPN is active.
- Two UI surfaces exist: `BrowserVpnPanel` (browser-integrated, main-process backed) and `VPNView` (network tab, localStorage backed). Their state models are not unified.

## Known Gaps

| Gap                              | Impact                                                                   | Recommended Fix                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Rust sidecar has no VPN commands | Agents cannot be told to only act when VPN is active.                    | Add a read-only VPN status bridge command or expose VPN state through the global app state.     |
| Two competing VPN UIs            | Users see inconsistent state and persistence.                            | Consolidate on `BrowserVpnPanel` and migrate `VPNView` to use the main-process profile service. |
| No global VPN mode               | Only browser-profile traffic is routed; other app traffic is unaffected. | Document this scope or add a system-wide tunnel option.                                         |
