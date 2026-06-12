# NEURODECK Theme Engine Overhaul Plan

This document outlines the engineering plan to overhaul the theme engine, moving from basic state swapping to a platform-aware, token-driven runtime.

---

## 1. Goal

Establish a robust, centralized Theme Engine that validates, parses, stores, and injects complete design token sets dynamically. It must adapt to platform display characteristics (LCD vs OLED vs Desktop) and handle accessibility preferences seamlessly.

---

## 2. Technical Milestones

### Phase 1: Shared Registry and Schemas
- Create contract schemas (`themeContracts.ts` and `themeSchemas.ts`) to strictly type-validate themes.
- Create `themePresets.ts` holding 30+ high-fidelity theme specifications (Core, Supreme Premium, Developer, Accessibility groups).
- Create `themeRegistry.ts` which serves as the single source of truth for all built-in and custom imported themes.

### Phase 2: CSS Variable Injection Runtime
- Create `cssVariableInjector.ts` which parses the current active theme, display profile, and accessibility settings.
- Write variables dynamically to the document root element, ensuring instant updates across all views.
- Safely update Tailwind tokens by binding them to CSS custom properties.

### Phase 3: Main-Process Settings & Diagnostics IPC
- Implement `themeSettingsService.ts` in the Electron main process to read/write theme setups inside the app configurations, rather than relying solely on renderer local storage.
- Implement diagnostics and telemetry monitoring for current theme and performance parameters.
- Provide typed IPC channels and preload bindings in `electron/preload.js` so that:
  - `window.neurodeck.theme.get()`
  - `window.neurodeck.theme.set()`
  - `window.neurodeck.theme.list()`
  are exposed securely.
