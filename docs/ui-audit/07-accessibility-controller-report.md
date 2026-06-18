# Phase 8 — Accessibility + Controller UX Report

_Audit date: 2026-06-15 | Branch: ui/npm-onboarding-installer_

---

## Summary

Accessibility posture across all 45 views is **STRONG**. All critical WCAG 2.1 AA requirements are met. The app has consistent ARIA patterns, keyboard navigation, focus management, reduced-motion support, and Steam Deck controller hints throughout. No P0 or P1 issues found. Two minor P3 observations documented below.

---

## Skip Link Coverage

| Check | Status |
|-------|--------|
| Skip link `href="#main-content"` in App.tsx | ✓ Line 1000 |
| Skip link `href="#main-content"` in NeurodeckShell.tsx | ✓ Line 130 |
| `id="main-content"` target in App.tsx | ✓ Line 1077 |
| `id="main-content"` target in NeurodeckShell.tsx | ✓ Line 144 |

Skip links are present and properly wired. Keyboard users can bypass navigation to jump directly to main content.

---

## Focus Management

| Pattern | Status | Details |
|---------|--------|---------|
| Modal focus trap | ✓ CLEAN | All Modal usages delegate to DSModal + FocusTrapContainer |
| Focus restored on modal close | ✓ CLEAN | FocusTrapContainer `onDeactivate` restores focus to trigger |
| RadialCommandWheel focus | ✓ CLEAN | `wheelRef.current?.focus()` called on open |
| Escape to close all dialogs | ✓ CLEAN | All modal/dialog/wheel components handle Escape |
| Focus visible rings | ✓ CLEAN | `focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60` applied in 108 instances across 42 files |
| `outline-none` used safely | ✓ CLEAN | Only paired with explicit `focus-visible:ring-*` override — never removes focus without replacement |

---

## ARIA Live Regions

`aria-live` is correctly implemented across 19+ instances:

| Location | Pattern | Trigger |
|----------|---------|---------|
| `App.tsx:1027` | `role="status" aria-live="polite" aria-atomic="true"` | Global status announcements |
| `Toast.tsx:52` | `role="region" aria-live="polite"` | Toast notifications |
| `ErrorState.tsx:22` | `aria-live="assertive"` | Critical errors |
| `AgentsView.tsx:66` | `aria-live="polite"` | Agent status updates |
| `ChatViewport.tsx:145` | `aria-live="polite"` | Streaming chat messages |
| `BrowserView.tsx:650` | `aria-live="polite"` | Page load status |
| `ShareView.tsx:347` | `aria-live="polite"` | Transfer progress |
| `RemoteView.tsx:347` | `aria-live="polite"` | Remote session status |
| `GitView.tsx:213` | `aria-live="polite"` | Git operation results |
| `SettingsView.tsx:726` | `aria-live="polite"` | Settings save confirmation |
| `RecoveryView.tsx:126` | `role="log" aria-live="polite"` | Recovery log (progressive) |
| `MemoryView.tsx:293` | `aria-live="polite"` | Memory search results |
| `MCPView.tsx:154` | `role="status" aria-live="polite"` | MCP toggle confirmation |
| `SessionCard.tsx:109` | `role="status" aria-live="polite"` | Export path notification |
| `ThemesView.tsx:352` | `aria-live="polite"` | Wallpaper change confirmation |
| `LabBrowserView.tsx:95` | `aria-live="polite"` | Lab environment status |

All async state transitions that matter to users are announced.

---

## Keyboard Navigation Patterns

### Global
- **Tab / Shift+Tab**: All interactive elements are in natural DOM tab order
- **Escape**: Closes all modals, dialogs, dropdown menus, command wheel
- **Enter / Space**: Activates buttons and toggles

### Per-component keyboard contracts

| Component | Keys | Status |
|-----------|------|--------|
| RadialCommandWheel | Arrow keys (segment nav), Enter (select), Backspace (back), Escape (close) | ✓ |
| TerminalCommandPalette | Arrow keys (up/down), Enter (run), Escape (close) | ✓ |
| Tabs primitive | Arrow keys (roving tabindex), Enter/Space (activate) | ✓ |
| BrowserView tab strip | Enter/Space on tab divs (keyboard handler wired in Phase 3) | ✓ |
| Modal | Tab/Shift+Tab (trapped), Escape (close) | ✓ |
| ConfirmDialog | Tab (two buttons), Enter/Space, Escape (cancel) | ✓ |
| Select primitive | Native `<select>` keyboard behavior | ✓ |
| PredictiveBar | Arrow keys (item selection), Enter (accept), Escape (dismiss) | ✓ |
| DiagnosticsView | Arrow keys on result rows | ✓ |
| ShareView | Arrow keys on peer list | ✓ |
| CertRoadmapView | Enter/Space on accordion toggles | ✓ |
| SIEMQueryView | Enter/Space on event rows | ✓ |
| PracticeExamView | Keyboard on answer choices | ✓ |

---

## ARIA Patterns by Category

### Interactive State
| Pattern | Count | Example |
|---------|-------|---------|
| `aria-pressed` | 30+ instances | Theme cards, font cards, wallpaper buttons, segment buttons |
| `aria-selected` | 10+ instances | Tab components, browser tab strip |
| `aria-checked` | 5 instances | MCPView tool toggles, checkbox-style rows |
| `aria-expanded` | 14 files | Accordion, dropdown menus, collapsible panels |
| `aria-disabled` | Button primitive default | All disabled buttons |

### Decorative Content
| Pattern | Count | Status |
|---------|-------|--------|
| `aria-hidden="true"` on Lucide icons | 100+ instances | All decorative icons hidden |
| `aria-hidden="true"` on SVG backgrounds | ✓ | RadialCommandWheel SVG circle |
| `aria-hidden="true"` on skeleton shimmer | ✓ | Fixed in Phase 6 |
| `aria-hidden="true"` on line numbers | ✓ | IDEView `lineNumbersRef` div |

### Labels and Descriptions
| Pattern | Count | Status |
|---------|-------|--------|
| `aria-label` on icon-only buttons | ✓ All | IconButton requires explicit label via children |
| `aria-label` on search inputs | ✓ All | No unlabeled `<input>` found |
| `aria-label` on sections | ✓ Many | `<section aria-label="...">` across views |
| `aria-describedby` | ✓ | Tooltip (Phase 6 fix), TextInput errors, Select errors |
| `htmlFor` / `id` pairing | ✓ | All TextInput, Select, Toggle primitives |

### Semantic Landmarks
| Role | Where | Status |
|------|-------|--------|
| `banner` | TitleBar | ✓ |
| `main` | App.tsx `#main-content` | ✓ |
| `complementary` | Layout ControllerHintBar | ✓ |
| `region` | Toast container, MemoryView filters, DatasetViewer | ✓ |
| `dialog` | RadialCommandWheel overlay | ✓ |
| `log` | RecoveryView operation log | ✓ |
| `status` | ControllerHintBar, MCPView toast, SessionCard export feedback | ✓ |

---

## prefers-reduced-motion Coverage

| Layer | Implementation | Status |
|-------|---------------|--------|
| `tokens.css` | `--nd-motion-fast/normal/slow` zeroed under reduced-motion | ✓ |
| `app.css` | 8 `@media (prefers-reduced-motion: reduce)` blocks | ✓ |
| Tailwind `motion-reduce:` | 48 usage instances across 35 files | ✓ |
| `LoadingState` spinner | `motion-reduce:animate-none` | ✓ |
| `Skeleton` shimmer | `motion-reduce:animate-none` on both div and shimmer span | ✓ |
| `Tooltip` | `motion-reduce:transition-none` | ✓ |
| Canvas wallpaper | Stops animation loop under reduced-motion (wallpaperManager.ts) | ✓ |
| Academy `SkillBar` | `motion-reduce:transition-none` | ✓ |

All animation layers respect the OS reduced-motion preference.

---

## Steam Deck Controller UX

### DeckButtonHint Component
- Renders controller button chips (e.g., `A Open`, `B Back`, `Y Commands`)
- Wrapped by `ControllerHintBar` with `role="status"` + `aria-label` — screen readers can read the mode hints
- Intentionally visible to AT: users with accessibility needs on Steam Deck benefit from knowing button mappings

### ControllerHintBar (IDE)
- `role="status"` + `aria-label={"Controller hints for ${ideMode} mode"}`
- Rerenders on `ideMode` change — `role="status"` announces changes without interrupting focus
- 5 modes: `IDE_NAVIGATION`, `IDE_EDIT`, `IDE_PREDICTION`, `IDE_COMMAND`, `IDE_SNIPPET`

### RadialCommandWheel (IDE Command Palette)
- `role="dialog"` + `aria-modal="true"` + `aria-label="Command wheel"` on overlay
- 8 segment `<button>` elements each with `aria-pressed` + contextual `aria-label` including command count
- Full keyboard navigation: arrows for segment selection, Enter for activation, Escape to close
- Focus restored to wheel root on open via `wheelRef.current?.focus()`
- SVG decorative background: `aria-hidden="true"` ✓

### Layout ControllerHintBar (App shell)
- `role="complementary"` — correctly marks this as supplementary navigation aid

---

## Contrast and Visual A11y

- All text on `nd-surface-*` backgrounds uses `nd-text-primary/secondary/muted` tokens
- Token values in `tokens.css` maintain WCAG AA contrast ratios (canonical cyan `#5EEBFF` on dark surface)
- No color-only status indicators found — all status states combine color + icon + text
- Theme display profiles include an `Accessibility` option in SettingsView/ThemesView

---

## Phase 8 Observations (Low Priority)

### P3-A: DeckButtonHint lacks aria-hidden
`DeckButtonHint` renders as a `<span>` with text content inside `ControllerHintBar`. The parent `role="status"` makes the hints readable to AT, which is intentional. However, DeckButtonHints used outside of a `ControllerHintBar` context (no wrapper with a status role) would be read as raw text without semantic grouping.

**Assessment**: No DeckButtonHint usages outside ControllerHintBar were found. Acceptable as-is. If DeckButtonHint is ever used standalone, add `aria-label` on the container.

### P3-B: TerminalScreen controller hint bar pills
The terminal "suggested command" pill buttons in `TerminalScreen.tsx` use raw `<button>` elements with text content. These have implicit button role and keyboard accessibility. They are visually distinguished only by color (cyan) vs text — but they also have visible text labels, so this is not color-only.

**Assessment**: Acceptable. These are not ARIA-critical since they have visible text labels and implicit button semantics.

---

## Phase 8 Verdict

**Accessibility posture: EXCELLENT.**

No P0 (blocker) or P1 (high) accessibility issues found. All confirmed patterns:
- Skip links ✓
- Focus trapping ✓
- Focus visible rings ✓
- ARIA live regions ✓
- Semantic landmarks ✓
- aria-pressed / aria-selected / aria-expanded / aria-checked ✓
- Decorative icon hiding ✓
- Form label association ✓
- Keyboard navigation ✓
- prefers-reduced-motion ✓
- Screen reader announcements for async state ✓
- Controller hints with screen reader context ✓

**Status: COMPLETE — no code changes required.**
