import type { OnboardingManifest, OnboardingStep } from "./onboarding.types";

const VIEWFINDER_TYPES = new Set([
  "spotlight",
  "panel",
  "split",
  "controller",
  "timeline",
  "safety",
  "emptyState",
]);

const MEDIA_TYPES = new Set(["css", "svg", "lottie", "webm", "audio", "shader", "static"]);

function isValidStep(step: OnboardingStep): boolean {
  if (!step.id || !step.featureId || !step.title || !step.jpeText) return false;
  if (!VIEWFINDER_TYPES.has(step.viewfinderType)) return false;
  if (!Array.isArray(step.inputHints)) return false;
  if (step.animation && !MEDIA_TYPES.has(step.animation.type)) return false;
  return typeof step.skippable === "boolean" && Number.isFinite(step.estimatedSeconds);
}

export function validateOnboardingManifest(manifest: OnboardingManifest): string[] {
  const errors: string[] = [];
  if (!manifest.featureId) errors.push("featureId is required");
  if (!manifest.featureName) errors.push("featureName is required");
  if (!manifest.version) errors.push("version is required");
  if (!Number.isFinite(manifest.priority)) errors.push("priority must be a number");
  if (!Array.isArray(manifest.anchors)) errors.push("anchors must be an array");
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    errors.push("steps must be a non-empty array");
  } else {
    for (const step of manifest.steps) {
      if (!isValidStep(step)) errors.push(`invalid step: ${step?.id ?? "unknown"}`);
    }
  }
  return errors;
}
