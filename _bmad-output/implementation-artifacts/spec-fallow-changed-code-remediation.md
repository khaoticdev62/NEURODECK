---
title: 'Fallow changed-code remediation'
type: 'refactor'
created: '2026-06-18'
status: 'in-progress'
baseline_commit: '615eec8d'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The changed frontend has genuine clone groups, oversized control-flow units, one test that duplicates its system under test, and dependency/tooling findings that make the Fallow audit fail. These issues must be addressed without changing visible behavior or damaging the existing dirty UI sprint.

**Approach:** Update repository guidance, remove the real dependency defect, consolidate behavior-bearing clones, reduce newly introduced complexity, and record justified narrow suppressions for intentional exhaustive routing or declarative repetition. Verify each checkpoint with the real reducer tests, full frontend tests, type-check, build, wiring checks, and Fallow.

## Boundaries & Constraints

**Always:** Preserve existing UI behavior, component props, view IDs, bridge contracts, 1280x800 layout, design tokens, accessibility, keyboard/gamepad behavior, and unrelated worktree changes. Work on `agent/fallow-changed-code-remediation`; stage only remediation files or hunks. Every Fallow finding receives a written disposition.

**Ask First:** Any bridge/schema change, removal of a dependency other than unused `marked`, visual redesign, lockfile change beyond the approved `marked` removal, or need to overwrite unrelated user work.

**Never:** Push directly to `master`; bulk-suppress directories; change generated screenshots to hide regressions; rewrite protected workflows/KFMS metadata; stage unrelated wireframe or feature work.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Existing dirty worktree | User UI files are modified or untracked | Refactors preserve their current intent and only scoped hunks/files are committed | Stop on overlapping external edits and re-read before patching |
| Intentional complexity | Exhaustive reducer/router or isolated declarative map | Behavior remains explicit and a narrow suppression includes rationale | Ledger records why extraction would reduce safety or clarity |
| Actionable clone | Shared behavior appears in multiple production paths | One typed helper/hook becomes the source of truth | Add regression tests before removing copies |
| Tool false positive | Script-only dependency is hidden by Fallow ignore patterns | Dependency remains and is explicitly configured | Confirm a real import and runnable script before configuring |

</frozen-after-approval>

## Code Map

- `AGENTS.md` -- repository operating rules and validation expectations.
- `.fallowrc.json`, `package.json`, `frontend/package.json`, `package-lock.json` -- audit configuration, platform-neutral tests, and dependency cleanup.
- `frontend/src/react/state/` and reducer tests -- production reducer and its direct test coverage.
- `frontend/src/react/app/`, search, browser, and changed feature views -- duplicate and complexity remediation targets.
- `reports/fallow/` -- machine-readable reports and human disposition ledger.

## Tasks & Acceptance

**Execution:**
- [ ] Add concise repository rules and correct stale test-command guidance.
- [ ] Remove `marked`; retain and configure verified Lighthouse tooling; make test scripts platform-neutral.
- [ ] Test the exported production reducer instead of a cloned reducer implementation.
- [ ] Extract shared overlay, browser-state, formatting, and error-screen behavior from actionable clone groups.
- [ ] Decompose introduced search, quick-start, model, network, storage, diagnostics, agent, theme, and tutorial complexity into typed helpers/hooks/components.
- [ ] Apply only symbol-level documented suppressions to intentional exhaustive/declarative findings.
- [ ] Refresh Fallow reports and produce a complete remediation ledger.
- [ ] Run all gates, stage scoped changes, commit, and push the agent branch.

**Acceptance Criteria:**
- Given the approved changed-code scope, when Fallow runs against `origin/master`, then every reported dependency, duplicate, and complexity finding is refactored or explicitly justified and the new-only audit gate passes.
- Given existing application behavior, when frontend tests, type-check, build, wiring, IPC, and focused UI checks run, then no regression is observed.
- Given the dirty worktree, when the branch is committed, then unrelated user changes remain unstaged and uncommitted.

## Spec Change Log

## Design Notes

Prefer data tables for stable mappings, pure functions for normalization/formatting, hooks for event/subscription lifecycles, and small presentation components for JSX sections. A suppression is acceptable only immediately above the intentional symbol and must state the invariant that makes the complexity deliberate.

## Verification

**Commands:**
- `npm -w frontend run test` -- all frontend tests pass.
- `npm run frontend:typecheck` -- TypeScript passes.
- `npm run frontend:build` -- Vite production build passes.
- `npm run verify:wiring && npm run verify:ipc` -- UI/bridge contracts pass.
- `npx fallow audit --base origin/master --fail-on-issues` -- changed-code gate passes.
- `npx fallow dupes --mode semantic --min-tokens 30 --min-lines 4 --cross-language --summary --no-cache` -- comparison baseline is recorded.
- `npm run preflight` -- branch, secret, and staged-path policy passes.
