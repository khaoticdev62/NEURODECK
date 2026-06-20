# VPN Provider Support Matrix

## Scope

This document describes how NEURODECK detects VPN provider/runtime support and the current support matrix.

## Detection Method

`VpnProviderAdapterRegistry.detectCapabilities()` checks for the following host binaries:

| Binary     | Purpose                         |
| ---------- | ------------------------------- |
| `openvpn`  | OpenVPN system tunnels          |
| `wg`       | WireGuard interface management  |
| `wg-quick` | WireGuard quick up/down scripts |
| `nmcli`    | NetworkManager profile import   |

## Support Status Values

| Status                                | Meaning                                                          |
| ------------------------------------- | ---------------------------------------------------------------- |
| `supported_via_openvpn`               | Profile can use the local `openvpn` binary.                      |
| `supported_via_wireguard`             | Profile can use `wg` or `wg-quick`.                              |
| `supported_via_proxy`                 | Profile uses HTTP/SOCKS5 proxy.                                  |
| `supported_via_system_profile`        | Profile uses `nmcli` system connection.                          |
| `supported_via_external_verification` | Profile relies on an external VPN; only verification probes run. |
| `provider_specific_adapter_needed`    | Branded provider app required; not yet implemented.              |
| `unsupported_locked_client`           | Provider locked to a proprietary client.                         |
| `unknown_needs_user_config`           | Cannot determine support without more config.                    |

## Runtime Matrix Logic

| Protocol / route mode                    | Required runtime          | Resulting status                      |
| ---------------------------------------- | ------------------------- | ------------------------------------- |
| `openvpn`                                | `openvpn` binary          | `supported_via_openvpn`               |
| `wireguard`                              | `wg` or `wg-quick`        | `supported_via_wireguard`             |
| `browser_proxy`                          | None (Electron proxy API) | `supported_via_proxy`                 |
| `external_verified`                      | None                      | `supported_via_external_verification` |
| `system_networkmanager` / `provider_cli` | `nmcli`                   | `supported_via_system_profile`        |

## Dependency Installation

`electron/services/dependencyInstallerService.js` can install missing dependencies:

| OS                    | OpenVPN                                    | WireGuard                                        |
| --------------------- | ------------------------------------------ | ------------------------------------------------ |
| Windows               | Downloads MSI from `OpenVPN/openvpn-build` | Downloads MSI from `WireGuard/wireguard-windows` |
| Linux (Arch)          | `pacman -S openvpn`                        | `pacman -S wireguard-tools`                      |
| Linux (Debian/Ubuntu) | `apt-get install openvpn`                  | `apt-get install wireguard`                      |
| macOS                 | Not implemented                            | Not implemented                                  |

## Operational Notes

- There is no hardcoded list of commercial providers (NordVPN, Mullvad, etc.). Support is determined by the protocol and available binaries.
- If a required binary is missing, the UI shows the profile as unsupported and offers to install the dependency when an installer is available.
- External verification mode can be used with any provider whose app runs outside NEURODECK.

## Known Gaps

| Gap                                                                   | Impact                                          | Recommended Fix                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| No provider-specific adapters                                         | Users of branded apps must run them externally. | Build adapters for popular CLI-based providers where terms of service allow it. |
| No macOS installer path                                               | macOS users must install binaries manually.     | Add Homebrew-based installation.                                                |
| `provider_cli` protocol is defined but not implemented beyond `nmcli` | Limited system-profile support.                 | Implement provider CLI adapters or remove the protocol option.                  |
