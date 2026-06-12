# NEURODECK No Mock Theme Data Audit

This document defines the validation strategy to ensure that no placeholder, mock, or fake theme data exists in the production builds of NEURODECK.

---

## 1. Scope of the Audit

The audit scans the following areas of the codebase to guarantee that all theme operations are backed by real, production-ready assets and configurations:
1. **Theme Registry**: Ensure every theme has a fully defined token set. No "TODO" or placeholder values (like `#FF0000` or `#FFFFFF` everywhere).
2. **Wallpaper Assets**: Ensure every live wallpaper is backed by a real Canvas, CSS, or WebGL renderer. No "mock wallpaper" that is a static card without actual animation code.
3. **UI Previews**: Ensure that theme previews render dynamically using the theme's actual colors. No hardcoded screenshots or mock palette swatches.
4. **Health & Diagnostics**: Ensure that connections and performance telemetry reports are real. No fake FPS counters or pre-baked CPU reports.

---

## 2. Automated Enforcement Script

The verification script `scripts/verify-no-mock-theme-data.ts` will search for:
- Production code referencing `mockTheme`, `fakeTheme`, `demoTheme`, `placeholderTheme`, `mockWallpaper`, or `TODO`.
- Unused or dummy hex colors.
- Hardcoded gradients that bypass the theme registry.

If any matching patterns are found in production directories (`src/`, `frontend/src/react/`), the verification script will print a failure report and exit with code `1`.
Exceptions are allowed only in test suites (`tests/`) and mock folders reserved for E2E setups.
