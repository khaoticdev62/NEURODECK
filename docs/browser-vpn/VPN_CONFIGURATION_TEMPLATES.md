# VPN Configuration Templates

## Scope

This document describes the built-in VPN configuration templates, the import flow, and the placeholder variables users must replace before connecting.

## Built-In Templates

Templates are defined in `src/shared/browser-vpn/vpnConfigTemplates.ts`.

| Template ID             | Route mode          | Protocol       | Purpose                                                        |
| ----------------------- | ------------------- | -------------- | -------------------------------------------------------------- |
| `openvpn-user-pass`     | `system_tunnel`     | `openvpn`      | Standard OpenVPN tunnel with username/password authentication. |
| `wireguard-full-tunnel` | `system_tunnel`     | `wireguard`    | Full-tunnel WireGuard connection.                              |
| `socks5-browser`        | `browser_proxy`     | `socks5_proxy` | Browser-scoped SOCKS5 proxy.                                   |
| `external-verified`     | `external_verified` | `external`     | Verify an external VPN (e.g., OS WireGuard already running).   |

## Import Flow

1. User pastes config text or clicks **Import**.
2. `vpn:import-config` sends the text to `VpnConfigImportService.importText(text, kindHint)`.
3. Auto-detection uses regex/content hints:
   - `<ca>` or `client` → OpenVPN
   - `[Interface]` → WireGuard
   - JSON with a `protocol` field or a URL → proxy
4. The parser validates and produces a `VpnProfile` draft.
5. `VpnProfileService.createProfile()` persists the profile to `userData/browser-vpn-profiles.json`.
6. The raw imported config is stored separately in the same file under `importedConfigs`.

## Placeholder Variables

Templates use static placeholder strings that must be replaced before connection:

| Placeholder                 | Meaning                      | Where it appears                 |
| --------------------------- | ---------------------------- | -------------------------------- |
| `PASTE_CA_CERTIFICATE_HERE` | OpenVPN CA certificate block | `openvpn-user-pass` template     |
| `PASTE_PRIVATE_KEY_HERE`    | WireGuard private key        | `wireguard-full-tunnel` template |
| `PASTE_PUBLIC_KEY_HERE`     | WireGuard peer public key    | `wireguard-full-tunnel` template |
| `vpn.example.com`           | VPN server endpoint          | OpenVPN and WireGuard templates  |
| `proxy.example.com`         | Proxy server endpoint        | `socks5-browser` template        |
| `username` / `password`     | Authentication credentials   | OpenVPN and proxy templates      |

## Default Policy Applied on Import

When a profile is created from a template or import, the following policy defaults are applied:

- Kill switch: **enabled**
- Block on DNS leak / IP mismatch: **enabled**
- Auto-reconnect: **enabled**
- Confirmation required for connect: **enabled**

## Operational Notes

- Only text paste is supported; `.ovpn`, `.conf`, and `.zip` file imports from disk are not implemented.
- OpenVPN configs that use `auth-user-pass` without a file require credentials to be supplied externally.
- Imported configs are validated for syntax but are not checked against the actual server.

## Known Gaps

| Gap                              | Impact                                                                             | Recommended Fix                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Only 4 templates                 | Users lack common variants (split tunnel, OpenVPN cert auth, TCP 443 fallback).    | Add templates for OpenVPN cert auth, WireGuard split tunnel, HTTP/PAC proxy.      |
| No UI wizard for placeholders    | Users must manually edit raw config text.                                          | Add a form that replaces placeholders before saving.                              |
| No file import                   | Users cannot import `.ovpn` or `.conf` files directly.                             | Add a file picker that reads text files and passes content to the import service. |
| No credential capture UI         | OpenVPN `auth-user-pass` configs fail without external setup.                      | Add username/password fields and write a temporary auth file for `openvpn`.       |
| No pre-connect placeholder check | A profile containing `PASTE_*` markers can be connected, producing cryptic errors. | Block connect and highlight unresolved placeholders.                              |
