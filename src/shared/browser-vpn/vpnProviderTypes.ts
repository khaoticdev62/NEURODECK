export type VpnRouteMode = "browser_proxy" | "system_tunnel" | "external_verified" | "unsupported";

export type VpnProtocol =
  | "openvpn"
  | "wireguard"
  | "http_proxy"
  | "https_proxy"
  | "socks5_proxy"
  | "system_networkmanager"
  | "provider_cli"
  | "external"
  | "unknown";

export type VpnConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "verifying"
  | "degraded"
  | "recovering"
  | "blocked"
  | "not_configured"
  | "auth_required"
  | "unsupported"
  | "error";

export type VpnSupportStatus =
  | "supported_via_openvpn"
  | "supported_via_wireguard"
  | "supported_via_proxy"
  | "supported_via_system_profile"
  | "supported_via_external_verification"
  | "provider_specific_adapter_needed"
  | "unsupported_locked_client"
  | "unknown_needs_user_config";

export type VpnProfileSecurityState = "safe" | "warning" | "danger";
