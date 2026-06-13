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
  root.style.setProperty("--nd-ease-standard", tokens.motion.easingStandard ?? "cubic-bezier(0.4, 0, 0.2, 1)");
  root.style.setProperty("--nd-ease-emphasis", tokens.motion.easingEmphasis ?? "cubic-bezier(0.34, 1.56, 0.64, 1)");

  // Semantic token layer (surface.base, text.primary, accent.error, etc.)
  const semantic = resolveSemanticTokens(tokens);
  const semanticVars = semanticTokensToCssVars(semantic);
  for (const [key, value] of Object.entries(semanticVars)) {
    root.style.setProperty(key, value);
  }
  } catch {
    // Malformed token set — CSS variables retain their last valid state.
  }
}
