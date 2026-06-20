# VPN Kill Switch Plan

## Scope

This document describes the browser-scoped kill switch that blocks traffic when a VPN profile is enabled but not connected.

## Activation Condition

Kill-switch enforcement is triggered when:

- `killSwitchEnabled === true` for the profile, **and**
- Connection state is **not** `connected` or `verifying`.

## Enforcement Layers

The kill switch operates at four layers inside the browser subsystem:

### 1. Navigation-level block

`BrowserNavigationService.navigate()` calls `vpnRouteManager.shouldBlockBrowserRequest(tab.profileId, url)`. If true, the tab state is set to `"blocked"`.

### 2. Request-level block

`BrowserViewManager` registers `sess.webRequest.onBeforeRequest` per partition. Requests are cancelled when `shouldBlockBrowserRequest` returns true.

### 3. Download-level block

`sess.on("will-download", …)` calls `event.preventDefault()` and emits `vpn-download-blocked` when kill switch is active.

### 4. Proxy-level enforcement

`VpnKillSwitchEnforcer` applies an invalid proxy configuration to blocked partitions:

```
http=127.0.0.1:9;https=127.0.0.1:9
```

When the VPN reconnects, the real proxy or direct connection is restored.

## Allowed Bypass URLs

The following schemes are allowed even when the kill switch is active:

- `about:`
- `neurodeck:`
- `chrome:`
- `devtools:`

## Browser Profile Mapping

VPN profiles contain `browserProfileIds`. If empty, the `"default"` browser profile is used. The kill switch evaluates the active VPN profile for each mapped browser profile independently.

## State Machine

```
Disconnected + killSwitchEnabled
       |
       v
   BLOCKED
       |
       | connect() succeeds
       v
   CONNECTED
       |
       | disconnect() or process exit
       v
   BLOCKED
```

## Operational Notes

- Block counters are tracked and exposed in the diagnostics report.
- A tab blocked at navigation time shows an error screen.
- Sub-resource requests blocked mid-page may produce partial content with failed assets.
- The proxy enforcer only works for `browser_proxy` mode; system tunnels rely on OS routing for isolation.

## Known Gaps

| Gap                                                  | Impact                                                             | Recommended Fix                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| No OS-level firewall kill switch                     | Traffic outside the browser (sidecar, system apps) is not blocked. | Document scope or integrate OS firewall rules.                                                    |
| `127.0.0.1:9` is a soft block                        | A privileged process or malicious renderer could bypass it.        | Add request-level cancellation as the primary enforcement and proxy as a fallback.                |
| No user-visible unblock override                     | Users cannot temporarily allow a blocked page.                     | Add an "Allow once" action in the blocked tab UI.                                                 |
| Blocked state is set only on navigation              | Mid-flight disconnects may not immediately update existing tabs.   | Re-evaluate `shouldBlockBrowserRequest` on every sub-resource request and emit tab-state updates. |
| Child process exit does not auto-trigger block state | OpenVPN/WireGuard process death may go unnoticed.                  | Add a child-process health watchdog that transitions state to blocked on unexpected exit.         |
