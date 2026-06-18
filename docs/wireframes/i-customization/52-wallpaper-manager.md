# 52. Wallpaper Manager

**Category:** I — Customization  
**Complexity:** Tier 1  
**Status:** Partial (`features/settings/wallpaperManager.ts` + ThemesView section)  
**Shell:** Drawer (480px) from Settings or Theme Manager

---

## Purpose

Select, upload, or remove the fullscreen background wallpaper for NEURODECK's shell.

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                 │
│  Wallpaper                              [✕]      │
├──────────────────────────────────────────────────┤
│  [CURRENT WALLPAPER]                             │
│  ┌────────────────────────────────────────────┐  │
│  │  [thumbnail of current wallpaper / None]   │  │
│  │  "Blacksite Deep Space" · Built-in         │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [BUILT-IN WALLPAPERS]                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  [A] │ │  [B] │ │  [C] │ │  [D] │           │
│  │ Deep │ │Cyber │ │Holo  │ │Static│           │
│  │Space │ │City  │ │Grid  │ │Noise │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [CUSTOM]                                        │
│  [+ Upload Image]                [Remove ×]     │
│  Formats: JPG, PNG, WebP · Max 20MB             │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [OPTIONS]                                       │
│  Opacity       [██████████░░]  70%               │
│  Fit           [Cover ▼]                         │
│  Animate?      [☐] Enable animation             │
│  Reduced motion [☑] Disable when requested      │
│                                                  │
├──────────────────────────────────────────────────┤
│  [FOOTER]                                        │
│  [Remove Wallpaper]              [Apply]         │
└──────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Apply  
**IPC:** `window.neurodeck.themes.setWallpaper({ id?, customPath?, opacity, fit, animate })`  
**Outcome:** Wallpaper CSS updated; Toast "Wallpaper applied"

---

## Secondary Actions

- **Thumbnail click** — sets selected wallpaper (highlighted with checkmark); requires Apply to confirm
- **+ Upload Image** — file picker → `window.neurodeck.themes.uploadWallpaper(file)`
- **Remove Wallpaper** — `window.neurodeck.themes.clearWallpaper()` → shell background returns to theme color
- **Remove × (custom)** — deletes uploaded custom wallpaper file

---

## States

### No Wallpaper
- Current preview: empty "None" placeholder
- "Remove Wallpaper" button disabled

### Custom Wallpaper
- Thumbnail shown from local file path

### Uploading
- Upload button shows progress bar

### "Animate?" with reduced-motion enabled
- "Disable when requested" checkbox controls `prefers-reduced-motion` behavior; wallpaper animations must respect this

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.themes` | `getWallpaper()`, `setWallpaper(opts)`, `uploadWallpaper(file)`, `clearWallpaper()`, `listBuiltInWallpapers()` |

---

## Accessibility Notes

- Wallpaper thumbnails: `role="radio"` within `role="radiogroup"` + `aria-label="[wallpaper name]"`
- Opacity slider: `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`
- Animate + Reduced Motion options: `<label>` + `<input type="checkbox">`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/settings/WallpaperManagerDrawer.tsx` — **New file** (extract from ThemesView / SettingsView)

Wallpaper applied via CSS `background-image` on `.app-shell-root`. Opacity uses `::after` pseudo-element with `opacity` so content is not affected. Animated wallpapers use `background-position` animation — guard with `@media (prefers-reduced-motion: reduce)` when "Disable when requested" is enabled.
