import type { ThemeTokenSet } from "../shared/theme/themeContracts";
import { resolveSemanticTokens, semanticTokensToCssVars } from "../../shared/theme/designTokens";

export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return "255, 255, 255";
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

function setVars(root: HTMLElement, vars: Record<string, string | number | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      root.style.setProperty(key, String(value));
    }
  }
}

function injectDsTokens(root: HTMLElement, tokens: ThemeTokenSet) {
  const { color: c, typography: t, radius: r, motion: m } = tokens;

  setVars(root, {
    "--nd-void-950": c.surface.app,
    "--nd-void-900": c.surface.app,
    "--nd-void-850": c.surface.sidebar,
    "--nd-slate-800": c.surface.base,
    "--nd-slate-700": c.surface.raised,
    "--nd-slate-600": c.surface.tooltip,
    "--nd-text-100": c.text.primary,
    "--nd-text-300": c.text.secondary,
    "--nd-text-500": c.text.muted,
  });

  const accentMap = {
    "--nd-cyan-400": c.accent.primary,
    "--nd-blue-500": c.state.info,
    "--nd-green-400": c.state.success,
    "--nd-yellow-400": c.state.warning,
    "--nd-red-400": c.state.error,
    "--nd-purple-400": c.accent.tertiary ?? "#B28CFF",
  } as const;
  for (const [key, value] of Object.entries(accentMap)) {
    root.style.setProperty(key, value);
    root.style.setProperty(key.replace("-400", "-rgb").replace("-500", "-rgb"), hexToRgb(value));
  }

  setVars(root, {
    "--nd-surface-app": c.surface.app,
    "--nd-surface-primary": c.surface.base,
    "--nd-surface-secondary": c.surface.raised,
    "--nd-surface-tertiary": c.surface.card,
    "--nd-surface-sidebar": c.surface.sidebar,
    "--nd-surface-input": c.surface.input,
    "--nd-surface-overlay": c.surface.overlay,
    "--nd-surface-glass": c.surface.glass,
    "--nd-border-subtle": c.border.subtle,
    "--nd-border-default": c.border.default,
    "--nd-border-strong": c.border.strong,
    "--nd-border-focus": c.border.focus,
    "--nd-text-primary": c.text.primary,
    "--nd-text-secondary": c.text.secondary,
    "--nd-text-muted": c.text.muted,
    "--nd-text-disabled": c.state.disabled,
    "--nd-text-code": c.text.code,
    "--nd-text-link": c.text.link,
    "--nd-accent-primary": c.accent.primary,
    "--nd-accent-info": c.state.info,
    "--nd-accent-success": c.state.success,
    "--nd-accent-warning": c.state.warning,
    "--nd-accent-error": c.state.error,
    "--nd-accent-agent": c.accent.tertiary ?? "#B28CFF",
    "--nd-glow-cyan": c.accent.glow,
    "--nd-accent-soft": c.accent.soft,
    "--nd-font-display": t.fontFamily.display,
    "--nd-font-hud": t.fontFamily.ui,
    "--nd-font-ui": t.fontFamily.ui,
    "--nd-font-mono": t.fontFamily.mono,
    "--nd-font-code": t.fontFamily.code ?? t.fontFamily.mono,
    "--nd-radius-sm": r.sm,
    "--nd-radius-md": r.md,
    "--nd-radius-lg": r.lg,
    "--nd-radius-xl": r.xl ?? r.modal,
    "--nd-radius-full": r.pill,
    "--nd-motion-instant": "0ms",
    "--nd-motion-fast": m.durationFast,
    "--nd-motion-normal": m.durationNormal,
    "--nd-motion-slow": m.durationSlow,
    "--nd-ease-standard": m.easingStandard ?? "cubic-bezier(0.4, 0, 0.2, 1)",
    "--nd-ease-out": m.easingEmphasis ?? "cubic-bezier(0.25, 1, 0.5, 1)",
    "--nd-ease-in": "cubic-bezier(0.4, 0, 1, 1)",
    "--nd-elevation-none": "none",
    "--nd-elevation-panel": "0 1px 0 rgba(255,255,255,0.04)",
    "--nd-elevation-card": tokens.shadow?.panel ?? "0 4px 16px rgba(0,0,0,0.6)",
    "--nd-elevation-overlay": tokens.shadow?.modal ?? "0 8px 32px rgba(0,0,0,0.8)",
    "--nd-elevation-focus": `0 0 0 2px ${c.border.focus}, 0 0 24px rgba(${hexToRgb(
      c.accent.primary
    )}, 0.18)`,
    "--nd-elevation-glow": tokens.shadow?.glow ?? `0 0 16px rgba(${hexToRgb(c.accent.primary)}, 0.18)`,
    "--nd-glass-blur": tokens.glass.blur,
  });
}

/**
 * Map a canonical theme ID to the NEURODECK Design Tokens v1.0 theme class.
 * Applied to document.body so the bundled v1.0 CSS theme modifiers participate
 * in the visual layer alongside the JS-injected token variables.
 */
const DS_THEME_CLASSES = [
  "theme-blacksite",
  "theme-tactical-glass",
  "theme-high-contrast",
  "theme-colorblind-safe",
];

const THEME_ID_TO_CLASS: Record<string, string> = {
  blacksite_prime: "theme-blacksite",
  minimal_ops: "theme-blacksite",
  ghost_terminal_pro: "theme-blacksite",
  syntax_forge: "theme-blacksite",
  tactical_glass_ultra: "theme-tactical-glass",
  iceglass_control: "theme-tactical-glass",
  high_contrast_command: "theme-high-contrast",
  oled_pure_black: "theme-high-contrast",
  colorblind_safe_ops: "theme-colorblind-safe",
};

export function applyDsThemeClass(themeId: string) {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  for (const cls of DS_THEME_CLASSES) {
    body.classList.remove(cls);
  }

  const next = THEME_ID_TO_CLASS[themeId];
  if (next) {
    body.classList.add(next);
  }
}

export function injectThemeVariables(tokens: ThemeTokenSet) {
  if (!tokens?.color?.accent) return;
  const root = document.documentElement;
  try {
    setVars(root, {
      "--nd-bg": tokens.color.surface.app,
      "--nd-surface": tokens.color.surface.base,
      "--nd-surface-raised": tokens.color.surface.raised,
      "--nd-surface-sunken": tokens.color.surface.sunken,
      "--nd-surface-overlay": tokens.color.surface.overlay,
      "--nd-surface-modal": tokens.color.surface.modal,
      "--nd-surface-glass": tokens.color.surface.glass,
      "--nd-surface-sidebar": tokens.color.surface.sidebar,
      "--nd-surface-panel": tokens.color.surface.panel,
      "--nd-surface-card": tokens.color.surface.card,
      "--nd-surface-input": tokens.color.surface.input,
      "--nd-surface-tooltip": tokens.color.surface.tooltip,
      "--nd-text": tokens.color.text.primary,
      "--nd-text-secondary": tokens.color.text.secondary,
      "--nd-text-tertiary": tokens.color.text.tertiary,
      "--nd-text-muted": tokens.color.text.muted,
      "--nd-text-inverse": tokens.color.text.inverse,
      "--nd-text-link": tokens.color.text.link,
      "--nd-text-code": tokens.color.text.code,
      "--nd-text-command": tokens.color.text.command,
      "--nd-text-danger": tokens.color.text.danger,
      "--nd-text-warning": tokens.color.text.warning,
      "--nd-text-success": tokens.color.text.success,
      "--nd-text-info": tokens.color.text.info,
      "--nd-accent": tokens.color.accent.primary,
      "--nd-accent-rgb": hexToRgb(tokens.color.accent.primary),
      "--nd-accent-secondary": tokens.color.accent.secondary,
      "--nd-accent-tertiary": tokens.color.accent.tertiary,
      "--nd-accent-glow": tokens.color.accent.glow,
      "--nd-accent-soft": tokens.color.accent.soft,
      "--nd-accent-strong": tokens.color.accent.strong,
      "--nd-state-success": tokens.color.state.success,
      "--nd-state-warning": tokens.color.state.warning,
      "--nd-state-error": tokens.color.state.error,
      "--nd-state-info": tokens.color.state.info,
      "--nd-state-success-rgb": hexToRgb(tokens.color.state.success),
      "--nd-state-warning-rgb": hexToRgb(tokens.color.state.warning),
      "--nd-state-error-rgb": hexToRgb(tokens.color.state.error),
      "--nd-state-info-rgb": hexToRgb(tokens.color.state.info),
      "--nd-accent-primary-rgb": hexToRgb(tokens.color.accent.primary),
      "--nd-border-subtle": tokens.color.border.subtle,
      "--nd-border": tokens.color.border.default,
      "--nd-border-strong": tokens.color.border.strong,
      "--nd-border-focus": tokens.color.border.focus,
      "--nd-success": tokens.color.state.success,
      "--nd-warning": tokens.color.state.warning,
      "--nd-danger": tokens.color.state.error,
      "--nd-glow": tokens.color.accent.glow,
      "--tw-shadow-color": tokens.color.accent.glow,
      "--nd-font-ui": tokens.typography.fontFamily.ui,
      "--nd-font-mono": tokens.typography.fontFamily.mono,
      "--nd-font-display": tokens.typography.fontFamily.display,
      "--nd-glass-opacity": tokens.glass.opacity.toString(),
      "--nd-glass-blur": tokens.glass.blur,
      "--nd-glass-surface": tokens.color.surface.glass,
      "--nd-glass-border": tokens.color.border.subtle,
      "--nd-radius-sm": tokens.radius.sm,
      "--nd-radius-md": tokens.radius.md,
      "--nd-radius-lg": tokens.radius.lg,
      "--nd-radius-xl": tokens.radius.xl ?? tokens.radius.modal,
      "--nd-radius-full": tokens.radius.pill,
      "--nd-space-xs": tokens.spacing.xs,
      "--nd-space-sm": tokens.spacing.sm,
      "--nd-space-md": tokens.spacing.md,
      "--nd-space-lg": tokens.spacing.lg,
      "--nd-space-xl": tokens.spacing.xl,
      "--nd-space-2xl": tokens.spacing.panelGap,
      "--nd-transition-fast": tokens.motion.durationFast,
      "--nd-transition-normal": tokens.motion.durationNormal,
      "--nd-transition-slow": tokens.motion.durationSlow,
      "--nd-ease-standard": tokens.motion.easingStandard ?? "cubic-bezier(0.4, 0, 0.2, 1)",
      "--nd-ease-emphasis": tokens.motion.easingEmphasis ?? "cubic-bezier(0.34, 1.56, 0.64, 1)",
    });

    const semantic = resolveSemanticTokens(tokens);
    setVars(root, semanticTokensToCssVars(semantic));

    injectDsTokens(root, tokens);
  } catch {
    // Malformed token set — CSS variables retain their last valid state.
  }
}
