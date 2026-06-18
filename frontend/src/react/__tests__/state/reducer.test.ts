/**
 * Unit tests for the NeuroDeck reducer.
 * These tests exercise the real reducer implementation rather than a local clone.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { controllerDefaults } from "../../input/controller/controllerStore";
import type {
  AIMessage,
  Agent,
  AgentModelPolicy,
  AgentRun,
  DiagnosticLog,
  LocalModel,
  MemoryItem,
  NeuroDeckAction,
  NeuroDeckState,
  ProjectContextSnapshot,
  ProjectScanResult,
  RecoveryEvent,
  SessionNode,
  StatusBarState,
  ToolStatus,
} from "../../types/neurodeck";
import { neurodeckReducer } from "../../state/neurodeckReducer";
import { initialState } from "../../state/stateUtils";

const makeState = (): NeuroDeckState =>
  structuredClone(initialState) as NeuroDeckState;

let state: NeuroDeckState;

beforeEach(() => {
  state = makeState();
});

const dispatch = (action: NeuroDeckAction) => neurodeckReducer(state, action);

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: "agent-1",
  name: "Agent One",
  role: "Developer",
  status: "idle",
  model: "ollama",
  memoryAccess: "session",
  lastAction: "Idle",
  task: "None",
  ...overrides,
});

const makeModel = (overrides: Partial<LocalModel> = {}): LocalModel => ({
  id: "model-1",
  name: "Model One",
  provider: "ollama",
  size: "8B",
  quantization: "Q4",
  context: 8192,
  bestFor: ["chat"],
  status: "ready",
  ramEstimate: "8 GB",
  ...overrides,
});

const makeMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: "memory-1",
  title: "Memory One",
  body: "Body",
  scope: "Global",
  pinned: false,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeSession = (overrides: Partial<SessionNode> = {}): SessionNode => ({
  id: "session-1",
  created_at: "2026-01-01T00:00:00.000Z",
  message_count: 1,
  preview: "Preview",
  ...overrides,
});

const makeProjectScan = (): ProjectScanResult =>
  ({
    id: "project-1",
    name: "Project One",
    path: "C:/repo",
    scannedAt: "2026-01-01T00:00:00.000Z",
    packageManager: "npm",
    frameworks: ["react"],
    scripts: {},
    docs: {
      readme: true,
      changelog: false,
      envExample: false,
      gitignore: false,
    },
    testSignals: {
      hasTestScript: true,
      hasVitest: true,
      hasPlaywright: false,
      hasTestsFolder: true,
    },
    risks: [],
    recommendations: [],
    stats: {
      fileCount: 10,
      directoryCount: 3,
      stoppedEarly: false,
      maxDepth: 4,
    },
    packageJson: null,
  }) as ProjectScanResult;

describe("reducer", () => {
  it("keeps the command palette closed when switching views", () => {
    state = { ...state, commandOpen: true };
    const next = dispatch({ type: "set-view", view: "agents" });
    expect(next.activeView).toBe("agents");
    expect(next.commandOpen).toBe(false);
  });

  it("toggles command state with and without explicit values", () => {
    const toggled = dispatch({ type: "toggle-command" });
    expect(toggled.commandOpen).toBe(true);

    state = { ...state, commandOpen: true };
    const closed = dispatch({ type: "toggle-command", open: false });
    expect(closed.commandOpen).toBe(false);
  });

  it("updates controller settings and deck mode independently", () => {
    const next = dispatch({
      type: "set-controller-settings",
      settings: { aButton: "jump" } as Partial<typeof controllerDefaults>,
    });
    expect(next.controllerSettings.aButton).toBe("jump");
    expect(next.controllerSettings.bButton).toBe(controllerDefaults.bButton);

    const deck = neurodeckReducer(next, { type: "toggle-deck-mode" });
    expect(deck.deckMode).toBe(true);
  });

  it("handles theme, persona, provider, model, and font updates", () => {
    const next = neurodeckReducer(state, { type: "set-theme", theme: "Night Watch" });
    expect(next.selectedTheme).toBe("Night Watch");

    const persona = neurodeckReducer(next, { type: "set-persona", persona: "Architect" });
    expect(persona.selectedPersona).toBe("Architect");

    const provider = neurodeckReducer(persona, { type: "set-provider", provider: "offline-draft" });
    expect(provider.selectedProvider).toBe("offline-draft");

    const model = neurodeckReducer(provider, { type: "set-selected-model", id: "model-x" });
    expect(model.selectedModelId).toBe("model-x");

    const font = neurodeckReducer(model, { type: "set-font", font: "mono" });
    expect(font.selectedFont).toBe("mono");
  });

  it("keeps onboarding state consistent", () => {
    const opened = dispatch({ type: "open-onboarding", mode: "tour" });
    expect(opened.showOnboarding).toBe(true);
    expect(opened.onboardingMode).toBe("tour");

    const toggled = neurodeckReducer(opened, { type: "toggle-onboarding" });
    expect(toggled.showOnboarding).toBe(false);

    const closed = neurodeckReducer(toggled, { type: "close-onboarding" });
    expect(closed.showOnboarding).toBe(false);
  });

  it("updates composer and starter prompt state", () => {
    const composer = dispatch({ type: "set-composer", value: "hello" });
    expect(composer.composerValue).toBe("hello");

    const started = neurodeckReducer(composer, { type: "run-starter", prompt: "build a plan" });
    expect(started.composerValue).toBe("build a plan");
    expect(started.activeView).toBe("chat");
    expect(started.commandOpen).toBe(false);
  });

  it("updates agent, model, plugin, and memory slices", () => {
    state = {
      ...state,
      agents: [makeAgent()],
      models: [makeModel()],
      plugins: [{ id: "plugin-1", name: "Plugin One", description: "", status: "enabled", permissions: [] }],
      memories: [makeMemory()],
    };

    const agent = dispatch({ type: "toggle-agent", id: "agent-1" });
    expect(agent.agents[0]?.status).toBe("thinking");
    expect(agent.agents[0]?.lastAction).toBe("Status toggled locally");

    const agentStatus = neurodeckReducer(agent, {
      type: "set-agent-status",
      id: "agent-1",
      status: "complete",
      lastAction: "Done",
      task: "Report",
    });
    expect(agentStatus.agents[0]?.status).toBe("complete");
    expect(agentStatus.agents[0]?.task).toBe("Report");

    const model = neurodeckReducer(agentStatus, {
      type: "set-model-status",
      id: "model-1",
      status: "disabled",
    });
    expect(model.models[0]?.status).toBe("disabled");

    const plugin = neurodeckReducer(model, { type: "toggle-plugin", id: "plugin-1" });
    expect(plugin.plugins[0]?.status).toBe("disabled");

    const memory = neurodeckReducer(plugin, { type: "toggle-memory-pin", id: "memory-1" });
    expect(memory.memories[0]?.pinned).toBe(true);
  });

  it("replaces collections and deletes memory by id", () => {
    const sessions = [makeSession()];
    const agents = [makeAgent({ id: "agent-2" })];
    const plugins = [{ id: "plugin-2", name: "Plugin Two", description: "", status: "disabled", permissions: [] }];
    const memories = [makeMemory({ id: "memory-2" })];

    const updated = neurodeckReducer(state, { type: "set-sessions", sessions });
    expect(updated.sessions).toEqual(sessions);

    const agentState = neurodeckReducer(updated, { type: "set-agents", agents });
    expect(agentState.agents).toEqual(agents);

    const pluginState = neurodeckReducer(agentState, { type: "set-plugins", plugins });
    expect(pluginState.plugins).toEqual(plugins);

    const memoryState = neurodeckReducer(pluginState, { type: "set-memories", memories });
    expect(memoryState.memories).toEqual(memories);

    const deleted = neurodeckReducer(memoryState, { type: "delete-memory", id: "memory-2" });
    expect(deleted.memories).toHaveLength(0);
  });

  it("tracks project and model context updates", () => {
    const scan = neurodeckReducer(state, { type: "set-project-scan", project: makeProjectScan() });
    expect(scan.activeView).toBe("project");
    expect(scan.activeProject?.id).toBe("project-1");
    expect(scan.projectContext).toBeNull();

    const context: ProjectContextSnapshot = {
      projectId: "project-1",
      projectName: "Project One",
      projectPath: "C:/repo",
      createdAt: "2026-01-01T00:00:00.000Z",
      summary: "Context",
      files: [],
      warnings: [],
      redactions: 0,
      tokenBudget: 18000,
    };
    const withContext = neurodeckReducer(scan, { type: "set-project-context", context });
    expect(withContext.projectContext).toEqual(context);
    expect(withContext.telemetry.contextUsed).toBe(92);

    const nullContext = neurodeckReducer(withContext, { type: "set-project-context", context: null });
    expect(nullContext.telemetry.contextUsed).toBe(92);

    const detection = neurodeckReducer(state, {
      type: "set-model-detection",
      detection: { scannedAt: "", runtimes: [], discoveredModels: [], summary: "" },
    });
    expect(detection.activeView).toBe("models");

    const merged = neurodeckReducer(detection, {
      type: "merge-detected-models",
      models: [makeModel({ id: "model-1" }), makeModel({ id: "model-2", name: "Model Two" })],
    });
    expect(merged.models).toHaveLength(2);
  });

  it("keeps telemetry and async state aligned", () => {
    const health = neurodeckReducer(state, {
      type: "set-ai-health",
      health: [{ provider: "ollama", label: "Ollama", available: true, endpoint: "", detail: "", checkedAt: "" }],
    });
    expect(health.aiHealth).toHaveLength(1);

    const message: AIMessage = {
      id: "m-1",
      role: "user",
      content: "hello",
      createdAt: "2026-01-01T00:00:00.000Z",
      latencyMs: 123,
    };
    const appended = neurodeckReducer(health, { type: "append-message", message });
    expect(appended.messages.at(-1)).toEqual(message);
    expect(appended.composerValue).toBe("");
    expect(appended.telemetry.latencyMs).toBe(123);

    const updated = neurodeckReducer(appended, { type: "update-message", id: "m-1", content: " world" });
    expect(updated.messages.at(-1)?.content).toBe("hello world");

    const run: AgentRun = {
      id: "run-1",
      agentId: "agent-1",
      agentName: "Agent One",
      status: "running",
      startedAt: "2026-01-01T00:00:00.000Z",
      provider: "ollama",
      model: "model-1",
      prompt: "Do work",
      usedProjectContext: false,
    };
    const execution = neurodeckReducer(updated, { type: "add-ai-run", run });
    expect(execution.activeView).toBe("execution");
    expect(execution.aiRuns[0]).toEqual(run);
  });

  it("keeps error, diagnostics, and reset state aligned", () => {
    const toolStatus: ToolStatus = { state: "working", label: "Busy" };
    const statusBar: StatusBarState = {
      connection: { status: "ok", issues: [] },
      ai: { provider: "ollama", model: "m", active_agent_id: "a", active_persona: "p" },
      session: { id: "s", message_count: 1 },
      memory: { ready: true, count: 2 },
      tools: toolStatus,
      pty: { session_count: 1 },
      remote: { server_running: false },
      transfer: { active_count: 0 },
      mcp: { running: false },
      sync: {
        enabled: true,
        syncing: false,
        last_sync_at: null,
        last_error: null,
        pending_records: 0,
      },
      theme: { active_theme_name: "Blacksite" },
      safe_mode: false,
    };

    const busy = neurodeckReducer(state, { type: "set-busy", label: "Scanning" });
    expect(busy.busyLabel).toBe("Scanning");

    const errored = neurodeckReducer(busy, { type: "set-error", error: { title: "Error", message: "Boom" } });
    expect(errored.busyLabel).toBeNull();
    expect(errored.lastError?.title).toBe("Error");

    const exported = neurodeckReducer(errored, { type: "set-export-path", path: "/tmp/export.md" });
    expect(exported.lastExportPath).toBe("/tmp/export.md");

    const diagnostics = neurodeckReducer(exported, {
      type: "set-diagnostics",
      diagnostics: { platform: "win32" } as any,
      logs: [{ id: "l1", timestamp: "", level: "info", scope: "ui", message: "ok" } as DiagnosticLog],
    });
    expect(diagnostics.activeView).toBe("diagnostics");

    const status = neurodeckReducer(diagnostics, { type: "set-status-bar", state: statusBar });
    expect(status.statusBar).toEqual(statusBar);

    const activeAgent = neurodeckReducer(status, { type: "set-active-agent", id: "agent-2" });
    expect(activeAgent.activeAgentId).toBe("agent-2");

    const scores = neurodeckReducer(activeAgent, {
      type: "set-model-scores",
      scores: [],
    });
    expect(scores.modelScores).toEqual([]);

    const policies = neurodeckReducer(scores, {
      type: "set-agent-policies",
      policies: [{ agentId: "agent-1" } as AgentModelPolicy],
    });
    expect(policies.agentPolicies).toHaveLength(1);

    const recovery = neurodeckReducer(policies, {
      type: "set-recovery-events",
      events: [{ id: "r1", timestamp: "", runtimeId: "rt", state: "ok", action: "check", allowed: true, reason: "" } as RecoveryEvent],
    });
    expect(recovery.recoveryEvents).toHaveLength(1);

    const reset = neurodeckReducer(recovery, { type: "reset-local-state" });
    expect(reset.hydrated).toBe(true);
    expect(reset.selectedTheme).toBe(initialState.selectedTheme);
    expect(reset.busyLabel).toBeNull();
    expect(reset.lastError).toBeNull();
    expect(reset.deckMode).toBe(false);
  });

  it("preserves state for unknown actions", () => {
    const next = neurodeckReducer(state, { type: "__unknown__" } as unknown as NeuroDeckAction);
    expect(next).toEqual(state);
  });
});
