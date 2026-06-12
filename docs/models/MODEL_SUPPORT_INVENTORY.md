# NEURODECK Model Support Inventory

## 1. Scope

This inventory documents all code paths that touch LLM/AI model support, provider routing, model discovery, agent/model compatibility, and diagnostics in the NEURODECK codebase.

## 2. Classification Legend

| Class | Meaning |
|---|---|
| `production_ready` | Real, wired, and verified production path |
| `not_configured` | Valid path but missing user configuration |
| `offline` | Valid path but runtime unreachable |
| `missing_binary` | Requires an executable/runtime that is absent |
| `missing_model` | Runtime reachable but selected model absent |
| `mocked` | Ships synthetic data in production code |
| `partially_mocked` | Mixes real and synthetic data |
| `legacy_pending_migration` | Old path awaiting migration |
| `blocked` | Intentionally disabled or insecure |
| `deprecated` | Scheduled for removal |
| `unknown` | Status not yet determined |

## 3. Provider Clients

| File | Provider | Status | Notes |
|---|---|---|---|
| `src-tauri/src/llm.rs` | Gemini | `production_ready` | Streaming SSE via `generativelanguage.googleapis.com` |
| `src-tauri/src/llm.rs` | Ollama | `production_ready` | `/api/generate`, `/api/embeddings` |
| `src-tauri/src/llm.rs` | HuggingFace | `production_ready` | HF Inference API |
| `src-tauri/src/llm.rs` | Kimi (Moonshot) | `production_ready` | OpenAI-compatible API |
| `src-tauri/src/llm.rs` | OpenAI-compatible | `production_ready` | Generic `/v1/chat/completions` |
| `src-tauri/src/providers.rs` | Factory for all above | `production_ready` | Creates provider Arcs from config/agent/request |

## 4. Model Registries & Routing

| File | Status | Notes |
|---|---|---|
| `frontend/src/react/types/seed.ts` | `mocked` | Hardcoded `models`, `agents`, `memories`, `sessions`, `cacheEntries`, `plugins`, `initialMessages`, `promptTemplates` |
| `src-tauri/src/commands/mod.rs` (list_models) | `mocked` | Hardcoded `gemini_models` and `ollama_models` arrays |
| `src-tauri/src/commands/mod.rs` (get_recommended_models) | `mocked` | Hardcoded JSON array of recommended models |
| `src-tauri/src/commands/agent.rs` (get_recommended_models) | `mocked` | Hardcoded ~20 recommended models with marketing descriptions |
| `src-tauri/src/hf_model_mgr.rs` (get_curated_steam_deck_models) | `mocked` | Hardcoded GGUF models with fake `downloads`, `likes`, `tags` |
| `src-tauri/src/providers.rs` (default_agents) | `partially_mocked` | Hardcoded 9 agent profiles; acceptable as fallback only |
| `src-tauri/src/models.rs` (PERSONAS, THEMES) | `partially_mocked` | Bundled personas/themes; low severity |

## 5. Agent/Model Routing

| File | Status | Notes |
|---|---|---|
| `src-tauri/src/providers.rs` | `production_ready` | `provider_for`, `provider_from_agent`, `create_provider` |
| `src-tauri/src/commands/mod.rs` (send_command) | `production_ready` | Respects explicit `provider`/`model` from request |
| `frontend/src/react/App.tsx` | `production_ready` | Passes selected provider/model to chat stream |
| `frontend/src/react/services/bridgeAdapter.ts` | `production_ready` | Fixed WebSocket `/ws` path; routes `send_command` |

## 6. Diagnostics Files

| File | Status | Notes |
|---|---|---|
| `src-tauri/src/commands/system.rs` | `production_ready` | `get_system_health`, `generate_support_bundle` with redaction |
| `frontend/src/react/features/diagnostics/DiagnosticsView.tsx` | `production_ready` | Renders diagnostics state |
| `frontend/src/react/services/bridgeAdapter.ts` (fallbackDiagnostics) | `partially_mocked` | Synthetic fallback when bridge unreachable |

## 7. Local Runtime Integration

| File | Runtime | Status | Notes |
|---|---|---|---|
| `src-tauri/src/ollama_mgr.rs` | Ollama | `production_ready` | `/api/tags`, `/api/delete` |
| `src-tauri/src/llm.rs` (OpenAICompatProvider) | LM Studio | `not_configured` | Works if base URL set; no auto-discovery |
| `src-tauri/src/hf_model_mgr.rs` | HuggingFace local | `partially_mocked` | Download logic real; curated list mocked |
| `src-tauri/src/llm.rs` | llama.cpp server | `not_configured` | No dedicated client; could use OpenAICompatProvider |

## 8. IPC / Preload / Renderer

| File | Status | Notes |
|---|---|---|
| `electron/ipc-registry.js` | `production_ready` | Single source of truth for registered channels |
| `electron/ipc-channels.js` | `legacy_pending_migration` | Drift from `ipc-registry.js`; allowlist guard uses this |
| `electron/preload.js` | `production_ready` | Exposes typed `window.neurodeck.*` APIs |
| `electron/ipc-handlers.js` | `production_ready` | Handles model/session/memory/settings IPC |
| `frontend/src/react/services/bridgeAdapter.ts` | `production_ready` | Bridge-only adapter |

## 9. UI Components

| File | Status | Notes |
|---|---|---|
| `frontend/src/react/features/models/ModelsView.tsx` | `partially_mocked` | Renders seed models; detection Ollama-only |
| `frontend/src/react/components/cards/ModelCard.tsx` | `production_ready` | Renders model card |
| `frontend/src/react/features/settings/SettingsView.tsx` | `partially_mocked` | Hardcoded provider list (`offline-draft`, `ollama`, `lmstudio`) |

## 10. Tests

| File | Status | Notes |
|---|---|---|
| `tests/contract/provider-contracts.test.ts` | `production_ready` | Updated for bridge-only adapter |
| `frontend/src/react/__tests__/**/*.test.tsx` | `production_ready` | 335 frontend tests passing |
| `src-tauri/src/llm.rs` (tests) | `production_ready` | Updated Ollama default model test |

## 11. Summary Counts

| Class | Count |
|---|---|
| `production_ready` | 14 |
| `partially_mocked` | 7 |
| `mocked` | 5 |
| `not_configured` | 3 |
| `legacy_pending_migration` | 1 |

## 12. Remediation Priority

1. Remove/replace hardcoded model catalogs in `seed.ts`, `commands/mod.rs`, `commands/agent.rs`, `hf_model_mgr.rs`.
2. Extend model discovery beyond Ollama.
3. Reconcile IPC channel allowlist with registry.
4. Expand settings provider list to match backend providers.
