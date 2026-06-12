import type { VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import { vpnRedactionService } from "./vpnRedactionService";

export type WireGuardParseResult =
  | {
      ok: true;
      profileName: string;
      providerName: string;
      routeMode: VpnProfile["routeMode"];
      protocol: VpnProfile["protocol"];
      config: VpnProfile["config"];
      auth: VpnProfile["auth"];
      policy: VpnProfile["policy"];
      warnings: string[];
      security: VpnProfile["security"];
      redactedSummary: string;
    }
  | { ok: false; error: string; warnings: string[]; redactedSummary: string };

export function parseWireGuardConfig(text: string): WireGuardParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  let inInterface = false;
  let inPeer = false;
  let endpointHost: string | undefined;
  let endpointPort: number | undefined;
  let privateKey = false;
  let presharedKey = false;
  let allowedIps: string[] = [];
  let dnsServers: string[] = [];
  let address: string[] = [];
  let profileName = "WireGuard Profile";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line === "[Interface]") {
      inInterface = true;
      inPeer = false;
      continue;
    }
    if (line === "[Peer]") {
      inPeer = true;
      inInterface = false;
      continue;
    }
    if (line.startsWith("PrivateKey")) privateKey = true;
    if (line.startsWith("PresharedKey")) presharedKey = true;
    if (line.startsWith("Endpoint")) {
      const value = line.split("=", 2)[1]?.trim() ?? "";
      const [host, port] = value.split(":");
      endpointHost = host || endpointHost;
      endpointPort = port ? Number(port) : endpointPort;
    }
    if (line.startsWith("AllowedIPs")) {
      allowedIps = line.split("=", 2)[1]?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? allowedIps;
    }
    if (line.startsWith("DNS")) {
      dnsServers = line.split("=", 2)[1]?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? dnsServers;
    }
    if (line.startsWith("Address")) {
      address = line.split("=", 2)[1]?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? address;
    }
    if (line.startsWith("AllowedIPs") && line.includes("0.0.0.0/0")) {
      warnings.push("AllowedIPs includes 0.0.0.0/0, which is a full tunnel.");
    }
  }

  if (!privateKey) {
    return { ok: false, error: "WireGuard config is missing PrivateKey.", warnings, redactedSummary: vpnRedactionService.redactText(text).slice(0, 1000) };
  }
  if (!endpointHost) {
    warnings.push("Endpoint is missing.");
  }
  if (dnsServers.length === 0) {
    warnings.push("DNS is missing.");
  }
  if (!allowedIps.length) {
    warnings.push("AllowedIPs is missing; route behavior may be incomplete.");
  }
  if (presharedKey) {
    warnings.push("PresharedKey will be redacted from logs and exports.");
  }
  if (!address.length) {
    warnings.push("Address is missing.");
  }

  return {
    ok: true,
    profileName,
    providerName: "WireGuard",
    routeMode: "system_tunnel",
    protocol: "wireguard",
    config: {
      endpointHost,
      endpointPort,
      dnsServers,
      allowedIps,
      splitTunnel: !allowedIps.includes("0.0.0.0/0") && !allowedIps.includes("::/0"),
    },
    auth: {
      requiresUsername: false,
      requiresPassword: false,
      requiresToken: false,
      requiresPrivateKey: true,
      requiresCertificate: false,
      credentialsStored: false,
    },
    policy: {
      killSwitchEnabled: true,
      blockOnDnsLeak: true,
      blockOnIpMismatch: true,
      autoReconnect: true,
      allowExternalVerification: true,
      allowSystemWideTunnel: true,
      requireUserConfirmationForConnect: true,
    },
    warnings,
    security: warnings.length > 0 ? "warning" : "safe",
    redactedSummary: vpnRedactionService.redactText(text).slice(0, 1500),
  };
}
