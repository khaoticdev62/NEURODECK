# Browser System Inventory

This document details the current state of NEURODECK's browser integration before the NeuroBrowse Chromium-class overhaul.

## 1. Inventory Analysis

| Component | Location | State | Notes |
|---|---|---|---|
| **Single-View WebContentsView** | `electron/main.js` | `partially_wired` | Employs `WebContentsView` embedded directly in `mainWindow` contentView. Single-instance only. |
| **Preload API Wrapper** | `electron/preload.js` | `partially_wired` | Exposes browser navigation, adblock, bookmarks, history, reader mode under `window.electronAPI`. |
| **Bridge API Translation** | `frontend/src/react/services/bridgeAdapter.ts` | `partially_wired` | Delegates `neurodeckApi.browser.*` calls to `window.electronAPI.*`. |
| **Browser UI View** | `frontend/src/react/features/browser/BrowserView.tsx` | `partially_wired` | Renders address bar, basic bookmark dropdown, history dropdown, downloads dropdown, and single-viewport ref bounds. |
| **Bookmarks Persistence** | `electron/main.js` | `production_ready` | Loads/saves bookmarks from/to `userData/browser-bookmarks.json`. |
| **History System** | `electron/main.js` | `mocked` | In-memory `browserHistory` array that is NOT persisted to disk. |
| **Download System** | `electron/main.js` | `partially_wired` | Hooks `will-download` event and broadcasts events, but lacks folder selector and file sanitization gates. |
| **Permission System** | `electron/main.js` | `mocked` | Hardcoded list allows only notifications, fullscreen, and clipboard-write in `setPermissionRequestHandler`. |
| **Tab Management** | N/A | `dead_code` / `non_existent` | No multi-tab support exists in the current system. |
| **Browser Session Profiles** | N/A | `dead_code` / `non_existent` | Runs strictly on the default session partition; no Private, Research, or Sandbox profiles. |
| **Crash Recovery** | N/A | `dead_code` / `non_existent` | Lacks detection/overlays for WebContents crashes. |
| **Find-in-Page** | `electron/main.js` | `partially_wired` | Basic IPC wiring to `webContents.findInPage` but lacks custom search dialog/hints. |
| **Ad Blocker** | `electron/main.js` | `partially_wired` | Minimal blocklist checking via `onBeforeRequest` session hook. |

## 2. Legacy / Dead Code
- The single global `browserView` variable and its handlers in `electron/main.js` will be deprecated and replaced by a structured class `BrowserViewManager` and `BrowserTabManager`.
- Temporary memory arrays in `electron/main.js` will be removed.

## 3. Mock Data Warnings
- Geolocation, media permissions, and private sessions are currently simulated or blocked with basic fallbacks. The overhaul will introduce a real profile-to-partition mapping and a stateful permission decision registry.
