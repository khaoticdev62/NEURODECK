# 50. Theme Manager

**Category:** I — Customization  
**Complexity:** Tier 2  
**Status:** Exists (`features/themes/ThemesView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Browse, preview, activate, create, and delete NEURODECK UI themes.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Themes                                [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]                                                               │
│ Rail │  Themes                                               [+ Create Theme]  │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [BUILT-IN THEMES]                                                      │
│      │                                                                         │
│      │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│      │  │ ▓▓▓▓ ░░░░ │  │ ▓▓▓▓ ░░░░ │  │ ▓▓▓▓ ░░░░ │  │ ▓▓▓▓ ░░░░ │       │
│      │  │ Blacksite  │  │ Tact.Glass │  │ Ghost Term │  │ Hologrid   │       │
│      │  │ [✓ Active] │  │  [Apply]   │  │  [Apply]   │  │  [Apply]   │       │
│      │  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
│      │  ┌────────────┐  ┌────────────┐  ┌────────────┐                       │
│      │  │ ▓▓▓▓ ░░░░ │  │ ▓▓▓▓ ░░░░ │  │ ▓▓▓▓ ░░░░ │                       │
│      │  │ Minimal Ops│  │ Night Watch│  │ Broadcast  │                       │
│      │  │  [Apply]   │  │  [Apply]   │  │  [Apply]   │                       │
│      │  └────────────┘  └────────────┘  └────────────┘                       │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [CUSTOM THEMES]                                                        │
│      │  ┌─────────────────────────┐                                           │
│      │  │ My Dark Theme   [Apply] │  [Edit ✎] [Delete 🗑]                    │
│      │  └─────────────────────────┘                                           │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Apply  [B] Back  [X] Preview  [Y] Create             │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Apply  
**IPC:** `window.neurodeck.themes.setTheme(themeId)`  
**Outcome:** Theme CSS variables applied globally; Toast "Theme applied: [name]"

---

## Secondary Actions

- **Preview (hover / [X])** — live preview without applying (reverts on Leave)
- **+ Create Theme** — opens Theme Editor drawer (screen 51) with blank template
- **Edit (✎)** — opens Theme Editor drawer with existing custom theme values
- **Delete (🗑)** — `ConfirmDialog` → `window.neurodeck.themes.deleteCustomTheme(id)`

---

## States

### Loading
- Theme cards show `Skeleton` rectangles

### Applied
- Active theme shows "✓ Active" instead of "Apply" button

### Preview Mode
- Temporary CSS applied; "Previewing…" toast with "Keep" / "Revert" actions

### No Custom Themes
- Custom themes section: `EmptyState` "No custom themes yet. Create one." with "+ Create Theme" action

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.themes` | `list()`, `setTheme(id)`, `previewTheme(id)`, `cancelPreview()`, `deleteCustomTheme(id)` |

---

## Accessibility Notes

- Theme cards: `role="radio"` within `role="radiogroup"` — selecting applies the theme
- Active theme: `aria-checked="true"`
- Preview: `aria-live="polite"` announces "Previewing [theme name]"

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/themes/ThemesView.tsx` (exists)

7 built-in themes are in `THEMES` lazy_static in `lib.rs`. Custom themes persisted in `user_config_dir()/data/themes/`. Theme application sets CSS custom properties on `document.documentElement`.
