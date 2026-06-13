# NEURODECK — Brand Identity System

> Canonical production-grade brand reference. All values are implementation-ready.
> Last updated: 2026-06-12. Supersedes all prior versions.

---

## 1. BRAND FOUNDATION

### Brand Name

**NEURODECK**

### Brand Category

Premium handheld AI workstation  
Steam Deck-native AI operating environment  
Controller-first productivity console  
Local/remote LLM command center  
Developer-focused tactical interface

### Brand Positioning

NEURODECK is not a chatbot app.  
NEURODECK is not a browser wrapper.  
NEURODECK is not a generic Electron dashboard.

NEURODECK is a handheld AI command environment designed for developers, security learners, AI power users, tinkerers, and Steam Deck users who want serious AI tooling in a native-feeling, controller-first interface.

The brand should feel like the Steam Deck gained an AI operating system.

### Brand Mission

Transform the Steam Deck into a powerful handheld AI workstation that feels native, premium, fast, tactical, and usable without a keyboard or mouse.

### Brand Vision

Become the definitive AI workstation interface for handheld computing.

NEURODECK should feel like a professional AI command system that could ship beside SteamOS, JetBrains tools, Arc Browser, DaVinci Resolve dashboards, and AAA sci-fi interface design.

### Brand Promise

**AI power without desktop friction.**

### Brand Essence

**Handheld intelligence. Tactical control. Local-first power.**

---

## 2. TAGLINES

| Tier | Copy |
|---|---|
| Primary | `Your AI workstation, built for the Deck.` |
| Command | `Command intelligence from anywhere.` |
| Technical | `Local AI. Controller-first. Deck-native.` |
| Minimal | `Not a chatbot. A command system.` |
| Developer | `AI control, right in your hands.` |

---

## 3. BRAND PERSONALITY & ARCHETYPES

### Archetype

Primary: **The Operator** — disciplined, mission-focused, tactical  
Secondary: **The Architect** — builds durable systems  
Secondary: **The Engineer** — solves the real problem  
Secondary: **The Sentinel** — trustworthy, secure, watchful

### NEURODECK should feel

Intelligent. Tactical. Focused. Premium. Technical. Fast.  
Calm under pressure. Slightly mysterious. Developer-grade.  
Console-native. Futuristic without being corny.

### NEURODECK should NOT feel

Toy-like. Gimmicky. Overly cyberpunk. Fake hacker.  
SaaS-generic. Overloaded. Corporate sterile. Mobile-app-ish.  
Cluttered. Mocked or fake.

---

## 4. VOICE & TONE

### Core Voice Properties

- **Clear** — Short, declarative phrases. State the fact.
- **Direct** — No marketing fluff. No hedging.
- **Confident** — "NEURODECK does X", not "NEURODECK can try to do X".
- **Technical** — Assume the reader can read code.
- **Calm** — Steady tone even in error states. Never panicked.
- **Useful** — Every message informs, guides, warns, confirms, or helps recovery.
- **Slightly cinematic** — System-status feel, not customer-service feel.

### Good Examples

```
"Model connection restored."
"Local inference is ready."
"Session saved."
"Terminal process exited."
"VPN profile needs valid credentials before connecting."
"Controller navigation active."
"No models detected. Connect an Ollama server or configure a provider in Settings."
"Memory vault is empty. Conversations and facts will appear here as the agent builds context."
```

### Bad Examples

```
"Oopsie! Something went wrong!"       ← never cute
"HACK THE MAINFRAME!!!"               ← fake hacker
"Your cyber brain is loading…"        ← cringe
"AI magic is happening…"              ← meaningless
"Coming soon!"                        ← no vaporware copy
"Fake model connected."               ← never fake state
```

### Writing Rules

- Use short, clear phrases.
- Use action-first labels.
- Use real system status only — never fake live data.
- Never exaggerate capability.
- Never imply a feature works unless wired to real backend behavior.
- Avoid fluffy AI language.
- Every message should either inform, guide, warn, confirm, or help the user recover.

---

## 5. AUDIENCE PROFILES

| Audience | Description |
|---|---|
| Power developer | Writes code daily, wants fast AI tooling without leaving a focused environment |
| Security learner | Studying CTF, network, or offensive/defensive skills; needs local models + terminal |
| Steam Deck enthusiast | Maximizes hardware utility; wants native-feel apps not Steam-ROM-adjacent |
| AI power user | Tests local models, compares providers, manages agents and personas |
| Tinkerer | Extends NEURODECK via Lua plugins; values hackability over hand-holding |

---

## 6. PRODUCT DESCRIPTIONS

### Short (app store)

NEURODECK is a Steam Deck-first AI workstation built for local models, agents, terminal workflows, browser tooling, and controller-native productivity.

### Long (store page)

NEURODECK turns your Steam Deck into a handheld AI command center. Built for developers, learners, researchers, and power users, it brings AI chat, local model control, terminal workflows, browser utilities, agents, personas, diagnostics, and session management into a premium tactical interface designed for controller-first use.

It is fast, readable, offline-capable, and built to feel native on handheld hardware.

### Repository description

AI workstation OS for the Steam Deck — LLM chat, live canvas, PTY shell, autonomous agent, vector memory, Lua plugins, controller-first navigation. Built with Electron + Rust (axum) + React.

---

## 7. LOGO SYSTEM

### Files

| Asset | File | Usage |
|---|---|---|
| Icon mark | `assets/brand/icon.svg` | App icon, favicon, tray icon, launcher |
| Full logo (horizontal) | `assets/brand/logo.svg` | README, website header, installers |
| GitHub/OG banner | `assets/brand/banner.svg` | GitHub social preview, OpenGraph image |
| Favicon (web) | `frontend/public/favicon.svg` | Browser tab icon |

### Icon Anatomy (N-mark)

- Two vertical circuit-path strokes (left + right columns of the N)
- One diagonal neural-connection stroke (top-left → bottom-right)
- Five node dots at junction points (4 corners + center midpoint)
- Corner bracket accents (scan-line frame around the mark)
- Red accent dot (bottom-right — version/live indicator)

### Scaling Rules

| Size | Usage | Node radius |
|---|---|---|
| 512px | Master / App store | 16px |
| 256px | Install packages | 10px |
| 128px | System tray, taskbar | 7px |
| 64px | Favicon, small tile | 5px |
| 32px | ICO, notification | 3px — simplify to 4 nodes |
| 16px | ICO fallback | N silhouette only, no nodes |

### Clear Space

Minimum clear space = **½ the icon width** on all sides.

### Logo Don'ts

- Do not rotate the N-mark.
- Do not recolor nodes without updating the stroke.
- Do not add drop shadows — the glow filter handles depth.
- Do not place on light backgrounds without using the dark-theme variant.

### Wordmark Direction

All-caps: **NEURODECK**  
Font family: Orbitron (boot/splash), Space Grotesk or Rajdhani (marketing)  
Letter spacing: 0.12–0.18em  
Weight: 600–700  
Never use condensed or distorted variants.

---

## 8. COLOR SYSTEM

### Primary Palette

| Token | Hex | Use |
|---|---|---|
| Neuro Cyan | `#5EEBFF` | Primary accent, links, active states, focus rings |
| Deep Black | `#05070A` | App background (L0) |
| Graphite Surface | `#0B1117` | Main shell, cards (L1) |
| Raised Panel | `#101820` | Elevated panels (L2) |
| Glass Surface | `rgba(20,32,42,0.72)` | Translucent panels (L3) |
| Primary Text | `#E8F4FF` | Body text |
| Secondary Text | `#9CB2C7` | Labels, timestamps |
| Muted Text | `#607080` | Hints, placeholders |

### Accent Palette

| Token | Hex | Use |
|---|---|---|
| Deck Blue | `#3B82F6` | Secondary accent, info states |
| Signal Violet | `#8B5CF6` | Tertiary accent, agent indicators |
| Success Green | `#7CFFB2` | Success, AI response color |
| Warning Amber | `#FFC857` | Warnings |
| Error Red | `#FF5A6A` | Errors, danger states |
| System White | `#F8FBFF` | High-contrast text on dark overlays |

### Brand Gradient

```css
/* Use via var(--brand-gradient) or Tailwind bg-brand-gradient */
--brand-gradient: linear-gradient(135deg, #5eebff 0%, #3b82f6 45%, #8b5cf6 100%);
--brand-gradient-dark: linear-gradient(180deg, rgba(16,24,32,0.92), rgba(5,7,10,0.96));
```

### Signal Glow

```css
/* Use via var(--brand-glow) or Tailwind shadow-brand-glow */
--brand-glow: 0 0 24px rgba(94, 235, 255, 0.22);
--brand-glow-strong: 0 0 40px rgba(94, 235, 255, 0.38);
```

### Surface Layer System (L0–L3 implemented, L4–L7 via existing z-index tokens)

```css
--surface-l0: #05070a;               /* App background */
--surface-l1: #0b1117;               /* Main shell / sidebar */
--surface-l2: #101820;               /* Raised panels / cards */
--surface-l3: rgba(20, 32, 42, 0.72);/* Glass panels / translucent overlays */
/* L4–L7: active focus, drawers, modals, critical alerts — use --z-* tokens */
```

### Canonical CSS Implementation

```css
:root {
  --accent-color: #5eebff;           /* CANONICAL primary — use this, not #00F0FF */
  --bg-color: #0a0d10;
  --fg-color: #e8f4ff;
  --response-color: #7cffb2;
  --warning-color: #ffc857;
  --error-color: #ff5a6a;
}
```

> **Note:** The legacy `#00F0FF` value in older codebase files is incorrect. The canonical Neuro Cyan is `#5EEBFF`. All new code must use `--accent-color` or `var(--nd-accent-primary)`.

### WCAG Compliance

| Pairing | Contrast | Rating |
|---|---|---|
| `#5EEBFF` on `#05070A` | 9.1:1 | AAA |
| `#E8F4FF` on `#05070A` | 17.8:1 | AAA |
| `#FF5A6A` on `#05070A` | 6.1:1 | AA |
| `#7CFFB2` on `#05070A` | 12.4:1 | AAA |

---

## 9. TYPOGRAPHY SYSTEM

### Font Stack

| Role | Font | Fallback |
|---|---|---|
| UI / Body | `Inter` | `system-ui, sans-serif` |
| Terminal / Code | `JetBrains Mono` | `Fira Code, Cascadia Code, monospace` |
| Brand Wordmark | `Orbitron` | `Space Grotesk, Rajdhani, sans-serif` |
| Secondary accent | `Space Grotesk` | `Rajdhani, system-ui, sans-serif` |

### Size Scale

```
2xs: 11px  — Boot log lines, status ticks
xs:  12px  — Timestamps, metadata
sm:  13px  — Secondary labels, hints
base:14px  — Default body text
md:  15px  — Comfortable reading
lg:  16px  — Navigation, active labels
xl:  20px  — Card headings
2xl: 24px  — Section titles
```

### Weights

- `400` — body, log lines, descriptions
- `500` — labels, navigation items
- `600` — active states, headings
- `700` — brand wordmark, critical status

### Letter Spacing

```
normal:  0        — body text
wide:    0.05em   — code, monospace
wider:   0.12em   — UI labels
widest:  0.18em   — ALL-CAPS wordmark
```

---

## 10. UI VISUAL LANGUAGE

### Design Theme Name: Tactical Glass

A modern, GPU-aware interface system combining:
- Dark layered surfaces with clear elevation hierarchy
- Glass-like translucent panels with subtle borders
- Fine HUD-style borders (0.5–1px)
- Controlled neon accents (cyan primary, violet secondary)
- High readability — Steam Deck LCD-safe contrast
- Minimal visual noise
- Terminal heritage without retro overload

### Visual Formula

- 70% modern tactical operating system
- 20% AAA command HUD
- 10% terminal heritage

### Surface Architecture

Always use layered surfaces with clear contrast between levels:

| Layer | Token | Use |
|---|---|---|
| L0 | `--surface-l0` / `bg-nd-surface-l0` | App background |
| L1 | `--surface-l1` / `bg-nd-surface-l1` | Main shell, sidebar |
| L2 | `--surface-l2` / `bg-nd-surface-l2` | Cards, raised panels |
| L3 | `--surface-l3` / `bg-nd-surface-l3` | Glass overlays, tooltips |
| L4 | `bg-nd-surface-raised` | Active focus panels |
| L5 | `bg-nd-surface-overlay` | Drawers, side sheets |
| L6 | `bg-nd-surface-modal` | Modals, dialogs |
| L7 | (critical alert color) | System alerts |

---

## 11. THEME FAMILIES

Seven primary themes define the NEURODECK visual spectrum:

| Theme | Accent | Mood |
|---|---|---|
| **Blacksite** | `#5EEBFF` cyan | Default — deep black tactical command UI |
| **Tactical Glass** | `#3B82F6` blue | Glassmorphic premium panels |
| **Ghost Terminal** | `#7CFFB2` green | Minimal terminal-forward, spectral glow |
| **Hologrid** | `#8B5CF6` violet | Subtle grid surfaces, holographic accents |
| **Night Watch** | `#9CB2C7` gray-blue | Low-light comfort for long sessions |
| **Ultraviolet Ops** | `#8B5CF6` violet | Black and purple, violet glow |
| **Minimal Ops** | `#E8F4FF` white | Reduced effects, maximum readability |
| **Broadcast** | `#FFC857` amber | High-contrast for streaming and demos |

---

## 12. ICONOGRAPHY SYSTEM

### Style

- Monoline strokes
- Rounded-square geometry
- 1.75–2px stroke weight at standard sizes
- Minimal fill
- Consistent optical sizing
- Tactical but readable at all sizes

### Symbol Language

- **Nodes** = connection points, neurons, junction markers
- **Traces** = data flow, signal paths between nodes
- **Corner brackets** = scan-frame, selection state
- **Red dot** = danger, live process, version marker

### Icon Grid

```
Base grid:   16×16
Safe area:   12×12 (2px padding each side)
Stroke:      1.5px at 16px / 2px at 24px / 3px at 32px
Corner r:    1px at 16px / 2px at 24px / 3px at 32px
```

### Status Icon Colors

```css
.icon-ok     { color: #7cffb2; }                       /* Success */
.icon-warn   { color: #ffc857; }                       /* Warning */
.icon-error  { color: #ff5a6a; }                       /* Error */
.icon-info   { color: #5eebff; }                       /* Info / accent */
.icon-muted  { color: #607080; }                       /* Inactive */
.icon-active { color: #5eebff; filter: drop-shadow(0 0 4px rgba(94,235,255,0.6)); }
```

---

## 13. MOTION IDENTITY

### Principles

1. **Inform, confirm, guide. Never distract.**
2. Animations convey state change — not decoration.
3. Fast: transitions 120–300ms. No one-second reveals.
4. Glow pulses convey "alive/active" state.
5. Always respect `prefers-reduced-motion`.

### Standard Easing

```css
--ease-snap:       cubic-bezier(0.22, 1, 0.36, 1);    /* Enter: elements pop in */
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);     /* Panel reveals */
--ease-out-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bounce/snap elements */
--ease-standard:   cubic-bezier(0.25, 0, 0, 1);       /* Moves and reorders */
```

### Duration Scale

```
micro:   80ms  — button press feedback
fast:    150ms — hover states, toggles
base:    220ms — component transitions
enter:   300ms — panels sliding in
spring:  380ms — bounce/settle motions
ambient: 2400ms — idle pulse animations
```

### Reduced Motion Guard

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### What to Animate

- Page/view transitions (fade + slight Y translate)
- Modal open/close (scale + fade)
- Sidebar expand/collapse (width + opacity)
- Focus glow pulses on interactive elements
- Token stream animation (AI typing indicator)
- Loading shimmer (skeleton screens)

### What NOT to Animate

- Constant background particle effects
- Heavy blur transitions (GPU-expensive on Steam Deck)
- Animations that delay user interaction
- Animations that hide or obscure content
- Motion spam — every click should NOT trigger animation

---

## 14. AUDIO IDENTITY

Audio is optional. Three modes: Off / Low / Full.

### Sound Direction

- Soft UI ticks on navigation
- Low digital confirmation tone on success
- Gentle terminal chirp on command dispatch
- Deep startup pulse (boot sequence)
- Quiet error tone (no jarring alerts)

### Never

- Loud arcade sounds
- Fake hacker beeps every second
- Sounds that play on every keystroke

---

## 15. STARTUP & SPLASH EXPERIENCE

### Sequence

1. App icon fades in (N-mark on dark background).
2. NEURODECK wordmark appears in Orbitron.
3. Real system checks display quickly:
   - Renderer ready
   - Secure preload ready
   - Session storage ready
   - Model registry ready
   - Controller input ready
4. Main shell loads.

### Splash Copy Options

Primary wordmark:
**NEURODECK**

Subtitle options:
- "Preparing local intelligence layer…" ← **current default**
- "Initializing handheld AI workspace…"
- "Loading command environment…"
- "Restoring session state…"
- "Controller interface ready."

### Boot Rules

- No fake boot logs.
- No fake "connecting to neural core" nonsense unless clearly cosmetic and toggleable.
- Real system status only.
- Progress bar must reflect real initialization, not a fixed timer.

---

## 16. EMPTY STATE COPY

Empty states should feel useful, not sad.

### Model

```
Title:  "Ready for local inference."
Body:   "No models detected. Connect an Ollama server, LM Studio, or configure
         an OpenAI-compatible endpoint in Settings."
Actions: Open Settings / Retry Detection
```

### Sessions

```
Title:  "No sessions yet."
Body:   "Start a conversation to create your first session."
Action: New Conversation
```

### Memory

```
Title:  "Memory vault is empty."
Body:   "Conversations and facts will appear here as the agent builds context."
Action: Add Fact
```

### Agents

```
Title:  "No agents configured."
Body:   "Create an agent profile to run autonomous workflows."
Action: Create Agent
```

### Search / Filter (no results)

```
Title:  "No matches found."
Body:   "No results for \"[query]\". Try a different search term."
Action: Clear Search
```

---

## 17. ERROR STATE COPY

Error states should be honest and recovery-focused.

### Model Connection Failed

```
Title:  "Model connection failed."
Body:   "NEURODECK could not reach the selected model provider. Check the
         provider configuration, local server status, or network connection."
Actions: Retry / Open Settings / View Logs
```

### Session Load Failed

```
Title:  "Session failed to load."
Body:   "The session data could not be retrieved. It may have been deleted or
         the storage path is unavailable."
Actions: Retry / New Session
```

### Terminal Process Exited

```
Title:  "Terminal process exited."
Body:   "The terminal process ended unexpectedly. Check the exit code for details."
Actions: Restart Terminal
```

---

## 18. BRAND ASSET CHECKLIST

Production assets required:

- [ ] Primary logo (SVG) — `assets/brand/logo.svg`
- [ ] Icon mark (SVG) — `assets/brand/icon.svg`
- [ ] Web favicon (SVG) — `frontend/public/favicon.svg`
- [ ] GitHub banner (SVG 1280×640) — `assets/brand/banner.svg`
- [ ] Monochrome icon variant
- [ ] High-contrast icon variant (white on black)
- [ ] App icon PNG 512px — `src-tauri/icons/icon.png`
- [ ] Windows ICO multi-size — `src-tauri/icons/icon.ico`
- [ ] macOS ICNS — `src-tauri/icons/icon.icns`
- [ ] Steam Deck launcher icon (PNG 256×256 or SVG)
- [ ] Social preview card (PNG 1200×630)
- [ ] README banner (PNG 1280×400)
- [ ] Theme preview images (one per theme family)
- [ ] UI screenshot frames (Steam Deck resolution 1280×800)

### Generating Icons

```bash
npx tauri icon assets/brand/icon.svg
# Generates all required sizes into src-tauri/icons/
```

---

## 19. ECOSYSTEM NAMING

### Core Product

**NEURODECK**

### Future Ecosystem

| Module | Description |
|---|---|
| NeuroDeck Core | Rust sidecar + bridge runtime |
| NeuroDeck Shell | Electron frontend shell |
| NeuroDeck Agents | Autonomous agent engine |
| NeuroDeck Memory | Vector memory and RAG layer |
| NeuroDeck Grid | Multi-device sync and mesh |
| NeuroDeck Studio | Visual workflow builder |
| NeuroDeck Sync | Cross-device encrypted sync |
| NeuroDeck Ops | Diagnostics and system monitoring |
| NeuroDeck Terminal | PTY session manager |
| NeuroDeck Vault | Secrets and credential manager |
| NeuroDeck Local | Offline-first model runtime |

### Naming Rules

- Use "NeuroDeck" (camelCase) for ecosystem product names.
- Use short functional names after the brand (Core, Shell, Agents).
- Avoid goofy sci-fi names for production modules.
- Keep names professional and immediately understandable.

---

## 20. BRAND ANTI-PATTERNS

Never:
- Fake live data or model connections.
- Fake VPN status, terminal output, or browser state.
- Overload screens with neon (one primary accent, two secondary).
- Make body text smaller than 12px.
- Hide critical system status.
- Make the app feel like a skin over a website.
- Use random cyberpunk clichés ("HACK THE MAINFRAME", etc.).
- Display "Coming Soon" copy without a real timeline.
- Break the tactical glass visual language with cartoon or bubbly elements.
- Use the old `#00F0FF` cyan — the canonical value is `#5EEBFF`.

Always:
- Keep the interface readable.
- Keep the brand serious and technical.
- Keep visual effects controlled and purposeful.
- Keep the Steam Deck as the primary design target (1280×800).
- Keep features honest — real status only.
- Keep accessibility built in.
- Keep the design premium but usable.

---

## 21. AI IMAGE GENERATION PROMPTS

### App Icon

```
Minimalist tech logo, capital letter N formed from two vertical bars and
diagonal neural connection, five circular nodes at junctions and corners,
cyan #5EEBFF color on #0B1117 dark background, scan-frame corner brackets,
small red accent dot bottom-right, glowing circuit aesthetic, clean vector,
64x64 app icon, tactical HUD style, no text
```

### Splash Screen Background

```
Dark tactical glass interface, deep space black #05070A background, subtle
cyan #5EEBFF circuit grid lines fading into darkness, translucent glass
panel in center, minimal geometric nodes and trace paths, Steam Deck
display aspect ratio 1280x800, premium tech aesthetic, no UI elements,
cinematic atmosphere
```

### GitHub Banner

```
Dark horizontal banner 1280x640px, NEURODECK wordmark in Orbitron font
on left, abstract circuit node network visualization on right in cyan
#5EEBFF, deep black background #0B1117, subtle glow effects, "Handheld
AI Workstation" subtitle, professional tech branding, no stock photos
```

### Marketing Hero

```
Steam Deck handheld console showing tactical dark UI interface with cyan
accents on screen, glowing neural network visualization, dark room
environment, premium product photography style, cinematic lighting,
AI workstation aesthetic
```

### Theme Preview Card

```
Dark rectangular UI card 600x400px, showing software interface panels
with [THEME_NAME] color scheme, terminal-style text, sidebar navigation,
chat interface preview, tactical glass aesthetic, professional mockup style
```

---

## 22. FILE STRUCTURE

```
assets/
  brand/
    icon.svg              ← Master vector icon (source of truth)
    logo.svg              ← Horizontal wordmark + mark
    banner.svg            ← GitHub social preview / OG image
    BRAND.md              ← This document
    exports/              ← Generated raster exports (gitignored)
      icon-512.png
      icon-256.png
      icon-128.png
      icon-64.png
      icon-32.png
      icon-16.png
      logo-dark.png
      banner-1280x640.png
      banner-1200x630.png

frontend/
  public/
    favicon.svg           ← Web browser favicon (N-mark)

src-tauri/
  icons/
    icon.png              ← 512px PNG (Tauri source)
    icon.ico              ← Windows ICO (multi-size)
    icon.icns             ← macOS ICNS
    32x32.png
    128x128.png
    128x128@2x.png
```
