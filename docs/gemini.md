# GEMINI.md — Gemini Integration Reference

Technical reference for NEURODECK's Gemini API integration. Updated as the codebase evolves.

---

## Current Status

Gemini is the **primary LLM provider** and the only provider that supports:
- Streaming SSE responses (`send_command`, `execute_command_stream`)
- Embedding generation for RAG context injection
- Vision input (screenshot attachment via `screenshot-btn`)
- Roundtable discussion mode (`/discuss p1 p2 topic`)

Ollama is the fallback for local/offline use. Embedding generation silently skips on Ollama, disabling RAG.

---

## Authentication

The API key is resolved in priority order in `GeminiProvider::get_api_key()` (`src-tauri/src/llm.rs`):

1. `api_key_override` field (set via `GeminiProvider::new_with_key()`)
2. `GEMINI_API_KEY` environment variable
3. OS keychain via `neurodeck_infrastructure::secrets::get_gemini_api_key()`

**For development**: set `GEMINI_API_KEY` before launching `npm run tauri dev`.

**For production**: store via the Settings modal → "Save Key to Keychain" which calls `save_gemini_api_key` (keyring 2.x, not 3.x — uses `set_password` / `delete_password`).

**For test/one-off calls**: use `GeminiProvider::new_with_key(model, key)` — this avoids mutating the global env var which would race with concurrent streaming calls in a multi-threaded async context.

---

## Provider API

Defined in `src-tauri/src/llm.rs`.

```rust
// Standard construction — reads key from env/keychain
GeminiProvider::new(model: String) -> Self

// Key-override construction — bypasses env/keychain lookup
GeminiProvider::new_with_key(model: String, key: String) -> Self
```

### Streaming

`GeminiProvider` implements `LlmProvider::stream_response()` which returns a `Pin<Box<dyn Stream<Item = Result<String, String>>>>`. The stream yields raw token chunks as they arrive from the SSE endpoint.

The active model is read from `AppState.config.llm.gemini_model` (default: `gemini-1.5-flash`). Available models vary by API key tier — set a different model in `llm-term.toml` under `[llm] gemini_model = "..."`.

### Embedding

`generate_embedding(text: &str) -> Result<Vec<f32>, String>` calls `models/text-embedding-004`. Used by `send_command` in `commands/session.rs` to generate query embeddings for RAG search. If the call fails (key missing, quota exceeded, offline), RAG is silently skipped for that message.

**Important**: facts stored via `memory_add_fact` are saved with `embedding: vec![]`. `MemoryDB::search()` explicitly filters these out before similarity ranking — they will never appear in RAG top-N results regardless of query content.

### Vision

The `send_command` path in `commands/session.rs` accepts an optional `image_b64: Option<String>` parameter. When set, it is included as an `inlineData` part in the Gemini request alongside the text prompt. The frontend wires this via the `📸` screenshot button in the chat input bar.

---

## Request / Response Format

NEURODECK uses the **Gemini v1beta REST API** with Server-Sent Events (SSE):

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}
```

The request body is a `GenerateContentRequest` with:
- `contents[]` — conversation turn history (user/model alternating)
- `systemInstruction` — active persona system prompt
- `generationConfig.temperature` — from config (default 0.7)

Streamed response chunks are `data: {...}` SSE lines. Each chunk is parsed as `GeminiStreamChunk` → `candidates[0].content.parts[0].text`.

---

## RAG Pipeline

Every user message in `send_command` (commands/session.rs):

1. Calls `generate_embedding(user_message)` → `Vec<f32>`
2. Calls `MemoryDB::search(embedding, top_n=3)` — returns records with non-empty embeddings sorted by cosine similarity descending
3. Prepends matched records to the system context as `"Relevant past context:\n..."`
4. Sends the enriched prompt to Gemini

The embedding model is `text-embedding-004` (768-dimensional vectors). Cosine similarity is computed in pure Rust in `memory.rs`. The vector DB is persisted to `user_config_dir()/data/memory/chat_history.json`.

---

## OAuth / Device Flow

`neurodeck_infrastructure::oauth.rs` implements Google's Device Flow for keychain-free API key acquisition:

1. `request_device_code(client_id)` → returns `device_code`, `user_code`, `verification_url`
2. User visits the URL and enters the code
3. `poll_for_token(client_id, client_secret, device_code)` polls until the token arrives

Requires `google_client_id` set in `llm-term.toml` under `[llm]`. Register at console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs (TV/Device type).

`reqwest` 0.12 is used **without** the `form` feature — `.form()` is not available. The token exchange request uses manual URL encoding with `Content-Type: application/x-www-form-urlencoded`.

---

## Testing the Connection

`test_llm_connection` in `commands/config.rs` sends a single "Say 'success' in 1 word" prompt and checks for any successful chunk. It uses `GeminiProvider::new_with_key()` directly — the global `GEMINI_API_KEY` env var is NOT mutated during the test.

---

## Config Reference (`llm-term.toml`)

```toml
[llm]
default_provider = "gemini"          # "gemini" or "ollama"
gemini_model     = "gemini-1.5-flash"
google_client_id = ""                # Required for Device Flow OAuth
ollama_model     = "llama3"
ollama_base_url  = "http://localhost:11434"
temperature      = 0.7
```

There are two copies of this file — only `src-tauri/llm-term.toml` is read at runtime during `tauri dev`. The root copy is deployed by the installer. Edit both, or rely on `config.rs` path resolution.

---

## Known Limitations

- **No function calling / tool use** — NEURODECK uses free-form text responses and parses agent steps from the text. Gemini's native function-calling API is not wired up.
- **No grounding / search** — Gemini Search grounding is not enabled.
- **No token counting** — the UI shows an estimated token count but does not use the Gemini `countTokens` endpoint.
- **Whisper STT is not Gemini** — the voice input path uses system `arecord`/`espeak` tools, not Gemini's audio models.
- **Quota errors surface as generic stream errors** — a 429 from the API returns as a stream error chunk with the raw error text, not a user-friendly quota warning.
