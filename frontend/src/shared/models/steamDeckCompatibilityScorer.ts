import type {
  SupportedModelProfile,
  SteamDeckModelScore,
  ModelCapability,
} from "../contracts/models.contracts";
import {
  isLocalAllowed,
  requiresUserOptIn,
  recommendedContextTokens,
  hasAllCapabilities,
} from "./modelCompatibilityPolicy";

export type SteamDeckScoreOptions = {
  installed?: boolean;
  hostMemoryGb?: number;
  batteryMode?: boolean;
  allowHeavyModels?: boolean;
};

/**
 * Score a model profile for Steam Deck suitability.
 * Does not perform network probes; pure policy/scoring only.
 */
export function scoreSteamDeckCompatibility(
  profile: SupportedModelProfile,
  options: SteamDeckScoreOptions = {}
): SteamDeckModelScore {
  const {
    installed = false,
    hostMemoryGb = 16,
    batteryMode = true,
    allowHeavyModels = false,
  } = options;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  switch (profile.compatibilityTier) {
    case "deck_default":
      score += 40;
      reasons.push("Steam Deck default tier");
      break;
    case "deck_balanced":
      score += 25;
      reasons.push("Steam Deck balanced tier");
      break;
    case "deck_heavy":
      score += 10;
      warnings.push("Heavy model: may thermal-throttle on battery");
      break;
    case "remote_or_docked_only":
      score -= 20;
      warnings.push("Too large for comfortable local use; remote or docked recommended");
      break;
    case "unsupported":
      score -= 50;
      warnings.push("Unsupported on Steam Deck");
      break;
    case "unknown":
      score -= 30;
      warnings.push("Compatibility unknown");
      break;
  }

  if (installed) {
    score += 10;
    reasons.push("Model is installed locally");
  }

  const smallClasses = ["sub_1b", "1b", "1_5b", "2b", "3b"];
  if (smallClasses.includes(profile.parameterClass)) {
    score += 10;
    reasons.push(`Small parameter class (${profile.parameterClass})`);
  } else if (["7b", "8b"].includes(profile.parameterClass)) {
    score -= 10;
    warnings.push("Medium-large model may exceed comfortable Deck RAM");
  } else if (profile.parameterClass !== "unknown") {
    score -= 20;
    warnings.push("Large model not recommended for handheld use");
  }

  if (batteryMode && profile.steamDeckPolicy.expectedThermalPressure !== "low") {
    score -= 10;
    warnings.push(`Expected thermal pressure: ${profile.steamDeckPolicy.expectedThermalPressure}`);
  }

  if (hostMemoryGb < 16 && profile.steamDeckPolicy.expectedMemoryPressure === "high") {
    score -= 10;
    warnings.push("High memory pressure on 8 GB Deck");
  }

  if (profile.compatibilityTier === "deck_heavy" && !allowHeavyModels) {
    score -= 15;
    warnings.push("Heavy model opt-in required");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    modelId: profile.id,
    tier: profile.compatibilityTier,
    score,
    reasons,
    warnings,
    recommendedContextTokens: recommendedContextTokens(profile),
    recommendedBatchSize: 1,
    recommendedGpuLayers: profile.parameterClass === "sub_1b" ? 33 : undefined,
    allowAutoLoad:
      profile.compatibilityTier === "deck_default" ||
      (profile.compatibilityTier === "deck_balanced" && installed),
    requiresUserOptIn: requiresUserOptIn(profile) || profile.compatibilityTier === "deck_heavy",
  };
}

export function pickBestLocalModel(
  profiles: SupportedModelProfile[],
  installedIds: string[],
  options?: SteamDeckScoreOptions & { requiredCapabilities?: ModelCapability[] }
): SteamDeckModelScore | null {
  const { requiredCapabilities = [], ...rest } = options || {};
  const scored = profiles
    .filter((p) => isLocalAllowed(p))
    .filter((p) => hasAllCapabilities(p, requiredCapabilities))
    .map((p) => scoreSteamDeckCompatibility(p, { ...rest, installed: installedIds.includes(p.id) }))
    .sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}
