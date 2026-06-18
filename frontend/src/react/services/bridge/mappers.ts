import type {
  AIProvider,
  AgentModelPolicy,
  ModelCompatibilityScore,
  RecoveryEvent,
} from "../../types/neurodeck";
import type { AgentScoredModel, ConnectionMatrixEntry } from "../bridgeAdapter";

export type BackendAgentModelPolicy = {
  agent_id: string;
  preferred_models: string[];
  allowed_model_capabilities: string[];
  blocked_model_families: string[];
  minimum_compatibility_tier: string;
  allow_heavy_models: boolean;
  allow_remote_fallback: boolean;
};

export type BackendModelCompatibilityScore = {
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

export type BackendAgentScoredModel = BackendModelCompatibilityScore & {
  agent_preferred: boolean;
  policy_allowed: boolean;
  policy_reason: string;
};

export type BackendRecoveryEvent = {
  id: string;
  timestamp: string;
  runtime_id: string;
  model_id?: string;
  state: string;
  action: string;
  allowed: boolean;
  reason: string;
};

export function mapAgentPolicy(p: BackendAgentModelPolicy): AgentModelPolicy {
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

export function mapScore(s: BackendModelCompatibilityScore): ModelCompatibilityScore {
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

export function mapAgentScoredModel(m: BackendAgentScoredModel): AgentScoredModel {
  return {
    ...mapScore(m),
    agentPreferred: m.agent_preferred,
    policyAllowed: m.policy_allowed,
    policyReason: m.policy_reason,
  };
}

export function mapRecoveryEvent(e: BackendRecoveryEvent): RecoveryEvent {
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

export function categoryForRuntimeType(type: string): ConnectionMatrixEntry["category"] {
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

export function stateFromHealth(state?: string): ConnectionMatrixEntry["state"] {
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
