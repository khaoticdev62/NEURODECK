# NEURODECK — AAAA UI/UX Deep Audit Report
> Date: 2026-05-25 | Auditor: Senior UI/UX + Test Engineer
> Scope: Frontend, E2E, Theming, Native Integration, Rust→Frontend UX

---

## Executive Summary

NEURODECK is a visually ambitious, feature-dense "terminal OS" with standout gamepad navigation and real-time streaming infrastructure. However, a forensic audit across 6 domains reveals **critical gaps** that prevent it from reaching AAAA (enterprise-grade) quality and fidelity.

| Domain | Grade | Blockers |
|--------|-------|----------|
| Frontend Architecture | C+ | React/vanilla mismatch, mutable global state |
| CSS / Design System | C+ | 11,547-line monolith, 1,400+ hardcoded colors |
| Accessibility (a11y) | D+ | Zero live regions, no focus traps, contrast risks |
| E2E Test Coverage | D | Single-file smoke test, no visual/a11y/cross-browser |
| Theming & Native UI | C | Broken Windows icon, shallow theme system, no OS sync |
| Backend→Frontend UX | B- | Unstructured errors, missing progress for agent/plugin ops |

**🔴 P0 Blockers (must fix before AAAA):**
1. `icon.ico` is a 211-byte 16×16 placeholder — Windows builds are broken.
2. `app.css` has `flex-direction: column` on `#view-*` IDs — violates AGENTS.md and causes layout bugs.
3. Zero automated accessibility testing — `aria-live`, focus traps, contrast unchecked.
4. E2E suite is a single 365-line smoke test — ~90% of user journeys untested.
5. Dual cyan colors (`#5EEBFF` vs `#00F0FF`) create visual inconsistency across 11K lines.
6. AGENTS.md claims "React 19" but the app is vanilla JS with 2 tiny React islands — docs/code drift.

---

## Domain 1: Frontend Architecture

### Finding 1.1 — React/Vanilla Mismatch (🔴 P0)
**AGENTS.md** and **package.json** claim a React 19 + Vite SPA. In reality:
- `index.html` bootstraps `main.js` (vanilla JS, 8,874 lines).
- Only **two** React components exist: `VirtualChat.tsx` and `OAuthLogin.tsx`.
- `VirtualChat.tsx` is the sole mounted React component (for chat virtualization).
- `OAuthLogin.tsx` is **dead code** — `main.js` builds the OAuth UI via `innerHTML`.

**Impact:** Misleading docs, no component reusability, state scattered across imperative DOM manipulation.

**Fix:** Update AGENTS.md to reflect reality, or migrate core views to React. **Recommended:** Keep vanilla (it works for gamepad perf) but document honestly.

### Finding 1.2 — Mutable Global State (🟡 P1)
```js
// state.js — 40+ mutable properties
export const state = {
    currentSessionId: "",
    activePersona: "Default",
    isMuted: localStorage.getItem("isMuted") === "true",
    // ... directly mutated by 17K lines of JS
};
```
Zustand (`store.ts`) is a 43-line facade used only by `VirtualChat.tsx`. No reactivity, no normalization, race conditions likely.

**Fix:** Migrate app state to Zustand with reactive selectors, or at minimum wrap `state` in a Proxy with subscriber pattern.

### Finding 1.3 — Duplicate Sanitizers (🟢 P2)
Two HTML sanitizers with slightly different allowlists:
- `window.sanitizeHtml` in `main.js` (lines 115–174)
- `sanitizeRenderedHtml()` in `VirtualChat.tsx` (lines 6–72)

`VirtualChat.tsx` is missing `img` in allowedAttrs handling consistency. Divergence = maintenance risk.

**Fix:** Extract a single `sanitizeHtml()` utility module used by both.

---

## Domain 2: CSS & Design System

### Finding 2.1 — Monolithic CSS (🟡 P1)
`frontend/src/app.css` is **11,547 lines** — one file for 12 views, settings, command palette, radial menu, CRT effects, and every component variant.

**Violations:**
- No CSS modules, no utility-first approach, no component scoping.
- Impossible to tree-shake; dead CSS cannot be identified.
- Extreme specificity conflicts likely.

**Fix:** Split into view-scoped files (`views/chat.css`, `views/canvas.css`, etc.) or adopt a utility-first subset (e.g., lightweight CSS variables + BEM).

### Finding 2.2 — AGENTS.md Violation: `#view-*` Display Rules (🔴 P0)
AGENTS.md states: *"never add `display: flex` or `display: block` to `#view-*` ID rules."*

While no `display: flex` exists on these IDs, **six views** declare `flex-direction: column` on their `#view-*` rule without a matching `display` property in the same block:
- `#view-canvas` (line 3422)
- `#view-terminal` (line 3942)
- `#view-share` (line 4592)
- `#view-agent` (line 5880)
- `#view-memory` (line 6319)
- `#view-docs` (line 11121)

This is technically compliant with the literal rule but functionally broken unless a parent class supplies `display: flex`. If the `.active` toggle system ever changes, these views will collapse.

**Fix:** Move `flex-direction: column` to `.view-content.active` or a dedicated `.view-layout-column` utility class.

### Finding 2.3 — Dual Cyan Crisis (🔴 P0)
```css
:root {
    --accent-color: #5EEBFF;
    --primary-color: #00F0FF;
}
```
Two different cyans used interchangeably across 11,000+ lines. `--primary-color` is barely used in `:root` but appears hundreds of times as hardcoded `rgba(0,240,255,…)`.

**Fix:** Deprecate `--primary-color`, consolidate to `--accent-color`, and replace all hardcoded `rgba(0,240,255,…)` with `color-mix(in srgb, var(--accent-color), transparent X%)` or companion opacity variables.

### Finding 2.4 — Hardcoded Color & Spacing Epidemic (🟡 P1)
| Pattern | Count | Fix |
|---------|-------|-----|
| `rgba(255,255,255,0.xx)` | ~600+ | Tokenize opacity scale `--opacity-10` through `--opacity-90` |
| `rgba(0,240,255,0.xx)` | ~200+ | Replace with `color-mix()` or accent opacity tokens |
| `#04070a`, `#06090c`, `#030508` | ~40+ | Use `var(--bg-color)` with `color-mix()` |
| `14px`, `16px`, `18px`, `20px` | Hundreds | Introduce `--space-1` (4px) scale |
| `border-radius: 999px` | ~25 | Add `--radius-pill` token |

### Finding 2.5 — Motion System (✅ Positive)
The easing and duration token library (`--dur-micro` through `--dur-ambient`, `--ease-snap`, `--ease-out-spring`) is well-designed and consistently applied. **Keep this.**

---

## Domain 3: Accessibility (a11y)

### Finding 3.1 — Zero ARIA Live Regions (🔴 P0)
**No `aria-live` regions exist.**
- Chat streaming: new AI messages appear silently to screen readers.
- Notifications: toasts are injected but never announced.
- Agent progress: autonomous steps are invisible to SR users.
- File transfers, downloads, indexing: all silent.

**Fix:** Add `<div aria-live="polite" aria-atomic="false" id="sr-announcer">` and pipe all dynamic content through it.

### Finding 3.2 — Missing Focus Traps (🟡 P1)
- Settings modal: `getGamepadFocusableElements()` traps for gamepad, but **keyboard `Tab` can escape** to browser chrome.
- Command palette: focus management is manual but not trapped.
- OAuth modal: no focus management detected.

**Fix:** Implement a reusable `FocusTrap` utility using `focus-trap` library or a 50-line vanilla solution with `Tab`/`Shift+Tab` interception on first/last focusable element.

### Finding 3.3 — Broken Heading Hierarchy (🟢 P2)
- Chat welcome uses `<h3>` as the first heading on the page.
- No `<h1>` exists in most views.
- Heading levels skip (`h2` → `h4`) in settings panels.

**Fix:** Audit every view for a single `<h1>` and sequential `h2`–`h6` structure.

### Finding 3.4 — Color Contrast Risk (🟡 P1)
Many text colors use `rgba(255,255,255,0.2–0.4)` on dark backgrounds. These likely fail WCAG AA (4.5:1 for normal text, 3:1 for large text).

**Fix:** Run `axe-core` or manual contrast checks. Minimum opacity for white on `#0A0D10` should be ~0.55 for AA compliance.

### Finding 3.5 — Keyboard Shortcuts Discoverability (🟢 P2)
Shortcuts (`Ctrl+K`, `Ctrl+M`, `Ctrl+Shift+M`) are documented only in `title` attributes. No in-app cheat sheet or help modal.

**Fix:** Add a `?` key shortcut that opens a keyboard shortcuts overlay (like VS Code or Discord).

### Finding 3.6 — prefers-reduced-motion (✅ Positive)
`@media (prefers-reduced-motion: reduce)` is present (line 11103) and nullifies animations globally. **Keep this.**

---

## Domain 4: E2E Test Coverage

### Finding 4.1 — Single-File Smoke Test (🔴 P0)
Only one spec file exists: `e2e/tests/settings-shell.spec.ts` (365 lines, 15 tests).

**Claimed coverage vs. reality:**
| Claim | Reality |
|-------|---------|
| "All 12 primary nav tabs" | ✅ Looped through; only asserts `.active` class |
| "Settings shell, themed tab switching" | ✅ Opens 3 of 9 settings tabs |
| "Command palette" | ✅ Opens, searches, drives nav |
| "Viewport overflow on compact widths" | ⚠️ Only 2 views checked at 900×700 |
| "Centered layout on wide screens" | ✅ 5 tabs checked at 1440×900 (±2px) |
| "Canvas toolbar wrapping" | ✅ scrollWidth check |
| "Notification center" | ⚠️ Opens only; no dismiss/action handling |
| "Prompt picker/history chrome" | ⚠️ History overlay force-shown via `evaluate()` |

### Finding 4.2 — Zero Functional Flow Tests (🔴 P0)
The following **critical user journeys have NO E2E coverage:**
- Chat send/receive (no mocked SSE stream)
- Terminal PTY spawn/type
- Canvas code run/preview
- SSH connection form
- File transfer send/receive
- Browser navigation
- Agent loop / approval modal
- Memory document upload/search
- Plugin marketplace install/enable
- Theme application/switching
- Onboarding first-run flow
- Boot sequence / splash screen
- Gamepad navigation simulation

### Finding 4.3 — No Visual Regression (🔴 P0)
- No `toHaveScreenshot()` assertions.
- No `snapshotPathTemplate` in config.
- UI regressions (CSS changes, modal condensation fixes) are invisible to CI.

### Finding 4.4 — No Accessibility Testing (🔴 P0)
- No `axe-core` / `@axe-core/playwright` integration.
- No keyboard navigation validation beyond Escape and Ctrl+K.
- No screen reader flow tests.
- No color contrast validation.

### Finding 4.5 — No Cross-Browser / Device Testing (🔴 P0)
- Playwright config has **no `projects` array** → Chromium only.
- No Firefox, WebKit, or Edge projects.
- No Steam Deck device profile (`1280×800`, `hasTouch: true`).
- No mobile/tablet viewports.

### Finding 4.6 — Brittle Test Patterns (🟡 P1)
- Relies on `#id` and `.class` selectors instead of `data-testid`.
- Hardcoded `page.waitForTimeout(350)` — flakiness risk.
- `.catch(() => {})` swallowing errors.
- Manual `classList.remove("hidden")` to reveal overlays — bypasses real UX.

---

## Domain 5: Theming & Native Integration

### Finding 5.1 — Broken Windows Icon (🔴 P0)
`src-tauri/icons/icon.ico` is **211 bytes** — a single 16×16 PNG. A proper Windows `.ico` needs 16×16, 32×32, 48×48, and 256×256 variants.

**Fix:** Regenerate from `icon.png` (512×512) using a proper ICO generator (e.g., ImageMagick or `@tauri-apps/cli icon`).

### Finding 5.2 — Shallow Theme System (🔴 P0)
- Rust defines 9 themes with 8 fields each (`name`, `color`, `pulse[10]`, `background`, `foreground`, `accent`, `response`, `warning`, `error`).
- Frontend only receives **6 colors** via `set_theme`. `color`, `pulse`, and `name` are **never exposed**.
- `ThemeConfig` in `config.rs` is loaded but **never consumed** by the UI.
- `themes/` directory is **empty**.
- Custom theme save/load is raw JSON with **zero validation**.

**Fix:** Expose full theme struct to frontend. Wire `ThemeConfig` into `applyThemeColors()`. Add JSON schema validation for custom themes.

### Finding 5.3 — Hardcoded Splash & Boot Overlay (🟡 P1)
- Splash screen (`splash.css`, `splash.js`) is hardcoded to Matrix green (`#00ff41`). No theming hook.
- DOM boot overlay (`#boot-overlay`) uses hardcoded gradients and colors.
- Dual boot screens (Tauri splash + DOM overlay) add perceptible load time.

**Fix:** Make splash CSS read `:root` variables set before splash render, or simplify to a single themed overlay.

### Finding 5.4 — No OS Integration (🟡 P1)
- **No system tray** — `SystemTray` unused.
- **No native menu** — `Menu` unused.
- **No `prefers-color-scheme` sync** — app ignores OS dark/light mode.
- **No borderless/kiosk mode** — for a "fullscreen OS" on Steam Deck, the app launches windowed with default OS title bar.

**Fix:** Add `decorations: false` + custom title bar for kiosk mode. Add `prefers-color-scheme` listener that maps to nearest built-in theme.

### Finding 5.5 — Remote Control UI Unthemed (🟢 P2)
`remote_control.rs` embeds hardcoded CSS (`--a: #00f0ff`, `--bg: #06080e`) that never adapts to the user's NEURODECK theme.

---

## Domain 6: Backend → Frontend UX

### Finding 6.1 — Unstructured Errors (🟡 P1)
Every Tauri command returns `Result<T, String>`. No error codes, no `is_retryable`, no `suggested_action`.

**Impact:** Frontend cannot show contextual help, retry buttons, or localized messages.

**Fix:** Introduce `AppError { code: String, message: String, recoverable: bool, suggestion: Option<String> }` and migrate critical commands.

### Finding 6.2 — Missing Progress for Agent/Plugin Ops (🟡 P1)
| Operation | Progress Event? |
|-----------|-----------------|
| Agent step LLM call | ❌ No — 5–15s of silence |
| Plugin reload | ❌ No — can hang for seconds |
| BMAD install | ❌ No — synchronous file copy |
| OAuth token poll | ❌ No — blocking poll |

**Fix:** Emit `agent_thinking`, `plugin_reload_start`/`_done`, `bmad_install_progress`, `oauth_polling` events.

### Finding 6.3 — Silent Event Emission Failures (🟢 P2)
Backend uses `let _ = app_handle.emit(...)` everywhere — event delivery errors are silently discarded.

**Fix:** Replace with `if let Err(e) = app_handle.emit(...) { tracing::warn!(...) }`.

### Finding 6.4 — No Native Dialogs (🟡 P1 / ✅ Intentional?)
No `tauri::api::dialog` usage. Destructive actions (delete session, uninstall plugin) have no OS-level confirmation. For Steam Deck immersion this may be intentional, but the frontend should show custom confirmation modals.

---

## Domain 7: Gamepad Navigation

### Finding 7.1 — Hardcoded Button Indices (🟡 P1)
```js
buttons[0] = A, buttons[1] = B, buttons[6] = L2, // etc.
```
No abstraction layer. Different gamepad mappings (Xbox vs. DualShock vs. Steam Controller) will break.

**Fix:** Use the `standard` gamepad mapping check, or implement a calibration/wizard on first connect.

### Finding 7.2 — No Disconnection UX (🟢 P2)
`gamepadconnected` logs to console. No user-facing "Controller disconnected" banner.

### Finding 7.3 — Radial Menu XSS Surface (🟢 P2)
Radial menu SVG paths are built via string concatenation. If `RADIAL_SEGMENTS` ever becomes dynamic, this is an injection vector.

**Fix:** Use `document.createElementNS("http://www.w3.org/2000/svg", "path")` with `setAttribute("d", ...)` instead of `innerHTML` concatenation.

---

## Positive Highlights (Do Not Regress)

1. **Gamepad navigation** — radial menu, touchpad cursor, grip buttons, virtual keyboard. Industry-leading for a web-based terminal app.
2. **Motion design tokens** — `--dur-*` and `--ease-*` are well-architected and consistently used.
3. **Custom SVG icon system** — clean, performant, no external font dependencies.
4. **Self-healing boot diagnostics** — `self_heal.rs` is a genuinely excellent UX feature.
5. **Real-time streaming events** — chat, PTY, canvas, file transfers all have granular progress events.
6. **Sanitization** — applied before all HTML injection (though duplicated).
7. **Plugin sandboxing** — file name sanitization, HTTPS enforcement, GitHub-only URLs, 512KB size limit.
8. **Settings modal per-panel accent colors** — sophisticated CSS custom property usage.

---

## AAAA Remediation Roadmap

### Phase 1: Blockers (Week 1)
| # | Task | Owner | Files |
|---|------|-------|-------|
| 1 | Fix `icon.ico` — generate proper multi-resolution ICO from `icon.png` | DevOps | `src-tauri/icons/` |
| 2 | Remove `flex-direction: column` from `#view-*` IDs | Frontend | `frontend/src/app.css` |
| 3 | Consolidate dual cyan to single `--accent-color`; replace hardcoded `rgba(0,240,255,…)` | Frontend | `frontend/src/app.css`, `main.js` |
| 4 | Add `aria-live="polite"` announcer div + pipe chat/toast/agent events through it | Frontend | `main.js`, `chat.js`, `notifications.js` |
| 5 | Split E2E monolith; add `chat.spec.ts` with mocked SSE stream | QA | `e2e/tests/` |
| 6 | Add `@axe-core/playwright` to E2E; run on every view | QA | `e2e/tests/`, `playwright.config.ts` |
| 7 | Update AGENTS.md to reflect vanilla-JS reality (or begin React migration) | Docs | `AGENTS.md` |

### Phase 2: Quality (Weeks 2–3)
| # | Task | Owner | Files |
|---|------|-------|-------|
| 8 | Introduce Page Object Model + `data-testid` selectors | QA | `e2e/pages/`, `e2e/tests/` |
| 9 | Add visual regression (`toHaveScreenshot`) for each view at 1280×800 | QA | `e2e/tests/`, CI |
| 10 | Add Playwright `projects`: Chromium, Firefox, Steam Deck device | QA | `playwright.config.ts` |
| 11 | Implement `FocusTrap` for settings, command palette, OAuth modal | Frontend | `main.js`, new `focus-trap.js` |
| 12 | Add keyboard shortcuts cheat sheet (`?` key) | Frontend | `main.js`, `app.css` |
| 13 | Tokenize spacing scale (`--space-1` through `--space-12`) | Frontend | `app.css` |
| 14 | Expose full Rust `Theme` struct (including `pulse`) to frontend | Backend | `commands/config.rs`, `lib.rs` |
| 15 | Wire `ThemeConfig` into `applyThemeColors()` | Backend | `config.rs`, `commands/config.rs` |

### Phase 3: Completeness (Weeks 4–6)
| # | Task | Owner | Files |
|---|------|-------|-------|
| 16 | Cover all 9 Settings tabs in E2E | QA | `e2e/tests/settings-*.spec.ts` |
| 17 | Add functional tests: terminal, canvas, SSH, browser, agent, memory | QA | `e2e/tests/` |
| 18 | Add gamepad navigation simulation via Gamepad API mock | QA | `e2e/tests/` |
| 19 | Add structured error type (`AppError`) for critical commands | Backend | `core/src/` or `src-tauri/src/` |
| 20 | Emit progress events for agent step, plugin reload, BMAD install | Backend | `commands/agent.rs`, `plugin_mgr.rs` |
| 21 | Add `prefers-color-scheme` listener + borderless kiosk mode | Backend | `tauri.conf.json`, `lib.rs` |
| 22 | Theme the splash screen and boot overlay | Frontend | `splash.css`, `main.js` |
| 23 | Add system tray with "Show / Hide / Quit" menu (optional for Deck) | Backend | `lib.rs` |
| 24 | Audit + fix heading hierarchy across all 12 views | Frontend | `main.js`, `app.css` |

---

## Appendix: Quick-Win CSS Fixes

```css
/* 1. Replace #view-* flex-direction with class utility */
.view-layout-column {
    display: flex;
    flex-direction: column;
}

/* 2. Consolidate cyan usage */
:root {
    --accent-color: #5EEBFF;
    --accent-rgb: 94, 235, 255;
    /* Remove --primary-color entirely */
}

/* 3. Add opacity tokens */
:root {
    --opacity-5: 0.05;
    --opacity-10: 0.10;
    --opacity-20: 0.20;
    --opacity-30: 0.30;
    --opacity-40: 0.40;
    --opacity-50: 0.50;
    --opacity-60: 0.60;
    --opacity-70: 0.70;
    --opacity-80: 0.80;
    --opacity-90: 0.90;
    --opacity-100: 1.0;
}

/* 4. Add spacing tokens */
:root {
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;
}
```

---

*End of Report*
