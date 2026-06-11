# CONNECTION MATRIX

| Category | Connection / Feature | Preload Method | IPC Channel | Request Schema | Response Schema | Main Handler | Service Layer / Target | Auth | Health Probe |
|---|---|---|---|---|---|---|---|---|---|
| **LSP** | Start LSP Server | `lsp.startServer` | `lsp:start-server` | `{ language: string, command: string, args: string[] }` | `LspStartResponse` | `lsp.handlers.js` | `lsp-manager.js` (stdio) | None | Spawns process, handshakes |
| **LSP** | Hover Tooltip | `lsp.hover` | `lsp:hover` | `{ language: string, uri: string, line: number, character: number }` | `LspHoverResponse` | `lsp.handlers.js` | `lsp-transport.js` (JSON-RPC) | None | Request `textDocument/hover` |
| **LSP** | Completions | `lsp.completion` | `lsp:completion` | `{ language: string, uri: string, line: number, character: number }` | `LspCompletionResponse` | `lsp.handlers.js` | `lsp-transport.js` (JSON-RPC) | None | Request `textDocument/completion` |
| **AI** | List Models | `models.list` | `models:list` | None | `ModelListResponse` | `models.handlers.js` | Rust Sidecar `/api/ollama_list_models` | None | Checks sidecar health |
| **AI** | Run LLM Prompt | `models.runPrompt` | `models:run-prompt` | `{ prompt: string, provider: string, model: string }` | `PromptResponse` | `models.handlers.js` | Rust Sidecar `/api/send_command` | API Key (Gemini) | Endpoint ping + config read |
| **Storage** | Save Session | `sessions.save` | `sessions:save` | `SavedSessionPayload` | `SaveSessionResponse` | `sessions.handlers.js` | Rust Sidecar `/api/save_session` | None | Write/read/delete temp file |
| **Memory** | Search vector facts | `memory.search` | `memory:search` | `{ query: string }` | `MemorySearchResponse` | `memory.handlers.js` | Rust Sidecar `/api/memory_list` | None | Search with empty query |
| **System** | Connection Health | `diagnostics.getConnectionMatrix` | `diagnostics:connection-matrix` | None | `ConnectionHealthResponse` | `diagnostics.handlers.js` | `connectionRegistry.js` | None | Self health-matrix check |
| **System** | System Telemetry | `diagnostics.runHealthProbe` | `diagnostics:run-probe` | `{ id: string }` | `ConnectionHealth` | `diagnostics.handlers.js` | `healthProbeRunner.js` | None | Executes real probe |
| **Settings** | Get Configuration | `settings.get` | `settings:get` | `{ key: string }` | `SettingsGetResponse` | `settings.handlers.js` | Rust Sidecar `/api/get_config` | None | Read validation probe |
