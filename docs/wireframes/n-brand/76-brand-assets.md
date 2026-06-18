# 76. Brand Assets

**Category:** N — Brand  
**Complexity:** Tier 1  
**Status:** New (`features/developer/BrandAssetsView.tsx`)  
**Shell:** Full App Shell (developer/internal tool)

---

## Purpose

Internal reference for NEURODECK brand assets — logo, colors, typography, and export-ready files for documentation and promotional materials.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Brand Assets                          [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Brand Assets                                                           │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  [LOGO]                                                                 │
│      │  ┌────────────┐  ┌────────────┐  ┌────────────┐                       │
│      │  │ [LOGO SVG] │  │ [LOGO WHT] │  │ [LOGO MONO]│                       │
│      │  │ Full color │  │ White/light│  │ Monochrome │                       │
│      │  │ [↓ SVG]    │  │ [↓ SVG]    │  │ [↓ SVG]    │                       │
│      │  │ [↓ PNG]    │  │ [↓ PNG]    │  │ [↓ PNG]    │                       │
│      │  └────────────┘  └────────────┘  └────────────┘                       │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [BRAND COLORS]                                                         │
│      │                                                                         │
│      │  ■ #5EEBFF  Accent / Cyan    [📋 Copy HEX] [📋 Copy RGB]              │
│      │  ■ #0A0A0F  Background       [📋 Copy HEX]                             │
│      │  ■ #E8E8F0  Text Primary     [📋 Copy HEX]                             │
│      │  ■ #8888A8  Text Secondary   [📋 Copy HEX]                             │
│      │  ■ #2A2A38  Border           [📋 Copy HEX]                             │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [TYPOGRAPHY]                                                           │
│      │  UI Font: Inter (variable) · Body: 14px · Code: JetBrains Mono 13px   │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [BRAND VOICE]                                                          │
│      │  Precise. Tactical. Powerful. No fluff.                                │
│      │  [View BRAND.md →]                                                      │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Download  [B] Back  [X] Copy Color                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ↓ SVG / ↓ PNG (per logo variant)  
**IPC:** `window.neurodeck.system.saveBrandAsset(assetId, format)`  
**Outcome:** Asset saved to `Downloads/`

---

## Secondary Actions

- **📋 Copy HEX** — copies color hex to clipboard; clears after 60s
- **📋 Copy RGB** — copies `rgb(94, 235, 255)` format
- **View BRAND.md →** — opens Help Docs Hub pointing to `BRAND.md`

---

## States

### Assets Missing
- `EmptyState` "Brand assets not found. Ensure `assets/brand/` directory is populated."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `saveBrandAsset(id, format)` |

---

## Accessibility Notes

- Color swatches: `aria-label="[color name]: [hex value]"`; contrast with white text on dark swatch is sufficient for decorative swatches
- Logo thumbnails: `alt="NEURODECK logo — [variant]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/BrandAssetsView.tsx` — **New file**

Brand assets in `assets/brand/`: `logo-full-color.svg`, `logo-white.svg`, `logo-mono.svg`, `logo-*.png` variants. Canonical brand cyan is `#5EEBFF` — this is non-negotiable and documented in `docs/BRAND.md`. Do not change the default accent color.
