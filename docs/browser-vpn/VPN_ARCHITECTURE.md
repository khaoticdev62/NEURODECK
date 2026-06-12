# VPN Architecture

The VPN feature uses a strict main/preload/renderer split:

1. Renderer opens the Browser VPN panel.
2. Renderer calls typed preload methods on `window.neurodeck.vpn`.
3. Preload forwards only allowlisted VPN actions.
4. Main-process services parse configs, store profiles, verify state, and enforce kill switch policy.
5. Browser view hooks use VPN state to block navigation and downloads when the selected route is inactive.

Secrets stay in the main process. Rendered status data is redacted before exposure.

