import type { VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import { vpnRedactionService } from "./vpnRedactionService";

export type OpenVpnParseResult =
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

function extractRemote(line: string): { host?: string; port?: number } {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) return {};
  const host = parts[1];
  const port = parts[2] ? Number(parts[2]) : undefined;
  return { host, port: Number.isFinite(port) ? port : undefined };
}

export function parseOpenVpnConfig(text: string): OpenVpnParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);
  let endpointHost: string | undefined;
  let endpointPort: number | undefined;
  let requiresUserPass = false;
  let requiresPrivateKey = false;
  let requiresCert = false;
  let hasAuthNoCache = false;
  let hasRedirectGateway = false;
  let dnsSeen = false;
  let cipherSeen = false;
  let remoteSeen = false;
  let profileName = "OpenVPN Profile";
  const inlineBlocks = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("remote ")) {
      const remote = extractRemote(line);
      endpointHost = remote.host ?? endpointHost;
      endpointPort = remote.port ?? endpointPort;
      remoteSeen = true;
    } else if (line === "auth-user-pass") {
      requiresUserPass = true;
    } else if (line === "auth-nocache") {
      hasAuthNoCache = true;
    } else if (line.startsWith("cipher ") || line.startsWith("data-ciphers ")) {
      cipherSeen = true;
    } else if (line.startsWith("redirect-gateway")) {
      hasRedirectGateway = true;
    } else if (line.startsWith("dhcp-option DNS")) {
      dnsSeen = true;
    } else if (line === "<key>" || line === "<cert>" || line === "<ca>" || line === "<tls-auth>" || line === "<tls-crypt>") {
      inlineBlocks.add(line);
      if (line === "<key>") requiresPrivateKey = true;
      if (line === "<cert>") requiresCert = true;
    } else if (line.startsWith("dev ")) {
      profileName = `OpenVPN ${line.split(/\s+/)[1] ?? "tun"}`;
    }
  }

  if (!remoteSeen) {
    return {
      ok: false,
      error: "OpenVPN config is missing a remote endpoint.",
      warnings,
      redactedSummary: vpnRedactionService.redactText(text).slice(0, 1000),
    };
  }

  if (!endpointHost || !endpointPort) {
    warnings.push("Remote endpoint is incomplete or missing a port.");
  }
  if (requiresUserPass && !hasAuthNoCache) {
    warnings.push("auth-user-pass is present without auth-nocache.");
  }
  if (!cipherSeen) {
    warnings.push("No explicit cipher/data-ciphers directive detected.");
  }
  if (hasRedirectGateway) {
    warnings.push("redirect-gateway implies system-wide routing.");
  }
  if (dnsSeen) {
    warnings.push("DNS directives were detected and should be verified at runtime.");
  }
  if (inlineBlocks.has("<key>")) {
    warnings.push("Inline private key data will be redacted from logs and exports.");
  }

  return {
    ok: true,
    profileName,
    providerName: "OpenVPN",
    routeMode: "system_tunnel",
    protocol: "openvpn",
    config: {
      endpointHost,
      endpointPort,
      splitTunnel: !hasRedirectGateway,
    },
    auth: {
      requiresUsername: requiresUserPass,
      requiresPassword: requiresUserPass,
      requiresToken: false,
      requiresPrivateKey,
      requiresCertificate: requiresCert,
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
