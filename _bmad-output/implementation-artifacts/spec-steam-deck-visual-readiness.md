---
title: 'Steam Deck Visual Readiness Gate and Remediation'
type: 'chore'
created: '2026-06-19'
status: 'in-progress'
baseline_commit: 'cf93f07daf6ddb920e3f4a3080c4ea1620ca59f3'
context:
  - 'docs/project-context.md'
  - 'docs/ui-testing-strategy.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** NEURODECK's Playwright suite claims Steam Deck readiness while broad screenshot masks hide real content, touch-target checks permit undersized controls, color contrast is skipped, CI omits the Steam Deck project, and 15 current visual checks fail.

**Approach:** Build one deterministic 1280×800 audit shared across every registered screen, repair reproducible UI defects, retain reviewed asset-aligned baselines, and add focused real-Electron coverage.

## Boundaries & Constraints

**Always:** Preserve the user-owned `llm-term.toml` change; use semantic locators and deterministic mocks; enforce 40×40 primary chrome targets; retain Electron isolation/security; keep every render inside 1280×800; attach actionable diagnostics; run on an allowed branch and push only verified scoped work.

**Ask First:** Changes to protected workflows, lockfiles, backend interfaces, or intentional product visuals not represented by provided assets.

**Never:** Hide complete views or meaningful content for screenshots; regenerate baselines to conceal defects; weaken assertions with broad exclusions; modify user configuration; push directly to protected branches.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Browser audit | Every canonical view and overlay at 1280×800 | Visible meaningful content, no clipping/page overflow, accessible named controls and clean runtime diagnostics | Attach JSON report, screenshots and trace; fail the screen |
| Visual audit | Deterministic mocked state | Reviewed viewport screenshot matches baseline | Emit expected/actual/diff; never auto-approve |
| Electron gate | Production Electron window | 1280×800 content, representative views/overlays and bridge/security checks pass | Capture screenshot/logs and fail cleanly |
| Scrollable content | Content larger than its panel | Internal scroll container remains inside viewport and usable | Report offending selector and bounds |

</frozen-after-approval>

## Code Map

- `e2e/support/steam-deck-audit.ts` -- canonical screen registry, audit types, geometry/runtime collection and artifact writer.
- `e2e/pages/AppPage.ts` -- navigation and deterministic screenshot stabilization.
- `e2e/tests/{steam-deck-layout,visual,a11y,ui-screen-audit,electron-native}.spec.ts` -- browser and Electron release gates.
- `e2e/playwright*.config.ts` and package scripts -- project selection, artifacts and readiness commands.
- `src/renderer/` -- only UI/CSS/token repairs demonstrated by the hardened audit.

## Tasks & Acceptance

**Execution:**
- [x] Add the typed canonical registry and reusable runtime, geometry, accessibility and artifact helpers.
- [x] Replace broad visual masks with deterministic state plus narrow volatile masks.
- [x] Refactor layout, visual, accessibility and screen audits onto the shared registry; enforce 1280×800, clipping, 40×40 primary chrome, focus and error gates.
- [x] Expand the Electron suite with window, representative screen, overlay, controller and bridge checks.
- [x] Add local/CI commands and include Steam Deck in CI-mode Playwright projects without protected workflow edits.
- [x] Repair detected React/CSS/token defects and review 1280×800 baselines against supplied screenshots.
- [x] Write the QA summary, verify twice for determinism, preflight, commit and push the agent branch.

**Acceptance Criteria:**
- Given any canonical screen, when audited at 1280×800, then meaningful content remains visible, page-level overflow is absent, visible primary chrome is at least 40×40, and actionable findings fail the test.
- Given visual stabilization, when screenshots are captured twice, then neither run hides semantic screen content and both match reviewed baselines.
- Given the Electron readiness command, when the production runtime launches, then its window, representative navigation, overlays, bridge and security checks pass sequentially.
- Given CI mode, when Playwright projects resolve, then Chromium and Steam Deck browser gates are both included.

## Spec Change Log

## Design Notes

Treat 1280×720 documentation screenshots as visual-language references, not crop dimensions. The enforceable baseline is a reviewed 1280×800 viewport. Geometry checks should ignore hidden elements and intentional descendants inside scroll containers, but report viewport clipping with stable selectors and numeric bounds.

## Verification

**Commands:**
- `npm run frontend:typecheck` -- TypeScript passes.
- `npm run frontend:test` -- frontend unit tests pass.
- `npm run e2e:steamdeck` -- every canonical browser screen and overlay passes.
- `npm run e2e:visual` twice -- deterministic visual baselines pass twice.
- `npm run e2e:electron` -- focused real-Electron readiness passes sequentially.
- `npm run e2e:readiness` -- aggregate gate passes.
- `npm run preflight` -- branch, staged-path and secret policy checks pass.

## QA Summary (2026-06-19)

All verification commands were run against the working tree as left by the prior implementation pass; no additional code changes were required.

| Command | Result |
|---|---|
| `npm run frontend:typecheck` | Pass |
| `npm run frontend:test` | Pass (52 files, 457 tests) |
| `npm run e2e:steamdeck` | Pass (87/87 — layout + a11y) |
| `npm run e2e:visual` (run 1) | Pass (42/42) |
| `npm run e2e:visual` (run 2) | Pass (42/42, identical to run 1 — deterministic) |
| `npm run e2e:electron` | Pass (10/10) |
| `npm run e2e:readiness` | Pass (139/139 aggregate) |
| `e2e/tests/ui-screen-audit.spec.ts` (steam-deck project) | Pass (46/46) |
| `npm run preflight` | Pass (1 informational warning: no staged changes yet) |

Housekeeping: added `e2e/test-results-electron/` and `e2e/debug.log` to `.gitignore` and removed the stray local artifacts; they were Playwright/Electron run output, not part of the suite itself.

No React/CSS/token defects were found during this verification pass — the prior implementation already closed every audit finding the registry surfaced (layout, a11y, visual, and Electron gates all pass cleanly with no skips, no broad masks, and no weakened assertions).
