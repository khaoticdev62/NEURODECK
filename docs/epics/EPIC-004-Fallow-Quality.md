# Epic: Fallow Quality & Static Analysis Hygiene

## Objective
Maintain zero code duplicates and clean dependency trees across the JavaScript and Rust modules. Verify the codebase passes all Fallow static analysis gates.

## Background
Fallow is the project's static analysis toolchain for dead-code detection, duplication scanning, complexity analysis, and dependency hygiene. This epic ensures the codebase remains maintainable and free of technical debt that would block releases.

## User Stories

### Story 1: Code Duplication Eradication
**As a** developer,
**I want** the Fallow duplication scan to report exactly 0 duplicate clone groups,
**So that** the codebase is highly maintainable and DRY.

- **Acceptance Criteria**:
  - `npx fallow dupes` reports "No code duplication found".
  - Any future clone groups are refactored before merging.

### Story 2: Dependency & Dead-Code Cleansing
**As a** package maintainer,
**I want** `npx fallow dead-code` to return no warnings,
**So that** the bundle contains no unused code or unlisted dependencies.

- **Acceptance Criteria**:
  - `npx fallow dead-code` reports 0 total issues.
  - Zero unused dependencies in `package.json` files.
  - Zero unlisted dependencies imported in source files.
  - No Tauri API mocks remain in `frontend/vitest.setup.js`.

### Story 3: Complexity Baseline Documentation
**As a** technical lead,
**I want** to document the current complexity hotspots,
**So that** future refactoring sprints have data-driven targets.

- **Acceptance Criteria**:
  - Record the top complexity offenders (highest cyclomatic / cognitive complexity).
  - Note that `frontend/src/main.js` contains the highest-density complexity (legacy monolith pattern).

## Verification Results

### Fallow Scans (v2.88.3)
| Scan | Result | Details |
|------|--------|---------|
| `fallow dupes` | ✅ PASS | 0 duplicate clone groups |
| `fallow dead-code` | ✅ PASS | 0 total issues (0 unused deps, 0 unlisted deps, 0 unresolved imports) |
| `fallow health` | ℹ️ INFO | 54021 LOC; avg cyclomatic 3.0; critical complexity concentrated in `main.js` |

### Top Complexity Hotspots (Documented)
| File | Function | Cyclomatic | Cognitive |
|------|----------|------------|-----------|
| `frontend/src/main.js` | `pollGamepads` | 140 | 278 |
| `frontend/src/main.js` | `draw` | 58 | 124 |
| `frontend/src/agent.js` | `runBrowserTool` | 44 | 39 |
| `frontend/src/chat.js` | `<anonymous>` | 40 | 47 |
| `frontend/src/cli_maker.js` | `_editCommand` | 34 | 34 |

### Rust Side
- `cargo check` — clean (1.5s)
- `cargo test --lib` — all tests pass

## Technical Notes
- The `.fallowrc.json` configuration excludes e2e tests, temp_inspect, splashscreen assets, and electron preload scripts from analysis.
- The `frontend/src/main.js` monolith (~13K lines) is the primary source of high-complexity warnings. Refactoring it is out of scope for this epic and tracked separately.

## Definition of Done
- [x] `fallow dupes` returns 0 clone groups
- [x] `fallow dead-code` returns 0 issues
- [x] `cargo check` succeeds
- [x] `npm run --prefix frontend build` succeeds
- [x] KFMS release status remains GO
