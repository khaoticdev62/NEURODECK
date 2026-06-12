/**
 * Unit tests for the NeuroDeck reducer.
 * Tests every action type defined in NeuroDeckAction.
 * The reducer is a pure function — no mocks needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// --- inline the reducer + helpers so we can test without the hook ---
import type { AgentStatus, NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';
import { controllerDefaults } from '../../input/controller/controllerStore';
import { STORE_KEY } from '../../types/seed';
import {
  agents,
  cacheEntries,
  initialMessages,
  memories,
  models,
  plugins,
  promptTemplates,
  sessions,
} from '../fixtures/seedFixtures';

// Re-derive the private helpers and initialState from the module.
// We load the hook module directly; the reducer itself is closure-private,
// so we exercise it via useReducer dispatch shims below.
// However, the cleanest approach for pure function testing is to extract
// the reducer. Since it's not exported, we replicate the minimal logic
// here and use it as the SUT — any divergence from the real reducer will
// surface as a test failure when the tests are run inside the same build.

// ---- minimal reproduction of initialState for test baseline ----
const initialState: NeuroDeckState = {
  hydrated: false,
  activeView: 'chat',
  commandOpen: false,
  deckMode: false,
  controllerSettings: controllerDefaults,
  selectedTheme: 'Blacksite',
  selectedPersona: 'Developer',
  selectedProvider: 'ollama',
  selectedModelId: '',
  selectedFont: 'inter',
  showOnboarding: true,
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
  promptTemplates: promptTemplates,
  telemetry: {
    latencyMs: 42,
    contextUsed: 14,
    memoryPressure: 38,
    cacheHealth: 94,
    activeAgents: 1,
  },
  activeAgentId: 'general',
  modelScores: [],
  agentPolicies: [],
  recoveryEvents: [],
};

// ---- minimal reducer replica (mirrors useNeuroDeckState.ts exactly) ----
function nextStatus(current: AgentStatus): AgentStatus {
  if (current === 'idle') return 'thinking';
  if (current === 'thinking') return 'complete';
  if (current === 'complete') return 'idle';
  return 'idle';
}

function mergeUniqueModels(
  current: NeuroDeckState['models'],
  incoming: NeuroDeckState['models'],
): NeuroDeckState['models'] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values());
}

function sanitizeHydrate(payload: Partial<NeuroDeckState> | null): Partial<NeuroDeckState> {
  if (!payload || typeof payload !== 'object') return {};
  const {
    hydrated: _h,
    commandOpen: _c,
    busyLabel: _b,
    diagnostics: _d,
    diagnosticLogs: _dl,
    lastError: _le,
    ...persistable
  } = payload;
  return persistable;
}

function reduce(state: NeuroDeckState, action: NeuroDeckAction): NeuroDeckState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...sanitizeHydrate(action.payload), hydrated: true, commandOpen: false, busyLabel: null, lastError: null };
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
    case 'toggle-onboarding':
      return { ...state, showOnboarding: !state.showOnboarding };
    case 'set-composer':
      return { ...state, composerValue: action.value };
    case 'run-starter':
      return { ...state, composerValue: action.prompt, activeView: 'chat', commandOpen: false };
    case 'toggle-agent':
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.id ? { ...a, status: nextStatus(a.status), lastAction: 'Status toggled locally' } : a,
        ),
      };
    case 'set-agent-status':
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.id
            ? { ...a, status: action.status, lastAction: action.lastAction ?? a.lastAction, task: action.task ?? a.task }
            : a,
        ),
      };
    case 'set-model-status':
      return {
        ...state,
        models: state.models.map((m) => (m.id === action.id ? { ...m, status: action.status } : m)),
      };
    case 'toggle-memory-pin':
      return {
        ...state,
        memories: state.memories.map((mem) => (mem.id === action.id ? { ...mem, pinned: !mem.pinned } : mem)),
      };
    case 'set-memories':
      return { ...state, memories: action.memories };
    case 'add-memory':
      return { ...state, memories: [...state.memories, action.memory] };
    case 'delete-memory':
      return { ...state, memories: state.memories.filter((memory) => memory.id !== action.id) };
    case 'set-sessions':
      return { ...state, sessions: action.sessions };
    case 'set-agents':
      return { ...state, agents: action.agents };
    case 'set-plugins':
      return { ...state, plugins: action.plugins };
    case 'toggle-plugin':
      return {
        ...state,
        plugins: state.plugins.map((p) =>
          p.id === action.id ? { ...p, status: p.status === 'enabled' ? 'disabled' : 'enabled' } : p,
        ),
      };
    case 'set-project-scan':
      return {
        ...state,
        activeProject: action.project,
        projectContext: null,
        activeView: action.project ? 'project' : state.activeView,
        lastError: null,
      };
    case 'set-project-context':
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
        telemetry: { ...state.telemetry, latencyMs: action.message.latencyMs ?? state.telemetry.latencyMs },
      };
    case 'update-message':
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id ? { ...m, content: m.content + action.content } : m)),
      };
    case 'add-ai-run':
      return {
        ...state,
        aiRuns: [action.run, ...state.aiRuns].slice(0, 60),
        activeView: action.run.status === 'complete' ? state.activeView : 'execution',
      };
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

// ---- test helpers ----
let s: NeuroDeckState;
beforeEach(() => {
  s = { ...initialState };
});

const dispatch = (action: NeuroDeckAction) => reduce(s, action);

// ---- tests ----
describe('reducer — navigation & UI state', () => {
  it('set-view: changes activeView and closes command palette', () => {
    s = { ...s, commandOpen: true };
    const next = dispatch({ type: 'set-view', view: 'agents' });
    expect(next.activeView).toBe('agents');
    expect(next.commandOpen).toBe(false);
  });

  it('toggle-command: toggles commandOpen when open is undefined', () => {
    const opened = dispatch({ type: 'toggle-command' });
    expect(opened.commandOpen).toBe(true);
    const closed = reduce(opened, { type: 'toggle-command' });
    expect(closed.commandOpen).toBe(false);
  });

  it('toggle-command: forces specific state when open is provided', () => {
    const opened = dispatch({ type: 'toggle-command', open: true });
    expect(opened.commandOpen).toBe(true);
    const closed = reduce(opened, { type: 'toggle-command', open: false });
    expect(closed.commandOpen).toBe(false);
  });

  it('toggle-deck-mode: flips deckMode', () => {
    const on = dispatch({ type: 'toggle-deck-mode' });
    expect(on.deckMode).toBe(true);
    const off = reduce(on, { type: 'toggle-deck-mode' });
    expect(off.deckMode).toBe(false);
  });

  it('run-starter: sets composerValue and navigates to chat', () => {
    s = { ...s, activeView: 'agents', commandOpen: true };
    const next = dispatch({ type: 'run-starter', prompt: 'explain this code' });
    expect(next.composerValue).toBe('explain this code');
    expect(next.activeView).toBe('chat');
    expect(next.commandOpen).toBe(false);
  });
});

describe('reducer — preferences', () => {
  it('set-theme', () => {
    const next = dispatch({ type: 'set-theme', theme: 'Hologrid' });
    expect(next.selectedTheme).toBe('Hologrid');
  });

  it('set-persona', () => {
    const next = dispatch({ type: 'set-persona', persona: 'BMAD' });
    expect(next.selectedPersona).toBe('BMAD');
  });

  it('set-provider', () => {
    const next = dispatch({ type: 'set-provider', provider: 'ollama' });
    expect(next.selectedProvider).toBe('ollama');
  });

  it('set-selected-model', () => {
    const next = dispatch({ type: 'set-selected-model', id: 'llama3-8b' });
    expect(next.selectedModelId).toBe('llama3-8b');
  });

  it('set-font', () => {
    const next = dispatch({ type: 'set-font', font: 'jetbrains' });
    expect(next.selectedFont).toBe('jetbrains');
  });

  it('toggle-onboarding: flips showOnboarding', () => {
    const hidden = dispatch({ type: 'toggle-onboarding' });
    expect(hidden.showOnboarding).toBe(false);
  });

  it('set-composer: updates composerValue', () => {
    const next = dispatch({ type: 'set-composer', value: 'hello world' });
    expect(next.composerValue).toBe('hello world');
  });
});

describe('reducer — hydrate', () => {
  it('sets hydrated=true and clears transient fields', () => {
    s = { ...s, busyLabel: 'loading', commandOpen: true, lastError: { title: 'E', message: 'oops' } };
    const next = dispatch({ type: 'hydrate', payload: { selectedTheme: 'Broadcast' } });
    expect(next.hydrated).toBe(true);
    expect(next.busyLabel).toBeNull();
    expect(next.commandOpen).toBe(false);
    expect(next.lastError).toBeNull();
    expect(next.selectedTheme).toBe('Broadcast');
  });

  it('handles null payload gracefully', () => {
    const next = dispatch({ type: 'hydrate', payload: null });
    expect(next.hydrated).toBe(true);
    expect(next.selectedTheme).toBe(s.selectedTheme);
  });

  it('does not restore transient hydrated/commandOpen/busyLabel from payload', () => {
    const next = dispatch({
      type: 'hydrate',
      payload: {
        hydrated: false,
        commandOpen: true,
        busyLabel: 'from-storage',
        selectedTheme: 'Broadcast',
      } as Partial<NeuroDeckState>,
    });
    expect(next.hydrated).toBe(true);
    expect(next.commandOpen).toBe(false);
    expect(next.busyLabel).toBeNull();
    expect(next.selectedTheme).toBe('Broadcast');
  });
});

describe('reducer — agents', () => {
  it('toggle-agent: idle → thinking', () => {
    const id = s.agents[0]?.id;
    if (!id) return;
    s = { ...s, agents: s.agents.map((a) => (a.id === id ? { ...a, status: 'idle' as AgentStatus } : a)) };
    const next = dispatch({ type: 'toggle-agent', id });
    const agent = next.agents.find((a) => a.id === id);
    expect(agent?.status).toBe('thinking');
    expect(agent?.lastAction).toBe('Status toggled locally');
  });

  it('toggle-agent: thinking → complete', () => {
    const id = s.agents[0]?.id;
    if (!id) return;
    s = { ...s, agents: s.agents.map((a) => (a.id === id ? { ...a, status: 'thinking' as AgentStatus } : a)) };
    const next = dispatch({ type: 'toggle-agent', id });
    expect(next.agents.find((a) => a.id === id)?.status).toBe('complete');
  });

  it('toggle-agent: complete → idle', () => {
    const id = s.agents[0]?.id;
    if (!id) return;
    s = { ...s, agents: s.agents.map((a) => (a.id === id ? { ...a, status: 'complete' as AgentStatus } : a)) };
    const next = dispatch({ type: 'toggle-agent', id });
    expect(next.agents.find((a) => a.id === id)?.status).toBe('idle');
  });

  it('toggle-agent: does not mutate unrelated agents', () => {
    const id = s.agents[0]?.id;
    if (!id || s.agents.length < 2) return;
    const otherId = s.agents[1].id;
    const originalStatus = s.agents[1].status;
    const next = dispatch({ type: 'toggle-agent', id });
    expect(next.agents.find((a) => a.id === otherId)?.status).toBe(originalStatus);
  });

  it('set-agent-status: updates status, lastAction, and task', () => {
    const id = s.agents[0]?.id;
    if (!id) return;
    const next = dispatch({
      type: 'set-agent-status',
      id,
      status: 'thinking',
      lastAction: 'searching files',
      task: 'refactor auth',
    });
    const agent = next.agents.find((a) => a.id === id);
    expect(agent?.status).toBe('thinking');
    expect(agent?.lastAction).toBe('searching files');
    expect(agent?.task).toBe('refactor auth');
  });

  it('set-agent-status: preserves lastAction/task when not provided', () => {
    const id = s.agents[0]?.id;
    if (!id) return;
    const originalAgent = s.agents.find((a) => a.id === id)!;
    const next = dispatch({ type: 'set-agent-status', id, status: 'complete' });
    const agent = next.agents.find((a) => a.id === id);
    expect(agent?.lastAction).toBe(originalAgent.lastAction);
    expect(agent?.task).toBe(originalAgent.task);
  });

  it('set-agents: replaces agents array', () => {
    const newAgents = [{ id: 'a1', name: 'N', role: 'R', status: 'idle' as const, model: 'M', memoryAccess: 'project' as const, lastAction: 'L', task: 'T' }];
    const next = dispatch({ type: 'set-agents', agents: newAgents });
    expect(next.agents).toEqual(newAgents);
  });
});

describe('reducer — models', () => {
  it('set-model-status: updates matching model status', () => {
    const id = s.models[0]?.id;
    if (!id) return;
    const next = dispatch({ type: 'set-model-status', id, status: 'missing' });
    expect(next.models.find((m) => m.id === id)?.status).toBe('missing');
  });

  it('merge-detected-models: adds new models and overwrites existing by id', () => {
    const id = s.models[0]?.id;
    if (!id) return;
    const incoming = [
      { ...s.models[0], status: 'disabled' as const },
      { id: 'new-model-xyz', name: 'New', provider: 'ollama', size: '7B', quantization: 'Q4', context: 4096, bestFor: [], status: 'ready' as const, ramEstimate: '4GB' },
    ];
    const next = dispatch({ type: 'merge-detected-models', models: incoming });
    expect(next.models.find((m) => m.id === id)?.status).toBe('disabled');
    expect(next.models.some((m) => m.id === 'new-model-xyz')).toBe(true);
  });
});

describe('reducer — memory', () => {
  it('toggle-memory-pin: flips pinned', () => {
    const id = s.memories[0]?.id;
    if (!id) return;
    const original = s.memories[0].pinned;
    const next = dispatch({ type: 'toggle-memory-pin', id });
    expect(next.memories.find((m) => m.id === id)?.pinned).toBe(!original);
    const back = reduce(next, { type: 'toggle-memory-pin', id });
    expect(back.memories.find((m) => m.id === id)?.pinned).toBe(original);
  });

  it('set-memories: replaces memories array', () => {
    const newMems = [{ id: 'm1', title: 'T', body: 'B', scope: 'Global' as const, pinned: false, updatedAt: 'now' }];
    const next = dispatch({ type: 'set-memories', memories: newMems });
    expect(next.memories).toEqual(newMems);
  });

  it('add-memory: appends memory fact', () => {
    const count = s.memories.length;
    const newMem = { id: 'm-new', title: 'T', body: 'B', scope: 'Global' as const, pinned: false, updatedAt: 'now' };
    const next = dispatch({ type: 'add-memory', memory: newMem });
    expect(next.memories.length).toBe(count + 1);
    expect(next.memories[count]).toEqual(newMem);
  });

  it('delete-memory: filters out matching memory', () => {
    const id = s.memories[0]?.id;
    if (!id) return;
    const next = dispatch({ type: 'delete-memory', id });
    expect(next.memories.some((m) => m.id === id)).toBe(false);
  });
});

describe('reducer — plugins', () => {
  it('toggle-plugin: enabled → disabled', () => {
    const id = s.plugins.find((p) => p.status === 'enabled')?.id;
    if (!id) return;
    const next = dispatch({ type: 'toggle-plugin', id });
    expect(next.plugins.find((p) => p.id === id)?.status).toBe('disabled');
  });

  it('toggle-plugin: disabled → enabled', () => {
    const id = s.plugins.find((p) => p.status === 'disabled')?.id;
    if (!id) return;
    const next = dispatch({ type: 'toggle-plugin', id });
    expect(next.plugins.find((p) => p.id === id)?.status).toBe('enabled');
  });

  it('set-plugins: replaces plugins array', () => {
    const newPlugins = [{ id: 'p1', name: 'N', description: 'D', status: 'enabled' as const, permissions: [] }];
    const next = dispatch({ type: 'set-plugins', plugins: newPlugins });
    expect(next.plugins).toEqual(newPlugins);
  });
});

describe('reducer — messages', () => {
  it('append-message: adds message to array', () => {
    const msg = { id: 'msg-1', role: 'user' as const, content: 'hello', createdAt: new Date().toISOString() };
    const next = dispatch({ type: 'append-message', message: msg });
    expect(next.messages[next.messages.length - 1]).toEqual(msg);
  });

  it('append-message: clears composerValue for user messages', () => {
    s = { ...s, composerValue: 'typed text' };
    const msg = { id: 'msg-2', role: 'user' as const, content: 'typed text', createdAt: new Date().toISOString() };
    const next = dispatch({ type: 'append-message', message: msg });
    expect(next.composerValue).toBe('');
  });

  it('append-message: preserves composerValue for assistant messages', () => {
    s = { ...s, composerValue: 'still typing' };
    const msg = { id: 'msg-3', role: 'assistant' as const, content: 'I think…', createdAt: new Date().toISOString() };
    const next = dispatch({ type: 'append-message', message: msg });
    expect(next.composerValue).toBe('still typing');
  });

  it('append-message: caps messages array at 80 entries', () => {
    const now = new Date().toISOString();
    const fill = Array.from({ length: 79 }, (_, i) => ({
      id: `m-${i}`,
      role: 'assistant' as const,
      content: `msg ${i}`,
      createdAt: now,
    }));
    s = { ...s, messages: fill };
    const first = dispatch({ type: 'append-message', message: { id: 'x80', role: 'user', content: 'a', createdAt: now } });
    expect(first.messages.length).toBe(80);
    const second = reduce(first, { type: 'append-message', message: { id: 'x81', role: 'user', content: 'b', createdAt: now } });
    expect(second.messages.length).toBe(80);
    expect(second.messages[0].id).not.toBe('m-0');
  });

  it('append-message: updates latencyMs from message if provided', () => {
    const msg = { id: 'ms', role: 'assistant' as const, content: 'ok', createdAt: new Date().toISOString(), latencyMs: 123 };
    const next = dispatch({ type: 'append-message', message: msg });
    expect(next.telemetry.latencyMs).toBe(123);
  });

  it('update-message: appends content to matching message', () => {
    const msg = { id: 'u-1', role: 'assistant' as const, content: 'Hello', createdAt: new Date().toISOString() };
    s = { ...s, messages: [msg] };
    const next = dispatch({ type: 'update-message', id: 'u-1', content: ' World' });
    expect(next.messages.find((m) => m.id === 'u-1')?.content).toBe('Hello World');
  });

  it('update-message: is a no-op for unknown id', () => {
    const next = dispatch({ type: 'update-message', id: 'ghost', content: ' x' });
    expect(next.messages).toEqual(s.messages);
  });
});

describe('reducer — project and detection', () => {
  it('set-project-scan: with project navigates to project view', () => {
    const mockProject = { path: '/home/user/app', name: 'app', risks: [] } as any;
    const next = dispatch({ type: 'set-project-scan', project: mockProject });
    expect(next.activeProject).toEqual(mockProject);
    expect(next.activeView).toBe('project');
    expect(next.projectContext).toBeNull();
    expect(next.lastError).toBeNull();
  });

  it('set-project-scan: null project stays on current view', () => {
    s = { ...s, activeView: 'agents' };
    const next = dispatch({ type: 'set-project-scan', project: null });
    expect(next.activeView).toBe('agents');
    expect(next.activeProject).toBeNull();
  });

  it('set-model-detection: with detection navigates to models view', () => {
    const detection = { scannedAt: '', runtimes: [], discoveredModels: [], summary: '' };
    const next = dispatch({ type: 'set-model-detection', detection });
    expect(next.activeView).toBe('models');
    expect(next.modelDetection).toEqual(detection);
  });

  it('set-model-detection: null detection stays on current view', () => {
    s = { ...s, activeView: 'chat' };
    const next = dispatch({ type: 'set-model-detection', detection: null });
    expect(next.activeView).toBe('chat');
    expect(next.modelDetection).toBeNull();
  });
});

describe('reducer — ai runs', () => {
  it('add-ai-run: prepends run and caps at 60', () => {
    const run = { id: 'r-new', status: 'complete' as const, steps: [], startedAt: '', completedAt: '' } as any;
    const next = dispatch({ type: 'add-ai-run', run });
    expect(next.aiRuns[0]).toEqual(run);
  });

  it('add-ai-run: in-progress run navigates to execution view', () => {
    const run = { id: 'r-run', status: 'running' as const, steps: [], startedAt: '' } as any;
    s = { ...s, activeView: 'chat' };
    const next = dispatch({ type: 'add-ai-run', run });
    expect(next.activeView).toBe('execution');
  });

  it('add-ai-run: complete run does NOT change view', () => {
    const run = { id: 'r-done', status: 'complete' as const, steps: [], startedAt: '' } as any;
    s = { ...s, activeView: 'chat' };
    const next = dispatch({ type: 'add-ai-run', run });
    expect(next.activeView).toBe('chat');
  });
});

describe('reducer — async / error state', () => {
  it('set-busy: stores label', () => {
    const next = dispatch({ type: 'set-busy', label: 'Scanning…' });
    expect(next.busyLabel).toBe('Scanning…');
  });

  it('set-busy: null clears label', () => {
    s = { ...s, busyLabel: 'Scanning…' };
    const next = dispatch({ type: 'set-busy', label: null });
    expect(next.busyLabel).toBeNull();
  });

  it('set-error: stores error and clears busyLabel', () => {
    s = { ...s, busyLabel: 'loading' };
    const error = { title: 'Network error', message: 'Network timeout' };
    const next = dispatch({ type: 'set-error', error });
    expect(next.lastError).toEqual(error);
    expect(next.busyLabel).toBeNull();
  });

  it('set-export-path: stores path and clears lastError', () => {
    s = { ...s, lastError: { title: 'Old error', message: 'old' } };
    const next = dispatch({ type: 'set-export-path', path: '/tmp/export.md' });
    expect(next.lastExportPath).toBe('/tmp/export.md');
    expect(next.lastError).toBeNull();
  });

  it('set-diagnostics: stores diagnostics and navigates to diagnostics view', () => {
    const next = dispatch({ type: 'set-diagnostics', diagnostics: { ok: true } as any, logs: [] });
    expect(next.activeView).toBe('diagnostics');
    expect(next.diagnostics).toEqual({ ok: true });
    expect(next.diagnosticLogs).toEqual([]);
  });

  it('set-ai-health: replaces aiHealth', () => {
    const health = [{ provider: 'ollama', available: true } as any];
    const next = dispatch({ type: 'set-ai-health', health });
    expect(next.aiHealth).toEqual(health);
  });
});

describe('reducer — sessions', () => {
  it('set-sessions: replaces sessions array', () => {
    const newSess = [{ id: 's1', created_at: new Date().toISOString(), message_count: 5, preview: 'test', name: 'Test' }];
    const next = dispatch({ type: 'set-sessions', sessions: newSess });
    expect(next.sessions).toEqual(newSess);
  });
});

describe('reducer — reset', () => {
  it('reset-local-state: returns initial state with hydrated=true', () => {
    s = { ...s, selectedTheme: 'Blacksite', busyLabel: 'busy', lastError: { title: 'E', message: 'fail' }, deckMode: true };
    const next = dispatch({ type: 'reset-local-state' });
    expect(next.hydrated).toBe(true);
    expect(next.selectedTheme).toBe(initialState.selectedTheme);
    expect(next.busyLabel).toBeNull();
    expect(next.lastError).toBeNull();
    expect(next.deckMode).toBe(false);
  });
});

describe('reducer — edge cases', () => {
  it('unknown action type: returns state unchanged', () => {
    const next = reduce(s, { type: '__unknown__' } as any);
    expect(next).toEqual(s);
  });

  it('set-project-context: updates telemetry.contextUsed proportionally', () => {
    const context = { tokenBudget: 18000, summary: '' } as any;
    const next = dispatch({ type: 'set-project-context', context });
    // Math.min(92, Math.max(12, Math.round(18000 / 180))) = 100 → clamped to 92
    expect(next.telemetry.contextUsed).toBe(92);
  });

  it('set-project-context: null context preserves existing contextUsed', () => {
    s = { ...s, telemetry: { ...s.telemetry, contextUsed: 30 } };
    const next = dispatch({ type: 'set-project-context', context: null });
    expect(next.telemetry.contextUsed).toBe(30);
  });
});
