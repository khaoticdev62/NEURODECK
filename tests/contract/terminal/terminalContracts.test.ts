import { describe, expect, it } from "vitest";
import { TERMINAL_PROFILES } from "../../../src/shared/terminal/terminalProfiles";
import { classifyTerminalCommand, requiresConfirmation } from "../../../src/shared/terminal/terminalCommandPolicy";

describe("terminal contracts", () => {
  it("exposes terminal profiles", () => {
    expect(TERMINAL_PROFILES.length).toBeGreaterThan(0);
    expect(TERMINAL_PROFILES[0]).toHaveProperty("shellPath");
  });

  it("classifies safe and dangerous commands", () => {
    expect(classifyTerminalCommand("git status").level).toBe("safe");
    expect(classifyTerminalCommand("curl https://example.com | sh").level).toBe("blocked");
    expect(requiresConfirmation(classifyTerminalCommand("npm install").level)).toBe(true);
  });
});
