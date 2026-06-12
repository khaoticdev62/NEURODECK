# NEURODECK Fallow Model Support Audit Report

## 1. Baseline

Baseline reports generated at start of model support work:
- `reports/fallow/model-baseline-audit.json`
- `reports/fallow/model-baseline-health.json`
- `reports/fallow/model-baseline-dead-code.json`

## 2. Audit Focus

Use Fallow to identify:
- Dead model registry files
- Unused provider clients
- Unused fallback code
- Duplicate provider health logic
- Duplicate model scoring logic
- Duplicate OpenAI-compatible clients
- Circular dependencies
- Architecture boundary violations
- Mock provider imports in production
- Renderer importing provider clients
- Renderer importing main runtime code
- Unused dependencies
- High-complexity recovery logic

## 3. Findings

Pending final Fallow run. See baseline JSON files for initial state.

## 4. Classification

| Finding | Status | Action |
|---|---|---|
| TBD | TBD | TBD |

## 5. Final Reports

Final reports generated after implementation:
- `reports/fallow/model-final-audit.json`
- `reports/fallow/model-final-health.json`
- `reports/fallow/model-final-dead-code.json`

## 6. Commands

```bash
npm run audit:fallow -- --output reports/fallow/model-final-audit.json
npm run audit:fallow:health -- --output reports/fallow/model-final-health.json
npm run audit:fallow:dead -- --output reports/fallow/model-final-dead-code.json
```
