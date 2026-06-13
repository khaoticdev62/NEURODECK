import { session } from "electron";
import { browserProfileService } from "../browser/browserProfileService";
import { proxyRuntimeAdapter } from "./proxyRuntimeAdapter";
import { vpnKillSwitchService } from "./vpnKillSwitchService";
import type { BrowserProxyProfile } from "../../../shared/browser-vpn/vpnProfileTypes";

const INVALID_PROXY = "http=127.0.0.1:9;https=127.0.0.1:9";

class VpnKillSwitchEnforcer {
  private activeKillSwitches = new Set<string>();

  async enforce(
    profileId: string,
    browserProfileIds: string[],
    routeMode: string,
    proxyProfile?: BrowserProxyProfile
  ) {
    const blocked = vpnKillSwitchService.isBlocked(profileId);
    const partitionIds = browserProfileIds
      .map((id) => browserProfileService.getProfile(id)?.partitionId)
      .filter(Boolean) as string[];

    if (!blocked) {
      if (this.activeKillSwitches.has(profileId)) {
        this.activeKillSwitches.delete(profileId);
        const state = vpnKillSwitchService.getState(profileId)?.state;
        const isActive = state === "connected" || state === "verifying";
        if (routeMode === "browser_proxy" && proxyProfile && isActive) {
          for (const browserProfileId of browserProfileIds) {
            await proxyRuntimeAdapter.apply(browserProfileId, proxyProfile).catch(() => {});
          }
        } else {
          for (const partitionId of partitionIds) {
            await session.fromPartition(partitionId).setProxy({ proxyRules: "direct://" }).catch(() => {});
          }
        }
      }
      return;
    }

    this.activeKillSwitches.add(profileId);
    for (const partitionId of partitionIds) {
      await session
        .fromPartition(partitionId)
        .setProxy({ proxyRules: INVALID_PROXY, proxyBypassRules: "localhost,127.0.0.1,<local>" })
        .catch(() => {});
    }
  }

  async releaseAll(browserProfileIds: string[]) {
    const partitionIds = browserProfileIds
      .map((id) => browserProfileService.getProfile(id)?.partitionId)
      .filter(Boolean) as string[];
    for (const partitionId of partitionIds) {
      await session.fromPartition(partitionId).setProxy({ proxyRules: "direct://" }).catch(() => {});
    }
  }
}

export const vpnKillSwitchEnforcer = new VpnKillSwitchEnforcer();
