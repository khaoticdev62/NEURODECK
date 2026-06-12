import type { TerminalProfile } from "./terminalProfiles";
import type { TerminalCommandSafety } from "./terminalSafetyTypes";

export function isTerminalProfile(value: unknown): value is TerminalProfile {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as TerminalProfile).id === "string"
    && typeof (value as TerminalProfile).shellPath === "string";
}

export function isTerminalCommandSafety(value: unknown): value is TerminalCommandSafety {
  return Boolean(value)
    && typeof value === "object"
    && typeof (value as TerminalCommandSafety).level === "string"
    && typeof (value as TerminalCommandSafety).reason === "string";
}

