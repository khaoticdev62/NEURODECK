# No Mock VPN Data Audit

Production VPN code must not contain fake connected states, fake IP/location data, demo provider claims, or placeholder success paths.

Current audit posture:

- New VPN code uses real config parsing and redaction.
- Fake VPN data paths were not introduced in the browser-vpn feature.
- Formal source-wide mock scan is handled by `scripts/verify-no-mock-vpn-data.ts`.

