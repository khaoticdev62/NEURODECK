/**
 * # NEURODECK Semantic Design Tokens
 *
 * This module exposes a single, canonical semantic token layer on top of the
 * lower-level `ThemeTokenSet` produced by the theme registry. Components should
 * prefer these semantic names (`surface.base`, `text.primary`, `accent.error`,
 * etc.) so the UI stays consistent across presets and accessibility profiles.
 *
 * The semantic set is computed from any `ThemeTokenSet`, so every existing and
 * future theme automatically supports it.
 */

/**
 * Minimal shape required to derive semantic tokens.
 *
 * This is intentionally looser than `ThemeTokenSet` so it can be fed by the
 * richer canonical token set or the slimmer frontend token set during the
 * migration period.
 */
export interface DesignTokenInput {
  color: {
    surface: {
      base: string;
      raised: string;
      glass: string;
      overlay: string;
      modal: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    accent: {
      primary: string;
      secondary: string;
    };
    state: {
      success: string;
      warning: string;
      error: string;
      info: string;
      disabled?: string;
    };
    border: {
      subtle: string;
      strong: string;
      focus: string;
    };
  };
  typography: {
    fontFamily: {
      ui: string;
      mono: string;
      display: string;
      code?: string;
    };
    size?: {
      xs?: string;
      sm?: string;
      md?: string;
      lg?: string;
      xl?: string;
      xxl?: string;
      code?: string;
    };
    weight?: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight?: {
      tight?: string;
      normal?: string;
      relaxed?: string;
      code?: string;
    };
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    panelGap?: string;
  };
  radius?: {
    sm?: string;
    md?: string;
    lg?: string;
    card?: string;
    modal?: string;
    pill?: string;
  };
  shadow?: {
    none?: string;
    subtle?: string;
    panel?: string;
    modal?: string;
  };
  motion?: MotionTokenInput;
}

export interface SemanticColorTokens {
  surface: {
    base: string;
    raised: string;
    glass: string;
    overlay: string;
    modal: string;
    danger: string;
  };
  border: {
    subtle: string;
    strong: string;
    focus: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    disabled: string;
  };
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface SemanticTypographyTokens {
  family: {
    display: string;
    pageTitle: string;
    sectionTitle: string;
    body: string;
    metadata: string;
    mono: string;
    code: string;
    hudLabel: string;
    controllerHint: string;
  };
  size: {
    display: string;
    pageTitle: string;
    sectionTitle: string;
    body: string;
    metadata: string;
    mono: string;
    code: string;
    hudLabel: string;
    controllerHint: string;
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
}

export interface SemanticSpacingTokens {
  screen: string;
  panel: string;
  card: string;
  sidebar: string;
  input: string;
  touchTarget: string;
  deck: string;
  desktop: string;
}

export interface SemanticRadiusTokens {
  sm: string;
  md: string;
  lg: string;
  panel: string;
  modal: string;
  pill: string;
}

export type ElevationToken = "flat" | "raised" | "floating" | "overlay" | "modal" | "critical";

export interface SemanticElevationTokens {
  flat: string;
  raised: string;
  floating: string;
  overlay: string;
  modal: string;
  critical: string;
}

export interface SemanticMotionTokens {
  fast: string;
  normal: string;
  slow: string;
  focus: string;
  modal: string;
  panel: string;
  reducedMotion: boolean;
}

export interface SemanticTokenSet {
  color: SemanticColorTokens;
  typography: SemanticTypographyTokens;
  spacing: SemanticSpacingTokens;
  radius: SemanticRadiusTokens;
  elevation: SemanticElevationTokens;
  motion: SemanticMotionTokens;
}

const DEFAULT_SPACING: SemanticSpacingTokens = {
  screen: "16px",
  panel: "12px",
  card: "12px",
  sidebar: "8px",
  input: "10px",
  touchTarget: "40px",
  deck: "12px",
  desktop: "20px",
};

const DEFAULT_RADIUS: SemanticRadiusTokens = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  panel: "12px",
  modal: "16px",
  pill: "9999px",
};

interface MotionTokenInput {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
}

const DEFAULT_MOTION_INPUT: MotionTokenInput = {
  durationFast: "150ms",
  durationNormal: "250ms",
  durationSlow: "400ms",
};

const DEFAULT_TYPOGRAPHY_SIZE: Record<string, string> = {
  xs: "10px",
  sm: "12px",
  md: "14px",
  lg: "16px",
  xl: "20px",
  xxl: "28px",
  code: "12px",
};

const DEFAULT_TYPOGRAPHY_WEIGHT: NonNullable<DesignTokenInput["typography"]["weight"]> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/**
 * Derive a semantic token set from a concrete `ThemeTokenSet`.
 *
 * Missing fields fall back to sensible defaults so a theme that only supplies
 * the core colour tokens still produces a complete semantic surface.
 */
export function resolveSemanticTokens(
  tokens: DesignTokenInput,
  options: { reducedMotion?: boolean } = {}
): SemanticTokenSet {
  const c = tokens.color;
  const t = tokens.typography;
  const tSize = t.size ?? DEFAULT_TYPOGRAPHY_SIZE;
  const tWeight = t.weight ?? DEFAULT_TYPOGRAPHY_WEIGHT;
  const s = tokens.spacing ?? {};
  const r = tokens.radius ?? {};
  const m = tokens.motion ?? DEFAULT_MOTION_INPUT;
  const lh = t.lineHeight ?? {};

  return {
    color: {
      surface: {
        base: c.surface.base,
        raised: c.surface.raised,
        glass: c.surface.glass,
        overlay: c.surface.overlay,
        modal: c.surface.modal,
        danger: c.state.error,
      },
      border: {
        subtle: c.border.subtle,
        strong: c.border.strong,
        focus: c.border.focus,
      },
      text: {
        primary: c.text.primary,
        secondary: c.text.secondary,
        muted: c.text.muted,
        disabled: c.state.disabled ?? "rgba(255,255,255,0.05)",
      },
      accent: {
        primary: c.accent.primary,
        secondary: c.accent.secondary,
        success: c.state.success,
        warning: c.state.warning,
        error: c.state.error,
        info: c.state.info,
      },
    },
    typography: {
      family: {
        display: t.fontFamily.display,
        pageTitle: t.fontFamily.ui,
        sectionTitle: t.fontFamily.ui,
        body: t.fontFamily.ui,
        metadata: t.fontFamily.ui,
        mono: t.fontFamily.mono,
        code: t.fontFamily.code ?? t.fontFamily.mono,
        hudLabel: t.fontFamily.ui,
        controllerHint: t.fontFamily.ui,
      },
      size: {
        display: tSize.xxl ?? DEFAULT_TYPOGRAPHY_SIZE.xxl,
        pageTitle: tSize.xl ?? DEFAULT_TYPOGRAPHY_SIZE.xl,
        sectionTitle: tSize.lg ?? DEFAULT_TYPOGRAPHY_SIZE.lg,
        body: tSize.md ?? DEFAULT_TYPOGRAPHY_SIZE.md,
        metadata: tSize.sm ?? DEFAULT_TYPOGRAPHY_SIZE.sm,
        mono: tSize.code ?? DEFAULT_TYPOGRAPHY_SIZE.code,
        code: tSize.code ?? DEFAULT_TYPOGRAPHY_SIZE.code,
        hudLabel: tSize.xs ?? DEFAULT_TYPOGRAPHY_SIZE.xs,
        controllerHint: tSize.sm ?? DEFAULT_TYPOGRAPHY_SIZE.sm,
      },
      weight: tWeight,
      lineHeight: {
        tight: lh.tight ?? "1.2",
        normal: lh.normal ?? "1.5",
        relaxed: lh.relaxed ?? "1.75",
        code: lh.code ?? "1.6",
      },
    },
    spacing: {
      screen: s.xl ?? DEFAULT_SPACING.screen,
      panel: s.panelGap ?? DEFAULT_SPACING.panel,
      card: s.md ?? DEFAULT_SPACING.card,
      sidebar: s.sm ?? DEFAULT_SPACING.sidebar,
      input: s.md ?? DEFAULT_SPACING.input,
      touchTarget: "40px",
      deck: s.md ?? DEFAULT_SPACING.deck,
      desktop: s.xl ?? DEFAULT_SPACING.desktop,
    },
    radius: {
      sm: r.sm ?? DEFAULT_RADIUS.sm,
      md: r.md ?? DEFAULT_RADIUS.md,
      lg: r.lg ?? DEFAULT_RADIUS.lg,
      panel: r.card ?? DEFAULT_RADIUS.panel,
      modal: r.modal ?? DEFAULT_RADIUS.modal,
      pill: r.pill ?? DEFAULT_RADIUS.pill,
    },
    elevation: {
      flat: tokens.shadow?.none ?? "none",
      raised: tokens.shadow?.subtle ?? "0 2px 8px rgba(0,0,0,0.5)",
      floating: tokens.shadow?.panel ?? "0 4px 16px rgba(0,0,0,0.6)",
      overlay: tokens.shadow?.modal ?? "0 8px 32px rgba(0,0,0,0.8)",
      modal: tokens.shadow?.modal ?? "0 8px 32px rgba(0,0,0,0.8)",
      critical: `0 0 20px ${c.state.error}`,
    },
    motion: {
      fast: m.durationFast,
      normal: m.durationNormal,
      slow: m.durationSlow,
      focus: m.durationNormal,
      modal: m.durationNormal,
      panel: m.durationFast,
      reducedMotion: options.reducedMotion ?? false,
    },
  };
}

/**
 * Convert a `SemanticTokenSet` into a flat map of CSS custom properties.
 *
 * The resulting object can be spread onto a style object or written to
 * `:root`/`[data-theme]` via the theme injector.
 */
export function semanticTokensToCssVars(tokens: SemanticTokenSet): Record<string, string> {
  return {
    "--nd-surface-base": tokens.color.surface.base,
    "--nd-surface-raised": tokens.color.surface.raised,
    "--nd-surface-glass": tokens.color.surface.glass,
    "--nd-surface-overlay": tokens.color.surface.overlay,
    "--nd-surface-modal": tokens.color.surface.modal,
    "--nd-surface-danger": tokens.color.surface.danger,

    "--nd-border-subtle": tokens.color.border.subtle,
    "--nd-border-strong": tokens.color.border.strong,
    "--nd-border-focus": tokens.color.border.focus,

    "--nd-text-primary": tokens.color.text.primary,
    "--nd-text-secondary": tokens.color.text.secondary,
    "--nd-text-muted": tokens.color.text.muted,
    "--nd-text-disabled": tokens.color.text.disabled,

    "--nd-accent-primary": tokens.color.accent.primary,
    "--nd-accent-secondary": tokens.color.accent.secondary,
    "--nd-accent-success": tokens.color.accent.success,
    "--nd-accent-warning": tokens.color.accent.warning,
    "--nd-accent-error": tokens.color.accent.error,
    "--nd-accent-info": tokens.color.accent.info,

    "--nd-font-display": tokens.typography.family.display,
    "--nd-font-page-title": tokens.typography.family.pageTitle,
    "--nd-font-section-title": tokens.typography.family.sectionTitle,
    "--nd-font-body": tokens.typography.family.body,
    "--nd-font-metadata": tokens.typography.family.metadata,
    "--nd-font-mono": tokens.typography.family.mono,
    "--nd-font-code": tokens.typography.family.code,
    "--nd-font-hud-label": tokens.typography.family.hudLabel,
    "--nd-font-controller-hint": tokens.typography.family.controllerHint,

    "--nd-size-display": tokens.typography.size.display,
    "--nd-size-page-title": tokens.typography.size.pageTitle,
    "--nd-size-section-title": tokens.typography.size.sectionTitle,
    "--nd-size-body": tokens.typography.size.body,
    "--nd-size-metadata": tokens.typography.size.metadata,
    "--nd-size-mono": tokens.typography.size.mono,
    "--nd-size-code": tokens.typography.size.code,
    "--nd-size-hud-label": tokens.typography.size.hudLabel,
    "--nd-size-controller-hint": tokens.typography.size.controllerHint,

    "--nd-spacing-screen": tokens.spacing.screen,
    "--nd-spacing-panel": tokens.spacing.panel,
    "--nd-spacing-card": tokens.spacing.card,
    "--nd-spacing-sidebar": tokens.spacing.sidebar,
    "--nd-spacing-input": tokens.spacing.input,
    "--nd-spacing-touch-target": tokens.spacing.touchTarget,
    "--nd-spacing-deck": tokens.spacing.deck,
    "--nd-spacing-desktop": tokens.spacing.desktop,

    "--nd-radius-sm": tokens.radius.sm,
    "--nd-radius-md": tokens.radius.md,
    "--nd-radius-lg": tokens.radius.lg,
    "--nd-radius-panel": tokens.radius.panel,
    "--nd-radius-modal": tokens.radius.modal,
    "--nd-radius-pill": tokens.radius.pill,

    "--nd-elevation-flat": tokens.elevation.flat,
    "--nd-elevation-raised": tokens.elevation.raised,
    "--nd-elevation-floating": tokens.elevation.floating,
    "--nd-elevation-overlay": tokens.elevation.overlay,
    "--nd-elevation-modal": tokens.elevation.modal,
    "--nd-elevation-critical": tokens.elevation.critical,

    "--nd-motion-fast": tokens.motion.fast,
    "--nd-motion-normal": tokens.motion.normal,
    "--nd-motion-slow": tokens.motion.slow,
    "--nd-motion-focus": tokens.motion.focus,
    "--nd-motion-modal": tokens.motion.modal,
    "--nd-motion-panel": tokens.motion.panel,
  };
}

/**
 * Utility for components that need a single class string mapping to a
 * CSS variable. Returns e.g. `"var(--nd-accent-primary)"`.
 */
export function token(path: keyof typeof tokenMap): string {
  return `var(--nd-${path})`;
}

const tokenMap = {
  "surface-base": "",
  "surface-raised": "",
  "surface-glass": "",
  "surface-overlay": "",
  "surface-modal": "",
  "surface-danger": "",
  "border-subtle": "",
  "border-strong": "",
  "border-focus": "",
  "text-primary": "",
  "text-secondary": "",
  "text-muted": "",
  "text-disabled": "",
  "accent-primary": "",
  "accent-secondary": "",
  "accent-success": "",
  "accent-warning": "",
  "accent-error": "",
  "accent-info": "",
};
