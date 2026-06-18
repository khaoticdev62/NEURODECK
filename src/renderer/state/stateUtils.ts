import { controllerDefaults } from "../input/controller/controllerStore";
import type { AgentStatus, LocalModel, NeuroDeckState } from "../types/neurodeck";

export function getInitialShowOnboarding(): boolean {
  try {
    return localStorage.getItem("neurodeck_onboarding_complete") !== "true";
  } catch {
    return true;
  }
}

export const initialState: NeuroDeckState = {
  hydrated: false,
  activeView: "chat",
  commandOpen: false,
  deckMode: false,
  controllerSettings: controllerDefaults,
  selectedTheme: "Blacksite",
  selectedPersona: "Developer",
  selectedProvider: "ollama",
  selectedModelId: "",
  activeAgentId: "general",
  selectedFont: "inter",
  searchOpen: false,
  showOnboarding: getInitialShowOnboarding(),
  onboardingMode: "setup",
  composerValue: "",
  busyLabel: null,
  toolStatus: null,
  statusBar: null,
  activeProject: null,
  projectContext: null,
  modelDetection: null,
  aiHealth: [],
  diagnostics: null,
  diagnosticLogs: [],
  modelScores: [],
  agentPolicies: [],
  recoveryEvents: [],
  lastExportPath: null,
  lastError: null,
  agents: [],
  models: [],
  memories: [],
  sessions: [],
  cacheEntries: [],
  plugins: [],
  messages: [],
  aiRuns: [],
  promptTemplates: [],
  customThemes: [],
  telemetry: {
    latencyMs: 42,
    contextUsed: 14,
    memoryPressure: 38,
    cacheHealth: 94,
    activeAgents: 1,
  },
};

export function nextStatus(current: AgentStatus): AgentStatus {
  if (current === "idle") return "thinking";
  if (current === "thinking") return "complete";
  if (current === "complete") return "idle";
  return "idle";
}

export function mergeUniqueModels(current: LocalModel[], incoming: LocalModel[]): LocalModel[] {
  const byId = new Map(current.map((model) => [model.id, model]));
  for (const model of incoming) byId.set(model.id, model);
  return Array.from(byId.values());
}

export function sanitizeHydrate(payload: Partial<NeuroDeckState> | null): Partial<NeuroDeckState> {
  if (!payload || typeof payload !== "object") return {};
  const {
    hydrated: _hydrated,
    commandOpen: _commandOpen,
    busyLabel: _busyLabel,
    diagnostics: _diagnostics,
    diagnosticLogs: _diagnosticLogs,
    lastError: _lastError,
    showOnboarding: _showOnboarding,
    onboardingMode: _onboardingMode,
    ...persistable
  } = payload;
  return persistable;
}
