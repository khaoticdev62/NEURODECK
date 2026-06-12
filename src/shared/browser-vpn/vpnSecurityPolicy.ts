import type { VpnProfile, VpnRouteMode, VpnProtocol } from "./vpnProfileTypes";
import type { VpnConnectionState } from "./vpnProviderTypes";

export const VPN_ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export function isVpnBrowserTrafficAllowed(state: VpnConnectionState, killSwitchEnabled: boolean): boolean {
  if (!killSwitchEnabled) return true;
  return state === "connected" || state === "verifying";
}

export function isUnsupportedProvider(routeMode: VpnRouteMode, protocol: VpnProtocol): boolean {
  return routeMode === "unsupported" || protocol === "unknown";
}

export function getVpnSecurityTone(profile: Pick<VpnProfile, "diagnostics" | "policy" | "warnings">): "safe" | "warning" | "danger" {
  if (profile.diagnostics.lastState === "connected") return "safe";
  if (profile.diagnostics.lastState === "degraded" || profile.diagnostics.lastState === "recovering") return "warning";
  if (profile.diagnostics.lastState === "blocked" || profile.diagnostics.lastState === "error" || profile.warnings.length > 0) return "danger";
  return profile.policy.killSwitchEnabled ? "warning" : "safe";
}
