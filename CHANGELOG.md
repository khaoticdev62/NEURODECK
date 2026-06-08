# Changelog

All notable changes to NEURODECK are documented in this file.

Format: [Semantic Version - Codename] — Release Date

---

## [1.8.0-ptah] — 2026-06-08

### Added
- **6 new views wired into navigation**: Git, API Lab, CLI Maker, Graph, Orchestrator, IDE — all fully implemented and now accessible from the nav bar and L2 radial menu
- **MCP server** on `localhost:13337` — JSON-RPC 2.0, bearer token auth with `subtle::ConstantTimeEq`, tool whitelist
- **Universal full-text search** (SQLite FTS5) across sessions, memory records, and projects
- **Context Packs** — named knowledge bundles with scoped RAG injection per project
- **Privacy levels** — Standard / Private / Sensitive / Sealed with AES-GCM encrypted sealed memory (ring crate, PBKDF2 100k iterations)
- **Projects** — isolated knowledge spaces with session + memory aggregation
- **Dashboard** — real-time workspace stats (session count, memory size, provider health, privacy breakdown)
- **Orchestrator** — multi-agent task decomposition with configurable pipeline steps
- **Plugin marketplace** — install plugins from GitHub raw URLs, hot-reload without restart
- **Canvas code execution streaming** — Python/Bash/JS/PowerShell via `exec_code_stream`, 120s timeout, streamed output
- **Whisper STT** — speech-to-text via `whisper.cpp` CLI subprocess, model auto-detection
- **PromptFlow integration** — 15 production audit prompts, `npm run promptflow:*` scripts
- **KFMS v1.0 governance** — `infra/meta/meta.json` schema, post-commit stamping, 12 CI workflow gates
- **Electron security hardening**: CSP via `webRequest.onHeadersReceived`, `contextIsolation: true`, `nodeIntegration: false`, `will-navigate` allowlist, dialog option sanitization
- **`generate_support_bundle`** — redacted diagnostic archive (scrubs API keys, bearer tokens, absolute paths)
- **`get_system_health`** — structured JSON health report (provider, model, memory_doc_count, plugin_count, kfms_version, issues)
- **DeckCode input daemon** — gamepad sequence → macro/snippet injection, schema in `assets/deckcode/`
- **LSP client manager** — multi-language server (stdio JSON-RPC), diagnostics routed as WebSocket events
- **`NEURODECK_SAFE_MODE`** env var — skips all Lua plugin loading at sidecar boot
- **`NEURODECK_PORT`** env var — overrides bridge port (default 9477); Electron auto-selects 9477–9577

### Fixed
- Scheduler view form inputs were not wired — HTML element IDs now match JS expectations (`scheduler-add-btn`, `scheduler-name-input`, `scheduler-cron-input`, `scheduler-goal-input`)
- `start_remote_server` / `stop_remote_server` incorrectly listed as unavailable in catch-all error — now correctly documented as active bridge commands
- Bridge deckcode schema paths updated from `deckcode_unzipped/` (deleted) to `assets/deckcode/`
- Persona list returned full PERSONAS static list instead of DB-only custom personas

### Changed
- **Architecture migrated from Tauri v2 to Electron 36 + axum bridge** — Rust sidecar on `localhost:9477`, `neurobridge.js` replaces `@tauri-apps/api`
- `lib.rs` refactored — commands moved to `commands/` sub-modules; `AppState` slimmed
- `main.js` frontend split into 30+ ES modules (chat.js, canvas.js, memory.js, agent.js, settings.js, radial.js, etc.)
- KFMS codename advanced from Ra (1.2.x) through Bastet (1.6.x) to **Ptah (1.8.x)**
- Unit test count: 78 → **111** (`cargo test --lib`)
- Integration tests: 0 → **10** (`cargo test --tests`)

### Removed
- `deckcode_unzipped/` — schema files moved to `assets/deckcode/`
- `temp_inspect/`, `scratch/`, obsolete dev scripts from `scripts/` root — reorganized to `scripts/dev/`
- `tauri.conf.json` — replaced by Electron + bridge architecture

---

## [1.6.0-bastet] — 2026-05-30

### Added
- Command injection hardening — regex-based detection, blocklist bypass prevention
- Safe error handling across all command handlers (`map_err(|e| e.to_string())`)
- 30+ browser dialogs replaced with accessible modals for Steam Deck Game Mode

### Fixed
- `EGL_BAD_PARAMETER` crash on Steam Deck via system libwayland LD_PRELOAD + GDK_BACKEND=x11
- Blank white page on Steam Deck via `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- CI/CD GitHub Actions version alignment

---

## [1.4.0-osiris] — 2026-04-15

### Added
- Workflow engine (9 node types: trigger, condition, action, http, code, sleep, notify, fork, join)
- Scheduler with cron jobs (tokio-cron-scheduler), persisted to `data/scheduler/tasks.json`
- LAN P2P file transfer + Warpinator gRPC server
- Canvas LAN collaboration (TCP host/join)

---

## [1.2.0-ra] — 2026-03-01

### Added
- Initial public release
- Chat + RAG memory (cosine-similarity vector DB)
- PTY shell (multi-session via portable-pty)
- SSH client, FTP/SFTP manager
- Lua plugin system (mlua 5.4, hot-reload)
- Steam Deck controller navigation (L2 radial menu, D-pad tab cycling)
- Gemini + Ollama + OpenAI-compat providers
