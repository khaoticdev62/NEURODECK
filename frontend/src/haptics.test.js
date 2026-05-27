import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerHaptic, setHapticsEnabled } from "./haptics.js";
import { state } from "./state.js";

let testTime = 1000;

describe("triggerHaptic", () => {
  let pulseMock;
  let getGamepadsSpy;

  beforeEach(() => {
    state.hapticsEnabled = true;
    vi.useFakeTimers({ shouldAdvanceTime: true });

    pulseMock = vi.fn().mockResolvedValue(undefined);
    const mockGamepad = {
      connected: true,
      vibrationActuator: { pulse: pulseMock },
    };

    testTime += 100;
    vi.spyOn(performance, "now").mockImplementation(() => testTime);
    getGamepadsSpy = vi
      .spyOn(navigator, "getGamepads")
      .mockReturnValue([mockGamepad]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("no-ops when haptics are disabled", () => {
    state.hapticsEnabled = false;
    triggerHaptic("light");
    expect(pulseMock).not.toHaveBeenCalled();
  });

  it("no-ops for unknown preset", () => {
    triggerHaptic("nonexistent");
    expect(pulseMock).not.toHaveBeenCalled();
  });

  it("no-ops when no gamepad is connected", () => {
    getGamepadsSpy.mockReturnValue([]);
    triggerHaptic("light");
    expect(pulseMock).not.toHaveBeenCalled();
  });

  it("fires pulse for a simple preset", () => {
    triggerHaptic("light");
    expect(pulseMock).toHaveBeenCalledTimes(1);
    expect(pulseMock).toHaveBeenCalledWith(0.15, 30);
  });

  it("fires pulse for medium preset", () => {
    triggerHaptic("medium");
    expect(pulseMock).toHaveBeenCalledWith(0.35, 50);
  });

  it("fires pulse for heavy preset", () => {
    triggerHaptic("heavy");
    expect(pulseMock).toHaveBeenCalledWith(0.7, 80);
  });

  it("fires pulse for tick preset", () => {
    triggerHaptic("tick");
    expect(pulseMock).toHaveBeenCalledWith(0.1, 15);
  });

  it("debounces rapid calls", () => {
    triggerHaptic("light");
    triggerHaptic("light");
    triggerHaptic("light");
    expect(pulseMock).toHaveBeenCalledTimes(1);
  });

  it("force flag bypasses debounce", () => {
    triggerHaptic("light");
    triggerHaptic("light", true);
    expect(pulseMock).toHaveBeenCalledTimes(2);
  });

  it("schedules sequenced patterns with setTimeout", () => {
    triggerHaptic("success");
    expect(pulseMock).toHaveBeenCalledTimes(0); // setTimeout pending
    vi.advanceTimersByTime(1);
    expect(pulseMock).toHaveBeenCalledTimes(1); // first pulse executes
    vi.advanceTimersByTime(100);
    expect(pulseMock).toHaveBeenCalledTimes(2); // second pulse executes
  });

  it("schedules error pattern with three pulses", () => {
    triggerHaptic("error");
    expect(pulseMock).toHaveBeenCalledTimes(0); // setTimeout pending
    vi.advanceTimersByTime(1);
    expect(pulseMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(pulseMock).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    expect(pulseMock).toHaveBeenCalledTimes(3);
  });

  it("gracefully ignores pulse rejection", () => {
    pulseMock.mockRejectedValue(new Error("unsupported"));
    expect(() => triggerHaptic("light")).not.toThrow();
  });
});

describe("setHapticsEnabled", () => {
  it("toggles the state flag", () => {
    setHapticsEnabled(false);
    expect(state.hapticsEnabled).toBe(false);
    setHapticsEnabled(true);
    expect(state.hapticsEnabled).toBe(true);
  });
});
