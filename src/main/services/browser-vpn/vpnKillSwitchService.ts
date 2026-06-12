import type { VpnConnectionState } from "../../../shared/browser-vpn/vpnProviderTypes";

type BlockState = {
  profileId: string;
  state: VpnConnectionState;
  killSwitchEnabled: boolean;
  reason: string;
  updatedAt: string;
  blockedRequests: number;
};

export class VpnKillSwitchService {
  private blocks = new Map<string, BlockState>();

  setState(profileId: string, state: VpnConnectionState, killSwitchEnabled: boolean, reason: string) {
    this.blocks.set(profileId, {
      profileId,
      state,
      killSwitchEnabled,
      reason,
      updatedAt: new Date().toISOString(),
      blockedRequests: this.blocks.get(profileId)?.blockedRequests ?? 0,
    });
  }

  isBlocked(profileId: string): boolean {
    const state = this.blocks.get(profileId);
    if (!state) return false;
    if (!state.killSwitchEnabled) return false;
    return state.state !== "connected" && state.state !== "verifying";
  }

  registerBlockedRequest(profileId: string): BlockState | null {
    const state = this.blocks.get(profileId);
    if (!state) return null;
    state.blockedRequests += 1;
    state.updatedAt = new Date().toISOString();
    return { ...state };
  }

  getState(profileId: string): BlockState | null {
    const state = this.blocks.get(profileId);
    return state ? { ...state } : null;
  }

  listStates(): BlockState[] {
    return Array.from(this.blocks.values()).map((item) => ({ ...item }));
  }
}

export const vpnKillSwitchService = new VpnKillSwitchService();
