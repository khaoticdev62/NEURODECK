# NEURODECK Theme System Inventory

This document details the existing state of themes, color systems, and wallpaper rendering logic in the NEURODECK repository.

---

## 1. Existing Theme Files & Color Registries

| Location | Component | Role / Pattern | Status |
|---|---|---|---|
| `src-tauri/src/models.rs` | `Theme` & `THEMES` | Backend static list of themes (`BLACKSITE`, `TERMINAL_GHOST`, `SYNTH_GRID`, `DECK_BLUE`, `AMBER_CRT`, `CYBER_PUNK`, `MATRIX`, `SOLARIZED`, `GLITCH_RED`) | `partially_wired` (Legacy data shape, not fully aligned with modern React tokens) |
| `frontend/src/react/types/seed.ts` | `themes` | Frontend token sets (`Blacksite`, `Tactical Glass`, `Ghost Terminal`, `Hologrid`, `Minimal Ops`, `Night Watch`, `Broadcast`) | `production_ready` (Holds basic color properties) |
| `frontend/src/react/types/neurodeck.ts` | `ThemeTokenSet` | Type signature for frontend themes | `production_ready` |
| `frontend/src/react/App.tsx` | App shell | Injects theme tokens as CSS variables on `#app-shell` | `production_ready` |
| `frontend/src/react/features/themes/ThemesView.tsx` | Themes tab | Renders theme preview cards & dispatches theme selection | `production_ready` |

---

## 2. Existing Wallpaper & Background Logic

| Location | Component | Role / Pattern | Status |
|---|---|---|---|
| `frontend/src/react/features/settings/wallpaperManager.ts` | `WallpaperManager` | Canvas-based rendering loop for live backgrounds (`matrix`, `starfield`, `particles`, `grid`, `radar`, `circuit`, `wave`, `ascii`) and dynamic CSS classes/static images | `production_ready` (Simple procedural drawing, lacks performance tuning/throttling) |
| `frontend/src/react/features/settings/LiveWallpaperPanel.tsx` | Wallpaper tab | Lists live backgrounds (`matrix`, `starfield`, `particles`, `grid`, `radar`, `circuit`, `wave`, `ascii`, `css-nebula`, `css-aurora`) and static wallpapers | `production_ready` |
| `frontend/src/react/App.tsx` | App backgrounds | Mounts background containers (`#app-background-image`, `#app-background-canvas`, `#app-background-css`) | `production_ready` |

---

## 3. Hardcoded Colors & Gradients

The codebase contains several instances of hardcoded styling that bypass the semantic theme tokens:
- **Location**: `frontend/src/react/index.css`
  - Inline hover backgrounds like `hover:bg-white/5`
  - Focus border styles using `border-nd-accent` directly
- **Location**: `frontend/src/react/components/` and `frontend/src/react/features/`
  - Specific components manually override font sizes or use static border opacities (e.g. `border-white/10`)
  - Direct Tailwind utility classes (`bg-slate-900`, `text-cyan-400`) instead of semantic CSS variables (`bg-nd-surface`, `text-nd-accent`)

---

## 4. Theme Persistence & Settings Usage

Theme selection is persisted in a local store via the Electron bridge wrapper (`neurodeckApi.store.get` / `store.set` under key `neurodeck:v6:state`).
Additionally, wallpapers use separate `localStorage` calls under `bgUrl` and `bgOpacity`.

---

## 5. Classification Summary

- **Production Ready**: React theme selector, CSS variable injection, basic theme lists.
- **Partially Wired**: Rust backend theme sync (Rust sidecar has a separate registry of themes that is not fully synchronized with React).
- **Hardcoded Bypass**: Scattered border colors and hover states in app components.
- **Needs Migration**: LocalStorage wallpaper keys must merge into the main state store (`ThemeSettings` contract) to maintain clean unified diagnostics.
