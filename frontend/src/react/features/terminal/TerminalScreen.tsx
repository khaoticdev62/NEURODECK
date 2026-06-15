import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Plus, RefreshCw, Search, ShieldCheck, SplitSquareHorizontal, SplitSquareVertical, Terminal as TerminalIcon, Trash2, X } from "lucide-react";
import { useNeuroDeckState } from "../../state/useNeuroDeckState";
import { listenBridge, neurodeckApi } from "../../services/bridgeAdapter";
import { classifyTerminalCommand, requiresConfirmation } from "../../../../../src/shared/terminal/terminalCommandPolicy";
import { TERMINAL_PROFILES, type TerminalProfile, type TerminalProfileAvailability } from "../../../../../src/shared/terminal/terminalProfiles";
import type { TerminalCommandHistoryEntry, TerminalSession, TerminalTab } from "../../../../../src/shared/terminal/terminalContracts";
import type { TerminalCommandSafety } from "../../../../../src/shared/terminal/terminalSafetyTypes";
import type { TerminalDiagnosticsReport, TerminalEnvironmentReport } from "../../../../../src/shared/terminal/terminalDiagnosticsTypes";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TerminalCommandPalette } from "./TerminalCommandPalette";
import { TerminalControllerHintBar } from "./TerminalControllerHintBar";
import { TerminalDiagnosticsPanel } from "./TerminalDiagnosticsPanel";
import { TerminalProfileSelector } from "./TerminalProfileSelector";
import { TerminalSafetyConfirmModal } from "./TerminalSafetyConfirmModal";
import { TerminalViewport } from "./TerminalViewport";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";

type PaneRuntime = TerminalSession & {
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

type WorkspaceSnapshot = {
  tabs: TerminalTab[];
  panes: PaneRuntime[];
  activeTabId: string;
  activePaneId: string;
  history: TerminalCommandHistoryEntry[];
  selectedProfileId: string;
};

type CommandSource = "user" | "assistant" | "palette" | "controller" | "history";

const WORKSPACE_KEY = "neurodeck:terminal-workspace-v1";
const HISTORY_KEY = "neurodeck:terminal-history-v1";
const DEFAULT_PROFILE_ID = "steamos-bash";
const MAX_OUTPUT_LINES = 250;

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function platformToProfile(platform: string) {
  if (platform.startsWith("Win")) return "power-shell";
  if (platform.includes("Mac") || platform === "darwin") return "macos-zsh";
  if (platform === "linux") return "linux-bash";
  return DEFAULT_PROFILE_ID;
}

function defaultTerminalTab(projectPath: string, profileId: string): TerminalTab {
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

function defaultPane(tabId: string, cwd: string, profile: TerminalProfile): PaneRuntime {
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

function fallbackShellForProfile(profileId: string, environment: TerminalEnvironmentReport | null, availableProfiles: TerminalProfileAvailability[]) {
  const profile = availableProfiles.find((entry) => entry.id === profileId);
  if (profile?.shellAvailable) return profile.detectedPath ?? profile.shellPath;
  const platform = environment?.platform ?? "";
  if (platform === "win32" || platform === "windows") {
    return availableProfiles.find((entry) => entry.shellAvailable && entry.shellPath.toLowerCase().includes("powershell"))?.detectedPath
      ?? "powershell.exe";
  }
  return availableProfiles.find((entry) => entry.shellAvailable && entry.shellPath === "/bin/sh")?.detectedPath
    ?? availableProfiles.find((entry) => entry.shellAvailable)?.detectedPath
    ?? "/bin/sh";
}

function redactedCommand(command: string) {
  return command
    .replace(/(password|token|secret|key)\s*=\s*([^\s]+)/gi, "$1=[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._\-+/=]+/g, "$1[REDACTED]")
    .replace(/(api[-_ ]?key)\s*[:=]\s*([^\s]+)/gi, "$1=[REDACTED]");
}

function restoreWorkspace(): WorkspaceSnapshot | null {
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

function loadHistory(): TerminalCommandHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TerminalCommandHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stripPromptArtifacts(text: string) {
  return text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "").replace(/\r/g, "");
}

function collectSuggestions(
  activeProject: { path: string; scripts?: Record<string, string>; packageManager?: string; frameworks?: string[]; name?: string } | null,
  environment: TerminalEnvironmentReport | null,
  profile: TerminalProfileAvailability | undefined
) {
  const tools = new Set((environment?.probes ?? []).filter((probe) => probe.exists).flatMap((probe) => [probe.name.toLowerCase(), probe.path.toLowerCase()]));
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

export function TerminalScreen() {
  const { state } = useNeuroDeckState();
  const activeProjectPath = state.activeProject?.path ?? "";
  const activeProject = state.activeProject;
  const initialProfileId = platformToProfile(navigator.platform);

  const [environment, setEnvironment] = useState<TerminalEnvironmentReport | null>(null);
  const [profiles, setProfiles] = useState<TerminalProfileAvailability[]>([]);
  const [diagnostics, setDiagnostics] = useState<TerminalDiagnosticsReport | null>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [panes, setPanes] = useState<Record<string, PaneRuntime>>({});
  const [activeTabId, setActiveTabId] = useState("");
  const [activePaneId, setActivePaneId] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pluginPanelOpen, setPluginPanelOpen] = useState(false);
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<{
    paneId: string;
    command: string;
    source: CommandSource;
    safety: TerminalCommandSafety;
  } | null>(null);
  const [history, setHistory] = useState<TerminalCommandHistoryEntry[]>(loadHistory());
  const [searchQuery, setSearchQuery] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantSuggestions, setAssistantSuggestions] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("Terminal ready.");
  const hydratedRef = useRef(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const activePane = activePaneId ? panes[activePaneId] : activeTab ? panes[activeTab.activePaneId] : undefined;
  const activeProfile = profiles.find((profile) => profile.id === (activePane?.profileId ?? activeTab?.profileId)) ?? profiles[0] ?? null;

  const saveWorkspace = useCallback((nextTabs: TerminalTab[], nextPanes: Record<string, PaneRuntime>, nextActiveTabId: string, nextActivePaneId: string, nextHistory: TerminalCommandHistoryEntry[]) => {
    const snapshot: WorkspaceSnapshot = {
      tabs: nextTabs,
      panes: Object.values(nextPanes),
      activeTabId: nextActiveTabId,
      activePaneId: nextActivePaneId,
      history: nextHistory,
      selectedProfileId: (nextPanes[nextActivePaneId]?.profileId) || nextTabs.find((tab) => tab.id === nextActiveTabId)?.profileId || initialProfileId,
    };
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore persistence failures
    }
  }, [initialProfileId]);

  const patchPane = useCallback((paneId: string, patch: Partial<PaneRuntime>) => {
    setPanes((current) => {
      const existing = current[paneId];
      if (!existing) return current;
      return { ...current, [paneId]: { ...existing, ...patch, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const setPaneOutput = useCallback((paneId: string, chunk: string) => {
    setPanes((current) => {
      const existing = current[paneId];
      if (!existing) return current;
      const nextOutput = [...existing.output, ...stripPromptArtifacts(chunk).split(/\n/)].slice(-MAX_OUTPUT_LINES);
      const next = {
        ...current,
        [paneId]: {
          ...existing,
          output: nextOutput,
          diagnostics: {
            ...existing.diagnostics,
            bytesOut: existing.diagnostics.bytesOut + chunk.length,
          },
          lastActivityAt: new Date().toISOString(),
        },
      };
      return next;
    });
  }, []);

  const recordHistory = useCallback((paneId: string, command: string, safety: TerminalCommandSafety, durationMs?: number) => {
    setHistory((current) => {
      const pane = panes[paneId];
      const next: TerminalCommandHistoryEntry = {
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
      return [next, ...current].slice(0, 100);
    });
  }, [panes]);

  const updateTabs = useCallback((updater: (current: TerminalTab[]) => TerminalTab[]) => {
    setTabs((current) => {
      return updater(current);
    });
  }, []);

  const updatePaneMap = useCallback((updater: (current: Record<string, PaneRuntime>) => Record<string, PaneRuntime>) => {
    setPanes((current) => {
      return updater(current);
    });
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    const [nextEnv, nextProfiles, nextDiagnostics] = await Promise.all([
      neurodeckApi.terminal.getEnvironment(),
      neurodeckApi.terminal.getProfiles(),
      neurodeckApi.terminal.getDiagnostics(),
    ]);
    setEnvironment(nextEnv);
    setProfiles(nextProfiles);
    setDiagnostics(nextDiagnostics);
    setStatusMessage(nextDiagnostics.activeSessionCount > 0 ? "Terminal sessions active." : "No active sessions.");
  }, []);

  const createTab = useCallback((profileId = activeProfile?.id ?? initialProfileId, cwd = activeProjectPath || environment?.cwd || "") => {
    const profile = TERMINAL_PROFILES.find((item) => item.id === profileId) ?? TERMINAL_PROFILES[0];
    const tab = defaultTerminalTab(cwd, profile.id);
    const pane = defaultPane(tab.id, cwd, profile);
    tab.activePaneId = pane.id;
    tab.profileId = profile.id;
    tab.sessionIds = [pane.id];
    updatePaneMap((current) => ({ ...current, [pane.id]: pane }));
    updateTabs((current) => [...current.map((item) => ({ ...item, pinned: item.pinned })), tab]);
    setActiveTabId(tab.id);
    setActivePaneId(pane.id);
    setStatusMessage(`Opened ${profile.name}.`);
  }, [activePaneId, activeProfile?.id, activeProjectPath, environment?.cwd, initialProfileId, updatePaneMap, updateTabs]);

  const switchTab = useCallback((tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    setActivePaneId(tab.activePaneId);
  }, [tabs]);

  const splitActivePane = useCallback((orientation: "vertical" | "horizontal") => {
    const tab = tabs.find((item) => item.id === activeTabId);
    if (!tab) return;
    const basePane = panes[tab.activePaneId];
    if (!basePane) return;
    const profile = TERMINAL_PROFILES.find((item) => item.id === basePane.profileId) ?? TERMINAL_PROFILES[0];
    const nextPane = defaultPane(tab.id, basePane.cwd, profile);
    nextPane.title = `${basePane.title} Split`;
    nextPane.shell = basePane.shell;
    nextPane.shellArgs = [...basePane.shellArgs];
    nextPane.profileId = basePane.profileId;
    nextPane.state = "created";
    nextPane.active = true;
    nextPane.output = [];
    nextPane.sessionId = createId("pty");

    updatePaneMap((current) => ({ ...current, [nextPane.id]: nextPane, [basePane.id]: { ...basePane, active: false } }));
    updateTabs((current) => current.map((item) => {
      if (item.id !== tab.id) return item;
      const sessionIds = Array.from(new Set([...item.sessionIds, nextPane.id]));
      return {
        ...item,
        layout: orientation === "vertical" ? "split-vertical" : "split-horizontal",
        activePaneId: nextPane.id,
        sessionIds,
        updatedAt: new Date().toISOString(),
      };
    }));
    setActivePaneId(nextPane.id);
    setStatusMessage(`Split ${orientation} pane created.`);
  }, [activeTabId, panes, updatePaneMap, updateTabs, tabs]);

  const closePane = useCallback(async (paneId: string) => {
    const pane = panes[paneId];
    if (!pane) return;
    await neurodeckApi.terminal.kill(pane.sessionId).catch(() => {});
    updatePaneMap((current) => {
      const next = { ...current };
      delete next[paneId];
      return next;
    });
    updateTabs((current) => current.map((tab) => {
      if (!tab.sessionIds.includes(paneId)) return tab;
      const nextSessions = tab.sessionIds.filter((id) => id !== paneId);
      const nextActivePaneId = tab.activePaneId === paneId ? (nextSessions[0] ?? "") : tab.activePaneId;
      return {
        ...tab,
        sessionIds: nextSessions,
        activePaneId: nextActivePaneId,
        layout: nextSessions.length <= 1 ? "single" : tab.layout,
        updatedAt: new Date().toISOString(),
      };
    }));
    if (activePaneId === paneId) {
      const nextPaneId = tabs.flatMap((tab) => tab.sessionIds).find((id) => id !== paneId) ?? "";
      setActivePaneId(nextPaneId);
    }
    setStatusMessage("Pane closed.");
  }, [activePaneId, panes, tabs, updatePaneMap, updateTabs]);

  const restartPane = useCallback(async (paneId: string) => {
    const pane = panes[paneId];
    if (!pane) return;
    const profile = profiles.find((item) => item.id === pane.profileId) ?? null;
    const availableShell = fallbackShellForProfile(pane.profileId, environment, profiles);
    const shell = availableShell || pane.shell;
    const sessionId = createId("pty");
    updatePaneMap((current) => ({
      ...current,
      [paneId]: {
        ...pane,
        sessionId,
        shell,
        state: "created",
        output: [],
        diagnostics: { ...pane.diagnostics, recoveryCount: pane.diagnostics.recoveryCount + 1 },
        recoveryCount: pane.recoveryCount + 1,
        lastErrorMessage: undefined,
        lastExitReason: undefined,
        updatedAt: new Date().toISOString(),
      },
    })); 
    setStatusMessage(`Restarting ${profile?.name ?? pane.title}...`);
  }, [environment, panes, profiles, updatePaneMap]);

  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;
    if (tabs.length <= 1) {
      if (tab.activePaneId) await restartPane(tab.activePaneId);
      return;
    }
    for (const paneId of tab.sessionIds) {
      const pane = panes[paneId];
      if (pane) {
        await neurodeckApi.terminal.kill(pane.sessionId).catch(() => {});
      }
    }
    updateTabs((current) => current.filter((item) => item.id !== tabId));
    updatePaneMap((current) => {
      const next = { ...current };
      for (const paneId of tab.sessionIds) delete next[paneId];
      return next;
    });
    const nextTab = tabs.find((item) => item.id !== tabId) ?? null;
    if (nextTab) {
      setActiveTabId(nextTab.id);
      setActivePaneId(nextTab.activePaneId);
    }
  }, [panes, restartPane, tabs, updatePaneMap, updateTabs]);

  const pinTab = useCallback((tabId: string) => {
    updateTabs((current) => current.map((tab) => tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab));
  }, [updateTabs]);

  const clearPane = useCallback((paneId: string) => {
    const pane = panes[paneId];
    if (!pane) return;
    const term = (window as Window & { __terminalInstances?: Record<string, { clear?: () => void }> }).__terminalInstances?.[paneId];
    term?.clear?.();
    patchPane(paneId, { output: [] });
    setStatusMessage("Pane cleared.");
  }, [panes, patchPane]);

  const resetPane = useCallback(async (paneId: string) => {
    await restartPane(paneId);
  }, [restartPane]);

  const requestCommandExecution = useCallback(async (paneId: string, command: string, source: CommandSource) => {
    const pane = panes[paneId];
    if (!pane) return;
    const safety = classifyTerminalCommand(command, source);
    const trimmed = command.trim();
    if (!trimmed) return;

    if (safety.level === "blocked") {
      setStatusMessage(safety.reason);
      patchPane(paneId, { lastErrorMessage: safety.reason, state: "blocked" });
      return;
    }

    if (requiresConfirmation(safety.level)) {
      setPendingCommand({ paneId, command: trimmed, source, safety });
      setStatusMessage(`${safety.level === "dangerous" ? "Dangerous" : "Confirm"} command pending.`);
      return;
    }

    await neurodeckApi.terminal.write(pane.sessionId, `${trimmed}\r`).catch((error) => {
      patchPane(paneId, { lastErrorMessage: String(error), state: "error" });
    });
    recordHistory(paneId, trimmed, safety);
    patchPane(paneId, {
      commandCount: pane.commandCount + 1,
      lastCommand: trimmed,
      lastActivityAt: new Date().toISOString(),
      state: "busy",
      stateMessage: "Command sent to PTY.",
    });
  }, [panes, patchPane, recordHistory]);

  const availableActions = useMemo(() => {
    const current = activePane ?? null;
    return [
      { id: "new-tab", label: "New Tab", action: () => createTab() },
      { id: "split-vertical", label: "Split Vertical", action: () => splitActivePane("vertical") },
      { id: "split-horizontal", label: "Split Horizontal", action: () => splitActivePane("horizontal") },
      { id: "restart", label: "Restart Pane", action: () => restartPane(current?.id ?? activePaneId) },
      { id: "clear", label: "Clear Pane", action: () => clearPane(current?.id ?? activePaneId) },
      { id: "search", label: "Search Output", action: () => setSearchOpen(true) },
      { id: "assistant", label: "Open AI Assistant", action: () => setAssistantOpen((value) => !value) },
      { id: "diagnostics", label: "Refresh Diagnostics", action: () => void refreshDiagnostics() },
      { id: "session-manager", label: "Session Manager", action: () => setSessionManagerOpen((value) => !value) },
      { id: "plugin-panel", label: "Plugin Hooks", action: () => setPluginPanelOpen((value) => !value) },
      { id: "create-pane", label: "Split Active Pane", action: () => splitActivePane("vertical") },
    ];
  }, [activePane, activePaneId, clearPane, createTab, refreshDiagnostics, restartPane, splitActivePane]);

  useEffect(() => {
    saveWorkspace(tabs, panes, activeTabId, activePaneId, history);
  }, [activePaneId, activeTabId, history, panes, saveWorkspace, tabs]);

  const confirmPendingCommand = useCallback(async () => {
    if (!pendingCommand) return;
    const pane = panes[pendingCommand.paneId];
    if (!pane) return;
    await neurodeckApi.terminal.write(pane.sessionId, `${pendingCommand.command}\r`).catch((error) => {
      patchPane(pendingCommand.paneId, { lastErrorMessage: String(error), state: "error" });
    });
    recordHistory(pendingCommand.paneId, pendingCommand.command, pendingCommand.safety);
    patchPane(pendingCommand.paneId, {
      commandCount: pane.commandCount + 1,
      lastCommand: pendingCommand.command,
      lastActivityAt: new Date().toISOString(),
      state: "busy",
      stateMessage: "Command approved and sent.",
    });
    setPendingCommand(null);
  }, [panes, patchPane, pendingCommand, recordHistory]);

  const cancelPendingCommand = useCallback(() => {
    setPendingCommand(null);
    setStatusMessage("Command cancelled.");
  }, []);

  const explainLastCommand = useCallback(async () => {
    const pane = activePane;
    if (!pane?.lastCommand) return;
    const prompt = [
      "Explain the last terminal command for a developer.",
      `Command: ${pane.lastCommand}`,
      `Shell: ${pane.shell}`,
      `CWD: ${pane.cwd}`,
      `Profile: ${pane.profileId}`,
      "Give a concise explanation and a safer follow-up if relevant.",
    ].join("\n");
    const response = await neurodeckApi.ai.chat({
      provider: state.selectedProvider,
      model: state.selectedModelId || "NeuroDraft",
      persona: state.selectedPersona,
      prompt,
      messages: [],
      projectContext: state.projectContext,
      activeProjectName: activeProject?.name,
    });
    if (response.ok) {
      setAssistantPrompt(response.message.content);
      setAssistantOpen(true);
    }
  }, [activePane, activeProject?.name, state.projectContext, state.selectedModelId, state.selectedPersona, state.selectedProvider]);

  const buildAssistantSuggestions = useCallback(async () => {
    const pane = activePane;
    const profile = panes[activePaneId] ? profiles.find((item) => item.id === panes[activePaneId].profileId) : null;
    const localSuggestions = collectSuggestions(activeProject ?? null, environment, profile ?? undefined);
    if (!pane) {
      setAssistantSuggestions(localSuggestions);
      return;
    }

    try {
      const prompt = [
        "You are the NEURODECK terminal assistant.",
        "Return 5 shell commands only, one per line, no explanation.",
        `Project: ${activeProject?.name ?? "none"}`,
        `Workspace: ${activeProject?.path ?? pane.cwd}`,
        `Shell: ${pane.shell}`,
        `Profile: ${pane.profileId}`,
        `Missing tools: ${(environment?.missingTools ?? []).join(", ") || "none"}`,
        `Recent history: ${history.slice(0, 4).map((entry) => entry.redactedCommand).join(" | ") || "none"}`,
        `Recent error: ${pane.lastErrorMessage ?? "none"}`,
      ].join("\n");
      const response = await neurodeckApi.ai.chat({
        provider: state.selectedProvider,
        model: state.selectedModelId || "NeuroDraft",
        persona: state.selectedPersona,
        prompt,
        messages: [],
        projectContext: state.projectContext,
        activeProjectName: activeProject?.name,
      });
      const content = response.ok ? response.message.content : "";
      const suggestions = content
        .split("\n")
        .map((line) => line.replace(/^[\s>*\-`]+/, "").trim())
        .filter(Boolean)
        .filter((line) => classifyTerminalCommand(line, "assistant").level !== "blocked")
        .slice(0, 5);
      setAssistantSuggestions(suggestions.length ? suggestions : localSuggestions);
      setAssistantPrompt(content || "AI assistant unavailable. Showing local suggestions.");
    } catch {
      setAssistantSuggestions(localSuggestions);
      setAssistantPrompt("AI assistant unavailable. Showing local suggestions.");
    }
  }, [activePane, activePaneId, activeProject, environment, history, panes, profiles, state.projectContext, state.selectedModelId, state.selectedPersona, state.selectedProvider]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const snapshot = restoreWorkspace();
    if (snapshot && snapshot.tabs.length > 0) {
      const restoredPanes = Object.fromEntries(snapshot.panes.map((pane) => [pane.id, pane]));
      setTabs(snapshot.tabs);
      setPanes(restoredPanes);
      setActiveTabId(snapshot.activeTabId || snapshot.tabs[0]?.id || "");
      setActivePaneId(snapshot.activePaneId || snapshot.tabs[0]?.activePaneId || "");
      setHistory(snapshot.history || loadHistory());
      return;
    }

    const cwd = activeProjectPath || environment?.cwd || "";
    const baseProfile = TERMINAL_PROFILES.find((item) => item.id === initialProfileId) ?? TERMINAL_PROFILES[0];
    const tab = defaultTerminalTab(cwd, baseProfile.id);
    const pane = defaultPane(tab.id, cwd, baseProfile);
    tab.activePaneId = pane.id;
    setTabs([tab]);
    setPanes({ [pane.id]: pane });
    setActiveTabId(tab.id);
    setActivePaneId(pane.id);
  }, [activeProjectPath, environment?.cwd, initialProfileId]);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  useEffect(() => {
    const unsubOutput = listenBridge("pty_output", (payload) => {
      const data = payload as { id?: string; data?: string };
      if (!data?.id || typeof data.data !== "string") return;
      const pane = Object.values(panes).find((item) => item.sessionId === data.id);
      if (!pane) return;
      setPaneOutput(pane.id, data.data);
      patchPane(pane.id, {
        state: "running",
        lastActivityAt: new Date().toISOString(),
        diagnostics: {
          ...pane.diagnostics,
          bytesOut: pane.diagnostics.bytesOut + data.data.length,
        },
      });
    });

    const unsubExit = listenBridge("pty_exit", (payload) => {
      const data = payload as { id?: string; reason?: string };
      if (!data?.id) return;
      const pane = Object.values(panes).find((item) => item.sessionId === data.id);
      if (!pane) return;
      patchPane(pane.id, {
        state: "exited",
        lastExitReason: data.reason || "exited",
        stateMessage: `Session exited: ${data.reason || "exited"}`,
      });
      setStatusMessage(`Session ${pane.title} exited.`);
    });

    const unsubDeckcode = listenBridge("deckcode-action", (payload) => {
      const actionId = String(payload ?? "").toLowerCase();
      if (!actionId) return;
      if (actionId.includes("x")) setCommandPaletteOpen(true);
      if (actionId.includes("l4")) setAssistantOpen((value) => !value);
      if (actionId.includes("view")) setSessionManagerOpen((value) => !value);
      if (actionId.includes("menu")) setPluginPanelOpen((value) => !value);
      if (actionId.includes("l1")) cycleTab(-1);
      if (actionId.includes("r1")) cycleTab(1);
      if (actionId.includes("l5")) splitActivePane("vertical");
      if (actionId.includes("r4")) {
        if (assistantSuggestions[0]) {
          void requestCommandExecution(activePaneId, assistantSuggestions[0], "controller");
        }
      }
      if (actionId.includes("b") || actionId.includes("cancel")) {
        setCommandPaletteOpen(false);
        setSearchOpen(false);
        setSessionManagerOpen(false);
        setPluginPanelOpen(false);
        setPendingCommand(null);
      }
      if (actionId.includes("y")) {
        const term = (window as Window & { __terminalInstances?: Record<string, { focus?: () => void }> }).__terminalInstances?.[activePaneId];
        term?.focus?.();
      }
    });

    return () => {
      unsubOutput();
      unsubExit();
      unsubDeckcode();
    };
  }, [activePaneId, assistantSuggestions, panes, patchPane, requestCommandExecution]);

  useEffect(() => {
    const onResize = () => {
      const instances = (window as Window & { __terminalInstances?: Record<string, { fit?: () => void }> }).__terminalInstances;
      if (!instances) return;
      Object.values(instances).forEach((term) => term.fit?.());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (activePane?.lastCommand) {
      void buildAssistantSuggestions();
    }
  }, [activePane?.lastCommand, buildAssistantSuggestions]);

  const cycleTab = useCallback((delta: number) => {
    if (!tabs.length) return;
    const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTabId));
    const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
    if (next) {
      setActiveTabId(next.id);
      setActivePaneId(next.activePaneId);
    }
  }, [activeTabId, tabs]);

  const selectedProfileAvailability = activeProfile ?? profiles[0] ?? null;
  const shellLabel = selectedProfileAvailability?.shellAvailable ? selectedProfileAvailability.shellPath : "missing_shell_binary";
  const statusLevel = activePane?.state === "blocked" ? "blocked" : activePane?.state === "error" ? "error" : activePane?.state === "exited" ? "exited" : "running";
  const visiblePanes = activeTab ? activeTab.sessionIds.map((id) => panes[id]).filter(Boolean) : [];
  const allOutput = visiblePanes.flatMap((pane) => pane.output.map((line) => ({ paneId: pane.id, line })));
  const searchResults = searchQuery
    ? allOutput.filter((entry) => entry.line.toLowerCase().includes(searchQuery.toLowerCase()) || entry.paneId.includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="terminal-screen flex h-full min-h-0 flex-col overflow-hidden bg-nd-bg text-nd-text-primary">
      <header className="flex items-start justify-between gap-4 border-b border-nd-text-muted/15 px-4 py-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/10 text-nd-accent-primary">
            <TerminalIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Terminal Workspace</div>
            <h2 className="truncate text-lg font-semibold text-nd-text-primary">NeuroShell</h2>
            <div className="truncate text-xs text-nd-text-muted">{statusMessage}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            tone={statusLevel === "running" ? "success" : statusLevel === "blocked" ? "error" : "warning"}
            size="sm"
          >
            {statusLevel}
          </StatusChip>
          <Badge tone="neutral" size="sm" variant="outline">
            {activeTab?.label ?? "No tab"}
          </Badge>
          <Badge tone="neutral" size="sm" variant="outline">
            {shellLabel}
          </Badge>
          <Badge tone="neutral" size="sm" variant="outline" className="max-w-[12rem] truncate">
            {activePane?.cwd || activeProjectPath || environment?.cwd || "cwd unavailable"}
          </Badge>
          <Button
            id="terminal-new-tab-btn"
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => createTab()}
          >
            New Tab
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={SplitSquareVertical}
            onClick={() => splitActivePane("vertical")}
          >
            Split
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={LayoutGrid}
            onClick={() => setCommandPaletteOpen(true)}
          >
            Palette
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => void refreshDiagnostics()}
          >
            Refresh
          </Button>
        </div>
      </header>

      <TerminalControllerHintBar
        activeMode={commandPaletteOpen ? "palette" : assistantOpen ? "assistant" : searchOpen ? "search" : pendingCommand ? "confirm" : "input"}
        onOpenPalette={() => setCommandPaletteOpen(true)}
        onOpenAssistant={() => setAssistantOpen((value) => !value)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSessions={() => setSessionManagerOpen((value) => !value)}
      />

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <aside className="flex w-80 min-w-[18rem] max-w-[22rem] flex-col gap-3 overflow-hidden">
          <TerminalProfileSelector
            profiles={profiles.length ? profiles : TERMINAL_PROFILES.map((profile) => ({
              ...profile,
              shellAvailable: false,
              shellStatus: "unknown",
              shellSafety: "unknown",
            }))}
            selectedProfileId={activeProfile?.id ?? initialProfileId}
            onSelect={(profileId) => {
              updateTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, profileId, updatedAt: new Date().toISOString() } : tab));
              updatePaneMap((current) => {
                const next = { ...current };
                const pane = next[activePaneId];
                if (pane) {
                  next[activePaneId] = { ...pane, profileId, updatedAt: new Date().toISOString() };
                }
                return next;
              });
            }}
          />

          <TerminalDiagnosticsPanel diagnostics={diagnostics} environment={environment} activePane={activePane} />

          <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3" tabIndex={0} aria-label="Terminal output">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Session Manager</p>
                <h3 className="text-sm font-semibold text-nd-text-primary">Tabs and panes</h3>
              </div>
              <IconButton
                aria-label="Toggle session manager"
                variant="ghost"
                size="sm"
                onClick={() => setSessionManagerOpen((value) => !value)}
              >
                <TerminalIcon className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="space-y-2">
              {tabs.map((tab) => {
                const pane = panes[tab.activePaneId];
                return (
                  <div
                    key={tab.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => switchTab(tab.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab(tab.id); }}
                    className={`w-full cursor-pointer rounded-2xl border px-3 py-2 text-left transition ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08]" : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:bg-nd-surface-tertiary/60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-nd-text-primary">{tab.label}</div>
                        <div className="truncate text-[11px] text-nd-text-muted">{pane?.shell ?? "unknown shell"}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={(e) => { e.stopPropagation(); pinTab(tab.id); }}
                        >
                          {tab.pinned ? "Pinned" : "Pin"}
                        </Button>
                        <IconButton
                          aria-label="Close tab"
                          variant="danger"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); void closeTab(tab.id); }}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-nd-text-muted">
                      <span>{tab.sessionIds.length} pane(s)</span>
                      <span>•</span>
                      <span>{tab.cwd || "workspace"}</span>
                    </div>
                  </div>
                );
              })}
              {tabs.length === 0 && (
                <div className="rounded-2xl border border-dashed border-nd-text-muted/15 bg-nd-surface/20 p-3 text-sm text-nd-text-muted">
                  No terminal tabs available.
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <div role="tablist" aria-label="Terminal sessions" className="mb-3 flex items-center gap-2 overflow-x-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`term-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTabId}
                onClick={() => switchTab(tab.id)}
                className={`inline-flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08] text-nd-text-primary" : "border-nd-border-subtle bg-nd-surface-secondary/40 text-nd-text-muted hover:bg-nd-surface-tertiary/60"}`}
              >
                <TerminalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {tab.pinned && <ShieldCheck className="h-3.5 w-3.5 text-nd-accent-success" aria-hidden="true" />}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => createTab()}
            >
              Add Tab
            </Button>
          </div>

          <div className="grid min-h-0 gap-3" style={{ gridTemplateColumns: assistantOpen ? "minmax(0,1fr) 18rem" : "minmax(0,1fr)" }}>
            <section role="tabpanel" aria-label={activeTab?.label ?? 'Terminal'} className="min-h-0 overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30">
              {activeTab ? (
                <div className="flex min-h-0 h-full flex-col">
                  <div className="flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-nd-text-muted">
                      <Badge tone="neutral" size="sm" variant="outline">{activeTab.layout}</Badge>
                      <span>•</span>
                      <span className="truncate max-w-[16rem]">{activeTab.cwd || environment?.cwd || "cwd unavailable"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        aria-label="Search terminal output"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchOpen((value) => !value)}
                      >
                        <Search className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        aria-label="Split pane horizontally"
                        variant="ghost"
                        size="sm"
                        onClick={() => splitActivePane("horizontal")}
                      >
                        <SplitSquareHorizontal className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        aria-label="Reset pane"
                        variant="ghost"
                        size="sm"
                        onClick={() => void resetPane(activePaneId)}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        aria-label="Close pane"
                        variant="danger"
                        size="sm"
                        onClick={() => void closePane(activePaneId)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden p-2">
                    <div className={`grid h-full min-h-0 gap-2 ${activeTab.sessionIds.length <= 1 ? "grid-cols-1" : activeTab.layout === "split-horizontal" ? "grid-rows-2" : "grid-cols-2"}`}>
                      {activeTab.sessionIds.map((paneId) => {
                        const pane = panes[paneId];
                        if (!pane) return null;
                        const profile = profiles.find((item) => item.id === pane.profileId) ?? null;
                        return (
                          <div key={pane.id} className={`min-h-0 overflow-hidden rounded-2xl border ${pane.id === activePaneId ? "border-nd-accent-primary/30 bg-nd-surface-app/60" : "border-nd-border-subtle bg-nd-surface-app/40"}`}>
                            <TerminalViewport
                              pane={pane}
                              profile={profile}
                              environment={environment}
                              active={pane.id === activePaneId}
                              onFocus={() => setActivePaneId(pane.id)}
                              onPanePatch={(patch) => patchPane(pane.id, patch)}
                              onPaneOutput={(chunk) => setPaneOutput(pane.id, chunk)}
                              onCommandSubmitted={(command) => {
                                const safety = classifyTerminalCommand(command, "user");
                                recordHistory(pane.id, command, safety);
                                patchPane(pane.id, {
                                  commandCount: pane.commandCount + 1,
                                  lastCommand: command,
                                  lastActivityAt: new Date().toISOString(),
                                  state: "busy",
                                });
                              }}
                              onRequestRestart={() => void restartPane(pane.id)}
                              onRequestClear={() => clearPane(pane.id)}
                              onRequestClose={() => void closePane(pane.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[20rem] items-center justify-center p-6 text-sm text-nd-text-muted">
                  No active terminal tab.
                </div>
              )}
            </section>

            {assistantOpen && (
              <aside className="min-h-0 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">AI Assistant</p>
                    <h3 className="text-sm font-semibold text-nd-text-primary">Command help</h3>
                  </div>
                  <IconButton aria-label="Close command help" variant="ghost" size="sm" onClick={() => setAssistantOpen(false)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>

                <div className="mt-3 space-y-2">
                  <textarea
                    value={assistantPrompt}
                    onChange={(e) => setAssistantPrompt(e.target.value)}
                    placeholder="Ask for the next command, explain the last error, or request a safer alternative..."
                    className="min-h-28 w-full rounded-2xl border border-nd-text-muted/15 bg-nd-bg/60 p-3 text-sm text-nd-text-primary outline-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void buildAssistantSuggestions()}>Suggest Commands</Button>
                    <Button size="sm" variant="ghost" onClick={() => void explainLastCommand()}>Explain Last Command</Button>
                  </div>
                  <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-bg/40 p-3 text-xs text-nd-text-muted">
                    <div className="font-semibold text-nd-text-primary">Suggested commands</div>
                    <div className="mt-2 space-y-2">
                      {assistantSuggestions.length === 0 ? (
                        <div className="text-nd-text-muted">No suggestions yet.</div>
                      ) : assistantSuggestions.map((command) => (
                        <Button
                          key={command}
                          variant="ghost"
                          size="xs"
                          fullWidth
                          className="justify-start font-mono text-[11px]"
                          onClick={() => void requestCommandExecution(activePaneId, command, "assistant")}
                        >
                          {command}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>

      <TerminalCommandPalette
        open={commandPaletteOpen}
        actions={availableActions}
        onClose={() => setCommandPaletteOpen(false)}
        onRun={(action) => {
          action.action();
          setCommandPaletteOpen(false);
        }}
      />

      <TerminalSafetyConfirmModal
        command={pendingCommand?.command ?? ""}
        safety={pendingCommand?.safety ?? { level: "unknown", reason: "", source: "palette" }}
        open={Boolean(pendingCommand)}
        onCancel={cancelPendingCommand}
        onConfirm={() => void confirmPendingCommand()}
        description={pendingCommand ? `Source: ${pendingCommand.source}` : undefined}
      />

      {searchOpen && (
        <FocusTrapContainer
          active={searchOpen}
          onEscape={() => setSearchOpen(false)}
          className="fixed inset-x-4 bottom-4 z-[var(--z-modal)] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-panel-elevated"
          role="dialog"
          aria-label="Terminal output search"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Search</div>
              <div className="text-sm font-semibold text-nd-text-primary">Terminal output</div>
            </div>
            <IconButton aria-label="Close search" variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search output or session id..."
              className="min-w-0 flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text-primary outline-none"
            />
            <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")}>Clear</Button>
          </div>
          <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/20 p-3 text-xs text-nd-text-muted">
            {searchResults.length === 0 ? (
              <div>No matches.</div>
            ) : (
              searchResults.slice(-50).map((entry, index) => (
                <div key={`${entry.paneId}-${index}`} className="mb-2 rounded-xl border border-nd-text-muted/15 bg-nd-bg/40 p-2">
                  <div className="font-semibold text-nd-text-primary">{entry.paneId}</div>
                  <div className="mt-1 font-mono text-[11px] text-nd-text-muted">{entry.line}</div>
                </div>
              ))
            )}
          </div>
        </FocusTrapContainer>
      )}

      {sessionManagerOpen && (
        <FocusTrapContainer
          active={sessionManagerOpen}
          onEscape={() => setSessionManagerOpen(false)}
          className="fixed right-4 top-24 z-[var(--z-modal)] w-[28rem] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-panel-elevated"
          role="dialog"
          aria-label="Terminal session manager"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Sessions</div>
              <div className="text-sm font-semibold text-nd-text-primary">Terminal tabs and panes</div>
            </div>
            <IconButton aria-label="Close session manager" variant="ghost" size="sm" onClick={() => setSessionManagerOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="mt-3 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`w-full rounded-2xl border px-3 py-2 text-left ${tab.id === activeTabId ? "border-nd-accent-primary/30 bg-nd-accent-primary/[0.08]" : "border-nd-text-muted/15 bg-nd-surface/40"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-nd-text-primary">{tab.label}</span>
                  <span className="text-xs text-nd-text-muted">{tab.sessionIds.length} pane(s)</span>
                </div>
                <div className="mt-1 text-xs text-nd-text-muted">{tab.cwd || "workspace"}</div>
              </button>
            ))}
          </div>
        </FocusTrapContainer>
      )}

      {pluginPanelOpen && (
        <FocusTrapContainer
          active={pluginPanelOpen}
          onEscape={() => setPluginPanelOpen(false)}
          className="fixed left-4 top-24 z-[var(--z-modal)] w-[24rem] rounded-2xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-panel-elevated"
          role="dialog"
          aria-label="Terminal plugin hooks"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Plugin Hooks</div>
              <div className="text-sm font-semibold text-nd-text-primary">Lua / Hermes / tool commands</div>
            </div>
            <IconButton aria-label="Close plugin panel" variant="ghost" size="sm" onClick={() => setPluginPanelOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="mt-3 space-y-2 text-sm text-nd-text-muted">
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              Use the active shell profile to run Lua plugin checks, Fallow audits, or Hermes repair commands when the tools are detected in the environment probe.
            </div>
            <Button size="sm" variant="ghost" fullWidth onClick={() => void requestCommandExecution(activePaneId, "npx fallow audit --format json", "palette")}>Run Fallow audit</Button>
            <Button size="sm" variant="ghost" fullWidth onClick={() => void requestCommandExecution(activePaneId, "lua --version", "palette")}>Check Lua runtime</Button>
          </div>
        </FocusTrapContainer>
      )}
    </div>
  );
}
