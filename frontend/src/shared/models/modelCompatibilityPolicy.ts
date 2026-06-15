import type {
  SupportedModelProfile,
  ModelCompatibilityTier,
  ModelCapability,
} from "../contracts/models.contracts";

export const TIER_ORDER: ModelCompatibilityTier[] = [
  "deck_default",
  "deck_balanced",
  "deck_heavy",
  "remote_or_docked_only",
  "unsupported",
  "unknown",
];

export function tierRank(tier: ModelCompatibilityTier): number {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? 99 : idx;
}

export function isTierAtLeast(
  tier: ModelCompatibilityTier,
  minimum: ModelCompatibilityTier
): boolean {
  return tierRank(tier) <= tierRank(minimum);
}

export function isLocalAllowed(profile: SupportedModelProfile): boolean {
  return profile.steamDeckPolicy.allowedLocal;
}

export function isRemoteRecommended(profile: SupportedModelProfile): boolean {
  return profile.steamDeckPolicy.remoteRecommended;
}

export function requiresUserOptIn(profile: SupportedModelProfile): boolean {
  return profile.steamDeckPolicy.requiresOptIn;
}

export function recommendedContextTokens(profile: SupportedModelProfile): number {
  return Math.min(profile.steamDeckPolicy.maxRecommendedContextTokens, 128000);
}

export function hasCapability(
  profile: SupportedModelProfile,
  capability: ModelCapability
): boolean {
  return profile.capabilities.includes(capability);
}

export function hasAllCapabilities(
  profile: SupportedModelProfile,
  capabilities: ModelCapability[]
): boolean {
  return capabilities.every((c) => hasCapability(profile, c));
}
