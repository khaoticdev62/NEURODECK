import { describe, expect, it } from "vitest";
import { detectControllerKind, mapButtonsToActions } from "../../input/controller/gamepadMapper";

describe("gamepadMapper", () => {
  it("detects Steam Deck and major controller families", () => {
    expect(detectControllerKind("Steam Deck Controller")).toBe("steam_deck");
    expect(detectControllerKind("Xbox Wireless Controller")).toBe("xbox");
    expect(detectControllerKind("DualSense Wireless Controller")).toBe("dualsense");
    expect(detectControllerKind("Wireless Controller")).toBe("dualshock");
    expect(detectControllerKind("")).toBe("unknown");
  });

  it("maps standard buttons into semantic controller actions", () => {
    const gamepad = {
      buttons: [
        { pressed: true, value: 1 },
        { pressed: true, value: 1 },
        { pressed: true, value: 1 },
        { pressed: false, value: 0 },
        { pressed: true, value: 1 },
        { pressed: true, value: 1 },
        { pressed: true, value: 0.7 },
        { pressed: true, value: 0.8 },
      ],
    } as unknown as Gamepad;

    const actions = mapButtonsToActions(gamepad, "south", 0.45);
    expect(actions).toContain("confirm");
    expect(actions).toContain("cancel");
    expect(actions).toContain("reload");
    expect(actions).toContain("previousTab");
    expect(actions).toContain("nextTab");
    expect(actions).toContain("pageUp");
    expect(actions).toContain("pageDown");
  });
});
