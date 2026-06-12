import type { NeurodeckTheme, ThemeSettings, LiveWallpaperProfile } from "./themeContracts";

export function validateTheme(theme: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!theme || typeof theme !== "object") {
    return { valid: false, errors: ["Theme must be an object"] };
  }

  const requiredFields = ["id", "name", "description", "version", "category", "tokens", "wallpaper", "accessibility", "steamDeck"];
  for (const field of requiredFields) {
    if (!(field in theme)) {
      errors.push(`Missing required top-level field: ${field}`);
    }
  }

  if (theme.tokens) {
    const tokenCategories = ["color", "typography", "spacing", "radius", "shadow", "glass", "motion", "wallpaper"];
    for (const cat of tokenCategories) {
      if (!(cat in theme.tokens)) {
        errors.push(`Missing token category: tokens.${cat}`);
      }
    }
    if (theme.tokens.color) {
      const colorGroups = ["surface", "text", "accent", "state", "border", "syntax", "telemetry"];
      for (const group of colorGroups) {
        if (!(group in theme.tokens.color)) {
          errors.push(`Missing color group: tokens.color.${group}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateThemeSettings(settings: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!settings || typeof settings !== "object") {
    return { valid: false, errors: ["Settings must be an object"] };
  }

  const requiredSettings = [
    "activeThemeId",
    "activeWallpaperId",
    "liveWallpaperEnabled",
    "displayProfile",
    "performanceTier",
    "accessibilityProfile",
    "wallpaperIntensity",
    "wallpaperOpacity",
    "glowIntensity",
    "glassIntensity",
    "motionIntensity",
    "fontScale",
    "compactMode",
  ];

  for (const field of requiredSettings) {
    if (!(field in settings)) {
      errors.push(`Missing settings field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateWallpaperProfile(profile: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!profile || typeof profile !== "object") {
    return { valid: false, errors: ["Wallpaper profile must be an object"] };
  }

  const requiredFields = ["id", "name", "description", "renderer", "category", "compatibleThemes", "displayTargets", "performance", "visuals", "safety"];
  for (const field of requiredFields) {
    if (!(field in profile)) {
      errors.push(`Missing required wallpaper field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
