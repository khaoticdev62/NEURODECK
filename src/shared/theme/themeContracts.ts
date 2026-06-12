export type ThemeId = string;

export type ThemeDisplayTarget =
  | "steamdeck_lcd"
  | "steamdeck_oled"
  | "desktop_1080p"
  | "desktop_1440p"
  | "desktop_4k"
  | "docked_tv";

export type ThemePerformanceTier =
  | "battery_saver"
  | "balanced"
  | "premium"
  | "showcase";

export type WallpaperRendererType =
  | "css_gradient"
  | "canvas_2d"
  | "webgl"
  | "video_loop"
  | "static_image"
  | "procedural_shader";

export type LiveWallpaperProfile = {
  id: string;
  name: string;
  description: string;
  renderer: WallpaperRendererType;
  category:
    | "minimal"
    | "tactical"
    | "ambient"
    | "data"
    | "cinematic"
    | "developer"
    | "accessibility";
  compatibleThemes: string[];
  displayTargets: ThemeDisplayTarget[];
  performance: {
    tier: ThemePerformanceTier;
    targetFpsLCD: 30 | 45 | 60;
    targetFpsOLED: 30 | 45 | 60 | 90;
    targetFpsDesktop: 30 | 60 | 90 | 120;
    maxCpuPercentDeck: number;
    maxMemoryMb: number;
    maxParticleCountDeck: number;
    maxParticleCountDesktop: number;
    supportsFrameSkipping: boolean;
    supportsReducedMotion: boolean;
    supportsBatterySaver: boolean;
  };
  visuals: {
    basePalette: string[];
    accentPalette: string[];
    tintable: boolean;
    opacityRange: [number, number];
    brightnessRange: [number, number];
    contrastRange: [number, number];
  };
  safety: {
    burnInAware: boolean;
    avoidsFlashing: boolean;
    reducedMotionFallbackId: string;
    staticFallbackId: string;
  };
  metadata: {
    productionReady: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export type ThemeTokenSet = {
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
      idle: string;
      hover: string;
      focus: string;
      active: string;
      selected: string;
      disabled: string;
      success: string;
      warning: string;
      error: string;
      info: string;
      loading: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
      focus: string;
      danger: string;
      warning: string;
      success: string;
    };
    syntax: {
      keyword: string;
      string: string;
      number: string;
      function: string;
      variable: string;
      type: string;
      comment: string;
      operator: string;
      punctuation: string;
      error: string;
      warning: string;
    };
    telemetry: {
      cpu: string;
      gpu: string;
      memory: string;
      vram: string;
      network: string;
      latency: string;
      tokens: string;
      battery: string;
      temperature: string;
    };
  };
  typography: {
    fontFamily: {
      ui: string;
      mono: string;
      code: string;
      display: string;
    };
    size: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
      code: string;
      deckReadable: string;
    };
    weight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
      code: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    panelGap: string;
    deckSafeInset: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    card: string;
    modal: string;
    pill: string;
  };
  shadow: {
    none: string;
    subtle: string;
    panel: string;
    modal: string;
    glow: string;
    focus: string;
  };
  glass: {
    opacity: number;
    blur: string;
    borderOpacity: number;
    highlightOpacity: number;
    noiseOpacity: number;
  };
  motion: {
    durationFast: string;
    durationNormal: string;
    durationSlow: string;
    easingStandard: string;
    easingEmphasis: string;
    pulseIntensity: number;
    glowIntensity: number;
  };
  wallpaper: {
    tint: string;
    tintOpacity: number;
    vignetteOpacity: number;
    grainOpacity: number;
    blur: string;
    brightness: number;
    saturation: number;
    contrast: number;
  };
};

export type NeurodeckTheme = {
  id: ThemeId;
  name: string;
  description: string;
  version: string;
  category:
    | "core"
    | "premium"
    | "accessibility"
    | "developer"
    | "focus"
    | "cinematic"
    | "minimal"
    | "experimental";
  tags: string[];
  displayTargets: ThemeDisplayTarget[];
  performanceTier: ThemePerformanceTier;
  tokens: ThemeTokenSet;
  wallpaper: {
    defaultWallpaperId: string;
    supportedWallpaperIds: string[];
    allowLiveWallpaper: boolean;
    defaultLiveWallpaperEnabled: boolean;
  };
  accessibility: {
    supportsHighContrast: boolean;
    supportsReducedMotion: boolean;
    supportsColorblindSafe: boolean;
    supportsLowVision: boolean;
    minimumContrastRatio: number;
  };
  steamDeck: {
    lcdTuned: boolean;
    oledTuned: boolean;
    dockedTuned: boolean;
    recommendedBrightness?: number;
    fontBoost?: number;
    saturationAdjustment?: number;
    gammaAdjustment?: number;
  };
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    productionReady: boolean;
  };
};

export type ThemeSettings = {
  activeThemeId: string;
  activeWallpaperId: string;
  liveWallpaperEnabled: boolean;
  displayProfile: ThemeDisplayTarget;
  performanceTier: ThemePerformanceTier;
  accessibilityProfile:
    | "default"
    | "high_contrast"
    | "low_vision"
    | "colorblind_safe"
    | "reduced_motion"
    | "dyslexia_focus";
  wallpaperIntensity: number;
  wallpaperOpacity: number;
  glowIntensity: number;
  glassIntensity: number;
  motionIntensity: number;
  fontScale: number;
  compactMode: boolean;
};
