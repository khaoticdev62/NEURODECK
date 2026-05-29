# Khaotic Labs — Design System

> **AI Systems · Agentic Workflows · Terminal-First Architecture**
> A solo AI development studio out of Southfield, Michigan. Building enterprise-grade AI products without a team, without investors, without infrastructure bloat. The One-Person Unicorn model.

---

## Source Materials

This system is built against the **canonical brand documents** provided by the studio:

| Doc | Used for |
|---|---|
| `khaotic-labs-brand-playbook.docx` | Mission, ethos (Lean Giant Protocol), color system, type stack, logo rules, SDLC, services |
| `khaotic-labs-social-strategy.docx` | Content pillars, voice, AAVE inflection, lead-gen funnel |
| `khaotic-labs-launch-checklist.docx` | Operational scope reference |
| `khaotic-labs-client-agreement.docx` | Legal language reference |
| `index.html` (live khaoticlabs.com) | All visual motifs, color values, exact spacing, signature interactions |
| `github-profile-README.md` | Public dev-facing voice |

Where the playbook and live site agreed, that's what shipped. Where the live site went further than the playbook (clip-path CTAs, drifting orbs, glitch text, vignette), I treated the live site as canonical because it represents the brand in market.

The previous "boutique-quiet forge-orange" direction was wrong — **discarded entirely**. Forge product UI kit was also fictional and has been **replaced** with a Mission Control dashboard for the real services.

---

## Index

| File / Folder | Purpose |
|---|---|
| `colors_and_type.css` | All tokens — UV/lime palette, Orbitron/STM/Exo 2 stack, signature components (btn-p, sec-tag, svc-card, glitch-wrap, scanlines, orbs). The canonical entry point. |
| `SKILL.md` | Agent-skill manifest. Read first if invoking as a skill. |
| `assets/` | Wordmark, K-mark, square glyph, favicon, hero grid+orb background. |
| `fonts/` | Self-host scaffold for Orbitron / Share Tech Mono / Exo 2 — `fonts.css` + `download.sh`. Fonts load from Google Fonts CDN by default (see Type section); run the script to self-host. |
| `preview/` | Spec cards rendered in the Design System tab. |
| `ui_kits/marketing/` | `khaoticlabs.com` recreation — hero, services, stack, process, pricing, contact, footer. |
| `ui_kits/control/` | **Mission Control** — internal dashboard for managing AI agents, sprints, automations, client projects. |
| `ui_kits/chat/` | Internal client-comms hub — Telegram/WhatsApp/Discord/Signal patterns in the Khaotic visual system. |
| `slides/` | 16:9 slide templates. |

---

## Brand Foundation

### Mission
Prove that one developer with the right tools, the right mindset, and the right systems can build enterprise-grade AI products that outperform entire teams. Khaotic Labs is not a traditional agency — **it's a precision strike unit**.

### Vision
To be the most technically capable solo AI studio in the Midwest. Recognized not for headcount, but for the velocity, depth, and craft of every system shipped.

### The Lean Giant Protocol — the five immutable principles
1. **ZERO BLOAT** — Lean, deterministic systems only. Frameworks earn their place or they stay out.
2. **JPE MANDATE** — Just Plain English. Every technical explanation, architecture decision, and deliverable is written in plain language first.
3. **SECURITY FIRST** — Every architectural decision is a potential threat vector. Zero-trust by default. Memory-safe languages where stakes are high.
4. **ANTIGRAVITY** — All projects are modular components of a larger ecosystem. Reuse `pkg/` libraries before reinventing.
5. **ONE SPRINT ITEM** — One task scoped, approved, delivered, validated before the next begins. No parallel sprawl.

### Vibe-Engineering
A core operating standard, not decoration. Every layer of every Khaotic product — architecture, UI, documentation, terminal output — feels intentional. **A Khaotic Labs product is identifiable by its precision and its character.** That's the bar.

---

## Content Fundamentals — Voice & Tone

Khaotic Labs is **direct, technically resonant, and culturally attuned**. Never condescending, never corporate-hollow, never performatively casual.

### The four pillars (from the brand voice rubric)
- **Direct** — say what you mean, mean what you say. No hedging language.
- **Technical** — precision over simplicity when precision matters.
- **Culturally resonant** — AAVE inflection and colloquial clarity where it fits naturally.
- **Confident but earned** — never boastful without receipts.

### Sample copy (lift the cadence)

> **Hero**
> "Khaotic / Engineering / The Future_"
> "Solo AI studio. Zero overhead. Maximum output."
> "Building autonomous systems that run while you sleep."

> **Service card**
> "SVC-01 // RAPID INTEL — 24-to-48-hour precision assessments. Pure intelligence, zero waiting rooms."

> **Tech stack**
> "Every tool chosen for maximum leverage per dollar."

> **CTA**
> `init_contact()` · `book_discovery_call()` · `init_inquiry()` — function-call syntax for buttons is on-brand.

> **Status**
> `status: accepting_clients` · `response_sla: < 24 hours` · `// System Online`

> **Pinned post template**
> "If you're new here, here's what Khaotic Labs does:
> → Custom AI agents built with Claude + Gemini
> → Automated workflows that eliminate manual ops work
> → Fractional CTO work for mid-size businesses scaling their tech
> Solo studio. No bloat. Production-grade. Remote from Southfield, MI."

### Casing
- **Title case** for headings (the live site uses it: "Core Capabilities", "Value-Based Pricing"). Display headlines may stack a one-word line ("The Future_") with a different tone.
- **UPPERCASE + 0.22em tracking** for eyebrows, section tags, button text, stat labels. This is everywhere on the brand.
- **`function_case()` syntax** for CTAs (`init_contact()`, `book_discovery_call()`). On-brand.
- **`// TAG` comments** as section markers (`// MOST POPULAR`, `// System Online`, `// Who We Are`).
- **`SVC-01`, `Tier 02`, `01 // Services`** — numbered, code-flavored.

### Punctuation & glyphs
- **`→` arrow** for bullet leads (not `•`). Always.
- **`_` underscore cursor** as the visual signature on logos and inline.
- **`█` block cursor** for terminal/typewriter sequences.
- **`/`, `::`, `//`** as separators where they read naturally.
- **No exclamation points.** No corporate emoji on body copy. Emoji ARE used as icons in the tech-stack grid (🤖 🧠 ⚡ 🦀 ☁️ 🐙 🗄️ 🔄 🔥 📅 — see Iconography).

### What to avoid
- Corporate hollow ("synergy", "leverage your", "best-in-class", "world-class").
- Performatively casual ("hey friend", "lol", lowercase-everything).
- AI-slop adjectives ("seamless", "revolutionary", "cutting-edge", "next-gen", "supercharge", "unleash").
- Filler hedging ("perhaps", "might consider", "in my opinion").

---

## Visual Foundations

### Color — The Khaotic Ultraviolet/Lime System

| Name | Hex | Role |
|---|---|---|
| **Deep Void** | `#0B0B0D` | Primary background. Never use white or light backgrounds for primary surfaces. |
| **Void 2** | `#0F0F12` | Nav background, raised section. |
| **Void 3** | `#141418` | Card / panel. |
| **Void 4** | `#1A1A20` | Input / well / hover. |
| **Ultraviolet** | `#8900E1` | Structural accent — borders, dividers, phase labels, secondary CTA. **Never** body text. |
| **Ultraviolet Hi** | `#A020F0` | UV hover state, glitch accent. |
| **Electric Lime** | `#A3E635` | Primary CTA, key data, logo K, status indicators. **Use sparingly for maximum impact.** |
| **Lime Hi** | `#BEFF00` | Lime hover state. |
| **Text Hi** | `#F0F0F8` | Headings, high-emphasis. |
| **Text** | `#B8B8C8` | Body. |
| **Text Dim** | `#5A5A6E` | Muted, captions. |

**Rule of one focal:** one lime element per surface. UV does the structural lifting; lime is the spotlight.

### Type

| Family | Role | Weights | Use for |
|---|---|---|---|
| **Orbitron** | Display | 700 / 900 | All headings, the K-wordmark, big hero type, stat numbers. Geometric, technical, distinctive. |
| **Share Tech Mono** | Monospace | 400 | Eyebrows, terminal output, code blocks, button labels, stat units, prices, ID tags. The "voice" face. |
| **Exo 2** | Body | 300 / 400 / 500 / 600 | Body copy, descriptions, paragraphs, UI text. Readable, tech-forward, versatile. |

**Hard rule:** never use Inter, Roboto, Arial, or system fonts in external-facing UI. Internal-only documents (drafts, internal slides) may use Arial for compatibility.

### Spacing
- 4px base. 8 / 16 / 24 / 32 / 56 / 96 are the most-used steps.
- Sections breathe — `5.5rem 3.5rem` is the canonical section padding on the live site.
- Density bias toward dense in UI chrome, generous in marketing.

### Backgrounds
- **Default-on `.scanlines` overlay** — 2px stripes at 7% opacity black. This is part of the brand, not opt-in.
- **Default-on `.vignette`** — radial darkening from center 50% to corners 70% void. Adds depth.
- **Hero grid** — 56px UV grid lines at 4.5% opacity, radially masked so it fades into the void at the edges.
- **Drifting orbs** — large blurred (`filter: blur(90px)`) circles in UV and lime. One UV in the top-right, one lime in the bottom-left. They drift on a 10s/14s loop.
- **No photography.** No stock imagery, no team photos.

### Animation
- **Custom cursor** — lime dot + UV ring that grows on hover. (`.cursor-dot`, `.cursor-ring`)
- **Glitch text** — hero headings split into UV-top-slice + lime-bottom-slice on a 5s loop, with a quick 8% flicker window. (`.glitch-wrap[data-text="..."]`)
- **Blinking underscore cursor** in the logo and after typewriter lines (1s step).
- **Typewriter terminal lines** — letters in at 52ms, hold 2.8s, delete out at 28ms, loop.
- **Orb drift** — 10s/14s `ease-in-out` translations of ~25–35px. Slow, atmospheric.
- **Slide-fill CTA** — secondary nav CTA fills lime-from-left on hover (`.nav-cta::before { transform: translateX(-100%) → 0 }`).
- **Scroll reveal** — `IntersectionObserver` fades cards in with 60ms staggered delay.
- **Never spring physics.** Never confetti.

### Interaction states
- **Hover:** lime CTAs gain `box-shadow: 0 0 28px var(--lime-glow)` and brighten to `--lime-hi`. UV CTAs gain border + UV glow.
- **Press:** color step darker (lime → `--lime-600`).
- **Focus:** 2px void + 2px lime ring (`--ring-lime`).
- **Disabled:** `--text-faint` text on `--void-3`.

### Borders, dividers, shadows
- **1px UV-tinted borders** are the default structural language. `rgba(137, 0, 225, 0.18)` for default, `0.30` for prominent.
- **Top-edge gradient line** on card hover — `linear-gradient(90deg, transparent, var(--uv), transparent)` 2px tall.
- **Shadows are colored.** `glow-lime` (lime halo) and `glow-uv` (UV halo) are first-class. Drop shadows exist but always paired with a glow.
- **No "machined panel" 1px-inset-white look** — that was the wrong direction.

### Radii
- **Sharp.** Almost everything is 0 or 2px.
- **Pill (`999px`)** is used for cursor ring only.
- **`--clip-cta`** — the angular clip-path (`polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)`) is the signature shape on the primary CTA. Don't round it. Don't square it. Clip it.

### Layout
- **Sticky nav** with `backdrop-filter: blur(20px) saturate(180%)` over `rgba(11,11,13,0.88)` + 1px UV-tint bottom border.
- **Max content width:** 1280px for marketing, full-bleed for app UI.
- **Section padding:** `5.5rem 3.5rem` (`88px 56px`).
- **Section header pattern:** eyebrow tag + h2 + sub paragraph + 3.5rem gap to content grid.

### Transparency & blur
- **Nav backdrop blur** is canonical. Apply to any docked toolbar.
- **`.scanlines` and `.vignette`** are fixed full-viewport overlays at `z-index: 800/799`.
- **Orbs** at `filter: blur(90px)` — heavy blur, always layered behind content.

---

## Iconography

The brand uses **two icon systems intentionally**:

### 1. Lucide (for app/product UI chrome)
Loaded from CDN where needed in product surfaces (the Mission Control kit, the Chat kit). Sharp 1.5px strokes, square caps. Lives behind `<i data-lucide="...">`.

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="terminal" style="width:16px;height:16px;stroke-width:1.5"></i>
<script>lucide.createIcons();</script>
```

### 2. Emoji (for the tech-stack grid)
**Used intentionally** on the marketing tech-stack grid — the live site uses them as cell-icons:

| Tech | Emoji | Tech | Emoji |
|---|---|---|---|
| Claude Pro | 🤖 | Cloudflare Pages | ☁️ |
| Gemini AI Pro | 🧠 | GitHub | 🐙 |
| Groq | ⚡ | Turso | 🗄️ |
| OpenRouter | 🔀 | n8n | 🔄 |
| Go + Bubble Tea | 🐹 | Firebase Studio | 🔥 |
| Rust | 🦀 | Cal.com + Contra | 📅 |

These are **brand iconography**, not decoration. Use the same emoji per tech consistently across surfaces.

### 3. ASCII glyphs (everywhere)
- `→` for bullet leads
- `█` for terminal cursor
- `_` for the brand cursor signature
- `//` for code-comment headers
- `::` for path-style separators

### Logos in this system
- `assets/logo-wordmark.svg` — `[K lime] + haotic Labs + [_ UV blinking]`, the canonical lockup
- `assets/logo-mark.svg` — 64×64 square mark, big K + underscore
- `assets/logo-glyph.svg` — 240×240 deep glyph with grid + bracket corners (for hero / favicons / social cards)
- `assets/bg-hero.svg` — 1200×600 hero background with grid + UV orb + lime orb

---

## Canonical Tech Stack (for designs that reference it)

When mocking dashboards, status cards, or stack pages, use **these exact tools and roles**:

**AI layer:** Claude Pro (primary engine) · Gemini AI Pro (research + context) · Groq (inference) · OpenRouter (failover)
**Dev:** Go + Bubble Tea (TUI/CLI) · Rust (system hooks) · TypeScript / Next.js (web)
**Infra:** GitHub · Cloudflare Pages · Cloudflare Tunnel
**Data:** Turso (edge SQLite) · Neon (alternative Postgres) · n8n (self-hosted workflows)
**Business:** Cal.com · Contra · Wave · Mercury · Cloudflare Email Routing · Buffer

## Services tiers

| Tier | Name | Range | Delivery |
|---|---|---|---|
| `SVC-01` | AI Micro-Consulting / Rapid Strike | $750 – $3,000 | 24–48 hours |
| `SVC-02` | Custom AI MVP / PoC / Full Build | $20K – $50K | 4–8 weeks |
| `SVC-03` | Fractional CTO / Embedded CTO | $5K – $15K/mo | Ongoing retainer |

---

## UI Kits

| Kit | Description |
|---|---|
| `ui_kits/marketing/` | `khaoticlabs.com` recreation — sticky-blur nav, glitch hero, services grid, stack grid, SDLC process timeline, pricing tiers (with `// MOST POPULAR` ribbon), code-block contact card, footer. |
| `ui_kits/control/` | **Mission Control** — the internal studio dashboard. Active sprints, agent status, automation runs, client projects, the `.corrections.log` viewer. |
| `ui_kits/chat/` | Internal team chat. Workspace rail, conversation list, message bubbles with code/voice/file/reply, read receipts, command palette. Reskinned to UV/lime. |

Each kit has its own README with components inventory.

## Slides

`slides/index.html` — 8 templates rendered via `<deck-stage>`. Title, agenda, section, services, stack, SDLC process, big quote, end.

---

## Caveats & flagged substitutions

- **Mission Control kit** is a new fictional surface (the real studio runs out of a terminal). It's there to demonstrate how the brand applies to dashboards. Discard if not useful.
- **Chat kit** is fictional — Khaotic Labs is solo, no team chat. Kept as a reference for how the system applies to a different product category.
- **Speaker notes** on slides are illustrative — replace with real talking points before any external use.
- **Lucide icon set** is a placeholder for app chrome icons. If you commission custom icons, swap it out.
- **The previous Forge UI kit** (fictional terminal coding tool) has been removed.
