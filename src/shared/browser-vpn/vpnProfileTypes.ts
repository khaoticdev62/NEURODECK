import type { VpnConnectionState, VpnProtocol, VpnRouteMode, VpnProfileSecurityState } from "./vpnProviderTypes";

export type BrowserProxyProfile = {
  id: string;
  name: string;
  protocol: "http" | "https" | "socks5" | "pac";
  host?: string;
  port?: number;
  usernameRequired: boolean;
  passwordStored: boolean;
  bypassRules: string[];
  dnsMode: "system" | "proxy_dns" | "unknown";
  pacUrl?: string;
};

export type VpnConfigAuth = {
  requiresUsername: boolean;
  requiresPassword: boolean;
  requiresToken: boolean;
  requiresPrivateKey: boolean;
  requiresCertificate: boolean;
  credentialsStored: boolean;
};

export type VpnPolicy = {
  killSwitchEnabled: boolean;
  blockOnDnsLeak: boolean;
  blockOnIpMismatch: boolean;
  autoReconnect: boolean;
  allowExternalVerification: boolean;
  allowSystemWideTunnel: boolean;
  requireUserConfirmationForConnect: boolean;
};

export type VpnProfileDiagnostics = {
  lastState: VpnConnectionState;
  lastVerifiedAt?: string;
  lastPublicIp?: string;
  lastExitCountry?: string;
  lastDnsCheckStatus?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

export type VpnProfile = {
  id: string;
  name: string;
  providerName: string;
  routeMode: VpnRouteMode;
  protocol: VpnProtocol;
  browserProfileIds: string[];
  config: {
    importedConfigId?: string;
    endpointHost?: string;
    endpointPort?: number;
    proxyUrl?: string;
    dnsServers?: string[];
    allowedIps?: string[];
    remoteRoutes?: string[];
    splitTunnel?: boolean;
  };
  auth: VpnConfigAuth;
  policy: VpnPolicy;
  diagnostics: VpnProfileDiagnostics;
  createdAt: string;
  updatedAt: string;
  security: VpnProfileSecurityState;
  warnings: string[];
};

export type BrowserProxyApplyResult =
  | { ok: true; profileId: string; partitionId: string; appliedAt: string }
  | { ok: false; profileId: string; error: string; code: string };
