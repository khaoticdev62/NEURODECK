import { describe, expect, it } from "vitest";
import { RepeatManager } from "../../input/controller/repeatManager";

describe("RepeatManager", () => {
  it("fires immediately on first press, then waits for repeat delay", () => {
    const repeat = new RepeatManager();
    expect(repeat.decide("focusDown", true, 1000, 300, 80).fire).toBe(true);
    expect(repeat.decide("focusDown", true, 1100, 300, 80).fire).toBe(false);
    expect(repeat.decide("focusDown", true, 1300, 300, 80).fire).toBe(true);
    expect(repeat.decide("focusDown", true, 1370, 300, 80).fire).toBe(false);
    expect(repeat.decide("focusDown", true, 1380, 300, 80).fire).toBe(true);
  });

  it("resets repeat state after release", () => {
    const repeat = new RepeatManager();
    repeat.decide("focusRight", true, 500, 300, 80);
    repeat.decide("focusRight", false, 600, 300, 80);
    expect(repeat.decide("focusRight", true, 700, 300, 80).fire).toBe(true);
  });
});
