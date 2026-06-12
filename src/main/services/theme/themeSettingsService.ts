import * as fs from "fs";
import * as path from "path";
import type { ThemeSettings } from "../../../shared/theme/themeContracts";
import { validateThemeSettings } from "../../../shared/theme/themeSchemas";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  activeThemeId: "blacksite_prime",
  activeWallpaperId: "neural_aurora",
  liveWallpaperEnabled: true,
  displayProfile: "steamdeck_lcd",
  performanceTier: "balanced",
  accessibilityProfile: "default",
  wallpaperIntensity: 0.5,
  wallpaperOpacity: 0.8,
  glowIntensity: 0.7,
  glassIntensity: 0.8,
  motionIntensity: 0.8,
  fontScale: 1.0,
  compactMode: false,
};

export class ThemeSettingsService {
  private settingsPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.settingsPath = customPath;
    } else {
      try {
        const { app } = require("electron");
        this.settingsPath = path.join(app.getPath("userData"), "theme-settings.json");
      } catch {
        // Fallback for non-Electron test environments
        this.settingsPath = path.join(process.cwd(), "theme-settings-test.json");
      }
    }
  }

  getSettings(): ThemeSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, "utf-8");
        const parsed = JSON.parse(content);
        // Ensure default settings are populated for missing fields
        const merged = { ...DEFAULT_THEME_SETTINGS, ...parsed };
        const validation = validateThemeSettings(merged);
        if (validation.valid) {
          return merged;
        } else {
          console.warn("Invalid theme settings found, returning defaults:", validation.errors);
        }
      }
    } catch (err) {
      console.error("Failed to read theme settings:", err);
    }
    return { ...DEFAULT_THEME_SETTINGS };
  }

  setSettings(settings: Partial<ThemeSettings>): { ok: boolean; errors?: string[] } {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...settings };
      const validation = validateThemeSettings(merged);
      if (!validation.valid) {
        return { ok: false, errors: validation.errors };
      }

      fs.writeFileSync(this.settingsPath, JSON.stringify(merged, null, 2), "utf-8");
      return { ok: true };
    } catch (err: any) {
      console.error("Failed to write theme settings:", err);
      return { ok: false, errors: [err.message || String(err)] };
    }
  }

  resetSettings(): { ok: boolean } {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(DEFAULT_THEME_SETTINGS, null, 2), "utf-8");
      return { ok: true };
    } catch (err) {
      console.error("Failed to reset theme settings:", err);
      return { ok: false };
    }
  }

  migrateLocalStorageSettings(localSettings: any): { ok: boolean; migrated: boolean } {
    if (!localSettings || typeof localSettings !== "object") {
      return { ok: false, migrated: false };
    }

    try {
      const mapped: Partial<ThemeSettings> = {};
      if (typeof localSettings.activeThemeId === "string") {
        mapped.activeThemeId = localSettings.activeThemeId;
      }
      if (typeof localSettings.activeWallpaperId === "string") {
        mapped.activeWallpaperId = localSettings.activeWallpaperId;
      }
      if (typeof localSettings.liveWallpaperEnabled === "boolean") {
        mapped.liveWallpaperEnabled = localSettings.liveWallpaperEnabled;
      }
      if (
        localSettings.displayProfile === "steamdeck_lcd" ||
        localSettings.displayProfile === "steamdeck_oled" ||
        localSettings.displayProfile === "desktop_1080p" ||
        localSettings.displayProfile === "desktop_1440p" ||
        localSettings.displayProfile === "desktop_4k" ||
        localSettings.displayProfile === "docked_tv"
      ) {
        mapped.displayProfile = localSettings.displayProfile;
      }

      if (Object.keys(mapped).length > 0) {
        const result = this.setSettings(mapped);
        return { ok: result.ok, migrated: result.ok };
      }

      return { ok: true, migrated: false };
    } catch (err) {
      console.error("Failed to migrate local settings:", err);
      return { ok: false, migrated: false };
    }
  }
}

export const themeSettingsService = new ThemeSettingsService();
