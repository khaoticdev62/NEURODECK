import type {
  SupportedModelProfile,
  AgentModelPolicy,
  SteamDeckModelScore,
  DiscoveredModel,
} from "../contracts/models.contracts";
import { isTierAtLeast, hasAllCapabilities } from "./modelCompatibilityPolicy";
import {
  scoreSteamDeckCompatibility,
  type SteamDeckScoreOptions,
} from "./steamDeckCompatibilityScorer";

export function isPolicySatisfied(
  policy: AgentModelPolicy,
  profile: SupportedModelProfile,
  _score: SteamDeckModelScore
): boolean {
  if (!isTierAtLeast(profile.compatibilityTier, policy.minimumCompatibilityTier)) return false;
  if (!hasAllCapabilities(profile, policy.allowedModelCapabilities)) return false;
  if (policy.blockedModelFamilies.some((f) => profile.family.toLowerCase() === f.toLowerCase()))
    return false;
  if (!policy.allowHeavyModels && profile.compatibilityTier === "deck_heavy") return false;
  if (!policy.allowRemoteFallback && profile.steamDeckPolicy.remoteRecommended) return false;
  return true;
}

export function rankModelsForAgent(
  policy: AgentModelPolicy,
  profiles: SupportedModelProfile[],
  installedIds: string[],
  scoreOptions: SteamDeckScoreOptions = {}
): Array<{ profile: SupportedModelProfile; score: SteamDeckModelScore }> {
  return profiles
    .map((profile) => ({
      profile,
      score: scoreSteamDeckCompatibility(profile, {
        ...scoreOptions,
        installed: installedIds.includes(profile.id),
      }),
    }))
    .filter(({ profile, score }) => isPolicySatisfied(policy, profile, score))
    .sort((a, b) => {
      // Prefer preferredModels order, then score
      const aPref = policy.preferredModels.indexOf(a.profile.id);
      const bPref = policy.preferredModels.indexOf(b.profile.id);
      if (aPref !== -1 && bPref !== -1) return aPref - bPref;
      if (aPref !== -1) return -1;
      if (bPref !== -1) return 1;
      return b.score.score - a.score.score;
    });
}

export function selectModelForAgent(
  policy: AgentModelPolicy,
  profiles: SupportedModelProfile[],
  installedIds: string[],
  scoreOptions: SteamDeckScoreOptions = {}
): SupportedModelProfile | null {
  return rankModelsForAgent(policy, profiles, installedIds, scoreOptions)[0]?.profile ?? null;
}

export function buildDiscoveredModel(
  profile: SupportedModelProfile,
  providerId: string,
  status: DiscoveredModel["status"]
): DiscoveredModel {
  return {
    id: profile.id,
    name: profile.displayName,
    provider: providerId,
    providerType: "ollama",
    size: undefined,
    quantization: profile.recommendedQuantization,
    context: profile.steamDeckPolicy.maxRecommendedContextTokens,
    bestFor: profile.capabilities.slice(),
    status,
    ramEstimate: undefined,
  };
}
