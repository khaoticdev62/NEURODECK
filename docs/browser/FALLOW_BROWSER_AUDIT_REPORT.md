# Fallow Browser Audit Report

This report identifies dead code, unused dependencies, or complexity hotspots within the browser feature set.

## 1. Dead Code Audit
- The old `ensureBrowserView` and `browserView` variable in `electron/main.js` will be marked as deprecated/removed once the class-based managers are active.
- Unused icons inside `BrowserView.tsx` will be cleaned up.

## 2. Complexity Analysis
- `BrowserView.tsx` has ~472 lines. To reduce cognitive load, the overhaul will break it down into clean subcomponents:
  - `BrowserToolbar.tsx`
  - `BrowserAddressBar.tsx`
  - `BrowserTabStrip.tsx`
  - `BrowserViewportHost.tsx`
  - `BrowserDownloadShelf.tsx`

## 3. Boundary Crossings
- All renderer interactions must pass through the typed preload API `window.neurodeck.browser`.
- Directly referencing main process structures (like `app` or `BrowserWindow`) from the frontend is blocked by context isolation.
