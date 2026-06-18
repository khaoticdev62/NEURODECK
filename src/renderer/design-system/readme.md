# NEURODECK Design System

> **Tactical Glass for a handheld AI workstation.**
> A native, controller-first AI operating environment for Steam Deck — not a chatbot, not a SaaS dashboard, not a browser wrapper, not a fake hacker toy.

NEURODECK is a premium **Steam Deck-first AI workstation**. It runs local and remote AI
workflows with controller-first productivity: a terminal, browser tooling, model management,
agent/persona workflows, diagnostics, sessions, and secure desktop operation — all designed
to be readable and operable at couch/handheld distance on a 1280×800 Steam Deck LCD.

This repository is the **design system**: the brand foundations (color, type, spacing,
elevation, motion), the reusable React UI primitives, and high-fidelity recreations of the
product's real screens. Use it to build on-brand NEURODECK interfaces and assets — production
code or throwaway mocks.

---

## Sources

This system was reverse-engineered from the official NEURODECK product repository. Explore it
to build richer, more faithful designs:

- **GitHub — `khaoticdev62/NEURODECK`** (default branch `master`)
  *"AI-powered terminal for Steam Deck — Tauri v2 + Rust + Vite"* (ships an Electron + React + TS + Tailwind renderer).
  Key design sources read for this system:
  - `NEURODECK Design Tokens + Component Library v1.0/` — the canonical token spec, `tokens.json`, `tailwind.config.ts`, and the full component contracts.
  - `NEURODECK Full Screen Catalog v1.0/` — screen registry, route map, and controller focus graph.
  - `frontend/src/react/` — the real React primitives, cards, and layout shell.
  - `src/shared/theme/` — `designTokens.ts`, `themePresets.ts` (40+ shipped themes; **Blacksite Prime** / the default cyan token set is canonical here).
  - `frontend/public/favicon.svg` — the brand mark (copied to `assets/neurodeck-mark.svg`).
  - `frontend/index.html` — the live font loading + boot loader.
- Related: **`khaoticdev62/neurodeck-plugins`** — the community plugin registry (useful for plugin/extension UI context).

*Nothing here assumes you have access to those repos — but if you do, read them to do a better job.*

---

## Brand at a glance

**Core visual direction — "Tactical Glass":**

```
70% modern tactical operating system
20% AAA console dashboard
10% terminal heritage
```

Dark surfaces by default · high-contrast text · **controlled cyan glow, not neon soup** ·
GPU-safe depth · no heavy fullscreen blur · sharp focus rings for controller navigation ·
strong panel hierarchy · minimal but useful motion.

**Primary accent** is cyan `#5EEBFF`, reserved for focus, the active route, the primary CTA,
the caret, and the selected command. Status colors (success green, warning amber, error red,
agent purple) are used sparingly and **always pair with an icon + label** — never color alone.

---

## Content Fundamentals

How NEURODECK writes copy. The product is an *operating environment*, so the voice is that of
a precise, calm systems tool — closer to a flight HUD or a `man` page than a friendly assistant.

- **Tone:** tactical, terse, technical, confident. Plain language for consequences, exact verbs
  for actions. It tells you the state of the system; it does not chat. No hype, no exclamation
  marks, no "Oops!" cuteness.
- **Person:** mostly **imperative / system-voice** ("Connect a model", "Delete session",
  "Preparing local intelligence layer…"). Addresses the user as **you** when needed; the app
  refers to itself in system terms, not "I". Avoid first-person assistant voice.
- **Casing:**
  - **Wordmark** `NEURODECK` is always all-caps.
  - **HUD / micro labels** are UPPERCASE with wide letter-spacing (`MODELS`, `DIAGNOSTICS`, `OFFLINE`).
  - **Titles & body** are sentence case ("Security Lab Notes", "No model connected").
- **Status language** follows `icon + label + color`, e.g. `✓ Connected`, `! Degraded`,
  `× Failed`, `… Running`. Status is never color-only.
- **Destructive copy is explicit.** Never "Are you sure?". Name the object and the consequence:
  > **Delete session "Security Lab Notes"?**
  > This removes the local copy from this device. This cannot be undone.
  > `[Delete Session]` `[Cancel]`
- **Numbers are real and dense where it matters** — token throughput, latency in ms, VRAM
  estimates, context size, queue depth — but telemetry is local-first and never decorative.
- **Emoji:** **not used.** Iconography is Lucide line icons + a small set of status glyphs
  (`✓ ! × …`). The brand reads as a tool, not a toy.
- **Vibe in one line:** *"Local intelligence layer, online. Controller ready."*

Sample voice from the product: boot copy reads "Preparing local intelligence layer…"; empty
states state the condition and the recovery action ("No model connected — Connect a model to
start a session").

---

## Visual Foundations

**Color & mood.** Cool, near-black, blue-leaning dark. The world is built from a *void → slate*
ramp (`#05070A` app root → `#0A0D10` shell → `#11161C` panels → `#18212B` raised). Text is a
cool off-white `#E8F4FF` stepping down through `#B9CAD8` to muted `#8DA1B3`. Accents are
luminous and electric — cyan primary, with blue/green/amber/red/purple reserved for meaning.
Imagery, when present, is cool-toned, high-contrast, low-key, faintly tinted cyan; never warm,
never busy.

**Type.** Mono-forward. **Orbitron** carries the wordmark and startup/title moments (uppercase,
wide tracking ~0.22em). **Inter** is the UI/body workhorse. **JetBrains Mono** / **Fira Code**
own the terminal, code, and dense metadata. **Rajdhani / Space Grotesk** are available for
tactical HUD headers. Type scale tops out at 28px display and bottoms at 11px micro — and
Steam Deck readability rules forbid body text below 14px, interactive labels below 13px.

**Spacing & layout.** Strict **4px grid** (4 → 48). The shell is fixed: a 40px top status bar,
a 72px nav rail, a fluid workspace, an optional 280px context panel, and a 96–148px input
console pinned to the bottom edge. Critical controls stay out of extreme corners; the lower
edge is reserved for input/action; nothing horizontally scrolls at Deck resolution.

**Backgrounds.** Flat dark surfaces, not gradients. The only gradients are *small and
purposeful*: the boot logo's faint cyan-to-green fill, the boot progress bar, and the
`premium` button. Optional "wallpaper" layers (neural aurora / particles) sit far behind
content at low opacity with a vignette and ~4% grain — ambient, never distracting. No
full-screen scanlines, no shader transitions, no particle storms.

**Borders & corners.** Hairline borders built from translucent light (`rgba(255,255,255,0.06)`
subtle → `0.12` default → `0.25` strong) over dark surfaces. Radii: `6px` compact controls,
`10px` buttons/cards, `14px` large panels, `20px` modals, `999px` pills/badges, and `0px` for
true terminal blocks.

**Cards & elevation.** Cards are dark glass panels: a slate fill, a hairline border, and a soft
drop shadow (`0 8px 24px rgba(0,0,0,0.24)`). Panels above them rise via shadow, not lighter
fills. Overlays use a deep `0 24px 80px rgba(0,0,0,0.55)`. Glass surfaces use **light blur
(~8px)** only — never heavy backdrop filters on scrolling lists.

**Glow & focus.** The signature effect is a **controller focus ring**: a 2px cyan outline plus
a `0 0 24px rgba(94,235,255,0.18)` glow. Glow is reserved for focus, the active accent, and the
brand mark — it is *controlled*, never ambient neon.

**Motion.** Short, readable, reversible, reduced-motion-aware. Durations: `90ms` focus/hover,
`140ms` panel reveal, `220ms` modal/route, `0ms` for reduced motion. Easing: standard
`cubic-bezier(0.2,0,0,1)`, entrance `ease-out`, exit `ease-in`. **Forbidden:** elastic overshoot,
bounce, particle storms, heavy blur animation, full-screen scanlines, motion that hides loading.

**Hover / press states.** Hover lightens via a low-alpha accent or surface tint
(`bg-accent/10 → /20`) and brightens text from muted → primary; it never relies on color alone
for meaning. Press **shrinks** (`active:scale-95`) and slightly brightens — a physical,
button-feel response tuned for both touch and controller confirm (A).

**Transparency & blur.** Used deliberately: translucent borders everywhere; `surface.glass`
(82% slate) for tactical-glass cards; `surface.overlay` (88% void) behind modals. Blur is light
and rare. The aesthetic is *depth through shadow and translucency*, not frosted glass for its
own sake.

---

## Iconography

NEURODECK uses **Lucide** (lucide-react) outline icons as its icon system — consistent
~1.5–2px stroke weight, rounded line caps, no fills. This design system links Lucide from CDN
for cards and kits (the product bundles `lucide-react`).

- **Style:** monoline / outline only. Icons inherit `currentColor`, so they take the accent or
  text color of their context. Status icons are tinted to the matching semantic color.
- **Status glyphs:** a small canonical set pairs with every status — `✓` connected/success,
  `!` degraded/warning, `×` failed/error, `…` running. Always **icon + label + color**, never
  color alone (accessibility rule).
- **Standalone icons require an accessible label** (`aria-label`) and expose a tooltip on
  hover/focus (see `IconButton`).
- **Controller glyphs:** the A/B/X/Y/L1/R1 button hints in the controller hint bar are rendered
  as small lettered chips, not platform-trademarked glyphs.
- **Brand mark:** `assets/neurodeck-mark.svg` — a cyan "N" letterform built from glowing nodes
  inside HUD corner brackets, with a single red status dot. Used as favicon, boot logo, and the
  status-bar lockup.
- **No emoji.** Ever, in product UI.

> **Substitution flag:** the product's exact Lucide React version is bundled in-app; this system
> references Lucide via CDN (`lucide@latest`) for previews. Visually identical — flagging in case
> you want a pinned/self-hosted copy.

---

## Index / Manifest

**Root**
- `styles.css` — global entry point (consumers link this). `@import`s the token + font closure only.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill manifest for downloadable use.

**`tokens/`** — CSS custom properties (`--nd-*`), reachable from `styles.css`
- `fonts.css` — webfont loading (Orbitron, Inter, JetBrains Mono, Fira Code, Rajdhani, Space Grotesk).
- `colors.css` — void/slate primitives, text ramp, accents, semantic surfaces/borders/text.
- `typography.css` — font families, type scale, weights, HUD tracking.
- `spacing.css` — 4px spacing scale, shell dimensions, radius, elevation, motion.

**`assets/`**
- `neurodeck-mark.svg` — brand mark / logo.

**`components/`** — reusable React primitives (each with `.tsx` + `.prompt.md` + a card)
- `core/` — Button, IconButton, Badge, StatusChip, TextInput, Select, Toggle, Panel.
- `feedback/` — Modal, Toast, ConfirmDialog.
- `systems/` — ModelCard, AgentCard, SessionCard.

**`ui_kits/workstation/`** — high-fidelity, interactive recreation of the NEURODECK workstation
shell (status bar, nav rail, chat workspace, context panel, input console, command palette,
model manager).

**Foundation cards** — small specimen `.html` files across the project, tagged `@dsCard`, that
populate the **Design System** tab (Type, Colors, Spacing, Brand, Components, Workstation).

---

*Built for the deck. Local intelligence layer, online.*
