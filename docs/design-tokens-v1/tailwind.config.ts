import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/renderer/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      compact: '1024px',
      deck: '1280px',
      desktop: '1440px',
      wide: '1920px',
    },
    extend: {
      colors: {
        surface: {
          app: 'var(--nd-surface-app)',
          primary: 'var(--nd-surface-primary)',
          secondary: 'var(--nd-surface-secondary)',
          tertiary: 'var(--nd-surface-tertiary)',
          overlay: 'var(--nd-surface-overlay)',
          glass: 'var(--nd-surface-glass)',
        },
        border: {
          subtle: 'var(--nd-border-subtle)',
          DEFAULT: 'var(--nd-border-default)',
          strong: 'var(--nd-border-strong)',
        },
        text: {
          primary: 'var(--nd-text-primary)',
          secondary: 'var(--nd-text-secondary)',
          muted: 'var(--nd-text-muted)',
          disabled: 'var(--nd-text-disabled)',
        },
        accent: {
          primary: 'var(--nd-accent-primary)',
          info: 'var(--nd-accent-info)',
          success: 'var(--nd-accent-success)',
          warning: 'var(--nd-accent-warning)',
          error: 'var(--nd-accent-error)',
          agent: 'var(--nd-accent-agent)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Cascadia Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '650' }],
        h3: ['17px', { lineHeight: '24px', fontWeight: '650' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        micro: ['11px', { lineHeight: '14px', fontWeight: '500' }],
        code: ['13px', { lineHeight: '20px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: 'var(--nd-radius-sm)',
        md: 'var(--nd-radius-md)',
        lg: 'var(--nd-radius-lg)',
        xl: 'var(--nd-radius-xl)',
      },
      boxShadow: {
        panel: 'var(--nd-elevation-panel)',
        card: 'var(--nd-elevation-card)',
        overlay: 'var(--nd-elevation-overlay)',
        focus: 'var(--nd-elevation-focus)',
      },
      transitionDuration: {
        fast: 'var(--nd-motion-fast)',
        normal: 'var(--nd-motion-normal)',
        slow: 'var(--nd-motion-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--nd-ease-standard)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }: any) {
      addUtilities({
        '.nd-focus-ring': {
          '&:focus-visible': {
            outline: 'none',
            boxShadow: 'var(--nd-elevation-focus)',
            borderColor: 'var(--nd-accent-primary)',
          },
        },
      });
    },
  ],
};

export default config;
