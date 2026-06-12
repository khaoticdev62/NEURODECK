import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type {
  NeurodeckTheme,
  ThemeSettings,
  ThemeTokenSet,
  LiveWallpaperProfile,
} from "../../shared/theme/themeContracts";
import { themeRegistry } from "../../shared/theme/themeRegistry";
import { wallpaperRegistry } from "../../shared/theme/wallpaperRegistry";
import { themePersistenceClient } from "./themePersistenceClient";
import { injectThemeVariables } from "./cssVariableInjector";

interface ThemeContextType {
  settings: ThemeSettings;
  activeTheme: NeurodeckTheme;
  resolvedTokens: ThemeTokenSet;
  availableThemes: NeurodeckTheme[];
  availableWallpapers: LiveWallpaperProfile[];
  updateSettings: (newSettings: Partial<ThemeSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);

  // Load persistence settings on mount
  useEffect(() => {
    themePersistenceClient.getSettings().then((loaded) => {
      setSettings(loaded);
    });
  }, []);

  const availableThemes = useMemo(() => themeRegistry.listThemes(), []);
  const availableWallpapers = useMemo(() => wallpaperRegistry.listWallpapers(), []);

  const activeTheme = useMemo(() => {
    if (!settings) return availableThemes[0];
    return themeRegistry.getTheme(settings.activeThemeId) || availableThemes[0];
  }, [settings, availableThemes]);

  const resolvedTokens = useMemo(() => {
    if (!settings) return activeTheme.tokens;
    return (
      themeRegistry.resolveTokens(
        settings.activeThemeId,
        settings.displayProfile,
        settings.accessibilityProfile,
        settings.accessibilityProfile === "reduced_motion" ? "reduced" : "normal"
      ) || activeTheme.tokens
    );
  }, [settings, activeTheme]);

  // Inject CSS variables when resolved tokens changes
  useEffect(() => {
    if (resolvedTokens) {
      injectThemeVariables(resolvedTokens);
    }
  }, [resolvedTokens]);

  const updateSettings = async (newSettings: Partial<ThemeSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await themePersistenceClient.saveSettings(updated);
  };

  const resetToDefaults = async () => {
    const defaults: ThemeSettings = {
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
    setSettings(defaults);
    await themePersistenceClient.saveSettings(defaults);
  };

  if (!settings) {
    return null; // Await hydration
  }

  return (
    <ThemeContext.Provider
      value={{
        settings,
        activeTheme,
        resolvedTokens,
        availableThemes,
        availableWallpapers,
        updateSettings,
        resetToDefaults,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
