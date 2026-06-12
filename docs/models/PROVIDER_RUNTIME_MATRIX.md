# NEURODECK Provider Runtime Matrix

## 1. Supported Runtimes

| Provider | Type | Local | Steam Deck Recommended | Model Listing | Chat | Streaming | Embeddings | Tools | Vision |
|---|---|---|---|---|---|---|---|---|---|
| Ollama | `ollama` | Yes | Yes | `/api/tags` | `/api/generate` | Yes | `/api/embeddings` | Partial | Via llava |
| LM Studio | `openai_compatible_local` | Yes | Yes | `/v1/models` | `/v1/chat/completions` | Yes | `/v1/embeddings` | Yes | Yes |
| llama.cpp server | `llama_cpp_server` | Yes | Yes | `/v1/models` or health | `/v1/chat/completions` | Yes | `/v1/embeddings` | Yes | Partial |
| OpenAI-compatible remote | `openai_compatible_remote` | No | No | `/v1/models` | `/v1/chat/completions` | Yes | `/v1/embeddings` | Yes | Yes |
| HuggingFace Inference | `huggingface` | No | No | HF Hub API | `/models/{model}` | No | `/models/{model}` | No | No |
| Kimi (Moonshot) | `kimi` | No | No | `/v1/models` | `/v1/chat/completions` | Yes | `/v1/embeddings` | Yes | Yes |
| Gemini | `gemini` | No | No | Google API | `/v1beta/models` | Yes | `/v1beta/models` | Yes | Yes |
| Custom HTTP | `custom_http_provider` | Varies | Varies | Config-defined | Config-defined | Varies | Varies | Varies | Varies |
| Disabled | `disabled_provider` | N/A | N/A | No | No | No | No | No | No |

## 2. Runtime Profiles

### Ollama

```json
{
  "id": "ollama",
  "label": "Ollama",
  "type": "ollama",
  "baseUrl": "http://127.0.0.1:11434",
  "localOnly": true,
  "steamDeckRecommended": true,
  "endpoints": {
    "health": "/api/tags",
    "listModels": "/api/tags",
    "generate": "/api/generate",
    "embeddings": "/api/embeddings",
    "ps": "/api/ps"
  },
  "auth": { "required": false, "envVars": [] },
  "supports": { "modelListing": true, "chat": true, "streaming": true, "embeddings": true, "tools": false, "vision": true, "cancellation": false },
  "selfHealing": { "canRestartService": false, "canReloadModel": true, "canRetryRequest": true, "canFailover": true, "maxRecoveryAttempts": 3 }
}
```

### LM Studio

```json
{
  "id": "lm_studio",
  "label": "LM Studio",
  "type": "openai_compatible_local",
  "baseUrl": "http://127.0.0.1:1234",
  "localOnly": true,
  "steamDeckRecommended": true,
  "endpoints": {
    "health": "/v1/models",
    "listModels": "/v1/models",
    "chat": "/v1/chat/completions",
    "embeddings": "/v1/embeddings"
  },
  "auth": { "required": false, "envVars": [] },
  "supports": { "modelListing": true, "chat": true, "streaming": true, "embeddings": true, "tools": true, "vision": true, "cancellation": false },
  "selfHealing": { "canRestartService": false, "canReloadModel": false, "canRetryRequest": true, "canFailover": true, "maxRecoveryAttempts": 3 }
}
```

## 3. Connection State Definitions

| State | Meaning |
|---|---|
| `unknown` | Not yet probed |
| `not_configured` | No base URL/API key configured |
| `starting` | Service start/restart in progress |
| `connecting` | Probe in flight |
| `connected` | Real health/model-list probe succeeded |
| `degraded` | Reachable but tiny prompt/stream probe failed |
| `offline` | Runtime not reachable |
| `missing_binary` | Required executable missing |
| `missing_model` | Runtime reachable but selected model not loaded |
| `auth_failed` | API key rejected or missing |
| `rate_limited` | Provider returned 429 |
| `crashed` | Runtime crashed |
| `blocked` | Privacy/security policy blocks use |
| `error` | Unclassified error |
| `recovering` | Self-healing in progress |

## 4. Current Matrix Status

| Provider | Current State | Blocker |
|---|---|---|
| Ollama | `production_ready` | None |
| LM Studio | `not_configured` | No auto-discovery; relies on user setting base URL |
| llama.cpp server | `not_configured` | No dedicated client |
| OpenAI-compatible remote | `not_configured` | Requires API key |
| HuggingFace | `production_ready` | Requires API key |
| Kimi | `production_ready` | Requires API key |
| Gemini | `production_ready` | Requires API key |
