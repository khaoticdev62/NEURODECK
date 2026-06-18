import type { NeuroDeckAction, NeuroDeckState } from "../types/neurodeck";
import { initialState, mergeUniqueModels, nextStatus, sanitizeHydrate } from "./stateUtils";

export function neurodeckReducer(
  state: NeuroDeckState,
  action: NeuroDeckAction
): NeuroDeckState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        ...sanitizeHydrate(action.payload),
        hydrated: true,
        commandOpen: false,
        busyLabel: null,
        lastError: null,
      };
    case "set-view":
      return { ...state, activeView: action.view, commandOpen: false };
    case "toggle-command":
      return { ...state, commandOpen: action.open ?? !state.commandOpen };
    case "toggle-deck-mode":
      return { ...state, deckMode: !state.deckMode };
    case "set-controller-settings":
      return {
        ...state,
        controllerSettings: {
          ...state.controllerSettings,
          ...action.settings,
        },
      };
    case "set-theme":
      return { ...state, selectedTheme: action.theme };
    case "set-persona":
      return { ...state, selectedPersona: action.persona };
    case "set-tool-status":
      return { ...state, toolStatus: action.status };
    case "set-status-bar":
      return { ...state, statusBar: action.state };
    case "set-provider":
      return { ...state, selectedProvider: action.provider };
    case "set-selected-model":
      return { ...state, selectedModelId: action.id };
    case "set-font":
      return { ...state, selectedFont: action.font };
    case "toggle-onboarding":
      return {
        ...state,
        showOnboarding: !state.showOnboarding,
        onboardingMode: state.showOnboarding ? state.onboardingMode : "setup",
      };
    case "open-onboarding":
      return {
        ...state,
        showOnboarding: true,
        onboardingMode: action.mode ?? "tour",
        commandOpen: false,
      };
    case "close-onboarding":
      return { ...state, showOnboarding: false };
    case "set-composer":
      return { ...state, composerValue: action.value };
    case "run-starter":
      return { ...state, composerValue: action.prompt, activeView: "chat", commandOpen: false };
    case "toggle-agent":
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.id
            ? { ...agent, status: nextStatus(agent.status), lastAction: "Status toggled locally" }
            : agent
        ),
      };
    case "set-agent-status":
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.id
            ? {
                ...agent,
                status: action.status,
                lastAction: action.lastAction ?? agent.lastAction,
                task: action.task ?? agent.task,
              }
            : agent
        ),
      };
    case "set-model-status":
      return {
        ...state,
        models: state.models.map((model) =>
          model.id === action.id ? { ...model, status: action.status } : model
        ),
      };
    case "toggle-memory-pin":
      return {
        ...state,
        memories: state.memories.map((memory) =>
          memory.id === action.id ? { ...memory, pinned: !memory.pinned } : memory
        ),
      };
    case "set-memories":
      return { ...state, memories: action.memories };
    case "add-memory":
      return { ...state, memories: [...state.memories, action.memory] };
    case "delete-memory":
      return { ...state, memories: state.memories.filter((memory) => memory.id !== action.id) };
    case "set-sessions":
      return { ...state, sessions: action.sessions };
    case "set-agents":
      return { ...state, agents: action.agents };
    case "set-plugins":
      return { ...state, plugins: action.plugins };
    case "toggle-plugin":
      return {
        ...state,
        plugins: state.plugins.map((plugin) =>
          plugin.id === action.id
            ? { ...plugin, status: plugin.status === "enabled" ? "disabled" : "enabled" }
            : plugin
        ),
      };
    case "set-project-scan":
      return {
        ...state,
        activeProject: action.project,
        projectContext: null,
        activeView: action.project ? "project" : state.activeView,
        lastError: null,
      };
    case "set-project-context":
      return {
        ...state,
        projectContext: action.context,
        telemetry: {
          ...state.telemetry,
          contextUsed: action.context
            ? Math.min(92, Math.max(12, Math.round(action.context.tokenBudget / 180)))
            : state.telemetry.contextUsed,
        },
        lastError: null,
      };
    case "set-model-detection":
      return {
        ...state,
        modelDetection: action.detection,
        activeView: action.detection ? "models" : state.activeView,
        lastError: null,
      };
    case "merge-detected-models":
      return { ...state, models: mergeUniqueModels(state.models, action.models) };
    case "set-ai-health":
      return { ...state, aiHealth: action.health };
    case "append-message":
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-80),
        composerValue: action.message.role === "user" ? "" : state.composerValue,
        telemetry: {
          ...state.telemetry,
          latencyMs: action.message.latencyMs ?? state.telemetry.latencyMs,
        },
      };
    case "update-message":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, content: m.content + action.content } : m
        ),
      };
    case "add-ai-run":
      return {
        ...state,
        aiRuns: [action.run, ...state.aiRuns].slice(0, 60),
        activeView: action.run.status === "complete" ? state.activeView : "execution",
      };
    case "set-diagnostics":
      return {
        ...state,
        diagnostics: action.diagnostics,
        diagnosticLogs: action.logs,
        activeView: "diagnostics",
      };
    case "set-busy":
      return { ...state, busyLabel: action.label };
    case "set-error":
      return { ...state, lastError: action.error, busyLabel: null };
    case "set-export-path":
      return { ...state, lastExportPath: action.path, lastError: null };
    case "set-active-agent":
      return { ...state, activeAgentId: action.id };
    case "set-model-scores":
      return { ...state, modelScores: action.scores };
    case "set-agent-policies":
      return { ...state, agentPolicies: action.policies };
    case "set-recovery-events":
      return { ...state, recoveryEvents: action.events };
    case "reset-local-state":
      return { ...initialState, hydrated: true };
    default:
      return state;
  }
}
