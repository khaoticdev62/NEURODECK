# NEURODECK AI Chat System Inventory

**Version:** 1.8.0 (Ptah)  
**Last updated:** 2026-06-11

---

## Architecture Overview

```
User Input (frontend/src/chat.js)
  └─ invoke('send_command', { message, agent_id?, image_base64?, pack_id? })
       └─ neurobridge.js → POST http://127.0.0.1:9477/api/send_command
            └─ src-tauri/src/commands/mod.rs — "send_command" arm
                 ├─ Permission check (requires Network capability)
                 ├─ Per-request agent routing (agent_id → provider_from_agent())
                 ├─ RAG context injection (embedding search → top-3 results)
                 ├─ Persona system prompt lookup
                 └─ provider.stream_response() or chat_with_image()
                      └─ WsBroadcaster → WebSocket ws://127.0.0.1:9477/ws
                           └─ neurobridge.js listen('command_token') → chat.js render
```

---

## Chat Components

| Component | File | Status |
|---|---|---|
| Message composer | `frontend/src/chat.js` | production_ready |
| Chat viewport | `frontend/src/chat.js` | production_ready |
| Streaming handler | `frontend/src/chat.js` | production_ready |
| State singleton | `frontend/src/state.js` | production_ready |
| Bridge IPC | `frontend/src/neurobridge.js` | production_ready |

## Agent Selection Components

| Component | File | Status |
|---|---|---|
| Agent switcher UI | `frontend/src/main.js` | production_ready |
| Agent state | `frontend/src/state.js` (`state.activeAgentId`) | production_ready |
| Agent list API | `invoke('list_agents')` → sidecar | production_ready |
| Agent switch API | `invoke('switch_agent', { id })` → sidecar | production_ready |
| Agent registry (TS) | `src/shared/registries/agentRegistry.ts` | production_ready |

## Provider Routing

| Provider | Auth | Streaming | Vision | Embedding | Status |
|---|---|---|---|---|---|
| Gemini | `GEMINI_API_KEY` env/keychain | SSE | ✓ | ✓ (`text-embedding-004`) | production_ready |
| Ollama | None (local) | JSON line-by-line | ✓ | ✓ | production_ready |
| HuggingFace | `HF_API_KEY` | Non-streaming | ✗ | ✓ | production_ready |
| Kimi (Moonshot) | `KIMI_API_KEY` | SSE | ✓ | ✓ | production_ready |
| OpenAI-compat | Bearer token (keychain) | SSE | ✓ | ✗ | production_ready |

## Predefined Agents (8 total)

| ID | Name | Provider | Model |
|---|---|---|---|
| gemini-flash-lite | Flash Lite | gemini | gemini-2.0-flash-lite |
| gemini-flash | Flash | gemini | gemini-2.0-flash |
| gemini-pro | Pro | gemini | gemini-1.5-pro |
| hf-llama-1b | HF Llama 1B | huggingface | meta-llama/Llama-3.2-1B-Instruct |
| hf-zephyr-7b | HF Zephyr 7B | huggingface | HuggingFaceH4/zephyr-7b-beta |
| local-gemma2b | Gemma 2B | ollama | gemma2:2b |
| local-llama1b | Llama 1B | ollama | llama3.2:1b |
| local-phi35 | Phi 3.5 Mini | ollama | phi3.5:mini |
| local-hermes3 | Hermes 3 | ollama | hermes3:8b |

## WebSocket Events (chat-related)

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `command_token` | sidecar → frontend | `{ token: string }` | Streaming text delta |
| `command_done` | sidecar → frontend | `{ status: 'complete' }` | Stream complete |
| `command_error` | sidecar → frontend | `{ error: string }` | Stream failed |
| `rag_sources` | sidecar → frontend | `RagSourceEntry[]` | RAG context used |
| `agent_changed` | sidecar → frontend | `{ id, name, provider, model }` | Agent switched |

## Bugs Fixed (2026-06-11)

1. **`prompt` → `message` key** — `chat.js` was sending `{ prompt: text }` but Rust extracted `args.get("message")`. Fixed: `chat.js` now sends `{ message: text }` and Rust has `.or_else(|| args.get("prompt"))` fallback.
2. **`switch_agent` not updating provider** — Rust `switch_agent` now calls `provider_from_agent()` and updates `AppState.provider` after saving config.
3. **`agent_changed` event not emitted** — `switch_agent` now broadcasts the event via `WsBroadcaster`.
4. **`add_agent` nested args** — Frontend sends `{ agent: {...} }`. Rust now checks nested `agent` object before falling back to flat args.
5. **Per-request agent routing** — `send_command` now accepts optional `agent_id` and constructs a temporary provider from that agent's config for the duration of the request.

## Shared Contracts

| File | Purpose |
|---|---|
| `src/shared/contracts/chat.contracts.ts` | Wire types for chat pipeline |
| `src/shared/contracts/agent.contracts.ts` | Wire types for agent API |
| `src/shared/contracts/providers.contracts.ts` | Provider health + routing types |
| `src/shared/contracts/sessions.contracts.ts` | Session/message types |
| `src/shared/schemas/chat.schemas.ts` | Runtime type guards |
| `src/shared/registries/agentRegistry.ts` | Static mirror of predefined agents |
