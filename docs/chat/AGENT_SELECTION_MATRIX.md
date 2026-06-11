# NEURODECK Agent Selection Matrix

## Predefined Agents × Provider Capabilities

| Agent ID | Provider | Model | Internet | Vision | Embedding | Streaming | Steam Deck |
|---|---|---|---|---|---|---|---|
| gemini-flash-lite | Gemini | gemini-2.0-flash-lite | Required | ✓ | ✓ | ✓ (SSE) | ✓ |
| gemini-flash | Gemini | gemini-2.0-flash | Required | ✓ | ✓ | ✓ (SSE) | ✓ |
| gemini-pro | Gemini | gemini-1.5-pro | Required | ✓ | ✓ | ✓ (SSE) | ✓ |
| hf-llama-1b | HuggingFace | Llama-3.2-1B-Instruct | Required | ✗ | ✓ | ✗ | ✓ |
| hf-zephyr-7b | HuggingFace | zephyr-7b-beta | Required | ✗ | ✓ | ✗ | ✓ |
| local-gemma2b | Ollama | gemma2:2b | **Offline** | ✓ | ✓ | ✓ (JSON) | ✓ (~20-30 tok/s) |
| local-llama1b | Ollama | llama3.2:1b | **Offline** | ✓ | ✓ | ✓ (JSON) | ✓ (~50 tok/s) |
| local-phi35 | Ollama | phi3.5:mini | **Offline** | ✓ | ✓ | ✓ (JSON) | ✓ |
| local-hermes3 | Ollama | hermes3:8b | **Offline** | ✓ | ✓ | ✓ (JSON) | ✓ |

## Agent Selection Behavior

### How Selection Affects the Pipeline

1. User selects agent via the agent switcher (main.js `handleAgentSwitch`)
2. `invoke('switch_agent', { id })` → Rust updates `config.active_agent_id` + `AppState.provider`
3. Rust emits `agent_changed` WebSocket event → frontend updates `state.activeAgentId`
4. Next `send_command` call includes `agent_id: state.activeAgentId` in the request body
5. Rust resolves per-request provider: `config.llm.agents[agent_id]` → `provider_from_agent()`
6. LLM request routes to the agent's provider/model

### Per-Request Override

The frontend can pass `agent_id` directly in the `send_command` payload to route a single message to a different agent without changing the global active agent. This is used for the comparison mode and future multi-agent features.

### Availability Rules

- **Gemini agents** → available when `GEMINI_API_KEY` is set (env var or OS keychain)
- **HuggingFace agents** → available when `HF_API_KEY` is set
- **Ollama agents** → available when Ollama is running at `http://localhost:11434`
- **Custom agents** → available if their configured provider/model/base_url is reachable

## Runtime Registry

The Rust backend seeds predefined agents via `providers::default_agents()` on first run. Users can add custom agents via `invoke('add_agent', { agent: {...} })`. All agents (predefined + custom) are returned by `invoke('list_agents')`.

The TypeScript `src/shared/registries/agentRegistry.ts` is a static display cache of the predefined agents — used for instant UI rendering without waiting for `list_agents`. The Rust registry is authoritative.
