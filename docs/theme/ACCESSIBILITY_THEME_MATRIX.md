# NEURODECK Accessibility Theme Matrix

This document defines accessibility requirements, WCAG compliance targets, and theme profiles designed for users with visual, motor, or cognitive needs.

---

## 1. Accessibility Themes Matrix

| Accessibility Profile | Target Group | Key Token Overrides | WCAG Target |
|---|---|---|---|
| **High Contrast Command** | Low vision / outdoor usage | Background: `#000000`<br>Text: `#FFFFFF`<br>Accents: `#FFFF00`<br>No subtle grays or blurred glass. | AAA (Luminance ratio > 7:1) |
| **Low Vision Tactical** | Visually impaired | Font boost: +25%<br>Line height: 1.6<br>Accent outlines: 2px solid green/yellow on interactive items. | AA |
| **Colorblind Safe Ops** | Deuteranopia / Protanopia / Tritanopia | Success state: Blue + Checkmark icon<br>Error state: Orange + Cross icon<br>Never rely on red/green differences alone. | AA |
| **Reduced Motion Glass** | Vestibular disorders | All transitions: `none` or `1ms`<br>No canvas loops or scrolling logs.<br>Static wallpaper fallback. | AA |
| **Dyslexia Focus** | Dyslexic cognitive needs | Font family: Dyslexia-friendly sans-serif.<br>Background: Soft warm beige or warm gray (reduces glare). | AA |

---

## 2. Core Contrast Rules
1. **Interactive Controls**: Every button, input field, and tab must expose a high-contrast focus ring (`focus-visible:ring-2 focus-visible:ring-nd-accent`).
2. **Dynamic Contrast Auditing**: Run unit tests (`verify-theme-accessibility.ts`) checking color combinations against the contrast formula:
   $$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
   Where $L_1$ is the relative luminance of the lighter color and $L_2$ is the relative luminance of the darker color.
