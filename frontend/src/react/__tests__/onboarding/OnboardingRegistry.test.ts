import { describe, expect, it } from "vitest";
import {
  buildOnboardingSteps,
  getCoreOnboardingManifests,
} from "../../onboarding/OnboardingRegistry";
import { validateOnboardingManifest } from "../../onboarding/onboarding.validation";
import type { NeuroDeckState } from "../../types/neurodeck";

const baseState = {
  activeView: "terminal",
  deckMode: false,
  models: [],
  sessions: [],
  plugins: [],
} as unknown as NeuroDeckState;

describe("OnboardingRegistry", () => {
  it("ships only valid core manifests", () => {
    const manifests = getCoreOnboardingManifests();

    expect(manifests.length).toBeGreaterThan(5);
    expect(manifests.flatMap((manifest) => validateOnboardingManifest(manifest))).toEqual([]);
    expect(
      manifests
        .flatMap((manifest) => manifest.anchors)
        .some((anchor) => anchor.id === "command-palette-trigger")
    ).toBe(true);
  });

  it("builds a tour with rich media-capable steps", () => {
    const steps = buildOnboardingSteps({ mode: "tour", state: baseState });

    expect(steps.length).toBeGreaterThan(3);
    expect(steps.some((step) => step.animation?.type === "lottie")).toBe(true);
    expect(steps.some((step) => step.animation?.type === "shader")).toBe(true);
    expect(steps.every((step) => step.jpeText.length > 0)).toBe(true);
  });

  it("returns contextual help for the active view", () => {
    const steps = buildOnboardingSteps({
      mode: "contextual",
      state: baseState,
      activeView: "terminal",
    });

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]?.featureId).toBe("terminal");
  });
});
