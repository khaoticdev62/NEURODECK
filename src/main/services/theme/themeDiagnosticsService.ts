import { themeSettingsService } from "./themeSettingsService";
import { themeRegistry } from "../../../shared/theme/themeRegistry";
import { wallpaperRegistry } from "../../../shared/theme/wallpaperRegistry";
import { validateThemeSettings } from "../../../shared/theme/themeSchemas";

export type ThemeDiagnosticsReport = {
  ok: boolean;
  timestamp: string;
  settingsValid: boolean;
  errors: string[];
  warnings: string[];
  activeTheme: {
    id: string;
    found: boolean;
    name?: string;
    category?: string;
    performanceTier?: string;
  };
  activeWallpaper: {
    id: string;
    found: boolean;
    renderer?: string;
    isCustomPhotoUrl: boolean;
  };
  performance: {
    frameRateCapFps: number;
    reducedMotionActive: boolean;
    batterySaverModeActive: boolean;
    oledProtectionActive: boolean;
  };
  accessibility: {
    contrastChecked: boolean;
    contrastIssuesFound: boolean;
    fontScalingFactor: number;
    profile: string;
  };
};

export class ThemeDiagnosticsService {
  getDiagnosticsReport(): ThemeDiagnosticsReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const settings = themeSettingsService.getSettings();

    // 1. Settings Validation
    const settingsValidation = validateThemeSettings(settings);
    if (!settingsValidation.valid) {
      errors.push(...settingsValidation.errors.map(e => `Settings schema error: ${e}`));
    }

    // 2. Theme Verification
    const theme = themeRegistry.getTheme(settings.activeThemeId);
    const themeFound = !!theme;
    if (!themeFound) {
      errors.push(`Active theme with ID "${settings.activeThemeId}" not found in registry`);
    }

    // 3. Wallpaper Verification
    const wallpaperProfile = wallpaperRegistry.getWallpaper(settings.activeWallpaperId);
    const wallpaperFound = !!wallpaperProfile;
    // Check if the wallpaper ID looks like a local photo URL
    const isCustomPhotoUrl = settings.activeWallpaperId.startsWith("file://") || 
                             settings.activeWallpaperId.includes("/") || 
                             settings.activeWallpaperId.includes("\\");

    if (!wallpaperFound && !isCustomPhotoUrl) {
      errors.push(`Active wallpaper with ID "${settings.activeWallpaperId}" not found in registry and is not a valid local path/URL`);
    }

    // Security warning check: Remote wallpaper URLs must be rejected.
    if (isCustomPhotoUrl && (settings.activeWallpaperId.startsWith("http://") || settings.activeWallpaperId.startsWith("https://"))) {
      errors.push(`Remote wallpaper URLs ("${settings.activeWallpaperId}") are rejected due to security policies. Use file:// or local paths.`);
    }

    // 4. Performance & Hardware Limits
    let targetFps = 60;
    if (settings.displayProfile === "steamdeck_lcd") {
      targetFps = wallpaperProfile?.performance.targetFpsLCD || 60;
    } else if (settings.displayProfile === "steamdeck_oled") {
      targetFps = wallpaperProfile?.performance.targetFpsOLED || 90;
    } else if (settings.displayProfile.startsWith("desktop")) {
      targetFps = wallpaperProfile?.performance.targetFpsDesktop || 120;
    }

    // Framerate throttles based on performance tier
    const isBatterySaver = settings.performanceTier === "battery_saver";
    if (isBatterySaver) {
      targetFps = 30; // Force low FPS to save battery life
      if (settings.liveWallpaperEnabled) {
        warnings.push("Live wallpaper is enabled while on Battery Saver performance profile. Consider disabling live wallpaper for max battery life.");
      }
    }

    const reducedMotionActive = settings.accessibilityProfile === "reduced_motion" || 
                                (isBatterySaver && wallpaperProfile?.performance.supportsReducedMotion);

    // OLED Burn-in mitigation diagnostics
    const isOledProfile = settings.displayProfile === "steamdeck_oled";
    const oledDimmingActive = isOledProfile && (theme?.id === "oled_void" || theme?.id === "blacksite_prime" || wallpaperProfile?.safety.burnInAware);

    // 5. Accessibility Contrast
    let contrastIssuesFound = false;
    let contrastChecked = false;
    if (theme) {
      contrastChecked = true;
      // High contrast rules check
      if (settings.accessibilityProfile === "high_contrast" && !theme.accessibility.supportsHighContrast) {
        warnings.push(`Current theme "${theme.name}" does not support high contrast profile native overrides. Contrast compliance might fall back to browser color filters.`);
        contrastIssuesFound = true;
      }
    }

    return {
      ok: errors.length === 0,
      timestamp: new Date().toISOString(),
      settingsValid: settingsValidation.valid,
      errors,
      warnings,
      activeTheme: {
        id: settings.activeThemeId,
        found: themeFound,
        name: theme?.name,
        category: theme?.category,
        performanceTier: theme?.performanceTier,
      },
      activeWallpaper: {
        id: settings.activeWallpaperId,
        found: wallpaperFound,
        renderer: wallpaperProfile?.renderer,
        isCustomPhotoUrl,
      },
      performance: {
        frameRateCapFps: targetFps,
        reducedMotionActive: !!reducedMotionActive,
        batterySaverModeActive: isBatterySaver,
        oledProtectionActive: !!oledDimmingActive,
      },
      accessibility: {
        contrastChecked,
        contrastIssuesFound,
        fontScalingFactor: settings.fontScale,
        profile: settings.accessibilityProfile,
      },
    };
  }
}

export const themeDiagnosticsService = new ThemeDiagnosticsService();
