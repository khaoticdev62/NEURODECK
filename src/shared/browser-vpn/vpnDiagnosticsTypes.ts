import type { VpnConnectionState } from "./vpnProviderTypes";

export type VpnConnectionEvidence = {
  requestId: string;
  profileId: string;
  timestamp: string;
  probe:
    | "config_parse"
    | "runtime_detect"
    | "connect_attempt"
    | "process_status"
    | "proxy_apply"
    | "browser_request"
    | "public_ip_check"
    | "dns_check"
    | "route_check"
    | "kill_switch_block"
    | "self_healing_recovery";
  status: "passed" | "failed" | "blocked" | "skipped";
  realTransportUsed: boolean;
  mockDataDetected: boolean;
  durationMs: number;
  source: string;
  target: string;
  redactedSummary: string;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    userAction?: string;
  };
};

export type VpnProviderSupport = {
  providerName: string;
  openVpn: boolean;
  wireGuard: boolean;
  proxy: boolean;
  systemApp: boolean;
  cli: boolean;
  status: string;
  notes: string;
};

export type VpnDiagnosticsReport = {
  status: VpnConnectionState;
  activeProfileId: string | null;
  routeMode: string | null;
  protocol: string | null;
  supportsKillSwitch: boolean;
  supportsSelfHealing: boolean;
  activeProfiles: number;
  blockedRequests: number;
  lastEvidence: VpnConnectionEvidence | null;
  providerMatrix: VpnProviderSupport[];
  warnings: string[];
};
