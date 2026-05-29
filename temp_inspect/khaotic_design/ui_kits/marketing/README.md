# Marketing UI Kit — `khaoticlabs.com`

This is the **canonical marketing site**, verbatim. The HTML and CSS are self-contained — open `index.html` directly.

## Why a single file?

The live site was hand-authored as one focused HTML document. Splitting it into React components for the sake of a "kit" would add friction without value. The system tokens it uses (UV/lime/void/Orbitron/STM/Exo 2) are documented in the root `colors_and_type.css` — anyone building a new page in this system can lift them from there.

## Sections in order

1. **Nav** — sticky, `backdrop-filter: blur(20px) saturate(180%)`, UV bottom border.
2. **Hero** — eyebrow + glitch headline (`Khaotic / Engineering / The Future_`) + typewriter terminal line + clip-path primary CTA + UV secondary CTA + right-stack stats (`$0K Overhead · 48hr Sprint Cycles · 100% Autonomous`).
3. **Services** — three-up grid. SVC-01 Rapid Intel · SVC-02 Full Build · SVC-03 Embedded CTO. Nested-square lime icon + UV ID tag + amber price line.
4. **Stack** — auto-fit grid of every tool with its emoji + role.
5. **Process** — SDLC timeline with lime→UV gradient rail, numbered dots, four phases.
6. **Pricing** — three tiers, middle "Tier 02" featured with `// MOST POPULAR` ribbon + lime top border.
7. **Contact** — code-card with `khaotic = { studio, location, email, response_sla, status }` JS literal.
8. **Footer** — wordmark + social links + copyright.

## JS

- **Custom cursor** (lime dot + UV ring, ring lerp 0.14).
- **Typewriter terminal** in the hero — 4 lines, type at 52ms, hold 2.8s, delete at 28ms, loop.
- **IntersectionObserver** scroll reveal for services/stack/pricing cards with 60ms stagger.
- **Cursor disable on hover** of `a`/`button` — ring grows from 28→44px and turns UV.

## `_redirects`

`/* /index.html 200` — Cloudflare Pages SPA fallback. Required.

## What to NOT change

- The clip-path on `.btn-p` (`polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)`). It's the brand's signature button shape.
- The blinking `_` cursor after the wordmark. The brand signature.
- The lime + UV split on the glitch. Both colors required.
- Tagline rotation: "AI Systems & Vibe Engineering" / "Terminal-First. Zero Bloat." / "Engineering the Future_".
