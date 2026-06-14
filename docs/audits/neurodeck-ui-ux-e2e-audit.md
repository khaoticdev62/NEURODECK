# NEURODECK UI/UX & E2E Audit — Sprint Summary

**Date:** 2026-06-14  
**Scope:** Full frontend UI/UX, accessibility, design-system token compliance, and e2e test alignment  
**Auditor:** AAAA Audit Pass (automated + manual review)

---

## 2026-06-14 Bounded Full-Prompt Implementation Pass

**Prompt source:** `NEURODECK_E2E_UI_UX_Audit_Cleanup_Refactor_Prompt.md`  
**Implementation stance:** full active-frontend cleanup within explicit guardrails.

### Guardrails Applied

- `_legacy/` components remain deprecated but untouched.
- Mobile breakpoints below 1024px remain outside NEURODECK's supported targets.
- Rust sidecar and `bridge.rs` were not changed.
- No stack, framework, package, or dependency changes were made.
- BrowserView and TerminalScreen deep refactors remain deferred; only safe token/overlay fixes were applied.

### Active Fixes Landed

| Area | Fix |
|---|---|
| Shared empty states | Execution, Diagnostics, Maintenance, and Browser VPN now use `EmptyState` instead of one-off empty markup |
| Status token drift | Diagnostics connection glows now reference `--nd-green-rgb`, `--nd-yellow-rgb`, and `--nd-red-rgb` |
| Overlay layering | App overlays, command palette, browser popovers, IDE overlays, orchestrator modal, torrent modal, and skip links now use React z-index CSS variables |
| Design docs | Component inventory, token delta, and QA evidence updated with the active implementation details |

### Verification

```
npm run typecheck -w frontend
npm run build -w frontend
npm run test -w frontend -- EmptyState DiagnosticsView ExecutionView MaintenanceView BrowserVpnPanel
npm run test -w frontend
```

Result: passed. Full frontend suite: 58 files / 581 tests.

---

## Audit Methodology

Three parallel exploration agents analyzed the live codebase:
- Architecture + component inventory scan
- CSS / design-token compliance scan
- E2E test selector alignment scan

Findings were triaged into P0–P6 and executed as six sequential sprints.

---

## Findings & Fixes

### P0 — Accessibility Blockers (Fixed)

| File | Issue | Fix |
|---|---|---|
| `components/primitives/EmptyState.tsx` | Icon JSX missing `aria-hidden="true"` | Added `aria-hidden="true"` to Icon render |
| `components/layout/NeurodeckShell.tsx` | No skip-to-content link for keyboard users | Added `<a href="#main-content">` with `sr-only focus:not-sr-only` pattern |

**Note:** `ApiLabView.tsx` aria-labels were pre-existing and correct on inspection; audit report was a false positive.

### P1 — Legacy Class Names (Cancelled — Not Dead)

`stv-*` and `*-kicker` classes were initially flagged as dead legacy from the `main.js` era. Grep analysis disproved this:
- `app.css` contains hundreds of active CSS rules targeting `stv-*`
- `settings-shell.spec.ts` e2e tests use `*-kicker` selectors as primary view selectors
- `design-system-audit.spec.ts` explicitly tests for `stv-*` presence

**Decision:** Sprint cancelled. These classes are load-bearing and must not be removed without a coordinated e2e test migration.

### P2 — Hard-coded Hex Colors (Fixed)

| File | Issue | Fix |
|---|---|---|
| `features/orchestrator/OrchestratorView.tsx` | SVG stroke/fill used `#5EEBFF`, `#E8F4FF`, `#9CA3AF` | Replaced with `style={{ stroke/fill: 'var(--nd-accent-primary/text-primary/text-muted)' }}` |
| `features/remote/RemoteView.tsx` | QR code colors hardcoded | Runtime `getComputedStyle` reads `--nd-accent-primary` and `--nd-surface-app` |
| `features/settings/LiveWallpaperPanel.tsx` | `bg-[#050505]` | → `bg-nd-surface-app` |
| `features/themes/ThemesView.tsx` | `bg-[#000000]` | → `bg-black` (intentional pure black for theme preview swatch) |

**Accepted exception:** `CanvasView.tsx` `DEFAULT_CODE` template contains `#5EEBFF` inside an `<iframe>` blob URL where CSS variables from the parent document are not inherited. This is structurally correct.

### P3 — Missing Empty/Loading States (Fixed)

| File | Change |
|---|---|
| `features/api-lab/ApiLabView.tsx` | Response pane: replaced text paragraph with `<EmptyState icon={Send} ...>` |
| `features/share/ShareView.tsx` | "No peers" + "No active transfers" → `<EmptyState>` components |
| `features/docs/DocsView.tsx` | Empty index list → `<EmptyState icon={BookOpen} ...>` |
| `features/diagnostics/DiagnosticsView.tsx` | Removed 3 `style={{ minHeight }}` inline props → Tailwind `min-h-10` / `min-h-[30px]` |

### P4 — Missing ARIA Tab Primitive (Fixed)

Created `components/primitives/Tabs.tsx` — a fully ARIA-compliant tab primitive:
- `TabGroup` (context + id prefix via `useId`)
- `TabList` (role="tablist", keyboard: ArrowLeft/Right/Home/End)
- `Tab` (role="tab", aria-selected, aria-controls, roving tabIndex)
- `TabPanels` (wrapper)
- `TabPanel` (role="tabpanel", aria-labelledby, tabIndex=0)

`SyncView.tsx` updated to use the roving keyboard pattern with `ReactKeyboardEvent<HTMLDivElement>` alias to avoid DOM `KeyboardEvent` naming conflict from existing `window.addEventListener` handlers.

### P5 — E2E Test Alignment (Fixed, prior sprint)

| File | Change |
|---|---|
| `e2e/tests/onboarding.spec.ts` | Added `npm_get_status`/`npm_get_recommended` mocks; inserted Step 6 (Packages) in navigation flow; replaced localStorage assertion with overlay visibility check |
| `e2e/tests/settings-shell.spec.ts` | Replaced `#model-name`/`#agent-switcher-panel` legacy selectors with React AgentsView selectors (`.agent-kicker`, `#agent-task-input`, `#agent-run-btn`) |

### P6 — Documentation (This Sprint)

Created 4 docs under `docs/`:
- `docs/audits/neurodeck-ui-ux-e2e-audit.md` (this file)
- `docs/design-system/ui-design-system-delta.md`
- `docs/design-system/component-inventory.md`
- `docs/audits/ui-qa-evidence.md`

---

## Quality Gates Passed

```
npm run --prefix frontend typecheck   ✅  0 errors
npm run --prefix frontend test --run  ✅  550/550 tests passed (55 files)
```

---

## Known Limitations / Deferred

- `_legacy/` folder: deprecated components remain but are excluded from typecheck and e2e. Removal deferred to a dedicated PR.
- `stv-*` / `*-kicker` class migration requires coordinated e2e update; deferred.
- CanvasView run button for non-HTML languages (Python/Bash) shows hint only — flagged in `ANTIGRAVITY_HANDOFF.md` as a known product gap.
- Context drawer (`inspectDrawer`) wired but empty — Priority 3 backlog item.
