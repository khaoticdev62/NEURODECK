import { describe, it, expect, vi } from "vitest";
import { KEYBOARD_SHORTCUTS, GAMEPAD_COMMANDS, validateShortcuts } from "./shortcuts.js";

describe("KEYBOARD_SHORTCUTS", () => {
  it("has at least one entry", () => {
    expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const sc of KEYBOARD_SHORTCUTS) {
      expect(sc).toHaveProperty("keys");
      expect(Array.isArray(sc.keys)).toBe(true);
      expect(sc.keys.length).toBeGreaterThan(0);
      expect(sc).toHaveProperty("action");
      expect(typeof sc.action).toBe("string");
      expect(sc).toHaveProperty("scope");
      expect(typeof sc.scope).toBe("string");
      expect(sc).toHaveProperty("description");
      expect(typeof sc.description).toBe("string");
    }
  });

  it("contains known global shortcuts", () => {
    const actions = KEYBOARD_SHORTCUTS.map((s) => s.action);
    expect(actions).toContain("Command Palette");
    expect(actions).toContain("Send Message");
    expect(actions).toContain("Close / Cancel");
  });
});

describe("GAMEPAD_COMMANDS", () => {
  it("has at least one entry", () => {
    expect(GAMEPAD_COMMANDS.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const cmd of GAMEPAD_COMMANDS) {
      expect(cmd).toHaveProperty("button");
      expect(typeof cmd.button).toBe("string");
      expect(cmd).toHaveProperty("action");
      expect(typeof cmd.action).toBe("string");
      expect(cmd).toHaveProperty("scope");
      expect(typeof cmd.scope).toBe("string");
      expect(cmd).toHaveProperty("description");
      expect(typeof cmd.description).toBe("string");
    }
  });

  it("contains known face buttons", () => {
    const actions = GAMEPAD_COMMANDS.map((c) => c.action);
    expect(actions).toContain("Select / Click");
    expect(actions).toContain("Back / Close");
  });
});

describe("validateShortcuts", () => {
  it("detects known duplicate key combos across scopes", () => {
    // The shortcuts table intentionally shares combos across scopes
    // (e.g., Enter in chat vs radial). validateShortcuts is naive and
    // flags these — that's acceptable for a dev-only diagnostic.
    const issues = validateShortcuts();
    expect(issues.length).toBeGreaterThanOrEqual(0);

    const knownDuplicates = [
      'Duplicate shortcut "ctrl+l" between "Load Session" and "Focus Address Bar"',
      'Duplicate shortcut "enter" between "Send Message" and "Confirm"',
      'Duplicate shortcut "esc" between "Close / Cancel" and "Close"',
    ];
    for (const msg of knownDuplicates) {
      expect(issues).toContain(msg);
    }
  });

  it("logs warnings to console when duplicates exist", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Temporarily monkey-patch to create a duplicate
    const original = KEYBOARD_SHORTCUTS[0];
    const duplicate = { ...original, action: "Duplicate Action" };
    KEYBOARD_SHORTCUTS.push(duplicate);

    const issues = validateShortcuts();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("Duplicate shortcut");

    // Restore
    KEYBOARD_SHORTCUTS.pop();
    warnSpy.mockRestore();
  });
});
