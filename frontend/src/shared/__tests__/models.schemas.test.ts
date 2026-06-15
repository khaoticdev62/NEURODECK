import { describe, it, expect } from "vitest";
import {
  isSupportedModelProfile,
  isProviderRuntimeProfile,
  isModelConnectionEvidence,
  isSteamDeckModelScore,
  isAgentModelPolicy,
  isDiscoveredModel,
} from "../schemas/models.schemas";
import type {
  SupportedModelProfile,
  ProviderRuntimeProfile,
  ModelConnectionEvidence,
} from "../contracts/models.contracts";

const validProfile: SupportedModelProfile = {
  id: "llama3.2-1b",
  family: "llama",
  displayName: "Llama 3.2 1B",
  providerModelIds: ["llama3.2:1b"],
  parameterClass: "1b",
  recommendedQuantization: "Q4_K_M",
  compatibilityTier: "deck_default",
  capabilities: ["chat", "completion"],
  steamDeckPolicy: {
    allowedLocal: true,
    defaultLocal: true,
    requiresOptIn: false,
    remoteRecommended: false,
    maxRecommendedContextTokens: 8192,
    expectedMemoryPressure: "low",
    expectedThermalPressure: "low",
    notes: [],
  },
  healthRequirements: {
    providerMustListModel: true,
    mustPassTinyPrompt: true,
  },
};

const validProvider: ProviderRuntimeProfile = {
  id: "ollama-local",
  label: "Ollama",
  type: "ollama",
  localOnly: true,
  steamDeckRecommended: true,
  endpoints: {
    health: "/api/tags",
    listModels: "/api/tags",
    chat: "/api/chat",
    generate: "/api/generate",
    embeddings: "/api/embeddings",
  },
  auth: { required: false, envVars: [] },
  supports: {
    modelListing: true,
    chat: true,
    streaming: true,
    embeddings: true,
    tools: false,
    vision: false,
    cancellation: false,
  },
  selfHealing: {
    canRestartService: true,
    canReloadModel: true,
    canRetryRequest: true,
    canFailover: true,
    maxRecoveryAttempts: 3,
  },
};

const validEvidence: ModelConnectionEvidence = {
  requestId: "r1",
  timestamp: new Date().toISOString(),
  providerId: "ollama-local",
  providerType: "ollama",
  modelId: "llama3.2:1b",
  probe: "tiny_prompt",
  status: "passed",
  realTransportUsed: true,
  mockDataDetected: false,
  durationMs: 120,
  bytesSent: 256,
  bytesReceived: 512,
  source: "renderer",
  target: "http://127.0.0.1:11434",
};

describe("model schema validators", () => {
  it("accepts a valid supported model profile", () => {
    expect(isSupportedModelProfile(validProfile)).toBe(true);
  });

  it("rejects profile with wrong capability", () => {
    expect(isSupportedModelProfile({ ...validProfile, capabilities: ["not_real"] })).toBe(false);
  });

  it("rejects profile with missing policy", () => {
    const bad = { ...validProfile, steamDeckPolicy: undefined } as unknown as SupportedModelProfile;
    expect(isSupportedModelProfile(bad)).toBe(false);
  });

  it("accepts a valid provider runtime profile", () => {
    expect(isProviderRuntimeProfile(validProvider)).toBe(true);
  });

  it("rejects provider with missing supports object", () => {
    const bad = { ...validProvider, supports: undefined } as unknown as ProviderRuntimeProfile;
    expect(isProviderRuntimeProfile(bad)).toBe(false);
  });

  it("accepts valid connection evidence", () => {
    expect(isModelConnectionEvidence(validEvidence)).toBe(true);
  });

  it("rejects evidence with missing required probe fields", () => {
    expect(isModelConnectionEvidence({ ...validEvidence, probe: undefined })).toBe(false);
  });

  it("accepts a valid Steam Deck score", () => {
    expect(
      isSteamDeckModelScore({
        modelId: "llama3.2:1b",
        tier: "deck_default",
        score: 95,
        reasons: ["small", "fast"],
        warnings: [],
        recommendedContextTokens: 8192,
        allowAutoLoad: true,
        requiresUserOptIn: false,
      })
    ).toBe(true);
  });

  it("accepts a valid agent model policy", () => {
    expect(
      isAgentModelPolicy({
        agentId: "aida",
        preferredModels: ["llama3.2:1b"],
        allowedModelCapabilities: ["chat", "reasoning"],
        blockedModelFamilies: [],
        minimumCompatibilityTier: "deck_default",
        allowHeavyModels: false,
        allowRemoteFallback: false,
      })
    ).toBe(true);
  });

  it("accepts a valid discovered model", () => {
    expect(
      isDiscoveredModel({
        id: "llama3.2:1b",
        name: "Llama 3.2 1B",
        provider: "ollama-local",
        providerType: "ollama",
        status: "ready",
      })
    ).toBe(true);
  });
});
