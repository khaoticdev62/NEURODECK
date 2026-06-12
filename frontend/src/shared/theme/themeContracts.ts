export type ThemeDisplayTarget =
  | "steamdeck_lcd"
  | "steamdeck_oled"
  | "desktop_lcd"
  | "desktop_oled"
  | "broadcast_monitor";

export type AccessibilityProfile =
  | "default"
  | "high_contrast"
  | "reduced_motion"
  | "large_text"
  | "colorblind_deuteranopia"
  | "colorblind_protanopia"
  | "colorblind_tritanopia";

export type PerformanceTier = "battery" | "balanced" | "performance" | "quality";

export interface ThemeTokenSet {
  color: {
    surface: {
      app: string;
      base: string;
      raised: string;
      sunken: string;
      overlay: string;
      modal: string;
      glass: string;
      sidebar: string;
      panel: string;
      card: string;
      input: string;
      tooltip: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      muted: string;
      inverse: string;
      link: string;
      code: string;
      command: string;
      danger: string;
      warning: string;
      success: string;
      info: string;
    };
    accent: {
      primary: string;
      secondary: string;
      tertiary: string;
      glow: string;
      soft: string;
      strong: string;
    };
    state: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
      focus: string;
    };
  };
  typography: {
    fontFamily: {
      ui: string;
      mono: string;
      display: string;
    };
  };
  glass: {
    opacity: number;
    blur: string;
  };
  motion: {
    durationFast: string;
    durationNormal: string;
    durationSlow: string;
  };
}

export interface NeurodeckTheme {
  id: string;
  name: string;
  description: string;
  category: string;
  steamDeck: {
    oledTuned: boolean;
  };
  tokens: ThemeTokenSet;
}

export interface LiveWallpaperProfile {
  id: string;
  name: string;
  description?: string;
  renderer: string;
  visuals: {
    basePalette: string[];
  };
}

export interface ThemeSettings {
  activeThemeId: string;
  activeWallpaperId: string;
  liveWallpaperEnabled: boolean;
  displayProfile: ThemeDisplayTarget;
  performanceTier: PerformanceTier;
  accessibilityProfile: AccessibilityProfile;
  wallpaperIntensity: number;
  wallpaperOpacity: number;
  glowIntensity: number;
  glassIntensity: number;
  motionIntensity: number;
  fontScale: number;
  compactMode: boolean;
}
