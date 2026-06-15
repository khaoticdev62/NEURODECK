import type { ThemeTokenSet } from "../../shared/theme/themeContracts";
import {
  resolveSemanticTokens,
  semanticTokensToCssVars,
} from "../../../../src/shared/theme/designTokens";

export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return "255, 255, 255";
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

/**
 * Derive DS primitive/semantic tokens from the runtime ThemeTokenSet.
 * These names match the NEURODECK Design System CSS custom property namespace
 * used by components in frontend/src/design-system/.
 */
function injectDsTokens(root: HTMLElement, tokens: ThemeTokenSet) {
  const c = tokens.color;
  const t = tokens.typography;
  const r = tokens.radius;
  const m = tokens.motion;

  // Primitive surfaces (void/slate ramp)
  root.style.setProperty("--nd-void-950", c.surface.app);
  root.style.setProperty("--nd-void-900", c.surface.app);
  root.style.setProperty("--nd-void-850", c.surface.sidebar);
  root.style.setProperty("--nd-slate-800", c.surface.base);
  root.style.setProperty("--nd-slate-700", c.surface.raised);
  root.style.setProperty("--nd-slate-600", c.surface.tooltip);

  // Primitive text
  root.style.setProperty("--nd-text-100", c.text.primary);
  root.style.setProperty("--nd-text-300", c.text.secondary);
  root.style.setProperty("--nd-text-500", c.text.muted);

  // Primitive accents + RGB channels
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
    const rgbKey = key.replace("-400", "-rgb").replace("-500", "-rgb");
    root.style.setProperty(rgbKey, hexToRgb(value));
  }

  // Semantic surfaces
  root.style.setProperty("--nd-surface-app", c.surface.app);
  root.style.setProperty("--nd-surface-primary", c.surface.app);
  root.style.setProperty("--nd-surface-secondary", c.surface.base);
  root.style.setProperty("--nd-surface-tertiary", c.surface.raised);
  root.style.setProperty("--nd-surface-sidebar", c.surface.sidebar);
  root.style.setProperty("--nd-surface-input", c.surface.input);
  root.style.setProperty("--nd-surface-overlay", c.surface.overlay);
  root.style.setProperty("--nd-surface-glass", c.surface.glass);

  // Semantic borders
  root.style.setProperty("--nd-border-subtle", c.border.subtle);
  root.style.setProperty("--nd-border-default", c.border.default);
  root.style.setProperty("--nd-border-strong", c.border.strong);
  root.style.setProperty("--nd-border-focus", c.border.focus);

  // Semantic text
  root.style.setProperty("--nd-text-primary", c.text.primary);
  root.style.setProperty("--nd-text-secondary", c.text.secondary);
  root.style.setProperty("--nd-text-muted", c.text.muted);
  root.style.setProperty("--nd-text-disabled", c.state.disabled);
  root.style.setProperty("--nd-text-code", c.text.code);
  root.style.setProperty("--nd-text-link", c.text.link);

  // Semantic accents
  root.style.setProperty("--nd-accent-primary", c.accent.primary);
  root.style.setProperty("--nd-accent-info", c.state.info);
  root.style.setProperty("--nd-accent-success", c.state.success);
  root.style.setProperty("--nd-accent-warning", c.state.warning);
  root.style.setProperty("--nd-accent-error", c.state.error);
  root.style.setProperty("--nd-accent-agent", c.accent.tertiary ?? "#B28CFF");

  // Glow
  root.style.setProperty("--nd-glow-cyan", c.accent.glow);
  root.style.setProperty("--nd-accent-soft", c.accent.soft);

  // Typography families
  root.style.setProperty("--nd-font-display", t.fontFamily.display);
  root.style.setProperty("--nd-font-hud", t.fontFamily.ui);
  root.style.setProperty("--nd-font-ui", t.fontFamily.ui);
  root.style.setProperty("--nd-font-mono", t.fontFamily.mono);
  root.style.setProperty("--nd-font-code", t.fontFamily.code ?? t.fontFamily.mono);

  // Radius
  root.style.setProperty("--nd-radius-sm", r.sm);
  root.style.setProperty("--nd-radius-md", r.md);
  root.style.setProperty("--nd-radius-lg", r.lg);
  root.style.setProperty("--nd-radius-xl", r.xl ?? r.modal);
  root.style.setProperty("--nd-radius-full", r.pill);

  // Motion
  root.style.setProperty("--nd-motion-instant", "0ms");
  root.style.setProperty("--nd-motion-fast", m.durationFast);
  root.style.setProperty("--nd-motion-normal", m.durationNormal);
  root.style.setProperty("--nd-motion-slow", m.durationSlow);
  root.style.setProperty("--nd-ease-standard", m.easingStandard ?? "cubic-bezier(0.4, 0, 0.2, 1)");
  root.style.setProperty("--nd-ease-out", m.easingEmphasis ?? "cubic-bezier(0.25, 1, 0.5, 1)");
  root.style.setProperty("--nd-ease-in", "cubic-bezier(0.4, 0, 1, 1)");

  // Elevation
  root.style.setProperty("--nd-elevation-none", "none");
  root.style.setProperty("--nd-elevation-panel", "0 1px 0 rgba(255,255,255,0.04)");
  root.style.setProperty(
    "--nd-elevation-card",
    tokens.shadow?.panel ?? "0 4px 16px rgba(0,0,0,0.6)"
  );
  root.style.setProperty(
    "--nd-elevation-overlay",
    tokens.shadow?.modal ?? "0 8px 32px rgba(0,0,0,0.8)"
  );
  root.style.setProperty(
    "--nd-elevation-focus",
    `0 0 0 2px ${c.border.focus}, 0 0 24px rgba(${hexToRgb(c.accent.primary)}, 0.18)`
  );
  root.style.setProperty(
    "--nd-elevation-glow",
    tokens.shadow?.glow ?? `0 0 16px rgba(${hexToRgb(c.accent.primary)}, 0.18)`
  );

  // Glass
  root.style.setProperty("--nd-glass-blur", tokens.glass.blur);
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
  // Core / default dark tactical themes -> v1.0 blacksite
  blacksite_prime: "theme-blacksite",
  minimal_ops: "theme-blacksite",
  ghost_terminal_pro: "theme-blacksite",
  syntax_forge: "theme-blacksite",
  // Tactical glass family
  tactical_glass_ultra: "theme-tactical-glass",
  iceglass_control: "theme-tactical-glass",
  // Accessibility high-contrast
  high_contrast_command: "theme-high-contrast",
  oled_pure_black: "theme-high-contrast",
  // Accessibility colorblind-safe
  colorblind_safe_ops: "theme-colorblind-safe",
};

export function applyDsThemeClass(themeId: string) {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  // Remove any previously applied v1.0 theme classes
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
    // Surfaces
    root.style.setProperty("--nd-bg", tokens.color.surface.app);
    root.style.setProperty("--nd-surface", tokens.color.surface.base);
    root.style.setProperty("--nd-surface-raised", tokens.color.surface.raised);
    root.style.setProperty("--nd-surface-sunken", tokens.color.surface.sunken);
    root.style.setProperty("--nd-surface-overlay", tokens.color.surface.overlay);
    root.style.setProperty("--nd-surface-modal", tokens.color.surface.modal);
    root.style.setProperty("--nd-surface-glass", tokens.color.surface.glass);
    root.style.setProperty("--nd-surface-sidebar", tokens.color.surface.sidebar);
    root.style.setProperty("--nd-surface-panel", tokens.color.surface.panel);
    root.style.setProperty("--nd-surface-card", tokens.color.surface.card);
    root.style.setProperty("--nd-surface-input", tokens.color.surface.input);
    root.style.setProperty("--nd-surface-tooltip", tokens.color.surface.tooltip);

    // Text
    root.style.setProperty("--nd-text", tokens.color.text.primary);
    root.style.setProperty("--nd-text-secondary", tokens.color.text.secondary);
    root.style.setProperty("--nd-text-tertiary", tokens.color.text.tertiary);
    root.style.setProperty("--nd-text-muted", tokens.color.text.muted);
    root.style.setProperty("--nd-text-inverse", tokens.color.text.inverse);
    root.style.setProperty("--nd-text-link", tokens.color.text.link);
    root.style.setProperty("--nd-text-code", tokens.color.text.code);
    root.style.setProperty("--nd-text-command", tokens.color.text.command);
    root.style.setProperty("--nd-text-danger", tokens.color.text.danger);
    root.style.setProperty("--nd-text-warning", tokens.color.text.warning);
    root.style.setProperty("--nd-text-success", tokens.color.text.success);
    root.style.setProperty("--nd-text-info", tokens.color.text.info);

    // Accents
    root.style.setProperty("--nd-accent", tokens.color.accent.primary);
    root.style.setProperty("--nd-accent-rgb", hexToRgb(tokens.color.accent.primary));
    root.style.setProperty("--nd-accent-secondary", tokens.color.accent.secondary);
    root.style.setProperty("--nd-accent-tertiary", tokens.color.accent.tertiary);
    root.style.setProperty("--nd-accent-glow", tokens.color.accent.glow);
    root.style.setProperty("--nd-accent-soft", tokens.color.accent.soft);
    root.style.setProperty("--nd-accent-strong", tokens.color.accent.strong);

    // States
    root.style.setProperty("--nd-state-success", tokens.color.state.success);
    root.style.setProperty("--nd-state-warning", tokens.color.state.warning);
    root.style.setProperty("--nd-state-error", tokens.color.state.error);
    root.style.setProperty("--nd-state-info", tokens.color.state.info);

    // Borders
    root.style.setProperty("--nd-border-subtle", tokens.color.border.subtle);
    root.style.setProperty("--nd-border", tokens.color.border.default);
    root.style.setProperty("--nd-border-strong", tokens.color.border.strong);
    root.style.setProperty("--nd-border-focus", tokens.color.border.focus);

    // Semantic state shortcuts used in app
    root.style.setProperty("--nd-success", tokens.color.state.success);
    root.style.setProperty("--nd-warning", tokens.color.state.warning);
    root.style.setProperty("--nd-danger", tokens.color.state.error);
    root.style.setProperty("--nd-glow", tokens.color.accent.glow);
    root.style.setProperty("--tw-shadow-color", tokens.color.accent.glow);

    // Typography
    root.style.setProperty("--font-body", tokens.typography.fontFamily.ui);
    root.style.setProperty("--font-mono", tokens.typography.fontFamily.mono);
    root.style.setProperty("--font-display", tokens.typography.fontFamily.display);

    // Glassmorphism
    root.style.setProperty("--nd-glass-opacity", tokens.glass.opacity.toString());
    root.style.setProperty("--nd-glass-blur", tokens.glass.blur);

    // Motion
    root.style.setProperty("--nd-transition-fast", tokens.motion.durationFast);
    root.style.setProperty("--nd-transition-normal", tokens.motion.durationNormal);
    root.style.setProperty("--nd-transition-slow", tokens.motion.durationSlow);
    root.style.setProperty(
      "--nd-ease-standard",
      tokens.motion.easingStandard ?? "cubic-bezier(0.4, 0, 0.2, 1)"
    );
    root.style.setProperty(
      "--nd-ease-emphasis",
      tokens.motion.easingEmphasis ?? "cubic-bezier(0.34, 1.56, 0.64, 1)"
    );

    // Semantic token layer (surface.base, text.primary, accent.error, etc.)
    const semantic = resolveSemanticTokens(tokens);
    const semanticVars = semanticTokensToCssVars(semantic);
    for (const [key, value] of Object.entries(semanticVars)) {
      root.style.setProperty(key, value);
    }

    // DS canonical token namespace (used by frontend/src/design-system components)
    injectDsTokens(root, tokens);
  } catch {
    // Malformed token set — CSS variables retain their last valid state.
  }
}
