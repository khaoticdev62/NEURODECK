# VPN Self-Healing Plan

## Scope

This document describes the recovery mechanisms for the browser VPN subsystem, including retry policy, manual repair, and recovery-event tracking.

## Recovery Service

`VpnSelfHealingService` manages recovery attempts. Key behaviors:

- **Maximum 3 attempts per profile** (`canRetry` check).
- `repair(profileId)` flow:
  1. `vpn:repair` IPC calls `VpnRouteManager.repair(profileId)`.
  2. `VpnRouteManager` calls `vpnSelfHealingService.recover(profileId, currentState, reason)`.
  3. If `recover` returns `passed`, `VpnRouteManager.connect(profileId)` is called immediately.
- Recovery is **manual** today, triggered by the **Repair** button in `BrowserVpnPanel`.

## Terminal Failure States

Some failures are treated as terminal until the user changes the environment:

- Unsupported protocol
- Privilege-blocked system tunnel (`PRIVILEGES_REQUIRED`)
- Missing runtime (`openvpn`, `wg-quick`, `nmcli`)

In these cases, recovery will not retry and the user must install the binary or run with elevated privileges.

## Recovery Events

Recovery events are kept in memory and surfaced via `vpn:get-recovery-events`. The `BrowserVpnPanel` diagnostics tab displays recent events with timestamps and outcomes.

## Operational Procedures

### Repair a disconnected profile

1. Open the **Browser VPN** panel.
2. Select the failed profile.
3. Review the error message.
4. Click **Repair** to run the recovery flow.
5. If recovery succeeds, the profile reconnects automatically.
6. If recovery fails, check diagnostics for missing binaries or privilege errors.

### Handle privilege errors

If the error is `PRIVILEGES_REQUIRED`:

- For Windows: run NEURODECK as Administrator, or switch to a `browser_proxy` profile.
- For Linux: run with `sudo` or use `nmcli`-based system profile mode if available.
- For macOS: grant NEURODECK full disk access if prompted, or use a proxy profile.

## Known Gaps

| Gap                                   | Impact                                                        | Recommended Fix                                                    |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| No automatic reconnect timer          | Users must manually repair after every disconnect.            | Implement `policy.autoReconnect` with exponential backoff.         |
| No child-process health watchdog      | OpenVPN/WireGuard process exit is not detected automatically. | Poll child process status and trigger repair on unexpected exit.   |
| Recovery attempt counter is in-memory | Attempt limits reset on app restart.                          | Persist attempt counts and last-failure timestamps per profile.    |
| No network-change listener            | Roaming between networks does not trigger reconnect.          | Listen for OS network-change events and re-verify active profiles. |
