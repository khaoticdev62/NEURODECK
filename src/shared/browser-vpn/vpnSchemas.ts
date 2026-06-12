import type { BrowserProxyProfile, VpnProfile } from "./vpnProfileTypes";
import type { VpnProviderSupport, VpnConnectionEvidence } from "./vpnDiagnosticsTypes";
import type { VpnConnectionState, VpnProtocol, VpnRouteMode, VpnSupportStatus } from "./vpnProviderTypes";

export function isVpnConnectionState(value: unknown): value is VpnConnectionState {
  return typeof value === "string" && [
    "disconnected",
    "connecting",
    "connected",
    "verifying",
    "degraded",
    "recovering",
    "blocked",
    "not_configured",
    "auth_required",
    "unsupported",
    "error",
  ].includes(value);
}

export function isVpnRouteMode(value: unknown): value is VpnRouteMode {
  return typeof value === "string" && ["browser_proxy", "system_tunnel", "external_verified", "unsupported"].includes(value);
}

export function isVpnProtocol(value: unknown): value is VpnProtocol {
  return typeof value === "string" && [
    "openvpn",
    "wireguard",
    "http_proxy",
    "https_proxy",
    "socks5_proxy",
    "system_networkmanager",
    "provider_cli",
    "external",
    "unknown",
  ].includes(value);
}

export function isVpnSupportStatus(value: unknown): value is VpnSupportStatus {
  return typeof value === "string" && [
    "supported_via_openvpn",
    "supported_via_wireguard",
    "supported_via_proxy",
    "supported_via_system_profile",
    "supported_via_external_verification",
    "provider_specific_adapter_needed",
    "unsupported_locked_client",
    "unknown_needs_user_config",
  ].includes(value);
}

export function validateBrowserProxyProfile(value: unknown): value is BrowserProxyProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as BrowserProxyProfile;
  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && ["http", "https", "socks5", "pac"].includes(profile.protocol)
    && typeof profile.usernameRequired === "boolean"
    && typeof profile.passwordStored === "boolean"
    && Array.isArray(profile.bypassRules)
    && typeof profile.dnsMode === "string";
}

export function validateVpnProfile(value: unknown): value is VpnProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as VpnProfile;
  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && typeof profile.providerName === "string"
    && isVpnRouteMode(profile.routeMode)
    && isVpnProtocol(profile.protocol)
    && Array.isArray(profile.browserProfileIds)
    && typeof profile.createdAt === "string"
    && typeof profile.updatedAt === "string";
}

export function validateVpnProviderSupport(value: unknown): value is VpnProviderSupport {
  if (!value || typeof value !== "object") return false;
  const support = value as VpnProviderSupport;
  return typeof support.providerName === "string"
    && typeof support.openVpn === "boolean"
    && typeof support.wireGuard === "boolean"
    && typeof support.proxy === "boolean"
    && typeof support.systemApp === "boolean"
    && typeof support.cli === "boolean"
    && isVpnSupportStatus(support.status)
    && typeof support.notes === "string";
}

export function validateVpnConnectionEvidence(value: unknown): value is VpnConnectionEvidence {
  if (!value || typeof value !== "object") return false;
  const ev = value as VpnConnectionEvidence;
  return typeof ev.requestId === "string"
    && typeof ev.profileId === "string"
    && typeof ev.timestamp === "string"
    && typeof ev.probe === "string"
    && ["passed", "failed", "blocked", "skipped"].includes(ev.status)
    && typeof ev.realTransportUsed === "boolean"
    && typeof ev.mockDataDetected === "boolean"
    && typeof ev.durationMs === "number"
    && typeof ev.source === "string"
    && typeof ev.target === "string"
    && typeof ev.redactedSummary === "string";
}

