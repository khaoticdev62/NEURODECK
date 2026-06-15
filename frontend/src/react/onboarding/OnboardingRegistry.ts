import type { NeuroDeckState, ViewId } from "../types/neurodeck";
import {
  onboardingFallbackSvg,
  onboardingLottieSignal,
  onboardingShaderSource,
  onboardingSilentAudio,
  onboardingWebmPoster,
} from "./richMediaSamples";
import type {
  InputHint,
  OnboardingCondition,
  OnboardingMediaType,
  OnboardingManifest,
  OnboardingRuntimeOptions,
  OnboardingStep,
} from "./onboarding.types";
import { validateOnboardingManifest } from "./onboarding.validation";

const controllerBasics: InputHint[] = [
  { device: "controller", input: "A", action: "Select or continue" },
  { device: "controller", input: "B", action: "Back or close" },
  { device: "keyboard", input: "Enter", action: "Continue" },
  { device: "keyboard", input: "Escape", action: "Exit tour" },
];

const anchors = [
  {
    id: "app-shell",
    selector: "[data-onboarding-anchor='app-shell']",
    fallbackLabel: "NEURODECK shell",
  },
  {
    id: "main-content",
    selector: "[data-onboarding-anchor='main-content']",
    fallbackLabel: "active workspace",
  },
  {
    id: "command-palette-trigger",
    selector: "[data-onboarding-anchor='command-palette-trigger']",
    fallbackLabel: "command palette trigger",
  },
  {
    id: "command-palette-input",
    selector: "[data-onboarding-anchor='command-palette-input']",
    fallbackLabel: "command palette input",
  },
  {
    id: "nav-chat",
    selector: "[data-onboarding-anchor='nav-chat']",
    fallbackLabel: "chat navigation",
  },
  {
    id: "nav-models",
    selector: "[data-onboarding-anchor='nav-models']",
    fallbackLabel: "model navigation",
  },
  {
    id: "nav-agent",
    selector: "[data-onboarding-anchor='nav-agent']",
    fallbackLabel: "agent navigation",
  },
  {
    id: "nav-memory",
    selector: "[data-onboarding-anchor='nav-memory']",
    fallbackLabel: "memory navigation",
  },
  {
    id: "nav-sessions",
    selector: "[data-onboarding-anchor='nav-sessions']",
    fallbackLabel: "sessions navigation",
  },
  {
    id: "nav-browser",
    selector: "[data-onboarding-anchor='nav-browser']",
    fallbackLabel: "browser navigation",
  },
  {
    id: "nav-terminal",
    selector: "[data-onboarding-anchor='nav-terminal']",
    fallbackLabel: "terminal navigation",
  },
  {
    id: "nav-sync",
    selector: "[data-onboarding-anchor='nav-sync']",
    fallbackLabel: "sync navigation",
  },
  {
    id: "nav-plugins",
    selector: "[data-onboarding-anchor='nav-plugins']",
    fallbackLabel: "plugins navigation",
  },
  {
    id: "nav-themes",
    selector: "[data-onboarding-anchor='nav-themes']",
    fallbackLabel: "theme navigation",
  },
  {
    id: "nav-diagnostics",
    selector: "[data-onboarding-anchor='nav-diagnostics']",
    fallbackLabel: "diagnostics navigation",
  },
  {
    id: "nav-settings",
    selector: "[data-onboarding-anchor='nav-settings']",
    fallbackLabel: "settings navigation",
  },
];

function media(
  type: OnboardingMediaType,
  label: string,
  caption: string
): OnboardingStep["animation"] {
  if (type === "lottie") {
    return {
      type,
      label,
      caption,
      src: "local:lottie-signal",
      fallbackSrc: onboardingFallbackSvg,
      requiresRichMedia: true,
      durationMs: 3000,
      loop: true,
    };
  }
  if (type === "webm") {
    return {
      type,
      label,
      caption,
      src: onboardingWebmPoster,
      fallbackSrc: onboardingWebmPoster,
      requiresRichMedia: true,
      durationMs: 3600,
    };
  }
  if (type === "audio") {
    return {
      type,
      label,
      caption,
      src: onboardingSilentAudio,
      fallbackSrc: onboardingFallbackSvg,
      requiresRichMedia: true,
      durationMs: 1200,
    };
  }
  if (type === "shader") {
    return {
      type,
      label,
      caption,
      shaderSource: onboardingShaderSource,
      fallbackSrc: onboardingFallbackSvg,
      requiresRichMedia: true,
      durationMs: 3000,
    };
  }
  return {
    type,
    label,
    caption,
    fallbackSrc: onboardingFallbackSvg,
    durationMs: 2200,
    loop: type === "css",
  };
}

function step(
  featureId: string,
  id: string,
  title: string,
  jpeText: string,
  anchorId: string,
  viewfinderType: OnboardingStep["viewfinderType"],
  animationType: OnboardingMediaType,
  safetyNote?: string,
  conditions: OnboardingCondition[] = [{ kind: "always" }]
): OnboardingStep {
  return {
    id: `${featureId}.${id}`,
    featureId,
    title,
    jpeText,
    technicalText: safetyNote,
    viewfinderType,
    anchorId,
    animation: media(animationType, title, jpeText),
    inputHints: controllerBasics,
    skippable: true,
    estimatedSeconds: 12,
    conditions,
    safetyNote,
  };
}

const manifests: OnboardingManifest[] = [
  {
    featureId: "workspace",
    featureName: "Workspace",
    version: "2.0.0",
    priority: 10,
    category: "core",
    anchors,
    steps: [
      step(
        "workspace",
        "overview",
        "Workspace",
        "This is your main workbench. Conversations, commands, tools, and AI responses live here.",
        "main-content",
        "panel",
        "lottie"
      ),
    ],
  },
  {
    featureId: "command-palette",
    featureName: "Command Palette",
    version: "2.0.0",
    priority: 20,
    category: "core",
    anchors,
    steps: [
      step(
        "command-palette",
        "jump-anywhere",
        "Command Palette",
        "The command palette is the fast way to jump anywhere or run actions without digging through menus.",
        "command-palette-trigger",
        "spotlight",
        "css"
      ),
    ],
  },
  {
    featureId: "models",
    featureName: "Models",
    version: "2.0.0",
    priority: 30,
    category: "tool",
    anchors,
    steps: [
      step(
        "models",
        "connect",
        "Models",
        "Models are the AI brains NEURODECK can use. Connect, test, and switch them here.",
        "nav-models",
        "panel",
        "webm",
        undefined,
        [{ kind: "hasNoModels" }]
      ),
    ],
  },
  {
    featureId: "agents",
    featureName: "Agents",
    version: "2.0.0",
    priority: 40,
    category: "tool",
    anchors,
    steps: [
      step(
        "agents",
        "roles",
        "Agents",
        "Agents are specialized helpers. One can code, one can test, one can write docs, and one can check security.",
        "nav-agent",
        "split",
        "svg"
      ),
    ],
  },
  {
    featureId: "memory",
    featureName: "Memory",
    version: "2.0.0",
    priority: 50,
    category: "security",
    anchors,
    steps: [
      step(
        "memory",
        "privacy",
        "Memory",
        "Memory stores useful context only when you allow it. You can control what is saved and reused.",
        "nav-memory",
        "safety",
        "audio",
        "Memory tutorials never show private memory content."
      ),
    ],
  },
  {
    featureId: "sessions",
    featureName: "Sessions",
    version: "2.0.0",
    priority: 60,
    category: "tool",
    anchors,
    steps: [
      step(
        "sessions",
        "resume",
        "Sessions",
        "Sessions are saved workspaces. They let you return to a project, chat, or tool setup later.",
        "nav-sessions",
        "emptyState",
        "css",
        undefined,
        [{ kind: "hasNoSessions" }]
      ),
    ],
  },
  {
    featureId: "browser",
    featureName: "Browser",
    version: "2.0.0",
    priority: 70,
    category: "tool",
    anchors,
    steps: [
      step(
        "browser",
        "safe-browsing",
        "Browser",
        "The browser lets you use web tools inside NEURODECK without breaking your workflow.",
        "nav-browser",
        "panel",
        "webm"
      ),
    ],
  },
  {
    featureId: "terminal",
    featureName: "Terminal",
    version: "2.0.0",
    priority: 80,
    category: "security",
    anchors,
    steps: [
      step(
        "terminal",
        "safe-command",
        "Terminal",
        "The terminal runs real commands. Check commands before running anything risky.",
        "nav-terminal",
        "safety",
        "shader",
        "Terminal demos never include real command output or secrets."
      ),
    ],
  },
  {
    featureId: "sync",
    featureName: "Sync",
    version: "2.0.0",
    priority: 90,
    category: "security",
    anchors,
    steps: [
      step(
        "sync",
        "transfer",
        "Sync",
        "Sync moves files between devices. You choose what to send and confirm the destination.",
        "nav-sync",
        "timeline",
        "css",
        "Sync demos use generic file names only."
      ),
    ],
  },
  {
    featureId: "plugins",
    featureName: "Plugins",
    version: "2.0.0",
    priority: 100,
    category: "plugin",
    anchors,
    steps: [
      step(
        "plugins",
        "trust",
        "Plugins",
        "Plugins add tools. Only enable plugins you trust and review their permissions first.",
        "nav-plugins",
        "safety",
        "svg",
        "Plugin tutorials are shown only after trust decisions."
      ),
    ],
  },
  {
    featureId: "themes",
    featureName: "Themes",
    version: "2.0.0",
    priority: 110,
    category: "tool",
    anchors,
    steps: [
      step(
        "themes",
        "preview",
        "Themes",
        "Themes change how NEURODECK looks, including high contrast and reduced motion choices.",
        "nav-themes",
        "split",
        "lottie"
      ),
    ],
  },
  {
    featureId: "diagnostics",
    featureName: "Diagnostics",
    version: "2.0.0",
    priority: 120,
    category: "core",
    anchors,
    steps: [
      step(
        "diagnostics",
        "health",
        "Diagnostics",
        "Diagnostics show what is working, what is slow, and what needs attention.",
        "nav-diagnostics",
        "panel",
        "css"
      ),
    ],
  },
  {
    featureId: "settings",
    featureName: "Settings",
    version: "2.0.0",
    priority: 130,
    category: "core",
    anchors,
    steps: [
      step(
        "settings",
        "control",
        "Settings",
        "Settings are where you control behavior, privacy, appearance, models, shortcuts, and accessibility.",
        "nav-settings",
        "panel",
        "svg"
      ),
    ],
  },
];

export function getOnboardingLottieSample() {
  return onboardingLottieSignal;
}

export function getCoreOnboardingManifests(): OnboardingManifest[] {
  return manifests.filter((manifest) => validateOnboardingManifest(manifest).length === 0);
}

function conditionPasses(
  condition: OnboardingCondition,
  state: NeuroDeckState,
  activeView?: ViewId
): boolean {
  switch (condition.kind) {
    case "always":
      return true;
    case "activeView":
      return activeView === condition.value || state.activeView === condition.value;
    case "hasNoSessions":
      return state.sessions.length === 0;
    case "hasNoModels":
      return state.models.length === 0;
    case "hasPlugins":
      return state.plugins.length > 0;
    case "deckMode":
      return state.deckMode === condition.value;
    case "featureEnabled":
      return true;
    default:
      return false;
  }
}

export function buildOnboardingSteps(options: OnboardingRuntimeOptions): OnboardingStep[] {
  const all = getCoreOnboardingManifests()
    .sort((a, b) => a.priority - b.priority)
    .flatMap((manifest) => manifest.steps);

  if (options.mode === "contextual") {
    const active = options.activeView ?? options.state.activeView;
    const exactFeature = all.filter((item) => item.featureId === active);
    if (exactFeature.length) return exactFeature;
    const byActiveCondition = all.filter((item) =>
      item.conditions?.some(
        (condition) =>
          condition.kind === "activeView" && conditionPasses(condition, options.state, active)
      )
    );
    return byActiveCondition.length ? byActiveCondition : all.slice(0, 2);
  }

  if (options.mode === "whats-new") {
    return all.slice(0, 3);
  }

  return all.filter(
    (item) =>
      !item.conditions ||
      item.conditions.some((condition) =>
        conditionPasses(condition, options.state, options.activeView)
      )
  );
}
