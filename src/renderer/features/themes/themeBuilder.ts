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

  tokens.color.accent.primary = accentPrimary;
  tokens.color.accent.secondary = accentSecondary;
  tokens.color.accent.tertiary = accentSecondary;
  tokens.color.accent.strong = accentPrimary;
  tokens.color.accent.glow = toRgba(accentPrimary, 0.18);
  tokens.color.accent.soft = toRgba(accentPrimary, 0.1);

  tokens.color.surface.app = surfaceBg;
  tokens.color.surface.base = surfaceBg;
  tokens.color.surface.sidebar = surfaceBg;
  tokens.color.surface.panel = surfaceBg;
  tokens.color.surface.raised = surfaceSecondary;
  tokens.color.surface.card = surfaceSecondary;
  tokens.color.surface.modal = surfaceSecondary;
  tokens.color.surface.overlay = toRgba(surfaceSecondary, 0.88);
  tokens.color.surface.glass = toRgba(surfaceSecondary, 0.82);
  tokens.color.surface.sunken = surfaceTertiary;
  tokens.color.surface.input = surfaceTertiary;
  tokens.color.surface.tooltip = surfaceTertiary;

  tokens.color.text.primary = textPrimary;
  tokens.color.text.secondary = textSecondary;
  tokens.color.text.tertiary = textMuted;
  tokens.color.text.muted = textMuted;
  tokens.color.text.inverse = surfaceBg;
  tokens.color.text.link = accentPrimary;
  tokens.color.text.code = statusSuccess;
  tokens.color.text.command = accentPrimary;
  tokens.color.text.danger = statusError;
  tokens.color.text.warning = statusWarning;
  tokens.color.text.success = statusSuccess;
  tokens.color.text.info = accentSecondary;

  tokens.color.border.subtle = borderSubtle;
  tokens.color.border.default = borderSubtle;
  tokens.color.border.strong = textSecondary;
  tokens.color.border.focus = accentPrimary;
  tokens.color.border.danger = statusError;
  tokens.color.border.warning = statusWarning;
  tokens.color.border.success = statusSuccess;

  tokens.color.state.success = statusSuccess;
  tokens.color.state.warning = statusWarning;
  tokens.color.state.error = statusError;
  tokens.color.state.info = accentSecondary;
  tokens.color.state.loading = toRgba(accentPrimary, 0.5);
  tokens.color.state.hover = toRgba(accentPrimary, 0.08);
  tokens.color.state.focus = toRgba(accentPrimary, 0.15);
  tokens.color.state.active = toRgba(accentPrimary, 0.2);
  tokens.color.state.selected = toRgba(accentPrimary, 0.1);

  tokens.color.syntax.keyword = accentPrimary;
  tokens.color.syntax.string = statusSuccess;
  tokens.color.syntax.number = statusWarning;
  tokens.color.syntax.function = accentSecondary;
  tokens.color.syntax.variable = textPrimary;
  tokens.color.syntax.comment = textMuted;

  tokens.color.telemetry.cpu = accentPrimary;
  tokens.color.telemetry.gpu = accentSecondary;
  tokens.color.telemetry.memory = statusSuccess;
  tokens.color.telemetry.network = accentSecondary;
  tokens.color.telemetry.latency = statusSuccess;
  tokens.color.telemetry.battery = statusSuccess;
  tokens.color.telemetry.temperature = statusError;

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
