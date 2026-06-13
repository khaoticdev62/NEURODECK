/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, ${variable} ${opacityValue * 100}%, transparent)`;
    }
    return variable;
  };
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NEURODECK design tokens — all mapped to runtime CSS custom properties
        nd: {
          // ── Semantic surfaces ──────────────────────────────────────────
          'surface-base':   withOpacity('var(--nd-surface-base, var(--nd-surface, #11161C))'),
          'surface-raised': withOpacity('var(--nd-surface-raised)'),
          'surface-glass':  withOpacity('var(--nd-surface-glass, rgba(17,22,28,0.72))'),
          'surface-overlay':withOpacity('var(--nd-surface-overlay, rgba(10,13,16,0.85))'),
          'surface-modal':  withOpacity('var(--nd-surface-modal, #0F1419)'),
          'surface-danger': withOpacity('var(--nd-surface-danger, #FF5A6A)'),

          // Legacy surface aliases (kept for compatibility during migration)
          bg:               withOpacity('var(--nd-bg)'),
          surface:          withOpacity('var(--nd-surface)'),
          'surface-sunken': withOpacity('var(--nd-surface-sunken, #07090C)'),
          'surface-sidebar':withOpacity('var(--nd-surface-sidebar, #0D1117)'),
          'surface-panel':  withOpacity('var(--nd-surface-panel, #11161C)'),
          'surface-card':   withOpacity('var(--nd-surface-card, #131A22)'),
          'surface-input':  withOpacity('var(--nd-surface-input, #0A0D10)'),
          'surface-tooltip':withOpacity('var(--nd-surface-tooltip, #1C242E)'),

          // ── Semantic text ──────────────────────────────────────────────
          'text-primary':   withOpacity('var(--nd-text-primary, var(--nd-text, #E8F4FF))'),
          'text-secondary': withOpacity('var(--nd-text-secondary, #B8CCE0)'),
          'text-muted':     withOpacity('var(--nd-text-muted)'),
          'text-disabled':  withOpacity('var(--nd-text-disabled, rgba(255,255,255,0.05))'),

          // Legacy text aliases
          text:             withOpacity('var(--nd-text)'),
          'text-tertiary':  withOpacity('var(--nd-text-tertiary, #6E8499)'),
          'text-inverse':   withOpacity('var(--nd-text-inverse, #0A0D10)'),
          'text-link':      withOpacity('var(--nd-text-link, #5EEBFF)'),
          'text-code':      withOpacity('var(--nd-text-code, #A6E3A1)'),
          'text-command':   withOpacity('var(--nd-text-command, #CBA6F7)'),
          'text-danger':    withOpacity('var(--nd-text-danger, #FF5A6A)'),
          'text-warning':   withOpacity('var(--nd-text-warning, #FFC857)'),
          'text-success':   withOpacity('var(--nd-text-success, #7CFFB2)'),
          'text-info':      withOpacity('var(--nd-text-info, #89DCEB)'),

          // ── Semantic accent ────────────────────────────────────────────
          'accent-primary':   withOpacity('var(--nd-accent-primary, var(--nd-accent, #5EEBFF))'),
          'accent-secondary': withOpacity('var(--nd-accent-secondary, #89DCEB)'),
          'accent-success':   withOpacity('var(--nd-accent-success, #7CFFB2)'),
          'accent-warning':   withOpacity('var(--nd-accent-warning, #FFC857)'),
          'accent-error':     withOpacity('var(--nd-accent-error, #FF5A6A)'),
          'accent-info':      withOpacity('var(--nd-accent-info, #89DCEB)'),

          // Legacy accent aliases
          accent:           withOpacity('var(--nd-accent)'),
          'accent-tertiary': withOpacity('var(--nd-accent-tertiary, #CBA6F7)'),
          'accent-glow':    withOpacity('var(--nd-accent-glow, rgba(94,235,255,0.18))'),
          'accent-soft':    withOpacity('var(--nd-accent-soft, rgba(94,235,255,0.08))'),
          'accent-strong':  withOpacity('var(--nd-accent-strong, #0ACFD8)'),

          // ── Semantic state ─────────────────────────────────────────────
          success:          withOpacity('var(--nd-success)'),
          warning:          withOpacity('var(--nd-warning)'),
          danger:           withOpacity('var(--nd-danger)'),
          glow:             withOpacity('var(--nd-glow)'),

          // ── Semantic borders ───────────────────────────────────────────
          'border-subtle':  withOpacity('var(--nd-border-subtle)'),
          'border-strong':  withOpacity('var(--nd-border-strong, rgba(141,161,179,0.28))'),
          'border-focus':   withOpacity('var(--nd-border-focus)'),

          // Legacy border aliases
          'border-default': withOpacity('var(--nd-border-default)'),

          // ── Brand surface layers (L0–L3 per brand spec) ───────────────
          'surface-l0': withOpacity('var(--surface-l0, #05070a)'),
          'surface-l1': withOpacity('var(--surface-l1, #0b1117)'),
          'surface-l2': withOpacity('var(--surface-l2, #101820)'),
          'surface-l3': withOpacity('var(--surface-l3, rgba(20,32,42,0.72))'),
        },
      },

      backgroundImage: {
        'brand-gradient':      'var(--brand-gradient)',
        'brand-gradient-dark': 'var(--brand-gradient-dark)',
      },

      fontFamily: {
        // Mapped to CSS vars set by the theme injector at runtime
        body:    ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['var(--font-display)', 'var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },

      transitionDuration: {
        // Maps to CSS vars set by theme injector; fall through to fixed values
        fast:   'var(--nd-transition-fast, 150ms)',
        normal: 'var(--nd-transition-normal, 250ms)',
        slow:   'var(--nd-transition-slow, 400ms)',
      },

      transitionTimingFunction: {
        standard: 'var(--nd-ease-standard, cubic-bezier(0.4, 0, 0.2, 1))',
        emphasis: 'var(--nd-ease-emphasis, cubic-bezier(0.34, 1.56, 0.64, 1))',
      },

      borderRadius: {
        panel: 'var(--nd-radius-panel, 12px)',
        modal: 'var(--nd-radius-modal, 16px)',
        pill:  'var(--nd-radius-pill, 9999px)',
      },

      spacing: {
        screen: 'var(--nd-spacing-screen, 16px)',
        panel:  'var(--nd-spacing-panel, 12px)',
        card:   'var(--nd-spacing-card, 12px)',
        touch:  'var(--nd-spacing-touch-target, 40px)',
      },

      screens: {
        compact: '1024px',
        deck:    '1280px',
        desktop: '1440px',
        wide:    '1920px',
      },

      boxShadow: {
        // Token-driven elevation scale (preferred). Legacy hard-coded shadows
        // remain available for compatibility during the migration period.
        'focus':             '0 0 0 2px var(--nd-border-focus, rgba(94, 235, 255, 0.25))',
        'focus-token':       '0 0 0 2px var(--nd-border-focus)',
        'raised-token':      'var(--nd-elevation-raised)',
        'floating-token':    'var(--nd-elevation-floating)',
        'overlay-token':     'var(--nd-elevation-overlay)',
        'modal-token':       'var(--nd-elevation-modal)',
        'critical-token':    'var(--nd-elevation-critical)',
        'glow-sm':           '0 0 8px var(--nd-glow)',
        'glow-md':           '0 0 16px var(--nd-glow)',
        'glow-lg':           '0 0 32px var(--nd-glow)',
        'panel':             '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
        'panel-elevated':    '0 2px 4px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
        'brand-glow':        'var(--brand-glow)',
        'brand-glow-strong': 'var(--brand-glow-strong)',
      },

      zIndex: {
        'wallpaper': '0',
        'base':      '1',
        'sticky':    '10',
        'dropdown':  '20',
        'overlay':   '30',
        'modal':     '40',
        'toast':     '50',
        'tooltip':   '60',
      },

      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        'xs':  ['12px', { lineHeight: '1.5' }],
        'sm':  ['13px', { lineHeight: '1.5' }],
        'base':['14px', { lineHeight: '1.5' }],
        'md':  ['15px', { lineHeight: '1.5' }],
        'lg':  ['16px', { lineHeight: '1.4' }],
        'xl':  ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
      },

      transitionTimingFunction: {
        'snap':        'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-quart':   'cubic-bezier(0.25, 1, 0.5, 1)',
      },

      keyframes: {
        'view-enter': {
          '0%':   { opacity: '0', transform: 'translateY(8px) scale(0.995)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'view-exit': {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-6px) scale(0.995)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 1px var(--nd-accent), 0 0 8px var(--nd-glow)' },
          '50%':      { boxShadow: '0 0 0 1px var(--nd-accent), 0 0 20px var(--nd-glow)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-4px)' },
          '40%':      { transform: 'translateX(4px)' },
          '60%':      { transform: 'translateX(-2px)' },
          '80%':      { transform: 'translateX(2px)' },
        },
        'spin-once': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'shimmer': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        'view-enter':      'view-enter 200ms ease-out forwards',
        'view-exit':       'view-exit 150ms ease-in forwards',
        'fade-in':         'fade-in 150ms ease-out forwards',
        'slide-in-right':  'slide-in-right 200ms ease-out forwards',
        'slide-up':        'slide-up 180ms ease-out forwards',
        'pulse-glow':      'pulse-glow 2s ease-in-out infinite',
        'shake':           'shake 300ms ease-in-out',
        'spin-once':       'spin-once 600ms ease-in-out forwards',
        'shimmer':         'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
