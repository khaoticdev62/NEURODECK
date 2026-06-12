# NEURODECK Theme Migration Plan

This document outlines the step-by-step migration path from the legacy theme system to the new supreme theme engine.

---

## 1. Steps to Migrate the Codebase

### Step 1: Replace Types & Contracts
- Update `ThemeTokenSet` in [neurodeck.ts](file:///c:/Users/thecr/Desktop/S-Term/frontend/src/react/types/neurodeck.ts) to match the new token architecture (supporting surface, text, accent, state, border, motion, radius, spacing, glass, and wallpaper sets).
- Create [themeContracts.ts](file:///c:/Users/thecr/Desktop/S-Term/src/shared/theme/themeContracts.ts) to share Typescript models.

### Step 2: Build the New Theme presets
- Implement `themePresets.ts` containing the full token configurations for all 30+ supreme themes.
- Replace the simple array of 7 themes in `seed.ts` with the new presets.

### Step 3: Implement Theme Runtime & Injection
- Create `ThemeProvider.tsx` and `useTheme.ts` to manage state.
- Create `cssVariableInjector.ts` to push CSS Custom Properties into `:root` or `#app-shell`.

### Step 4: Refactor App.tsx & Components
- Replace the legacy CSS variable injection in [App.tsx](file:///c:/Users/thecr/Desktop/S-Term/frontend/src/react/App.tsx) with the new `ThemeProvider` and runtime injector.
- Audit all views (`ThemesView.tsx`, `SettingsView.tsx`, etc.) and widgets to consume the new design tokens.

### Step 5: Overhaul the Live Wallpaper Engine
- Migrate [wallpaperManager.ts](file:///c:/Users/thecr/Desktop/S-Term/frontend/src/react/features/settings/wallpaperManager.ts) into the new Live Wallpaper Engine.
- Integrate pause, visibility tracking, performance throttling, and reduced-motion fallbacks.

---

## 2. Backward Compatibility
- Retain support for legacy theme name lookups to prevent user settings corruption during load.
- Ensure that if `localStorage` holds an old background name, it resolves safely to the new static or live wallpaper registries.
