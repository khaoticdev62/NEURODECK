# 51. Theme Editor

**Category:** I — Customization  
**Complexity:** Tier 2  
**Status:** New — Drawer from Theme Manager  
**Shell:** Drawer (560px) from Theme Manager

---

## Purpose

Create or edit a custom NEURODECK theme by tweaking color tokens and seeing a live preview.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                               │
│  Create Theme                                [Preview Live] [✕]               │
├──────────────────────────────────────────┬─────────────────────────────────────┤
│  [TOKEN EDITOR — left half]              │  [LIVE PREVIEW — right half]        │
│                                          │                                     │
│  Theme Name                              │  ┌─────────────────────────────┐   │
│  [My Custom Theme        ]               │  │ NavRail  │  Panel            │  │
│                                          │  │  icon    │  Chat bubble      │  │
│  Base on:  [Blacksite ▼]                 │  │  icon    │  Accent button    │  │
│                                          │  │  icon    │  Badge           │  │
│  Surface Colors                          │  └─────────────────────────────┘   │
│  Background   [■ #0A0A0F] [Color Picker] │                                     │
│  Surface-1    [■ #111118]                │                                     │
│  Surface-2    [■ #1A1A22]                │                                     │
│                                          │                                     │
│  Text Colors                             │                                     │
│  Primary      [■ #E8E8F0]                │                                     │
│  Secondary    [■ #8888A8]                │                                     │
│  Muted        [■ #4A4A6A]                │                                     │
│                                          │                                     │
│  Accent Color                            │                                     │
│  Primary      [■ #5EEBFF]                │                                     │
│  Glow         [■ #5EEBFF33]              │                                     │
│                                          │                                     │
│  Border                                  │                                     │
│  Default      [■ #2A2A38]                │                                     │
│                                          │                                     │
├──────────────────────────────────────────┴─────────────────────────────────────┤
│  [FOOTER]                                                                      │
│  [Cancel]                              [Reset to Base]  [Save Theme]          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Save Theme  
**IPC:** `window.neurodeck.themes.saveCustomTheme({ name, tokens })`  
**Outcome:** Theme saved; appears in Theme Manager custom section; Toast "Theme saved"

---

## Secondary Actions

- **Preview Live** — applies theme temporarily without saving; "Keep" / "Revert" Toast
- **Reset to Base** — resets all token values to base theme defaults
- **Cancel** — `ConfirmDialog` if changes made: "Discard theme changes?"
- **Color Picker** — native color input (`<input type="color">`) per token

---

## States

### Creating
- Blank form with "Base on" dropdown defaulting to "Blacksite"

### Editing
- Pre-populated with existing custom theme token values

### Preview Active
- "Preview Live" button shows "Previewing…" state
- Footer "Save Theme" pulses to draw attention

### Validation Error
- Empty theme name: inline error "Theme name is required"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.themes` | `getBuiltIn(id)` (for base), `saveCustomTheme(theme)`, `updateCustomTheme(id, theme)` |

---

## Accessibility Notes

- Color inputs: `<label>` + `<input type="color">` with adjacent hex text input `aria-label="[Token name] color hex value"`
- Live preview: `aria-live="polite"` announces "Preview updated" on token change (debounced 500ms)
- Save: disabled when theme name is empty; `aria-disabled="true"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/themes/ThemeEditorDrawer.tsx` — **New file**

Theme tokens map to CSS custom properties: e.g. `--nd-surface-bg`, `--nd-accent-primary`, `--nd-text-primary`. Live preview writes them directly to `document.documentElement.style.setProperty()`. Canonical brand cyan `#5EEBFF` is the default accent; do not change this default.
