import { describe, it, expect } from "vitest";
import {
  buildOnboardingSteps,
  getCoreOnboardingManifests,
} from "../../onboarding/OnboardingRegistry";
import { validateOnboardingManifest } from "../../onboarding/onboarding.validation";
import type { NeuroDeckState } from "../../types/neurodeck";
import type { OnboardingManifest } from "../../onboarding/onboarding.types";

const emptyState = {
  activeView: "chat",
  deckMode: false,
  models: [],
  sessions: [],
  plugins: [],
} as unknown as NeuroDeckState;

const populatedState = {
  activeView: "chat",
  deckMode: false,
  models: [{ id: "llama3" }],
  sessions: [{ id: "sess-1" }],
  plugins: [{ id: "bmad" }],
} as unknown as NeuroDeckState;

// ── Condition evaluation ──────────────────────────────────────────────────────

describe("Condition evaluation", () => {
  it("hasNoSessions: step appears when session list is empty", () => {
    const steps = buildOnboardingSteps({ mode: "tour", state: emptyState });
    const sessions = steps.filter((s) => s.featureId === "sessions");
    expect(sessions.length).toBeGreaterThan(0);
  });

  it("hasNoSessions: step is excluded when sessions exist", () => {
    const steps = buildOnboardingSteps({ mode: "tour", state: populatedState });
    const sessions = steps.filter((s) => s.featureId === "sessions");
    expect(sessions).toHaveLength(0);
  });

  it("hasNoModels: step appears when model list is empty", () => {
    const steps = buildOnboardingSteps({ mode: "tour", state: emptyState });
    const models = steps.filter((s) => s.featureId === "models");
    expect(models.length).toBeGreaterThan(0);
  });

  it("hasNoModels: step is excluded when models exist", () => {
    const steps = buildOnboardingSteps({ mode: "tour", state: populatedState });
    const models = steps.filter((s) => s.featureId === "models");
    expect(models).toHaveLength(0);
  });

  it("contextual mode returns steps for the requested view", () => {
    const steps = buildOnboardingSteps({
      mode: "contextual",
      state: emptyState,
      activeView: "memory",
    });
    expect(steps.some((s) => s.featureId === "memory")).toBe(true);
  });

  it("contextual mode for terminal returns terminal steps", () => {
    const steps = buildOnboardingSteps({
      mode: "contextual",
      state: emptyState,
      activeView: "terminal",
    });
    expect(steps[0]?.featureId).toBe("terminal");
  });

  it("whats-new mode returns a capped subset of steps", () => {
    const steps = buildOnboardingSteps({ mode: "whats-new", state: emptyState });
    expect(steps.length).toBeLessThanOrEqual(5);
    expect(steps.length).toBeGreaterThan(0);
  });
});

// ── Manifest validation ───────────────────────────────────────────────────────

describe("validateOnboardingManifest", () => {
  const validManifest: OnboardingManifest = {
    featureId: "test-feature",
    featureName: "Test Feature",
    version: "1.0.0",
    priority: 50,
    category: "tool",
    anchors: [
      { id: "test-anchor", selector: '[data-onboarding-anchor="test"]', fallbackLabel: "test" },
    ],
    steps: [
      {
        id: "test-feature.intro",
        featureId: "test-feature",
        title: "Test",
        jpeText: "Test plain english.",
        viewfinderType: "panel",
        inputHints: [{ device: "keyboard", input: "Enter", action: "Continue" }],
        skippable: true,
        estimatedSeconds: 10,
        conditions: [{ kind: "always" }],
      },
    ],
  };

  it("valid manifest produces zero errors", () => {
    expect(validateOnboardingManifest(validManifest)).toEqual([]);
  });

  it("missing featureId produces error", () => {
    const errors = validateOnboardingManifest({ ...validManifest, featureId: "" });
    expect(errors.some((e) => e.includes("featureId"))).toBe(true);
  });

  it("missing featureName produces error", () => {
    const errors = validateOnboardingManifest({ ...validManifest, featureName: "" });
    expect(errors.some((e) => e.includes("featureName"))).toBe(true);
  });

  it("missing version produces error", () => {
    const errors = validateOnboardingManifest({ ...validManifest, version: "" });
    expect(errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("non-numeric priority produces error", () => {
    const errors = validateOnboardingManifest({ ...validManifest, priority: NaN });
    expect(errors.some((e) => e.includes("priority"))).toBe(true);
  });

  it("empty steps array produces error", () => {
    const errors = validateOnboardingManifest({ ...validManifest, steps: [] });
    expect(errors.some((e) => e.includes("steps"))).toBe(true);
  });

  it("step with invalid viewfinderType produces error", () => {
    const errors = validateOnboardingManifest({
      ...validManifest,
      steps: [{ ...validManifest.steps[0], viewfinderType: "invalid" as never }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("step with invalid animation type produces error", () => {
    const errors = validateOnboardingManifest({
      ...validManifest,
      steps: [
        {
          ...validManifest.steps[0],
          animation: { type: "mp4" as never, label: "x", caption: "y" },
        },
      ],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("all core manifests pass validation", () => {
    const allErrors = getCoreOnboardingManifests().flatMap((m) => validateOnboardingManifest(m));
    expect(allErrors).toEqual([]);
  });
});

// ── Missing anchor fallback ───────────────────────────────────────────────────

describe("Missing anchor handling", () => {
  it("all core manifests provide anchor entries", () => {
    const manifests = getCoreOnboardingManifests();
    for (const manifest of manifests) {
      expect(Array.isArray(manifest.anchors)).toBe(true);
      expect(manifest.anchors.length).toBeGreaterThan(0);
    }
  });

  it("steps reference anchor IDs that exist in the anchor list", () => {
    const manifests = getCoreOnboardingManifests();
    for (const manifest of manifests) {
      const anchorIds = new Set(manifest.anchors.map((a) => a.id));
      for (const step of manifest.steps) {
        if (step.anchorId) {
          expect(anchorIds.has(step.anchorId)).toBe(true);
        }
      }
    }
  });

  it("all anchors have a non-empty fallbackLabel", () => {
    const manifests = getCoreOnboardingManifests();
    const anchors = manifests.flatMap((m) => m.anchors);
    for (const anchor of anchors) {
      expect(anchor.fallbackLabel.length).toBeGreaterThan(0);
    }
  });
});
