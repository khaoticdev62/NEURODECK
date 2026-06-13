import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Command, Loader2, Sparkles, X } from "lucide-react";
import type { AIProvider } from "./types/neurodeck";
import { CommandPalette } from "./components/command/CommandPalette";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { ControllerHintBar } from "./components/layout/ControllerHintBar";
import { PrimarySidebar } from "./components/layout/PrimarySidebar";
import { SecondaryRail } from "./components/layout/SecondaryRail";
import { TitleBar } from "./components/layout/TitleBar";
import { StatusBar } from "./components/layout/StatusBar";
import { Badge } from "./components/primitives/Badge";
import { ToastProvider } from "./components/primitives/Toast";
import { AgentsView } from "./features/agents/AgentsView";
import { ApiLabView } from "./features/api-lab/ApiLabView";
import { BrowserView } from "./features/browser/BrowserView";
import { CacheView } from "./features/cache/CacheView";
import { CanvasView } from "./features/canvas/CanvasView";
import { CliMakerView } from "./features/cli-maker/CliMakerView";
import { DiagnosticsView } from "./features/diagnostics/DiagnosticsView";
import { DocsView } from "./features/docs/DocsView";
import { ExecutionView } from "./features/execution/ExecutionView";
import { GitView } from "./features/git/GitView";
import { GraphView } from "./features/graph/GraphView";
import { IDEView } from "./features/ide/IDEView";
import { MemoryView } from "./features/memory/MemoryView";
import { ModelsView } from "./features/models/ModelsView";
import { OrchestratorView } from "./features/orchestrator/OrchestratorView";
import { PluginsView } from "./features/plugins/PluginsView";
import { ProjectView } from "./features/project/ProjectView";
import { AcademyView } from "./features/academy/AcademyView";
import { PromptLabView } from "./features/prompt-lab/PromptLabView";
import { RemoteView } from "./features/remote/RemoteView";
import { SchedulerView } from "./features/scheduler/SchedulerView";
import { SessionsView } from "./features/sessions/SessionsView";
import { SettingsView } from "./features/settings/SettingsView";
import { ShareView } from "./features/share/ShareView";
import { TorrentView } from "./features/torrent/TorrentView";
import { SSHView } from "./features/ssh/SSHView";
import { TerminalView } from "./features/terminal/TerminalView";
import { TunnelView } from "./features/tunnel/TunnelView";
import { ExportsView } from "./features/exports/ExportsView";
import { FontManagerView } from "./features/fonts/FontManagerView";
import { MaintenanceView } from "./features/maintenance/MaintenanceView";
import { RecoveryView } from "./features/recovery/RecoveryView";
import { SecurityView } from "./features/security/SecurityView";
import { ThemesView } from "./features/themes/ThemesView";
import { WorkspaceView } from "./features/workspace/WorkspaceView";
import { LiveWallpaperHost } from "./features/wallpapers/LiveWallpaperHost";
import { ControllerDebugOverlay } from "./input/controller/ControllerDebugOverlay";
import { ControllerHelpOverlay } from "./input/controller/ControllerHelpOverlay";
import { ControllerProvider } from "./input/controller/ControllerProvider";
import { useTheme } from "./theme/useTheme";

import { neurodeckApi } from "./services/bridgeAdapter";
import { useNeuroDeckState } from "./state/useNeuroDeckState";
import type {
  AIMessage,
  ExportSessionPayload,
  NeuroDeckAppActions,
  SavedSessionPayload,
  ViewId,
} from "./types/neurodeck";
import { fontOptions, navItems } from "./types/seed";

function makeUserMessage(content: string): AIMessage {
  return { id: `user-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
}

export default function App() {
  const { state, dispatch, resetLocalState, selectors } = useNeuroDeckState();
  const { activeTheme } = useTheme();
  const shellRef = useRef<HTMLDivElement>(null);
  const shortcutSinkRef = useRef<HTMLInputElement>(null);
  // Overlay trigger refs — used to restore focus when overlays close
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const notifTriggerRef = useRef<HTMLElement | null>(null);
  const shortcutsTriggerRef = useRef<HTMLElement | null>(null);
  const ctrlPromptTriggerRef = useRef<HTMLElement | null>(null);
  const quickSwitcherTriggerRef = useRef<HTMLElement | null>(null);
  // Overlay panel focus targets
  const settingsDialogRef = useRef<HTMLDivElement>(null);
  const notifDialogRef = useRef<HTMLDivElement>(null);
  const shortcutsDialogRef = useRef<HTMLDivElement>(null);
  const ctrlPromptDialogRef = useRef<HTMLDivElement>(null);
  const quickSwitcherDialogRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState("general");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [quickSwitcherFocusIdx, setQuickSwitcherFocusIdx] = useState(0);
  const [ctrlPromptOpen, setCtrlPromptOpen] = useState(false);
  const [recentViews, setRecentViews] = useState<ViewId[]>([]);

  useEffect(() => {
    const loader = document.getElementById("boot-loader");
    if (loader) {
      const t = setTimeout(() => {
        loader.classList.add("done");
      }, 100);
      const t2 = setTimeout(() => {
        loader.remove();
      }, 700);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onDiagnosticsPing) return;
    const unsubscribe = api.onDiagnosticsPing((data) => {
      api.diagnosticsPong({ requestId: data.requestId }).catch(() => {});
    });
    return unsubscribe;
  }, []);

  const selectedModel =
    state.models.find((model) => model.id === state.selectedModelId) ??
    state.models.find((model) => model.backendModel === state.selectedModelId) ??
    state.models[0];
  const modelName =
    state.selectedProvider === "offline-draft"
      ? "NeuroDraft"
      : (selectedModel?.name ?? state.selectedModelId ?? "default");
  const selectedBackendModel =
    selectedModel?.backendModel ?? selectedModel?.id ?? "neurodraft-local";

  useEffect(() => {
    setRecentViews((current) => {
      const next = current.filter((view) => view !== state.activeView);
      return [state.activeView, ...next].slice(0, 8);
    });
  }, [state.activeView]);

  // Focus management for overlays — move focus in on open, restore on close
  useEffect(() => {
    if (settingsOpen) {
      settingsTriggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const el = settingsDialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (el ?? settingsDialogRef.current)?.focus();
      });
    } else {
      (settingsTriggerRef.current as HTMLElement | null)?.focus();
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (notificationsOpen) {
      notifTriggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const el = notifDialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (el ?? notifDialogRef.current)?.focus();
      });
    } else {
      (notifTriggerRef.current as HTMLElement | null)?.focus();
    }
  }, [notificationsOpen]);

  useEffect(() => {
    if (shortcutsOpen) {
      shortcutsTriggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const el = shortcutsDialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (el ?? shortcutsDialogRef.current)?.focus();
      });
    } else {
      (shortcutsTriggerRef.current as HTMLElement | null)?.focus();
    }
  }, [shortcutsOpen]);

  useEffect(() => {
    if (ctrlPromptOpen) {
      ctrlPromptTriggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const el = ctrlPromptDialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (el ?? ctrlPromptDialogRef.current)?.focus();
      });
    } else {
      (ctrlPromptTriggerRef.current as HTMLElement | null)?.focus();
    }
  }, [ctrlPromptOpen]);

  useEffect(() => {
    if (quickSwitcherOpen) {
      quickSwitcherTriggerRef.current = document.activeElement as HTMLElement;
      setQuickSwitcherFocusIdx(0);
      requestAnimationFrame(() => {
        const list =
          quickSwitcherDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button[data-qs-item]"
          );
        list?.[0]?.focus();
      });
    } else {
      (quickSwitcherTriggerRef.current as HTMLElement | null)?.focus();
    }
  }, [quickSwitcherOpen]);

  // Defensive: hide browser native overlay when switching away from browser tab
  useEffect(() => {
    if (state.activeView !== "browser") {
      neurodeckApi.browser.hide();
    }
  }, [state.activeView]);

  const scanProject = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Scanning selected project folder…" });
    const response = await neurodeckApi.projects.selectAndScan();
    if ("canceled" in response && response.canceled) {
      dispatch({ type: "set-busy", label: null });
      return;
    }
    if (response.error || !response.project) {
      dispatch({
        type: "set-error",
        error: {
          title: "Project scan failed",
          message: response.error ?? "No project data returned.",
          action: "Try another folder or open Diagnostics.",
        },
      });
      return;
    }
    dispatch({ type: "set-project-scan", project: response.project });
    dispatch({ type: "set-busy", label: null });
  }, [dispatch]);

  const buildProjectContext = useCallback(async () => {
    if (!state.activeProject?.path) {
      dispatch({
        type: "set-error",
        error: {
          title: "No project attached",
          message: "Scan a project folder before building AI context.",
          action: "Use Scan Project from Workspace or Command Palette.",
        },
      });
      return;
    }
    dispatch({ type: "set-busy", label: "Building redacted project context…" });
    const response = await neurodeckApi.projects.buildContext(state.activeProject.path);
    if (!response.ok) {
      dispatch({
        type: "set-error",
        error: {
          title: "Context build failed",
          message: response.error,
          action: "Open Diagnostics and verify the project folder is readable.",
        },
      });
      return;
    }
    dispatch({ type: "set-project-context", context: response.context });
    dispatch({ type: "set-busy", label: null });
  }, [dispatch, state.activeProject?.path]);

  const refreshModelScores = useCallback(async () => {
    try {
      const scores = await neurodeckApi.models.getCompatibilityScores({});
      dispatch({ type: "set-model-scores", scores });
    } catch (e) {
      dispatch({ type: "set-model-scores", scores: [] });
    }
  }, [dispatch]);

  const refreshAgentPolicies = useCallback(async () => {
    try {
      const policies = await neurodeckApi.models.getAgentModelPolicies();
      dispatch({ type: "set-agent-policies", policies });
    } catch (e) {
      dispatch({ type: "set-agent-policies", policies: [] });
    }
  }, [dispatch]);

  const refreshRecoveryEvents = useCallback(async () => {
    try {
      const events = await neurodeckApi.models.getRecoveryEventLog();
      dispatch({ type: "set-recovery-events", events });
    } catch (e) {
      dispatch({ type: "set-recovery-events", events: [] });
    }
  }, [dispatch]);

  const validateAgentModel = useCallback(async (agentId: string, modelId: string) => {
    return neurodeckApi.models.validateAgentModel(agentId, modelId);
  }, []);

  const detectModels = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Detecting local model runtimes…" });
    const response = await neurodeckApi.models.detectLocal();
    if (!response.ok) {
      dispatch({
        type: "set-error",
        error: {
          title: "Model detection failed",
          message: response.error,
          action: "Check known model folders or open Diagnostics.",
        },
      });
      return;
    }
    dispatch({ type: "set-model-detection", detection: response.detection });
    if (response.detection.discoveredModels.length) {
      dispatch({ type: "merge-detected-models", models: response.detection.discoveredModels });
      dispatch({ type: "set-selected-model", id: response.detection.discoveredModels[0].id });
    }
    await Promise.all([refreshModelScores(), refreshAgentPolicies()]);
    dispatch({ type: "set-busy", label: null });
  }, [dispatch, refreshModelScores, refreshAgentPolicies]);

  const checkAiHealth = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Checking local AI runtimes…" });
    const health = await neurodeckApi.ai.health();
    dispatch({ type: "set-ai-health", health });
    await refreshRecoveryEvents();
    dispatch({ type: "set-busy", label: null });
  }, [dispatch, refreshRecoveryEvents]);

  const runAssistant = useCallback(
    async (overridePrompt?: string) => {
      const prompt = (overridePrompt ?? state.composerValue).trim();
      if (!prompt) {
        dispatch({
          type: "set-error",
          error: {
            title: "Prompt is empty",
            message: "Type a task or choose a prompt template before running the assistant.",
            action: "Try the Command Palette templates.",
          },
        });
        return;
      }

      // Enforce agent/model policy for the active agent (default 'general').
      if (state.selectedProvider !== "offline-draft" && state.selectedModelId) {
        try {
          const allowance = await neurodeckApi.models.validateAgentModel(
            state.activeAgentId,
            state.selectedModelId
          );
          if (!allowance.allowed) {
            await neurodeckApi.models.recordRecoveryEvent({
              runtimeId: state.selectedProvider,
              modelId: state.selectedModelId,
              state: "blocked",
              action: "policy_block",
              allowed: false,
              reason: allowance.reason,
            });
            await refreshRecoveryEvents();
            dispatch({
              type: "set-error",
              error: {
                title: "Model blocked by agent policy",
                message: allowance.reason,
                action:
                  "Open Model Manager to switch to an allowed model, or change the active agent.",
              },
            });
            return;
          }
        } catch (_) {
          // Policy service unavailable — proceed rather than hard-block.
        }
      }

      const userMessage = makeUserMessage(prompt);
      dispatch({ type: "append-message", message: userMessage });
      dispatch({ type: "set-busy", label: `${state.selectedProvider} is generating…` });

      const assistantId = `assistant-${Date.now()}`;
      dispatch({
        type: "append-message",
        message: {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          provider: state.selectedProvider,
          model: modelName,
        },
      });

      await neurodeckApi.ai.chatStream(
        {
          provider: state.selectedProvider,
          model: selectedBackendModel,
          persona: state.selectedPersona,
          prompt,
          messages: [...state.messages, userMessage],
          projectContext: state.projectContext,
          activeProjectName: state.activeProject?.name,
        },
        {
          onToken: (token) => {
            dispatch({ type: "update-message", id: assistantId, content: token });
          },
          onDone: () => {
            dispatch({ type: "set-busy", label: null });
          },
          onError: (error) => {
            dispatch({ type: "set-busy", label: null });
            dispatch({
              type: "set-error",
              error: {
                title: "AI execution failed",
                message: error,
                action: "Check AI Health or switch to Offline Draft provider.",
              },
            });
          },
        }
      );
    },
    [
      dispatch,
      modelName,
      selectedBackendModel,
      state.activeAgentId,
      state.activeProject?.name,
      state.composerValue,
      state.messages,
      state.projectContext,
      state.selectedModelId,
      state.selectedPersona,
      state.selectedProvider,
      refreshRecoveryEvents,
    ]
  );

  const runAgent = useCallback(
    async (agentId: string, overridePrompt?: string) => {
      const agent = state.agents.find((item) => item.id === agentId);
      if (!agent) return;
      dispatch({ type: "set-active-agent", id: agent.id });
      const prompt = (
        overridePrompt ||
        state.composerValue ||
        agent.task ||
        `Run ${agent.name} review.`
      ).trim();

      // Enforce agent/model policy before invoking the agent.
      if (state.selectedProvider !== "offline-draft" && state.selectedModelId) {
        try {
          const allowance = await neurodeckApi.models.validateAgentModel(
            agent.id,
            state.selectedModelId
          );
          if (!allowance.allowed) {
            await neurodeckApi.models.recordRecoveryEvent({
              runtimeId: state.selectedProvider,
              modelId: state.selectedModelId,
              state: "blocked",
              action: "policy_block",
              allowed: false,
              reason: allowance.reason,
            });
            await refreshRecoveryEvents();
            dispatch({
              type: "set-agent-status",
              id: agent.id,
              status: "blocked",
              lastAction: allowance.reason,
              task: "Policy block",
            });
            dispatch({
              type: "set-error",
              error: {
                title: `${agent.name} model blocked by policy`,
                message: allowance.reason,
                action: "Switch to an allowed model in Model Manager.",
              },
            });
            return;
          }
        } catch (_) {
          // Policy service unavailable — proceed rather than hard-block.
        }
      }

      dispatch({
        type: "set-agent-status",
        id: agent.id,
        status: "thinking",
        lastAction: "Agent execution started",
        task: prompt.slice(0, 100),
      });
      dispatch({ type: "set-busy", label: `${agent.name} agent running…` });
      const response = await neurodeckApi.agents.run({
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        provider: state.selectedProvider,
        model: modelName,
        persona: state.selectedPersona,
        prompt,
        projectContext: state.projectContext,
      });
      dispatch({ type: "add-ai-run", run: response.run });
      if (!response.ok) {
        dispatch({
          type: "set-agent-status",
          id: agent.id,
          status: "blocked",
          lastAction: response.error,
          task: "Execution blocked",
        });
        dispatch({
          type: "set-error",
          error: {
            title: `${agent.name} agent failed`,
            message: response.error,
            action: "Switch provider, check local runtime, or use Offline Draft.",
          },
        });
        return;
      }
      dispatch({
        type: "set-agent-status",
        id: agent.id,
        status: "complete",
        lastAction: "Agent execution complete",
        task: "Ready",
      });
      dispatch({
        type: "append-message",
        message: {
          id: `agent-${response.run.id}`,
          role: "assistant",
          content: response.run.result ?? "Agent run complete.",
          createdAt: new Date().toISOString(),
          provider: response.run.provider,
          model: response.run.model,
        },
      });
      dispatch({ type: "set-busy", label: null });
    },
    [
      dispatch,
      modelName,
      state.agents,
      state.activeAgentId,
      state.composerValue,
      state.projectContext,
      state.selectedModelId,
      state.selectedPersona,
      state.selectedProvider,
      refreshRecoveryEvents,
    ]
  );

  const refreshDiagnostics = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Refreshing diagnostics…" });
    const [diagnostics, logs] = await Promise.all([
      neurodeckApi.diagnostics.get(),
      neurodeckApi.diagnostics.logs(),
    ]);
    dispatch({ type: "set-diagnostics", diagnostics, logs });
    dispatch({ type: "set-busy", label: null });
  }, [dispatch]);

  const exportSession = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Exporting session markdown…" });
    const payload: ExportSessionPayload = {
      title: "NEURODECK Workspace Export",
      persona: state.selectedPersona,
      theme: activeTheme.name,
      lines: [
        `Active view: ${state.activeView}`,
        `Provider: ${state.selectedProvider}`,
        `Model: ${modelName}`,
        `Messages: ${selectors.messageCount}`,
        `Agent runs: ${state.aiRuns.length}`,
        `Composer draft: ${state.composerValue || "empty"}`,
        `Pinned memories: ${selectors.pinnedMemories}`,
        `Ready/indexed models: ${selectors.readyModels}`,
        `Enabled plugins: ${selectors.enabledPlugins}`,
      ],
      projectName: state.activeProject?.name,
      modelSummary: state.modelDetection?.summary,
    };
    const response = await neurodeckApi.sessions.exportMarkdown(payload);
    if (!response.ok) {
      dispatch({
        type: "set-error",
        error: {
          title: "Session export failed",
          message: response.error,
          action: "Open Diagnostics and verify the exports directory.",
        },
      });
      return;
    }
    dispatch({ type: "set-export-path", path: response.file });
    dispatch({ type: "set-busy", label: null });
  }, [
    dispatch,
    modelName,
    selectors.enabledPlugins,
    selectors.messageCount,
    selectors.pinnedMemories,
    selectors.readyModels,
    state.activeProject?.name,
    state.activeView,
    state.aiRuns.length,
    state.composerValue,
    state.modelDetection?.summary,
    state.selectedPersona,
    state.selectedProvider,
    activeTheme.name,
  ]);

  const saveSession = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Saving session JSON…" });
    const payload: SavedSessionPayload = {
      title: state.activeProject ? `${state.activeProject.name} Session` : "NEURODECK Session",
      state: {
        selectedPersona: state.selectedPersona,
        selectedProvider: state.selectedProvider,
        selectedModelId: state.selectedModelId,
        messages: state.messages,
        aiRuns: state.aiRuns,
        activeProject: state.activeProject,
        projectContext: state.projectContext,
      },
    };
    const response = await neurodeckApi.sessions.save(payload);
    if (!response.ok) {
      dispatch({
        type: "set-error",
        error: {
          title: "Session save failed",
          message: response.error,
          action: "Open Diagnostics and verify userData permissions.",
        },
      });
      return;
    }
    dispatch({ type: "set-export-path", path: response.file });
    dispatch({ type: "set-busy", label: null });
  }, [
    dispatch,
    state.activeProject,
    state.aiRuns,
    state.messages,
    state.projectContext,
    state.selectedModelId,
    state.selectedPersona,
    state.selectedProvider,
  ]);

  const exportDiagnosticsBundle = useCallback(async () => {
    dispatch({ type: "set-busy", label: "Exporting sanitized diagnostics bundle…" });
    const response = await neurodeckApi.diagnostics.exportBundle();
    if (!response.ok) {
      dispatch({
        type: "set-error",
        error: {
          title: "Diagnostics export failed",
          message: response.error,
          action: "Refresh Diagnostics, then retry. Verify userData write permissions.",
        },
      });
      return;
    }
    dispatch({ type: "set-export-path", path: response.file });
    dispatch({ type: "set-busy", label: null });
  }, [dispatch]);

  const addMemoryFact = useCallback(
    async (content: string) => {
      dispatch({ type: "set-busy", label: "Adding fact to memory..." });
      try {
        const res = await neurodeckApi.memory.addFact(content);
        const newMemoryItem = {
          id: res.id,
          title: content.slice(0, 40),
          body: content,
          scope: "Global" as const,
          pinned: false,
          updatedAt: new Date().toLocaleDateString(),
        };
        dispatch({ type: "add-memory", memory: newMemoryItem });
      } catch (e) {
        const localId = `mem-${Date.now()}`;
        const newMemoryItem = {
          id: localId,
          title: content.slice(0, 40),
          body: content,
          scope: "Global" as const,
          pinned: false,
          updatedAt: new Date().toLocaleDateString(),
        };
        dispatch({ type: "add-memory", memory: newMemoryItem });
      } finally {
        dispatch({ type: "set-busy", label: null });
      }
    },
    [dispatch]
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      dispatch({ type: "set-busy", label: "Deleting memory fact..." });
      try {
        await neurodeckApi.memory.delete(id);
      } catch (_) {}
      dispatch({ type: "delete-memory", id });
      dispatch({ type: "set-busy", label: null });
    },
    [dispatch]
  );

  const toggleMemoryPin = useCallback(
    async (id: string, pinned: boolean) => {
      dispatch({ type: "set-busy", label: pinned ? "Pinning memory..." : "Unpinning memory..." });
      try {
        await neurodeckApi.memory.pin(id, pinned);
      } catch (_) {}
      dispatch({ type: "toggle-memory-pin", id });
      dispatch({ type: "set-busy", label: null });
    },
    [dispatch]
  );

  const appActions: NeuroDeckAppActions = {
    scanProject,
    buildProjectContext,
    detectModels,
    checkAiHealth,
    runAssistant,
    runAgent,
    refreshDiagnostics,
    exportSession,
    saveSession,
    exportDiagnosticsBundle,
    resetLocalState,
    addMemoryFact,
    deleteMemory,
    toggleMemoryPin,
    refreshModelScores,
    refreshAgentPolicies,
    refreshRecoveryEvents,
    validateAgentModel,
  };

  const openSettings = useCallback((panel = "general") => {
    settingsTriggerRef.current = document.activeElement as HTMLElement;
    localStorage.setItem("settingsActivePanel", `sp-${panel}`);
    setSettingsPanel(panel);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    void checkAiHealth();
  }, [checkAiHealth]);

  useEffect(() => {
    if (!state.hydrated) return;
    requestAnimationFrame(() => shortcutSinkRef.current?.focus({ preventScroll: true }));
  }, [state.hydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      const editingField =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (metaK) {
        event.preventDefault();
        dispatch({ type: "toggle-command" });
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCtrlPromptOpen(true);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "?" && !editingField) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Tab") {
        event.preventDefault();
        if (recentViews.length > 1) setQuickSwitcherOpen(true);
        return;
      }
      if (quickSwitcherOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const items =
          quickSwitcherDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button[data-qs-item]"
          );
        if (items && items.length > 0) {
          setQuickSwitcherFocusIdx((prev) => {
            const next =
              event.key === "ArrowDown"
                ? (prev + 1) % items.length
                : (prev - 1 + items.length) % items.length;
            items[next]?.focus();
            return next;
          });
        }
        return;
      }
      if (quickSwitcherOpen && event.key === "Enter") {
        event.preventDefault();
        const items =
          quickSwitcherDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button[data-qs-item]"
          );
        const target = items?.[quickSwitcherFocusIdx];
        if (target) target.click();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void runAssistant();
        return;
      }
      if (event.key === "Escape") {
        if (state.commandOpen) {
          dispatch({ type: "toggle-command", open: false });
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (notificationsOpen) {
          setNotificationsOpen(false);
          return;
        }
        if (quickSwitcherOpen) {
          setQuickSwitcherOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (ctrlPromptOpen) {
          setCtrlPromptOpen(false);
        }
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const numberToView: Record<string, ViewId> = {
        "1": "chat",
        "2": "execution",
        "3": "agents",
        "4": "memory",
        "5": "project",
        "6": "models",
        "7": "cache",
        "8": "plugins",
        "9": "sessions",
        "0": "settings",
        d: "diagnostics",
        D: "diagnostics",
      };
      const view = numberToView[event.key];
      if (view) dispatch({ type: "set-view", view });
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    dispatch,
    runAssistant,
    recentViews,
    quickSwitcherFocusIdx,
    settingsOpen,
    notificationsOpen,
    shortcutsOpen,
    quickSwitcherOpen,
    ctrlPromptOpen,
    state.commandOpen,
  ]);

  const activeFont = useMemo(
    () => fontOptions.find((f) => f.id === state.selectedFont) ?? fontOptions[0],
    [state.selectedFont]
  );

  // Inject runtime design tokens as CSS custom properties on the app shell
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.style.setProperty("--font-body", activeFont.family);
    document.documentElement.style.setProperty("--font-body", activeFont.family);
  }, [activeFont]);

  const renderView = (id: ViewId, node: ReactNode) => (
    <div
      data-testid={`view-${id}`}
      data-controller-screen={id}
      data-controller-screen-active={state.activeView === id ? "true" : "false"}
      className="view-content active h-full min-h-0 animate-view-enter"
    >
      {node}
    </div>
  );

  if (!state.hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-nd-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-nd-accent/30 border-t-nd-accent" />
          <p className="text-sm text-nd-text-muted">Loading NEURODECK...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ControllerProvider
        activeView={state.activeView}
        settings={state.controllerSettings}
        onSettingsChange={(next) => dispatch({ type: "set-controller-settings", settings: next })}
        onOpenCommandPalette={() => dispatch({ type: "toggle-command", open: true })}
        onCloseCommandPalette={() => dispatch({ type: "toggle-command", open: false })}
        onOpenSettings={openSettings}
        onOpenHelp={() => {}}
        onNavigatePreviousView={() => {
          const index = navItems.findIndex((item) => item.id === state.activeView);
          if (index > 0) {
            dispatch({ type: "set-view", view: navItems[index - 1].id });
          }
        }}
        onNavigateNextView={() => {
          const index = navItems.findIndex((item) => item.id === state.activeView);
          if (index >= 0 && index < navItems.length - 1) {
            dispatch({ type: "set-view", view: navItems[index + 1].id });
          }
        }}
        onBack={() => {
          if (state.commandOpen) {
            dispatch({ type: "toggle-command", open: false });
            return;
          }
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          if (notificationsOpen) {
            setNotificationsOpen(false);
            return;
          }
          if (quickSwitcherOpen) {
            setQuickSwitcherOpen(false);
            return;
          }
          if (shortcutsOpen) {
            setShortcutsOpen(false);
            return;
          }
          if (ctrlPromptOpen) {
            setCtrlPromptOpen(false);
            return;
          }
          if (state.activeView === "browser") {
            (window as unknown as { __neurodeckBrowserBack?: () => void }).__neurodeckBrowserBack?.();
            return;
          }
          dispatch({ type: "set-view", view: "chat" });
        }}
        onEmergencyEscape={() => {
          setSettingsOpen(false);
          setNotificationsOpen(false);
          setShortcutsOpen(false);
          setQuickSwitcherOpen(false);
          setCtrlPromptOpen(false);
          dispatch({ type: "toggle-command", open: false });
          dispatch({ type: "set-view", view: "chat" });
        }}
        onOpenSearch={() => {
          const target = document.querySelector<HTMLElement>(
            "#command-palette-input, #browser-address-input, #user-input, input[type='search'], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='address'], textarea",
          );
          target?.focus();
          target?.scrollIntoView({ block: "nearest", inline: "nearest" });
        }}
        onReload={() => {
          if (state.activeView === "browser") {
            (window as unknown as { __neurodeckBrowserReload?: () => void }).__neurodeckBrowserReload?.();
            return;
          }
          void runAssistant();
        }}
        onSave={() => {
          if (state.activeView === "browser") {
            (window as unknown as { __neurodeckBrowserFavorite?: () => void }).__neurodeckBrowserFavorite?.();
            return;
          }
          void saveSession();
        }}
        onRegenerate={() => {
          void runAssistant();
        }}
        onNewContextAction={() => {
          if (state.activeView === "browser") {
            (window as unknown as { __neurodeckBrowserNewTab?: () => void }).__neurodeckBrowserNewTab?.();
            return;
          }
          dispatch({ type: "set-view", view: "sessions" });
        }}
        onToggleFullscreen={() => {
          void window.electronAPI
            ?.getIsKiosk?.()
            .then((isKiosk) => window.electronAPI?.setKiosk?.(!isKiosk));
        }}
      >
      {/* Skip to main content — visible on first Tab press */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-lg focus:bg-nd-accent focus:px-3 focus:py-2 focus:text-nd-bg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      <div
        id="app-shell"
        ref={shellRef}
        tabIndex={0}
        data-controller-screen="app-shell"
        data-density={state.deckMode ? "deck" : "comfortable"}
        className={`flex h-full flex-col overflow-hidden tactical-grid outline-none ${state.deckMode ? "text-[15px]" : ""}`}
        style={{ color: "var(--nd-text)" }}
      >
        <input
          ref={shortcutSinkRef}
          tabIndex={0}
          aria-label="Shortcut listener"
          className="pointer-events-none absolute left-0 top-0 h-2 w-2 opacity-0"
          onKeyDown={(event) => {
            const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
            if (metaK) {
              event.preventDefault();
              dispatch({ type: "toggle-command" });
              return;
            }
            if (
              (event.metaKey || event.ctrlKey) &&
              event.shiftKey &&
              event.key.toLowerCase() === "p"
            ) {
              event.preventDefault();
              setCtrlPromptOpen(true);
              return;
            }
            if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "?") {
              event.preventDefault();
              setShortcutsOpen(true);
              return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key === "Tab") {
              event.preventDefault();
              if (recentViews.length > 1) setQuickSwitcherOpen(true);
            }
          }}
          onKeyUp={(event) => {
            const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
            if (metaK) {
              event.preventDefault();
              dispatch({ type: "toggle-command" });
            }
          }}
        />
        {/* Fixed background layers — registry-backed theme/wallpaper host */}
        <div className="app-background-container" aria-hidden="true">
          <LiveWallpaperHost />
        </div>
        <TitleBar
          modelName={modelName}
          models={state.models}
          selectedModelId={state.selectedModelId}
          persona={state.selectedPersona}
          provider={state.selectedProvider}
          latencyMs={state.telemetry.latencyMs}
          contextUsed={state.telemetry.contextUsed}
          onSelectModel={(id) => {
            const model = state.models.find((m) => m.id === id);
            if (!model) return;
            const backendProvider = model.backendProvider ?? "ollama";
            const backendModel = model.backendModel ?? model.id;
            dispatch({ type: "set-provider", provider: backendProvider });
            dispatch({ type: "set-selected-model", id });
            void neurodeckApi.ai.setProvider(backendProvider);
            void neurodeckApi.ai.setModel(backendModel);
          }}
          onOpenCommandPalette={() => dispatch({ type: "toggle-command", open: true })}
          onOpenNotifications={() => setNotificationsOpen((current) => !current)}
          onOpenSettings={() => openSettings("general")}
        />
        {/* Busy indicator — announced to screen readers via live region */}
        <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none">
          {state.busyLabel && (
            <div className="fixed left-1/2 top-14 z-toast -translate-x-1/2 rounded-full border border-nd-accent/25 bg-nd-bg/95 px-4 py-2 shadow-2xl shadow-nd-accent/10">
              <span className="inline-flex items-center gap-2 text-2xs font-semibold text-nd-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{" "}
                {state.busyLabel}
              </span>
            </div>
          )}
        </div>
        {/* Error panel — announced as alert to screen readers */}
        {state.lastError && (
          <div
            role="alert"
            className="fixed right-4 top-16 z-toast w-[360px] rounded-3xl border border-nd-danger/30 bg-nd-bg/95 p-4 shadow-2xl shadow-nd-danger/10"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-nd-danger"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <Badge tone="danger">Action needed</Badge>
                <h3 className="mt-2 font-semibold text-nd-text">{state.lastError.title}</h3>
                <p className="mt-1 text-sm leading-6 text-nd-text-muted">
                  {state.lastError.message}
                </p>
                {state.lastError.action && (
                  <p className="mt-2 text-2xs text-nd-text-muted">{state.lastError.action}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => dispatch({ type: "set-error", error: null })}
                className="rounded-xl border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:text-nd-text"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          <PrimarySidebar
            state={state}
            dispatch={dispatch}
            onOpenSettings={() => openSettings("general")}
          />
          <main
            id="main-content"
            data-controller-zone="content"
            data-controller-default="true"
            className="min-w-0 flex-1 overflow-hidden p-3 pb-16 md:p-4"
          >
            <div className="view-container h-full min-h-0">
              {(state.activeView === "chat" || state.activeView === "workspace") &&
                renderView(
                  "chat",
                  <WorkspaceView
                    state={state}
                    dispatch={dispatch}
                    selectors={selectors}
                    actions={appActions}
                  />
                )}
              {state.activeView === "execution" &&
                renderView("execution", <ExecutionView state={state} actions={appActions} />)}
              {state.activeView === "project" &&
                renderView("project", <ProjectView state={state} actions={appActions} />)}
              {state.activeView === "models" &&
                renderView(
                  "models",
                  <ModelsView state={state} dispatch={dispatch} actions={appActions} />
                )}
              {(state.activeView === "agent" || state.activeView === "agents") &&
                renderView(
                  "agent",
                  <AgentsView state={state} dispatch={dispatch} actions={appActions} />
                )}
              {state.activeView === "memory" &&
                renderView(
                  "memory",
                  <MemoryView state={state} dispatch={dispatch} actions={appActions} />
                )}
              {state.activeView === "sessions" &&
                renderView("sessions", <SessionsView state={state} actions={appActions} />)}
              {state.activeView === "cache" && renderView("cache", <CacheView state={state} />)}
              {state.activeView === "plugins" &&
                renderView("plugins", <PluginsView state={state} dispatch={dispatch} />)}
              {state.activeView === "diagnostics" &&
                renderView("diagnostics", <DiagnosticsView state={state} actions={appActions} />)}
              {state.activeView === "canvas" && renderView("canvas", <CanvasView />)}
              {state.activeView === "terminal" && renderView("terminal", <TerminalView />)}
              {state.activeView === "ssh" && renderView("ssh", <SSHView />)}
              {state.activeView === "ide" && renderView("ide", <IDEView />)}
              {state.activeView === "git" && renderView("git", <GitView />)}
              {state.activeView === "api-lab" && renderView("api-lab", <ApiLabView />)}
              {state.activeView === "cli-maker" && renderView("cli-maker", <CliMakerView />)}
              {state.activeView === "browser" && renderView("browser", <BrowserView />)}
              {state.activeView === "tunnel" && renderView("tunnel", <TunnelView />)}
              {state.activeView === "share" && renderView("share", <ShareView />)}
              {state.activeView === "torrent" && renderView("torrent", <TorrentView />)}
              {state.activeView === "remote" && renderView("remote", <RemoteView />)}
              {state.activeView === "docs" && renderView("docs", <DocsView />)}
              {state.activeView === "prompt-lab" && renderView("prompt-lab", <PromptLabView />)}
              {state.activeView === "academy" && renderView("academy", <AcademyView />)}
              {state.activeView === "graph" && renderView("graph", <GraphView />)}
              {state.activeView === "scheduler" && renderView("scheduler", <SchedulerView />)}
              {state.activeView === "orchestrator" &&
                renderView("orchestrator", <OrchestratorView />)}
              {state.activeView === "settings" &&
                renderView(
                  "settings",
                  <SettingsView state={state} dispatch={dispatch} actions={appActions} />
                )}
              {state.activeView === "security" &&
                renderView("security", <SecurityView state={state} actions={appActions} />)}
              {state.activeView === "themes" && renderView("themes", <ThemesView />)}
              {state.activeView === "exports" &&
                renderView("exports", <ExportsView state={state} actions={appActions} />)}
              {state.activeView === "maintenance" &&
                renderView("maintenance", <MaintenanceView state={state} actions={appActions} />)}
              {state.activeView === "recovery" &&
                renderView(
                  "recovery",
                  <RecoveryView state={state} dispatch={dispatch} actions={appActions} />
                )}
              {state.activeView === "fonts" &&
                renderView("fonts", <FontManagerView state={state} dispatch={dispatch} />)}
            </div>
          </main>
          <SecondaryRail state={state} dispatch={dispatch} selectors={selectors} />
        </div>
        <StatusBar state={state} />
        {state.deckMode && state.controllerSettings.showHints && <ControllerHintBar />}
        <ControllerHelpOverlay />
        <ControllerDebugOverlay />
        <CommandPalette
          state={state}
          dispatch={dispatch}
          actions={appActions}
          onOpenSettings={openSettings}
        />

        {/* Settings overlay */}
        <div
          id="settings-overlay"
          data-controller-overlay={settingsOpen ? "true" : undefined}
          className={`settings-overlay ${settingsOpen ? "active" : ""}`}
          onMouseDown={() => setSettingsOpen(false)}
        >
          {settingsOpen && (
            <div
              ref={settingsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
              tabIndex={-1}
              className="settings-modal-card absolute inset-3 rounded-3xl border border-nd-text-muted/15 p-0 shadow-2xl shadow-nd-accent/10 outline-none"
              data-settings-theme={settingsPanel}
              data-controller-zone="dialog"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span id="settings-dialog-title" className="sr-only">
                Settings
              </span>
              <div className="h-full min-h-0">
                <SettingsView
                  key={settingsPanel}
                  state={state}
                  dispatch={dispatch}
                  actions={appActions}
                  onPanelChange={setSettingsPanel}
                  onClose={() => setSettingsOpen(false)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notifications overlay */}
        <div
          id="notif-modal"
          data-controller-overlay={notificationsOpen ? "true" : undefined}
          className={`fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm transition-opacity duration-200 ${notificationsOpen ? "active" : "pointer-events-none opacity-0"}`}
          onMouseDown={() => setNotificationsOpen(false)}
        >
          {notificationsOpen && (
            <div
              ref={notifDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-dialog-title"
              tabIndex={-1}
              className="notif-modal-card absolute right-4 top-14 w-[360px] rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 id="notif-dialog-title" className="text-sm font-semibold text-nd-text">
                  Notifications
                </h2>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="rounded-lg border border-nd-text-muted/15 px-2 py-1 text-2xs text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Close
                </button>
              </div>
              <p className="mt-3 text-sm text-nd-text-muted">No notifications.</p>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts overlay */}
        <div
          id="shortcuts-overlay"
          data-controller-overlay={shortcutsOpen ? "true" : undefined}
          className={`fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm ${shortcutsOpen ? "" : "hidden"}`}
          onMouseDown={() => setShortcutsOpen(false)}
        >
          {shortcutsOpen && (
            <div
              ref={shortcutsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-dialog-title"
              tabIndex={-1}
              className="absolute left-1/2 top-16 z-modal w-[760px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-5 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 id="shortcuts-dialog-title" className="text-sm font-semibold text-nd-text">
                  Keyboard Shortcuts
                </h2>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  aria-label="Close shortcuts"
                  className="rounded-lg p-1 text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  ["Ctrl / ⌘ + K", "Open command palette"],
                  ["Ctrl + Tab", "Quick view switcher"],
                  ["Ctrl / ⌘ + Enter", "Run assistant"],
                  ["Ctrl + Shift + P", "Controller prompt"],
                  ["?", "Show this help"],
                  ["Escape", "Close overlay"],
                  ["Ctrl + 1–9", "Jump to view (Chat → Sessions)"],
                  ["Ctrl + 0", "Open settings"],
                  ["Ctrl + D", "Diagnostics"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-xs text-nd-text-muted">{label}</span>
                    <kbd className="rounded border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 text-[10px] font-mono text-nd-accent">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controller prompt overlay */}
        {ctrlPromptOpen && (
          <div
            data-controller-overlay="true"
            className="fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm"
            onMouseDown={() => setCtrlPromptOpen(false)}
          >
            <div
              ref={ctrlPromptDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ctrlprompt-dialog-title"
              tabIndex={-1}
              className="absolute left-1/2 top-20 z-modal w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  id="ctrlprompt-dialog-title"
                  className="flex items-center gap-2 text-sm font-semibold text-nd-text"
                >
                  <Sparkles className="h-4 w-4 text-nd-accent" aria-hidden="true" />
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-nd-text-muted/15 bg-nd-surface/50">
                    <Command className="h-3.5 w-3.5 text-nd-text/90" aria-hidden="true" />
                  </span>
                  Controller Prompt
                </div>
                <button
                  type="button"
                  onClick={() => setCtrlPromptOpen(false)}
                  aria-label="Close controller prompt"
                  className="rounded-lg p-1 text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-nd-text-muted">
                Press B to close, R4 to accept suggestions, R5 hold to execute, and L5 to save or
                record PromptDrive macros.
              </p>
            </div>
          </div>
        )}

        {/* Quick switcher overlay */}
        <div
          id="quick-switcher-overlay"
          data-controller-overlay={quickSwitcherOpen ? "true" : undefined}
          className={`fixed inset-0 z-40 bg-nd-bg/55 backdrop-blur-sm transition-opacity duration-150 ${quickSwitcherOpen ? "active" : "pointer-events-none opacity-0"}`}
          onMouseDown={() => setQuickSwitcherOpen(false)}
        >
          {quickSwitcherOpen && (
            <div
              ref={quickSwitcherDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="qs-dialog-title"
              tabIndex={-1}
              className="absolute left-1/2 top-20 z-modal w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2 id="qs-dialog-title" className="text-sm font-semibold text-nd-text">
                Quick Switcher
              </h2>
              <div role="listbox" aria-label="Recent views" className="mt-3 space-y-1">
                {recentViews.slice(1).map((view, index) => (
                  <button
                    key={view}
                    type="button"
                    role="option"
                    aria-selected={index === quickSwitcherFocusIdx}
                    data-qs-item
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${index === quickSwitcherFocusIdx ? "border-nd-accent/35 bg-nd-accent/10 text-nd-accent" : "border-nd-text-muted/15 bg-nd-surface/40 text-nd-text/80 hover:bg-nd-surface/60"}`}
                    onClick={() => {
                      dispatch({ type: "set-view", view });
                      setQuickSwitcherOpen(false);
                    }}
                  >
                    <span className="capitalize">{view.replace(/-/g, " ")}</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-nd-text-muted">
                      {index === 0 ? "previous" : "recent"}
                    </span>
                  </button>
                ))}
                {!recentViews.slice(1).length && (
                  <p className="py-2 text-sm text-nd-text-muted">
                    Visit two or more views to use quick switcher.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {state.showOnboarding && <OnboardingModal state={state} dispatch={dispatch} />}
      </div>
      </ControllerProvider>
    </ToastProvider>
  );
}
