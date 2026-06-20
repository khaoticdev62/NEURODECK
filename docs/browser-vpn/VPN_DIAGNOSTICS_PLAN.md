# VPN Diagnostics Plan

## Scope

This document describes how NEURODECK diagnoses the browser VPN subsystem. It covers diagnostic IPC commands, the evidence probes, status reporting, error codes, and operational procedures.

## Diagnostic Commands

The main process exposes the following VPN diagnostic channels:

| IPC Channel               | Service Method                                                  | Purpose                                    |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `vpn:get-status`          | `VpnDiagnosticsService.getReport` → `vpnRouteManager.getStatus` | Current status and active profile summary. |
| `vpn:get-evidence`        | `vpnRouteManager.getEvidence`                                   | Recent probe results.                      |
| `vpn:get-recovery-events` | `vpnRouteManager.getRecoveryEvents`                             | Recent repair attempts.                    |
| `vpn:verify`              | `vpnRouteManager.verify(profileId)`                             | Run a full verification cycle.             |

## Diagnostics Report Shape

The `VpnDiagnosticsReport` object includes:

| Field                 | Meaning                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `status`              | Current connection status (`connected`, `connecting`, `disconnected`, `error`, etc.). |
| `activeProfileId`     | Profile currently active, if any.                                                     |
| `routeMode`           | `system_tunnel`, `browser_proxy`, or `external_verified`.                             |
| `protocol`            | `openvpn`, `wireguard`, `socks5_proxy`, `http_proxy`, `external`, etc.                |
| `supportsKillSwitch`  | Whether the active profile has kill switch enabled.                                   |
| `supportsSelfHealing` | Whether repair is available for the current error.                                    |
| `activeProfiles`      | List of active profiles.                                                              |
| `blockedRequests`     | Count of requests blocked by kill switch.                                             |
| `lastEvidence`        | Most recent verification evidence.                                                    |
| `providerMatrix`      | Runtime support matrix for detected binaries.                                         |
| `warnings`            | Human-readable warnings.                                                              |

## Evidence Probes

`VpnConnectionVerifier` runs the following probes:

| Probe                   | What it checks                                          |
| ----------------------- | ------------------------------------------------------- |
| `config_parse`          | Imported config is syntactically valid.                 |
| `runtime_detect`        | Required OS binaries are present.                       |
| `connect_attempt`       | Connection attempt completed.                           |
| `process_status`        | Tunnel child process is alive.                          |
| `proxy_apply`           | Proxy settings were applied to the session.             |
| `browser_request`       | A test request through the browser succeeded.           |
| `public_ip_check`       | Public IP changed from baseline.                        |
| `dns_check`             | DNS resolution returns expected results.                |
| `route_check`           | Default route points through the tunnel.                |
| `kill_switch_block`     | Kill switch correctly blocks traffic when disconnected. |
| `self_healing_recovery` | Recovery attempt succeeded.                             |

### Probe Implementations

- **Public IP**: `https://api.ipify.org?format=json`
- **DNS**: Node `dns.lookup("example.com")`
- **Route table**: PowerShell `Get-NetRoute` on Windows, `ip route show default` on Linux, `netstat -rn` on macOS.
- **Proxy TCP**: Direct socket connect to `host:port`.

## Error Codes

| Code                          | Meaning                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `VPN_IP_UNCHANGED`            | Public IP did not change after connect.                 |
| `VPN_ROUTE_NOT_TUNNEL`        | Default route does not appear to go through the tunnel. |
| `VPN_ROUTE_PROBE_UNAVAILABLE` | Route-table probe could not run on this OS.             |
| `VPN_PROXY_ENDPOINT_INVALID`  | Configured proxy endpoint is unreachable.               |
| `VPN_VERIFY_FAILED`           | Generic verification failure.                           |
| `VPN_KILLSWITCH_BLOCKED`      | Kill switch blocked a request (informational).          |

## Operational Procedures

### Run a verification

In the **Browser VPN** panel:

1. Select a profile.
2. Click **Connect**.
3. Wait for status to settle.
4. Click **Verify** to run probes and review evidence.

### Diagnose a failed system tunnel

1. Open the diagnostics panel.
2. Check `runtime_detect` for missing binaries (`openvpn`, `wg-quick`, `nmcli`).
3. Check `process_status` for privilege or config errors.
4. Review the route table probe for `VPN_ROUTE_NOT_TUNNEL`.
5. If privileges are required, run NEURODECK as administrator/root or use a proxy-only profile.

### Export evidence

Evidence is currently kept in-memory. To share diagnostics:

1. Open **Browser VPN** panel → **Diagnostics** tab.
2. Copy the evidence list.
3. Use **Settings → Support Bundle** to capture redacted system health.

## Known Gaps

| Gap                                       | Impact                                                     | Recommended Fix                                 |
| ----------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Evidence is not persisted across restarts | Cannot audit past failures.                                | Write evidence to `logs/` or the memory DB.     |
| `dns.lookup("example.com")` is hardcoded  | Cannot configure a leak-test endpoint.                     | Add a settings field for leak-test host.        |
| Public-IP baseline is in-memory           | Verification fails after restart because baseline is lost. | Persist baseline per profile.                   |
| No dedicated export-diagnostics command   | Support workflow is manual.                                | Add `vpn:export-diagnostics` IPC and UI button. |
