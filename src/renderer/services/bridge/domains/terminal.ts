import type { TerminalCommandSafety } from "../../../../../../src/shared/terminal/terminalSafetyTypes";
import type {
  TerminalDiagnosticsReport,
  TerminalEnvironmentReport,
  TerminalSessionSummary,
} from "../../../../../../src/shared/terminal/terminalDiagnosticsTypes";
import type { TerminalProfileAvailability } from "../../../../../../src/shared/terminal/terminalProfiles";
import { bridgeInvoke } from "../http";

export type TerminalSpawnOptions = {
  cols?: number;
  rows?: number;
  args?: string[];
  cwd?: string;
  title?: string;
  profileId?: string;
  tabId?: string;
  paneId?: string;
};

export const terminal = {
  async spawn(
    sessionId: string = "main_pty_session",
    shell?: string,
    options?: TerminalSpawnOptions
  ) {
    return bridgeInvoke<{ success: boolean }>("pty_spawn", {
      id: sessionId,
      shell,
      cols: options?.cols,
      rows: options?.rows,
      args: options?.args,
      cwd: options?.cwd,
      title: options?.title,
      profileId: options?.profileId,
      tabId: options?.tabId,
      paneId: options?.paneId,
    });
  },
  async kill(sessionId: string = "main_pty_session") {
    return bridgeInvoke<{ success: boolean }>("pty_kill", { id: sessionId });
  },
  async write(sessionId: string, data: string) {
    return bridgeInvoke<{ success: boolean }>("pty_write", { id: sessionId, data });
  },
  async resize(sessionId: string, cols: number, rows: number) {
    return bridgeInvoke<{ success: boolean }>("pty_resize", { id: sessionId, cols, rows });
  },
  async listSessions() {
    const result = await bridgeInvoke<{ sessions: string[]; count: number }>("get_pty_sessions");
    return result.sessions ?? [];
  },
  async getSessionDetails(): Promise<TerminalSessionSummary[]> {
    try {
      const result = await bridgeInvoke<{ sessions: TerminalSessionSummary[]; count: number }>(
        "get_terminal_sessions"
      );
      return result.sessions ?? [];
    } catch (_) {
      return [];
    }
  },
  async getEnvironment(): Promise<TerminalEnvironmentReport> {
    try {
      const result = await bridgeInvoke<{ environment: TerminalEnvironmentReport }>(
        "get_terminal_environment"
      );
      return result.environment;
    } catch (_) {
      return {
        platform: navigator.platform,
        arch: "unknown",
        steamDeckHost: false,
        cwd: "",
        shell: "",
        probes: [],
        missingTools: [],
        readyProfiles: [],
        warnings: [],
      };
    }
  },
  async getProfiles(): Promise<TerminalProfileAvailability[]> {
    try {
      const result = await bridgeInvoke<{ profiles: TerminalProfileAvailability[] }>(
        "get_terminal_environment"
      );
      return result.profiles ?? [];
    } catch (_) {
      return [];
    }
  },
  async getDiagnostics(): Promise<TerminalDiagnosticsReport> {
    try {
      return await bridgeInvoke<TerminalDiagnosticsReport>("get_terminal_diagnostics");
    } catch (_) {
      const environment = await terminal.getEnvironment();
      return {
        sessionCount: 0,
        activeSessionCount: 0,
        activeSessions: [],
        environment,
        safetyLevel: "unknown" as TerminalCommandSafety["level"],
        warnings: [],
      };
    }
  },
  async classifyCommand(
    command: string,
    source: "user" | "assistant" | "palette" | "controller" | "history" = "palette"
  ) {
    try {
      return await bridgeInvoke<TerminalCommandSafety>("classify_terminal_command", {
        command,
        source,
      });
    } catch (_) {
      return {
        level: "unknown" as const,
        reason: "Command classification unavailable.",
        source,
      };
    }
  },
};
