# NEURODECK Fallow Theme Audit Report Plan

This document outlines the workflow for running the Fallow analysis tool against the new and legacy theme engines to verify code cleanliness and architecture boundaries.

---

## 1. Fallow Execution Strategy

To confirm that the theme refactoring leaves no dead code, circular dependencies, or boundary violations, we execute Fallow in three modes:

### 1.1 Fallow Audit
`npx fallow audit --format json > reports/fallow/theme-baseline-audit.json`
- Verifies package dependency hygiene.
- Checks if the frontend renderer is incorrectly importing main-process or sidecar-specific code.

### 1.2 Fallow Health
`npx fallow health --score --hotspots --targets --format json > reports/fallow/theme-baseline-health.json`
- Scores overall file health and complexity.
- Identifies hotspots in the theme engine or live wallpaper rendering loops that have high cyclomatic complexity.

### 1.3 Fallow Dead Code
`npx fallow dead-code --format json > reports/fallow/theme-baseline-dead-code.json`
- Uncovers unused functions, variables, or types.
- Crucial for identifying old CSS variable declarations or deprecated theme objects.

---

## 2. Review and Verification

All Fallow reports are saved in `reports/fallow/` and reviewed before final packaging. Findings are classified as:
- `fix_now`: Dead exports or boundary violations.
- `safe_to_remove`: Unused assets or helper functions.
- `false_positive`: Dynamic imports or preload API exports.
