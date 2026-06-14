import { neurodeckApi } from "../services/bridgeAdapter";
import type { OnboardingProgressState } from "./onboarding.types";

export const ONBOARDING_PROGRESS_KEY = "neurodeck_onboarding_progress_v2";
export const LEGACY_ONBOARDING_COMPLETE_KEY = "neurodeck_onboarding_complete";

export function createDefaultOnboardingProgress(): OnboardingProgressState {
  return {
    userId: "local",
    completedStepIds: [],
    skippedStepIds: [],
    dismissedFeatureIds: [],
    lastSeenManifestVersions: {},
    explanationMode: "jpe",
    motionMode: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "reduced" : "full",
    fidelityMode: "deck_safe",
    lastUpdatedAt: new Date().toISOString(),
  };
}

function normalizeProgress(value: Partial<OnboardingProgressState> | null): OnboardingProgressState {
  const defaults = createDefaultOnboardingProgress();
  if (!value || typeof value !== "object") return defaults;
  return {
    ...defaults,
    ...value,
    userId: "local",
    completedStepIds: Array.isArray(value.completedStepIds) ? value.completedStepIds : [],
    skippedStepIds: Array.isArray(value.skippedStepIds) ? value.skippedStepIds : [],
    dismissedFeatureIds: Array.isArray(value.dismissedFeatureIds) ? value.dismissedFeatureIds : [],
    lastSeenManifestVersions:
      value.lastSeenManifestVersions && typeof value.lastSeenManifestVersions === "object"
        ? value.lastSeenManifestVersions
        : {},
    explanationMode: value.explanationMode ?? defaults.explanationMode,
    motionMode: value.motionMode ?? defaults.motionMode,
    fidelityMode: value.fidelityMode ?? defaults.fidelityMode,
    lastUpdatedAt: value.lastUpdatedAt ?? defaults.lastUpdatedAt,
  };
}

export async function loadOnboardingProgress(): Promise<OnboardingProgressState> {
  try {
    const stored = await neurodeckApi.store.get<Partial<OnboardingProgressState>>(ONBOARDING_PROGRESS_KEY);
    return normalizeProgress(stored ?? null);
  } catch {
    return createDefaultOnboardingProgress();
  }
}

export async function saveOnboardingProgress(progress: OnboardingProgressState): Promise<void> {
  const next = { ...progress, lastUpdatedAt: new Date().toISOString() };
  await neurodeckApi.store.set(ONBOARDING_PROGRESS_KEY, next);
}

export async function markLegacyOnboardingComplete(): Promise<void> {
  localStorage.setItem(LEGACY_ONBOARDING_COMPLETE_KEY, "true");
}
