/**
 * Model/provider contracts shared between renderer and main-process services.
 * These types describe the shape of data, not runtime behavior.
 */

export type ModelCompatibilityTier =
  | 'deck_default'
  | 'deck_balanced'
  | 'deck_heavy'
  | 'remote_or_docked_only'
  | 'unsupported'
  | 'unknown';

export type ModelCapability =
  | 'chat'
  | 'completion'
  | 'reasoning'
  | 'coding'
  | 'tool_calling'
  | 'vision'
  | 'embedding'
  | 'reranking'
  | 'summarization'
  | 'translation'
  | 'long_context';

export type ParameterClass =
  | 'sub_1b'
  | '1b'
  | '1_5b'
  | '2b'
  | '3b'
  | '4b'
  | '7b'
  | '8b'
  | '12b'
  | '14b'
  | '27b'
  | '30b_plus'
  | 'unknown';

export type Quantization = 'Q4_K_M' | 'Q4_K_S' | 'Q5_K_M' | 'Q8_0' | 'unknown';

export type PressureLevel = 'low' | 'medium' | 'high' | 'extreme' | 'unknown';

export type SupportedModelProfile = {
  id: string;
  family: string;
  displayName: string;
  providerModelIds: string[];
  parameterClass: ParameterClass;
  recommendedQuantization: Quantization;
  compatibilityTier: ModelCompatibilityTier;
  capabilities: ModelCapability[];
  steamDeckPolicy: {
    allowedLocal: boolean;
    defaultLocal: boolean;
    requiresOptIn: boolean;
    remoteRecommended: boolean;
    maxRecommendedContextTokens: number;
    expectedMemoryPressure: PressureLevel;
    expectedThermalPressure: PressureLevel;
    notes: string[];
  };
  healthRequirements: {
    providerMustListModel: boolean;
    mustPassTinyPrompt: boolean;
    mustSupportStreaming?: boolean;
    mustSupportTools?: boolean;
  };
};

export type ProviderRuntimeType =
  | 'ollama'
  | 'lm_studio'
  | 'llama_cpp_server'
  | 'openai_compatible_local'
  | 'openai_compatible_remote'
  | 'custom_http_provider'
  | 'disabled_provider';

export type ProviderConnectionState =
  | 'unknown'
  | 'not_configured'
  | 'starting'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'offline'
  | 'missing_binary'
  | 'missing_model'
  | 'auth_failed'
  | 'rate_limited'
  | 'crashed'
  | 'blocked'
  | 'error'
  | 'recovering';

export type ProviderRuntimeProfile = {
  id: string;
  label: string;
  type: ProviderRuntimeType;
  baseUrl?: string;
  localOnly: boolean;
  steamDeckRecommended: boolean;
  endpoints: {
    health?: string;
    listModels?: string;
    chat?: string;
    generate?: string;
    embeddings?: string;
    ps?: string;
  };
  auth: {
    required: boolean;
    envVars: string[];
    headerName?: string;
  };
  supports: {
    modelListing: boolean;
    chat: boolean;
    streaming: boolean;
    embeddings: boolean;
    tools: boolean;
    vision: boolean;
    cancellation: boolean;
  };
  selfHealing: {
    canRestartService: boolean;
    canReloadModel: boolean;
    canRetryRequest: boolean;
    canFailover: boolean;
    maxRecoveryAttempts: number;
  };
};

export type ModelProbeType =
  | 'provider_ping'
  | 'model_list'
  | 'model_show'
  | 'tiny_prompt'
  | 'stream_probe'
  | 'embedding_probe'
  | 'tool_probe'
  | 'runtime_process_check'
  | 'self_healing_recovery'
  | 'failover_route';

export type ProbeStatus = 'passed' | 'failed' | 'skipped' | 'blocked';

export type ModelConnectionEvidence = {
  requestId: string;
  timestamp: string;
  providerId: string;
  providerType: ProviderRuntimeType;
  modelId?: string;
  probe: ModelProbeType;
  status: ProbeStatus;
  realTransportUsed: boolean;
  mockDataDetected: boolean;
  durationMs: number;
  bytesSent: number;
  bytesReceived: number;
  source: string;
  target: string;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
    userAction?: string;
  };
};

export type DiscoveredModel = {
  id: string;
  name: string;
  provider: string;
  providerType: ProviderRuntimeType;
  size?: string;
  quantization?: Quantization;
  context?: number;
  bestFor?: string[];
  status: 'ready' | 'indexed' | 'disabled' | 'missing' | 'unknown';
  ramEstimate?: string;
  lastVerifiedAt?: string;
};

export type ModelDetectionResult = {
  scannedAt: string;
  runtimes: Array<{
    name: string;
    path: string;
    type: 'api' | 'filesystem' | 'process';
    exists: boolean;
    status: string;
  }>;
  discoveredModels: DiscoveredModel[];
  summary: string;
};

export type SteamDeckModelScore = {
  modelId: string;
  tier: ModelCompatibilityTier;
  score: number;
  reasons: string[];
  warnings: string[];
  recommendedContextTokens: number;
  recommendedBatchSize?: number;
  recommendedGpuLayers?: number;
  allowAutoLoad: boolean;
  requiresUserOptIn: boolean;
};

export type AgentModelPolicy = {
  agentId: string;
  preferredModels: string[];
  allowedModelCapabilities: ModelCapability[];
  blockedModelFamilies: string[];
  minimumCompatibilityTier: ModelCompatibilityTier;
  allowHeavyModels: boolean;
  allowRemoteFallback: boolean;
};
