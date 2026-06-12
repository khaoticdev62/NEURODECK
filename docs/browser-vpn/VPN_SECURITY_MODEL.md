# VPN Security Model

- Credentials are stored in the main process only.
- Renderer never receives raw config files after import.
- Logs and diagnostics redact keys, tokens, certificates, and passwords.
- Browser kill switch blocks navigation and downloads when the selected route is inactive.
- Unsupported locked clients are surfaced honestly instead of being faked.

