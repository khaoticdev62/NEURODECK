# Epic: First-Time User Onboarding Wizard

## Objective
Provide a seamless, immersive, and "hacker-aesthetic" onboarding experience for first-time users of NEURODECK. The wizard guides the user through critical configuration steps (API keys, preferences, and persona selection) across 11 interactive slides.

## Background
NEURODECK relies on API keys (Gemini) and local PTY integrations. Without these configured, the application is non-functional. The onboarding wizard is a fullscreen modal overlay (`#onboarding-overlay`) that blocks the main workspace until completed or skipped.

## Current Implementation Status

The onboarding wizard is **fully implemented** in `frontend/src/main.js` (~1,400 lines). It includes:

| Slide | Content | Status |
|-------|---------|--------|
| 1 | Welcome — typing animation, feature tags, stat counters | ✅ |
| 2 | Feature Tour — 12 feature cards with icons | ✅ |
| 3 | Provider Auth — Gemini key, OAuth QR, Kimi, Ollama | ✅ |
| 4 | Persona & Theme — dynamically loaded from backend | ✅ |
| 5 | Controller Guide — Steam Deck button map | ✅ |
| 6 | Touch Controls — tap, swipe, radial menu | ✅ |
| 7 | Voice I/O — mic test, TTS test | ✅ |
| 8 | Trust & Privacy — security features overview | ✅ |
| 9 | Sandboxing — workspace boundaries, execution pauses | ✅ |
| 10 | Power User Toolkit — advanced features list | ✅ |
| 11 | System Diagnostics — 6-check diagnostic run | ✅ |

## Completed Work

### Story 1: Fix Electron-Mode Ollama Pull Listener ✅
- Replaced `window.__TAURI_INTERNALS__?.event?.listen` with imported `listen()` from `neurobridge.js`
- Verified no remaining `__TAURI_INTERNALS__` references in onboarding code
- Fallow gates: clean

### Story 2: Add Onboarding E2E Test Coverage ✅
- Created `e2e/tests/onboarding.spec.ts` with 7 test cases across 3 browser profiles
- Tests cover: first-run detection, welcome slide, feature tour, provider verification, persona/theme selection, diagnostics completion, localStorage flag
- All 21 test variants pass (7 tests × 3 browsers)

### Story 3: Keyboard Navigation Audit & Fix ✅
- Added `FocusTrap` to onboarding modal for tab cycling containment
- Added `Escape` key handler to go back one step
- Added `focusFirstInSlide()` to move focus to new slide's first interactive element
- Added ArrowLeft/ArrowRight keyboard navigation for persona carousel and theme grid
- Fixed critical bug: onboarding diagnostic IDs (`diag-*`) collided with context drawer IDs, causing `runDiagnostics()` to update the wrong DOM elements. Renamed to `ob-diag-*`.

### Story 4: Update Epic Documentation ✅
- Epic updated to reflect actual 11-slide implementation
- Technical tasks documented for vanilla JS stack
- Bug findings and fixes documented

## Bug Fixes Found During Implementation

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Onboarding diagnostics showed "PENDING" forever | Duplicate HTML IDs: `diag-pty` etc. existed in both context drawer and onboarding slide. `document.getElementById` returned the first (wrong) element. | Renamed onboarding IDs to `ob-diag-*` |
| Ollama pull broke in Electron mode | Used Tauri-only `window.__TAURI_INTERNALS__` instead of cross-platform `listen()` | Replaced with `listen("ollama_pull_progress", ...)` |

## Technical Reference

### Entry Points
- `checkOnboarding()` — called after boot screen, checks key + localStorage
- `showOnboardingWizard()` — creates and mounts the 11-slide modal
- `run_onboarding_diagnostics()` — Rust command, 6 system checks

### State Persistence
- `localStorage.getItem("neurodeck_onboarding_complete")` — dismissal flag
- `localStorage.getItem("selectedTheme")` — theme preference

### Key Commands Used
- `get_gemini_api_key` — check if key exists
- `test_llm_connection` — verify provider connectivity
- `save_gemini_api_key` / `save_kimi_api_key` — store to keychain
- `set_config` — save provider defaults
- `start_oauth_flow` / `poll_oauth_token` — OAuth device flow
- `get_personas` / `set_persona` — persona list and selection
- `get_themes` / `set_theme` — theme list and live preview
- `run_onboarding_diagnostics` — system health check
- `start_recording` / `stop_recording` — mic test
- `speak_text` — TTS test
