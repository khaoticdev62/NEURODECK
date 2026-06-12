import type { VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import { vpnProfileService } from "./vpnProfileService";
import { parseOpenVpnConfig } from "./openVpnConfigParser";
import { parseWireGuardConfig } from "./wireGuardConfigParser";
import { parseProxyConfig } from "./proxyConfigParser";

export type VpnImportKind = "openvpn" | "wireguard" | "proxy" | "external";

export type VpnImportResult =
  | { ok: true; profile: VpnProfile; warnings: string[]; redactedSummary: string }
  | { ok: false; error: string; warnings: string[]; redactedSummary?: string };

export class VpnConfigImportService {
  importText(text: string, kindHint?: VpnImportKind): VpnImportResult {
    const source = typeof text === "string" ? text.trim() : "";
    if (!source) return { ok: false, error: "Config text is empty", warnings: [] };

    const isOpenVpn = kindHint === "openvpn" || source.includes("<ca>") || /\bremote-cert-tls\b|\bdata-ciphers\b|\bauth-user-pass\b/i.test(source);
    const isWireGuard = kindHint === "wireguard" || /\[Interface\]|\[Peer\]|\bPrivateKey\s*=/i.test(source);
    const isProxy = kindHint === "proxy" || /"protocol"\s*:\s*"(http|https|socks5|pac)"/i.test(source) || /\bproxy\b/i.test(source);

    if (isOpenVpn) {
      const parsed = parseOpenVpnConfig(source);
      if (!parsed.ok) return { ok: false, error: parsed.error, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
      const profile = vpnProfileService.createProfile({
        name: parsed.profileName,
        providerName: parsed.providerName,
        routeMode: parsed.routeMode,
        protocol: parsed.protocol,
        config: parsed.config,
        auth: parsed.auth,
        policy: parsed.policy,
        warnings: parsed.warnings,
        security: parsed.security,
      });
      vpnProfileService.saveImportedConfig(profile.id, "openvpn", source);
      return { ok: true, profile, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
    }

    if (isWireGuard) {
      const parsed = parseWireGuardConfig(source);
      if (!parsed.ok) return { ok: false, error: parsed.error, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
      const profile = vpnProfileService.createProfile({
        name: parsed.profileName,
        providerName: parsed.providerName,
        routeMode: parsed.routeMode,
        protocol: parsed.protocol,
        config: parsed.config,
        auth: parsed.auth,
        policy: parsed.policy,
        warnings: parsed.warnings,
        security: parsed.security,
      });
      vpnProfileService.saveImportedConfig(profile.id, "wireguard", source);
      return { ok: true, profile, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
    }

    if (isProxy) {
      const parsed = parseProxyConfig(source);
      if (!parsed.ok) return { ok: false, error: parsed.error, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
      const profile = vpnProfileService.createProfile({
        name: parsed.profileName,
        providerName: parsed.providerName,
        routeMode: parsed.routeMode,
        protocol: parsed.protocol,
        config: parsed.config,
        auth: parsed.auth,
        policy: parsed.policy,
        warnings: parsed.warnings,
        security: parsed.security,
      });
      vpnProfileService.saveImportedConfig(profile.id, "proxy", source);
      return { ok: true, profile, warnings: parsed.warnings, redactedSummary: parsed.redactedSummary };
    }

    const profile = vpnProfileService.createProfile({
      name: "External Verified",
      providerName: "External",
      routeMode: "external_verified",
      protocol: "external",
      warnings: ["Imported as external_verified because config type could not be determined automatically."],
      security: "warning",
    });
    vpnProfileService.saveImportedConfig(profile.id, "external", source);
    return {
      ok: true,
      profile,
      warnings: ["Imported as external_verified because config type could not be determined automatically."],
      redactedSummary: "[external verification profile]",
    };
  }
}

export const vpnConfigImportService = new VpnConfigImportService();
