export type TerminalSafetyLevel = "safe" | "confirm" | "dangerous" | "blocked" | "unknown";

export type TerminalSafetySource =
  | "user"
  | "assistant"
  | "palette"
  | "history"
  | "controller";

export type TerminalCommandSafety = {
  level: TerminalSafetyLevel;
  reason: string;
  matchedPattern?: string;
  source: TerminalSafetySource;
};

