import type { NeuroDeckState, ViewId } from "../types/neurodeck";

export type OnboardingMode = "setup" | "tour" | "contextual" | "whats-new";
export type OnboardingCategory = "core" | "tool" | "security" | "advanced" | "plugin";
export type OnboardingViewfinderType =
  | "spotlight"
  | "panel"
  | "split"
  | "controller"
  | "timeline"
  | "safety"
  | "emptyState";

export type OnboardingMediaType = "css" | "svg" | "lottie" | "webm" | "audio" | "shader" | "static";
export type OnboardingMotionMode = "full" | "reduced" | "none";
export type OnboardingFidelityMode = "deck_safe" | "rich";
export type OnboardingExplanationMode = "jpe" | "balanced" | "technical";

export interface OnboardingAnchor {
  id: string;
  selector: string;
  fallbackLabel: string;
}

export interface InputHint {
  device: "controller" | "keyboard" | "mouse" | "touch";
  input: string;
  action: string;
}

export interface OnboardingAnimation {
  type: OnboardingMediaType;
  label: string;
  caption: string;
  src?: string;
  fallbackSrc?: string;
  loop?: boolean;
  durationMs?: number;
  requiresRichMedia?: boolean;
  shaderSource?: string;
}

export interface OnboardingCondition {
  kind:
    | "always"
    | "activeView"
    | "hasNoSessions"
    | "hasNoModels"
    | "hasPlugins"
    | "deckMode"
    | "featureEnabled";
  value?: string | boolean;
}

export interface OnboardingStep {
  id: string;
  featureId: string;
  title: string;
  jpeText: string;
  technicalText?: string;
  viewfinderType: OnboardingViewfinderType;
  anchorId?: string;
  animation?: OnboardingAnimation;
  inputHints: InputHint[];
  required?: boolean;
  skippable: boolean;
  estimatedSeconds: number;
  conditions?: OnboardingCondition[];
  safetyNote?: string;
}

export interface OnboardingChange {
  version: string;
  summary: string;
}

export interface OnboardingManifest {
  featureId: string;
  featureName: string;
  version: string;
  priority: number;
  category: OnboardingCategory;
  minAppVersion?: string;
  anchors: OnboardingAnchor[];
  steps: OnboardingStep[];
  changelog?: OnboardingChange[];
}

export interface OnboardingProgressState {
  userId: "local";
  completedStepIds: string[];
  skippedStepIds: string[];
  dismissedFeatureIds: string[];
  lastSeenManifestVersions: Record<string, string>;
  explanationMode: OnboardingExplanationMode;
  motionMode: OnboardingMotionMode;
  fidelityMode: OnboardingFidelityMode;
  lastActiveStepId?: string;
  lastUpdatedAt: string;
}

export interface OnboardingRuntimeOptions {
  mode: Exclude<OnboardingMode, "setup">;
  activeView?: ViewId;
  state: NeuroDeckState;
}
