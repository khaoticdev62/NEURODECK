# Phase 5 — Design Token Normalization Report

_Audit date: 2026-06-15 | Branch: ui/npm-onboarding-installer_

---

## Token System Health: EXCELLENT

The `--nd-*` CSS custom property system in `frontend/src/design-system/tokens/tokens.css` is comprehensive, well-organized, and consistently consumed via Tailwind's config mapping in `frontend/tailwind.config.js`.

---

## Token Namespaces

Two valid Tailwind namespaces coexist intentionally (documented in `tailwind.config.js:103`):

| Namespace | Example | Scope |
|-----------|---------|-------|
| `nd-*` prefix | `bg-nd-accent-primary`, `border-nd-border-subtle` | Full namespace — always valid |
| Top-level alias | `bg-accent-primary`, `border-border-subtle` | Alias — also valid |

Both namespaces map to the same underlying CSS vars. No inconsistency. Bare forms without prefix (`nd-accent`, `nd-danger`) are the only invalid forms — these were all fixed in a prior sprint.

---

## Hardcoded Hex Value Audit

### Scan results (all `*.tsx` files in `frontend/src/react/`)

| File | Value | Context | Status |
|------|-------|---------|--------|
| `CanvasWallpaperRenderer.tsx:191` | `#00F0FF` | Accent primary fallback | **Fixed → `#5EEBFF`** |
| `CanvasWallpaperRenderer.tsx:192` | `#00FF88` | Success color fallback | Acceptable — no token equivalent needed for canvas 2D |
| `CanvasWallpaperRenderer.tsx:230,232` | `#ffffff` | Canvas 2D star fill/glow | Intentional — canvas API requires raw hex |
| `CanvasWallpaperRenderer.tsx:256` | `#000000` | Canvas 2D background | Intentional — canvas API requires raw hex |
| `CanvasWallpaperRenderer.tsx:648` | `#ffffff` | Canvas 2D nebula render | Intentional |
| `CanvasWallpaperRenderer.tsx:681` | `#9333EA` | Wave animation color | Intentional — canvas animation hardcode |
| `RemoteView.tsx:79` | `#5EEBFF` | CSS var read fallback | Correct brand value — acceptable |
| `RemoteView.tsx:81` | `#0A0D10` | CSS var read fallback | Correct brand value — acceptable |
| `TerminalViewport.tsx:102-104` | `#0A0D10`, `#E8F4FF`, `#5EEBFF` | xterm.js theme config | xterm.js requires raw hex — acceptable |
| `CanvasView.tsx:21` | `#5EEBFF` | Sample HTML content string | User-facing template content, not UI — acceptable |
| `ThemeProvider.test.tsx:198-199` | `#000000` | Test assertion | Test file — expected |

**Total hardcoded values requiring action: 1** (the `#00F0FF` → `#5EEBFF` fix, now applied).

All remaining hardcoded values are either:
- Canvas 2D rendering context (can't use CSS vars)
- CSS custom property fallbacks reading from `getComputedStyle`
- xterm.js theme configuration
- User-facing sample/demo content

---

## Motion Token System

### Definition (canonical source: `tokens.css:186-189`)
```css
--nd-motion-instant: 0ms;
--nd-motion-fast:    90ms;
--nd-motion-normal:  140ms;
--nd-motion-slow:    220ms;
```

### `prefers-reduced-motion` override (`tokens.css:269-271`) ✓
```css
@media (prefers-reduced-motion: reduce) {
  --nd-motion-fast:   0ms;
  --nd-motion-normal: 0ms;
  --nd-motion-slow:   0ms;
}
```

### Tailwind mapping (`tailwind.config.js:147-149`) ✓
```js
fast:   'var(--nd-motion-fast, 90ms)',
normal: 'var(--nd-motion-normal, 140ms)',
slow:   'var(--nd-motion-slow, 220ms)',
```

**Usage in screens**: `transition duration-fast` is the standard across all 45 screens. No screens use raw `duration-100` or `duration-150` for intentional UI transitions — all use token aliases.

**Observation**: `spacing.css` also defines these four motion vars (duplicate definition). Both files use identical values. The duplicate is harmless but `tokens.css` is the canonical source. Low-priority cleanup.

---

## Easing Token Usage

| Token | Value | Tailwind Class |
|-------|-------|---------------|
| `--nd-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | `ease-standard` |
| `--nd-ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | `ease-out` |
| `--nd-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | `ease-in` |

Used consistently. No screens use raw cubic-bezier values inline.

---

## Token Coverage Summary

| Category | Tokens Defined | Usage | Gaps |
|----------|---------------|-------|------|
| Color / Surface | ✓ Complete | ✓ Used via both namespaces | None |
| Color / Text | ✓ Complete | ✓ Consistent | None |
| Color / Accent | ✓ Complete | ✓ Consistent | None |
| Color / State | ✓ Complete | ✓ Consistent | None |
| Color / Border | ✓ Complete | ✓ Consistent | None |
| Spacing / Radius | ✓ Complete | ✓ Used in components | None |
| Motion / Duration | ✓ Complete | ✓ `duration-fast` used everywhere | Duplicate in spacing.css |
| Motion / Easing | ✓ Complete | ✓ Used | None |
| Typography / Font | ✓ Complete | ✓ Used | None |
| Elevation / Shadow | ✓ Complete | ✓ Used | None |
| Glass / Blur | ✓ Complete | ✓ Used | None |

---

## Fix Applied This Phase

| Fix | File | Change |
|-----|------|--------|
| Wrong brand cyan fallback | `CanvasWallpaperRenderer.tsx:191` | `#00F0FF` → `#5EEBFF` (canonical NEURODECK brand cyan) |

---

## Phase 5 Verdict

**Token system is COMPLETE and CONSISTENT.** Only one token correctness issue was found and fixed. All screens consume tokens via Tailwind classes, with hardcoded hex values isolated to contexts where CSS vars cannot be used (canvas 2D, xterm.js, CSS var read fallbacks).

**Status: COMPLETE — one fix applied, no structural changes needed.**
