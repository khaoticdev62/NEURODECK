/**
 * Bridge Adapter — translates the v6 neurodeckApi interface into
 * HTTP POST + WebSocket calls to the existing Rust bridge server.
 *
 * This replaces the Electron IPC (`window.neurodeck.*`) layer with
 * bridge-compatible communication, allowing the v6 React UI to run
 * against the existing NEURODECK Rust sidecar.
 */

import type {
  AIChatPayload,
  AIChatResponse,
  AIProvider,
  AIProviderHealth,
  AIRunStatus,
  AgentModelPolicy,
  AgentRunRequest,
  AgentRunResponse,
  DiagnosticsPayload,
  DiagnosticLog,
  ExportSessionPayload,
  ModelDetectionResult,
  ProjectContextSnapshot,
  ProjectScanResult,
  SavedSessionPayload,
  SecurityReport,
  SessionExportResponse,
  SaveSessionResponse,
  DiagnosticsBundleResponse,
  CredentialStatus,
  CliCommandDef,
  ToolStatus,
  StatusBarState,
} from "../types/neurodeck";
import type { ProviderRuntimeProfile } from "../../shared/contracts/models.contracts";
import type { TerminalCommandSafety } from "../../../../src/shared/terminal/terminalSafetyTypes";
import type {
  TerminalDiagnosticsReport,
  TerminalEnvironmentReport,
  TerminalSessionSummary,
} from "../../../../src/shared/terminal/terminalDiagnosticsTypes";
import type { OnboardingDiagnosticResult } from "../types/onboarding";
import type { TerminalProfileAvailability } from "../../../../src/shared/terminal/terminalProfiles";

function getBridgePort(): number {
  const runtime = typeof window !== "undefined" ? (window as any).NEURODECK_PORT : undefined;
  const runtimePort = runtime ? parseInt(String(runtime), 10) : NaN;
  return Number.isNaN(runtimePort)
    ? parseInt(import.meta.env.VITE_BRIDGE_PORT || "9477", 10)
    : runtimePort;
}

const BRIDGE_PORT = getBridgePort();
const BRIDGE_ORIGIN = `http://127.0.0.1:${BRIDGE_PORT}`;

let _ws: WebSocket | null = null;
let _wsListeners: Map<string, Set<(payload: unknown) => void>> = new Map();
let _wsOpenPromise: Promise<void> | null = null;
let _wsOpenResolve: (() => void) | null = null;
let _wsOpenReject: ((err: Error) => void) | null = null;

function _ensureWs(): WebSocket | null {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws;
  if (_ws && _ws.readyState === WebSocket.CONNECTING) return _ws;

  const socket = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}/ws`);
  const openPromise = new Promise<void>((resolve, reject) => {
    _wsOpenResolve = resolve;
    _wsOpenReject = reject;
  });
  // Prevent unhandled-rejection noise during module load / reconnection attempts.
  openPromise.catch(() => {});
  _wsOpenPromise = openPromise;
  socket.onopen = () => {
    _wsOpenPromise = null;
    _wsOpenReject = null;
    _wsOpenResolve?.();
    _wsOpenResolve = null;
  };
  socket.onerror = () => {
    _wsOpenReject?.(new Error("WebSocket connection failed"));
    _wsOpenReject = null;
    _wsOpenResolve = null;
    _wsOpenPromise = null;
  };
  socket.onclose = () => {
    _wsOpenReject?.(new Error("WebSocket closed before open"));
    _wsOpenReject = null;
    _wsOpenResolve = null;
    _wsOpenPromise = null;
    _ws = null;
    setTimeout(() => _ensureWs(), 2000);
  };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      const eventName = msg.event || msg.type;
      if (eventName) {
        const handlers = _wsListeners.get(eventName);
        if (handlers) handlers.forEach((h) => h(msg.payload ?? msg));
      }
    } catch (_) {
      /* ignore non-JSON ws messages */
    }
  };
  _ws = socket;
  return _ws;
}

function _waitForWsOpen(): Promise<void> {
  _ensureWs();
  if (_ws?.readyState === WebSocket.OPEN) return Promise.resolve();
  return _wsOpenPromise ?? Promise.resolve();
}

_ensureWs();

export function listenBridge(event: string, handler: (payload: unknown) => void): () => void {
  _ensureWs();
  if (!_wsListeners.has(event)) _wsListeners.set(event, new Set());
  _wsListeners.get(event)!.add(handler);
  return () => {
    _wsListeners.get(event)?.delete(handler);
  };
}

async function bridgeInvoke<T>(cmd: string, args?: unknown): Promise<T> {
  const res = await fetch(`${BRIDGE_ORIGIN}/api/${cmd}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Bridge error");
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

async function appInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return bridgeInvoke<T>(cmd, args);
}

/* ── Store (bridge-backed via localStorage fallback) ─────────────────────── */

const store = {
  async get<T>(key: string): Promise<T | null> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.get(key);
      if (res.ok) return res.data as T;
    }
    try {
      return await bridgeInvoke<T>("get_store", { key });
    } catch (_) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  },
  async set(key: string, value: unknown) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set(key, value);
      if (res.ok) return { ok: true, updatedAt: new Date().toISOString() };
    }
    try {
      await bridgeInvoke("set_store", { key, value });
    } catch (_) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
  async reset(key: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set(key, null);
      if (res.ok) return { ok: true, updatedAt: new Date().toISOString() };
    }
    try {
      await bridgeInvoke("reset_store", { key });
    } catch (_) {
      localStorage.removeItem(key);
    }
    return { ok: true, updatedAt: new Date().toISOString() };
  },
  async setConfig(key: string, value: string) {
    return bridgeInvoke<{ status: string; key: string; value: string }>("set_config", { key, value });
  },
  async saveGeminiApiKey(key: string) {
    return bridgeInvoke<{ status: string }>("save_gemini_api_key", { key });
  },
  async saveOpenAiCompatApiKey(key: string) {
    return bridgeInvoke<{ status: string }>("save_openai_compat_api_key", { key });
  },
};

/* ── Projects (bridge-backed; fallback to browser) ───────────────────────── */

export type ProjectScanResponse =
  | { canceled: true }
  | { canceled: false; project?: ProjectScanResult; error?: string };

export type ProjectContextResponse =
  | { ok: true; context: ProjectContextSnapshot }
  | { ok: false; error: string };

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  sessions_total: number;
  messages_total: number;
  memory_total: number;
  memory_pinned: number;
  projects_total: number;
  packs_total: number;
  provider: string;
  model: string;
  db_size_bytes: number;
  privacy_breakdown: {
    standard: number;
    private: number;
    sensitive: number;
    sealed: number;
  };
  recent_sessions: {
    id: string;
    name?: string;
    created_at: string;
    message_count: number;
  }[];
}

const unsupportedProjectScan: ProjectScanResponse = {
  canceled: false,
  error: "Project scanning requires the NEURODECK bridge server.",
};

const projects = {
  async selectAndScan(): Promise<ProjectScanResponse> {
    try {
      const result = await bridgeInvoke<ProjectScanResult>("scan_project");
      return { canceled: false, project: result };
    } catch (e) {
      return { canceled: false, error: String(e) };
    }
  },
  async buildContext(projectPath: string): Promise<ProjectContextResponse> {
    try {
      const context = await bridgeInvoke<ProjectContextSnapshot>("build_project_context", {
        path: projectPath,
      });
      return { ok: true, context };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async list(): Promise<Project[]> {
    return bridgeInvoke<Project[]>("list_projects");
  },
  async getMemory(id: string): Promise<MemoryRecord[]> {
    return bridgeInvoke<MemoryRecord[]>("get_project_memory", { id });
  },
};

/* ── Models ──────────────────────────────────────────────────────────────── */

export type ModelDetectionResponse =
  | { ok: true; detection: ModelDetectionResult }
  | { ok: false; error: string };

export type ScoreOptions = {
  hostMemoryGb?: number;
  batteryMode?: boolean;
  allowHeavyModels?: boolean;
  requiredCapabilities?: string[];
};

export type ProviderHealth = {
  runtime_id: string;
  runtime_type: string;
  label: string;
  state: string;
  base_url?: string;
  latency_ms: number;
  models: string[];
  error?: string;
  checked_at: string;
};

export type DiscoveredModelEntry = {
  runtime_id: string;
  runtime_type: string;
  runtime_label: string;
  model_id: string;
  registry_model_id?: string;
  display_name: string;
  family?: string;
  compatibility_tier: string;
  capabilities: string[];
  state: string;
  latency_ms: number;
};

export type ModelProbeResult = {
  runtimeId: string;
  modelId: string;
  state: string;
  response: string;
  latencyMs: number;
  error?: string;
};

export type ModelCompatibilityScore = {
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
};

type BackendModelCompatibilityScore = {
  model_id: string;
  display_name: string;
  tier: string;
  score: number;
  reasons: string[];
  warnings: string[];
  recommended_context_tokens: number;
  recommended_batch_size: number;
  recommended_gpu_layers?: number;
  allow_auto_load: boolean;
  requires_user_opt_in: boolean;
  installed: boolean;
};

export type AgentScoredModel = ModelCompatibilityScore & {
  agentPreferred: boolean;
  policyAllowed: boolean;
  policyReason: string;
};

type BackendAgentScoredModel = BackendModelCompatibilityScore & {
  agent_preferred: boolean;
  policy_allowed: boolean;
  policy_reason: string;
};

export type AgentModelAllowance = {
  allowed: boolean;
  reason: string;
  tierOk: boolean;
  capabilitiesOk: boolean;
  familyOk: boolean;
  heavyOk: boolean;
  remoteOk: boolean;
};

export type RecoveryEvaluation = {
  action: string;
  targetRuntimeId?: string;
  targetModelId?: string;
  reason: string;
  allowed: boolean;
  evidence: string[];
};

export type RecoveryEvent = {
  id: string;
  timestamp: string;
  runtimeId: string;
  modelId?: string;
  state: string;
  action: string;
  allowed: boolean;
  reason: string;
};

type BackendRecoveryEvent = {
  id: string;
  timestamp: string;
  runtime_id: string;
  model_id?: string;
  state: string;
  action: string;
  allowed: boolean;
  reason: string;
};

type BackendAgentModelPolicy = {
  agent_id: string;
  preferred_models: string[];
  allowed_model_capabilities: string[];
  blocked_model_families: string[];
  minimum_compatibility_tier: string;
  allow_heavy_models: boolean;
  allow_remote_fallback: boolean;
};

function mapAgentPolicy(p: BackendAgentModelPolicy): AgentModelPolicy {
  return {
    agentId: p.agent_id,
    preferredModels: p.preferred_models,
    allowedModelCapabilities: p.allowed_model_capabilities,
    blockedModelFamilies: p.blocked_model_families,
    minimumCompatibilityTier: p.minimum_compatibility_tier,
    allowHeavyModels: p.allow_heavy_models,
    allowRemoteFallback: p.allow_remote_fallback,
  };
}

function mapScore(s: BackendModelCompatibilityScore): ModelCompatibilityScore {
  return {
    modelId: s.model_id,
    displayName: s.display_name,
    tier: s.tier,
    score: s.score,
    reasons: s.reasons,
    warnings: s.warnings,
    recommendedContextTokens: s.recommended_context_tokens,
    recommendedBatchSize: s.recommended_batch_size,
    recommendedGpuLayers: s.recommended_gpu_layers,
    allowAutoLoad: s.allow_auto_load,
    requiresUserOptIn: s.requires_user_opt_in,
    installed: s.installed,
  };
}

function mapAgentScoredModel(m: BackendAgentScoredModel): AgentScoredModel {
  return {
    ...mapScore(m),
    agentPreferred: m.agent_preferred,
    policyAllowed: m.policy_allowed,
    policyReason: m.policy_reason,
  };
}

function mapRecoveryEvent(e: BackendRecoveryEvent): RecoveryEvent {
  return {
    id: e.id,
    timestamp: e.timestamp,
    runtimeId: e.runtime_id,
    modelId: e.model_id,
    state: e.state,
    action: e.action,
    allowed: e.allowed,
    reason: e.reason,
  };
}

export function runtimeTypeToProvider(runtimeType: string): AIProvider {
  switch (runtimeType) {
    case "ollama":
      return "ollama";
    case "lm_studio":
      return "lmstudio";
    case "llama_cpp_server":
      return "llama_cpp";
    case "openai_compatible_local":
    case "openai_compatible_remote":
    case "custom_http_provider":
      return "openai_compat";
    default:
      return "ollama";
  }
}

const models = {
  async detectLocal(): Promise<ModelDetectionResponse> {
    try {
      const discovered = await bridgeInvoke<DiscoveredModelEntry[]>(
        "discover_installed_models"
      ).catch(() => [] as DiscoveredModelEntry[]);
      const health = await bridgeInvoke<ProviderHealth[]>("get_provider_health").catch(
        () => [] as ProviderHealth[]
      );

      const localModels: ModelDetectionResult["discoveredModels"] = discovered.map((entry) => {
        const profileId = entry.registry_model_id ?? entry.model_id;
        return {
          id: profileId,
          name: entry.display_name || entry.model_id,
          provider: entry.runtime_label || entry.runtime_id,
          backendProvider: runtimeTypeToProvider(entry.runtime_type),
          backendModel: entry.model_id,
          size: "unknown",
          quantization: "unknown",
          context: 0,
          bestFor: entry.capabilities ?? [],
          status:
            entry.state === "connected"
              ? "ready"
              : entry.state === "degraded"
                ? "indexed"
                : "missing",
          ramEstimate: "unknown",
        };
      });

      const runtimes: ModelDetectionResult["runtimes"] = health.map((h) => ({
        name: h.label || h.runtime_id,
        path: h.base_url || h.runtime_id,
        type: "api",
        exists: h.state === "connected" || h.models.length > 0,
        status: h.state === "connected" ? "detected" : "missing",
      }));

      return {
        ok: true,
        detection: {
          scannedAt: new Date().toISOString(),
          runtimes,
          discoveredModels: localModels,
          summary: discovered.length
            ? `${discovered.length} model(s) discovered across ${runtimes.length} runtime(s)`
            : "No local model runtimes detected.",
        },
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  // Phase 3–6 model support bridge commands
  async listProviderRuntimes(): Promise<ProviderRuntimeProfile[]> {
    return bridgeInvoke<ProviderRuntimeProfile[]>("list_provider_runtimes");
  },
  async discoverInstalledModels(): Promise<DiscoveredModelEntry[]> {
    return bridgeInvoke<DiscoveredModelEntry[]>("discover_installed_models");
  },
  async getProviderHealth(runtimeId?: string): Promise<ProviderHealth[]> {
    return bridgeInvoke<ProviderHealth[]>("get_provider_health", { runtimeId });
  },
  async runModelProbe(runtimeId: string, modelId: string): Promise<ModelProbeResult> {
    return bridgeInvoke<ModelProbeResult>("run_model_probe", { runtimeId, modelId });
  },
  async getCompatibilityScores(options?: ScoreOptions): Promise<ModelCompatibilityScore[]> {
    const rows = await bridgeInvoke<BackendModelCompatibilityScore[]>(
      "get_model_compatibility_scores",
      options ?? {}
    );
    return rows.map(mapScore);
  },
  async pickBestLocalModel(options?: ScoreOptions): Promise<ModelCompatibilityScore | null> {
    const row = await bridgeInvoke<BackendModelCompatibilityScore | null>(
      "pick_best_local_model",
      options ?? {}
    );
    return row ? mapScore(row) : null;
  },
  async getAgentModelPolicies(): Promise<AgentModelPolicy[]> {
    const rows = await bridgeInvoke<BackendAgentModelPolicy[]>("get_agent_model_policies");
    return rows.map(mapAgentPolicy);
  },
  async getAllowedModelsForAgent(
    agentId: string,
    options?: ScoreOptions
  ): Promise<AgentScoredModel[]> {
    const rows = await bridgeInvoke<BackendAgentScoredModel[]>("get_allowed_models_for_agent", {
      agentId,
      ...(options ?? {}),
    });
    return rows.map(mapAgentScoredModel);
  },
  async validateAgentModel(agentId: string, modelId: string): Promise<AgentModelAllowance> {
    return bridgeInvoke<AgentModelAllowance>("validate_agent_model", { agentId, modelId });
  },
  async evaluateRecovery(
    runtimeId: string,
    state: string,
    modelId?: string,
    agentId?: string
  ): Promise<RecoveryEvaluation> {
    return bridgeInvoke<RecoveryEvaluation>("evaluate_recovery", {
      runtimeId,
      state,
      modelId,
      agentId,
    });
  },
  async recordRecoveryEvent(
    event: Omit<RecoveryEvent, "id" | "timestamp">
  ): Promise<RecoveryEvent> {
    return bridgeInvoke<RecoveryEvent>("record_recovery_event", event);
  },
  async getRecoveryEventLog(): Promise<RecoveryEvent[]> {
    const rows = await bridgeInvoke<BackendRecoveryEvent[]>("get_recovery_event_log");
    return rows.map(mapRecoveryEvent);
  },
};

/* ── AI ──────────────────────────────────────────────────────────────────── */

const offlineHealthFallback: AIProviderHealth[] = [
  {
    provider: "offline-draft",
    label: "Backend unreachable",
    available: false,
    endpoint: "",
    detail:
      "Offline fallback: cannot determine provider status. Start a local runtime or check the bridge connection.",
    checkedAt: new Date().toISOString(),
  },
];

function browserDraft(payload: AIChatPayload): AIChatResponse {
  const projectLine = payload.projectContext
    ? `Attached context: ${payload.projectContext.summary}`
    : "No project context attached yet.";
  return {
    ok: true,
    provider: "offline-draft",
    model: "offline-draft",
    latencyMs: 0,
    contextSources: payload.projectContext?.files.map((f) => f.path) ?? [],
    message: {
      id: `offline-fallback-${Date.now()}`,
      role: "assistant",
      content: [
        "[OFFLINE FALLBACK] No AI backend is currently reachable.",
        "",
        projectLine,
        "",
        "Recommended next action:",
        `1. Tighten the ask: ${payload.prompt.slice(0, 160)}`,
        "2. Attach project context if this is a codebase task.",
        "3. Start Ollama, LM Studio, or another configured provider.",
      ].join("\n"),
      createdAt: new Date().toISOString(),
      provider: "offline-draft",
      model: "offline-draft",
      latencyMs: 0,
    },
  };
}

export interface ChatStreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

const ai = {
  async health(): Promise<AIProviderHealth[]> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>("get_provider_health");
      const offline: AIProviderHealth = {
        provider: "offline-draft",
        label: "Offline Draft Engine",
        available: true,
        endpoint: "renderer-local",
        detail: "Always available",
        checkedAt: new Date().toISOString(),
      };
      const mapped = health.map((h): AIProviderHealth => {
        const connected = h.state === "connected";
        return {
          provider: runtimeTypeToProvider(h.runtime_type),
          label: h.label || h.runtime_id,
          available: connected,
          endpoint: h.base_url || h.runtime_id,
          detail: connected ? `${h.models.length} model(s) listed` : h.error || h.state,
          checkedAt: h.checked_at,
          latencyMs: Number(h.latency_ms),
        };
      });
      return [offline, ...mapped];
    } catch (_) {
      return offlineHealthFallback;
    }
  },
  async chat(payload: AIChatPayload): Promise<AIChatResponse> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.models) {
      const res = await neurodeck.models.runPrompt(
        payload.prompt,
        payload.provider === 'offline-draft' ? undefined : payload.provider,
        payload.model === "NeuroDraft" ? undefined : payload.model
      );
      if (!res.ok) {
        return browserDraft(payload);
      }
      const response = res.data;
      return {
        ok: true,
        provider: payload.provider,
        model: payload.model,
        latencyMs: res.durationMs || 0,
        contextSources: [],
        message: {
          id: `bridge-${Date.now()}`,
          role: "assistant",
          content: response?.text || response?.content || "",
          createdAt: new Date().toISOString(),
          provider: payload.provider,
          model: payload.model,
        },
      };
    }
    try {
      const response = await bridgeInvoke<{ text?: string; content?: string }>("send_command", {
        message: payload.prompt,
        provider: payload.provider === "offline-draft" ? undefined : payload.provider,
        model: payload.model === "NeuroDraft" ? undefined : payload.model,
        persona: payload.persona,
      });
      return {
        ok: true,
        provider: payload.provider,
        model: payload.model,
        latencyMs: 0,
        contextSources: [],
        message: {
          id: `bridge-${Date.now()}`,
          role: "assistant",
          content: response.text || response.content || "",
          createdAt: new Date().toISOString(),
          provider: payload.provider,
          model: payload.model,
        },
      };
    } catch (e) {
      return browserDraft(payload);
    }
  },
  async chatStream(payload: AIChatPayload, callbacks: ChatStreamCallbacks): Promise<void> {
    const { onToken, onDone, onError } = callbacks;

    // For offline-draft, bypass the bridge and return the draft immediately
    if (payload.provider === "offline-draft") {
      const draft = browserDraft(payload);
      if (draft.ok) onToken(draft.message.content);
      onDone();
      return;
    }

    const unsubToken = listenBridge("command_token", (msg: unknown) => {
      const token = (msg as Record<string, string>)?.token ?? "";
      if (token) onToken(token);
    });

    const unsubDone = listenBridge("command_done", () => {
      unsubToken();
      unsubDone();
      onDone();
    });

    const unsubError = listenBridge("command_error", (msg: unknown) => {
      const errorMsg = (msg as Record<string, string>)?.error ?? "Streaming error";
      unsubToken();
      unsubDone();
      unsubError();
      onError(errorMsg);
    });

    try {
      // Make sure the WebSocket is actually open before triggering the backend,
      // otherwise the streaming events can be emitted (and dropped) before we
      // are subscribed.
      await _waitForWsOpen();

      const neurodeck = (window as any).neurodeck;
      if (neurodeck?.models) {
        const res = await neurodeck.models.runPrompt(
          payload.prompt,
          payload.provider,
          payload.model === "NeuroDraft" ? undefined : payload.model
        );
        if (!res.ok) {
          throw new Error(res.error?.message || "Prompt execution failed");
        }
      } else {
        await bridgeInvoke<{ status: string }>("send_command", {
          message: payload.prompt,
          provider: payload.provider,
          model: payload.model === "NeuroDraft" ? undefined : payload.model,
          persona: payload.persona,
        });
      }
    } catch (e) {
      unsubToken();
      unsubDone();
      unsubError();
      onError(String(e));
    }
  },
  async setProvider(provider: string): Promise<void> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set("llm.provider", provider);
      if (!res.ok) throw new Error(res.error?.message || "Failed to set provider");
      return;
    }
    await bridgeInvoke("set_provider", { provider });
  },
  async setModel(model: string): Promise<void> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.settings) {
      const res = await neurodeck.settings.set("llm.model", model);
      if (!res.ok) throw new Error(res.error?.message || "Failed to set model");
      return;
    }
    await bridgeInvoke("set_model", { model });
  },
};

/* ── Agents ──────────────────────────────────────────────────────────────── */

const agents = {
  async run(payload: AgentRunRequest): Promise<AgentRunResponse> {
    try {
      const result = await bridgeInvoke<{ status: string; output?: string; error?: string }>(
        "agent_step",
        {
          agent_id: payload.agentId,
          prompt: payload.prompt,
        }
      );
      const run = {
        id: `agent-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: (result.error ? "failed" : "complete") as AIRunStatus,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        result: result.output || "",
        error: result.error,
        usedProjectContext: Boolean(payload.projectContext),
      };
      if (result.error) {
        return { ok: false, run, error: result.error };
      }
      return { ok: true, run };
    } catch (e) {
      const run = {
        id: `agent-failed-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: "failed" as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        error: String(e),
        usedProjectContext: Boolean(payload.projectContext),
      };
      return { ok: false, run, error: String(e) };
    }
  },
  async list() {
    return bridgeInvoke<
      Array<{ id: string; name: string; provider: string; model: string; description: string }>
    >("list_agents");
  },
  async getActiveId() {
    return bridgeInvoke<{ active_agent_id: string }>("get_active_agent_id");
  },
  async switchAgent(id: string) {
    return bridgeInvoke<{
      status: string;
      id: string;
      name: string;
      provider: string;
      model: string;
    }>("switch_agent", { id });
  },
};

/* ── Permissions ─────────────────────────────────────────────────────────── */

export type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  granted: string[];
  created_at: string;
};

export type PermissionRegistry = {
  profiles: PermissionProfile[];
  default_profile_id: string;
  agent_profile_map: Record<string, string>;
};

export type AgentPermissionProfile = {
  agent_id: string;
  profile_id: string;
  explicit: boolean;
};

const permissions = {
  async listProfiles(): Promise<PermissionRegistry> {
    return bridgeInvoke<PermissionRegistry>("list_permission_profiles");
  },
  async getAgentProfile(agentId: string): Promise<AgentPermissionProfile> {
    return bridgeInvoke<AgentPermissionProfile>("get_agent_permission_profile", { agent_id: agentId });
  },
  async setAgentProfile(agentId: string, profileId: string | null): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("set_agent_permission_profile", {
      agent_id: agentId,
      profile_id: profileId,
    });
  },
};

/* ── Sessions ────────────────────────────────────────────────────────────── */

const sessions = {
  async exportMarkdown(payload: ExportSessionPayload): Promise<SessionExportResponse> {
    try {
      const file = await bridgeInvoke<string>("export_session_markdown", { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async save(payload: SavedSessionPayload): Promise<SaveSessionResponse> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.save(payload);
      if (res.ok) return { ok: true, file: res.data };
      return { ok: false, error: res.error?.message || "Failed to save session" };
    }
    try {
      const file = await bridgeInvoke<string>("save_session", { payload });
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  async list(): Promise<string[]> {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.list();
      if (res.ok) return res.data || [];
      throw new Error(res.error?.message || "Failed to list sessions");
    }
    return bridgeInvoke<string[]>("list_sessions");
  },
  async listMeta(): Promise<any[]> {
    return bridgeInvoke<any[]>("list_sessions_meta");
  },
  async delete(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.delete(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to delete session");
    }
    return bridgeInvoke<{ status: string }>("delete_session", { id });
  },
  async rename(id: string, name: string) {
    return bridgeInvoke<void>("rename_session", { id, name });
  },
  async loadLatest() {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.create();
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to load latest session");
    }
    return bridgeInvoke<{ session_id: string; messages: string[] }>("load_latest_session");
  },
  async loadById(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.sessions) {
      const res = await neurodeck.sessions.load(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to load session");
    }
    return bridgeInvoke<{ session_id: string; messages: string[] }>("load_session_by_id", { id });
  },
};

/* ── Memory ──────────────────────────────────────────────────────────────── */

export interface MemoryRecord {
  id: string;
  content: string;
  metadata: Record<string, string>;
}

const memory = {
  async list(limit: number = 50, offset: number = 0) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.search("");
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to list memory");
    }
    return bridgeInvoke<{ records: MemoryRecord[]; count: number; total: number }>("memory_list", {
      limit,
      offset,
    });
  },
  async delete(id: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.delete(id);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to delete memory");
    }
    return bridgeInvoke<{ status: string }>("memory_delete", { id });
  },
  async pin(id: string, pinned: boolean) {
    return bridgeInvoke<{ status: string }>("memory_pin", { id, pinned });
  },
  async clear() {
    return bridgeInvoke<{ status: string }>("memory_clear");
  },
  async addFact(content: string) {
    const neurodeck = (window as any).neurodeck;
    if (neurodeck?.memory) {
      const res = await neurodeck.memory.write(content);
      if (res.ok) return res.data;
      throw new Error(res.error?.message || "Failed to add memory fact");
    }
    return bridgeInvoke<{ status: string; id: string }>("memory_add_fact", { content });
  },
};

/* ── Diagnostics ─────────────────────────────────────────────────────────── */

const offlineDiagnosticsFallback: DiagnosticsPayload = {
  platform: navigator.platform,
  arch: "unknown",
  electron: "unavailable",
  chrome: "unavailable",
  node: "unavailable",
  packaged: false,
  userData: "unavailable",
  storeFile: "unavailable",
  exportsDir: "unavailable",
  logCount: 0,
};

export type ConnectionMatrixEntry = {
  id: string;
  label: string;
  category: "api" | "ipc" | "lsp" | "storage" | "plugin" | "system";
  state: "connected" | "offline" | "warning" | "error" | "unprobed";
  latencyMs: number | null;
  requestCount: number;
  successCount: number;
  evidence: ConnectionEvidence[];
};

export type ConnectionEvidence = {
  requestId: string;
  timestamp: string;
  status: "passed" | "failed" | "skipped";
  summary: string;
  durationMs: number;
  bytesSent: number;
  bytesReceived: number;
  realTransportUsed: boolean;
};

function categoryForRuntimeType(type: string): ConnectionMatrixEntry["category"] {
  switch (type) {
    case "ollama":
    case "lm_studio":
    case "llama_cpp_server":
    case "openai_compatible_local":
    case "openai_compatible_remote":
    case "custom_http_provider":
      return "api";
    default:
      return "system";
  }
}

function stateFromHealth(state?: string): ConnectionMatrixEntry["state"] {
  switch (state) {
    case "connected":
      return "connected";
    case "degraded":
    case "recovering":
      return "warning";
    case "offline":
    case "missing_binary":
    case "missing_model":
      return "offline";
    case "error":
    case "crashed":
    case "auth_failed":
    case "rate_limited":
      return "error";
    default:
      return "unprobed";
  }
}

const diagnostics = {
  async get(): Promise<DiagnosticsPayload> {
    try {
      const health = await bridgeInvoke<{
        status?: string;
        provider?: string;
        model?: string;
        memory_doc_count?: number;
        plugin_count?: number;
      }>("get_system_health");
      return {
        platform: navigator.platform,
        arch: "unknown",
        electron: "unavailable",
        chrome: "unavailable",
        node: "unavailable",
        packaged: false,
        appVersion: "1.8.0",
        userData: "unavailable",
        storeFile: "unavailable",
        exportsDir: "unavailable",
        logCount: health.memory_doc_count ?? 0,
      };
    } catch (_) {
      return offlineDiagnosticsFallback;
    }
  },
  async runOnboardingDiagnostics(): Promise<OnboardingDiagnosticResult> {
    return bridgeInvoke<OnboardingDiagnosticResult>("run_onboarding_diagnostics");
  },
  async logs(): Promise<DiagnosticLog[]> {
    try {
      return await bridgeInvoke<DiagnosticLog[]>("get_logs");
    } catch (_) {
      return [];
    }
  },
  async securityReport(): Promise<SecurityReport> {
    try {
      return await bridgeInvoke<SecurityReport>("security_report");
    } catch (_) {
      return {
        keychain_ok: false,
        safe_mode: false,
        agent_workspace_only: false,
        permission_registry_count: 0,
      };
    }
  },
  async getCredentialStatus(): Promise<CredentialStatus> {
    try {
      return await bridgeInvoke<CredentialStatus>("get_credential_status");
    } catch (_) {
      return { gemini: false, huggingface: false, openai_compat: false };
    }
  },
  async exportBundle(): Promise<DiagnosticsBundleResponse> {
    try {
      const file = await bridgeInvoke<string>("generate_support_bundle");
      return { ok: true, file };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  async getConnectionMatrix(): Promise<{ ok: boolean; data: ConnectionMatrixEntry[] }> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>("get_provider_health");
      const data: ConnectionMatrixEntry[] = health.map((h) => {
        const latency = Number(h.latency_ms) || 0;
        const connected = h.state === "connected";
        const evidence: ConnectionEvidence = {
          requestId: `probe-${h.runtime_id}`,
          timestamp: h.checked_at || new Date().toISOString(),
          status: connected ? "passed" : "failed",
          summary: connected
            ? `${h.label || h.runtime_id} responded with ${h.models.length} model(s)`
            : h.error || `${h.label || h.runtime_id} is ${h.state}`,
          durationMs: latency,
          bytesSent: 0,
          bytesReceived: 0,
          realTransportUsed: true,
        };
        return {
          id: h.runtime_id,
          label: h.label || h.runtime_id,
          category: categoryForRuntimeType(h.runtime_type),
          state: stateFromHealth(h.state),
          latencyMs: latency || null,
          requestCount: 1,
          successCount: connected ? 1 : 0,
          evidence: [evidence],
        };
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, data: [] };
    }
  },

  async runHealthProbe(id?: string): Promise<{ ok: boolean; data: ConnectionMatrixEntry[] }> {
    try {
      const health = await bridgeInvoke<ProviderHealth[]>(
        "get_provider_health",
        id ? { runtimeId: id } : {}
      );
      const data: ConnectionMatrixEntry[] = health.map((h) => {
        const latency = Number(h.latency_ms) || 0;
        const connected = h.state === "connected";
        return {
          id: h.runtime_id,
          label: h.label || h.runtime_id,
          category: categoryForRuntimeType(h.runtime_type),
          state: stateFromHealth(h.state),
          latencyMs: latency || null,
          requestCount: 1,
          successCount: connected ? 1 : 0,
          evidence: [
            {
              requestId: `probe-${h.runtime_id}-${Date.now()}`,
              timestamp: h.checked_at || new Date().toISOString(),
              status: connected ? "passed" : "failed",
              summary: connected
                ? `${h.label || h.runtime_id} probe passed`
                : h.error || `${h.label || h.runtime_id} probe failed (${h.state})`,
              durationMs: latency,
              bytesSent: 0,
              bytesReceived: 0,
              realTransportUsed: true,
            },
          ],
        };
      });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, data: [] };
    }
  },

  subscribeConnectionEvents(
    _callback: (data: { id: string; connection: ConnectionMatrixEntry }) => void
  ): () => void {
    // The bridge currently does not emit real-time connection events over the
    // WebSocket. Returning a no-op keeps the UI stable; callers refresh via
    // getConnectionMatrix / runHealthProbe.
    return () => {};
  },

  async memoryUsage(): Promise<{ rss_mb: number }> {
    try {
      return await bridgeInvoke<{ rss_mb: number }>("get_memory_usage");
    } catch (_) {
      return { rss_mb: 0 };
    }
  },
  async geminiKeyStatus(): Promise<{ set: boolean }> {
    try {
      const key = await bridgeInvoke<string>("get_gemini_api_key");
      return { set: !!key };
    } catch (_) {
      return { set: false };
    }
  },
  async contextStats(): Promise<{ message_count: number; total_tokens: number }> {
    try {
      return await bridgeInvoke<{ message_count: number; total_tokens: number }>(
        "get_context_stats"
      );
    } catch (_) {
      return { message_count: 0, total_tokens: 0 };
    }
  },
};

/* ── Dependency Installer ────────────────────────────────────────────────── */

export interface DependencyStatus {
  ssh: boolean;
  ollama: boolean;
  tts: boolean;
}

export interface DependencyProgress {
  id: string;
  state: 'downloading' | 'installing' | 'verifying' | 'completed' | 'failed';
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  details?: string;
  error?: string;
}

const dependency = {
  async getStatus(): Promise<DependencyStatus> {
    if ((window as any).neurodeck?.dependency) {
      const res = await (window as any).neurodeck.dependency.getStatus();
      return res?.payload || { ssh: false, ollama: false, tts: false };
    }
    return { ssh: false, ollama: false, tts: false };
  },
  async install(id: string): Promise<{ success: boolean }> {
    if ((window as any).neurodeck?.dependency) {
      const res = await (window as any).neurodeck.dependency.install(id);
      return res?.payload || { success: false };
    }
    return { success: false };
  },
  async cancel(id: string): Promise<boolean> {
    if ((window as any).neurodeck?.dependency) {
      const res = await (window as any).neurodeck.dependency.cancel(id);
      return res?.payload || false;
    }
    return false;
  },
  onProgress(callback: (data: DependencyProgress) => void): () => void {
    if ((window as any).neurodeck?.dependency) {
      return (window as any).neurodeck.dependency.onProgress((data: any) => {
        callback(data);
      });
    }
    return () => {};
  }
};

/* ── Dashboard ───────────────────────────────────────────────────────────── */

const dashboard = {
  async stats(): Promise<DashboardStats> {
    return bridgeInvoke<DashboardStats>("get_dashboard_stats");
  },
};

/* ── Voice / STT ─────────────────────────────────────────────────────────── */

const voice = {
  async start(): Promise<{ ok: boolean }> {
    try {
      await bridgeInvoke<string>("start_recording");
      return { ok: true };
    } catch (_) {
      return { ok: false };
    }
  },
  async stop(): Promise<{ transcript: string }> {
    try {
      const result = await bridgeInvoke<string>("stop_recording");
      return { transcript: typeof result === "string" ? result : "" };
    } catch (_) {
      return { transcript: "" };
    }
  },
};

/* ── Terminal / PTY ──────────────────────────────────────────────────────── */

export type TerminalSpawnOptions = {
  cols?: number;
  rows?: number;
  args?: string[];
  cwd?: string;
  title?: string;
  profileId?: string;
  tabId?: string;
  paneId?: string;
};

const terminal = {
  async spawn(sessionId: string = "main_pty_session", shell?: string, options?: TerminalSpawnOptions) {
    return bridgeInvoke<{ success: boolean }>("pty_spawn", {
      id: sessionId,
      shell,
      cols: options?.cols,
      rows: options?.rows,
      args: options?.args,
      cwd: options?.cwd,
      title: options?.title,
      profileId: options?.profileId,
      tabId: options?.tabId,
      paneId: options?.paneId,
    });
  },
  async kill(sessionId: string = "main_pty_session") {
    return bridgeInvoke<{ success: boolean }>("pty_kill", { id: sessionId });
  },
  async write(sessionId: string, data: string) {
    return bridgeInvoke<{ success: boolean }>("pty_write", { id: sessionId, data });
  },
  async resize(sessionId: string, cols: number, rows: number) {
    return bridgeInvoke<{ success: boolean }>("pty_resize", { id: sessionId, cols, rows });
  },
  async listSessions() {
    const result = await bridgeInvoke<{ sessions: string[]; count: number }>("get_pty_sessions");
    return result.sessions ?? [];
  },
  async getSessionDetails(): Promise<TerminalSessionSummary[]> {
    try {
      const result = await bridgeInvoke<{ sessions: TerminalSessionSummary[]; count: number }>("get_terminal_sessions");
      return result.sessions ?? [];
    } catch (_) {
      return [];
    }
  },
  async getEnvironment(): Promise<TerminalEnvironmentReport> {
    try {
      const result = await bridgeInvoke<{ environment: TerminalEnvironmentReport }>("get_terminal_environment");
      return result.environment;
    } catch (_) {
      return {
        platform: navigator.platform,
        arch: "unknown",
        steamDeckHost: false,
        cwd: "",
        shell: "",
        probes: [],
        missingTools: [],
        readyProfiles: [],
        warnings: [],
      };
    }
  },
  async getProfiles(): Promise<TerminalProfileAvailability[]> {
    try {
      const result = await bridgeInvoke<{ profiles: TerminalProfileAvailability[] }>("get_terminal_environment");
      return result.profiles ?? [];
    } catch (_) {
      return [];
    }
  },
  async getDiagnostics(): Promise<TerminalDiagnosticsReport> {
    try {
      return await bridgeInvoke<TerminalDiagnosticsReport>("get_terminal_diagnostics");
    } catch (_) {
      const environment = await terminal.getEnvironment();
      return {
        sessionCount: 0,
        activeSessionCount: 0,
        activeSessions: [],
        environment,
        safetyLevel: "unknown" as TerminalCommandSafety["level"],
        warnings: [],
      };
    }
  },
  async classifyCommand(command: string, source: "user" | "assistant" | "palette" | "controller" | "history" = "palette") {
    try {
      return await bridgeInvoke<TerminalCommandSafety>("classify_terminal_command", { command, source });
    } catch (_) {
      return {
        level: "unknown" as const,
        reason: "Command classification unavailable.",
        source,
      };
    }
  },
};

/* ── Browser ─────────────────────────────────────────────────────────────── */

const browser = {
  async open(url: string) {
    if (window.electronAPI?.browserOpen) return window.electronAPI.browserOpen(url);
    return { success: false };
  },
  async navigate(url: string) {
    if (window.electronAPI?.browserNavigate) return window.electronAPI.browserNavigate(url);
    return { success: false };
  },
  async back() {
    if (window.electronAPI?.browserBack) return window.electronAPI.browserBack();
    return { success: false };
  },
  async forward() {
    if (window.electronAPI?.browserForward) return window.electronAPI.browserForward();
    return { success: false };
  },
  async getUrl() {
    if (window.electronAPI?.browserGetUrl) return window.electronAPI.browserGetUrl();
    return { url: "" };
  },
  async hide() {
    if (window.electronAPI?.browserHide) return window.electronAPI.browserHide();
    return { success: false };
  },
  async show() {
    if (window.electronAPI?.browserShow) return window.electronAPI.browserShow();
    return { success: false };
  },
  async setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    if (window.electronAPI?.browserSetBounds) return window.electronAPI.browserSetBounds(bounds);
    return { success: false };
  },
  async getContent() {
    if (window.electronAPI?.browserGetContent) return window.electronAPI.browserGetContent();
    return { content: "" };
  },
  async saveToMemory() {
    if (window.electronAPI?.browserSaveToMemory) return window.electronAPI.browserSaveToMemory();
    return { success: false };
  },
  async reload() {
    if (window.electronAPI?.browserReload) return window.electronAPI.browserReload();
    return { success: false };
  },
  async zoomIn() {
    if (window.electronAPI?.browserZoomIn) return window.electronAPI.browserZoomIn();
    return { zoomLevel: 0 };
  },
  async zoomOut() {
    if (window.electronAPI?.browserZoomOut) return window.electronAPI.browserZoomOut();
    return { zoomLevel: 0 };
  },
  async zoomReset() {
    if (window.electronAPI?.browserZoomReset) return window.electronAPI.browserZoomReset();
    return { zoomLevel: 0 };
  },
  async find(text: string) {
    if (window.electronAPI?.browserFind) return window.electronAPI.browserFind(text);
    return { success: false };
  },
  async stopFind() {
    if (window.electronAPI?.browserStopFind) return window.electronAPI.browserStopFind();
    return { success: false };
  },

  // Bookmarks
  async addBookmark(title: string, url: string) {
    if (window.electronAPI?.browserBookmarkAdd)
      return window.electronAPI.browserBookmarkAdd(title, url);
    return { success: false, bookmarks: [] };
  },
  async removeBookmark(url: string) {
    if (window.electronAPI?.browserBookmarkRemove)
      return window.electronAPI.browserBookmarkRemove(url);
    return { success: false, bookmarks: [] };
  },
  async listBookmarks() {
    if (window.electronAPI?.browserBookmarkList) return window.electronAPI.browserBookmarkList();
    return { bookmarks: [] };
  },

  // History
  async listHistory() {
    if (window.electronAPI?.browserHistoryList) return window.electronAPI.browserHistoryList();
    return { history: [] };
  },
  async clearHistory() {
    if (window.electronAPI?.browserHistoryClear) return window.electronAPI.browserHistoryClear();
    return { success: false };
  },

  // Reader mode
  async readerMode() {
    if (window.electronAPI?.browserReaderMode) return window.electronAPI.browserReaderMode();
    return { success: false, title: "", text: "", url: "" };
  },

  // Ad blocker
  async toggleAdblock() {
    if (window.electronAPI?.browserAdblockToggle) return window.electronAPI.browserAdblockToggle();
    return { enabled: false };
  },
  async getAdblockStatus() {
    if (window.electronAPI?.browserAdblockStatus) return window.electronAPI.browserAdblockStatus();
    return { enabled: false };
  },

  onBrowserEvent(callback: (data: { event: string; payload: Record<string, unknown> }) => void) {
    if (window.electronAPI?.onBrowserEvent) return window.electronAPI.onBrowserEvent(callback);
    return () => {};
  },
};

/* ── IDE / Workspace Files ───────────────────────────────────────────────── */

const ide = {
  async listWorkspaceFiles(path?: string) {
    return bridgeInvoke<{
      files: Array<{ name: string; path: string; is_dir: boolean; size: number }>;
      count: number;
    }>("list_workspace_files", path ? { path } : undefined);
  },
  async readWorkspaceFile(path: string) {
    return bridgeInvoke<{ path: string; content: string; bytes: number }>("read_workspace_file", {
      path,
    });
  },
  async writeWorkspaceFile(path: string, content: string) {
    return bridgeInvoke<{ status: string; path: string; bytes: number }>("write_workspace_file", {
      path,
      content,
    });
  },
  async createWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string; path: string }>("create_workspace_file", { path });
  },
  async deleteWorkspaceFile(path: string) {
    return bridgeInvoke<{ status: string }>("delete_workspace_file", { path });
  },

  async detectProject(workspacePath: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.detectProject) return nd.ide.detectProject(workspacePath);
    return {
      rootPath: workspacePath,
      detectedLanguages: [],
      packageManager: "none",
      hasGit: false,
      configFiles: [],
      availableScripts: {},
      detectedAt: new Date().toISOString(),
    };
  },

  async getPredictions(
    filePath: string,
    languageId: string,
    cursorLine: number,
    cursorChar: number,
    diagnosticsCount = 0,
    snippetIds: string[] = [],
    commandTemplates: unknown[] = [],
    lspCompletions: unknown[] = []
  ) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.getPredictions) {
      return nd.ide.getPredictions(
        filePath,
        languageId,
        cursorLine,
        cursorChar,
        diagnosticsCount,
        snippetIds,
        commandTemplates,
        lspCompletions
      );
    }
    return [];
  },

  async runCommand(
    command: string,
    args: string[],
    cwd: string,
    safety: string,
    label: string,
    commandId?: string
  ) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.runCommand) return nd.ide.runCommand(command, args, cwd, safety, label, commandId);
    throw new Error("ide.runCommand not available — Electron preload required");
  },

  async cancelCommand(commandId: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.cancelCommand) return nd.ide.cancelCommand(commandId);
    return { commandId, cancelled: false };
  },

  async getCommandHistory() {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.getCommandHistory) return nd.ide.getCommandHistory();
    return [];
  },

  async applySnippet(snippetId: string, languageId: string) {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.applySnippet) return nd.ide.applySnippet(snippetId, languageId);
    return { snippetId, acknowledged: true };
  },

  onCommandOutput(
    callback: (data: { commandId: string; type: "stdout" | "stderr"; data: string }) => void
  ): () => void {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.onCommandOutput) return nd.ide.onCommandOutput(callback);
    return () => {};
  },

  onCommandExit(
    callback: (data: { commandId: string; exitCode: number | null }) => void
  ): () => void {
    const nd = (window as any).neurodeck;
    if (nd?.ide?.onCommandExit) return nd.ide.onCommandExit(callback);
    return () => {};
  },
};

/* ── Plugins ─────────────────────────────────────────────────────────────── */

export interface PluginInfo {
  name: string;
  file_name: string;
  enabled: boolean;
  id: string | null;
  author: string | null;
  version: string | null;
  description: string | null;
  tags: string[];
  marketplace: boolean;
  permissions: string[];
}

const plugins = {
  async list() {
    return bridgeInvoke<{ plugins: PluginInfo[]; count: number; enabled: number }>("list_plugins");
  },
  async toggle(fileName: string, enabled: boolean) {
    return bridgeInvoke<{ status: string; file_name: string }>("toggle_plugin", {
      file_name: fileName,
      enabled,
    });
  },
  async validate(fileName: string) {
    return bridgeInvoke<{
      file_name: string;
      passed: boolean;
      warnings: string[];
      errors: string[];
    }>("validate_plugin", { file_name: fileName });
  },
  async installFromUrl(url: string) {
    return bridgeInvoke<{ status: string; url: string }>("install_plugin", { url });
  },
  async installFromRegistry(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>("install_plugin_from_registry", {
      plugin_id: pluginId,
    });
  },
  async uninstall(pluginId: string) {
    return bridgeInvoke<{ status: string; plugin_id: string }>("uninstall_plugin", {
      plugin_id: pluginId,
    });
  },
  async reload() {
    return bridgeInvoke<{ status: string }>("reload_plugins");
  },
};

/* ── Remote Control ──────────────────────────────────────────────────────── */

const remote = {
  async start(port: number = 9090) {
    return bridgeInvoke<{ success: boolean; url?: string; pin?: string }>("start_remote_server", {
      port,
    });
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>("stop_remote_server");
  },
  async getInfo() {
    return bridgeInvoke<{
      running: boolean;
      url?: string;
      clients?: number;
      pin?: string;
      ip?: string;
      port?: number;
      ttl_seconds_remaining?: number;
    }>("get_remote_server_info");
  },
};

/* ── Canvas / Code Execution ─────────────────────────────────────────────── */

export type CodeLang = "python" | "bash" | "powershell" | "javascript" | "js" | "html";

const canvas = {
  async execStream(code: string, lang: CodeLang) {
    return bridgeInvoke<{ success: boolean; exec_id?: string }>("exec_code_stream", { code, lang });
  },
  async cancelExec() {
    return bridgeInvoke<{ success: boolean }>("cancel_exec");
  },
};

/* ── Scheduler ───────────────────────────────────────────────────────────── */

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  goal: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

const scheduler = {
  async listTasks(): Promise<ScheduledTask[]> {
    return bridgeInvoke<ScheduledTask[]>("list_scheduled_tasks");
  },
  async addTask(task: Omit<ScheduledTask, "id">): Promise<ScheduledTask> {
    return bridgeInvoke<ScheduledTask>("add_scheduled_task", task);
  },
  async deleteTask(id: string) {
    return bridgeInvoke<{ success: boolean }>("delete_scheduled_task", { id });
  },
  async toggleTask(id: string) {
    return bridgeInvoke<{ success: boolean; enabled: boolean }>("toggle_scheduled_task", { id });
  },
  async runTaskNow(id: string) {
    return bridgeInvoke<{ success: boolean }>("run_task_now", { id });
  },
};

/* ── Git ─────────────────────────────────────────────────────────────────── */

export interface GitRepo {
  path: string;
  name: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitFile {
  path: string;
  status: "staged" | "unstaged" | "untracked";
}

const git = {
  async listRepos(): Promise<GitRepo[]> {
    return bridgeInvoke<GitRepo[]>("git_list_repos");
  },
  async openRepo(path: string) {
    return bridgeInvoke<{ success: boolean }>("git_open_repo", { path });
  },
  async status() {
    return bridgeInvoke<{ staged: GitFile[]; unstaged: GitFile[]; untracked: GitFile[] }>(
      "git_status"
    );
  },
  async log(limit: number = 50) {
    return bridgeInvoke<GitCommit[]>("git_log", { limit });
  },
  async branchList() {
    return bridgeInvoke<GitBranch[]>("git_branch_list");
  },
  async branchCreate(name: string) {
    return bridgeInvoke<{ success: boolean }>("git_branch_create", { name });
  },
  async branchCheckout(name: string) {
    return bridgeInvoke<{ success: boolean }>("git_branch_checkout", { name });
  },
  async stage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>("git_stage", { files });
  },
  async unstage(files: string[]) {
    return bridgeInvoke<{ success: boolean }>("git_unstage", { files });
  },
  async commit(message: string) {
    return bridgeInvoke<{ success: boolean; hash?: string }>("git_commit", { message });
  },
  async diff(file?: string) {
    return bridgeInvoke<{ diff: string }>("git_diff", { file });
  },
  async push(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>("git_push", { remote, branch });
  },
  async pull(remote?: string, branch?: string) {
    return bridgeInvoke<{ success: boolean }>("git_pull", { remote, branch });
  },
};

/* ── Prompt Lab ──────────────────────────────────────────────────────────── */

const promptLab = {
  async generateJPE(prompt: string, level: "grade8" | "college" | "expert" = "college") {
    return bridgeInvoke<{ explanation: string }>("generate_jpe_explanation_with_level", {
      prompt,
      level,
    });
  },
  async optimizePrompt(prompt: string) {
    return bridgeInvoke<{ optimized: string }>("optimize_raw_prompt", { prompt });
  },
};

/* ── Docs / Knowledge Base ───────────────────────────────────────────────── */

export interface PromptSlot {
  id: string;
  label: string;
  required: boolean;
  kind: "text" | "textarea" | "select" | "file" | "multi";
  default?: string;
  options?: string[];
  suggestions?: string[];
}

export interface PromptTemplate {
  id: string;
  pack_id: string;
  title: string;
  description: string;
  category: string;
  agent_hint: string;
  slots: PromptSlot[];
  template: string;
  risk_level: string;
  intent?: string;
  role?: string;
  autocomplete_terms?: string[];
  requires_confirmation?: boolean;
}

export interface PromptPack {
  id: string;
  title: string;
  description: string;
  templates?: PromptTemplate[];
}

export interface PromptPreview {
  valid: boolean;
  missing_slots: string[];
  errors: string[];
  rendered_prompt: string | null;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  template_id?: string;
  pack_id?: string;
  slot_values?: Record<string, string>;
}

export interface MacroStep {
  kind: string;
  timestamp: string;
  payload: Record<string, unknown>;
  requires_confirmation?: boolean;
}

export interface MacroDefinition {
  id: string;
  name: string;
  created_at: string;
  steps: MacroStep[];
  risk_level: string;
}

export interface Suggestion {
  id: string;
  label: string;
  source: string;
  insert_text: string;
  score: number;
}

const promptDrive = {
  async listPacks() {
    return bridgeInvoke<PromptPack[]>("promptdrive_list_packs");
  },
  async listTemplates(packId?: string) {
    return bridgeInvoke<PromptTemplate[]>("promptdrive_list_templates", { pack_id: packId });
  },
  async getTemplate(templateId: string) {
    return bridgeInvoke<PromptTemplate>("promptdrive_get_template", { template_id: templateId });
  },
  async previewPrompt(templateId: string, slotValues: Record<string, string>) {
    return bridgeInvoke<PromptPreview>("promptdrive_preview_prompt", {
      template_id: templateId,
      slot_values: slotValues,
    });
  },
  async executePrompt(templateId: string, slotValues: Record<string, string>, prompt: string) {
    return bridgeInvoke<{ status: string; validation?: PromptPreview }>(
      "promptdrive_execute_prompt",
      {
        template_id: templateId,
        slot_values: slotValues,
        prompt,
      }
    );
  },
  async savePrompt(payload: {
    title: string;
    template_id?: string;
    pack_id?: string;
    slot_values: Record<string, string>;
    prompt: string;
  }) {
    return bridgeInvoke<SavedPrompt>("promptdrive_save_prompt", payload);
  },
  async listSavedPrompts() {
    return bridgeInvoke<SavedPrompt[]>("promptdrive_list_saved_prompts");
  },
  async macroStart() {
    return bridgeInvoke<{ recording_id: string; status: string }>("promptdrive_macro_start");
  },
  async macroStop(recordingId: string, name: string, steps: MacroStep[]) {
    return bridgeInvoke<MacroDefinition>("promptdrive_macro_stop", {
      recording_id: recordingId,
      name,
      steps,
    });
  },
  async macroExecute(macroId: string) {
    return bridgeInvoke<{ status: string; safe_replay: boolean; macro: MacroDefinition }>(
      "promptdrive_macro_execute",
      { macro_id: macroId }
    );
  },
  async listMacros() {
    return bridgeInvoke<MacroDefinition[]>("promptdrive_list_macros");
  },
  async deleteMacro(macroId: string) {
    return bridgeInvoke<{ status: string; macro_id: string }>("promptdrive_delete_macro", {
      macro_id: macroId,
    });
  },
  async getSuggestions(query: string, templateId?: string, slotId?: string) {
    return bridgeInvoke<Suggestion[]>("promptdrive_get_suggestions", {
      query,
      template_id: templateId,
      slot_id: slotId,
    });
  },
};

const docs = {
  async indexDirectory(path: string) {
    const res = await bridgeInvoke<{ status: string }>("index_directory", { path });
    return { success: res.status === "indexing", count: undefined };
  },
  async getDefaultPath() {
    const res = await bridgeInvoke<{ path: string; exists: boolean }>("get_default_docs_path", {});
    return res;
  },
  async getIndexedDocs() {
    const paths = await bridgeInvoke<string[]>("get_indexed_docs");
    return {
      docs: paths.map((p, i) => ({
        id: `doc-${i}`,
        title: p.replace(/\\/g, "/").split("/").pop() || p,
        path: p,
      })),
    };
  },
  async searchDocs(query: string) {
    const raw = await bridgeInvoke<Array<{ file: string; snippet: string; score: number }>>(
      "search_docs_semantic",
      { query }
    );
    return {
      results: raw.map((r, i) => ({
        id: `result-${i}`,
        title: r.file.replace(/\\/g, "/").split("/").pop() || r.file,
        snippet: r.snippet,
        score: r.score,
      })),
    };
  },
  async clearIndex() {
    const res = await bridgeInvoke<{ status: string }>("clear_doc_index");
    return { success: res.status === "cleared" };
  },
};

/* ── Share / Transfer ────────────────────────────────────────────────────── */

const share = {
  async getPeers() {
    return bridgeInvoke<Array<{ id: string; name: string; address: string }>>(
      "get_discovered_peers"
    );
  },
  async getActiveTransfers() {
    return bridgeInvoke<Array<{ id: string; filename: string; progress: number; status: string }>>(
      "get_active_transfers"
    );
  },
  async startTransfer(filePath: string, peerId?: string) {
    return bridgeInvoke<{ success: boolean; transfer_id?: string }>("start_file_transfer", {
      file_path: filePath,
      peer_id: peerId,
    });
  },
};

/* ── Tunnel ──────────────────────────────────────────────────────────────── */

const tunnel = {
  async start() {
    return bridgeInvoke<{ success: boolean }>("start_tunnel_server");
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>("stop_tunnel_server");
  },
  async sendRequest(command: string) {
    return bridgeInvoke<{ output: string }>("send_tunnel_request", { command });
  },
};

/* ── API Lab ─────────────────────────────────────────────────────────────── */

export interface ApiRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

const apiLab = {
  async sendRequest(req: ApiRequest): Promise<ApiResponse> {
    return bridgeInvoke<ApiResponse>("api_request", req);
  },
  async listCollections() {
    return bridgeInvoke<string[]>("api_list_collections");
  },
  async saveCollection(name: string, requests: ApiRequest[]) {
    return bridgeInvoke<{ success: boolean }>("api_save_collection", { name, requests });
  },
  async importCurl(curl: string) {
    return bridgeInvoke<ApiRequest>("api_curl_import", { curl });
  },
};

export type WorkflowDoc = {
  name: string;
  nodes: Array<{ id: string; type: string; config?: Record<string, unknown> }>;
  edges: Array<{ id: string; from: string; fromPort?: string; to: string }>;
};

export type WorkflowSummary = { name: string };

/* ── Workflow / Orchestrator ─────────────────────────────────────────────── */

const workflow = {
  async list(): Promise<WorkflowSummary[]> {
    const res = await bridgeInvoke<{ workflows: string[] }>("list_workflows");
    return (res.workflows ?? []).map((name) => ({ name }));
  },
  async load(name: string): Promise<WorkflowDoc> {
    const res = await bridgeInvoke<{ name: string; json: string }>("load_workflow", { name });
    return JSON.parse(typeof res.json === "string" ? res.json : "{}") as WorkflowDoc;
  },
  async save(name: string, doc: WorkflowDoc): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("save_workflow", {
      name,
      json: JSON.stringify(doc),
    });
  },
  async delete(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("delete_workflow", { name });
  },
  async run(name: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("workflow_run", { name });
  },
  async importJson(json: string): Promise<{ status: string; name: string }> {
    return bridgeInvoke<{ status: string; name: string }>("workflow_import", { json });
  },
  async export(name: string): Promise<{ name: string; ndwf: string }> {
    return bridgeInvoke<{ name: string; ndwf: string }>("workflow_export", { name });
  },
};

const orchestrator = {
  async startTask(goal: string) {
    return bridgeInvoke<{ task_id: string }>("start_orchestrated_task", { goal });
  },
  async getStatus(taskId: string) {
    return bridgeInvoke<{ status: string; steps: unknown[] }>("get_orchestration_status", {
      task_id: taskId,
    });
  },
  async stop(taskId: string) {
    return bridgeInvoke<{ success: boolean }>("stop_orchestration", { task_id: taskId });
  },
};

/* ── SSH Credentials ─────────────────────────────────────────────────────── */

const ssh = {
  async saveCredential(host: string, user: string, password?: string, keyPath?: string) {
    return bridgeInvoke<{ success: boolean }>("save_ssh_credential", {
      host,
      user,
      password,
      key_path: keyPath,
    });
  },
  async getCredential(host: string) {
    return bridgeInvoke<{ user?: string; has_key?: boolean; key_path?: string }>("get_ssh_credential", { host });
  },
};

/* ── Torrent ─────────────────────────────────────────────────────────────── */

export interface TorrentItem {
  id: string;
  name: string;
  source_kind: string;
  source_display: string;
  source_value: string;
  status: string;
  progress_pct: number;
  pieces_done: number;
  pieces_total: number;
  peers: number;
  trackers: number;
  paused: boolean;
  completed: boolean;
  metadata_known: boolean;
  download_root: string;
  save_path: string | null;
  added_at_utc: string;
  info_hash: string;
  download_rate_bps: number;
  upload_rate_bps: number;
  downloaded_bytes?: number;
  uploaded_bytes?: number;
  bytes_remaining?: number;
  eta_seconds?: number | null;
  ratio?: number | null;
}

export interface TorrentClientStatus {
  download_root: string;
  torrent_count: number;
  torrents: TorrentItem[];
}

const torrent = {
  async list(): Promise<TorrentItem[]> {
    return bridgeInvoke<TorrentItem[]>("torrent_list");
  },
  async add(magnetOrPath: string) {
    return bridgeInvoke<{ success: boolean; id?: string }>("torrent_add", { source: magnetOrPath });
  },
  async pause(id: string) {
    return bridgeInvoke<{ success: boolean }>("torrent_pause", { id });
  },
  async resume(id: string) {
    return bridgeInvoke<{ success: boolean }>("torrent_resume", { id });
  },
  async remove(id: string, deleteData?: boolean) {
    return bridgeInvoke<{ success: boolean }>("torrent_remove", {
      id,
      delete_data: deleteData ?? false,
    });
  },
  async pauseAll() {
    return bridgeInvoke<{ success: boolean }>("torrent_pause_all");
  },
  async resumeAll() {
    return bridgeInvoke<{ success: boolean }>("torrent_resume_all");
  },
  async getDownloadRoot() {
    return bridgeInvoke<{ root: string }>("torrent_get_download_root");
  },
  async getStatus(): Promise<TorrentClientStatus> {
    return bridgeInvoke<TorrentClientStatus>("torrent_get_status");
  },
  async openDownloadRoot() {
    return bridgeInvoke<{ status: string }>("torrent_open_download_root");
  },
  async openSavePath(id: string) {
    return bridgeInvoke<{ status: string }>("torrent_open_save_path", { id });
  },
};

/* ── CLI Maker ───────────────────────────────────────────────────────────── */

const cliMaker = {
  async list(): Promise<CliCommandDef[]> {
    return bridgeInvoke<CliCommandDef[]>("cli_list_commands");
  },
  async create(def: CliCommandDef): Promise<{ id: string }> {
    return bridgeInvoke<{ id: string }>("cli_create_command", { def: JSON.stringify(def) });
  },
  async update(id: string, def: CliCommandDef): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("cli_update_command", { id, def: JSON.stringify(def) });
  },
  async delete(id: string): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("cli_delete_command", { id });
  },
  async run(id: string, args: string = ""): Promise<{ output: string }> {
    return bridgeInvoke<{ output: string }>("cli_run_command", { id, args });
  },
  async exportLua(id: string): Promise<{ lua: string }> {
    return bridgeInvoke<{ lua: string }>("cli_export_lua", { id });
  },
  async saveAsPlugin(id: string): Promise<{ path: string }> {
    return bridgeInvoke<{ path: string }>("cli_maker_save_plugin", { id });
  },
  async exportScript(id: string, format: string): Promise<{ path: string }> {
    return bridgeInvoke<{ path: string }>("cli_maker_export", { id, format });
  },
  async importLua(path: string): Promise<CliCommandDef[]> {
    return bridgeInvoke<CliCommandDef[]>("cli_import_lua", { path });
  },
};

/* ── Exported API surface (matches v6 neurodeckApi exactly) ──────────────── */

export async function getInitialState() {
  return bridgeInvoke<{
    model: string;
    provider: string;
    active_agent_id: string;
    session_id: string;
    active_persona: string;
    memory_status: string;
    tool_status: ToolStatus;
    boot_health_status: string;
    boot_health_summary: string;
    boot_health_recovered_count: string;
    boot_health_warning_count: string;
    game_name: string;
    game_app_id: number;
    game_running: string;
    active_theme_name: string | null;
  }>("get_initial_state");
}

export async function getStatusBarState(): Promise<StatusBarState> {
  return bridgeInvoke<StatusBarState>("get_status_bar_state");
}

export async function setTheme(name: string): Promise<{ active_theme_name: string }> {
  return bridgeInvoke<{ active_theme_name: string }>("set_theme", { name });
}

export { bridgeInvoke };

export const neurodeckApi = {
  getInitialState,
  getStatusBarState,
  setTheme,
  store,
  projects,
  dashboard,
  models,
  ai,
  voice,
  agents,
  permissions,
  sessions,
  memory,
  diagnostics,
  terminal,
  browser,
  ide,
  plugins,
  remote,
  canvas,
  scheduler,
  git,
  promptLab,
  promptDrive,
  docs,
  share,
  tunnel,
  apiLab,
  workflow,
  orchestrator,
  ssh,
  torrent,
  cliMaker,
  dependency,
};
