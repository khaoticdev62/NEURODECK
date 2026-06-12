# Phase 3 — Multi-runtime Provider Discovery and Health Probes

## Status

**Complete.** Rust services, bridge commands, and unit tests are implemented and green.

## What was built

| File | Responsibility |
|---|---|
| `src-tauri/src/services/models/provider_runtime_registry.rs` | Loads `assets/model-registry/provider-runtimes.json`, resolves effective base URLs from user config, and exposes runtime lookup helpers. |
| `src-tauri/src/services/models/provider_health_service.rs` | Async health checks for every runtime: auth validation, HTTP probe, model listing, latency measurement, and failure classification. |
| `src-tauri/src/services/models/model_discovery_service.rs` | Cross-references discovered provider models against `supported-models.json` to produce typed `DiscoveredModelEntry` records. |
| `src-tauri/src/services/models/model_probe_service.rs` | Sends a tiny prompt (`"Say 'pong' exactly."`) through Ollama or OpenAI-compatible chat endpoints and verifies a non-empty response. |
| `src-tauri/src/commands/mod.rs` | New bridge commands: `list_provider_runtimes`, `discover_installed_models`, `get_provider_health`, `run_model_probe`. |
| `src-tauri/src/config.rs` | Added `lm_studio_base_url` and `llamacpp_base_url` with sensible defaults so local runtime URLs can be overridden. |
| `src-tauri/src/model_registry.rs` | Made `registry_path` public and added `CARGO_MANIFEST_DIR` / parent-dir fallbacks so tests can locate the JSON registries. |

## Bridge commands

- `list_provider_runtimes` → returns the full runtime registry.
- `discover_installed_models` → returns models discovered across all runtimes, merged with registry metadata.
- `get_provider_health` → with `runtimeId` returns one health record; without it returns all runtimes.
- `run_model_probe` → sends a tiny prompt to `(runtimeId, modelId)` and returns the response/state.

## Supported runtime behaviors

| Runtime | Health endpoint | Model listing | Tiny prompt |
|---|---|---|---|
| Ollama | `GET /api/tags` | `models[].name` | `POST /api/generate` |
| LM Studio | `GET /v1/models` | `data[].id` | `POST /v1/chat/completions` |
| llama.cpp server | `GET /health` or `/v1/models` | `data[].id` | `POST /v1/chat/completions` |
| OpenAI-compatible remote | `GET /v1/models` with auth | `data[].id` | `POST /v1/chat/completions` |
| Hugging Face / Gemini / Kimi | Auth-checked; model listing disabled per registry; tiny prompt returns `not_configured` / not-implemented for now. |

## Failure classification

Implemented `ProviderConnectionState` values:
`unknown`, `not_configured`, `starting`, `connecting`, `connected`, `degraded`, `offline`, `missing_binary`, `missing_model`, `auth_failed`, `rate_limited`, `crashed`, `blocked`, `error`, `recovering`.

Current health check maps HTTP errors to:
- `401` → `auth_failed`
- `429` → `rate_limited`
- `503` → `offline`
- connect/timeout → `offline`
- other → `error`

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml` → **126 lib + 10 integration tests passed**
- `npm run frontend:typecheck` → ✅
- `npm run frontend:build` → ✅
- `npm run verify:model-support` → ✅
- `npm run verify:no-production-mocks` → ✅
- Frontend unit tests → **354 passed** when run directly with `npx vitest run` (the root `npm run frontend:test` workspace invocation hits a Vitest setup-file context issue unrelated to this change).

## Notes / next steps for Phase 4

- Live probes against actual Ollama/LM Studio/llama.cpp processes will populate `reports/models/model-connection-evidence.json`.
- `stream_probe`, `embedding_probe`, and `tool_probe` are specified in the verification plan but not yet implemented.
- Self-healing recovery actions will consume these health/probe results in Phase 4.
