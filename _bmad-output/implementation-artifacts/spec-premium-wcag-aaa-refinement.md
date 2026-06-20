---
title: 'NEURODECK Premium UI and WCAG AAA Refinement'
type: 'feature'
created: '2026-06-19'
status: 'complete'
baseline_commit: '3cc5ec939e29624fb723ba8a58ddd552f8ee969d'
context:
  - '{project-root}/src/renderer/design-system/readme.md'
  - '{project-root}/docs/design-tokens-v1/NEURODECK_Design_Tokens_Component_Library_v1.0.md'
  - '{project-root}/docs/screenshots/'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current renderer is functionally broad and audit-covered, but its 36 views and six overlays still look incrementally assembled rather than like one premium controller-first operating environment. Existing accessibility work targets serious/critical failures but does not establish applicable WCAG 2.2 AAA evidence or consistently polished 1280×800 presentation.

**Approach:** Refine the canonical Tactical Glass system and apply it sequentially across five screen groups, producing visibly improved, reviewed 1280×800 evidence after each group. Preserve behavior and bridge interfaces while raising hierarchy, controller ergonomics, state clarity, rendering discipline, and applicable WCAG AAA outcomes.

## Boundaries & Constraints

**Always:** Preserve Electron isolation and existing UI/controller/bridge wiring; use canonical `--nd-*` tokens and shared primitives; keep every canonical screen inside 1280×800 with internal scrolling; provide at least 44×44 targets for primary/controller controls; pair status color with text or icon; preserve reduced motion; constrain blur to non-scrolling overlay surfaces; review candidates against `docs/screenshots/`; keep `llm-term.toml` untouched; implement, verify, commit, and push each major screen group independently.

**Ask First:** Any production bridge/backend API change, new runtime dependency, removal of a user-facing feature, protected workflow/lockfile change, or visual direction that replaces Tactical Glass rather than refining it.

**Never:** Claim universal WCAG AAA certification from Axe alone; hide regressions with broad screenshot masks or unexplained snapshot replacement; use static `will-change`, full-screen animated effects, emoji, color-only states, horizontal page scrolling, or direct pushes to protected branches.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Canonical Deck render | Any manifest screen at 1280×800 | Complete hierarchy, no clipping/overlap/page overflow, intentional internal scroll | Audit records geometry and fails the gate |
| Controller/keyboard path | D-pad-equivalent arrows, Tab, Enter, Escape | Visible focus, deterministic order, activation, trapped modal focus, restored trigger focus | Named control and focus finding attached |
| Accessibility modes | High contrast, reduced motion, 200% zoom where applicable | Legible content, 7:1 normal text and 4.5:1 large text where AAA applies, no essential motion | Axe plus manual exception report |
| Empty/loading/error | Deterministic mock states | Purpose-built state, recovery action, accessible status text | No blank or silent failure surface |
| Packaged runtime | Current Electron build and package | Same current assets and representative screens as source build | Fail on stale asset hash, bridge loss, or security regression |

</frozen-after-approval>

## Code Map

- `src/renderer/design-system/` and `src/renderer/index.css` -- canonical tokens, themes, primitives, global focus/motion/density rules.
- `src/renderer/components/layout/` and `src/renderer/components/workspace/` -- shell, sidebar, title/status chrome, controller hints, chat viewport and input console.
- `src/renderer/features/` -- canonical feature surfaces refined in the approved five-group order.
- `e2e/support/steam-deck-audit.ts` and `e2e/tests/` -- screen registry, geometry, Axe, interaction, visual and Electron gates.
- `_bmad-output/implementation-artifacts/tests/` -- reviewed before/after evidence, AAA applicability record and release summary.

## Tasks & Acceptance

**Execution:**
- [x] Foundations + group 1 -- tune semantic color/type/spacing/elevation/focus/motion tokens; refine shell, sidebar, title bar, controller hints and chat without behavior loss; verify and push.
- [x] Group 2 -- refine terminal, canvas, IDE, Git and browser around tool-specific hierarchy and dense-workspace ergonomics; verify and push.
- [x] Group 3 -- refine agent, memory, project, prompt, academy and graph surfaces, including actionable empty/loading/error states; verify and push.
- [x] Group 4 -- refine network, transfer, orchestration, system and diagnostics with readable telemetry and non-color-only status; verify and push.
- [x] Group 5 -- refine settings, themes and all key overlays; enforce focus traps, Escape behavior and trigger restoration; verify and push.
- [x] Gate reconciliation -- update stale assertions only after behavior review, produce 42 reviewed baselines, run source/Electron/package gates twice where deterministic evidence is required.

**Acceptance Criteria:**
- Given any canonical manifest entry, when rendered at 1280×800, then it has intentional premium hierarchy, no page overflow, clipped controls, unexpected overlap, blank state, broken image, console error, or unnamed interactive control.
- Given primary chrome or controller interaction, when inspected and operated without a pointer, then targets are at least 44×44, focus is conspicuous, order is deterministic, and state is not communicated by color alone.
- Given applicable WCAG 2.2 AAA checks, when automated and manual audits complete, then passing criteria have evidence and non-applicable or hardware-only criteria are explicitly recorded rather than claimed.
- Given visual verification twice consecutively, when no source changes occur, then all 42 reviewed screenshots pass without baseline mutation.
- Given development and packaged Electron launches, when representative workflows run, then current assets, bridge availability, window bounds, controller mode and security assertions pass.

## Spec Change Log

- 2026-06-20: All implementation groups and automated gates completed; moved to scoped adversarial review. Hardware-only and manual WCAG checks remain release-certification items.
- 2026-06-20: Scoped review found no release-blocking UI defects. Windows package and complete browser/Electron gates passed; Linux, Gamescope, physical controls and manual WCAG criteria remain explicitly unclaimed.

## Design Notes

Direction: 70% tactical operating system, 20% AAA console dashboard, 10% terminal heritage. Palette remains Void `#05070A`, Shell `#0A0D10`, Panel `#11161C`, Raised `#18212B`, Primary text `#E8F4FF`, Muted text no darker than AAA contrast permits, and controlled cyan `#5EEBFF`. Orbitron is restricted to brand/title moments, Inter owns readable UI copy, and JetBrains Mono owns code/data. The signature element is a precise controller-focus frame with a cyan 2px ring, restrained corner brackets, and state label; ambient glow is removed elsewhere.

## Verification

**Commands:**
- `npm run frontend:typecheck && npm run frontend:test` -- all TypeScript and 457+ unit tests pass.
- `npm run e2e:steamdeck` -- all canonical geometry, Axe and controller checks pass at 1280×800.
- `npm run e2e:visual` twice -- all 42 reviewed baselines pass consecutively.
- `npm --prefix e2e run test` -- complete browser matrix passes after stale-test reconciliation.
- `npm run e2e:electron` -- sequential real-Electron readiness and security checks pass.
- `npm run build && npm run preflight` -- production assets validate and GitOps checks pass.

**Manual checks:**
- Compare every candidate to the corresponding reference or documented visual direction; record exceptions, applicable AAA criteria, package provenance, and physical Steam Deck follow-ups.
