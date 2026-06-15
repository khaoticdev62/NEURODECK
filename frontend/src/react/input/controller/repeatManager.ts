import type { ControllerAction } from "../../../shared/types/controller";

export interface RepeatDecision {
  fire: boolean;
  nextEligibleAt: number;
}

export class RepeatManager {
  private pressedAt = new Map<ControllerAction, number>();
  private nextEligibleAt = new Map<ControllerAction, number>();

  decide(
    action: ControllerAction,
    pressed: boolean,
    now: number,
    initialDelayMs: number,
    repeatIntervalMs: number
  ): RepeatDecision {
    if (!pressed) {
      this.pressedAt.delete(action);
      this.nextEligibleAt.delete(action);
      return { fire: false, nextEligibleAt: now };
    }

    if (!this.pressedAt.has(action)) {
      this.pressedAt.set(action, now);
      this.nextEligibleAt.set(action, now + initialDelayMs);
      return { fire: true, nextEligibleAt: now + initialDelayMs };
    }

    const nextAt = this.nextEligibleAt.get(action) ?? now;
    if (now < nextAt) {
      return { fire: false, nextEligibleAt: nextAt };
    }

    const nextEligibleAt = now + repeatIntervalMs;
    this.nextEligibleAt.set(action, nextEligibleAt);
    return { fire: true, nextEligibleAt };
  }
}
