# VPN Feature Inventory

Current implementation covers:

- Browser VPN main-process services for profile, config import, parsing, verification, kill switch, and recovery.
- Typed preload API under `window.neurodeck.vpn`.
- Browser tab panel with profile list, editor, import wizard, provider matrix, diagnostics, and self-healing log.

Known gaps:

- Real system-tunnel execution still depends on host runtime availability.
- External verification is intentionally conservative and does not claim unsupported proprietary clients.
- E2E coverage and formal parity tests are still pending.

