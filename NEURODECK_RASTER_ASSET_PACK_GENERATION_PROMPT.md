# NEURODECK Raster Asset Pack Generation Prompt

## Purpose
Use this prompt when the task is to generate **real image assets** for NEURODECK: PNG, JPG, WebP, raster icons, splash images, marketing images, launcher images, and a complete logo export pack. This is not a UI redesign prompt. This is not a theme architecture prompt. This is not a placeholder design brief. The agent must create actual files on disk.

---

# MASTER PROMPT

You are a senior brand designer, production asset pipeline engineer, Electron release engineer, and visual QA lead.

Your job is to generate a complete production-ready raster brand asset pack for **NEURODECK**, an Electron + React + TypeScript + Tailwind desktop application optimized for Steam Deck and desktop use.

NEURODECK is a premium handheld AI workstation. It should feel like a native tactical operating environment for AI workflows, not a generic chatbot, browser wrapper, or low-effort Electron shell.

The visual direction must align with the existing NEURODECK brand system:

- Product identity: premium handheld AI workstation
- UX personality: intelligent, tactical, professional, technical, immersive, futuristic
- Design language: tactical glass, modern console-grade operating UI, high-end AI terminal, Steam Deck-native workstation
- Primary platform: Steam Deck LCD at 1280x800, also desktop Windows/macOS/Linux
- Visual DNA: modern tactical OS first, AAA command UI second, subtle terminal heritage third
- Color direction:
  - `surface.primary`: `#0A0D10`
  - `surface.secondary`: `#11161C`
  - `text.primary`: `#E8F4FF`
  - `text.secondary`: `#8DA1B3`
  - `accent.primary`: `#5EEBFF`
  - `accent.success`: `#7CFFB2`
  - `accent.warning`: `#FFC857`
  - `accent.error`: `#FF5A6A`
- Theme references: Blacksite, Tactical Glass, Ghost Terminal, Hologrid, Minimal Ops, Night Watch, Broadcast
- UI inspiration lane: SteamOS, JetBrains, VS Code, Destiny-style tactical HUDs, Blackmagic dashboard clarity, Arc-style polish

Do not generate cyber-slop. Do not create a generic glowing brain logo. Do not use fake stock circuit boards. Do not use copyrighted platform artwork. Do not include Steam Deck hardware renders unless the repository already has licensed source imagery. Do not ship placeholders. Do not describe what assets should be made. Generate the assets.

---

## Absolute Scope

Create a full asset package that includes:

1. PNG logo exports
2. JPG logo exports where transparency is not needed
3. WebP logo exports
4. Raster application icons
5. Raster feature icons
6. Splash/loading images
7. Marketing hero images
8. Social preview images
9. Store/capsule-style promotional images
10. GitHub/documentation branding images
11. Favicon output where the only SVG final file allowed is `favicon.svg`
12. Asset manifest JSON
13. Asset README
14. Validation script
15. Generation script
16. Checksums

The final deliverable must be a real folder of exported files, not a design explanation.

---

## Non-Goals

Do not perform any of the following unless explicitly requested in a separate task:

- Redesign the application UI
- Modify the ThemeProvider architecture
- Add React components
- Modify Electron main/preload/renderer code
- Modify Rust or backend code
- Replace app screens
- Audit all empty states
- Create fake screenshots of app screens unless using real screenshots from the repo
- Generate placeholder marketing copy
- Use stock images, copyrighted game UI, copyrighted console UI, or unlicensed brand marks

This task is strictly about production raster asset generation.

---

## Required Repository Output Structure

Create or update this structure:

```text
/assets
  /brand
    /source
      neurodeck-logo-master.svg
      neurodeck-glyph-master.svg
      neurodeck-wordmark-master.svg
      neurodeck-favicon-master.svg
      brand-notes.md
    /png
      /logo
      /glyph
      /wordmark
      /lockups
      /marketing
      /splash
      /icons
    /jpg
      /logo
      /marketing
      /splash
    /webp
      /logo
      /marketing
      /splash
      /icons
    /favicon
      favicon.svg
      favicon-16.png
      favicon-32.png
      favicon-48.png
      favicon-64.png
      favicon-128.png
      favicon-256.png
    /app-icons
      /png
      /windows
      /macos
      /linux
    /feature-icons
      /png
      /webp
    /social
      /png
      /jpg
      /webp
    /store
      /png
      /jpg
      /webp
    manifest.brand-assets.json
    checksums.sha256
    README.md
/scripts
  generate-brand-assets.mjs
  validate-brand-assets.mjs
```

Source SVG files are allowed as internal generation sources. Final exported logo deliverables must be raster except for `assets/brand/favicon/favicon.svg`.

---

## Logo System Requirements

Generate these logo families:

### 1. Primary Logo
A premium NEURODECK identity mark combining:

- A sharp `N` or `ND` monogram
- Subtle neural routing / signal pathway geometry
- Deck/workstation symbolism without copying Steam Deck hardware
- Tactical glass edge language
- Strong silhouette at small sizes
- No cheesy robot head
- No generic AI brain
- No stock “network globe” icon

Export names:

```text
neurodeck-logo-primary-transparent-{size}.png
neurodeck-logo-primary-dark-bg-{size}.png
neurodeck-logo-primary-light-bg-{size}.png
neurodeck-logo-primary-dark-bg-{size}.jpg
neurodeck-logo-primary-dark-bg-{size}.webp
```

Required sizes:

```text
256x256
512x512
1024x1024
2048x2048
4096x4096
```

### 2. Glyph / App Symbol
A square-safe, mask-safe icon glyph suitable for app launchers.

Export names:

```text
neurodeck-glyph-transparent-{size}.png
neurodeck-glyph-dark-bg-{size}.png
neurodeck-glyph-light-bg-{size}.png
neurodeck-glyph-maskable-{size}.png
neurodeck-glyph-dark-bg-{size}.webp
```

Required sizes:

```text
16x16
24x24
32x32
48x48
64x64
96x96
128x128
192x192
256x256
384x384
512x512
1024x1024
```

### 3. Wordmark
Create a clean NEURODECK wordmark. It must be readable at small sizes and must not look like a random sci-fi font dump.

Export names:

```text
neurodeck-wordmark-horizontal-transparent-{width}x{height}.png
neurodeck-wordmark-horizontal-dark-bg-{width}x{height}.png
neurodeck-wordmark-horizontal-dark-bg-{width}x{height}.jpg
neurodeck-wordmark-horizontal-dark-bg-{width}x{height}.webp
```

Required sizes:

```text
1024x256
2048x512
4096x1024
```

### 4. Full Lockups
Generate horizontal and stacked lockups:

```text
neurodeck-lockup-horizontal-transparent-2048x512.png
neurodeck-lockup-horizontal-dark-bg-2048x512.png
neurodeck-lockup-horizontal-dark-bg-2048x512.jpg
neurodeck-lockup-horizontal-dark-bg-2048x512.webp
neurodeck-lockup-stacked-transparent-2048x2048.png
neurodeck-lockup-stacked-dark-bg-2048x2048.png
neurodeck-lockup-stacked-dark-bg-2048x2048.jpg
neurodeck-lockup-stacked-dark-bg-2048x2048.webp
```

### 5. Monochrome and Accessibility Variants
Generate:

```text
neurodeck-logo-mono-white-transparent-1024.png
neurodeck-logo-mono-black-transparent-1024.png
neurodeck-logo-high-contrast-1024.png
neurodeck-logo-low-vision-1024.png
```

---

## App Icon Requirements

Generate production app icons for Electron packaging.

Required PNG sizes:

```text
16x16
24x24
32x32
48x48
64x64
128x128
256x256
512x512
1024x1024
```

Output:

```text
/assets/brand/app-icons/png/icon-16.png
/assets/brand/app-icons/png/icon-24.png
/assets/brand/app-icons/png/icon-32.png
/assets/brand/app-icons/png/icon-48.png
/assets/brand/app-icons/png/icon-64.png
/assets/brand/app-icons/png/icon-128.png
/assets/brand/app-icons/png/icon-256.png
/assets/brand/app-icons/png/icon-512.png
/assets/brand/app-icons/png/icon-1024.png
```

Also generate platform packaging wrappers when tooling is available:

```text
/assets/brand/app-icons/windows/icon.ico
/assets/brand/app-icons/macos/icon.icns
/assets/brand/app-icons/linux/icon.png
```

If `.ico` or `.icns` cannot be generated in the current environment, do not fake them. Create a clear note in the asset README explaining which tool is missing and leave the PNG source set complete.

---

## Feature Icon Requirements

Generate raster icons for these NEURODECK feature areas:

```text
workspace
models
agents
memory
sessions
settings
terminal
browser
vpn
diagnostics
plugins
security
themes
updates
local-ai
cloud-sync
controller-mode
steam-deck-mode
performance
logs
```

Each feature icon must be visually consistent with the app glyph system.

Required exports:

```text
/assets/brand/feature-icons/png/{feature}-24.png
/assets/brand/feature-icons/png/{feature}-32.png
/assets/brand/feature-icons/png/{feature}-48.png
/assets/brand/feature-icons/png/{feature}-64.png
/assets/brand/feature-icons/png/{feature}-128.png
/assets/brand/feature-icons/png/{feature}-256.png
/assets/brand/feature-icons/webp/{feature}-128.webp
/assets/brand/feature-icons/webp/{feature}-256.webp
```

Rules:

- Icons must be recognizable at 24px.
- Icons must use the same stroke weight and corner language.
- Icons must work on dark tactical glass surfaces.
- Icons must not depend on tiny unreadable internal detail.
- Icons must include transparent PNG versions.

---

## Splash Image Requirements

Generate splash/loading images for Steam Deck and desktop.

Required concepts:

1. `boot-primary` — normal launch
2. `boot-minimal` — reduced motion / accessibility mode
3. `loading-models` — local model initialization
4. `loading-agents` — agent system initialization
5. `offline-ready` — local/offline mode available
6. `safe-mode` — diagnostics / recovery launch
7. `update-applying` — update in progress
8. `error-recovery` — controlled error state, not scary crash art

Required sizes:

```text
1280x800      Steam Deck LCD native
1280x720      standard 16:9
1920x1080     desktop full HD
2560x1440     desktop QHD
3840x2160     desktop UHD
```

Required formats:

```text
PNG
JPG
WebP
```

Naming:

```text
/assets/brand/png/splash/neurodeck-splash-{concept}-{width}x{height}.png
/assets/brand/jpg/splash/neurodeck-splash-{concept}-{width}x{height}.jpg
/assets/brand/webp/splash/neurodeck-splash-{concept}-{width}x{height}.webp
```

Splash image rules:

- Must load fast.
- Must not use heavy grain, CRT filters, chromatic abuse, particle storms, or unreadable overlays.
- Must keep the app identity centered or slightly above center.
- Must respect safe areas for Steam Deck UI overlays.
- Must work when shown for under 2 seconds.
- Must include no fake terminal logs unless actual readable copy is provided.
- Text must be limited to real states such as `INITIALIZING LOCAL AI`, `OFFLINE READY`, `SAFE MODE`, or `NEURODECK`.

---

## Marketing Image Requirements

Generate marketing/promotional images that communicate the product clearly without fake screenshots.

Required marketing images:

```text
neurodeck-marketing-hero-main-1920x1080
neurodeck-marketing-hero-main-2560x1440
neurodeck-marketing-hero-main-3840x2160
neurodeck-marketing-controller-first-1920x1080
neurodeck-marketing-local-ai-1920x1080
neurodeck-marketing-agent-workspace-1920x1080
neurodeck-marketing-steam-deck-optimized-1920x1080
neurodeck-marketing-secure-electron-1920x1080
neurodeck-marketing-theme-system-1920x1080
```

Formats:

```text
PNG
JPG
WebP
```

Rules:

- Do not imply features that do not exist.
- Do not show fake app screenshots unless they are generated from real UI code or clearly marked as conceptual in filename.
- Do not use Steam, Valve, Microsoft, Apple, OpenAI, Anthropic, Google, Meta, Linux, or other third-party logos unless legally cleared.
- Use abstract UI framing, tactical panels, glow-safe accents, and brand shapes instead of counterfeit screenshots.
- Keep typography clean and minimal.
- Every marketing image must pass a 2-second readability test.

Suggested copy snippets, only where appropriate:

```text
NEURODECK
Handheld AI Workstation
Controller-first. Offline-ready. Tactical by design.
Local AI without the desktop friction.
Built for Steam Deck. Ready for desktop.
```

---

## Social Preview Requirements

Generate social/documentation preview images:

```text
/assets/brand/social/png/github-social-preview-1280x640.png
/assets/brand/social/jpg/github-social-preview-1280x640.jpg
/assets/brand/social/webp/github-social-preview-1280x640.webp

/assets/brand/social/png/x-preview-1600x900.png
/assets/brand/social/jpg/x-preview-1600x900.jpg
/assets/brand/social/webp/x-preview-1600x900.webp

/assets/brand/social/png/discord-preview-1200x630.png
/assets/brand/social/jpg/discord-preview-1200x630.jpg
/assets/brand/social/webp/discord-preview-1200x630.webp

/assets/brand/social/png/docs-cover-1920x1080.png
/assets/brand/social/jpg/docs-cover-1920x1080.jpg
/assets/brand/social/webp/docs-cover-1920x1080.webp
```

Rules:

- The NEURODECK name must be readable.
- The image must crop well in previews.
- Important text must stay inside a central safe area.
- Avoid tiny subcopy.

---

## Store / Capsule-Style Promotional Assets

Generate store-ready concept images, but do not claim official store compliance unless validated against the current storefront requirements.

Output:

```text
/assets/brand/store/png/neurodeck-store-header-1920x620.png
/assets/brand/store/jpg/neurodeck-store-header-1920x620.jpg
/assets/brand/store/webp/neurodeck-store-header-1920x620.webp

/assets/brand/store/png/neurodeck-store-card-1200x1600.png
/assets/brand/store/jpg/neurodeck-store-card-1200x1600.jpg
/assets/brand/store/webp/neurodeck-store-card-1200x1600.webp

/assets/brand/store/png/neurodeck-store-wide-1920x1080.png
/assets/brand/store/jpg/neurodeck-store-wide-1920x1080.jpg
/assets/brand/store/webp/neurodeck-store-wide-1920x1080.webp

/assets/brand/store/png/neurodeck-store-square-1024x1024.png
/assets/brand/store/jpg/neurodeck-store-square-1024x1024.jpg
/assets/brand/store/webp/neurodeck-store-square-1024x1024.webp
```

Rules:

- Brand-first, not clutter-first.
- No fake awards.
- No fake review quotes.
- No fake platform badges.
- No third-party logos.
- No fake screenshots unless derived from real app UI.

---

## Raster Format Rules

### PNG
Use PNG when:

- Transparency is required
- Icon is used in app shell
- Logo is used over arbitrary backgrounds
- Crisp edges are required

Requirements:

- Preserve alpha where needed.
- Avoid unnecessary massive file sizes.
- Do not export blank transparent canvases.

### JPG
Use JPG when:

- Background is solid or photographic/illustrative
- Transparency is not needed
- Marketing image needs broad compatibility

Requirements:

- Quality target: 90–95
- No alpha channel
- Must not crush dark gradients into muddy blocks

### WebP
Use WebP when:

- Web/docs/app marketing usage benefits from smaller files
- Raster splash images need fast loading

Requirements:

- Quality target: 88–94
- Lossless WebP for transparent logos/icons when reasonable
- Lossy WebP for large marketing imagery

---

## Technical Pipeline Requirements

Use a deterministic script-based pipeline. Do not manually export one-off files without reproducible source.

Preferred Node tooling:

```bash
npm install --save-dev sharp
```

Create:

```text
/scripts/generate-brand-assets.mjs
/scripts/validate-brand-assets.mjs
```

Add package scripts:

```json
{
  "scripts": {
    "brand:generate": "node scripts/generate-brand-assets.mjs",
    "brand:validate": "node scripts/validate-brand-assets.mjs",
    "brand:build": "npm run brand:generate && npm run brand:validate"
  }
}
```

The generation script must:

1. Read master source artwork.
2. Export every required PNG size.
3. Export JPG variants with solid backgrounds.
4. Export WebP variants.
5. Generate favicon PNGs.
6. Generate only one final SVG: `favicon.svg`.
7. Generate manifest JSON.
8. Generate SHA256 checksums.
9. Fail loudly on missing outputs.

The validation script must verify:

- File exists
- File is not zero bytes
- Dimensions match filename
- Format matches extension
- Alpha exists where transparency is required
- JPG files do not contain alpha
- WebP files are readable
- PNG files are readable
- Color mode is valid
- No output image is fully transparent
- No output image is visually blank
- Required files are complete

---

## Asset Manifest Requirements

Create:

```text
/assets/brand/manifest.brand-assets.json
```

Schema:

```json
{
  "project": "NEURODECK",
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "sourceFiles": [],
  "assets": [
    {
      "path": "assets/brand/png/logo/neurodeck-logo-primary-transparent-1024.png",
      "type": "logo",
      "variant": "primary-transparent",
      "format": "png",
      "width": 1024,
      "height": 1024,
      "transparent": true,
      "sha256": "...",
      "intendedUse": ["app", "docs", "marketing"]
    }
  ]
}
```

Every generated asset must appear in the manifest.

---

## README Requirements

Create:

```text
/assets/brand/README.md
```

The README must include:

- What the asset pack contains
- How to regenerate assets
- How to validate assets
- Which files are source files
- Which files are final deliverables
- Which final file is the only SVG allowed
- How to use PNG vs JPG vs WebP
- App icon usage notes for Electron packaging
- Splash image usage notes
- Marketing image usage notes
- Accessibility notes
- Legal notes about third-party marks
- Known limitations

---

## Visual Quality Bar

The final assets must look like they belong to a serious production app.

Reject anything that looks like:

- Random AI orb
- Generic glowing brain
- Crypto logo
- Esports team logo
- Overdesigned gamer badge
- Fake hacker skull
- Cheap neon cyberpunk wallpaper
- Random stock circuit texture
- Illegible sci-fi font
- Logo with unreadable tiny lines
- Screenshot fantasy with fake UI claims

The strongest direction is:

- Sharp monogram
- Premium tactical glass
- Subtle neural routing
- Clear silhouette
- High contrast
- Small-size readability
- Steam Deck-friendly composition
- Calm, confident, technical polish

---

## Accessibility Requirements

All assets must support:

- Dark background usage
- Light background usage
- High contrast variant
- Low vision variant
- Reduced visual-noise splash variant
- Legibility at Steam Deck screen size

For any image with text:

- Text must be readable at 1280x800.
- Avoid sub-14px equivalent visual text.
- Avoid low-contrast gray-on-black microcopy.
- Avoid all-caps paragraphs.

---

## QA Checklist

Before completing the task, verify:

```text
[ ] PNG logo files exist
[ ] JPG logo files exist where appropriate
[ ] WebP logo files exist
[ ] App icons exist at all required PNG sizes
[ ] Favicon SVG exists
[ ] Favicon PNG sizes exist
[ ] Feature icons exist for every listed feature
[ ] Splash images exist in all required sizes and formats
[ ] Marketing images exist in all required sizes and formats
[ ] Social preview images exist
[ ] Store/capsule-style images exist
[ ] Manifest exists
[ ] Checksums exist
[ ] README exists
[ ] Generation script exists
[ ] Validation script exists
[ ] Validation script passes
[ ] No zero-byte files
[ ] No blank images
[ ] No unlicensed third-party logos
[ ] No fake feature claims
[ ] No placeholder artwork
[ ] SVG final export is limited to favicon.svg only
```

---

## Final Response Format

When finished, respond with:

1. A short summary of what was generated
2. The asset root path
3. The exact command to regenerate assets
4. The exact command to validate assets
5. Any known limitations
6. A list of important files
7. Confirmation that validation passed or a transparent explanation of what failed

Do not say “assets should be created.”
Do not say “I recommend creating.”
Do not provide only concepts.
Create the files and report the result.

---

# Optional Extended Direction: NEURODECK Visual Concepts

Use one of these directions, then generate the full pack from it.

## Concept A — Neural Deck Monogram
A compact `ND` mark where the `N` is built from angular deck-like rails and the `D` contains a subtle neural signal node. Cyan primary accent, deep black surface, minimal inner glow. Best for app icon and launcher usage.

## Concept B — Tactical Glass Core
A square app glyph with a beveled glass panel, thin cyan edge highlights, and a centered geometric neural core. Best for splash screens and premium marketing.

## Concept C — Signal Grid Wordmark
Clean NEURODECK wordmark with a custom `O` rendered as a calibrated signal ring. Best for website headers, docs, and social previews.

## Concept D — Offline AI Workstation Badge
A restrained badge shape containing the glyph, not an esports crest. Best for store cards and promotional tiles.

Pick the concept that produces the strongest small-size silhouette. If multiple concepts are generated, choose one final system and export consistently.

---

# Completion Standard

The task is complete only when the repository contains a reproducible, validated, real raster asset pack for NEURODECK.

No placeholders. No fake files. No “coming soon” assets. No asset descriptions pretending to be exports.
