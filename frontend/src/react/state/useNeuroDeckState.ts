import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { agents, cacheEntries, initialMessages, memories, models, plugins, promptTemplates, sessions, STORE_KEY } from '../types/seed';
import { neurodeckApi } from '../services/bridgeAdapter';
import type { AgentStatus, LocalModel, NeuroDeckAction, NeuroDeckState } from '../types/neurodeck';

const initialState: NeuroDeckState = {
  hydrated: false,
  activeView: 'chat',
  commandOpen: false,
  deckMode: false,
  selectedTheme: 'Blacksite',
  selectedPersona: 'Developer',
  selectedProvider: 'offline-draft',
  selectedModelId: 'neurodraft-local',
  selectedFont: 'inter',
  composerValue: '',
  busyLabel: null,
  activeProject: null,
  projectContext: null,
  modelDetection: null,
  aiHealth: [],
  diagnostics: null,
  diagnosticLogs: [],
  lastExportPath: null,
  lastError: null,
  agents,
  models,
  memories,
  sessions,
  cacheEntries,
  plugins,
  messages: initialMessages,
  aiRuns: [],
  promptTemplates,
  telemetry: {
    latencyMs: 42,
    contextUsed: 14,
    memoryPressure: 38,
    cacheHealth: 94,
    activeAgents: 1
  }
};

function nextStatus(current: AgentStatus): AgentStatus {
  if (current === 'idle') return 'thinking';
  if (current === 'thinking') return 'complete';
  if (current === 'complete') return 'idle';
  return 'idle';
}

function mergeUniqueModels(current: LocalModel[], incoming: LocalModel[]): LocalModel[] {
  const byId = new Map(current.map((model) => [model.id, model]));
  for (const model of incoming) byId.set(model.id, model);
  return Array.from(byId.values());
}

function sanitizeHydrate(payload: Partial<NeuroDeckState> | null): Partial<NeuroDeckState> {
  if (!payload || typeof payload !== 'object') return {};
  const {
    hydrated: _hydrated,
    commandOpen: _commandOpen,
    busyLabel: _busyLabel,
    diagnostics: _diagnostics,
    diagnosticLogs: _diagnosticLogs,
    lastError: _lastError,
    ...persistable
  } = payload;
  return persistable;
}

function reducer(state: NeuroDeckState, action: NeuroDeckAction): NeuroDeckState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...sanitizeHydrate(action.payload),
        hydrated: true,
        commandOpen: false,
        busyLabel: null,
        lastError: null
      };
    case 'set-view':
      return { ...state, activeView: action.view, commandOpen: false };
    case 'toggle-command':
      return { ...state, commandOpen: action.open ?? !state.commandOpen };
    case 'toggle-deck-mode':
      return { ...state, deckMode: !state.deckMode };
    case 'set-theme':
      return { ...state, selectedTheme: action.theme };
    case 'set-persona':
      return { ...state, selectedPersona: action.persona };
    case 'set-provider':
      return { ...state, selectedProvider: action.provider };
    case 'set-selected-model':
      return { ...state, selectedModelId: action.id };
    case 'set-font':
      return { ...state, selectedFont: action.font };
    case 'set-composer':
      return { ...state, composerValue: action.value };
    case 'run-starter':
      return { ...state, composerValue: action.prompt, activeView: 'chat', commandOpen: false };
    case 'toggle-agent':
      return {
        ...state,
        agents: state.agents.map((agent) => agent.id === action.id ? { ...agent, status: nextStatus(agent.status), lastAction: 'Status toggled locally' } : agent)
      };
    case 'set-agent-status':
      return {
        ...state,
        agents: state.agents.map((agent) => agent.id === action.id ? {
          ...agent,
          status: action.status,
          lastAction: action.lastAction ?? agent.lastAction,
          task: action.task ?? agent.task
        } : agent)
      };
    case 'set-model-status':
      return {
        ...state,
        models: state.models.map((model) => model.id === action.id ? { ...model, status: action.status } : model)
      };
    case 'toggle-memory-pin':
      return {
        ...state,
        memories: state.memories.map((memory) => memory.id === action.id ? { ...memory, pinned: !memory.pinned } : memory)
      };
    case 'toggle-plugin':
      return {
        ...state,
        plugins: state.plugins.map((plugin) => plugin.id === action.id ? { ...plugin, status: plugin.status === 'enabled' ? 'disabled' : 'enabled' } : plugin)
      };
    case 'set-project-scan':
      return { ...state, activeProject: action.project, projectContext: null, activeView: action.project ? 'project' : state.activeView, lastError: null };
    case 'set-project-context':
      return {
        ...state,
        projectContext: action.context,
        telemetry: { ...state.telemetry, contextUsed: action.context ? Math.min(92, Math.max(12, Math.round(action.context.tokenBudget / 180))) : state.telemetry.contextUsed },
        lastError: null
      };
    case 'set-model-detection':
      return { ...state, modelDetection: action.detection, activeView: action.detection ? 'models' : state.activeView, lastError: null };
    case 'merge-detected-models':
      return { ...state, models: mergeUniqueModels(state.models, action.models) };
    case 'set-ai-health':
      return { ...state, aiHealth: action.health };
    case 'append-message':
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-80),
        composerValue: action.message.role === 'user' ? '' : state.composerValue,
        telemetry: { ...state.telemetry, latencyMs: action.message.latencyMs ?? state.telemetry.latencyMs }
      };
    case 'add-ai-run':
      return { ...state, aiRuns: [action.run, ...state.aiRuns].slice(0, 60), activeView: action.run.status === 'complete' ? state.activeView : 'execution' };
    case 'set-diagnostics':
      return { ...state, diagnostics: action.diagnostics, diagnosticLogs: action.logs, activeView: 'diagnostics' };
    case 'set-busy':
      return { ...state, busyLabel: action.label };
    case 'set-error':
      return { ...state, lastError: action.error, busyLabel: null };
    case 'set-export-path':
      return { ...state, lastExportPath: action.path, lastError: null };
    case 'reset-local-state':
      return { ...initialState, hydrated: true };
    default:
      return state;
  }
}

export function useNeuroDeckState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const stored = await neurodeckApi.store.get<Partial<NeuroDeckState>>(STORE_KEY);
      if (mounted) dispatch({ type: 'hydrate', payload: stored });
    }
    hydrate().catch(() => dispatch({ type: 'hydrate', payload: null }));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const { commandOpen, hydrated, busyLabel, diagnostics, diagnosticLogs, lastError, ...persistable } = state;
    const handle = window.setTimeout(() => {
      neurodeckApi.store.set(STORE_KEY, {
        ...persistable,
        lastSavedAt: new Date().toISOString()
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [state]);

  const resetLocalState = useCallback(async () => {
    await neurodeckApi.store.reset(STORE_KEY);
    dispatch({ type: 'reset-local-state' });
  }, []);

  const selectors = useMemo(() => ({
    activeAgents: state.agents.filter((agent) => agent.status === 'thinking').length,
    readyModels: state.models.filter((model) => model.status === 'ready' || model.status === 'indexed').length,
    pinnedMemories: state.memories.filter((memory) => memory.pinned).length,
    enabledPlugins: state.plugins.filter((plugin) => plugin.status === 'enabled').length,
    riskCount: state.activeProject?.risks.length ?? 0,
    messageCount: state.messages.length,
    completedRuns: state.aiRuns.filter((run) => run.status === 'complete').length
  }), [state.activeProject?.risks.length, state.agents, state.aiRuns, state.memories, state.messages.length, state.models, state.plugins]);

  return { state, dispatch, resetLocalState, selectors };
}
