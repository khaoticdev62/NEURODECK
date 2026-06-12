import { describe, expect, it } from "vitest";
import { TERMINAL_PROFILES } from "../../../src/shared/terminal/terminalProfiles";

describe("terminalProfiles", () => {
  it("provides production-ready built-in profiles", () => {
    expect(TERMINAL_PROFILES.some((profile) => profile.id === "steamos-bash")).toBe(true);
    expect(TERMINAL_PROFILES.some((profile) => profile.productionReady)).toBe(true);
  });

  it("defines safe environment policies", () => {
    for (const profile of TERMINAL_PROFILES) {
      expect(profile.envPolicy.blockedEnvKeys).toContain("GEMINI_API_KEY");
      expect(profile.aiAssist.autoExecuteAllowed).toBe(false);
    }
  });
});
