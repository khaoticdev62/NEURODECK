# Fallow Quality Gates

## Tool

**Fallow** 2.88.3 — static analysis for JavaScript/TypeScript projects.

## Commands

```bash
npm run quality:fallow:audit      # Full audit (circular deps, unused exports, etc.)
npm run quality:fallow:json       # Machine-readable JSON output
npm run quality:fallow:health     # Complexity hotspot analysis
npm run quality:fallow:dead-code  # Dead code detection
npm run quality:fallow:dupes      # Code duplication detection
```

## Gate Strategy

### Blocking Gates (must pass for merge)

| Gate | Threshold | Current |
|------|-----------|---------|
| Dead code | 0 issues | ✅ 0 |
| Duplication | 0 clone groups | ✅ 0 |
| Unused dependencies | 0 | ✅ 0 |
| Unlisted dependencies | 0 | ✅ 0 |

### Informational Gates (monitored, not blocking)

| Gate | Threshold | Current | Notes |
|------|-----------|---------|-------|
| Complexity (health) | < 50 hotspots | ⚠️ 416 | Concentrated in `frontend/src/main.js` monolith. Known architectural debt. |
| Circular dependencies | 0 | ✅ 0 | |
| Unused exports | 0 | ✅ 0 | |

### CI Integration

```yaml
# In CI pipeline (see .github/workflows/ci.yml)
- run: npm run quality:fallow:dead-code
- run: npm run quality:fallow:dupes
```

**Blocking gates fail the build.** Informational gates generate warnings only.

## Baseline

See `docs/reports/fallow-baseline.md` for the initial scan results.

## Escalation Path

1. **New dead code** → Must fix before merge
2. **New duplication** → Must fix before merge
3. **New dependency issues** → Must fix before merge
4. **New complexity hotspots** → Review in PR; block if > 10 new hotspots
5. **Monolith refactoring** → Dedicated story when complexity blocks feature work

## Exclusions

Configured in `.fallowrc.json`:
- `e2e/**` — E2E test infrastructure
- `frontend/public/splash*.css/js` — Generated splashscreen assets
- `electron/preload.js` — Electron boilerplate
- `electron/scripts/dev-launcher.js` — Dev tooling
- `@playwright/test`, `@axe-core/playwright` — Test-only deps
