# NEURODECK Model Connection Verification Plan

## 1. Verification Principles

- Every `connected` status must be backed by a real transport probe.
- No green badge without bytes sent and received.
- Missing configuration returns `not_configured`, never `connected`.
- Missing model returns `missing_model`.
- Offline runtime returns `offline`.

## 2. Probe Types

| Probe | Purpose | Providers |
|---|---|---|
| `provider_ping` | Confirm base URL reachable | All |
| `model_list` | List available models | Ollama, LM Studio, llama.cpp, OpenAI-compatible |
| `model_show` | Get model details | Ollama |
| `tiny_prompt` | Send a minimal prompt and verify response | All chat-capable |
| `stream_probe` | Verify streaming works | All streaming-capable |
| `embedding_probe` | Verify embedding endpoint | Ollama, LM Studio, OpenAI-compatible, Gemini |
| `tool_probe` | Verify tool calling | Gemini, OpenAI-compatible, Kimi |
| `runtime_process_check` | Check if local process is running | Ollama, LM Studio, llama.cpp |
| `self_healing_recovery` | Verify recovery action result | All |
| `failover_route` | Verify alternate provider works | All |

## 3. Evidence Schema

See `frontend/src/shared/contracts/models.contracts.ts` for the TypeScript `ModelConnectionEvidence` contract.

Required fields:
- `requestId`
- `timestamp`
- `providerId`
- `providerType`
- `modelId` (optional)
- `probe`
- `status`: `passed` | `failed` | `skipped` | `blocked`
- `realTransportUsed`: true
- `mockDataDetected`: false
- `durationMs`
- `bytesSent`
- `bytesReceived`
- `source`
- `target`
- `error` (if failed)

## 4. Probe Sequences

### Ollama

1. `provider_ping`: `GET /api/tags`
2. `model_list`: parse `models[].name`
3. If selected model provided: verify in list
4. `tiny_prompt`: `POST /api/generate` with `"prompt": "say ok"`
5. `stream_probe`: same with `"stream": true`

### LM Studio

1. `provider_ping`: `GET /v1/models`
2. `model_list`: parse `data[].id`
3. `tiny_prompt`: `POST /v1/chat/completions` with one-turn message

### llama.cpp Server

1. `provider_ping`: `GET /health` or `GET /v1/models`
2. `tiny_prompt`: `POST /v1/chat/completions`

### OpenAI-Compatible Remote

1. Verify API key present
2. `provider_ping`: `GET /v1/models` with auth header
3. `tiny_prompt`: `POST /v1/chat/completions`

## 5. Failure Classification

| Failure | Classification | User Action |
|---|---|---|
| Connection refused | `offline` | Start the provider runtime |
| Timeout | `offline` or `degraded` | Check provider load/network |
| 404 model not found | `missing_model` | Pull/load the model |
| 401/403 | `auth_failed` | Check API key / credentials |
| 429 | `rate_limited` | Wait or switch provider |
| 5xx | `error` | Check provider logs |
| Empty response | `degraded` | Retry or switch model |

## 6. Verification Scripts

- `scripts/verify-model-connections.ts` runs probes and produces `reports/models/model-connection-evidence.json`.

## 7. Implementation Status

- **Phase 3 (discovery + health + tiny prompt probes)**: complete.
  - Rust services: `src-tauri/src/services/models/`
  - Bridge commands: `list_provider_runtimes`, `discover_installed_models`, `get_provider_health`, `run_model_probe`
  - Report: `reports/models/phase-3-discovery-health-probes.md`
  - Evidence: `reports/models/phase-3-evidence.json`
- **Remaining probes**: `stream_probe`, `embedding_probe`, `tool_probe`, `runtime_process_check`, `self_healing_recovery`, `failover_route` are planned for Phases 4–10.
