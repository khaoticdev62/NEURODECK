import type { VpnConnectionState } from "../../../shared/browser-vpn/vpnProviderTypes";

export type VpnRecoveryEvent = {
  profileId: string;
  status: "passed" | "failed" | "blocked";
  reason: string;
  timestamp: string;
  attempts: number;
};

export class VpnSelfHealingService {
  private recoveryEvents: VpnRecoveryEvent[] = [];
  private attempts = new Map<string, number>();

  private canRetry(profileId: string): boolean {
    const count = this.attempts.get(profileId) ?? 0;
    return count < 3;
  }

  record(profileId: string, status: VpnRecoveryEvent["status"], reason: string) {
    const attempts = this.attempts.get(profileId) ?? 0;
    this.recoveryEvents.push({
      profileId,
      status,
      reason,
      timestamp: new Date().toISOString(),
      attempts,
    });
  }

  async recover(profileId: string, state: VpnConnectionState, reason: string): Promise<VpnRecoveryEvent> {
    const attempts = (this.attempts.get(profileId) ?? 0) + 1;
    this.attempts.set(profileId, attempts);
    if (!this.canRetry(profileId)) {
      const event: VpnRecoveryEvent = { profileId, status: "blocked", reason, timestamp: new Date().toISOString(), attempts };
      this.recoveryEvents.push(event);
      return event;
    }

    const recoverable = state === "degraded" || state === "error" || state === "recovering";
    const event: VpnRecoveryEvent = {
      profileId,
      status: recoverable ? "passed" : "blocked",
      reason: recoverable ? `Recovery attempt scheduled for ${profileId}` : `Recovery blocked for state ${state}`,
      timestamp: new Date().toISOString(),
      attempts,
    };
    this.recoveryEvents.push(event);
    return event;
  }

  listEvents(): VpnRecoveryEvent[] {
    return [...this.recoveryEvents];
  }
}

export const vpnSelfHealingService = new VpnSelfHealingService();
