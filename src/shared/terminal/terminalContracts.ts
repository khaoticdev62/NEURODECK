import type { TerminalCommandSafety } from "./terminalSafetyTypes";

export type TerminalSessionId = string;
export type TerminalPaneId = string;
export type TerminalTabId = string;

export type TerminalSessionState =
  | "created"
  | "starting"
  | "running"
  | "idle"
  | "busy"
  | "exited"
  | "crashed"
  | "recovering"
  | "blocked"
  | "error";

export type TerminalSession = {
  id: TerminalSessionId;
  tabId: TerminalTabId;
  paneId: TerminalPaneId;
  title: string;
  cwd: string;
  shell: string;
  shellArgs: string[];
  profileId: string;
  state: TerminalSessionState;
  pid?: number;
  exitCode?: number;
  signal?: string;
  cols: number;
  rows: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  exitedAt?: string;
  commandCount: number;
  lastCommand?: string;
  lastCommandStartedAt?: string;
  lastCommandCompletedAt?: string;
  diagnostics: {
    bytesIn: number;
    bytesOut: number;
    lastErrorCode?: string;
    lastErrorMessage?: string;
    crashCount: number;
    recoveryCount: number;
  };
};

export type TerminalPaneLayout = "single" | "split-vertical" | "split-horizontal" | "grid";

export type TerminalPane = {
  id: TerminalPaneId;
  sessionId: TerminalSessionId;
  title: string;
  cwd: string;
  shell: string;
  shellArgs: string[];
  profileId: string;
  state: TerminalSessionState;
  orientation: "single" | "vertical" | "horizontal";
  commandSafety: TerminalCommandSafety;
  isActive: boolean;
};

export type TerminalTab = {
  id: TerminalTabId;
  label: string;
  pinned: boolean;
  activePaneId: TerminalPaneId;
  layout: TerminalPaneLayout;
  cwd: string;
  profileId: string;
  sessionIds: TerminalSessionId[];
  createdAt: string;
  updatedAt: string;
};

export type TerminalCommandHistoryEntry = {
  id: string;
  sessionId: string;
  command: string;
  redactedCommand: string;
  cwd: string;
  shell: string;
  exitCode?: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  safetyLevel: TerminalCommandSafety["level"];
};

export type TerminalCommandExecutionSource = "user" | "assistant" | "palette" | "controller" | "history";

