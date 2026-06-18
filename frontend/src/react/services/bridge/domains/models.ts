import type { AgentModelPolicy, ModelDetectionResult } from "../../../types/neurodeck";
import type { ProviderRuntimeProfile } from "../../../../shared/contracts/models.contracts";
import { bridgeInvoke } from "../http";
import {
  mapAgentPolicy,
  mapAgentScoredModel,
  mapRecoveryEvent,
  mapScore,
  runtimeTypeToProvider,
} from "../mappers";
import type {
  BackendAgentModelPolicy,
  BackendAgentScoredModel,
  BackendModelCompatibilityScore,
  BackendRecoveryEvent,
} from "../mappers";

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

export type AgentScoredModel = ModelCompatibilityScore & {
  agentPreferred: boolean;
  policyAllowed: boolean;
  policyReason: string;
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

export const models = {
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
