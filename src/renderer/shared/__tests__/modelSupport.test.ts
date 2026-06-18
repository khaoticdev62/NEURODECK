import { describe, it, expect } from "vitest";
import {
  createModelRegistry,
  createRuntimeRegistry,
  createAgentPolicyRegistry,
  findModelById,
  findModelsByProviderModelId,
  scoreSteamDeckCompatibility,
  pickBestLocalModel,
  selectModelForAgent,
} from "../index";
import type { SupportedModelProfile, AgentModelPolicy } from "../index";

const llama32_1b: SupportedModelProfile = {
  id: "llama32-1b",
  family: "llama",
  displayName: "Llama 3.2 1B",
  providerModelIds: ["llama3.2:1b"],
  parameterClass: "1b",
  recommendedQuantization: "Q4_K_M",
  compatibilityTier: "deck_default",
  capabilities: ["chat", "completion", "summarization"],
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
  healthRequirements: { providerMustListModel: true, mustPassTinyPrompt: true },
};

const qwen25_coder_7b: SupportedModelProfile = {
  id: "qwen25-coder-7b",
  family: "qwen",
  displayName: "Qwen2.5 Coder 7B",
  providerModelIds: ["qwen2.5-coder:7b"],
  parameterClass: "7b",
  recommendedQuantization: "Q4_K_M",
  compatibilityTier: "deck_heavy",
  capabilities: ["chat", "completion", "coding"],
  steamDeckPolicy: {
    allowedLocal: true,
    defaultLocal: false,
    requiresOptIn: true,
    remoteRecommended: false,
    maxRecommendedContextTokens: 8192,
    expectedMemoryPressure: "high",
    expectedThermalPressure: "high",
    notes: [],
  },
  healthRequirements: { providerMustListModel: true, mustPassTinyPrompt: true },
};

const gemma3_27b: SupportedModelProfile = {
  id: "gemma3-27b",
  family: "gemma",
  displayName: "Gemma 3 27B",
  providerModelIds: ["gemma3:27b"],
  parameterClass: "27b",
  recommendedQuantization: "Q4_K_M",
  compatibilityTier: "remote_or_docked_only",
  capabilities: ["chat", "completion", "reasoning"],
  steamDeckPolicy: {
    allowedLocal: false,
    defaultLocal: false,
    requiresOptIn: true,
    remoteRecommended: true,
    maxRecommendedContextTokens: 8192,
    expectedMemoryPressure: "extreme",
    expectedThermalPressure: "extreme",
    notes: [],
  },
  healthRequirements: { providerMustListModel: true, mustPassTinyPrompt: true },
};

describe("modelSupportRegistry", () => {
  it("validates and drops malformed model entries", () => {
    const registry = createModelRegistry({
      version: "1.0.0",
      updatedAt: "2026-06-11",
      models: [llama32_1b, { id: "bad", notARealField: true }],
    });
    expect(registry.models).toHaveLength(1);
    expect(findModelById(registry, "llama32-1b")).toBeDefined();
  });

  it("finds models by provider model id case-insensitively", () => {
    const registry = createModelRegistry({ models: [llama32_1b] });
    expect(findModelsByProviderModelId(registry, "LLAMA3.2:1B")).toHaveLength(1);
  });

  it("creates a runtime registry", () => {
    const runtime = createRuntimeRegistry({
      runtimes: [
        {
          id: "ollama-local",
          label: "Ollama",
          type: "ollama",
          localOnly: true,
          steamDeckRecommended: true,
          endpoints: {},
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
        },
      ],
    });
    expect(runtime.runtimes).toHaveLength(1);
  });

  it("creates an agent policy registry", () => {
    const policy: AgentModelPolicy = {
      agentId: "developer",
      preferredModels: ["qwen25-coder-7b"],
      allowedModelCapabilities: ["chat", "coding"],
      blockedModelFamilies: [],
      minimumCompatibilityTier: "deck_heavy",
      allowHeavyModels: true,
      allowRemoteFallback: false,
    };
    const registry = createAgentPolicyRegistry({ policies: [policy, { broken: true }] });
    expect(registry.policies).toHaveLength(1);
  });
});

describe("steamDeckCompatibilityScorer", () => {
  it("scores deck_default highest", () => {
    const score = scoreSteamDeckCompatibility(llama32_1b, { installed: true });
    expect(score.score).toBeGreaterThan(80);
    expect(score.allowAutoLoad).toBe(true);
    expect(score.requiresUserOptIn).toBe(false);
  });

  it("penalizes heavy models and requires opt-in", () => {
    const score = scoreSteamDeckCompatibility(qwen25_coder_7b, { installed: false });
    expect(score.score).toBeLessThan(70);
    expect(score.requiresUserOptIn).toBe(true);
  });

  it("picks the best local installed model", () => {
    const best = pickBestLocalModel([llama32_1b, qwen25_coder_7b, gemma3_27b], ["llama32-1b"], {
      allowHeavyModels: false,
    });
    expect(best).not.toBeNull();
    expect(best?.modelId).toBe("llama32-1b");
  });
});

describe("agentModelPolicy", () => {
  it("selects a coding-capable preferred model when allowed", () => {
    const policy: AgentModelPolicy = {
      agentId: "developer",
      preferredModels: ["qwen25-coder-7b", "llama32-1b"],
      allowedModelCapabilities: ["chat", "coding"],
      blockedModelFamilies: [],
      minimumCompatibilityTier: "deck_heavy",
      allowHeavyModels: true,
      allowRemoteFallback: false,
    };
    const selected = selectModelForAgent(policy, [llama32_1b, qwen25_coder_7b], [], {
      allowHeavyModels: true,
    });
    expect(selected?.id).toBe("qwen25-coder-7b");
  });

  it("respects capability requirements", () => {
    const policy: AgentModelPolicy = {
      agentId: "researcher",
      preferredModels: [],
      allowedModelCapabilities: ["long_context"],
      blockedModelFamilies: [],
      minimumCompatibilityTier: "deck_default",
      allowHeavyModels: false,
      allowRemoteFallback: false,
    };
    const selected = selectModelForAgent(policy, [llama32_1b, qwen25_coder_7b], [], {
      allowHeavyModels: false,
    });
    expect(selected).toBeNull();
  });
});
