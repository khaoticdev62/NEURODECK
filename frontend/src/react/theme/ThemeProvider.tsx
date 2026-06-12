import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
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
import { neurodeckApi } from "../services/bridgeAdapter";
import { resolveThemeIdFromBackend } from "./themeIdMapper";

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
  const [backendReconciled, setBackendReconciled] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persistence settings on mount, then reconcile with backend theme
  useEffect(() => {
    let mounted = true;
    async function load() {
      const loaded = await themePersistenceClient.getSettings();
      if (!mounted) return;

      // Render immediately with local settings so the UI never waits on the bridge.
      setSettings(loaded);

      try {
        const init = await neurodeckApi.getInitialState();
        const backendName = init?.active_theme_name ?? null;
        const backendId = resolveThemeIdFromBackend(backendName);
        if (backendId && themeRegistry.getTheme(backendId) && backendId !== loaded.activeThemeId) {
          setSettings({ ...loaded, activeThemeId: backendId });
        }
      } catch (_) {
        // Keep local settings if the bridge is unreachable.
      }
      setBackendReconciled(true);
    }
    void load();
    return () => { mounted = false; };
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

  // Flush any pending debounced save on unmount
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // Inject CSS variables when resolved tokens changes
  useEffect(() => {
    if (resolvedTokens) {
      injectThemeVariables(resolvedTokens);
    }
  }, [resolvedTokens]);

  // Persist active theme changes back to the backend config
  useEffect(() => {
    if (!settings || !backendReconciled) return;
    void neurodeckApi.setTheme(settings.activeThemeId);
  }, [settings?.activeThemeId, backendReconciled]);

  const updateSettings = async (newSettings: Partial<ThemeSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    // Debounce writes — slider drags produce many rapid calls; only persist after 300ms idle
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void themePersistenceClient.saveSettings(updated);
      saveTimerRef.current = null;
    }, 300);
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
