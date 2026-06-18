import type { NeurodeckTheme } from "../../shared/theme/themeContracts";
import { getDefaultTokens } from "../../../shared/theme/themePresets";

function toRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a full NeurodeckTheme from the flat token map produced by
 * ThemeEditorDrawer. Unspecified token categories are inherited from the
 * default token set so the resulting theme remains valid and renderable.
 */
export function buildThemeFromEditorTokens(
  name: string,
  editorTokens: Record<string, string>
): NeurodeckTheme {
  const tokens = getDefaultTokens();
  const accentPrimary = editorTokens["--nd-accent-primary"] ?? tokens.color.accent.primary;
  const accentSecondary = editorTokens["--nd-accent-secondary"] ?? tokens.color.accent.secondary;
  const surfaceBg = editorTokens["--nd-surface-bg"] ?? tokens.color.surface.app;
  const surfaceSecondary = editorTokens["--nd-surface-secondary"] ?? tokens.color.surface.raised;
  const surfaceTertiary = editorTokens["--nd-surface-tertiary"] ?? tokens.color.surface.sunken;
  const textPrimary = editorTokens["--nd-text-primary"] ?? tokens.color.text.primary;
  const textSecondary = editorTokens["--nd-text-secondary"] ?? tokens.color.text.secondary;
  const textMuted = editorTokens["--nd-text-muted"] ?? tokens.color.text.muted;
  const borderSubtle = editorTokens["--nd-border-subtle"] ?? tokens.color.border.subtle;
  const statusSuccess = editorTokens["--nd-status-success"] ?? tokens.color.state.success;
  const statusWarning = editorTokens["--nd-status-warning"] ?? tokens.color.state.warning;
  const statusError = editorTokens["--nd-status-error"] ?? tokens.color.state.error;

  Object.assign(tokens.color.accent, {
    primary: accentPrimary,
    secondary: accentSecondary,
    tertiary: accentSecondary,
    strong: accentPrimary,
    glow: toRgba(accentPrimary, 0.18),
    soft: toRgba(accentPrimary, 0.1),
  });

  Object.assign(tokens.color.surface, {
    app: surfaceBg,
    base: surfaceBg,
    sidebar: surfaceBg,
    panel: surfaceBg,
    raised: surfaceSecondary,
    card: surfaceSecondary,
    modal: surfaceSecondary,
    overlay: toRgba(surfaceSecondary, 0.88),
    glass: toRgba(surfaceSecondary, 0.82),
    sunken: surfaceTertiary,
    input: surfaceTertiary,
    tooltip: surfaceTertiary,
  });

  Object.assign(tokens.color.text, {
    primary: textPrimary,
    secondary: textSecondary,
    tertiary: textMuted,
    muted: textMuted,
    inverse: surfaceBg,
    link: accentPrimary,
    code: statusSuccess,
    command: accentPrimary,
    danger: statusError,
    warning: statusWarning,
    success: statusSuccess,
    info: accentSecondary,
  });

  Object.assign(tokens.color.border, {
    subtle: borderSubtle,
    default: borderSubtle,
    strong: textSecondary,
    focus: accentPrimary,
    danger: statusError,
    warning: statusWarning,
    success: statusSuccess,
  });

  Object.assign(tokens.color.state, {
    success: statusSuccess,
    warning: statusWarning,
    error: statusError,
    info: accentSecondary,
    loading: toRgba(accentPrimary, 0.5),
    hover: toRgba(accentPrimary, 0.08),
    focus: toRgba(accentPrimary, 0.15),
    active: toRgba(accentPrimary, 0.2),
    selected: toRgba(accentPrimary, 0.1),
  });

  Object.assign(tokens.color.syntax, {
    keyword: accentPrimary,
    string: statusSuccess,
    number: statusWarning,
    function: accentSecondary,
    variable: textPrimary,
    comment: textMuted,
  });

  Object.assign(tokens.color.telemetry, {
    cpu: accentPrimary,
    gpu: accentSecondary,
    memory: statusSuccess,
    network: accentSecondary,
    latency: statusSuccess,
    battery: statusSuccess,
    temperature: statusError,
  });

  tokens.wallpaper.tint = accentPrimary;
  tokens.shadow.glow = `0 0 16px ${toRgba(accentPrimary, 0.18)}`;
  tokens.shadow.focus = `0 0 12px ${toRgba(accentPrimary, 0.4)}`;

  const now = new Date().toISOString();
  const slug = slugify(name);
  const id = slug ? `custom-${slug}-${Date.now()}` : `custom-${Date.now()}`;

  return {
    id,
    name,
    description: "Custom theme created in the theme editor.",
    version: "1.0.0",
    category: "experimental",
    tags: ["custom"],
    displayTargets: ["steamdeck_lcd", "steamdeck_oled", "desktop_1080p", "desktop_1440p", "desktop_4k", "docked_tv"],
    performanceTier: "balanced",
    tokens,
    wallpaper: {
      defaultWallpaperId: "neural_aurora",
      supportedWallpaperIds: ["neural_aurora", "particles", "none"],
      allowLiveWallpaper: true,
      defaultLiveWallpaperEnabled: true,
    },
    accessibility: {
      supportsHighContrast: true,
      supportsReducedMotion: true,
      supportsColorblindSafe: true,
      supportsLowVision: true,
      minimumContrastRatio: 4.5,
    },
    steamDeck: {
      lcdTuned: true,
      oledTuned: true,
      dockedTuned: true,
    },
    metadata: {
      author: "User",
      createdAt: now,
      updatedAt: now,
      productionReady: true,
    },
  };
}
