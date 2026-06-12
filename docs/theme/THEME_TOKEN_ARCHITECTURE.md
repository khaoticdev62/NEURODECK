# NEURODECK Theme Token Architecture

This document defines the comprehensive production-grade design token system for the NEURODECK visual environment. It establishes the mapping of abstract values to concrete components across both CSS/Tailwind and React.

---

## 1. Design Token Categories

### 1.1 Colors
- **Surface**:
  - `surface.app`: Main window background.
  - `surface.base`: Layout background.
  - `surface.raised`: Standard widget / panel background.
  - `surface.sunken`: Recessed backgrounds (inputs, terminal viewport).
  - `surface.overlay`: Dialogs and dropdown overlays.
  - `surface.modal`: Center-aligned modal containers.
  - `surface.glass`: Semi-transparent glassmorphic overlays.
  - `surface.sidebar`: Primary navigation sidebar background.
- **Text**:
  - `text.primary`, `text.secondary`, `text.tertiary`, `text.muted`, `text.inverse`, `text.link`, `text.code`
- **Accent**:
  - `accent.primary`: Main brand accent color.
  - `accent.secondary`, `accent.tertiary`, `accent.glow`
- **State**:
  - `state.idle`, `state.hover`, `state.focus`, `state.active`, `state.selected`, `state.disabled`
- **Border**:
  - `border.subtle`, `border.default`, `border.strong`, `border.focus`
- **Syntax**:
  - Code-level syntax highlighting colors (keywords, strings, numbers, etc.)
- **Telemetry**:
  - Semantic colors for system monitoring widgets (CPU, GPU, RAM, VRAM, temp).

### 1.2 Glassmorphism & Visual Effects
- `glass.opacity`: Backdrop transparency.
- `glass.blur`: Backdrop blur radius.
- `glass.borderOpacity`: Border gloss brightness.
- `glass.highlightOpacity`: Top highlight intensity.
- `glass.noiseOpacity`: Sub-pixel overlay noise to hide banding on low-bit displays.

### 1.3 Motion & Transitions
- `motion.durationFast`, `motion.durationNormal`, `motion.durationSlow`
- `motion.easingStandard`, `motion.easingEmphasis`
- `motion.pulseIntensity`: Maximum scale/opacity drift for breathing states.
- `motion.glowIntensity`: Glow size parameters.

---

## 2. Component Variable Mapping

Component styles will reference semantic variables instead of absolute hex codes:

| CSS Variable | Token | Component Application |
|---|---|---|
| `--nd-bg` | `color.surface.app` | Main document body |
| `--nd-surface` | `color.surface.base` | Views, primary panels |
| `--nd-surface-raised` | `color.surface.raised` | Cards, buttons, settings |
| `--nd-accent` | `color.accent.primary` | Active items, highlights, borders |
| `--nd-text` | `color.text.primary` | Core text contents |
| `--nd-text-muted` | `color.text.muted` | Secondary headers, shortcuts |
| `--nd-glow` | `color.accent.glow` | Accent glows, focus shadows |

---

## 3. Tailwind Bridge Integration

In `tailwind.config.js` or via CSS utility classes, custom themes will dynamically map these variable declarations. Components are structured around:
- `bg-nd-bg`
- `bg-nd-surface`
- `bg-nd-surface-raised`
- `text-nd-accent`
- `border-nd-accent/30`
- `shadow-glow` (mapping to `--nd-glow`)
