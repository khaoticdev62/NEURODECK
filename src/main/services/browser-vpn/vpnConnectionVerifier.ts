import { createHash } from "crypto";
import dns from "dns/promises";
import { performance } from "perf_hooks";
import * as net from "net";
import type { VpnConnectionEvidence } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";
import { vpnRedactionService } from "./vpnRedactionService";
import { getDefaultRouteInterface, isVpnInterface } from "./vpnRouteTableProbe";

async function fetchPublicIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json", { method: "GET" });
  if (!res.ok) throw new Error(`public_ip_fetch_failed:${res.status}`);
  const json = (await res.json()) as { ip?: string };
  return typeof json.ip === "string" ? json.ip : "unknown";
}

function tcpConnect(host: string, port: number, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout }, () => {
      socket.destroy();
      resolve();
    });
    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("tcp_connect_timeout"));
    });
  });
}

export class VpnConnectionVerifier {
  private baselinePublicIps = new Map<string, string>();

  async verify(
    profileId: string,
    probe: VpnConnectionEvidence["probe"],
    source: string,
    target: string,
    connectionState?: string
  ): Promise<VpnConnectionEvidence> {
    const start = performance.now();
    try {
      let summary = "";
      let realTransportUsed = false;
      let status: VpnConnectionEvidence["status"] = "passed";
      let error: VpnConnectionEvidence["error"] | undefined;

      switch (probe) {
        case "public_ip_check": {
          const ip = await fetchPublicIp();
          summary = `public_ip=${ip}`;
          realTransportUsed = true;
          const baseline = this.baselinePublicIps.get(profileId);
          const active = connectionState === "connected" || connectionState === "verifying";
          if (baseline && active && ip === baseline) {
            status = "failed";
            error = {
              code: "VPN_IP_UNCHANGED",
              message: "Public IP did not change from baseline. Traffic may not be routed through the tunnel.",
              recoverable: true,
              userAction: "Confirm the VPN profile is connected and the provider egress differs from your local network.",
            };
          }
          if (!active || !baseline) {
            this.baselinePublicIps.set(profileId, ip);
          }
          break;
        }
        case "dns_check": {
          const result = await dns.lookup("example.com");
          summary = `dns_lookup=${result.address}`;
          realTransportUsed = true;
          break;
        }
        case "route_check": {
          const route = getDefaultRouteInterface();
          if (route && isVpnInterface(route.name)) {
            summary = `default_interface=${route.name}${route.nextHop ? `,next_hop=${route.nextHop}` : ""}`;
          } else if (route) {
            summary = `default_interface=${route.name}${route.nextHop ? `,next_hop=${route.nextHop}` : ""}`;
            status = "failed";
            error = {
              code: "VPN_ROUTE_NOT_TUNNEL",
              message: "Default route does not appear to use a VPN tunnel interface.",
              recoverable: true,
              userAction: "Reconnect the system tunnel and verify the default route points to the VPN interface.",
            };
          } else {
            summary = "route_table_unavailable";
            status = "failed";
            error = {
              code: "VPN_ROUTE_PROBE_UNAVAILABLE",
              message: "Could not inspect the system route table.",
              recoverable: true,
              userAction: "Run the app with permissions to read network routes, or verify the tunnel manually.",
            };
          }
          break;
        }
        case "proxy_apply": {
          realTransportUsed = true;
          const [host, portStr] = target.split(":");
          const port = portStr ? parseInt(portStr, 10) : 0;
          if (host && port > 0 && port < 65536) {
            await tcpConnect(host, port);
            summary = `proxy_tcp_connect_ok=${target}`;
          } else {
            summary = `proxy_endpoint_parse_failed=${target}`;
            status = "failed";
            error = {
              code: "VPN_PROXY_ENDPOINT_INVALID",
              message: "Proxy endpoint could not be parsed for a TCP reachability check.",
              recoverable: true,
              userAction: "Check the proxy host and port in the VPN profile.",
            };
          }
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
        status,
        realTransportUsed,
        mockDataDetected: false,
        durationMs: Math.round(performance.now() - start),
        source,
        target,
        redactedSummary: vpnRedactionService.redactText(summary),
        error,
      };
    } catch (err: any) {
      return {
        requestId: `vpn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        profileId,
        timestamp: new Date().toISOString(),
        probe,
        status: "failed",
        realTransportUsed: probe === "public_ip_check" || probe === "dns_check" || probe === "proxy_apply",
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
