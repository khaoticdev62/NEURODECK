# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

NEURODECK is a desktop app (originally Tauri v2, now transitioning to an **Electron + axum bridge** architecture) that turns a Steam Deck into an AI-powered terminal OS — LLM chat, live code canvas, PTY shell, autonomous agent, vector memory, LSP, workflow automation, and gamepad-native navigation in one 1280×800 fullscreen window.

**Architecture shift**: `tauri.conf.json` has been deleted. The Rust backend now runs as a standalone sidecar process exposing an axum HTTP + WebSocket server on `localhost:9477`. The Electron shell loads the frontend and communicates via `neurobridge.js` instead of Tauri's `invoke()` / `listen()`. See `bridge.rs` and `neurobridge.js`.

---

## Non-Obvious Tooling & Quirks

- **Two config files exist**: `llm-term.toml` at the project root AND `src-tauri/llm-term.toml`. The Rust binary reads `src-tauri/llm-term.toml` during `cargo run` / `tauri dev` (working dir is `src-tauri/`). The root copy is what the installer deploys. Always edit both or let `config.rs` path logic handle it.
- **`GEMINI_API_KEY` must be set as an env var** before `npm run tauri dev`. If absent, the binary silently falls back to Ollama with no user-visible error.
- **Vite dev standalone** (`npm run --prefix frontend dev`) works for CSS/HTML iteration but all `invoke()` calls will fail — the dev-mode mock IPC shim has been removed. To test real commands, use `npm run tauri dev`.
- **Lua auto-loads on startup**: every `.lua` file in `plugins/` is loaded at app init via `lua.rs`. A syntax error in any plugin silently suppresses that plugin — check the terminal console for `[Lua Error]` lines.
- **Rust version is pinned to 1.92.0** in `Cargo.toml`. The `mlua` crate with `vendored` feature compiles Lua 5.4 from source — first build takes 2–3 minutes.
- **suppaftp 6.x `retr_as_buffer`** returns `Cursor<Vec<u8>>` and loads the entire file into RAM. Don't use it for files > 100MB.

---

## Architecture Map

### IPC Flow
```
frontend/src/neurobridge.js
  └─ invoke("command_name", { args })  ──►  POST http://localhost:9477/api/{command}
  └─ listen("event_name", handler)     ◄──  WebSocket  ws://localhost:9477/ws
```
`neurobridge.js` is a drop-in replacement for `@tauri-apps/api`. It wraps HTTP fetch (for commands) and a WebSocket (for backend→frontend events). All streaming (LLM tokens, PTY output, agent steps) goes through the WebSocket. All request/response goes through `POST /api/{command}`. The Rust sidecar binds to `127.0.0.1:9477` by default; override with the `NEURODECK_PORT` env var. `GET /health` is polled by Electron to know the sidecar is ready.

### The One Big File Problem
`lib.rs` (~1600 lines) owns everything: command handlers, app state structs, persona definitions, theme palettes, game detection, voice I/O, and the agent loop. When adding a new feature, look for the existing pattern first before adding a new state struct — `AppState` is a grab-bag of `Arc<Mutex<T>>` fields.

`main.js` (~8150 lines) is the frontend shell — HTML templates, view routing, IPC wiring, boot sequence, radial menu, and all one-off UI logic. Feature sections are delimited by `// ===` banner comments. New features go at the end of their section, not at the bottom of the file. **Do not search for partial strings in template literals** — always match a full containing element.

The heavy logic modules have been extracted from `main.js` into ES modules:

### Frontend Module Split (ES Modules under `frontend/src/`)
| Module | What It Owns |
|---|---|
| `main.js` | HTML templates, view routing, IPC wiring, boot/onboarding, one-off view init |
| `neurobridge.js` | Drop-in replacement for `@tauri-apps/api` — wraps HTTP + WebSocket; **all `invoke()`/`listen()` calls go here** |
| `chat.js` | All chat logic — send flow, RAG context, streaming, history, persona/theme switching, welcome screen |
| `agent.js` | Agent loop, roundtable mode, computer/browser tool dispatch |
| `memory.js` | Memory view — list, filter, pin, delete, add fact |
| `notifications.js` | `addNotification()`, toast rendering, badge management; also sets `window.addNotification` for legacy callers |
| `canvas.js` | Monaco editor, live preview, collab host/join/stop, AI edit modal |
| `terminal.js` | xterm.js sessions, tab management, PTY wiring, SSH tab |
| `state.js` | Shared mutable state object (singleton) |
| `icons.js` | `createIcon()` / `applyButtonIcon()` — Lucide SVG icon factory |
| `settings.js` | Settings modal — all settings read/write, theme/persona/LLM config UI |
| `radial.js` | Radial menu segment registry and L2/backtick menu rendering |
| `ctrl_prompt.js` | Controller prompt picker — gamepad-native shortcut/prompt selection UI |
| `shortcuts.js` | Keyboard shortcut bindings and command palette trigger |
| `slash-commands.js` | Slash command parser and dispatch (e.g., `/formula`, `/promptgen`) |
| `palette-commands.js` | Command palette command definitions |
| `dashboard.js` | Dashboard view — system stats, quick-launch widgets |
| `api_lab.js` | API Lab view — interactive HTTP request builder |
| `cli_maker.js` | CLI Maker view — visual CLI argument builder |
| `git.js` | Git view — status, diff, commit, branch ops via bridge |
| `ide_view.js` | IDE view — file tree, editor tabs, run integration |
| `lsp_client.js` | LSP client — sends textDocument requests over the bridge, renders diagnostics |
| `graph_view.js` | Graph view — knowledge/memory relationship visualizer |
| `orchestrator.js` | Orchestrator view — multi-step LLM pipeline builder |
| `remote_control_view.js` | Remote control view — UDP remote session UI |
| `scheduler_view.js` | Scheduler view — cron job list/create/delete UI |
| `workflow_view.js` | Workflow view — DAG workflow definition and execution UI |
| `torrent.js` | Torrent view — BitTorrent/magnet link UI |
| `haptics.js` | Haptic feedback helpers for Steam Deck gamepad |
| `focus-trap.js` | Focus trap utility for modals/drawers |

### Rust Module Responsibilities
| Module | What It Owns |
|---|---|
| `lib.rs` | All command handler registration, `AppState`, themes, personas, game detection, voice I/O |
| `bridge.rs` | **axum HTTP + WebSocket server** on `127.0.0.1:9477` — `POST /api/{cmd}` routes all commands, `GET /ws` streams events, `GET /health` is the readiness probe |
| `llm.rs` | `GeminiProvider` (streaming SSE) and `OllamaProvider` (local); `generate_embedding()` for RAG |
| `lua.rs` | mlua runtime; globals: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona` |
| `pty_manager.rs` | PTY sessions via `portable-pty`; `HashMap<String, PtySession>` keyed by session ID; supports multiple sessions |
| `memory.rs` | Cosine-similarity vector DB; persists to `user_config_dir()/data/memory/` |
| `ftp.rs` | FTP list/download/upload via `suppaftp`; all sync ops wrapped in `spawn_blocking` |
| `sftp.rs` | SFTP via SSH subprocess (`ssh`/`sftp` CLI); wraps `std::process::Command` in `spawn_blocking` |
| `tunnel.rs` | TCP loopback tunnel for SteamOS Game Mode → Desktop Mode bridge |
| `transfer.rs` | LAN P2P file transfer + Warpinator gRPC server; uses mDNS/mdns-sd peer discovery |
| `canvas_collab.rs` | TCP live canvas collaboration — host binds a port, join connects to peer |
| `sync.rs` | Cross-device encrypted sync over HTTPS |
| `autocomplete.rs` | Terminal autocomplete — command/path/history suggestions for the PTY |
| `computer_use.rs` | Screenshot capture and computer-use tool support (base64 image encoding) |
| `doc_indexer.rs` | Document indexer — crawls files/URLs into `MemoryRecord` embeddings for RAG |
| `hf_model_mgr.rs` | HuggingFace model manager — download/list/delete local GGUF/ONNX models |
| `lsp.rs` | LSP client manager — one stdio JSON-RPC language server per language; publishes `lsp:diagnostics` events |
| `ollama_mgr.rs` | Ollama model lifecycle — pull, list, delete models via the Ollama REST API |
| `orchestrator.rs` | Multi-step LLM orchestration — chained prompts with tool dispatch and state |
| `plugin_mgr.rs` | Plugin lifecycle manager — load/unload/reload Lua plugins at runtime |
| `remote_control.rs` | UDP remote control server — accept remote keystrokes/commands over LAN |
| `scheduler.rs` | Cron scheduler via `tokio-cron-scheduler` — persist and fire timed Lua/workflow jobs |
| `workflow.rs` | Workflow runner — DAG step executor integrated with the scheduler |
| `commands/` | Sub-module split: `session.rs`, `config.rs`, `system.rs`, `agent.rs`, `browser.rs`, `api_lab.rs`, `cli_maker.rs`, `git.rs`, `ide.rs` |
| `deckcode/` | DeckCode input orchestration: schema parsing (`schema.rs`, `multilang_schema.rs`), raw input loop (`input.rs`), bindings mapping (`resolver.rs`), and frontend IPC dispatch (`dispatch.rs`) |

### New `commands/` Sub-Modules
| Sub-module | What It Owns |
|---|---|
| `api_lab.rs` | Interactive API Lab — save/run HTTP request presets, view response history |
| `cli_maker.rs` | CLI Maker — generate CLI argument schemas and command templates |
| `git.rs` | Git commands — status, diff, log, commit, branch, stash via `git` subprocess |
| `ide.rs` | IDE workspace — file tree listing, open/save/rename files in `user_config_dir()/workspace/` |

### Infrastructure Crate (`infrastructure/`)
A workspace crate (`neurodeck_infrastructure`) providing platform services. Used by `src-tauri` as a path dependency.

| Module | What It Owns |
|---|---|
| `secrets.rs` | OS keychain (keyring 2.x) — `save_gemini_api_key`, `get_gemini_api_key`, `delete_gemini_api_key`, `test_keychain_access` |
| `oauth.rs` | Google OAuth2 Device Flow — `request_device_code` → `poll_for_token`; reads `google_client_id` from config |
| `warpinator.rs` | Warpinator-compatible gRPC server (tonic 0.11); `WarpinatorCallbacks` trait; `start_warpinator_service(callbacks, port)` |

**Key infrastructure quirks:**
- `keyring` is pinned to `2.3` — uses `delete_password()` NOT `delete_credential()` (that's 3.x API)
- `tonic-build` 0.11 uses `.compile()` not `.compile_protos()` — `build.rs` uses `unsafe { set_var("PROTOC", ...) }`
- `reqwest` 0.12 without `form` feature has no `.form()` method — use manual URL encoding with `Content-Type: application/x-www-form-urlencoded`
- `mdns-sd` pinned to `0.11` for the `HashMap<String, String>` properties API in `ServiceInfo::new()`

### RAG Is Active
Memory context injection is live in `send_command` (commands/session.rs): every user message generates an embedding via `provider.generate_embedding()`, searches the vector DB for top-3 relevant records, and prepends them to the LLM context. This requires the Gemini API key to be set — if Ollama is active, embedding generation may fail silently and RAG is skipped.

**RAG search skips zero-embedding records** — facts added via `memory_add_fact` are stored with an empty embedding vector. `MemoryDB::search()` filters them out before similarity ranking so they don't crowd out real context at 0.0 similarity.

### PTY Session Routing
`pty_output` and `pty_exit` events carry a session `id` field. Multiple PTY sessions can coexist in `PtyState.sessions`. The main terminal uses `ptySessionId = "main_pty_session"`. The SSH tab creates sessions named `ssh_session_<timestamp>`. Both are routed in the same `listen("pty_output", ...)` handler by ID.

### CSS Specificity Trap (was live bug)
ID selectors (`#view-*`) have specificity 100, which beats `.view-content.active` (specificity 20). **Never add `display: flex` or `display: block` to `#view-*` ID rules** — it will permanently override the `.view-content { display: none }` hide rule and break tab switching. Use `flex-direction`, `overflow`, `background` on ID rules only.

---

## Rules

- **Every new backend command** must be: (1) defined as an `async fn` in a `commands/` sub-module, (2) registered in `bridge.rs`'s router via `.route("/api/command_name", post(...))`. The Tauri `generate_handler![]` macro is no longer used — the bridge routes directly.
- **CSS changes**: run `npm run --prefix frontend build` after edits to `app.css` — the Vite dev server hot-reloads CSS but Tauri's WebView doesn't always pick up the change without a rebuild.
- **Persona/theme additions**: personas are `HashMap` entries in the `PERSONAS` lazy_static in `lib.rs`; themes are `THEMES`. Add entries there, then update the `get_personas` / `get_themes` command return format to match what the settings modal JS expects.
- **New PTY sessions**: always call `pty_kill` for the session ID before `pty_spawn` with the same ID. The backend now auto-evicts via `sessions.remove(&id)` before insert, but the rule still stands — double-spawning without kill leaves a brief reader-thread overlap that can emit duplicate output events.
- **FTP/SSH backend**: use `tokio::task::spawn_blocking` for all `suppaftp` and `std::net::TcpStream` calls — they are synchronous and will block the async executor if called directly.
- **All persistent data paths** must use `user_config_dir()` (defined in `lib.rs`) — never `./data/` or `./sessions/` relative paths. CWD-relative paths fail silently on read-only SteamOS install paths.
- **Window size**: all new views must fit within 1280×800. The flex column layout in `.view-container` is `position: absolute; top: 0; left: 0; width: 100%; height: 100%`. Use `overflow: hidden` on view roots and scroll internally.

---

## Hard Constraints / Anti-Patterns

- **Do not add `display: flex` to `#view-*` ID rules in app.css** — kills tab switching (see CSS Specificity Trap above).
- **Do not call `pty_spawn` without a preceding `pty_kill`** for the same session ID.
- **Do not load the full FTP file into a `Vec<u8>` for files that could be large** — `retr_as_buffer` is for small files only. Stream to disk for anything user-selectable.
- **Do not use `unwrap()` in Tauri command handlers** — panics crash the backend process and the frontend gets a blank error. Use `map_err(|e| e.to_string())?`.
- **Do not modify `main.js` HTML template strings by searching for partial strings** — the template is one massive string literal. Always match a full containing element to avoid ambiguous edits.
- **Do not add npm packages** — the frontend is intentionally zero-dependency except for `xterm.js`, `marked.js`, and `neurobridge.js` (local). Adding a bundled npm package will bloat the Electron renderer bundle.
- **Never hardcode the config file path** as just `"llm-term.toml"` — always use the path-resolution logic in `lib.rs` that checks for `../llm-term.toml` first.
- **Never use `./data/` or `./sessions/` relative paths** in Rust — always call `user_config_dir().join("data/...")`. CWD-relative paths work in `tauri dev` but fail on read-only SteamOS installs.
- **Never mutate `GEMINI_API_KEY` env var globally** — use `GeminiProvider::new_with_key(model, key)` for key injection in test/one-off paths. Mutating the env var races with concurrent `send_command` calls.
- **Blocking commands in async Tauri handlers must use `spawn_blocking`** — `std::process::Command::output()` blocks the Tokio executor thread. Only `execute_command` and `get_context_stats` were patched; apply the same pattern to any new sync I/O.

---

## Deeper Docs

| Resource | Location |
|---|---|
| Full feature backlog + priority matrix | `docs/ANTIGRAVITY_HANDOFF.md` |
| Project identity, sprint history, command registry | `docs/project-context.md` |
| Steam Deck Game Mode integration | `docs/gamescope_guide.md` |
| Steam Input controller mapping | `docs/steam_input_guide.md` |
| User-facing feature documentation | `docs/USER_GUIDE.md` |
| BMAD agent personas + sprint config | `_bmad/custom/config.toml` |
| Sprint artifacts | `_bmad-output/implementation-artifacts/` |

---

## Gotchas / Tribal Knowledge

- **The config path `../llm-term.toml` fallback** was added because the binary's working directory during `tauri dev` is `src-tauri/`, not the project root. Four copies of `llm-term.toml` exist across the project (`root`, `src-tauri/`, `assets/`, `dist/`). Only `src-tauri/llm-term.toml` is read at runtime. This is load-bearing — don't remove the path check.

- **`google_client_id` must be set in `llm-term.toml`** under `[llm]` for the OAuth Gemini sign-in flow to work. `start_oauth_flow` reads it from `AppState.config.llm.google_client_id` and returns an error if empty. Register a client at console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs (TV/Device type).

- **Canvas Python/Bash "run" does nothing** — the Run button for non-HTML canvas languages shows a "run hint" message but does not execute code. The Agent tab is what actually runs Python/Bash. This is intentional-ish but confusing — it's flagged in `ANTIGRAVITY_HANDOFF.md` as a must-fix.

- **`send_command` vs `execute_command_stream`** — there are two different LLM invocation paths. `execute_command_stream` is the older streaming path. `send_command` is the newer, fuller path with RAG injection, game context, persona, and memory storage. Always use `send_command` for new features.

- **Voice STT returns raw audio via `arecord`** — the `stop_recording` command returns transcribed text, but the transcription quality depends on whether `espeak`/`arecord` are installed. On Windows, `start_recording` returns a mock string. The STT path does NOT currently use Whisper or any AI model — it's system-tool-limited.

- **The 📊 context drawer toggle exists but the drawer has no content** — the `inspectDrawer` container is wired to the toggle button but no data is injected into it. It looks like a collapsed empty panel. Populating it is listed as Priority 3 in `ANTIGRAVITY_HANDOFF.md`.

- **BMAD personas are Lua-registered, not hardcoded** — `/john`, `/sally`, etc. call `setPersona()` via `plugins/bmad.lua`. If the Lua plugin fails to load, those commands silently disappear. The 9 built-in personas (including the BMAD ones) are also hardcoded in `lib.rs`'s `PERSONAS` map as a fallback.

- **Radial menu uses backtick for keyboard, L2 for gamepad** — but L2 only works if the Steam Input `.vdf` profile is active. In desktop mode without Steam running, only the backtick shortcut works. The radial menu segments are hardcoded to the original 8 views — the new SSH tab is not in the radial menu yet.

- **`pty_spawn` now accepts an `args: Option<Vec<String>>` parameter** — this was added to support SSH sessions. All existing callers pass `args: null` or omit the field.

- **Prompt Lab tab** (`#view-prompt-lab`) was added by the Google Antigravity automated sprint. It exposes AIDA/SCQA/PASTOR/CoT/ToT/PAS/Role+Constraints formulas, a template gallery, and a JPE explanation pane backed by `generate_jpe_explanation` (calls the active LLM). The Lua plugin `plugins/promptgen.lua` registers `/promptlab`, `/promptgen <task>`, and `/formula <name> <task>` shell commands.

- **Cinematic boot screen** (`#boot-overlay`) runs as an IIFE at the bottom of `main.js`. It calls `list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, and `get_context_stats` during startup to show real system state. It fades out and is removed from the DOM after completion — it does NOT block app initialization.

- **Onboarding wizard** (`#onboarding-modal`) shown to first-time users; calls `run_onboarding_diagnostics` to check PTY/network/keychain health. Dismissed state is persisted in `localStorage("neurodeck_onboarding_complete")`.

- **Warpinator gRPC** runs on port `42000` inside `transfer.rs`'s `init_transfer_service`. The `STermWarpinatorCallbacks` struct wires the gRPC callbacks to `AppState` and `app_handle.emit()`. Requires protobuf compilation — `infrastructure/build.rs` uses `protoc-bin-vendored` to avoid a system protoc dependency.

- **`GeminiProvider::new_with_key(model, key)`** — added constructor that stores the API key directly on the struct, bypassing global env var lookup. Use this for any one-off or test invocation where you need a specific key without touching `GEMINI_API_KEY`. The default `new()` constructor still reads from env/keychain.

- **All persistent data is stored under `user_config_dir()`** — resolves to `%APPDATA%\neurodeck` (Windows), `~/Library/Application Support/neurodeck` (macOS), `~/.config/neurodeck` (Linux/SteamOS). The subdirectory layout: `data/memory/`, `data/personas.json`, `data/profiles/`, `data/themes/`, `data/prompt_presets.json`, `data/game_notes/`, `data/sync/`, `sessions/`, `exports/`, `logs/`.

- **PTY restart in `restartTerminalSession`** includes a 150ms delay between `pty_kill` and `pty_spawn` — this is intentional. The old reader thread needs time to exit after its master fd closes; without the delay both threads briefly co-exist and emit duplicate `pty_output` events on the same session ID.

- **Canvas collab task lifecycle** — `canvas_collab_stop` must be called explicitly to clean up the backend; the frontend calls it when the user clicks Stop AND when a `peer_disconnected` event fires. The backend `collab_abort` handle being `Some` does NOT mean the connection is alive — always check `peer_count` too.

- **AI-generated shell code has a `window.confirm` gate** in `chat.js` — the Execute button on `bash`/`sh`/`powershell`/`cmd` code blocks shows a confirmation dialog before calling `execute_command_stream`. Lua has the same gate via `runLuaScript()`. Both are intentional security checkpoints.

- **KFMS dirty-flag filtering** — `khaotic-init.sh stamp` excludes the 4 KFMS-managed artifact files (`meta.json`, `health.json`, `CODENAME_REGISTRY.md`, `IMPLEMENTATION_PLAN.md`) from the `git status --porcelain` dirty check. Without this, every post-commit amend would mark the build as dirty on the next stamp.

- **`#[tauri::command]` handlers live in `commands/` sub-modules** — `session.rs`, `config.rs`, `system.rs`, `agent.rs`, `browser.rs` are re-exported via `commands/mod.rs` and imported into `lib.rs` with `use crate::commands::*`. New commands go into the most appropriate sub-module, not directly into `lib.rs`.

- **DeckCode multi-language code snippets** — `deckcode-action` events received on the frontend with the `insert_snippet:` prefix are dynamically injected into the active `textarea` (IDE or Canvas editor), automatically parsing `${cursor}` placeholders to adjust the cursor selection, avoiding generic JS evaluations or hardcoded Monaco commands.

- **`neurobridge.js` is the only IPC entrypoint** — all `invoke()` and `listen()` calls in the frontend import from `./neurobridge.js`, not from `@tauri-apps/api`. If you see a `@tauri-apps/api` import, replace it. The bridge must be running (sidecar started by Electron) before any command calls succeed.

- **Bridge port conflict** — if `NEURODECK_PORT` is not set, the sidecar binds to `9477`. If another process holds that port, the bridge fails silently and all `invoke()` calls reject. Set a different port via env var and update Electron's expected port accordingly.

- **`sftp.rs` uses the system `ssh`/`sftp` CLI** — unlike `ftp.rs` which uses the `suppaftp` crate, SFTP is implemented by spawning the system `sftp` process. Requires `ssh`/`sftp` to be on `PATH`. All calls use `spawn_blocking`.

- **LSP sessions are per-language** — `lsp.rs` maintains one stdio JSON-RPC child process per language (keyed by language ID). Diagnostics are published as `lsp:diagnostics` WebSocket events. `lsp_client.js` subscribes and renders inline markers in the IDE view. Starting two LSP servers for the same language ID replaces the first.

- **Scheduler jobs are cron-string-based** — `scheduler.rs` uses `tokio-cron-scheduler`. Jobs are persisted to `user_config_dir()/data/jobs.json` and rehydrated on startup. Lua snippet jobs call back into the Lua runtime. Workflow jobs call `workflow.rs`'s DAG executor.

- **Ollama manager vs. the original Ollama path** — `ollama_mgr.rs` provides model lifecycle commands (pull, list, delete) against the local Ollama REST API. `llm.rs`'s `OllamaProvider` is still used for actual inference. These are separate concerns — `ollama_mgr.rs` does not replace `OllamaProvider`.

- **`computer_use.rs` captures screenshots as base64** — used by the agent's computer-use tool to pass screen state to the LLM. Does not perform OCR or UI tree extraction natively; the LLM interprets the image directly.

- **`doc_indexer.rs` generates embeddings on ingest** — when indexing a file or URL, it calls `provider.generate_embedding()` and stores a `MemoryRecord` with a real embedding vector. Requires a live Gemini API key. Without it, the record is stored with a zero-vector and RAG search skips it.

- **Production CI workflows** — `.github/workflows/production-ci.yml` and `production-release.yml` are new. CI runs lint, typecheck, Rust `cargo check`, and build. Release workflow builds Windows MSI and Linux AppImage artifacts.

- **`radial.js` is now a standalone module** — the radial menu segment registry was extracted from `main.js`. Add new views to the radial menu by registering them in `radial.js`'s segment array, not in `main.js`.

- **`settings.js` owns all settings UI** — all settings modal logic (read, write, reset, theme preview, LLM config) lives in `settings.js`. `main.js` only mounts the modal; it does not duplicate settings logic.

---

## KFMS v1.0 — Khaotic Foundation Metadata Standard

Version governance for this project. One Egyptian god codename per MINOR version line.

### Codename Assignment
```
REGISTRY[MINOR] = codename
tag format      = v{semver}-{codename_lower}

current: v1.2.x → Ra     (MINOR=2, index 2)
next:    v1.3.x → Osiris  (MINOR=3, index 3)
```

### Key Files
| File | Purpose |
|---|---|
| `infra/meta/meta.json` | Primary KFMS metadata — version, codename, build SHA, governance flags |
| `infra/meta/meta.schema.json` | JSON Schema draft-07 — CI enforces this on every `meta.json` change |
| `infra/meta/CODENAME_REGISTRY.md` | Full 20-god codename table with status and assignment |
| `infra/telemetry/health.json` | BMAD orchestration readiness — 5 boolean checks must all be `true` |
| `scripts/kfms/khaotic-init.sh` | Bootstrap utility: `sweep` / `stamp` / `validate` / `status` |

### KFMS CLI
```bash
./scripts/kfms/khaotic-init.sh sweep     # Move loose root files → .loose/inbox/ (non-destructive)
./scripts/kfms/khaotic-init.sh stamp     # Re-stamp build block (git SHA, tag, timestamp, dirty flag)
./scripts/kfms/khaotic-init.sh validate  # Validate meta.json structure + governance rules
./scripts/kfms/khaotic-init.sh status    # Print KFMS health summary
```

### CI Workflows (`.github/workflows/`)
- `validate-meta-schema.yml` — schema validation on `meta.json` change; runs `ajv` + `khaotic-init.sh validate`
- `validate-codename.yml` — verifies codename maps to correct MINOR, tag format correct, no collision within MAJOR
- `verify-telemetry.yml` — verifies `health.json` presence, all 5 checks true, no version/codename drift from `meta.json`

### Rules When Bumping Versions
- **PATCH bump** (1.1.x): run `./scripts/kfms/khaotic-init.sh stamp` — codename and `meta.json` governance fields stay the same.
- **MINOR bump** (1.2.0): update `meta.json` with new version, `codename.name = "Ra"`, `registry_index = 2`, `minor_line = 2`, `tag = "v1.2.0-ra"`. Update `health.json` version/codename to match.
- **MAJOR bump** (2.0.0): all codenames reset to index 0 → Anubis.
- Loose files at the root: run `sweep` before committing to keep the root clean.

---

## Dev Commands

```bash
npm run tauri dev                     # Legacy hot-reload path (Vite + Rust via Tauri) — may not work post-bridge
npm run build                         # Production build (Electron + bridge sidecar)

npm run --prefix frontend dev         # Frontend only (CSS/HTML — invoke() calls fail without bridge sidecar)
npm run --prefix frontend build       # Vite build only

cd src-tauri && cargo check           # Fast type-check
cd src-tauri && cargo clippy          # Lint
cd src-tauri && cargo build           # Debug build (~2min first time due to mlua vendored)

# Start the bridge sidecar manually for frontend-only dev:
NEURODECK_PORT=9477 cargo run --manifest-path src-tauri/Cargo.toml

./install.sh                          # SteamOS deploy → ~/Applications/neurodeck/
./launch_gamescope.sh                 # Run in gamescope 1280×800 (Steam Deck Game Mode)
.\package_release.ps1                 # Windows MSI packaging
```
