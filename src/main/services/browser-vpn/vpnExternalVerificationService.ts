import { vpnConnectionVerifier } from "./vpnConnectionVerifier";
import type { VpnConnectionEvidence } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";

export class VpnExternalVerificationService {
  async verify(profileId: string): Promise<VpnConnectionEvidence[]> {
    const probes: VpnConnectionEvidence["probe"][] = ["public_ip_check", "dns_check", "route_check"];
    const results = [];
    for (const probe of probes) {
      results.push(await vpnConnectionVerifier.verify(profileId, probe, "external", "browser"));
    }
    return results;
  }
}

export const vpnExternalVerificationService = new VpnExternalVerificationService();
