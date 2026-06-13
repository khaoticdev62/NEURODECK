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

const DEFAULT_SETTINGS_FALLBACK: ThemeSettings = {
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with fallback so children never receive a null context — avoids the
  // hard unmount/remount caused by returning null during async settings load.
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS_FALLBACK);
  const [backendReconciled, setBackendReconciled] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persistence settings on mount, then reconcile with backend theme
  useEffect(() => {
    let mounted = true;
    async function load() {
      let loaded = await themePersistenceClient.getSettings();
      if (!mounted) return;

      // Validate persisted theme ID — reset to default if the theme no longer exists
      // (e.g. after a plugin removal or data corruption). The UI already shows
      // DEFAULT_SETTINGS_FALLBACK while this runs, so no premature setSettings needed.
      if (!themeRegistry.getTheme(loaded.activeThemeId)) {
        loaded = { ...loaded, activeThemeId: DEFAULT_SETTINGS_FALLBACK.activeThemeId };
      }

      try {
        const init = await neurodeckApi.getInitialState();
        const backendName = init?.active_theme_name ?? null;
        const backendId = resolveThemeIdFromBackend(backendName);
        if (backendId && themeRegistry.getTheme(backendId) && backendId !== loaded.activeThemeId) {
          loaded = { ...loaded, activeThemeId: backendId };
        }
      } catch (_) {
        // Keep validated local settings if the bridge is unreachable.
      }

      if (mounted) {
        setSettings(loaded);
        setBackendReconciled(true);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const availableThemes = useMemo(() => themeRegistry.listThemes(), []);
  const availableWallpapers = useMemo(() => wallpaperRegistry.listWallpapers(), []);

  const activeTheme = useMemo(() => {
    return themeRegistry.getTheme(settings.activeThemeId) || availableThemes[0];
  }, [settings, availableThemes]);

  const resolvedTokens = useMemo(() => {
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
    if (!backendReconciled) return;
    void neurodeckApi.setTheme(settings.activeThemeId);
  }, [settings.activeThemeId, backendReconciled]);

  const updateSettings = async (newSettings: Partial<ThemeSettings>) => {
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
    setSettings(DEFAULT_SETTINGS_FALLBACK);
    await themePersistenceClient.saveSettings(DEFAULT_SETTINGS_FALLBACK);
  };

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
