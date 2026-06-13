import * as fs from "fs";
import * as path from "path";
import { app, session } from "electron";
import type { BrowserProxyProfile, VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import type { VpnConnectionEvidence, VpnDiagnosticsReport, VpnProviderSupport } from "../../../shared/browser-vpn/vpnDiagnosticsTypes";
import { vpnProfileService } from "./vpnProfileService";
import { vpnConfigImportService } from "./vpnConfigImportService";
import { vpnConnectionVerifier } from "./vpnConnectionVerifier";
import { vpnKillSwitchService } from "./vpnKillSwitchService";
import { vpnKillSwitchEnforcer } from "./vpnKillSwitchEnforcer";
import { vpnSelfHealingService, type VpnRecoveryEvent } from "./vpnSelfHealingService";
import { vpnProviderAdapterRegistry } from "./vpnProviderAdapterRegistry";
import { proxyRuntimeAdapter } from "./proxyRuntimeAdapter";
import { openVpnRuntimeAdapter } from "./openVpnRuntimeAdapter";
import { wireGuardRuntimeAdapter } from "./wireGuardRuntimeAdapter";
import { vpnExternalVerificationService } from "./vpnExternalVerificationService";
import { browserProfileService } from "../browser/browserProfileService";
import { vpnRedactionService } from "./vpnRedactionService";

type ChangeListener = (profile: VpnProfile | null) => void;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class VpnRouteManager {
  private evidence: VpnConnectionEvidence[] = [];
  private listeners: Set<ChangeListener> = new Set();
  private activeProfileId: string | null = null;
  private blockedRequests = 0;

  onChange(listener: ChangeListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(profileId: string | null) {
    const profile = profileId ? vpnProfileService.getProfile(profileId) ?? null : null;
    for (const listener of this.listeners) {
      try {
        listener(profile);
      } catch (err) {
        console.error("[vpn] listener error:", err);
      }
    }
  }

  private async enforceKillSwitch(profileId: string) {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return;
    const browserProfileIds = this.getBrowserProfilesForVpn(profileId);
    let proxyProfile: BrowserProxyProfile | undefined;
    if (profile.routeMode === "browser_proxy") {
      proxyProfile = {
        id: profile.id,
        name: profile.name,
        protocol: profile.config.proxyUrl && !profile.config.endpointHost && !profile.config.endpointPort
          ? "pac"
          : profile.protocol === "socks5_proxy"
            ? "socks5"
            : profile.protocol === "https_proxy"
              ? "https"
              : "http",
        host: profile.config.endpointHost,
        port: profile.config.endpointPort,
        usernameRequired: profile.auth.requiresUsername,
        passwordStored: profile.auth.credentialsStored,
        bypassRules: ["localhost", "127.0.0.1", "<local>"],
        dnsMode: profile.config.splitTunnel ? "system" : "proxy_dns",
        pacUrl: profile.config.proxyUrl,
      };
    }
    await vpnKillSwitchEnforcer.enforce(profileId, browserProfileIds, profile.routeMode, proxyProfile).catch(() => {});
  }

  private touch(profile: VpnProfile, state: Partial<VpnProfile["diagnostics"]> & { lastState?: VpnProfile["diagnostics"]["lastState"] }, warnings?: string[], security?: VpnProfile["security"]): VpnProfile {
    return vpnProfileService.upsertProfile({
      ...profile,
      warnings: warnings ?? profile.warnings,
      security: security ?? profile.security,
      diagnostics: {
        ...profile.diagnostics,
        ...state,
      },
    });
  }

  private async recordEvidence(profileId: string, probe: VpnConnectionEvidence["probe"], status: VpnConnectionEvidence["status"], source: string, target: string, summary: string, error?: VpnConnectionEvidence["error"], realTransportUsed = false): Promise<VpnConnectionEvidence> {
    const evidence = {
      requestId: makeId("evidence"),
      profileId,
      timestamp: new Date().toISOString(),
      probe,
      status,
      realTransportUsed,
      mockDataDetected: false,
      durationMs: 0,
      source,
      target,
      redactedSummary: vpnRedactionService.redactText(summary),
      error,
    } satisfies VpnConnectionEvidence;
    this.evidence.push(evidence);
    return evidence;
  }

  listProfiles(): VpnProfile[] {
    return vpnProfileService.listProfiles();
  }

  getProfile(id: string): VpnProfile | undefined {
    return vpnProfileService.getProfile(id);
  }

  createProfile(input: Parameters<typeof vpnProfileService.createProfile>[0]): VpnProfile {
    const profile = vpnProfileService.createProfile(input);
    this.emit(profile.id);
    return profile;
  }

  updateProfile(profile: VpnProfile): VpnProfile {
    const next = vpnProfileService.upsertProfile(profile);
    this.emit(next.id);
    return next;
  }

  deleteProfile(id: string): boolean {
    proxyRuntimeAdapter.clear(id).catch(() => {});
    openVpnRuntimeAdapter.disconnect(id);
    wireGuardRuntimeAdapter.disconnect(id);
    this.activeProfileId = this.activeProfileId === id ? null : this.activeProfileId;
    const ok = vpnProfileService.deleteProfile(id);
    this.emit(id);
    return ok;
  }

  importConfig(text: string, kind?: "openvpn" | "wireguard" | "proxy" | "external") {
    const result = vpnConfigImportService.importText(text, kind);
    if (result.ok) this.emit(result.profile.id);
    return result;
  }

  listTemplates() {
    return require("../../../shared/browser-vpn/vpnConfigTemplates").VPN_CONFIG_TEMPLATES;
  }

  getBrowserProfilesForVpn(profileId: string): string[] {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return [];
    return profile.browserProfileIds.length > 0 ? [...profile.browserProfileIds] : ["default"];
  }

  getVpnProfileForBrowserProfile(browserProfileId: string): VpnProfile | undefined {
    return vpnProfileService.listProfiles().find((profile) => profile.browserProfileIds.includes(browserProfileId));
  }

  async connect(profileId: string, browserProfileId?: string): Promise<{ ok: boolean; error?: string; evidence?: VpnConnectionEvidence[] }> {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return { ok: false, error: "vpn_profile_not_found" };

    this.activeProfileId = profileId;
    this.touch(profile, { lastState: "connecting", lastErrorCode: undefined, lastErrorMessage: undefined });
    this.emit(profileId);

    const imported = vpnProfileService.getImportedConfig(profileId);
    const evidence: VpnConnectionEvidence[] = [];

    if (profile.routeMode === "browser_proxy") {
      const proxyProfile: BrowserProxyProfile = {
        id: profile.id,
        name: profile.name,
        protocol: profile.config.proxyUrl && !profile.config.endpointHost && !profile.config.endpointPort
          ? "pac"
          : profile.protocol === "socks5_proxy"
            ? "socks5"
            : profile.protocol === "https_proxy"
              ? "https"
              : "http",
        host: profile.config.endpointHost,
        port: profile.config.endpointPort,
        usernameRequired: profile.auth.requiresUsername,
        passwordStored: profile.auth.credentialsStored,
        bypassRules: ["localhost", "127.0.0.1", "<local>"],
        dnsMode: profile.config.splitTunnel ? "system" : "proxy_dns",
        pacUrl: profile.config.proxyUrl,
      };
      const browserTargets = browserProfileId ? [browserProfileId] : this.getBrowserProfilesForVpn(profileId);
      for (const targetProfileId of browserTargets) {
        const applied = await proxyRuntimeAdapter.apply(targetProfileId, proxyProfile);
        evidence.push(await this.recordEvidence(profileId, "proxy_apply", applied.ok ? "passed" : "failed", "main", targetProfileId, applied.ok ? `proxy applied for ${targetProfileId}` : applied.error ?? "proxy apply failed", applied.ok ? undefined : { code: "PROXY_APPLY_FAILED", message: applied.error ?? "proxy apply failed", recoverable: true, userAction: "Check the proxy host, port, and credentials." }));
        if (!applied.ok) {
          this.touch(profile, { lastState: "error", lastErrorCode: "PROXY_APPLY_FAILED", lastErrorMessage: applied.error }, undefined, "danger");
          this.emit(profileId);
          return { ok: false, error: applied.error, evidence };
        }
      }
      const verify = await vpnConnectionVerifier.verify(profileId, "public_ip_check", "main", proxyProfile.host ?? "proxy", "connecting");
      evidence.push(verify);
      const nextState = verify.status === "passed" ? "connected" : "degraded";
      this.touch(profile, {
        lastState: nextState,
        lastVerifiedAt: verify.timestamp,
        lastPublicIp: verify.redactedSummary,
      }, profile.warnings, verify.status === "passed" ? "safe" : "warning");
      vpnKillSwitchService.setState(profileId, nextState, profile.policy.killSwitchEnabled, nextState === "connected" ? "proxy connected" : "verification failed");
      await this.enforceKillSwitch(profileId);
      this.emit(profileId);
      return { ok: true, evidence };
    }

    if (profile.routeMode === "external_verified") {
      const ext = await vpnExternalVerificationService.verify(profileId);
      evidence.push(...ext);
      const connected = ext.every((item) => item.status === "passed");
      const nextState = connected ? "connected" : "blocked";
      this.touch(profile, {
        lastState: nextState,
        lastVerifiedAt: new Date().toISOString(),
        lastDnsCheckStatus: ext.find((item) => item.probe === "dns_check")?.status,
      }, connected ? profile.warnings : [...profile.warnings, "External verification failed."], connected ? "safe" : "warning");
      vpnKillSwitchService.setState(profileId, nextState, profile.policy.killSwitchEnabled, connected ? "external verification passed" : "external verification failed");
      await this.enforceKillSwitch(profileId);
      this.emit(profileId);
      return connected ? { ok: true, evidence } : { ok: false, error: "external_verification_failed", evidence };
    }

    if (profile.protocol === "openvpn") {
      const config = imported?.text;
      if (!config) return { ok: false, error: "openvpn_config_missing" };
      const configPath = openVpnRuntimeAdapter.prepareConfig(profileId, config);
      const started = openVpnRuntimeAdapter.connect(profileId, configPath);
      evidence.push(await this.recordEvidence(profileId, "connect_attempt", started.ok ? "passed" : "failed", "main", configPath, started.ok ? "openvpn started" : started.error ?? "openvpn start failed", started.ok ? undefined : { code: "OPENVPN_START_FAILED", message: started.error ?? "openvpn start failed", recoverable: true, userAction: "Install openvpn or choose browser proxy mode." }));
      if (!started.ok) {
        this.touch(profile, { lastState: "error", lastErrorCode: "OPENVPN_START_FAILED", lastErrorMessage: started.error }, undefined, "danger");
        this.emit(profileId);
        return { ok: false, error: started.error, evidence };
      }
      const verify = await vpnConnectionVerifier.verify(profileId, "process_status", "main", `pid:${started.pid ?? "unknown"}`);
      evidence.push(verify);
      this.touch(profile, {
        lastState: "verifying",
        lastVerifiedAt: verify.timestamp,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
      }, profile.warnings, "warning");
      vpnKillSwitchService.setState(profileId, "verifying", profile.policy.killSwitchEnabled, "openvpn process started");
      await this.enforceKillSwitch(profileId);
      this.emit(profileId);
      return { ok: true, evidence };
    }

    if (profile.protocol === "wireguard") {
      const config = imported?.text;
      if (!config) return { ok: false, error: "wireguard_config_missing" };
      const configPath = wireGuardRuntimeAdapter.prepareConfig(profileId, config);
      const started = wireGuardRuntimeAdapter.connect(profileId, configPath);
      evidence.push(await this.recordEvidence(profileId, "connect_attempt", started.ok ? "passed" : "failed", "main", configPath, started.ok ? "wireguard started" : started.error ?? "wireguard start failed", started.ok ? undefined : { code: "WIREGUARD_START_FAILED", message: started.error ?? "wireguard start failed", recoverable: true, userAction: "Install wg-quick or choose browser proxy mode." }));
      if (!started.ok) {
        this.touch(profile, { lastState: "error", lastErrorCode: "WIREGUARD_START_FAILED", lastErrorMessage: started.error }, undefined, "danger");
        this.emit(profileId);
        return { ok: false, error: started.error, evidence };
      }
      this.touch(profile, {
        lastState: "verifying",
        lastVerifiedAt: new Date().toISOString(),
      }, profile.warnings, "warning");
      vpnKillSwitchService.setState(profileId, "verifying", profile.policy.killSwitchEnabled, "wireguard process started");
      await this.enforceKillSwitch(profileId);
      this.emit(profileId);
      return { ok: true, evidence };
    }

    if (profile.routeMode === "system_tunnel" || profile.protocol === "system_networkmanager" || profile.protocol === "provider_cli") {
      const nm = vpnProviderAdapterRegistry.detectCapabilities();
      const hasNm = nm.some((item) => item.command === "nmcli" && item.available);
      if (!hasNm) {
        this.touch(profile, { lastState: "blocked", lastErrorCode: "PRIVILEGES_REQUIRED", lastErrorMessage: "NetworkManager/nmcli is unavailable on this host." }, [...profile.warnings, "System tunnel runtime not detected."], "warning");
        vpnKillSwitchService.setState(profileId, "blocked", profile.policy.killSwitchEnabled, "system tunnel runtime unavailable");
        await this.enforceKillSwitch(profileId);
        this.emit(profileId);
        return { ok: false, error: "blocked_privileges_required" };
      }
      const config = imported?.text;
      if (!config) return { ok: false, error: "system_tunnel_config_missing" };
      const configPath = path.join(app.getPath("userData"), "browser-vpn-runtime", `${profileId}.conf`);
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, config, "utf-8");
      const nmcli = require("./vpnNetworkManagerAdapter").vpnNetworkManagerAdapter;
      const importedConn = nmcli.importConnection(configPath, profile.protocol === "wireguard" ? "wireguard" : "openvpn");
      evidence.push(await this.recordEvidence(profileId, "connect_attempt", importedConn.ok ? "passed" : "failed", "main", configPath, importedConn.ok ? "nmcli import started" : importedConn.error ?? "nmcli import failed", importedConn.ok ? undefined : { code: "NMCLI_IMPORT_FAILED", message: importedConn.error ?? "nmcli import failed", recoverable: true, userAction: "Install NetworkManager VPN support or use browser proxy mode." }));
      if (!importedConn.ok || !importedConn.connectionId) {
        this.touch(profile, { lastState: "error", lastErrorCode: "NMCLI_IMPORT_FAILED", lastErrorMessage: importedConn.error }, undefined, "danger");
        vpnKillSwitchService.setState(profileId, "error", profile.policy.killSwitchEnabled, "NetworkManager import failed");
        await this.enforceKillSwitch(profileId);
        this.emit(profileId);
        return { ok: false, error: importedConn.error, evidence };
      }
      const up = nmcli.up(importedConn.connectionId);
      if (!up.ok) {
        this.touch(profile, { lastState: "error", lastErrorCode: "NMCLI_UP_FAILED", lastErrorMessage: up.error }, undefined, "danger");
        vpnKillSwitchService.setState(profileId, "error", profile.policy.killSwitchEnabled, "NetworkManager connection failed");
        await this.enforceKillSwitch(profileId);
        this.emit(profileId);
        return { ok: false, error: up.error, evidence };
      }
      const verify = await vpnConnectionVerifier.verify(profileId, "route_check", "main", importedConn.connectionId, "connecting");
      evidence.push(verify);
      this.touch(profile, {
        lastState: verify.status === "passed" ? "connected" : "degraded",
        lastVerifiedAt: verify.timestamp,
      }, profile.warnings, verify.status === "passed" ? "safe" : "warning");
      vpnKillSwitchService.setState(profileId, verify.status === "passed" ? "connected" : "degraded", profile.policy.killSwitchEnabled, "system tunnel verified");
      await this.enforceKillSwitch(profileId);
      this.emit(profileId);
      return { ok: true, evidence };
    }

    this.touch(profile, { lastState: "unsupported", lastErrorCode: "UNSUPPORTED_PROVIDER", lastErrorMessage: "This provider does not expose a supported config or runtime." }, [...profile.warnings, "Unsupported provider."], "warning");
    vpnKillSwitchService.setState(profileId, "unsupported", profile.policy.killSwitchEnabled, "unsupported provider");
    await this.enforceKillSwitch(profileId);
    this.emit(profileId);
    return { ok: false, error: "unsupported_provider_locked_client" };
  }

  async disconnect(profileId: string): Promise<{ ok: boolean; error?: string }> {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return { ok: false, error: "vpn_profile_not_found" };
    const browserTargets = this.getBrowserProfilesForVpn(profileId);
    for (const targetProfileId of browserTargets) {
      await proxyRuntimeAdapter.clear(targetProfileId);
    }
    openVpnRuntimeAdapter.disconnect(profileId);
    wireGuardRuntimeAdapter.disconnect(profileId);
    const next = vpnProfileService.upsertProfile({
      ...profile,
      diagnostics: { ...profile.diagnostics, lastState: "disconnected" },
      updatedAt: new Date().toISOString(),
    });
    vpnKillSwitchService.setState(profileId, "disconnected", profile.policy.killSwitchEnabled, "manual disconnect");
    await this.enforceKillSwitch(profileId);
    this.emit(next.id);
    return { ok: true };
  }

  async verify(profileId: string): Promise<{ ok: boolean; evidence: VpnConnectionEvidence[]; state: VpnProfile["diagnostics"]["lastState"] }> {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return { ok: false, evidence: [], state: "not_configured" };
    const state = profile.diagnostics.lastState;
    const evidence: VpnConnectionEvidence[] = [];
    if (profile.routeMode === "browser_proxy") {
      evidence.push(await vpnConnectionVerifier.verify(profileId, "proxy_apply", "main", `${profile.config.endpointHost ?? "proxy"}:${profile.config.endpointPort ?? 0}`, state));
      evidence.push(await vpnConnectionVerifier.verify(profileId, "public_ip_check", "main", profile.config.endpointHost ?? "proxy", state));
      evidence.push(await vpnConnectionVerifier.verify(profileId, "dns_check", "main", profile.config.endpointHost ?? "proxy", state));
    } else if (profile.routeMode === "external_verified") {
      evidence.push(...await vpnExternalVerificationService.verify(profileId));
    } else {
      evidence.push(await vpnConnectionVerifier.verify(profileId, "process_status", "main", profile.config.endpointHost ?? "runtime", state));
      evidence.push(await vpnConnectionVerifier.verify(profileId, "public_ip_check", "main", profile.config.endpointHost ?? "runtime", state));
      evidence.push(await vpnConnectionVerifier.verify(profileId, "dns_check", "main", profile.config.endpointHost ?? "runtime", state));
      evidence.push(await vpnConnectionVerifier.verify(profileId, "route_check", "main", profile.config.endpointHost ?? "runtime", state));
    }
    this.evidence.push(...evidence);
    const passed = evidence.every((item) => item.status === "passed");
    const nextState = passed ? "connected" : "degraded";
    const next = vpnProfileService.upsertProfile({
      ...profile,
      diagnostics: {
        ...profile.diagnostics,
        lastState: nextState,
        lastVerifiedAt: new Date().toISOString(),
        lastPublicIp: evidence.find((item) => item.probe === "public_ip_check")?.redactedSummary,
        lastDnsCheckStatus: evidence.find((item) => item.probe === "dns_check")?.status,
      },
      security: passed ? "safe" : "warning",
      warnings: passed ? profile.warnings : [...profile.warnings, "VPN verification produced warnings."],
      updatedAt: new Date().toISOString(),
    });
    vpnKillSwitchService.setState(profileId, nextState, profile.policy.killSwitchEnabled, passed ? "verification passed" : "verification warnings");
    await this.enforceKillSwitch(profileId);
    this.emit(next.id);
    return { ok: true, evidence, state: nextState };
  }

  async repair(profileId: string): Promise<{ ok: boolean; event: VpnRecoveryEvent; evidence: VpnConnectionEvidence[] }> {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) {
      const event = await vpnSelfHealingService.recover(profileId, "error", "missing profile");
      return { ok: false, event, evidence: [] };
    }
    const event = await vpnSelfHealingService.recover(profileId, profile.diagnostics.lastState, profile.diagnostics.lastErrorMessage || "self-heal request");
    const evidence: VpnConnectionEvidence[] = [];
    if (event.status === "passed") {
      const reconnect = await this.connect(profileId);
      if (reconnect.evidence) evidence.push(...reconnect.evidence);
    }
    this.emit(profileId);
    return { ok: event.status === "passed", event, evidence };
  }

  setKillSwitch(profileId: string, enabled: boolean): { ok: boolean; profile?: VpnProfile } {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile) return { ok: false };
    const updated = vpnProfileService.upsertProfile({
      ...profile,
      policy: { ...profile.policy, killSwitchEnabled: enabled },
      updatedAt: new Date().toISOString(),
    });
    vpnKillSwitchService.setState(profileId, updated.diagnostics.lastState, enabled, enabled ? "kill switch enabled" : "kill switch disabled");
    void this.enforceKillSwitch(profileId).catch(() => {});
    this.emit(profileId);
    return { ok: true, profile: updated };
  }

  async applyBrowserProxy(profileId: string, browserProfileId?: string): Promise<{ ok: boolean; error?: string }> {
    const profile = vpnProfileService.getProfile(profileId);
    if (!profile || profile.routeMode !== "browser_proxy") return { ok: false, error: "profile_not_browser_proxy" };
    const proxyProfile: BrowserProxyProfile = {
      id: profile.id,
      name: profile.name,
      protocol: profile.config.proxyUrl && !profile.config.endpointHost && !profile.config.endpointPort
        ? "pac"
        : profile.protocol === "socks5_proxy"
          ? "socks5"
          : profile.protocol === "https_proxy"
            ? "https"
            : "http",
      host: profile.config.endpointHost,
      port: profile.config.endpointPort,
      usernameRequired: profile.auth.requiresUsername,
      passwordStored: profile.auth.credentialsStored,
      bypassRules: ["localhost", "127.0.0.1", "<local>"],
      dnsMode: profile.config.splitTunnel ? "system" : "proxy_dns",
      pacUrl: profile.config.proxyUrl,
    };
    const targetProfileId = browserProfileId ?? this.getBrowserProfilesForVpn(profileId)[0] ?? "default";
    const result = await proxyRuntimeAdapter.apply(targetProfileId, proxyProfile);
    if (result.ok) {
      vpnKillSwitchService.setState(profileId, "connected", profile.policy.killSwitchEnabled, "browser proxy applied");
      await this.enforceKillSwitch(profileId);
    }
    return result;
  }

  async clearBrowserProxy(profileId: string, browserProfileId?: string): Promise<{ ok: boolean; error?: string }> {
    const targets = browserProfileId ? [browserProfileId] : this.getBrowserProfilesForVpn(profileId);
    let last: { ok: boolean; error?: string } = { ok: true };
    for (const targetProfileId of targets) {
      last = await proxyRuntimeAdapter.clear(targetProfileId);
    }
    if (last.ok) {
      const profile = vpnProfileService.getProfile(profileId);
      if (profile) {
        vpnKillSwitchService.setState(profileId, "disconnected", profile.policy.killSwitchEnabled, "proxy cleared");
        await this.enforceKillSwitch(profileId);
      }
    }
    return last;
  }

  shouldBlockBrowserRequest(profileId: string, url: string): boolean {
    const profile = this.getVpnProfileForBrowserProfile(profileId);
    if (!profile) return false;
    if (!profile.policy.killSwitchEnabled) return false;
    const allowed = url.startsWith("about:") || url.startsWith("neurodeck:") || url.startsWith("chrome:") || url.startsWith("devtools:");
    if (allowed) return false;
    const blocked = vpnKillSwitchService.isBlocked(profile.id);
    if (blocked) {
      this.blockedRequests += 1;
      this.recordEvidence(profile.id, "kill_switch_block", "blocked", "browser", url, "Browser request blocked because VPN route is inactive.", {
        code: "VPN_KILLSWITCH_BLOCKED",
        message: "Browser traffic blocked while VPN is inactive.",
        recoverable: true,
        userAction: "Connect or verify the selected VPN profile, or disable the kill switch.",
      }).catch(() => {});
      vpnKillSwitchService.registerBlockedRequest(profile.id);
    }
    return blocked;
  }

  getStatus(profileId?: string): VpnDiagnosticsReport {
    const active = profileId ? vpnProfileService.getProfile(profileId) ?? null : (this.activeProfileId ? vpnProfileService.getProfile(this.activeProfileId) ?? null : null);
    const providerMatrix = vpnProfileService.listProfiles().map((profile) => vpnProviderAdapterRegistry.getProviderSupport(profile.providerName, profile.routeMode, profile.protocol));
    return {
      status: active?.diagnostics.lastState ?? "not_configured",
      activeProfileId: active?.id ?? null,
      routeMode: active?.routeMode ?? null,
      protocol: active?.protocol ?? null,
      supportsKillSwitch: Boolean(active?.policy.killSwitchEnabled),
      supportsSelfHealing: true,
      activeProfiles: vpnProfileService.listProfiles().length,
      blockedRequests: this.blockedRequests,
      lastEvidence: this.evidence.at(-1) ?? null,
      providerMatrix,
      warnings: active?.warnings ?? [],
    };
  }

  getEvidence(profileId?: string): VpnConnectionEvidence[] {
    return profileId ? this.evidence.filter((entry) => entry.profileId === profileId) : [...this.evidence];
  }

  getRecoveryEvents() {
    return vpnSelfHealingService.listEvents();
  }

  getProviderMatrix(): VpnProviderSupport[] {
    return vpnProfileService.listProfiles().map((profile) => vpnProviderAdapterRegistry.getProviderSupport(profile.providerName, profile.routeMode, profile.protocol));
  }

  exportRedactedProfile(profileId: string): VpnProfile | null {
    const profile = vpnProfileService.getProfile(profileId);
    return profile ? vpnProfileService.redactForExport(profile) : null;
  }
}

export const vpnRouteManager = new VpnRouteManager();
