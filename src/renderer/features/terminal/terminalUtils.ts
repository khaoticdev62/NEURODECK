import {
  type TerminalProfile,
  type TerminalProfileAvailability,
} from "../../../shared/terminal/terminalProfiles";
import type {
  TerminalCommandHistoryEntry,
  TerminalSession,
  TerminalTab,
} from "../../../shared/terminal/terminalContracts";
import type { TerminalCommandSafety } from "../../../shared/terminal/terminalSafetyTypes";
import type { TerminalEnvironmentReport } from "../../../shared/terminal/terminalDiagnosticsTypes";

export type PaneRuntime = TerminalSession & {
  sessionId: string;
  output: string[];
  stateMessage?: string;
  lastExitReason?: string;
  lastErrorMessage?: string;
  startedAt?: string;
  lastActivityAt?: string;
  recoveryCount: number;
  commandCount: number;
  active: boolean;
};

export type WorkspaceSnapshot = {
  tabs: TerminalTab[];
  panes: PaneRuntime[];
  activeTabId: string;
  activePaneId: string;
  history: TerminalCommandHistoryEntry[];
  selectedProfileId: string;
};

export type CommandSource = "user" | "assistant" | "palette" | "controller" | "history";

export const WORKSPACE_KEY = "neurodeck:terminal-workspace-v1";
export const HISTORY_KEY = "neurodeck:terminal-history-v1";
export const DEFAULT_PROFILE_ID = "steamos-bash";
export const MAX_OUTPUT_LINES = 250;

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export function platformToProfile(platform: string) {
  if (platform.startsWith("Win")) return "power-shell";
  if (platform.includes("Mac") || platform === "darwin") return "macos-zsh";
  if (platform === "linux") return "linux-bash";
  return DEFAULT_PROFILE_ID;
}

export function defaultTerminalTab(projectPath: string, profileId: string): TerminalTab {
  const tabId = createId("tab");
  const paneId = createId("pane");
  return {
    id: tabId,
    label: "Terminal 1",
    pinned: false,
    activePaneId: paneId,
    layout: "single",
    cwd: projectPath,
    profileId,
    sessionIds: [paneId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function defaultPane(tabId: string, cwd: string, profile: TerminalProfile): PaneRuntime {
  const paneId = createId("pane");
  return {
    id: paneId,
    sessionId: createId("pty"),
    tabId,
    paneId,
    title: profile.name,
    cwd,
    shell: profile.shellPath,
    shellArgs: profile.shellArgs,
    profileId: profile.id,
    state: "created",
    cols: 80,
    rows: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    commandCount: 0,
    diagnostics: {
      bytesIn: 0,
      bytesOut: 0,
      crashCount: 0,
      recoveryCount: 0,
    },
    output: [],
    recoveryCount: 0,
    active: false,
  };
}

export function fallbackShellForProfile(
  profileId: string,
  environment: TerminalEnvironmentReport | null,
  availableProfiles: TerminalProfileAvailability[]
) {
  const profile = availableProfiles.find((entry) => entry.id === profileId);
  if (profile?.shellAvailable) return profile.detectedPath ?? profile.shellPath;
  const platform = environment?.platform ?? "";
  if (platform === "win32" || platform === "windows") {
    return (
      availableProfiles.find(
        (entry) => entry.shellAvailable && entry.shellPath.toLowerCase().includes("powershell")
      )?.detectedPath ?? "powershell.exe"
    );
  }
  return (
    availableProfiles.find((entry) => entry.shellAvailable && entry.shellPath === "/bin/sh")
      ?.detectedPath ??
    availableProfiles.find((entry) => entry.shellAvailable)?.detectedPath ??
    "/bin/sh"
  );
}

export function redactedCommand(command: string) {
  return command
    .replace(/(password|token|secret|key)\s*=\s*([^\s]+)/gi, "$1=[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._\-+/=]+/g, "$1[REDACTED]")
    .replace(/(api[-_ ]?key)\s*[:=]\s*([^\s]+)/gi, "$1=[REDACTED]");
}

export function restoreWorkspace(): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceSnapshot;
    if (!Array.isArray(parsed.tabs) || !Array.isArray(parsed.panes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadHistory(): TerminalCommandHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TerminalCommandHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stripPromptArtifacts(text: string) {
  return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "").replace(/\r/g, "");
}

export function buildHistoryEntry(
  pane: PaneRuntime | undefined,
  paneId: string,
  command: string,
  safety: TerminalCommandSafety,
  durationMs?: number
): TerminalCommandHistoryEntry {
  return {
    id: createId("cmd"),
    sessionId: pane?.sessionId ?? paneId,
    command,
    redactedCommand: redactedCommand(command),
    cwd: pane?.cwd ?? "",
    shell: pane?.shell ?? "",
    exitCode: undefined,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    safetyLevel: safety.level,
  };
}

type ActiveProjectHint = {
  path: string;
  scripts?: Record<string, string>;
  packageManager?: string;
  frameworks?: string[];
  name?: string;
};

export function collectSuggestions(
  activeProject: ActiveProjectHint | null,
  environment: TerminalEnvironmentReport | null,
  profile: TerminalProfileAvailability | undefined
) {
  const tools = new Set(
    (environment?.probes ?? [])
      .filter((probe) => probe.exists)
      .flatMap((probe) => [probe.name.toLowerCase(), probe.path.toLowerCase()])
  );
  const suggestions: string[] = [];

  if (activeProject?.scripts?.dev) {
    suggestions.push(`${activeProject.packageManager || "npm"} run dev`);
  }
  if (activeProject?.scripts?.test) {
    suggestions.push(`${activeProject.packageManager || "npm"} run test`);
  }
  if (activeProject?.scripts?.build) {
    suggestions.push(`${activeProject.packageManager || "npm"} run build`);
  }
  if (tools.has("cargo")) {
    suggestions.push("cargo check");
    suggestions.push("cargo test");
  }
  if (tools.has("python") || tools.has("python3")) {
    suggestions.push("python -m pytest");
    suggestions.push("python --version");
  }
  if (tools.has("go")) {
    suggestions.push("go test ./...");
  }
  if (tools.has("fallow")) {
    suggestions.push("npx fallow audit --format json");
  }
  if (profile?.shellPath.includes("powershell")) {
    suggestions.push("Get-ChildItem");
    suggestions.push("git status");
  }

  return Array.from(new Set(suggestions)).slice(0, 8);
}
