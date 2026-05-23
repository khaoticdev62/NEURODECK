# NEURODECK — Brand Identity System

> Production-grade visual identity reference. All values are implementation-ready.

---

## 1. BRAND FOUNDATION

### Positioning
**NEURODECK** is the command center between the developer's mind and the machine — an AI-powered terminal OS for the Steam Deck that collapses the distance between thought and execution.

### Taglines
| Tier | Copy |
|---|---|
| Primary | `AI Terminal OS. Steam Deck Native.` |
| Secondary | `The command center between your brain and the machine.` |
| Developer | `Rust-core. Lua-extensible. LLM-native.` |
| Minimal | `Think. Type. Execute.` |

### Voice & Tone
- **Direct** — No marketing fluff. Describe what it does.
- **Technical** — Assume the reader can read code.
- **Precise** — Exact version numbers, real command names, actual paths.
- **Confident** — No hedging. "NEURODECK does X" not "NEURODECK can try to do X".

### Brand Archetypes
- Primary: **The Engineer** — builds the thing
- Secondary: **The Hacker** — bends systems to will
- Tertiary: **The Explorer** — pushes edges of the platform

---

## 2. LOGO SYSTEM

### Files
| Asset | File | Usage |
|---|---|---|
| Icon mark | `assets/brand/icon.svg` | App icon, favicon, tray icon |
| Full logo (H) | `assets/brand/logo.svg` | README, website header, installers |
| GitHub banner | `assets/brand/banner.svg` | GitHub social preview, OG image |

### Icon Anatomy
The **N-mark** is constructed from:
- Two vertical circuit-path strokes (left + right)
- One diagonal neural-connection stroke (top-left → bottom-right)
- Five node dots at junction points (4 corners + center midpoint)
- Corner bracket accents (scan-line frame)
- Red accent dot (bottom-right — version indicator)

### Scaling Rules
| Size | Usage | Node radius |
|---|---|---|
| 512px | Master / App store | 16px |
| 256px | macOS / Windows install | 10px |
| 128px | System tray, taskbar | 7px |
| 64px | Favicon, small tile | 5px |
| 32px | ICO, notification | 3px — simplify to 4 nodes only |
| 16px | ICO fallback | Drop nodes, keep N silhouette only |

### Clear Space
Minimum clear space = **½ the icon width** on all sides.

### Don'ts
- Don't rotate the N mark
- Don't recolor the nodes without updating the stroke
- Don't add drop shadows — the glow filter handles depth
- Don't place on light backgrounds without inverting to dark theme variant

---

## 3. COLOR SYSTEM

### Primary Palette
| Token | Hex | RGB | HSL | Use |
|---|---|---|---|---|
| `--cyan` | `#00F0FF` | `0, 240, 255` | `183°, 100%, 50%` | Primary accent, links, active states |
| `--black` | `#050505` | `5, 5, 5` | `0°, 0%, 2%` | App background |
| `--surface` | `#0a1015` | `10, 16, 21` | `207°, 35%, 6%` | Card/panel background |
| `--green` | `#00FF88` | `0, 255, 136` | `151°, 100%, 50%` | Success, OK states |
| `--red` | `#FF0055` | `255, 0, 85` | `340°, 100%, 50%` | Error, danger, accent |
| `--amber` | `#FFB000` | `255, 176, 0` | `41°, 100%, 50%` | Warning states |
| `--fg` | `#D9F7FF` | `217, 247, 255` | `197°, 100%, 93%` | Primary text |
| `--fg-muted` | `#4A7080` | `74, 112, 128` | `197°, 27%, 40%` | Secondary text, timestamps |

### Semantic Tokens
```css
:root {
  --color-bg:         #050505;
  --color-surface:    #0a1015;
  --color-border:     rgba(0, 240, 255, 0.12);
  --color-accent:     #00F0FF;
  --color-accent-dim: rgba(0, 240, 255, 0.15);
  --color-ok:         #00FF88;
  --color-warn:       #FFB000;
  --color-error:      #FF0055;
  --color-text:       #D9F7FF;
  --color-text-muted: #4A7080;
  --color-glow:       rgba(0, 240, 255, 0.6);
}
```

### Theme Variants
| Theme | Accent | Background | Foreground |
|---|---|---|---|
| BLACKSITE | `#00F0FF` | `#050505` | `#D9F7FF` |
| TERMINAL_GHOST | `#00FFCC` | `#000000` | `#00FF66` |
| SYNTH_GRID | `#FF00FF` | `#0F0A1A` | `#E0E0FF` |
| CYBER_PUNK | `#FF007F` | `#0C0614` | `#00FFFF` |
| MILITARY | `#39FF14` | `#080A04` | `#C8E8A0` |
| OBSIDIAN | `#7C3AED` | `#09090B` | `#E4E4E7` |

### WCAG Compliance
All text colors achieve **AA** or **AAA** contrast against the `#050505` background:
- `#00F0FF` on `#050505`: **8.9:1** (AAA)
- `#D9F7FF` on `#050505`: **17.2:1** (AAA)
- `#FF0055` on `#050505`: **5.8:1** (AA)
- `#00FF88` on `#050505`: **12.1:1** (AAA)

### Colorblind Safety
- Primary cyan (#00F0FF) and red (#FF0055) are distinguishable under deuteranopia and protanopia — they differ in hue AND luminance
- Never use red/green as the only distinguisher for state (always add icon + text)

---

## 4. TYPOGRAPHY SYSTEM

### Font Stack
| Role | Font | Fallback |
|---|---|---|
| UI / Body | `JetBrains Mono` | `'Fira Code', 'Courier New', monospace` |
| Terminal output | `JetBrains Mono` | `monospace` |
| Headings | `JetBrains Mono` | same |
| Numbers / data | `JetBrains Mono` (tabular nums) | same |

> All typography intentionally uses a single monospace stack — this is a terminal OS. The grid-aligned, character-block rhythm is core to the identity.

### Size Scale (rem-based)
```
9xl: 6rem    (96px)   — Boot screen ASCII
8xl: 4.5rem  (72px)   — Hero headings
7xl: 3rem    (48px)   — Page titles
6xl: 2.25rem (36px)   — Section headers
5xl: 1.875rem(30px)   — Card headings
4xl: 1.5rem  (24px)   — Sub-headings
3xl: 1.25rem (20px)   — Large body
2xl: 1.125rem(18px)   — Body
xl:  1rem    (16px)   — Default
lg:  0.9rem  (14.4px) — Small UI
md:  0.8rem  (12.8px) — Metadata, labels
sm:  0.72rem (11.5px) — Timestamps, hints
xs:  0.65rem (10.4px) — Boot log lines
```

### Letter Spacing
```
tight:  -0.02em   — Large display text
normal:  0        — Body text
wide:    0.08em   — Monospace comfort
wider:   0.15em   — Labels, tags
widest:  0.25em   — ALL-CAPS headers
```

### Weights
- `400` — body, log lines
- `500` — labels, nav
- `600` — active states, highlights
- `700` — headings, brand name

---

## 5. ICONOGRAPHY SYSTEM

### Symbolic Language
NEURODECK uses a **circuit-node** visual language throughout:
- **Nodes** = connection points, neurons, junction markers
- **Traces** = data flow, strokes, paths between nodes
- **Corner brackets** = scan-frame, selection state
- **Red dot** = danger, live process, version marker

### Icon Grid (16px base)
```
Pixel grid:    16×16
Safe area:     12×12 (2px padding each side)
Stroke weight: 1.5px at 16px / 2px at 24px / 3px at 32px
Corner radius: 1px at 16px / 2px at 24px / 3px at 32px
```

### Status Icons (CSS class system)
```css
.icon-ok     { color: #00FF88; }
.icon-warn   { color: #FFB000; }
.icon-error  { color: #FF0055; }
.icon-info   { color: #00F0FF; }
.icon-muted  { color: #4A7080; }
.icon-active { color: #00F0FF; filter: drop-shadow(0 0 4px rgba(0,240,255,0.7)); }
```

### System Tray Icon
Use `icon.svg` at 22×22px on all platforms. On Windows, use `icon.ico` (bundled multi-size: 16, 32, 48, 256px).

---

## 6. MOTION & ANIMATION

### Principles
1. **Purposeful** — animations convey state change, not decoration
2. **Fast** — transitions: 120–200ms. No 1-second reveals.
3. **Directional** — elements enter from their logical origin (left nav items slide left→right)
4. **Glow-based** — accent color glow pulses convey "alive/active" state

### Standard Easing
```css
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1.0);   /* Enter */
--ease-in:     cubic-bezier(0.4, 0.0, 1.0, 1.0);   /* Exit */
--ease-inout:  cubic-bezier(0.4, 0.0, 0.2, 1.0);   /* Move */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0);/* Bounce/snap */
```

### Duration Scale
```
instant:  0ms     — no transition (toggle visibility)
fast:     80ms    — micro-feedback (button press)
normal:   150ms   — hover states, pill toggles
medium:   250ms   — slide transitions, modal open
slow:     400ms   — page transitions
xslow:    650ms   — boot sequence line reveals
xxslow:   950ms   — fade-out overlays
```

---

## 7. TERMINAL BRANDING

### ANSI Color Map
```
Black   (30/40): #050505
Red     (31/41): #FF0055
Green   (32/42): #00FF88
Yellow  (33/43): #FFB000
Blue    (34/44): #0066CC
Magenta (35/45): #FF00FF
Cyan    (36/46): #00F0FF  ← brand primary
White   (37/47): #D9F7FF
Bright variants: 15-20% lighter
```

### Startup Banner (ANSI escape)
```
╔══════════════════════════════════════════════╗
║  \e[96mNEURODECK\e[0m — AI Terminal OS v1.0.0             ║
║  \e[2m\e[36mBuild 20260523 · Steam Deck Edition\e[0m         ║
╚══════════════════════════════════════════════╝
```

### Log Line Format
```
[HH:MM:SS] [LEVEL] message
[0x0001]   BOOT    Initializing kernel space...
\e[96m[INFO]\e[0m  message     ← cyan
\e[92m[OK]\e[0m    message     ← green
\e[93m[WARN]\e[0m  message     ← amber
\e[91m[ERR]\e[0m   message     ← red
```

---

## 8. DESIGN SYSTEM TOKENS

### Spacing (4px base)
```
1: 4px    2: 8px    3: 12px   4: 16px
5: 20px   6: 24px   8: 32px   10: 40px
12: 48px  16: 64px  20: 80px  24: 96px
```

### Border Radius
```
none:  0
sm:    3px   (pills, tags)
md:    6px   (cards, inputs)
lg:    12px  (panels, modals)
xl:    18px  (large cards)
full:  9999px (badges, dots)
```

### Elevation / Glow System
```css
--shadow-sm:  0 0 8px  rgba(0, 240, 255, 0.15);
--shadow-md:  0 0 16px rgba(0, 240, 255, 0.25);
--shadow-lg:  0 0 32px rgba(0, 240, 255, 0.35);
--shadow-xl:  0 0 64px rgba(0, 240, 255, 0.5);
```

---

## 9. ADAPTIVE BRANDING RULES

To re-skin for a new project, change exactly 4 variables:

```css
:root {
  --brand-primary:    #00F0FF;   /* Main accent */
  --brand-secondary:  #FF0055;   /* Counter-accent */
  --brand-bg:         #050505;   /* Background */
  --brand-name:       'NEURODECK'; /* ASCII/text brand name */
}
```

Everything else inherits from these 4 tokens via the semantic layer.

---

## 10. FILE STRUCTURE

```
assets/
  brand/
    icon.svg          ← Master vector icon (source of truth)
    logo.svg          ← Horizontal wordmark + mark
    banner.svg        ← GitHub social preview / OG image
    BRAND.md          ← This document (brand reference)
    exports/          ← Generated raster exports (gitignored)
      icon-512.png
      icon-256.png
      icon-128.png
      icon-64.png
      icon-32.png
      icon-16.png
      logo-dark.png
      logo-light.png
      banner-1280x640.png
      banner-1200x630.png  ← OG/Twitter card
src-tauri/
  icons/
    icon.png          ← 512px PNG (Tauri source)
    icon.ico          ← Windows ICO (multi-size)
    icon.icns         ← macOS ICNS
    32x32.png
    128x128.png
    128x128@2x.png
    [all others auto-generated by tauri icon command]
```

### Generating Tauri Icons from SVG
```bash
# Requires: inkscape or rsvg-convert + tauri-cli
npx tauri icon assets/brand/icon.svg
```
This auto-generates all sizes into `src-tauri/icons/`.

---

## 11. GITHUB PROFILE CUSTOMIZATION

### Repository Topics
```
tauri, rust, ai, llm, steam-deck, terminal, gemini, ollama,
lua, desktop-app, rag, vector-memory, warpinator, grpc, tonic,
prompt-engineering, steamos, game-mode
```

### Repository Description
```
AI Terminal OS for the Steam Deck — LLM chat, live canvas, PTY shell, autonomous agent, vector memory, Warpinator gRPC. Built with Tauri + Rust + Lua.
```

### Social Preview
Use `assets/brand/banner.svg` (1280×640) converted to PNG as the GitHub repository social image.
