---
name: khaotic-labs-design
description: Use this skill to generate well-branded interfaces and assets for Khaotic Labs, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Khaotic Labs · Design Skill

Read `README.md` first — it covers the brand context, content fundamentals, visual foundations, and iconography rules. Then explore the other files in this folder:

- `colors_and_type.css` — the canonical token set (colors, type, spacing, radii, shadows, motion, window frames). Import this from any HTML artifact you build.
- `assets/` — wordmark, mark (knockout + dark), grid background.
- `preview/` — individual spec cards showing every token. Useful as visual reference when you want to "see" a swatch or scale before you commit.
- `ui_kits/marketing/` — recreation of `khaotic.dev`. Lift the hero, footer, and stat-grid patterns.
- `ui_kits/forge/` — recreation of the Forge product UI. Lift the file-tree, diff, tool-call, and powerline-statusbar patterns.
- `ui_kits/chat/` — full chat interface combining Telegram / WhatsApp / Discord / Signal patterns. Lift the workspace rail, conversation rows, message bubble, voice-message bar, and command palette.
- `slides/` — 8 slide templates at 1920×1080. Use as the starting deck for any internal presentation.

## When invoked

If creating visual artifacts (slides, mocks, throwaway prototypes), **copy** the needed assets out of this skill folder into the new artifact's directory and link with relative paths. Don't reference files in this folder by absolute path from a shipping artifact — the skill folder may move.

If working on production code, treat this folder as reference. Lift values (hex codes, font-family stacks, spacing constants, motion curves) into your project's own token file rather than importing `colors_and_type.css` directly from a build target.

If the user invokes this skill with no other guidance, ask what they want to build, ask a few targeted questions (audience, channel, fidelity, length), then act as an expert designer who outputs HTML artifacts **or** production code depending on the need.

## Non-negotiables

- **JetBrains Mono everywhere.** UI, headlines, captions, navigation. IBM Plex Sans only for long-running prose (blog body, docs paragraphs, legal). No other faces.
- **One accent at a time.** Forge Orange `#FF6A1F` is primary. Phosphor Green `#00FF41` is secondary (live data, encryption indicators, "● online" dots). Never use both at full saturation in the same surface — pick one focal color.
- **Sharp corners.** Default radius is 2px. 8px is the absolute maximum. Pill (`999px`) is reserved for tag chips.
- **No emoji** in product or marketing surfaces. Use ASCII glyphs (`→`, `·`, `▸`, `[OK]`, `$`) instead.
- **No buzzwords.** No "revolutionize", "empower", "seamless", "next-gen", "AI-powered" in body copy. Be technical, dry, specific.
- **Dark canonical.** The brand lives on `#0A0A0A`. Light mode is an exception, not the default.
- **Sentence case** for headings. **`UPPERCASE + 0.16em tracking`** for eyebrows. **`lowercase`** for product names where it reads cleaner (`forge`, `khaotic`).
- **Snap motion.** 120–280ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`. No spring physics, no confetti, no "delight."
- **Hairlines, not shadows.** 1px borders in `--line-1` (`#2A2925`) carry the structural language. Shadows are subtle and machined-looking, not glassy.

## Common moves

- Building a marketing page → lift `Hero` + `ProductShowcase` + `Manifesto` from `ui_kits/marketing/app.jsx`.
- Building any app chrome → wrap your panel in `.win` from `colors_and_type.css` (window-frame with `[root@khaotic:~]$` title bar).
- Building a deck → fork `slides/index.html` and replace the slide sections; the `deck-stage` web component handles scaling, navigation, and print-to-PDF.
- Building any product UI → start with `ui_kits/forge/app.jsx` as scaffolding (file tree, chat, diff, statusbar).
