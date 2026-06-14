---
name: neurodeck-design
description: Use this skill to generate well-branded interfaces and assets for NEURODECK, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## What's here
- `readme.md` — the full design guide: brand context, content fundamentals, visual foundations, iconography, and a file index. **Start here.**
- `styles.css` — global entry point; link it to inherit every token + font. `@import`s `tokens/`.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css` (radius/elevation/motion), `fonts.css`.
- `assets/neurodeck-mark.svg` — the brand mark.
- `components/` — reusable React primitives (`core/`, `feedback/`, `systems/`), each with a `.d.ts`, a `.prompt.md`, and a showcase card.
- `ui_kits/workstation/` — interactive 1280×800 recreation of the NEURODECK app shell.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).

## The one-line brief
NEURODECK is a **Steam Deck-first AI workstation** with a **"Tactical Glass"** language: dark
void/slate surfaces, high-contrast cool-white text, **controlled cyan (#5EEBFF) glow**, mono-forward
type (Orbitron wordmark, Inter UI, JetBrains Mono code), a strict 4px grid, sharp controller focus
rings, and minimal motion. Status is always **icon + label + color** — never color alone. No emoji,
no neon soup, no SaaS-dashboard tropes.
