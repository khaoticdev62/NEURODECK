import type { LucideIcon } from 'lucide-react';
import type { ControllerSettings } from '../../shared/types/controller';

export type ViewId =
  | 'chat' | 'workspace' | 'execution' | 'agent' | 'agents' | 'memory'
  | 'canvas' | 'terminal' | 'ssh' | 'ide' | 'git' | 'api-lab' | 'cli-maker'
  | 'browser' | 'tunnel' | 'share' | 'remote' | 'torrent'
  | 'project' | 'docs' | 'prompt-lab' | 'graph' | 'sessions'
  | 'scheduler' | 'orchestrator'
  | 'models' | 'cache' | 'plugins' | 'diagnostics' | 'settings'
  | 'security' | 'themes' | 'exports' | 'maintenance' | 'recovery'
  | 'fonts';
export type ThemeName = 'Blacksite' | 'Tactical Glass' | 'Ghost Terminal' | 'Hologrid' | 'Minimal Ops' | 'Night Watch' | 'Broadcast';
export type AgentStatus = 'idle' | 'thinking' | 'blocked' | 'complete';
export type ModelStatus = 'ready' | 'indexed' | 'missing' | 'disabled';
export type MemoryScope = 'Global' | 'Project' | 'Session';
export type PluginStatus = 'enabled' | 'disabled' | 'needs review';
export type LogLevel = 'info' | 'warning' | 'error';
export type AIProvider = 'ollama' | 'lmstudio' | 'openai_compat' | 'llama_cpp' | 'offline-draft';
export type AIRole = 'system' | 'user' | 'assistant' | 'tool';
export type AIRunStatus = 'queued' | 'running' | 'complete' | 'failed';
export type ContextFileKind = 'manifest' | 'docs' | 'source' | 'config' | 'security' | 'unknown';

export interface NavItem {
  id: ViewId;
  label: string;
  description: string;
  icon: LucideIcon;
  shortcut: string;
  section?: string;
}

export interface ThemeTokenSet {
  name: ThemeName;
  background: string;
  surface: string;
  surfaceRaised: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  text: string;
  muted: string;
  glow: string;
}

export interface ToolStatus {
  state: 'idle' | 'working' | 'error';
  label: string;
  detail?: string;
  since?: string;
}

export interface StatusBarState {
  connection: {
    status: string;
    issues: string[];
  };
  ai: {
    provider: string;
    model: string;
    active_agent_id: string;
    active_persona: string;
  };
  session: {
    id: string;
    message_count: number;
  };
  memory: {
    ready: boolean;
    count: number;
  };
  tools: ToolStatus;
  pty: {
    session_count: number;
  };
  remote: {
    server_running: boolean;
  };
  transfer: {
    active_count: number;
  };
  mcp: {
    running: boolean;
  };
  sync: {
    enabled: boolean;
    syncing: boolean;
    last_sync_at: string | null;
    last_error: string | null;
    pending_records: number;
  };
  theme: {
    active_theme_name: string | null;
  };
  safe_mode: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model: string;
  memoryAccess: 'none' | 'session' | 'project' | 'global';
  lastAction: string;
  task: string;
}

export interface LocalModel {
  id: string;
  name: string;
  provider: string;
  /** Backend provider used for chat routing. */
  backendProvider?: AIProvider;
  /** Real model tag sent to the backend (e.g. llama3.1:8b). */
  backendModel?: string;
  size: string;
  quantization: string;
  context: number;
  bestFor: string[];
  status: ModelStatus;
  ramEstimate: string;
}

export interface RuntimeDetection {
  name: string;
  path: string;
  type: string;
  exists: boolean;
  status: 'detected' | 'missing';
}

export interface ModelDetectionResult {
  scannedAt: string;
  runtimes: RuntimeDetection[];
  discoveredModels: LocalModel[];
  summary: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  body: string;
  scope: MemoryScope;
  pinned: boolean;
  updatedAt: string;
}

export interface SessionNode {
  id: string;
  created_at: string;
  message_count: number;
  preview: string;
  name?: string;
}

export interface CacheEntry {
  id: string;
  label: string;
  status: 'ready' | 'stale' | 'queued';
  size: string;
  updatedAt: string;
}

export interface PluginCard {
  id: string;
  name: string;
  description: string;
  status: PluginStatus;
  permissions: string[];
}

export interface Telemetry {
  latencyMs: number;
  contextUsed: number;
  memoryPressure: number;
  cacheHealth: number;
  activeAgents: number;
}

export interface ProjectDocsSignal {
  readme: boolean;
  changelog: boolean;
  envExample: boolean;
  gitignore: boolean;
}

export interface ProjectTestSignal {
  hasTestScript: boolean;
  hasVitest: boolean;
  hasPlaywright: boolean;
  hasTestsFolder: boolean;
}

export interface ProjectScanStats {
  fileCount: number;
  directoryCount: number;
  stoppedEarly: boolean;
  maxDepth: number;
}

export interface ProjectPackageSummary {
  name: string | null;
  version: string | null;
  private: boolean;
  type: string | null;
}

export interface ProjectScanResult {
  id: string;
  name: string;
  path: string;
  scannedAt: string;
  packageManager: string;
  frameworks: string[];
  scripts: Record<string, string>;
  docs: ProjectDocsSignal;
  testSignals: ProjectTestSignal;
  risks: string[];
  recommendations: string[];
  stats: ProjectScanStats;
  packageJson: ProjectPackageSummary | null;
}

export interface ContextFileSnapshot {
  path: string;
  kind: ContextFileKind;
  bytes: number;
  content: string;
  truncated: boolean;
}

export interface ProjectContextSnapshot {
  projectId: string;
  projectName: string;
  projectPath: string;
  createdAt: string;
  summary: string;
  files: ContextFileSnapshot[];
  warnings: string[];
  redactions: number;
  tokenBudget: number;
}

export interface AIMessage {
  id: string;
  role: AIRole;
  content: string;
  createdAt: string;
  provider?: AIProvider;
  model?: string;
  latencyMs?: number;
  contextSources?: string[];
}

export interface AIProviderHealth {
  provider: AIProvider;
  label: string;
  available: boolean;
  endpoint: string;
  detail: string;
  checkedAt: string;
  latencyMs?: number;
}

export interface AIChatPayload {
  provider: AIProvider;
  model: string;
  persona: string;
  prompt: string;
  messages: AIMessage[];
  projectContext?: ProjectContextSnapshot | null;
  activeProjectName?: string;
}

export type AIChatResponse =
  | { ok: true; message: AIMessage; provider: AIProvider; model: string; latencyMs: number; contextSources: string[] }
  | { ok: false; error: string; provider?: AIProvider; model?: string };

export interface AgentRunRequest {
  agentId: string;
  agentName: string;
  agentRole: string;
  provider: AIProvider;
  model: string;
  persona: string;
  prompt: string;
  projectContext?: ProjectContextSnapshot | null;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentName: string;
  status: AIRunStatus;
  startedAt: string;
  finishedAt?: string;
  provider: AIProvider;
  model: string;
  prompt: string;
  result?: string;
  error?: string;
  usedProjectContext: boolean;
}

export type AgentRunResponse =
  | { ok: true; run: AgentRun }
  | { ok: false; run: AgentRun; error: string };

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'Build' | 'Audit' | 'Docs' | 'Security' | 'QA';
  prompt: string;
  agentId?: string;
}

export interface DiagnosticsPayload {
  platform: string;
  arch: string;
  electron: string;
  chrome: string;
  node: string;
  packaged: boolean;
  appVersion?: string;
  schemaVersion?: number;
  userData: string;
  storeFile: string;
  exportsDir: string;
  diagnosticsDir?: string;
  logCount: number;
}

export interface SecurityReport {
  keychain_ok: boolean;
  safe_mode: boolean;
  agent_workspace_only: boolean;
  permission_registry_count: number;
}

export type CredentialStatus = {
  gemini: boolean;
  huggingface: boolean;
  openai_compat: boolean;
};

export type DiagnosticsBundleResponse = { ok: true; file: string } | { ok: false; error: string; code?: string };


export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AppError {
  title: string;
  message: string;
  action?: string;
}

export type FontCategory = 'Sans Serif' | 'Serif' | 'Monospace' | 'Sci-Fi' | 'Display';

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: FontCategory;
  weights: number[];
}

export interface ModelCompatibilityScore {
  modelId: string;
  displayName: string;
  tier: string;
  score: number;
  reasons: string[];
  warnings: string[];
  recommendedContextTokens: number;
  recommendedBatchSize: number;
  recommendedGpuLayers?: number;
  allowAutoLoad: boolean;
  requiresUserOptIn: boolean;
  installed: boolean;
}

export interface AgentModelPolicy {
  agentId: string;
  preferredModels: string[];
  allowedModelCapabilities: string[];
  blockedModelFamilies: string[];
  minimumCompatibilityTier: string;
  allowHeavyModels: boolean;
  allowRemoteFallback: boolean;
}

export interface AgentModelAllowance {
  allowed: boolean;
  reason: string;
  tierOk: boolean;
  capabilitiesOk: boolean;
  familyOk: boolean;
  heavyOk: boolean;
  remoteOk: boolean;
}

export interface RecoveryEvent {
  id: string;
  timestamp: string;
  runtimeId: string;
  modelId?: string;
  state: string;
  action: string;
  allowed: boolean;
  reason: string;
}

export interface NeuroDeckState {
  hydrated: boolean;
  activeView: ViewId;
  commandOpen: boolean;
  deckMode: boolean;
  controllerSettings: ControllerSettings;
  selectedTheme: ThemeName;
  selectedPersona: string;
  toolStatus: ToolStatus | null;
  statusBar: StatusBarState | null;
  selectedProvider: AIProvider;
  selectedModelId: string;
  activeAgentId: string;
  selectedFont: string;
  showOnboarding: boolean;
  composerValue: string;
  busyLabel: string | null;
  activeProject: ProjectScanResult | null;
  projectContext: ProjectContextSnapshot | null;
  modelDetection: ModelDetectionResult | null;
  aiHealth: AIProviderHealth[];
  diagnostics: DiagnosticsPayload | null;
  diagnosticLogs: DiagnosticLog[];
  modelScores: ModelCompatibilityScore[];
  agentPolicies: AgentModelPolicy[];
  recoveryEvents: RecoveryEvent[];
  lastExportPath: string | null;
  lastError: AppError | null;
  agents: Agent[];
  models: LocalModel[];
  memories: MemoryItem[];
  sessions: SessionNode[];
  cacheEntries: CacheEntry[];
  plugins: PluginCard[];
  messages: AIMessage[];
  aiRuns: AgentRun[];
  promptTemplates: PromptTemplate[];
  telemetry: Telemetry;
  lastSavedAt?: string;
}

export interface NeuroDeckSelectors {
  activeAgents: number;
  readyModels: number;
  pinnedMemories: number;
  enabledPlugins: number;
  riskCount: number;
  messageCount: number;
  completedRuns: number;
}

export type CliAction =
  | { type: 'Prompt'; data: { template: string; use_llm: boolean } }
  | { type: 'Shell'; data: { command: string; cwd: string | null } }
  | { type: 'View'; data: { view_name: string } }
  | { type: 'Chain'; data: { steps: string[] } }
  | { type: 'Plugin'; data: { lua_code: string } };

export interface CliCommandDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  action: CliAction;
  shortcut: string | null;
  radial_bind: number | null;
}

export interface ExportSessionPayload {
  title: string;
  persona: string;
  theme: string;
  lines: string[];
  projectName?: string;
  modelSummary?: string;
}

export interface SavedSessionPayload {
  title: string;
  state: Pick<NeuroDeckState, 'selectedPersona' | 'selectedProvider' | 'selectedModelId' | 'messages' | 'aiRuns' | 'activeProject' | 'projectContext'>;
}

export type SaveSessionResponse = { ok: true; file: string } | { ok: false; error: string };
export type SessionExportResponse = { ok: true; file: string } | { ok: false; error: string };

export interface NeuroDeckAppActions {
  scanProject: () => Promise<void>;
  buildProjectContext: () => Promise<void>;
  detectModels: () => Promise<void>;
  checkAiHealth: () => Promise<void>;
  runAssistant: (prompt?: string) => Promise<void>;
  runAgent: (agentId: string, prompt?: string) => Promise<void>;
  refreshDiagnostics: () => Promise<void>;
  exportSession: () => Promise<void>;
  saveSession: () => Promise<void>;
  exportDiagnosticsBundle: () => Promise<void>;
  resetLocalState: () => Promise<void>;
  addMemoryFact: (content: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleMemoryPin: (id: string, pinned: boolean) => Promise<void>;
  refreshModelScores: () => Promise<void>;
  refreshAgentPolicies: () => Promise<void>;
  refreshRecoveryEvents: () => Promise<void>;
  validateAgentModel: (agentId: string, modelId: string) => Promise<AgentModelAllowance>;
}

export type NeuroDeckAction =
  | { type: 'hydrate'; payload: Partial<NeuroDeckState> | null }
  | { type: 'set-view'; view: ViewId }
  | { type: 'toggle-command'; open?: boolean }
  | { type: 'toggle-deck-mode' }
  | { type: 'set-controller-settings'; settings: Partial<ControllerSettings> }
  | { type: 'set-theme'; theme: ThemeName }
  | { type: 'set-persona'; persona: string }
  | { type: 'set-tool-status'; status: ToolStatus | null }
  | { type: 'set-status-bar'; state: StatusBarState | null }
  | { type: 'set-provider'; provider: AIProvider }
  | { type: 'set-selected-model'; id: string }
  | { type: 'set-font'; font: string }
  | { type: 'toggle-onboarding' }
  | { type: 'set-composer'; value: string }
  | { type: 'run-starter'; prompt: string }
  | { type: 'toggle-agent'; id: string }
  | { type: 'set-agent-status'; id: string; status: AgentStatus; lastAction?: string; task?: string }
  | { type: 'set-model-status'; id: string; status: ModelStatus }
  | { type: 'toggle-memory-pin'; id: string }
  | { type: 'toggle-plugin'; id: string }
  | { type: 'set-project-scan'; project: ProjectScanResult | null }
  | { type: 'set-project-context'; context: ProjectContextSnapshot | null }
  | { type: 'set-model-detection'; detection: ModelDetectionResult | null }
  | { type: 'merge-detected-models'; models: LocalModel[] }
  | { type: 'set-ai-health'; health: AIProviderHealth[] }
  | { type: 'append-message'; message: AIMessage }
  | { type: 'update-message'; id: string; content: string }
  | { type: 'add-ai-run'; run: AgentRun }
  | { type: 'set-diagnostics'; diagnostics: DiagnosticsPayload | null; logs: DiagnosticLog[] }
  | { type: 'set-busy'; label: string | null }
  | { type: 'set-error'; error: AppError | null }
  | { type: 'set-export-path'; path: string | null }
  | { type: 'set-active-agent'; id: string }
  | { type: 'set-model-scores'; scores: ModelCompatibilityScore[] }
  | { type: 'set-agent-policies'; policies: AgentModelPolicy[] }
  | { type: 'set-recovery-events'; events: RecoveryEvent[] }
  | { type: 'set-memories'; memories: MemoryItem[] }
  | { type: 'add-memory'; memory: MemoryItem }
  | { type: 'delete-memory'; id: string }
  | { type: 'set-sessions'; sessions: SessionNode[] }
  | { type: 'set-agents'; agents: Agent[] }
  | { type: 'set-plugins'; plugins: PluginCard[] }
  | { type: 'reset-local-state' };
