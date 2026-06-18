# Phase 7 — Responsive + Steam Deck Viewport Audit

_Audit date: 2026-06-15 | Branch: ui/npm-onboarding-installer | Primary target: 1280×800 (Steam Deck LCD)_

---

## Tailwind Breakpoint Reference for NEURODECK

| Prefix | min-width | Viewport |
|--------|-----------|---------|
| `sm:` | 640px | Large mobile landscape |
| `md:` | 768px | Tablet portrait |
| `lg:` | 1024px | Tablet landscape / small laptop |
| `xl:` | 1280px | **Steam Deck LCD exact width** |
| `2xl:` | 1536px | Full desktop |

`xl:` activates at exactly 1280px — the Steam Deck LCD's native horizontal resolution. This is the critical breakpoint for this app.

---

## Steam Deck 1280×800 Layout Analysis

### Global container
All views render inside a `position: absolute; top: 0; left: 0; width: 100%; height: 100%` flex column with `overflow: hidden`. Views scroll internally. No page-level horizontal scroll is possible by design.

### Two-column layouts (`xl:grid-cols-[...]`)
These activate at exactly 1280px. All were verified to fit within 1280px of available width:

| View | Layout | Left | Right | Middle | Status |
|------|---------|------|-------|--------|--------|
| SessionsView | `xl:grid-cols-[360px_1fr]` | 360px | — | flex | ✓ |
| ExecutionView | `xl:grid-cols-[1fr_380px]` | flex | 380px | — | ✓ |
| MaintenanceView | `xl:grid-cols-[1fr_380px]` | flex | 380px | — | ✓ |
| RecoveryView | `xl:grid-cols-[1fr_380px]` | flex | 380px | — | ✓ |
| ModelsView | `xl:grid-cols-[1fr_360px]` | flex | 360px | — | ✓ |
| ExportsView | `xl:grid-cols-[1fr_360px]` | flex | 360px | — | ✓ |
| SecurityView | `xl:grid-cols-[1fr_400px]` | flex | 400px | — | ✓ |
| ProjectView | `xl:grid-cols-[1fr_380px]` | flex | 380px | — | ✓ |
| SettingsView | `xl:grid-cols-[220px_1fr]` | 220px | flex | — | ✓ |

### Three-column layouts
| View | Layout | Note |
|------|---------|------|
| OrchestratorView | `xl:grid-cols-[220px_1fr_320px]` | 220+320+32px gaps = 572px fixed; middle = ~708px. ✓ |
| DiagnosticsView | `xl:grid-cols-[340px_1fr_400px]` | 340+400+32px gaps = 772px fixed; middle = ~508px. Tight but scroll-internal. ✓ |
| BrowserVpnPanel | `xl:grid-cols-[260px_1fr_320px]` | 260+320+32px = 612px fixed; middle = ~668px. ✓ |

All three-column layouts fit within 1280px with adequate middle-column space.

---

## Responsive Fallback Coverage (Mobile/Tablet)

### Screens with full responsive fallback
Most screens use `xl:grid-cols-*` which means at `< 1280px` they collapse to a single stacked column. This is correct behavior for the handful of use cases on smaller viewports.

| Screen | < 1280px behavior | Acceptable? |
|--------|-------------------|-------------|
| Most two-column views | Single stacked column | ✓ Yes |
| SettingsView | Single stacked column + sidebar collapses | ✓ Yes |
| ThemesView | Single column, `sm/lg/xl` card grid breakpoints | ✓ Yes |
| FontManagerView | Responsive card grid `1 → 2 → 3 → 4 cols` | ✓ Yes |
| AgentsView | 2 cols at `md:`, 3 at `2xl:` | ✓ Yes |

### PromptLabView — Known mobile gap (LOW priority)
`grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]` has no responsive prefix — always 2 columns. At < 768px, both columns would be squished to ~180px due to the `360px` minimum on the right column, causing overflow.

**Assessment**: PromptLabView is a desktop-focused LLM prompt engineering tool. The primary viewport is 1280×800 (Steam Deck). Mobile use is not a design requirement per `CLAUDE.md` ("all new views must fit within 1280×800"). **LOW priority — document only, no fix required.**

---

## Overflow and Scroll Safety

All production views were checked for horizontal scroll risk:

- `overflow-hidden` on view root: ✓ All views
- `overflow-y-auto` / `scrollbar-thin` on scroll containers: ✓ All views
- `min-h-0` on flex children to prevent scroll bypass: ✓ All views
- No `min-width` values exceeding 1280px in layout containers: ✓ Confirmed

The only `max-w-[...]` pixel constraints found are content-level (text truncation, tooltip widths, sidebar max-width) — none are layout-breaking.

---

## Touch Target Sizes

| Component | Min touch target | Status |
|-----------|-----------------|--------|
| Button `size="xs"` | ~28px height | Acceptable for controller/desktop use |
| Button `size="sm"` | ~36px height | ✓ |
| Button `size="md"` | ~40px height | ✓ |
| IconButton `size="sm"` | 32×32px | ✓ |
| IconButton `size="md"` | 40×40px | ✓ |
| Toggle | 40px height row | ✓ |
| Tab (TerminalScreen) | `min-h-[40px]` | ✓ |

Steam Deck controller navigation uses focus-based selection rather than touch. `size="xs"` buttons are only used for dense chip filters where controller users navigate with D-pad. Acceptable.

---

## Modal Sizing at 800px Height

All Modal usages confirmed to use DSModal which constrains height via `max-h-[calc(100vh-4rem)]`. At 800px viewport height: `max-h = 736px`. All modal contents use scroll containers internally. No overflow risk.

---

## Steam Deck LCD-Specific Checks

| Check | Status |
|-------|--------|
| All views fit `1280×800` | ✓ Confirmed (CLAUDE.md requirement) |
| DeckButtonHint present in high-use views | ✓ TerminalView, PromptLabView |
| SettingsView Deck Mode toggle | ✓ Present in General + Input panels |
| ThemesView `steamdeck_lcd` display profile | ✓ First option in Display Profile |
| `steamDeck.oledTuned` badge on OLED-optimized themes | ✓ ThemesView |
| Font scale range 75%–130% | ✓ Appearance settings |
| Compact mode toggle | ✓ General settings |
| Controller support toggle | ✓ Input settings |

---

## Phase 7 Verdict

**Steam Deck 1280×800 compatibility: EXCELLENT.**

All layouts verified to activate correctly at `xl:` (1280px breakpoint = Steam Deck LCD). No horizontal scroll, no min-width violations, no overflow risks. Three-column layouts verified to fit within 1280px with adequate middle-column space.

**One low-priority observation**: PromptLabView lacks mobile responsive breakpoints, but mobile is not a design target for this app.

**Status: COMPLETE — no code changes required.**
