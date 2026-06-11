/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NEURODECK dynamic design tokens — injected at runtime via CSS vars
        nd: {
          bg: 'var(--nd-bg)',
          surface: 'var(--nd-surface)',
          'surface-raised': 'var(--nd-surface-raised)',
          accent: 'var(--nd-accent)',
          success: 'var(--nd-success)',
          warning: 'var(--nd-warning)',
          danger: 'var(--nd-danger)',
          text: 'var(--nd-text)',
          'text-muted': 'var(--nd-text-muted)',
          glow: 'var(--nd-glow)',
          'border-subtle': 'var(--nd-border-subtle)',
          'border-default': 'var(--nd-border-default)',
          'border-focus': 'var(--nd-border-focus)',
        },
        // DEPRECATED: static aliases — bypass theme system, use nd-* tokens instead
        neuro: '#5EEBFF',
        success: '#7CFFB2',
        warning: '#FFC857',
        danger: '#FF5A6A',
        blacksite: '#0A0D10',
        surface: '#11161C',
        'surface-raised': '#161D25',
      },
      boxShadow: {
        'focus': '0 0 0 2px rgba(94, 235, 255, 0.25)',
        'glow-sm': '0 0 8px var(--nd-glow)',
        'glow-md': '0 0 16px var(--nd-glow)',
        'glow-lg': '0 0 32px var(--nd-glow)',
        'panel': '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
        'panel-elevated': '0 2px 4px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      zIndex: {
        'wallpaper': '0',
        'base': '1',
        'sticky': '10',
        'dropdown': '20',
        'overlay': '30',
        'modal': '40',
        'toast': '50',
        'tooltip': '60',
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.4' }],
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'md': ['15px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
      },
      transitionTimingFunction: {
        'snap': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'view-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.995)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'view-exit': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-6px) scale(0.995)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 1px var(--nd-accent), 0 0 8px var(--nd-glow)' },
          '50%': { boxShadow: '0 0 0 1px var(--nd-accent), 0 0 20px var(--nd-glow)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
        },
      },
      animation: {
        'view-enter': 'view-enter 200ms ease-out forwards',
        'view-exit': 'view-exit 150ms ease-in forwards',
        'fade-in': 'fade-in 150ms ease-out forwards',
        'slide-in-right': 'slide-in-right 200ms ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 300ms ease-in-out',
      },
    },
  },
  plugins: [],
}
