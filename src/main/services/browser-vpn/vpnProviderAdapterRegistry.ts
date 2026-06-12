import { spawnSync } from "child_process";
import type { VpnProtocol, VpnRouteMode, VpnSupportStatus } from "../../../shared/browser-vpn/vpnProviderTypes";
import type { VpnProviderSupport } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";

export type RuntimeCapability = {
  command: string;
  available: boolean;
  version?: string;
};

function checkCommand(command: string, args: string[]): RuntimeCapability {
  try {
    const result = spawnSync(command, args, { encoding: "utf-8" });
    return {
      command,
      available: !result.error,
      version: typeof result.stdout === "string" ? result.stdout.trim().slice(0, 120) : undefined,
    };
  } catch {
    return { command, available: false };
  }
}

export class VpnProviderAdapterRegistry {
  detectCapabilities(): RuntimeCapability[] {
    return [
      checkCommand("openvpn", ["--version"]),
      checkCommand("wg", ["--version"]),
      checkCommand("wg-quick", ["--version"]),
      checkCommand("nmcli", ["--version"]),
    ];
  }

  getProviderSupport(providerName: string, routeMode: VpnRouteMode, protocol: VpnProtocol): VpnProviderSupport {
    const caps = this.detectCapabilities();
    const has = (cmd: string) => caps.some((cap) => cap.command === cmd && cap.available);
    let status: VpnSupportStatus = "unknown_needs_user_config";
    if (protocol === "openvpn" && has("openvpn")) status = "supported_via_openvpn";
    else if (protocol === "wireguard" && (has("wg") || has("wg-quick"))) status = "supported_via_wireguard";
    else if (protocol === "http_proxy" || protocol === "https_proxy" || protocol === "socks5_proxy") status = "supported_via_proxy";
    else if (routeMode === "external_verified") status = "supported_via_external_verification";
    else if (routeMode === "system_tunnel" && has("nmcli")) status = "supported_via_system_profile";
    else if (protocol !== "unknown") status = "provider_specific_adapter_needed";
    if (!has("openvpn") && !has("wg") && !has("wg-quick") && !has("nmcli") && routeMode !== "external_verified" && protocol !== "http_proxy" && protocol !== "https_proxy" && protocol !== "socks5_proxy") {
      status = "unknown_needs_user_config";
    }
    return {
      providerName,
      openVpn: has("openvpn"),
      wireGuard: has("wg") || has("wg-quick"),
      proxy: true,
      systemApp: has("nmcli"),
      cli: has("openvpn") || has("wg-quick") || has("wg") || has("nmcli"),
      status,
      notes: has("openvpn") || has("wg") || has("wg-quick") || has("nmcli")
        ? "Runtime support detected on this host."
        : "No supported runtime detected; external verification or manual setup is required.",
    };
  }
}

export const vpnProviderAdapterRegistry = new VpnProviderAdapterRegistry();
