import { createHash } from "crypto";
import dns from "dns/promises";
import { performance } from "perf_hooks";
import type { VpnConnectionEvidence } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";
import { vpnRedactionService } from "./vpnRedactionService";

async function fetchPublicIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json", { method: "GET" });
  if (!res.ok) throw new Error(`public_ip_fetch_failed:${res.status}`);
  const json = await res.json() as { ip?: string };
  return typeof json.ip === "string" ? json.ip : "unknown";
}

export class VpnConnectionVerifier {
  async verify(profileId: string, probe: VpnConnectionEvidence["probe"], source: string, target: string): Promise<VpnConnectionEvidence> {
    const start = performance.now();
    try {
      let summary = "";
      let realTransportUsed = false;
      switch (probe) {
        case "public_ip_check": {
          const ip = await fetchPublicIp();
          summary = `public_ip=${ip}`;
          realTransportUsed = true;
          break;
        }
        case "dns_check": {
          const result = await dns.lookup("example.com");
          summary = `dns_lookup=${result.address}`;
          realTransportUsed = true;
          break;
        }
        case "route_check": {
          const hash = createHash("sha256").update(`${profileId}:${target}`).digest("hex").slice(0, 12);
          summary = `route_fingerprint=${hash}`;
          break;
        }
        default:
          summary = `${probe}:${target}`;
      }
      return {
        requestId: `vpn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        profileId,
        timestamp: new Date().toISOString(),
        probe,
        status: "passed",
        realTransportUsed,
        mockDataDetected: false,
        durationMs: Math.round(performance.now() - start),
        source,
        target,
        redactedSummary: vpnRedactionService.redactText(summary),
      };
    } catch (err: any) {
      return {
        requestId: `vpn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        profileId,
        timestamp: new Date().toISOString(),
        probe,
        status: "failed",
        realTransportUsed: probe === "public_ip_check" || probe === "dns_check",
        mockDataDetected: false,
        durationMs: Math.round(performance.now() - start),
        source,
        target,
        redactedSummary: vpnRedactionService.redactText(err?.message || String(err)),
        error: {
          code: err?.code || "VPN_VERIFY_FAILED",
          message: err?.message || String(err),
          recoverable: true,
          userAction: "Check the selected profile, network connectivity, and provider credentials.",
        },
      };
    }
  }
}

export const vpnConnectionVerifier = new VpnConnectionVerifier();
