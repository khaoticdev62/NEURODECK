import * as fs from "fs";
import * as path from "path";
import type { VpnProfile } from "../../../shared/browser-vpn/vpnProfileTypes";
import { vpnRedactionService } from "./vpnRedactionService";

type PersistedState = {
  profiles: VpnProfile[];
  importedConfigs: Record<string, { kind: "openvpn" | "wireguard" | "proxy" | "external"; text: string }>;
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class VpnProfileService {
  private statePath: string;
  private state: PersistedState = { profiles: [], importedConfigs: {} };

  constructor() {
    try {
      const { app } = require("electron");
      this.statePath = path.join(app.getPath("userData"), "browser-vpn-profiles.json");
    } catch {
      this.statePath = path.join(process.cwd(), "browser-vpn-profiles.test.json");
    }
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, "utf-8");
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed && Array.isArray(parsed.profiles)) {
          this.state = {
            profiles: parsed.profiles,
            importedConfigs: parsed.importedConfigs || {},
          };
        }
      }
    } catch (err) {
      console.error("[vpn] failed to load profile store:", err);
      this.state = { profiles: [], importedConfigs: {} };
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("[vpn] failed to save profile store:", err);
    }
  }

  listProfiles(): VpnProfile[] {
    return this.state.profiles.map((profile) => ({ ...profile, warnings: [...profile.warnings] }));
  }

  getProfile(id: string): VpnProfile | undefined {
    return this.state.profiles.find((profile) => profile.id === id);
  }

  upsertProfile(profile: VpnProfile): VpnProfile {
    const now = new Date().toISOString();
    const next = {
      ...profile,
      id: profile.id || makeId("vpn"),
      updatedAt: now,
      createdAt: profile.createdAt || now,
      warnings: profile.warnings || [],
      diagnostics: profile.diagnostics || { lastState: "not_configured" as const },
    };
    const index = this.state.profiles.findIndex((item) => item.id === next.id);
    if (index >= 0) this.state.profiles[index] = next;
    else this.state.profiles.push(next);
    this.save();
    return next;
  }

  deleteProfile(id: string): boolean {
    const before = this.state.profiles.length;
    this.state.profiles = this.state.profiles.filter((profile) => profile.id !== id);
    delete this.state.importedConfigs[id];
    this.save();
    return this.state.profiles.length !== before;
  }

  saveImportedConfig(profileId: string, kind: "openvpn" | "wireguard" | "proxy" | "external", text: string) {
    this.state.importedConfigs[profileId] = { kind, text };
    this.save();
  }

  getImportedConfig(profileId: string): { kind: "openvpn" | "wireguard" | "proxy" | "external"; text: string } | undefined {
    return this.state.importedConfigs[profileId];
  }

  redactForExport(profile: VpnProfile): VpnProfile {
    return vpnRedactionService.redactObject(profile);
  }

  createProfile(input: Partial<VpnProfile> & Pick<VpnProfile, "name" | "providerName" | "routeMode" | "protocol">): VpnProfile {
    const now = new Date().toISOString();
    return this.upsertProfile({
      id: input.id ?? makeId("vpn"),
      name: input.name,
      providerName: input.providerName,
      routeMode: input.routeMode,
      protocol: input.protocol,
      browserProfileIds: input.browserProfileIds ?? [],
      config: input.config ?? {},
      auth: input.auth ?? {
        requiresUsername: false,
        requiresPassword: false,
        requiresToken: false,
        requiresPrivateKey: false,
        requiresCertificate: false,
        credentialsStored: false,
      },
      policy: input.policy ?? {
        killSwitchEnabled: true,
        blockOnDnsLeak: true,
        blockOnIpMismatch: true,
        autoReconnect: true,
        allowExternalVerification: true,
        allowSystemWideTunnel: true,
        requireUserConfirmationForConnect: true,
      },
      diagnostics: input.diagnostics ?? { lastState: "not_configured" },
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      security: input.security ?? "warning",
      warnings: input.warnings ?? [],
    });
  }
}

export const vpnProfileService = new VpnProfileService();
