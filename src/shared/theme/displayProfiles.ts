import type { ThemeDisplayTarget, ThemeTokenSet } from "./themeContracts";

export function adjustTokensForDisplay(tokens: ThemeTokenSet, profile: ThemeDisplayTarget): ThemeTokenSet {
  const adjusted = JSON.parse(JSON.stringify(tokens)) as ThemeTokenSet;

  switch (profile) {
    case "steamdeck_lcd":
      // LCD profile: Slightly higher text brightness, stronger borders, minimal blur
      adjusted.color.text.primary = "#FFFFFF"; // Force full white
      adjusted.color.border.default = "rgba(255,255,255,0.22)"; // Make borders slightly clearer
      adjusted.glass.blur = "4px"; // Minimal blur for APU performance
      adjusted.wallpaper.blur = "2px";
      break;

    case "steamdeck_oled":
      // OLED profile: True blacks, lower glow intensity to prevent burn-in
      adjusted.color.surface.app = "#000000";
      adjusted.color.surface.base = "#000000";
      adjusted.motion.glowIntensity = 0.5; // Dim the glow pulsing
      adjusted.glass.opacity = 0.05; // Make background transparent enough to see true black
      break;

    case "desktop_1080p":
    case "desktop_1440p":
    case "desktop_4k":
      // Desktop profile: High performance budgets, full resolution blurs, rich details
      adjusted.glass.blur = "16px";
      adjusted.wallpaper.blur = "8px";
      break;

    case "docked_tv":
      // Docked TV profile: Boost readable size for distance usage
      adjusted.typography.size.xs = "12px";
      adjusted.typography.size.sm = "14px";
      adjusted.typography.size.md = "16px";
      adjusted.typography.size.lg = "20px";
      adjusted.typography.size.xl = "24px";
      adjusted.typography.size.xxl = "32px";
      adjusted.typography.size.deckReadable = "18px";
      adjusted.spacing.panelGap = "16px";
      break;
  }

  return adjusted;
}
