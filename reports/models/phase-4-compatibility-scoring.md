# Phase 4 — Model Compatibility Scoring

## Status

**Complete.** Rust compatibility scoring service and bridge commands are implemented, aligned with the TypeScript `steamDeckCompatibilityScorer`, and green.

## What was built

| File | Responsibility |
|---|---|
| `src-tauri/src/services/models/model_compatibility_service.rs` | Scores every model in `supported-models.json` for Steam Deck suitability, using tier, parameter class, thermal/memory pressure, installed status, and user opt-in. |
| `src-tauri/src/services/models/mod.rs` | Re-exports scoring helpers. |
| `src-tauri/src/commands/mod.rs` | New bridge commands: `get_model_compatibility_scores`, `pick_best_local_model`. |

## Scoring inputs

`ScoreOptions` (all optional):
- `hostMemoryGb` — defaults to detected system memory.
- `batteryMode` — defaults `true`.
- `allowHeavyModels` — defaults `false`.
- `requiredCapabilities` — defaults empty.

## Scoring rules (mirrors `frontend/src/shared/models/steamDeckCompatibilityScorer.ts`)

- Base score: 50
- Tier bonus/penalty: `deck_default` +40, `deck_balanced` +25, `deck_heavy` +10, `remote_or_docked_only` −20, `unsupported` −50, unknown −30
- Installed locally: +10
- Parameter class: small (`sub_1b`–`3b`) +10; medium-large (`7b`/`8b`) −10; larger −20
- Battery mode + non-low thermal pressure: −10
- <16 GB host memory + high memory pressure: −10
- Heavy tier without `allowHeavyModels`: −15
- Clamped to 0–100

Outputs `ModelCompatibilityScore` with `score`, `reasons`, `warnings`, `recommendedContextTokens`, `recommendedBatchSize`, `recommendedGpuLayers`, `allowAutoLoad`, `requiresUserOptIn`, and `installed`.

## Bridge commands

- `get_model_compatibility_scores` — returns scored list for all registry models. Live discovery is used to mark installed models.
- `pick_best_local_model` — returns the highest-scoring local-allowed model that matches required capabilities.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --lib` ✅ — 129 tests passed (3 new scoring tests)
- `npm run verify:model-support` ✅
- `npm run verify:no-production-mocks` ✅
- `npm run frontend:build` ✅

## Notes / next steps for Phase 5

- Wire scores into the model selector UI (renderer).
- Use `pick_best_local_model` as a failover target in the self-healing engine.
- Add agent-policy filtering so an agent can only see models matching its `allowedModelCapabilities` and `minimumCompatibilityTier`.
