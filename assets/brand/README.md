# NEURODECK Brand Asset Pack

Welcome to the official **NEURODECK** Brand Asset Pack. This folder contains all the production-ready graphics, application icons, feature assets, splash screens, marketing imagery, social previews, and store capsules.

NEURODECK is a premium handheld AI workstation designed for Steam Deck and desktop environments. The asset pack is strictly generated from vector sources to support multiple sizes and platform requirements.

---

## 📂 Directory Structure

All generated assets are organized by format, usage, and platform:

*   **`source/`**: Scaleable SVG master vector sources and design tokens.
*   **`png/`**: High-fidelity transparent and composite PNG files, organized by categories (`logo/`, `glyph/`, `wordmark/`, `lockups/`, `marketing/`, `splash/`, `icons/`).
*   **`jpg/`**: Solid-background JPEGs for web compatibility and background assets.
*   **`webp/`**: Compressed lossy and lossless WebP assets optimized for rapid runtime loading.
*   **`favicon/`**: Favicon outputs. **`favicon/favicon.svg` is the ONLY final SVG deliverable in the entire package.**
*   **`app-icons/`**: Desktop launcher icons:
    *   `png/`: PNG icons from `16x16` up to `1024x1024`.
    *   `windows/icon.ico`: Multi-resolution container for Windows builds.
    *   `linux/icon.png`: Launcher logo for Linux desktop systems.
    *   `macos/`: Completing macOS package templates (see [Mac OS Notes](#-macos-packaging-notes)).
*   **`feature-icons/`**: 20 distinct feature area icons matching the OS control panel, formatted in multiple sizes (PNG, WebP).
*   **`social/`**: Banners calibrated for GitHub, X (Twitter), Discord, and documentation covers.
*   **`store/`**: Header and capsule assets formatted for application storefront catalogs.

---

## ⚡ Automation Scripts

The asset pack is fully deterministic. All raster files are derived programmatically from the SVGs in `source/` using `sharp`.

### 1. Regenerate All Assets
To build the assets from scratch (this cleans and overwrites everything except `/source`):
```bash
npm run brand:generate
```
This reads the SVG master files and renders **460+** outputs including dimensions, overlays, transparent, dark, light, monochrome, and accessibility variants.

### 2. Validate Assets
To execute the automated QA validation suite:
```bash
npm run brand:validate
```
The validator checks:
*   File existence and integrity (verifies sizes are non-zero).
*   Dimensions and format signatures.
*   Alpha channel rules (transparent files have alphas; JPEGs do not).
*   Empty-canvas/full transparency errors (protects against blank renders).
*   Manifest SHA256 matches.

### 3. Full Pipeline Build
To run both generation and validation sequentially:
```bash
npm run brand:build
```

---

## 🎨 Asset Usage Guidelines

Choose the appropriate format based on your context:

| Format | Transparency | Best Used For | Notes |
| :--- | :---: | :--- | :--- |
| **PNG** | Yes | Transparent UI elements, application launcher overlays, lockups. | Always keep lossless. |
| **JPG** | No | Marketing cards, banners, static website content. | Quality target set to 92 to avoid compression artifacts in gradients. |
| **WebP** | Yes | In-app splash screens, documentation images, loading assets. | Configured for high-speed loading. |
| **SVG** | Yes | Browser tab icon (`favicon.svg` only). | Scaleable vector format. |

---

## 🎮 Steam Deck Custom Art Setup

For users setting up NEURODECK as a non-Steam shortcut in Steam Deck **Game Mode**:

1.  **Custom Shortcut Icon:** Use `app-icons/linux/icon.png` or `favicon/favicon-256.png`.
2.  **Steam Grid Capsules:**
    *   **Vertical Capsule (300x450):** Use `store/png/neurodeck-store-card.png` (rescaled locally).
    *   **Horizontal Banner (460x215):** Use `store/png/neurodeck-store-header.png`.
    *   **Hero Image (Background):** Use `marketing/png/neurodeck-marketing-hero-main-1920x1080.png`.
3.  **Logo Overlay:** Use `png/wordmark/neurodeck-wordmark-horizontal-transparent-1024x256.png`.

---

## 📦 Electron Packaging Settings

### Windows Configuration
When packaging with `electron-builder`, point the `win` icon build setting to:
```yaml
win:
  icon: assets/brand/app-icons/windows/icon.ico
```
This `.ico` file contains multi-resolution icons (`16px` up to `256px`) packed directly via the Node generator.

### Linux Configuration
Point the desktop launcher desktop entry and package icon settings to:
```yaml
linux:
  icon: assets/brand/app-icons/linux/icon.png
```

### 🍎 macOS Packaging Notes
macOS requires the `.icns` packaging wrapper. Since generating `.icns` natively requires the macOS-exclusive CLI tool `iconutil` (or compiling native C++ compiler bindings), **a pre-compiled `.icns` is not included in the automated build to keep the pipeline cross-platform.**
*   *Manual generation on macOS:* Run `iconutil -c icns icon.iconset` on the generated PNG app icon set.
*   Otherwise, point `electron-builder` to the `assets/brand/app-icons/png/icon-1024.png` and it will automatically attempt to wrap it during a macOS-based build.

---

## ♿ Accessibility & Contrast Compliance

Accessibility is integrated directly into our asset rendering pipeline:
*   **Transparent & Dark Variants:** Rendered using the signature `#5EEBFF` (glowing cyan) and `#7CFFB2` (success green) colors for optimal dark-theme legibility.
*   **Light Background Variants (`-light-bg`):** Programmatically overwritten to render brand glyph/wordmark shapes in high-contrast solid `#0A0D10` (dark gray/black) to maintain readability on `#F3F4F6` backgrounds.
*   **Monochrome White (`mono-white`):** Crisp, flat `#FFFFFF` shapes with filters disabled.
*   **Monochrome Black (`mono-black`):** Crisp, flat `#000000` shapes with filters disabled.
*   **High Contrast & Low Vision:** Configured with clean transparent assets designed to scale gracefully up to `4096px` without raster blur or noise.

---

## ⚖️ Legal & Licensing

*   NEURODECK is a registered trademark of Khaotic Labs. All rights reserved.
*   This asset pack does not include third-party corporate logos (Valve, Steam Deck, Windows, macOS, Linux) to ensure compliance with developer guidelines.
*   Font files such as **Orbitron**, **Inter**, and **JetBrains Mono** are loaded from open-source repositories and subject to their respective SIL Open Font Licenses.
