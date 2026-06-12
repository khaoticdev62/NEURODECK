import type { TerminalSafetyLevel } from "./terminalSafetyTypes";

export type TerminalEvidence = {
  requestId: string;
  timestamp: string;
  sessionId?: string;
  paneId?: string;
  event:
    | "pty_spawn"
    | "pty_write"
    | "pty_output"
    | "pty_resize"
    | "pty_exit"
    | "command_detected"
    | "command_blocked"
    | "command_confirmed"
    | "command_completed"
    | "session_recovered"
    | "profile_detected"
    | "environment_detected"
    | "mock_data_scan";
  status: "passed" | "failed" | "blocked" | "skipped";
  realPtyUsed: boolean;
  mockDataDetected: boolean;
  durationMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  redactedSummary: string;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    userAction?: string;
  };
};

export type TerminalEnvironmentProbe = {
  name: string;
  path: string;
  exists: boolean;
  status: "detected" | "missing";
};

export type TerminalEnvironmentReport = {
  platform: string;
  arch: string;
  steamDeckHost: boolean;
  cwd: string;
  shell: string;
  probes: TerminalEnvironmentProbe[];
  missingTools: string[];
  readyProfiles: string[];
  warnings: string[];
};

export type TerminalSessionSummary = {
  id: string;
  title: string;
  shell: string;
  cwd: string;
  profileId?: string | null;
  tabId?: string | null;
  paneId?: string | null;
  cols: number;
  rows: number;
  spawnedAt: string;
  uptimeSecs: number;
  bytesIn: number;
  bytesOut: number;
  state: "running" | "exited" | "blocked" | "recovering" | "error";
};

export type TerminalDiagnosticsReport = {
  sessionCount: number;
  activeSessionCount: number;
  activeSessions: TerminalSessionSummary[];
  environment: TerminalEnvironmentReport;
  lastEvidence?: TerminalEvidence | null;
  safetyLevel: TerminalSafetyLevel;
  warnings: string[];
};

