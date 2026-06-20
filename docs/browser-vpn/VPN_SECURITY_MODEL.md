# VPN Security Model

## Scope

This document describes the security model for the browser VPN subsystem, including credential storage, redaction, renderer isolation, kill-switch enforcement, and known risks.

## Credential Storage

`VpnCredentialService` uses Electron `safeStorage.encryptString()` to encrypt secrets. The ciphertext is then written to:

```
userData/browser-vpn-credentials.json
```

`safeStorage` delegates to the OS-provided secret mechanism (DPAPI on Windows, Keychain on macOS, Secret Service on Linux). The actual key material is not stored in the NEURODECK repository.

### Important Clarification

The ciphertext file lives in the app's user data directory, not directly in the OS keychain. The OS mechanism protects the encryption key. UI text that says credentials are stored in the OS keychain should be read as encrypted by the OS keychain-backed store.

## Renderer Exposure

Raw imported config text is never returned to the renderer after import. Exported profiles pass through `vpnRedactionService.redactObject()` before leaving the main process.

## Redaction Rules

`VpnRedactionService` scrubs the following from exported or logged data:

- Private keys and certificates
- `<key>`, `<cert>`, `<tls-auth>`, `<tls-crypt>` blocks
- WireGuard `PrivateKey` and `PresharedKey`
- `password`, `username`, and `auth-user-pass` credentials
- Bearer tokens, Gemini API keys, and OAuth client secrets

## Kill Switch and Permission Gate

The kill switch blocks browser navigation, sub-resource requests, and downloads when the VPN is inactive and kill switch is enabled. `BrowserSecurityService` additionally enforces URL allowlists and audits guest `webPreferences` for browser views.

## Unsupported Clients

The provider adapter registry returns `unsupported_locked_client` or `provider_specific_adapter_needed` honestly for branded clients that require their own applications. NEURODECK does not pretend to support providers it cannot control.

## IPC Guards

`electron/ipc-handlers.js` validates required fields such as `profileId` and `enabled` before dispatching to VPN services. This prevents malformed renderer calls from reaching the tunnel lifecycle code.

## Operational Notes

- Never export a profile and share it without first verifying redaction.
- Keep the NEURODECK process protected by OS file permissions; the ciphertext file is only as secure as the user data directory.
- Use `browser_proxy` mode if system tunnels cannot be run with sufficient privileges.

## Known Gaps

| Gap                                                               | Impact                                                               | Recommended Fix                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| UI text overstates keychain storage                               | Users may believe credentials live only in the OS keychain.          | Clarify in `NetworkProfileDrawer.tsx` that credentials are encrypted locally by the OS store. |
| No secure credential input in `BrowserVpnPanel`                   | OpenVPN credentials may be entered in plain text.                    | Add a password field and write a temporary auth file for `openvpn`.                           |
| `VpnCredentialService` not wired into `vpnRouteManager.connect()` | Auto-credential injection is missing; `auth-user-pass` configs fail. | Pass decrypted credentials to the tunnel spawn process.                                       |
| No support-bundle redaction audit                                 | VPN secrets could leak into support bundles.                         | Add VPN-specific patterns to `redact_line()` or `vpnRedactionService`.                        |
