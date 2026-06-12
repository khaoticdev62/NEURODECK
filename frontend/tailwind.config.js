/** @type {import('tailwindcss').Config} */
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
          // ── Backgrounds / Surfaces ─────────────────────────────────────
          bg:               'var(--nd-bg)',
          surface:          'var(--nd-surface)',
          'surface-raised': 'var(--nd-surface-raised)',
          'surface-sunken': 'var(--nd-surface-sunken, #07090C)',
          'surface-overlay':'var(--nd-surface-overlay, rgba(10,13,16,0.85))',
          'surface-modal':  'var(--nd-surface-modal, #0F1419)',
          'surface-glass':  'var(--nd-surface-glass, rgba(17,22,28,0.72))',
          'surface-sidebar':'var(--nd-surface-sidebar, #0D1117)',
          'surface-panel':  'var(--nd-surface-panel, #11161C)',
          'surface-card':   'var(--nd-surface-card, #131A22)',
          'surface-input':  'var(--nd-surface-input, #0A0D10)',
          'surface-tooltip':'var(--nd-surface-tooltip, #1C242E)',

          // ── Text ─────────────────────────────────────────────────────
          text:             'var(--nd-text)',
          'text-secondary': 'var(--nd-text-secondary, #B8CCE0)',
          'text-tertiary':  'var(--nd-text-tertiary, #6E8499)',
          'text-muted':     'var(--nd-text-muted)',
          'text-inverse':   'var(--nd-text-inverse, #0A0D10)',
          'text-link':      'var(--nd-text-link, #5EEBFF)',
          'text-code':      'var(--nd-text-code, #A6E3A1)',
          'text-command':   'var(--nd-text-command, #CBA6F7)',
          'text-danger':    'var(--nd-text-danger, #FF5A6A)',
          'text-warning':   'var(--nd-text-warning, #FFC857)',
          'text-success':   'var(--nd-text-success, #7CFFB2)',
          'text-info':      'var(--nd-text-info, #89DCEB)',

          // ── Accent ───────────────────────────────────────────────────
          accent:           'var(--nd-accent)',
          'accent-secondary':'var(--nd-accent-secondary, #89DCEB)',
          'accent-tertiary': 'var(--nd-accent-tertiary, #CBA6F7)',
          'accent-glow':    'var(--nd-accent-glow, rgba(94,235,255,0.18))',
          'accent-soft':    'var(--nd-accent-soft, rgba(94,235,255,0.08))',
          'accent-strong':  'var(--nd-accent-strong, #0ACFD8)',

          // ── Semantic State ───────────────────────────────────────────
          success:          'var(--nd-success)',
          warning:          'var(--nd-warning)',
          danger:           'var(--nd-danger)',
          glow:             'var(--nd-glow)',

          // ── Borders ──────────────────────────────────────────────────
          'border-subtle':  'var(--nd-border-subtle)',
          'border-default': 'var(--nd-border-default)',
          'border-strong':  'var(--nd-border-strong, rgba(141,161,179,0.28))',
          'border-focus':   'var(--nd-border-focus)',
        },
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

      boxShadow: {
        'focus':          '0 0 0 2px rgba(94, 235, 255, 0.25)',
        'glow-sm':        '0 0 8px var(--nd-glow)',
        'glow-md':        '0 0 16px var(--nd-glow)',
        'glow-lg':        '0 0 32px var(--nd-glow)',
        'panel':          '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
        'panel-elevated': '0 2px 4px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
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
      },
    },
  },
  plugins: [],
}
