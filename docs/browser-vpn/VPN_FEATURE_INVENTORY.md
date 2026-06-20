# VPN Feature Inventory

## Scope

This document lists the implemented browser VPN features and the known gaps that remain before v1.0.

## Implemented Features

| Feature                 | Files                                                                                                         | Notes                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Profile CRUD            | `vpnProfileService.ts`, `vpnRouteManager.ts`                                                                  | Persisted to `userData/browser-vpn-profiles.json`.                   |
| Config import / parsing | `vpnConfigImportService.ts`, `openVpnConfigParser.ts`, `wireGuardConfigParser.ts`, `proxyConfigParser.ts`     | Supports OpenVPN, WireGuard, and proxy JSON/URL imports.             |
| Built-in templates      | `vpnConfigTemplates.ts`                                                                                       | 4 templates.                                                         |
| Connect / disconnect    | `vpnRouteManager.ts`                                                                                          | OpenVPN spawn, WireGuard spawn, proxy apply, nmcli, external verify. |
| Verification probes     | `vpnConnectionVerifier.ts`, `vpnRouteTableProbe.ts`                                                           | IP, DNS, route, proxy TCP checks.                                    |
| Kill switch             | `vpnKillSwitchService.ts`, `vpnKillSwitchEnforcer.ts`, `browserNavigationService.ts`, `browserViewManager.ts` | Nav + request + download block.                                      |
| Diagnostics report      | `vpnDiagnosticsService.ts`, `vpnDiagnosticsTypes.ts`                                                          | Status, evidence, recovery, matrix.                                  |
| Self-healing / repair   | `vpnSelfHealingService.ts`                                                                                    | Manual repair with 3-attempt limit.                                  |
| Provider matrix         | `vpnProviderAdapterRegistry.ts`                                                                               | Runtime capability detection.                                        |
| Redaction               | `vpnRedactionService.ts`                                                                                      | Keys, certs, passwords, tokens.                                      |
| Credential encryption   | `vpnCredentialService.ts`                                                                                     | `safeStorage` + local ciphertext file.                               |
| Dependency install      | `electron/services/dependencyInstallerService.js`                                                             | OpenVPN/WireGuard MSI/package install.                               |
| IPC / preload surface   | `electron/ipc-handlers.js`, `electron/preload.js`                                                             | 19 VPN channels.                                                     |

## Known Gaps

| #   | Gap                                   | Owner / ETA | Notes                                                               |
| --- | ------------------------------------- | ----------- | ------------------------------------------------------------------- |
| 1   | No automatic reconnect                | TBD         | `policy.autoReconnect` field exists but is not acted upon.          |
| 2   | No child-process health watchdog      | TBD         | OpenVPN/WireGuard process exit does not auto-update state.          |
| 3   | No DNS leak prevention                | TBD         | Only a single `dns.lookup` check is performed.                      |
| 4   | No split-tunnel UI/editor             | TBD         | Users cannot select which routes bypass the VPN.                    |
| 5   | No credential UI in `BrowserVpnPanel` | TBD         | `auth-user-pass` OpenVPN configs require external credential setup. |
| 6   | Two competing VPN UIs                 | TBD         | `BrowserVpnPanel` vs `VPNView` use different state models.          |
| 7   | No OS-level kill switch               | TBD         | Only browser traffic is blocked when VPN drops.                     |
| 8   | No persistent evidence/recovery logs  | TBD         | Evidence and recovery events are lost on app restart.               |
| 9   | No E2E tests for VPN flows            | TBD         | VPN paths are not covered by Playwright.                            |
| 10  | Rust sidecar has no VPN awareness     | TBD         | Agents cannot reason about VPN state.                               |

## Recommended Priority Order

1. **Child-process health watchdog** — required for a reliable kill switch.
2. **Automatic reconnect with backoff** — high user value.
3. **Credential UI for OpenVPN** — unblocks the most common system-tunnel setup.
4. **Unify VPN UIs** — reduces confusion and maintenance.
5. **Persistent evidence logs** — needed for supportability.

## Verification

- Check this inventory against the source files listed above before each release.
- Update the Known Gaps table as items are completed or deprioritized.
