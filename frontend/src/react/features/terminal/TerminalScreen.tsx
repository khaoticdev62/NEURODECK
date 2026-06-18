import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNeuroDeckState } from "../../state/useNeuroDeckState";
import { listenBridge, neurodeckApi } from "../../services/bridgeAdapter";
import {
  classifyTerminalCommand,
  requiresConfirmation,
} from "../../../../../src/shared/terminal/terminalCommandPolicy";
import {
  TERMINAL_PROFILES,
  type TerminalProfileAvailability,
} from "../../../../../src/shared/terminal/terminalProfiles";
import type {
  TerminalCommandHistoryEntry,
  TerminalTab,
} from "../../../../../src/shared/terminal/terminalContracts";
import type { TerminalCommandSafety } from "../../../../../src/shared/terminal/terminalSafetyTypes";
import type {
  TerminalDiagnosticsReport,
  TerminalEnvironmentReport,
} from "../../../../../src/shared/terminal/terminalDiagnosticsTypes";
import { TerminalCommandPalette } from "./TerminalCommandPalette";
import { TerminalSafetyConfirmModal } from "./TerminalSafetyConfirmModal";
import { TerminalHeader } from "./TerminalHeader";
import { TerminalSidebar } from "./TerminalSidebar";
import { TerminalTabBar } from "./TerminalTabBar";
import { TerminalPanesGrid } from "./TerminalPanesGrid";
import { TerminalAssistantPanel } from "./TerminalAssistantPanel";
import { TerminalSearchOverlay } from "./TerminalSearchOverlay";
import { TerminalSessionManagerOverlay } from "./TerminalSessionManagerOverlay";
import { TerminalPluginPanelOverlay } from "./TerminalPluginPanelOverlay";
import {
  buildHistoryEntry,
  collectSuggestions,
  createId,
  defaultPane,
  defaultTerminalTab,
  fallbackShellForProfile,
  loadHistory,
  MAX_OUTPUT_LINES,
  platformToProfile,
  restoreWorkspace,
  stripPromptArtifacts,
  type CommandSource,
  type PaneRuntime,
} from "./terminalUtils";

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
  const [terminalError, setTerminalError] = useState<
    { message: string; onRetry?: () => void } | null
  >(null);
  const hydratedRef = useRef(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const activePane = activePaneId
    ? panes[activePaneId]
    : activeTab
      ? panes[activeTab.activePaneId]
      : undefined;
  const activeProfile =
    profiles.find((profile) => profile.id === (activePane?.profileId ?? activeTab?.profileId)) ??
    profiles[0] ??
    null;

  const saveWorkspace = useCallback(
    (
      nextTabs: TerminalTab[],
      nextPanes: Record<string, PaneRuntime>,
      nextActiveTabId: string,
      nextActivePaneId: string,
      nextHistory: TerminalCommandHistoryEntry[]
    ) => {
      const snapshot = {
        tabs: nextTabs,
        panes: Object.values(nextPanes),
        activeTabId: nextActiveTabId,
        activePaneId: nextActivePaneId,
        history: nextHistory,
        selectedProfileId:
          nextPanes[nextActivePaneId]?.profileId ||
          nextTabs.find((tab) => tab.id === nextActiveTabId)?.profileId ||
          initialProfileId,
      };
      try {
        localStorage.setItem("neurodeck:terminal-workspace-v1", JSON.stringify(snapshot));
        localStorage.setItem("neurodeck:terminal-history-v1", JSON.stringify(nextHistory));
      } catch (error) {
        setTerminalError({
          message: `Failed to save terminal workspace: ${String(error)}`,
        });
      }
    },
    [initialProfileId]
  );

  const patchPane = useCallback((paneId: string, patch: Partial<PaneRuntime>) => {
    setPanes((current) => {
      const existing = current[paneId];
      if (!existing) return current;
      return {
        ...current,
        [paneId]: { ...existing, ...patch, updatedAt: new Date().toISOString() },
      };
    });
  }, []);

  const setPaneOutput = useCallback((paneId: string, chunk: string) => {
    setPanes((current) => {
      const existing = current[paneId];
      if (!existing) return current;
      const nextOutput = [...existing.output, ...stripPromptArtifacts(chunk).split(/\n/)].slice(
        -MAX_OUTPUT_LINES
      );
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

  const recordHistory = useCallback(
    (paneId: string, command: string, safety: TerminalCommandSafety, durationMs?: number) => {
      setHistory((current) => {
        const entry = buildHistoryEntry(panes[paneId], paneId, command, safety, durationMs);
        return [entry, ...current].slice(0, 100);
      });
    },
    [panes]
  );

  const updateTabs = useCallback((updater: (current: TerminalTab[]) => TerminalTab[]) => {
    setTabs((current) => {
      return updater(current);
    });
  }, []);

  const updatePaneMap = useCallback(
    (updater: (current: Record<string, PaneRuntime>) => Record<string, PaneRuntime>) => {
      setPanes((current) => {
        return updater(current);
      });
    },
    []
  );

  const refreshDiagnostics = useCallback(async () => {
    try {
      const [nextEnv, nextProfiles, nextDiagnostics] = await Promise.all([
        neurodeckApi.terminal.getEnvironment(),
        neurodeckApi.terminal.getProfiles(),
        neurodeckApi.terminal.getDiagnostics(),
      ]);
      setEnvironment(nextEnv);
      setProfiles(nextProfiles);
      setDiagnostics(nextDiagnostics);
      setStatusMessage(
        nextDiagnostics.activeSessionCount > 0 ? "Terminal sessions active." : "No active sessions."
      );
      setTerminalError(null);
    } catch (error) {
      setTerminalError({
        message: `Failed to refresh terminal diagnostics: ${String(error)}`,
        onRetry: refreshDiagnostics,
      });
    }
  }, []);

  const createTab = useCallback(
    (
      profileId = activeProfile?.id ?? initialProfileId,
      cwd = activeProjectPath || environment?.cwd || ""
    ) => {
      const profile =
        TERMINAL_PROFILES.find((item) => item.id === profileId) ?? TERMINAL_PROFILES[0];
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
    },
    [activeProfile?.id, activeProjectPath, environment?.cwd, initialProfileId, updatePaneMap, updateTabs]
  );

  const switchTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;
      setActiveTabId(tabId);
      setActivePaneId(tab.activePaneId);
    },
    [tabs]
  );

  const splitActivePane = useCallback(
    (orientation: "vertical" | "horizontal") => {
      const tab = tabs.find((item) => item.id === activeTabId);
      if (!tab) return;
      const basePane = panes[tab.activePaneId];
      if (!basePane) return;
      const profile =
        TERMINAL_PROFILES.find((item) => item.id === basePane.profileId) ?? TERMINAL_PROFILES[0];
      const nextPane = defaultPane(tab.id, basePane.cwd, profile);
      nextPane.title = `${basePane.title} Split`;
      nextPane.shell = basePane.shell;
      nextPane.shellArgs = [...basePane.shellArgs];
      nextPane.profileId = basePane.profileId;
      nextPane.state = "created";
      nextPane.active = true;
      nextPane.output = [];
      nextPane.sessionId = createId("pty");

      updatePaneMap((current) => ({
        ...current,
        [nextPane.id]: nextPane,
        [basePane.id]: { ...basePane, active: false },
      }));
      updateTabs((current) =>
        current.map((item) => {
          if (item.id !== tab.id) return item;
          const sessionIds = Array.from(new Set([...item.sessionIds, nextPane.id]));
          return {
            ...item,
            layout: orientation === "vertical" ? "split-vertical" : "split-horizontal",
            activePaneId: nextPane.id,
            sessionIds,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      setActivePaneId(nextPane.id);
      setStatusMessage(`Split ${orientation} pane created.`);
    },
    [activeTabId, panes, updatePaneMap, updateTabs, tabs]
  );

  const closePane = useCallback(
    async (paneId: string) => {
      const pane = panes[paneId];
      if (!pane) return;
      await neurodeckApi.terminal.kill(pane.sessionId).catch((error) => {
        setTerminalError({
          message: `Failed to kill terminal session: ${String(error)}`,
        });
      });
      updatePaneMap((current) => {
        const next = { ...current };
        delete next[paneId];
        return next;
      });
      updateTabs((current) =>
        current.map((tab) => {
          if (!tab.sessionIds.includes(paneId)) return tab;
          const nextSessions = tab.sessionIds.filter((id) => id !== paneId);
          const nextActivePaneId =
            tab.activePaneId === paneId ? (nextSessions[0] ?? "") : tab.activePaneId;
          return {
            ...tab,
            sessionIds: nextSessions,
            activePaneId: nextActivePaneId,
            layout: nextSessions.length <= 1 ? "single" : tab.layout,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      if (activePaneId === paneId) {
        const nextPaneId = tabs.flatMap((tab) => tab.sessionIds).find((id) => id !== paneId) ?? "";
        setActivePaneId(nextPaneId);
      }
      setStatusMessage("Pane closed.");
    },
    [activePaneId, panes, tabs, updatePaneMap, updateTabs]
  );

  const restartPane = useCallback(
    async (paneId: string) => {
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
    },
    [environment, panes, profiles, updatePaneMap]
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;
      if (tabs.length <= 1) {
        if (tab.activePaneId) await restartPane(tab.activePaneId);
        return;
      }
      for (const paneId of tab.sessionIds) {
        const pane = panes[paneId];
        if (pane) {
          await neurodeckApi.terminal.kill(pane.sessionId).catch((error) => {
            setTerminalError({
              message: `Failed to kill terminal session: ${String(error)}`,
            });
          });
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
    },
    [panes, restartPane, tabs, updatePaneMap, updateTabs]
  );

  const pinTab = useCallback(
    (tabId: string) => {
      updateTabs((current) =>
        current.map((tab) => (tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab))
      );
    },
    [updateTabs]
  );

  const clearPane = useCallback(
    (paneId: string) => {
      const pane = panes[paneId];
      if (!pane) return;
      const term = (
        window as Window & { __terminalInstances?: Record<string, { clear?: () => void }> }
      ).__terminalInstances?.[paneId];
      term?.clear?.();
      patchPane(paneId, { output: [] });
      setStatusMessage("Pane cleared.");
    },
    [panes, patchPane]
  );

  const requestCommandExecution = useCallback(
    async (paneId: string, command: string, source: CommandSource) => {
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
        setStatusMessage(
          `${safety.level === "dangerous" ? "Dangerous" : "Confirm"} command pending.`
        );
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
    },
    [panes, patchPane, recordHistory]
  );

  const availableActions = useMemo(() => {
    const current = activePane ?? null;
    return [
      { id: "new-tab", label: "New Tab", action: () => createTab() },
      { id: "split-vertical", label: "Split Vertical", action: () => splitActivePane("vertical") },
      {
        id: "split-horizontal",
        label: "Split Horizontal",
        action: () => splitActivePane("horizontal"),
      },
      {
        id: "restart",
        label: "Restart Pane",
        action: () => restartPane(current?.id ?? activePaneId),
      },
      { id: "clear", label: "Clear Pane", action: () => clearPane(current?.id ?? activePaneId) },
      { id: "search", label: "Search Output", action: () => setSearchOpen(true) },
      {
        id: "assistant",
        label: "Open AI Assistant",
        action: () => setAssistantOpen((value) => !value),
      },
      { id: "diagnostics", label: "Refresh Diagnostics", action: () => void refreshDiagnostics() },
      {
        id: "session-manager",
        label: "Session Manager",
        action: () => setSessionManagerOpen((value) => !value),
      },
      {
        id: "plugin-panel",
        label: "Plugin Hooks",
        action: () => setPluginPanelOpen((value) => !value),
      },
      { id: "create-pane", label: "Split Active Pane", action: () => splitActivePane("vertical") },
    ];
  }, [
    activePane,
    activePaneId,
    clearPane,
    createTab,
    refreshDiagnostics,
    restartPane,
    splitActivePane,
  ]);

  useEffect(() => {
    saveWorkspace(tabs, panes, activeTabId, activePaneId, history);
  }, [activePaneId, activeTabId, history, panes, saveWorkspace, tabs]);

  const confirmPendingCommand = useCallback(async () => {
    if (!pendingCommand) return;
    const pane = panes[pendingCommand.paneId];
    if (!pane) return;
    await neurodeckApi.terminal
      .write(pane.sessionId, `${pendingCommand.command}\r`)
      .catch((error) => {
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
    try {
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
      } else {
        setTerminalError({
          message: "Failed to explain last command.",
          onRetry: explainLastCommand,
        });
      }
    } catch (error) {
      setTerminalError({
        message: `Failed to explain last command: ${String(error)}`,
        onRetry: explainLastCommand,
      });
    }
  }, [
    activePane,
    activeProject?.name,
    state.projectContext,
    state.selectedModelId,
    state.selectedPersona,
    state.selectedProvider,
  ]);

  const buildAssistantSuggestions = useCallback(async () => {
    const pane = activePane;
    const profile = panes[activePaneId]
      ? profiles.find((item) => item.id === panes[activePaneId].profileId)
      : null;
    const localSuggestions = collectSuggestions(
      activeProject ?? null,
      environment,
      profile ?? undefined
    );
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
        `Recent history: ${
          history
            .slice(0, 4)
            .map((entry) => entry.redactedCommand)
            .join(" | ") || "none"
        }`,
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
  }, [
    activePane,
    activePaneId,
    activeProject,
    environment,
    history,
    panes,
    profiles,
    state.projectContext,
    state.selectedModelId,
    state.selectedPersona,
    state.selectedProvider,
  ]);

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
    const baseProfile =
      TERMINAL_PROFILES.find((item) => item.id === initialProfileId) ?? TERMINAL_PROFILES[0];
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

  const cycleTab = useCallback(
    (delta: number) => {
      if (!tabs.length) return;
      const currentIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.id === activeTabId)
      );
      const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
      if (next) {
        setActiveTabId(next.id);
        setActivePaneId(next.activePaneId);
      }
    },
    [activeTabId, tabs]
  );

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
        const term = (
          window as Window & { __terminalInstances?: Record<string, { focus?: () => void }> }
        ).__terminalInstances?.[activePaneId];
        term?.focus?.();
      }
    });

    return () => {
      unsubOutput();
      unsubExit();
      unsubDeckcode();
    };
  }, [
    activePaneId,
    assistantSuggestions,
    cycleTab,
    panes,
    patchPane,
    requestCommandExecution,
    setPaneOutput,
    splitActivePane,
  ]);

  useEffect(() => {
    const onResize = () => {
      const instances = (
        window as Window & { __terminalInstances?: Record<string, { fit?: () => void }> }
      ).__terminalInstances;
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

  const selectedProfileAvailability = activeProfile ?? profiles[0] ?? null;
  const statusLevel =
    activePane?.state === "blocked"
      ? "blocked"
      : activePane?.state === "error"
        ? "error"
        : activePane?.state === "exited"
          ? "exited"
          : "running";
  const visiblePanes = activeTab ? activeTab.sessionIds.map((id) => panes[id]).filter(Boolean) : [];
  const allOutput = visiblePanes.flatMap((pane) =>
    pane.output.map((line) => ({ paneId: pane.id, line }))
  );
  const searchResults = searchQuery
    ? allOutput.filter(
        (entry) =>
          entry.line.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.paneId.includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      updateTabs((current) =>
        current.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, profileId, updatedAt: new Date().toISOString() }
            : tab
        )
      );
      updatePaneMap((current) => {
        const next = { ...current };
        const pane = next[activePaneId];
        if (pane) {
          next[activePaneId] = { ...pane, profileId, updatedAt: new Date().toISOString() };
        }
        return next;
      });
    },
    [activePaneId, activeTabId, updatePaneMap, updateTabs]
  );

  return (
    <div className="terminal-screen flex h-full min-h-0 flex-col overflow-hidden bg-nd-bg text-nd-text-primary">
      <TerminalHeader
        statusLevel={statusLevel}
        statusMessage={statusMessage}
        activeTab={activeTab}
        activePane={activePane}
        activeProfile={selectedProfileAvailability}
        activeProjectPath={activeProjectPath}
        environment={environment}
        onCreateTab={() => createTab()}
        onSplitVertical={() => splitActivePane("vertical")}
        onOpenPalette={() => setCommandPaletteOpen(true)}
        onRefreshDiagnostics={refreshDiagnostics}
      />

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <TerminalSidebar
          profiles={profiles}
          fallbackProfiles={TERMINAL_PROFILES}
          activeTabId={activeTabId}
          activePane={activePane}
          tabs={tabs}
          panes={panes}
          diagnostics={diagnostics}
          environment={environment}
          terminalError={terminalError}
          selectedProfileId={selectedProfileAvailability?.id ?? initialProfileId}
          onSelectProfile={handleSelectProfile}
          onSwitchTab={switchTab}
          onPinTab={pinTab}
          onCloseTab={closeTab}
          onToggleSessionManager={() => setSessionManagerOpen((value) => !value)}
          onClearError={() => setTerminalError(null)}
        />

        <main className="min-w-0 flex-1 overflow-hidden">
          <TerminalTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitchTab={switchTab}
            onCreateTab={() => createTab()}
          />

          <div
            className="grid min-h-0 gap-3"
            style={{ gridTemplateColumns: assistantOpen ? "minmax(0,1fr) 18rem" : "minmax(0,1fr)" }}
          >
            <section
              role="tabpanel"
              aria-label={activeTab?.label ?? "Terminal"}
              className="min-h-0 overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30"
            >
              <TerminalPanesGrid
                activeTab={activeTab}
                activePaneId={activePaneId}
                panes={panes}
                profiles={profiles}
                environment={environment}
                onSetActivePaneId={setActivePaneId}
                onPatchPane={patchPane}
                onSetPaneOutput={setPaneOutput}
                onRecordHistory={recordHistory}
                onRequestRestart={restartPane}
                onRequestClear={clearPane}
                onRequestClose={closePane}
                onSplitHorizontal={() => splitActivePane("horizontal")}
                onToggleSearch={() => setSearchOpen((value) => !value)}
              />
            </section>

            {assistantOpen && (
              <TerminalAssistantPanel
                prompt={assistantPrompt}
                suggestions={assistantSuggestions}
                onPromptChange={setAssistantPrompt}
                onSuggest={buildAssistantSuggestions}
                onExplain={explainLastCommand}
                onRunCommand={(command) => void requestCommandExecution(activePaneId, command, "assistant")}
                onClose={() => setAssistantOpen(false)}
              />
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

      <TerminalSearchOverlay
        open={searchOpen}
        query={searchQuery}
        results={searchResults}
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onClear={() => setSearchQuery("")}
      />

      <TerminalSessionManagerOverlay
        open={sessionManagerOpen}
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onClose={() => setSessionManagerOpen(false)}
      />

      <TerminalPluginPanelOverlay
        open={pluginPanelOpen}
        onClose={() => setPluginPanelOpen(false)}
        onRunAudit={() =>
          void requestCommandExecution(activePaneId, "npx fallow audit --format json", "palette")
        }
        onRunLuaCheck={() => void requestCommandExecution(activePaneId, "lua --version", "palette")}
      />
    </div>
  );
}
