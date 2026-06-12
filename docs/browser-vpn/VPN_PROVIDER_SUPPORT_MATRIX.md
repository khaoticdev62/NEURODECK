# VPN Provider Support Matrix

| Provider | OpenVPN | WireGuard | Proxy | System App | CLI | Status | Notes |
|---|---|---|---|---|---|---|---|
| OpenVPN profile | yes | no | no | yes | yes | supported_via_openvpn | Requires a real .ovpn profile.
| WireGuard profile | no | yes | no | yes | yes | supported_via_wireguard | Requires a real .conf profile.
| Proxy profile | no | no | yes | no | no | supported_via_proxy | Browser-scoped session proxy.
| External verified | no | no | no | no | no | supported_via_external_verification | User-managed VPN verified by probes.

