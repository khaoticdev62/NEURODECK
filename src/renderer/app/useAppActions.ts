import { useCallback } from "react";
import { neurodeckApi } from "../services/bridgeAdapter";
import type {
  AIMessage,
  ExportSessionPayload,
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckState,
  SavedSessionPayload,
} from "../types/neurodeck";
import type { NeuroDeckSelectors } from "../state/useNeuroDeckSelectors";

function makeUserMessage(content: string): AIMessage {
  return { id: `user-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
}

export type UseAppActionsDeps = {
  state: NeuroDeckState;
  dispatch: React.Dispatch<NeuroDeckAction>;
  selectors: NeuroDeckSelectors;
  modelName: string;
  selectedBackendModel: string;
  activeTheme: { name: string };
  resetLocalState: () => Promise<void>;
};

export function useAppActions({
  state,
  dispatch,
  selectors,
  modelName,
  selectedBackendModel,
  activeTheme,
  resetLocalState,
}: UseAppActionsDeps): NeuroDeckAppActions {
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

  return {
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
}
