import type { VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import { vpnRedactionService } from "./vpnRedactionService";

export type ProxyParseResult =
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

function parseJsonProxy(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseProxyConfig(text: string): ProxyParseResult {
  const warnings: string[] = [];
  const trimmed = text.trim();
  const parsed = parseJsonProxy(trimmed);

  let protocol: VpnProfile["protocol"] = "unknown";
  let host: string | undefined;
  let port: number | undefined;
  let pacUrl: string | undefined;
  let usernameRequired = false;
  let bypassRules: string[] = ["localhost", "127.0.0.1", "<local>"];
  let dnsMode: "system" | "proxy_dns" | "unknown" = "unknown";

  if (parsed) {
    const rawProtocol = typeof parsed.protocol === "string" ? parsed.protocol.toLowerCase() : "";
    if (rawProtocol === "http" || rawProtocol === "https" || rawProtocol === "socks5" || rawProtocol === "pac") {
      protocol = rawProtocol === "socks5" ? "socks5_proxy" : rawProtocol === "https" ? "https_proxy" : "http_proxy";
    }
    host = typeof parsed.host === "string" ? parsed.host : undefined;
    port = typeof parsed.port === "number" ? parsed.port : undefined;
    usernameRequired = Boolean(parsed.username || parsed.usernameRequired);
    pacUrl = typeof parsed.pacUrl === "string" ? parsed.pacUrl : undefined;
    if (Array.isArray(parsed.bypassRules)) {
      bypassRules = parsed.bypassRules.filter((item): item is string => typeof item === "string");
    }
    dnsMode = parsed.proxyDns ? "proxy_dns" : dnsMode;
  } else {
    const url = /^https?:\/\//i.test(trimmed) || /^socks5:\/\//i.test(trimmed) ? new URL(trimmed) : null;
    if (url) {
      const proto = url.protocol.replace(":", "");
      protocol = proto === "socks5" ? "socks5_proxy" : proto === "https" ? "https_proxy" : "http_proxy";
      host = url.hostname;
      port = url.port ? Number(url.port) : undefined;
      usernameRequired = Boolean(url.username || url.password);
      warnings.push("Proxy credentials detected in URL form; they will be redacted.");
    } else {
      return {
        ok: false,
        error: "Unsupported proxy config format.",
        warnings,
        redactedSummary: vpnRedactionService.redactText(trimmed).slice(0, 1000),
      };
    }
  }

  if (!host && protocol !== "external") warnings.push("Proxy host is missing.");
  if (!port && protocol !== "pac") warnings.push("Proxy port is missing.");
  if (protocol === "pac" && !pacUrl) warnings.push("PAC URL is missing.");
  if (usernameRequired) warnings.push("Proxy authentication may be required.");

  return {
    ok: true,
    profileName: "Browser Proxy",
    providerName: "Proxy",
    routeMode: "browser_proxy",
    protocol,
    config: {
      endpointHost: host,
      endpointPort: port,
      proxyUrl: protocol === "pac" ? pacUrl : host && port ? `${protocol.startsWith("socks5") ? "socks5" : protocol.replace("_proxy", "")}://${host}:${port}` : undefined,
    },
    auth: {
      requiresUsername: usernameRequired,
      requiresPassword: usernameRequired,
      requiresToken: false,
      requiresPrivateKey: false,
      requiresCertificate: false,
      credentialsStored: false,
    },
    policy: {
      killSwitchEnabled: true,
      blockOnDnsLeak: true,
      blockOnIpMismatch: true,
      autoReconnect: true,
      allowExternalVerification: true,
      allowSystemWideTunnel: false,
      requireUserConfirmationForConnect: true,
    },
    warnings,
    security: warnings.length > 0 ? "warning" : "safe",
    redactedSummary: vpnRedactionService.redactText(trimmed).slice(0, 1500),
  };
}
