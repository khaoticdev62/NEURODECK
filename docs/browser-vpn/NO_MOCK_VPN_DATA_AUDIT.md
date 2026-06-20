# No Mock VPN Data Audit

## Scope

This audit confirms whether the browser VPN runtime paths contain hardcoded mock, sample, dummy, or fixture data that could be mistaken for real production output.

## Files Audited

| Path                                        | Type                 | Finding                                              |
| ------------------------------------------- | -------------------- | ---------------------------------------------------- |
| `src/renderer/features/browser-vpn/*`       | Frontend runtime     | No hardcoded mock VPN data.                          |
| `src/renderer/features/browser/*`           | Frontend runtime     | No hardcoded mock VPN data; uses real browser views. |
| `src/main/services/browser-vpn/*`           | Main-process runtime | No hardcoded fake connected states or fake IPs.      |
| `electron/ipc-handlers.js`                  | IPC layer            | No mock VPN responses.                               |
| `scripts/verify/verify-no-mock-vpn-data.ts` | Audit script         | Scans for VPN-specific mock patterns.                |
| `docs/browser-vpn/VPN_READINESS_REPORT.md`  | Generated report     | Reports `Mock VPN violations: 0`.                    |

## Methodology

The dedicated VPN scanner searches for:

- `mockVpn`, `fakeVpn`, `demoVpn`
- `fakePublicIp`, `fakeLocation`
- `hardcoded VPN connected`

In addition, the audited runtime files were manually reviewed for synthetic status values, hardcoded IP addresses, and fake provider claims.

## Findings

### Positive finding: production VPN paths are mock-free

The browser VPN runtime does not use fake connected states, fake public IPs, or fake provider availability. Evidence fields explicitly track `realTransportUsed` and `mockDataDetected`; both are `false` in production code because no mock transport is used.

### Placeholder templates are user-facing, not runtime mocks

`src/shared/browser-vpn/vpnConfigTemplates.ts` contains static placeholders such as `PASTE_PRIVATE_KEY_HERE` and `vpn.example.com`. These are intentionally incomplete templates that the user must fill in before connecting. They are not runtime data.

### Test-only and fallback mocks found

| Location                                               | Type          | Note                                                             |
| ------------------------------------------------------ | ------------- | ---------------------------------------------------------------- |
| `src/main/services/browser/browserViewManager.ts`      | Test fallback | Returns a mock view object when `WebContentsView` fails to load. |
| `src/main/services/browser/browserSessionService.ts`   | Test fallback | Returns a mock session object outside Electron.                  |
| `src/renderer/__tests__/features/BrowserView.test.tsx` | Test mock     | Mocks `BrowserVpnPanel` and icons.                               |

These are isolated to tests or graceful degradation and are not presented as real VPN data.

## Remediation

1. Ensure `BrowserVpnPanel` blocks connect when a profile still contains `PASTE_*` or `example.com` placeholders.
2. Add a clear warning in the import UI that templates must be completed before connecting.
3. Extend `scripts/verify/verify-no-mocks.ts` to scan `src/main/services/browser-vpn/` and `src/renderer/features/browser-vpn/` for generic mock patterns.

## Verification

After remediation, re-run:

- `scripts/verify/verify-no-mock-vpn-data.ts`
- `scripts/verify/verify-no-mocks.ts` (if extended)

No production file should contain mock-like VPN status or data.
