# NEURODECK Design System — Token Reference

This document describes the canonical `nd-*` token system. All new code must use these tokens; never use raw hex values or arbitrary Tailwind `bg-[#...]` classes.

---

## Color Tokens

Defined in `frontend/src/design-system/tokens/tokens.css` and surfaced in `frontend/tailwind.config.js` under the `nd` namespace.

### Surface Hierarchy
| Token | Tailwind class | Role |
|---|---|---|
| `--nd-surface-app` | `bg-nd-surface-app` | App background (darkest layer) |
| `--nd-surface` | `bg-nd-surface` | Card / panel surface |
| `--nd-surface-raised` | `bg-nd-surface-raised` | Elevated panel (dropdown, popover) |

### Text
| Token | Tailwind class | Role |
|---|---|---|
| `--nd-text` | `text-nd-text` | Primary body text |
| `--nd-text-muted` | `text-nd-text-muted` | Secondary / hint text |
| `--nd-text-disabled` | `text-nd-text-disabled` | Disabled state text |

### Accent (theme-aware)
| Token | Tailwind class | Role |
|---|---|---|
| `--nd-accent-primary` | `text-nd-accent` / `bg-nd-accent` | Brand accent (default: `#5EEBFF`) |
| `--nd-accent` | shorthand alias | Same as above |

### Semantic
| Token | Tailwind class | Role |
|---|---|---|
| `--nd-success` | `text-nd-success` / `bg-nd-success` | Success states |
| `--nd-warning` | `text-nd-warning` | Warning states |
| `--nd-danger` | `text-nd-danger` | Error / destructive |

---

## Typography

Classes defined in `app.css` using the `nd-*` utility pattern.

| Scale | Usage |
|---|---|
| `text-xs` | Metadata, kicker labels, badges |
| `text-sm` | Body, form inputs, table rows |
| `text-base` | Default prose |
| `text-lg` | Section headings |
| `text-xl` | Page headings |
| `font-semibold` | UI labels, subheadings |
| `font-bold` | Display headings only |
| `tracking-[0.28em]` | Kicker / ALL-CAPS label style |
| `font-mono` | Code, terminal output, IDs |

---

## Spacing

4px grid. All spacing uses standard Tailwind scale (1 unit = 4px):
- `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)
- `p-2`, `p-3`, `p-4`, `p-6`, `p-8` for padding
- `mb-4`, `mt-6` etc. for layout rhythm

---

## Border Radius

| Class | Value | Usage |
|---|---|---|
| `rounded-lg` | 8px | Inputs, small cards, badges |
| `rounded-xl` | 12px | Panels, modals, larger cards |
| `rounded-2xl` | 16px | Feature panels, drawers |
| `rounded-full` | 9999px | Avatars, toggle pills |

---

## Z-Index Scale

Defined as CSS variables in `tokens.css`:

| Variable | Value | Layer |
|---|---|---|
| `--z-base` | 0 | Default stacking |
| `--z-raised` | 10 | Raised cards |
| `--z-dropdown` | 100 | Dropdowns, tooltips |
| `--z-overlay` | 200 | Modal backdrops |
| `--z-modal` | 300 | Modals |
| `--z-toast` | 400 | Toast notifications |
| `--z-critical` | 9999 | Skip-to-content, emergency overlays |

Use `z-[var(--z-modal)]` in Tailwind or `z-index: var(--z-modal)` in CSS.

---

## Motion Tokens

```css
--nd-duration-fast:   100ms
--nd-duration-base:   200ms
--nd-duration-slow:   350ms
--nd-ease-out:        cubic-bezier(0.16, 1, 0.3, 1)
--nd-ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1)
```

All animations must respect:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Themes

Four themes defined in `lib.rs` `THEMES` map and applied via `data-theme` attribute on `<html>`:

| Theme | ID | Character |
|---|---|---|
| Blacksite | `blacksite` | Default — deep black, cyan accent |
| Tactical Glass | `tactical-glass` | Glassmorphism panels, muted teal |
| High Contrast | `high-contrast` | White text, maximum contrast |
| Colorblind Safe | `colorblind-safe` | Deuteranopia-optimized palette |

Each theme overrides the `--nd-*` CSS variables. Component code never hardcodes hex — reads the variable at runtime.

---

## Glass Panel System

Panels that use the glassmorphism effect:

```css
background: var(--nd-surface);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.06);
```

In Tailwind: `bg-nd-surface/40 backdrop-blur-md border border-nd-text-muted/15`

---

## Density Modes

Applied via `data-density` attribute on the shell root:

| Mode | Attribute | Context |
|---|---|---|
| Default | (none) | Desktop mouse |
| Deck | `data-density="deck"` | Steam Deck / gamepad navigation |
| Compact | `data-density="compact"` | Small displays |

CSS targets: `[data-density="deck"] .component { ... }`
