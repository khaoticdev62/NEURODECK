import type { ThemeSettings } from "../../shared/theme/themeContracts";

const DEFAULT_SETTINGS: ThemeSettings = {
  activeThemeId: "blacksite_prime",
  activeWallpaperId: "neural_aurora",
  liveWallpaperEnabled: true,
  displayProfile: "steamdeck_lcd",
  performanceTier: "balanced",
  accessibilityProfile: "default",
  wallpaperIntensity: 50,
  wallpaperOpacity: 10,
  glowIntensity: 100,
  glassIntensity: 100,
  motionIntensity: 100,
  fontScale: 100,
  compactMode: false,
};

export class ThemePersistenceClient {
  async getSettings(): Promise<ThemeSettings> {
    try {
      // Access through window.neurodeck.settings preload interface if available
      const api = (window as any).neurodeck?.settings;
      if (api) {
        const stored = await api.get("themeSettings");
        if (stored && typeof stored.payload === "object") {
          return { ...DEFAULT_SETTINGS, ...stored.payload };
        }
      }
    } catch (_) {
      // Fallback
    }

    // Fallback to localStorage if preload fails
    const local = localStorage.getItem("themeSettings");
    if (local) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
      } catch (_) {
        // Fallback to defaults
      }
    }
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: ThemeSettings): Promise<void> {
    const local = JSON.stringify(settings);
    localStorage.setItem("themeSettings", local);

    try {
      const api = (window as any).neurodeck?.settings;
      if (api) {
        await api.set("themeSettings", settings);
      }
    } catch (_) {
      // Ignored
    }
  }
}

export const themePersistenceClient = new ThemePersistenceClient();
