import type { ThemeTokenSet } from "./themeContracts";

export function adjustTokensForAccessibility(
  tokens: ThemeTokenSet,
  profile: string
): ThemeTokenSet {
  const adjusted = JSON.parse(JSON.stringify(tokens)) as ThemeTokenSet;

  switch (profile) {
    case "high_contrast":
      // High Contrast: black, white, bright yellow borders
      adjusted.color.surface.app = "#000000";
      adjusted.color.surface.base = "#000000";
      adjusted.color.surface.raised = "#000000";
      adjusted.color.surface.sunken = "#000000";
      adjusted.color.text.primary = "#FFFFFF";
      adjusted.color.text.secondary = "#FFFFFF";
      adjusted.color.text.muted = "#FFFFFF";
      adjusted.color.accent.primary = "#FFFF00"; // Pure bright yellow
      adjusted.color.border.default = "#FFFFFF";
      adjusted.color.border.strong = "#FFFF00";
      adjusted.glass.blur = "0px";
      adjusted.glass.opacity = 0;
      break;

    case "low_vision":
      // Low Vision: Large fonts, thick borders
      adjusted.typography.size.xs = "14px";
      adjusted.typography.size.sm = "16px";
      adjusted.typography.size.md = "18px";
      adjusted.typography.size.lg = "22px";
      adjusted.typography.size.xl = "26px";
      adjusted.typography.size.xxl = "36px";
      adjusted.typography.size.deckReadable = "20px";
      adjusted.color.border.default = "rgba(255,255,255,0.4)";
      break;

    case "colorblind_safe":
      // Colorblind safe state colors: avoid red/green confusion, use distinct blue/orange
      adjusted.color.state.success = "#3B82F6"; // Safe Blue
      adjusted.color.state.error = "#F59E0B"; // Safe Orange/Amber
      adjusted.color.state.warning = "#FFDD00"; // Bright Yellow
      break;

    case "reduced_motion":
      // Reduced motion: zero out animation timers, disable pulsing/glow
      adjusted.motion.durationFast = "0ms";
      adjusted.motion.durationNormal = "0ms";
      adjusted.motion.durationSlow = "0ms";
      adjusted.motion.pulseIntensity = 0;
      adjusted.motion.glowIntensity = 0;
      break;

    case "dyslexia_focus":
      // Dyslexia focus: soft cream background, dark sepia text
      adjusted.color.surface.app = "#F4ECD8"; // Soft warm sepia
      adjusted.color.surface.base = "#EFE5CD";
      adjusted.color.surface.raised = "#E6DABF";
      adjusted.color.text.primary = "#2B1E10"; // Dark warm brown
      adjusted.color.text.secondary = "#3D2B17";
      adjusted.color.text.muted = "#6B5843";
      adjusted.color.accent.primary = "#8B5A2B"; // Brownish accent
      adjusted.typography.fontFamily.ui = "OpenDyslexic, 'Comic Sans MS', sans-serif";
      adjusted.typography.fontFamily.mono = "OpenDyslexicMono, monospace";
      break;
  }

  return adjusted;
}
