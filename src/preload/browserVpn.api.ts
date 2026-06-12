import type { BrowserProxyProfile, VpnProfile } from "../shared/browser-vpn/vpnProfileTypes";
import type { VpnConnectionEvidence, VpnDiagnosticsReport, VpnProviderSupport } from "../shared/browser-vpn/vpnDiagnosticsTypes";
import type { VpnConfigTemplate } from "../shared/browser-vpn/vpnConfigTemplates";

declare const contextBridge: any;
declare const ipcRenderer: any;

const CHANNELS = {
  LIST_PROFILES: "vpn:list-profiles",
  GET_PROFILE: "vpn:get-profile",
  CREATE_PROFILE: "vpn:create-profile",
  UPDATE_PROFILE: "vpn:update-profile",
  DELETE_PROFILE: "vpn:delete-profile",
  IMPORT_CONFIG: "vpn:import-config",
  VALIDATE_CONFIG: "vpn:validate-config",
  LIST_TEMPLATES: "vpn:list-templates",
  CONNECT: "vpn:connect",
  DISCONNECT: "vpn:disconnect",
  VERIFY: "vpn:verify",
  REPAIR: "vpn:repair",
  GET_STATUS: "vpn:get-status",
  GET_EVIDENCE: "vpn:get-evidence",
  GET_RECOVERY_EVENTS: "vpn:get-recovery-events",
  SET_KILL_SWITCH: "vpn:set-kill-switch",
  APPLY_BROWSER_PROXY: "vpn:apply-browser-proxy",
  CLEAR_BROWSER_PROXY: "vpn:clear-browser-proxy",
  GET_PROVIDER_MATRIX: "vpn:get-provider-matrix",
  EXPORT_REDACTED_PROFILE: "vpn:export-redacted-profile",
} as const;

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, payload ?? {});
}

export const browserVpnApi = {
  listProfiles: () => invoke<VpnProfile[]>(CHANNELS.LIST_PROFILES),
  getProfile: (profileId: string) => invoke<VpnProfile | null>(CHANNELS.GET_PROFILE, { profileId }),
  createProfile: (payload: Partial<VpnProfile> & Pick<VpnProfile, "name" | "providerName" | "routeMode" | "protocol">) =>
    invoke<VpnProfile>(CHANNELS.CREATE_PROFILE, payload),
  updateProfile: (payload: VpnProfile) => invoke<VpnProfile>(CHANNELS.UPDATE_PROFILE, payload),
  deleteProfile: (profileId: string) => invoke<{ success: boolean }>(CHANNELS.DELETE_PROFILE, { profileId }),
  importConfig: (text: string, kind?: "openvpn" | "wireguard" | "proxy" | "external") =>
    invoke<{ ok: boolean; error?: string; warnings: string[]; redactedSummary?: string }>(CHANNELS.IMPORT_CONFIG, { text, kind }),
  validateConfig: (text: string, kind?: "openvpn" | "wireguard" | "proxy" | "external") =>
    invoke<{ ok: boolean; error?: string; warnings: string[]; redactedSummary?: string }>(CHANNELS.VALIDATE_CONFIG, { text, kind }),
  listTemplates: () => invoke<VpnConfigTemplate[]>(CHANNELS.LIST_TEMPLATES),
  connect: (profileId: string, browserProfileId?: string) => invoke<{ ok: boolean; error?: string; evidence?: VpnConnectionEvidence[] }>(CHANNELS.CONNECT, { profileId, browserProfileId }),
  disconnect: (profileId: string) => invoke<{ ok: boolean; error?: string }>(CHANNELS.DISCONNECT, { profileId }),
  verify: (profileId: string) => invoke<{ ok: boolean; evidence: VpnConnectionEvidence[]; state: string }>(CHANNELS.VERIFY, { profileId }),
  repair: (profileId: string) => invoke<{ ok: boolean; event: unknown; evidence: VpnConnectionEvidence[] }>(CHANNELS.REPAIR, { profileId }),
  getStatus: (profileId?: string) => invoke<VpnDiagnosticsReport>(CHANNELS.GET_STATUS, { profileId }),
  getEvidence: (profileId?: string) => invoke<VpnConnectionEvidence[]>(CHANNELS.GET_EVIDENCE, { profileId }),
  getRecoveryEvents: () => invoke<unknown[]>(CHANNELS.GET_RECOVERY_EVENTS),
  setKillSwitch: (profileId: string, enabled: boolean) => invoke<{ ok: boolean; profile?: VpnProfile }>(CHANNELS.SET_KILL_SWITCH, { profileId, enabled }),
  applyBrowserProxy: (profileId: string, browserProfileId?: string) => invoke<{ ok: boolean; error?: string }>(CHANNELS.APPLY_BROWSER_PROXY, { profileId, browserProfileId }),
  clearBrowserProxy: (profileId: string, browserProfileId?: string) => invoke<{ ok: boolean; error?: string }>(CHANNELS.CLEAR_BROWSER_PROXY, { profileId, browserProfileId }),
  getProviderMatrix: () => invoke<VpnProviderSupport[]>(CHANNELS.GET_PROVIDER_MATRIX),
  exportRedactedProfile: (profileId: string) => invoke<VpnProfile | null>(CHANNELS.EXPORT_REDACTED_PROFILE, { profileId }),
};

declare global {
  interface Window {
    neurodeck?: {
      vpn?: typeof browserVpnApi;
      browser?: {
        setBounds?: (bounds: { x: number; y: number; width: number; height: number }) => Promise<unknown>;
        onBrowserEvent?: (callback: (data: unknown) => void) => (() => void);
      };
    };
  }
}

try {
  contextBridge.exposeInMainWorld("neurodeck", {
    ...(window as any).neurodeck,
    vpn: browserVpnApi,
  });
} catch {
  // no-op when bundled outside Electron
}

