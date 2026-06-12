/**
 * Lightweight JSON Schema + validators for model/provider contracts.
 * No external runtime dependencies (zod/yup) per project dependency policy.
 */

import type {
  ModelCompatibilityTier,
  ModelCapability,
  ParameterClass,
  Quantization,
  SupportedModelProfile,
  ProviderRuntimeType,
  ProviderRuntimeProfile,
  ModelConnectionEvidence,
  SteamDeckModelScore,
  AgentModelPolicy,
  ModelProbeType,
  ProbeStatus,
  ProviderConnectionState,
  DiscoveredModel,
  ModelDetectionResult,
} from '../contracts/models.contracts';

const COMPATIBILITY_TIERS: ModelCompatibilityTier[] = [
  'deck_default',
  'deck_balanced',
  'deck_heavy',
  'remote_or_docked_only',
  'unsupported',
  'unknown',
];

const MODEL_CAPABILITIES: ModelCapability[] = [
  'chat',
  'completion',
  'reasoning',
  'coding',
  'tool_calling',
  'vision',
  'embedding',
  'reranking',
  'summarization',
  'translation',
  'long_context',
];

const PARAMETER_CLASSES: ParameterClass[] = [
  'sub_1b',
  '1b',
  '1_5b',
  '2b',
  '3b',
  '4b',
  '7b',
  '8b',
  '12b',
  '14b',
  '27b',
  '30b_plus',
  'unknown',
];

const QUANTIZATIONS: Quantization[] = ['Q4_K_M', 'Q4_K_S', 'Q5_K_M', 'Q8_0', 'unknown'];

const PROVIDER_RUNTIME_TYPES: ProviderRuntimeType[] = [
  'ollama',
  'lm_studio',
  'llama_cpp_server',
  'openai_compatible_local',
  'openai_compatible_remote',
  'custom_http_provider',
  'disabled_provider',
];

const PROVIDER_CONNECTION_STATES: ProviderConnectionState[] = [
  'unknown',
  'not_configured',
  'starting',
  'connecting',
  'connected',
  'degraded',
  'offline',
  'missing_binary',
  'missing_model',
  'auth_failed',
  'rate_limited',
  'crashed',
  'blocked',
  'error',
  'recovering',
];

const PROBE_TYPES: ModelProbeType[] = [
  'provider_ping',
  'model_list',
  'model_show',
  'tiny_prompt',
  'stream_probe',
  'embedding_probe',
  'tool_probe',
  'runtime_process_check',
  'self_healing_recovery',
  'failover_route',
];

const PROBE_STATUSES: ProbeStatus[] = ['passed', 'failed', 'skipped', 'blocked'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

export function isSupportedModelProfile(value: unknown): value is SupportedModelProfile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.family === 'string' &&
    typeof v.displayName === 'string' &&
    isStringArray(v.providerModelIds) &&
    PARAMETER_CLASSES.includes(v.parameterClass as ParameterClass) &&
    QUANTIZATIONS.includes(v.recommendedQuantization as Quantization) &&
    COMPATIBILITY_TIERS.includes(v.compatibilityTier as ModelCompatibilityTier) &&
    Array.isArray(v.capabilities) &&
    (v.capabilities as unknown[]).every((c) => MODEL_CAPABILITIES.includes(c as ModelCapability)) &&
    typeof v.steamDeckPolicy === 'object' &&
    v.steamDeckPolicy !== null &&
    typeof v.healthRequirements === 'object' &&
    v.healthRequirements !== null
  );
}

export function isProviderRuntimeProfile(value: unknown): value is ProviderRuntimeProfile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    PROVIDER_RUNTIME_TYPES.includes(v.type as ProviderRuntimeType) &&
    typeof v.localOnly === 'boolean' &&
    typeof v.steamDeckRecommended === 'boolean' &&
    typeof v.endpoints === 'object' &&
    v.endpoints !== null &&
    typeof v.auth === 'object' &&
    v.auth !== null &&
    typeof v.supports === 'object' &&
    v.supports !== null &&
    typeof v.selfHealing === 'object' &&
    v.selfHealing !== null
  );
}

export function isModelConnectionEvidence(value: unknown): value is ModelConnectionEvidence {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.requestId === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.providerId === 'string' &&
    PROVIDER_RUNTIME_TYPES.includes(v.providerType as ProviderRuntimeType) &&
    (v.modelId === undefined || typeof v.modelId === 'string') &&
    PROBE_TYPES.includes(v.probe as ModelProbeType) &&
    PROBE_STATUSES.includes(v.status as ProbeStatus) &&
    typeof v.realTransportUsed === 'boolean' &&
    typeof v.mockDataDetected === 'boolean' &&
    typeof v.durationMs === 'number' &&
    typeof v.bytesSent === 'number' &&
    typeof v.bytesReceived === 'number' &&
    typeof v.source === 'string' &&
    typeof v.target === 'string'
  );
}

export function isSteamDeckModelScore(value: unknown): value is SteamDeckModelScore {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.modelId === 'string' &&
    COMPATIBILITY_TIERS.includes(v.tier as ModelCompatibilityTier) &&
    typeof v.score === 'number' &&
    isStringArray(v.reasons) &&
    isStringArray(v.warnings) &&
    typeof v.recommendedContextTokens === 'number' &&
    typeof v.allowAutoLoad === 'boolean' &&
    typeof v.requiresUserOptIn === 'boolean'
  );
}

export function isAgentModelPolicy(value: unknown): value is AgentModelPolicy {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.agentId === 'string' &&
    isStringArray(v.preferredModels) &&
    Array.isArray(v.allowedModelCapabilities) &&
    (v.allowedModelCapabilities as unknown[]).every((c) =>
      MODEL_CAPABILITIES.includes(c as ModelCapability)
    ) &&
    isStringArray(v.blockedModelFamilies) &&
    COMPATIBILITY_TIERS.includes(v.minimumCompatibilityTier as ModelCompatibilityTier) &&
    typeof v.allowHeavyModels === 'boolean' &&
    typeof v.allowRemoteFallback === 'boolean'
  );
}

export function isDiscoveredModel(value: unknown): value is DiscoveredModel {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const validStatuses = ['ready', 'indexed', 'disabled', 'missing', 'unknown'];
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.provider === 'string' &&
    PROVIDER_RUNTIME_TYPES.includes(v.providerType as ProviderRuntimeType) &&
    (v.size === undefined || typeof v.size === 'string') &&
    (v.quantization === undefined || QUANTIZATIONS.includes(v.quantization as Quantization)) &&
    (v.context === undefined || typeof v.context === 'number') &&
    (v.bestFor === undefined || isStringArray(v.bestFor)) &&
    validStatuses.includes(v.status as string) &&
    (v.ramEstimate === undefined || typeof v.ramEstimate === 'string') &&
    (v.lastVerifiedAt === undefined || typeof v.lastVerifiedAt === 'string')
  );
}

export function isModelDetectionResult(value: unknown): value is ModelDetectionResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.scannedAt === 'string' &&
    Array.isArray(v.runtimes) &&
    Array.isArray(v.discoveredModels) &&
    (v.discoveredModels as unknown[]).every(isDiscoveredModel) &&
    typeof v.summary === 'string'
  );
}

export function isProviderConnectionState(value: unknown): value is ProviderConnectionState {
  return PROVIDER_CONNECTION_STATES.includes(value as ProviderConnectionState);
}

export const supportedModelProfileSchema = {
  type: 'object',
  required: [
    'id',
    'family',
    'displayName',
    'providerModelIds',
    'parameterClass',
    'recommendedQuantization',
    'compatibilityTier',
    'capabilities',
    'steamDeckPolicy',
    'healthRequirements',
  ],
  properties: {
    id: { type: 'string' },
    family: { type: 'string' },
    displayName: { type: 'string' },
    providerModelIds: { type: 'array', items: { type: 'string' } },
    parameterClass: { enum: PARAMETER_CLASSES },
    recommendedQuantization: { enum: QUANTIZATIONS },
    compatibilityTier: { enum: COMPATIBILITY_TIERS },
    capabilities: { type: 'array', items: { enum: MODEL_CAPABILITIES } },
    steamDeckPolicy: {
      type: 'object',
      required: [
        'allowedLocal',
        'defaultLocal',
        'requiresOptIn',
        'remoteRecommended',
        'maxRecommendedContextTokens',
        'expectedMemoryPressure',
        'expectedThermalPressure',
        'notes',
      ],
      properties: {
        allowedLocal: { type: 'boolean' },
        defaultLocal: { type: 'boolean' },
        requiresOptIn: { type: 'boolean' },
        remoteRecommended: { type: 'boolean' },
        maxRecommendedContextTokens: { type: 'number' },
        expectedMemoryPressure: { enum: ['low', 'medium', 'high', 'extreme', 'unknown'] },
        expectedThermalPressure: { enum: ['low', 'medium', 'high', 'extreme', 'unknown'] },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
    healthRequirements: {
      type: 'object',
      required: ['providerMustListModel', 'mustPassTinyPrompt'],
      properties: {
        providerMustListModel: { type: 'boolean' },
        mustPassTinyPrompt: { type: 'boolean' },
        mustSupportStreaming: { type: 'boolean' },
        mustSupportTools: { type: 'boolean' },
      },
    },
  },
};
