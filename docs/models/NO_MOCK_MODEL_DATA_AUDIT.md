# NEURODECK No-Mock Model Data Audit

## 1. Audit Scope

Search production code (not tests/fixtures) for synthetic model/provider/health data.

## 2. Forbidden Patterns in Production

- `mockModels`, `mockProvider`, `fakeModels`, `fakeProvider`
- `demoModels`, `sampleModels`, `placeholderModels`
- `staticModels`, `hardcodedModels`, `testModels`, `dummyModel`
- `defaultModels` that return static catalogs without runtime verification
- `return []` or `return {}` as a fake success response
- `Promise.resolve` with synthetic model lists
- `setTimeout` fake async responses
- `fake connected`, `fake health`, `fake model list`

## 3. Allowed Locations

- `tests/**`
- `*.test.ts`
- `*.spec.ts`
- Storybook-only files
- Test fixtures
- `docs/examples/**`

## 4. Findings

### High Severity

| File | Pattern | Violation |
|---|---|---|
| `frontend/src/react/types/seed.ts` | Hardcoded `models` array | Production seed data presented as real models |
| `src-tauri/src/commands/mod.rs` | Hardcoded `gemini_models` / `ollama_models` | Returns static lists instead of querying runtime |
| `src-tauri/src/commands/mod.rs` | Hardcoded `get_recommended_models` JSON | Static recommendations |
| `src-tauri/src/commands/agent.rs` | `get_recommended_models()` hardcoded list | ~20 models with fake marketing metadata |
| `src-tauri/src/hf_model_mgr.rs` | `get_curated_steam_deck_models()` | Fake `downloads`, `likes`, `tags` |

### Medium Severity

| File | Pattern | Violation |
|---|---|---|
| `frontend/src/react/services/bridgeAdapter.ts` | `fallbackHealth`, `browserDraft`, `fallbackDiagnostics` | Synthetic fallback responses |
| `frontend/src/react/services/bridgeAdapter.ts` | `models.detectLocal()` hardcoded defaults | `quantization`, `context`, `ramEstimate` set without evidence |
| `frontend/src/react/features/settings/SettingsView.tsx` | Hardcoded `providers` array | Static provider list |
| `src-tauri/src/providers.rs` | `default_agents()` | Hardcoded agent profiles with model IDs |

### Low Severity

| File | Pattern | Violation |
|---|---|---|
| `src-tauri/src/models.rs` | `PERSONAS`, `THEMES` | Bundled config in source; acceptable as defaults |
| `frontend/src/react/state/useNeuroDeckState.ts` | `telemetry` initial state | Mock telemetry numbers (latency, memory pressure) |

## 5. Remediation

1. Move hardcoded production catalogs to runtime-loaded JSON or config.
2. Replace synthetic fallbacks with explicit offline states.
3. Use `unknown` for values not discoverable at runtime.
4. Update `verify:no-production-mocks` and `verify:no-mock-models` scripts to catch the above.

## 6. Verification

```bash
npm run verify:no-production-mocks
npm run verify:no-mock-models
```

Both must pass before this work is considered complete.
