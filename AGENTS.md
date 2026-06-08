# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## What This Is

NEURODECK is an Electron desktop app with a Rust sidecar that turns a Steam Deck into an AI-powered terminal OS — LLM chat, live code canvas, PTY shell, autonomous agent, vector memory, and gamepad-native navigation in one 1280×800 fullscreen window.

---

## Non-Obvious Tooling & Quirks

- **Config path resolution (hardened in P3.3)**: `get_config_path()` resolves in this order:
  1. `$NEURODECK_CONFIG_PATH` env var (highest priority)
  2. Primary: `~/.config/neurodeck/llm-term.toml` (Linux), `%APPDATA%\neurodeck\llm-term.toml` (Windows), `~/Library/Application Support/neurodeck/llm-term.toml` (macOS)
  3. Dev fallbacks (only when `CARGO_MANIFEST_DIR` is set): `../llm-term.toml`, `./llm-term.toml`
  4. Legacy fallbacks (deprecated, logs a warning)
  The root `llm-term.toml` is no longer read at runtime unless the env var points to it.
- **`GEMINI_API_KEY` must be set as an env var** before `npm run dev`. If absent, the binary silently falls back to Ollama with no user-visible error.
- **Vite dev standalone** (`npm run --prefix frontend dev`) works for CSS/HTML iteration but all `invoke()` calls will fail — the bridge server is not running. To test real commands, use `npm run dev` (starts Electron + sidecar).
- **Lua auto-loads on startup**: every `.lua` file in `plugins/` is loaded at app init via `lua.rs`. A syntax error in any plugin silently suppresses that plugin — check the terminal console for `[Lua Error]` lines.
- **Rust version is pinned to 1.92.0** in `Cargo.toml`. The `mlua` crate with `vendored` feature compiles Lua 5.4 from source — first build takes 2–3 minutes.
- **FTP downloads stream to disk** (P0.3): `ftp_download_file` uses `retr()` + `std::io::copy` instead of `retr_as_buffer`. A `max_download_size_mb` config gate (default 500MB) rejects oversized transfers before they start. Progress events fire every 1MB.
- **`ELECTRON_RUN_AS_NODE` env var breaks Electron launch**: Some IDEs (Cursor, Antigravity) set this variable. If present, Electron runs as Node.js and `require('electron').app` is `undefined`. The `electron/scripts/dev-launcher.js` wrapper explicitly removes this variable before spawning Electron. Use `npm run dev` from the project root (it uses the launcher).
- **Pure Electron architecture**: The Rust sidecar is 100% Tauri-free. All backend↔frontend communication flows through the bridge server (`bridge.rs`) on `localhost:9477` — HTTP POST for commands, WebSocket for events. There are no Tauri dependencies in `Cargo.toml` and no `tauri.conf.json`.
- **DeckCode input daemon works in bridge mode**: `run_bridge_server()` loads `deckcode-controller-profile.schema.json` and starts the `gilrs` gamepad polling loop. Input events are resolved through `DeckCodeResolver` and dispatched via `WsBroadcaster.emit("deckcode-action", action_id)` to the frontend. The daemon only starts if the schema file is present.

---

## Architecture Map

### IPC Flow
```
frontend/src/main.js
  └─ invoke("command_name", { args })  ──►  neurobridge.js  ──►  POST /api/{cmd}
  └─ listen("event_name", handler)     ◄──  WebSocket  ◄──  WsBroadcaster.emit()
                                                          (Rust sidecar localhost:9477)
```
All streaming (LLM tokens, PTY output, agent steps) goes through WebSocket events. All request/response goes through HTTP POST to the bridge server.

### The One Big File Problem
`lib.rs` owns `AppState`, the bridge server bootstrap, and module re-exports. The Tauri `run()` entry point and `generate_handler![]` have been removed as part of the pure Electron migration. Command bodies, personas, themes, game detection, path utilities, and provider factories have been extracted to submodules. When adding a new feature, look for the existing pattern first before adding a new state struct — `AppState` is a grab-bag of `Arc<Mutex<T>>` fields.

`main.js` (~4300 lines) is similarly monolithic by design (no framework). Feature sections are delimited by `// ===` banner comments. New features go at the end of their section, not at the bottom of the file.

### Module Responsibilities
| Module | What It Owns |
|---|---|
| `lib.rs` | `AppState`, bridge server bootstrap, module re-exports |
| `models.rs` | `Theme`, `CustomPersona`, `PERSONAS`, `THEMES` |
| `game.rs` | Game detection: `detect_game`, `steam_library_paths`, `game_exe_map`, `get_game_details` |
| `paths.rs` | `get_config_path`, `user_config_dir`, `user_bin_dir`, `get_home_dir`, `load_env_file` |
| `providers.rs` | `create_provider`, `provider_from_agent`, `default_agents` |
| `llm.rs` | `GeminiProvider` (streaming SSE) and `OllamaProvider` (local); `generate_embedding()` for RAG |
| `lua.rs` | mlua runtime; globals: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona` |
| `pty_manager.rs` | PTY sessions via `portable-pty`; `HashMap<String, PtySession>` keyed by session ID; supports multiple sessions |
| `memory.rs` | Cosine-similarity vector DB; SQLite-backed with in-memory cache for fast search |
| `projects.rs` | Project Knowledge Spaces CRUD; associates sessions and memory with projects |
| `search.rs` | Universal Search engine using FTS5 `search_index` across messages, memory, and projects |
| `context_packs.rs` | Context Packs CRUD + memory association; scoped RAG filter by `pack_id` |
| `privacy.rs` | Privacy levels (`Standard`/`Private`/`Sensitive`/`Sealed`), `UnlockState`, `PrivacyFilter` for RAG/search/export gating |
| `dashboard.rs` | Workspace Intelligence Dashboard stats aggregation (sessions, messages, memory, privacy breakdown, recent sessions) |
| `db/` | SQLite persistence layer: `DbPool`, migrations runner, schema definitions |
| `ftp.rs` | FTP list/download/upload via `suppaftp`; all sync ops wrapped in `spawn_blocking` |
| `tunnel.rs` | TCP loopback tunnel for SteamOS Game Mode → Desktop Mode bridge |
| `transfer.rs` | LAN P2P file transfer + Warpinator gRPC server; uses mDNS/mdns-sd peer discovery |
| `canvas_collab.rs` | TCP live canvas collaboration — host binds a port, join connects to peer |
| `deckcode/` | DeckCode input orchestration: schema parsing (`schema.rs`, `multilang_schema.rs`), raw input loop (`input.rs`), bindings mapping (`resolver.rs`), and frontend IPC dispatch (`dispatch.rs`). |

### Infrastructure Crate (`infrastructure/`)
A workspace crate (`neurodeck_infrastructure`) providing platform services. Used by the Rust sidecar (`src-tauri/`) as a path dependency.

| Module | What It Owns |
|---|---|
| `secrets.rs` | OS keychain (keyring 4.x) — `save_gemini_api_key`, `get_gemini_api_key`, `delete_gemini_api_key`, `test_keychain_access` |
| `oauth.rs` | Google OAuth2 Device Flow — `request_device_code` → `poll_for_token`; reads `google_client_id` from config |
| `warpinator.rs` | Warpinator-compatible gRPC server (tonic 0.11); `WarpinatorCallbacks` trait; `start_warpinator_service(callbacks, port)` |

**Key infrastructure quirks:**
- `keyring` is at `4.x` — uses `delete_credential()` (the 2.x API was `delete_password()`)
- `tonic-build` 0.11 uses `.compile()` not `.compile_protos()` — `build.rs` uses `unsafe { set_var("PROTOC", ...) }`
- `reqwest` 0.12 without `form` feature has no `.form()` method — use manual URL encoding with `Content-Type: application/x-www-form-urlencoded`
- `mdns-sd` pinned to `0.11` for the `HashMap<String, String>` properties API in `ServiceInfo::new()`

### RAG Is Active
Memory context injection is live in bridge `send_command` (`commands/mod.rs`): every user message generates an embedding via `provider.generate_embedding()`, searches the vector DB for top-10 relevant records, applies **pack scoping** (`pack_id` arg) and **privacy filtering** (`PrivacyFilter::can_inject` + `UnlockState`), then prepends up to 3 approved records to the LLM context. The `LlmProvider` trait requires `generate_embedding()` and `supports_embedding()`; Ollama, HuggingFace, and OpenAI-compat providers have real implementations. If the active provider does not support embeddings, a keyword fallback is used.

### PTY Session Routing + Timeout
`pty_output` and `pty_exit` events carry a session `id` field. Multiple PTY sessions can coexist in `PtyState.sessions`. The main terminal uses `ptySessionId = "main_pty_session"`. The SSH tab creates sessions named `ssh_session_<timestamp>`. Both are routed in the same `listen("pty_output", ...)` handler by ID.

**PTY spawn timeout** (P0.2): `pty_spawn` wraps `command_builder.spawn()` in a `tokio::time::timeout` (default 30s). On timeout the child is killed, the session is removed from `PtyState`, and `pty_exit` emits `{"reason": "spawn_timeout"}`. A background TTL watchdog kills sessions idle >2 hours.

### CSS Specificity Trap (was live bug)
ID selectors (`#view-*`) have specificity 100, which beats `.view-content.active` (specificity 20). **Never add `display: flex` or `display: block` to `#view-*` ID rules** — it will permanently override the `.view-content { display: none }` hide rule and break tab switching. Use `flex-direction`, `overflow`, `background` on ID rules only.

---

## Rules

- **Every new backend command** must be: (1) defined in a `src/` module, (2) added to the bridge dispatch table in `commands/mod.rs`. The bridge server handles all routing via HTTP POST + WebSocket.
- **New Project/Search commands**: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`, `set_session_project`, `set_memory_project`, `get_project_sessions`, `get_project_memory`, `universal_search`.
- **New Context Pack commands**: `create_pack`, `list_packs`, `get_pack`, `update_pack`, `delete_pack`, `set_memory_pack`, `get_pack_memory`.
- **New Privacy commands**: `set_memory_privacy`, `unlock_sealed_records`, `lock_all_sealed`.
- **New Dashboard command**: `get_dashboard_stats`.
- **Do not use `std::sync::Mutex` across `.await` points** in bridge command handlers — `MutexGuard` is not `Send` and will break axum's `Handler` trait. Use `tokio::sync::Mutex` or rely on `SqlitePool`'s internal thread-safety (it is `Clone` and `Send`).
- **CSS changes**: run `npm run --prefix frontend build` after edits to `app.css` — the Vite dev server hot-reloads CSS but Electron's WebView doesn't always pick up the change without a rebuild.
- **Persona/theme additions**: personas are `HashMap` entries in the `PERSONAS` lazy_static in `lib.rs`; themes are `THEMES`. Add entries there, then update the `get_personas` / `get_themes` command return format to match what the settings modal JS expects.
- **New PTY sessions**: always call `pty_kill` for the session ID before `pty_spawn` with the same ID. Double-spawning the same ID creates a resource leak (the old reader thread keeps running).
- **FTP/SSH backend**: use `tokio::task::spawn_blocking` for all `suppaftp` and `std::net::TcpStream` calls — they are synchronous and will block the async executor if called directly.
- **Window size**: all new views must fit within 1280×800. The flex column layout in `.view-container` is `position: absolute; top: 0; left: 0; width: 100%; height: 100%`. Use `overflow: hidden` on view roots and scroll internally.

---

## Hard Constraints / Anti-Patterns

- **Do not add `display: flex` to `#view-*` ID rules in app.css** — kills tab switching (see CSS Specificity Trap above).
- **Do not call `pty_spawn` without a preceding `pty_kill`** for the same session ID.
- **Do not load the full FTP file into a `Vec<u8>` for files that could be large** — `retr_as_buffer` is for small files only. Stream to disk for anything user-selectable.
- **Do not use `unwrap()` in command handlers** — panics crash the backend process and the frontend gets a blank error. Use `map_err(|e| e.to_string())?`.
- **Do not modify `main.js` HTML template strings by searching for partial strings** — the template is one massive string literal. Always match a full containing element to avoid ambiguous edits.
- **Do not add npm packages** — the frontend is intentionally zero-dependency except for `xterm.js`, `marked.js`, and `qrcode` (all npm ESM imports). Adding a bundled npm package will bloat the Electron renderer bundle.
- **Never hardcode the config file path** as just `"llm-term.toml"` — always use the path-resolution logic in `lib.rs` that checks for `../llm-term.toml` first.

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

- **The config path `../llm-term.toml` fallback** is still present as a dev-only fallback (active only when `CARGO_MANIFEST_DIR` is set). The primary path is now the OS config directory (`~/.config/neurodeck/llm-term.toml` on Linux). All writes go to the primary path. See the updated resolution order in *Non-Obvious Tooling & Quirks* above.

- **`google_client_id` must be set in `llm-term.toml`** under `[llm]` for the OAuth Gemini sign-in flow to work. `start_oauth_flow` reads it from `AppState.config.llm.google_client_id` and returns an error if empty. Register a client at console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs (TV/Device type).

- **Canvas Python/Bash "run" does nothing** — the Run button for non-HTML canvas languages shows a "run hint" message but does not execute code. The Agent tab is what actually runs Python/Bash. This is intentional-ish but confusing — it's flagged in `ANTIGRAVITY_HANDOFF.md` as a must-fix.

- **`send_command` vs `execute_command_stream`** — there are two different LLM invocation paths. `execute_command_stream` is the older streaming path. `send_command` is the newer, fuller path with RAG injection, game context, persona, and memory storage. Always use `send_command` for new features.

- **Voice STT uses cpal on Windows/macOS** (P1.4): `audio_recorder.rs` captures 16kHz mono WAV via `cpal` + `hound`, then feeds it to `whisper.cpp` CLI. Linux still prefers `arecord` but falls back to `cpal` if unavailable. The Whisper model path is configurable in `llm-term.toml` `[stt]` section.

- **The 📊 context drawer** is wired and populated via `get_context_stats` — shows provider, model, RAM, memory record count, and session info. The toggle button slides the drawer open from the right side of the chat input bar.

- **BMAD personas are Lua-registered, not hardcoded** — `/john`, `/sally`, etc. call `setPersona()` via `plugins/bmad.lua`. If the Lua plugin fails to load, those commands silently disappear. The 9 built-in personas (including the BMAD ones) are hardcoded in `models.rs`'s `PERSONAS` lazy_static as a fallback.

- **Radial menu uses backtick for keyboard, L2 for gamepad** — but L2 only works if the Steam Input `.vdf` profile is active. In desktop mode without Steam running, only the backtick shortcut works. The `RADIAL_SEGMENTS` array in `main.js` has **12 entries** covering all tabs — Chat, Canvas, Terminal, SSH, Tunnel, Browser, Agent, Memory, Share, Remote, PromptLab, Docs.

- **`pty_spawn` now accepts an `args: Option<Vec<String>>` parameter** — this was added to support SSH sessions. All existing callers pass `args: null` or omit the field.

- **Prompt Lab tab** (`#view-prompt-lab`) was added by the Google Antigravity automated sprint. It exposes AIDA/SCQA/PASTOR/CoT/ToT/PAS/Role+Constraints formulas, a template gallery, and a JPE explanation pane backed by `generate_jpe_explanation` (calls the active LLM). The Lua plugin `plugins/promptgen.lua` registers `/promptlab`, `/promptgen <task>`, and `/formula <name> <task>` shell commands.

- **Cinematic boot screen** (`#boot-overlay`) runs as an IIFE at the bottom of `main.js`. It calls `list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, and `get_context_stats` during startup to show real system state. It fades out and is removed from the DOM after completion — it does NOT block app initialization.

- **Onboarding wizard** (`#onboarding-modal`) shown to first-time users; calls `run_onboarding_diagnostics` to check PTY/network/keychain health. Dismissed state is persisted in `localStorage("neurodeck_onboarding_complete")`.

- **Warpinator gRPC** runs on port `42000` inside `transfer.rs`'s `init_transfer_service`. The `STermWarpinatorCallbacks` struct wires the gRPC callbacks to `AppState` and `app_handle.emit()`. Requires protobuf compilation — `infrastructure/build.rs` uses `protoc-bin-vendored` to avoid a system protoc dependency.

- **`EventEmitter` trait** (P2.1): `bridge.rs` defines an `EventEmitter` trait implemented by `WsBroadcaster`. All emit-only modules (`canvas_collab.rs`, `transfer.rs`, `lsp.rs`) are generic over `E: EventEmitter`, enabling the bridge server to emit events via WebSocket.

- **Disk persistence migration** (P0.4): SSH/FTP/SFTP profiles and custom themes are persisted to `data/profiles/` and `data/themes/` under the OS config directory. On first boot, a frontend migration IIFE moves any legacy `localStorage` data to disk and deletes the old keys.

- **DeckCode multi-language code snippets** — `deckcode-action` events received on the frontend with the `insert_snippet:` prefix are dynamically injected into the active `textarea` (IDE or Canvas editor), automatically parsing `${cursor}` placeholders to adjust the cursor selection, avoiding generic JS evaluations or hardcoded Monaco commands.

---

## KFMS v1.0 — Khaotic Foundation Metadata Standard

Version governance for this project. One Egyptian god codename per MINOR version line.

### Codename Assignment
```
REGISTRY[MINOR] = codename
tag format      = v{semver}-{codename_lower}

current: v1.2.x → Ra      (MINOR=2, index 2)
next:    v1.3.x → Set      (MINOR=3, index 3)
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
- **PATCH bump** (1.2.x): run `./scripts/kfms/khaotic-init.sh stamp` — codename and `meta.json` governance fields stay the same.
- **MINOR bump** (1.3.0): update `meta.json` with new version, `codename.name = "Set"`, `registry_index = 3`, `minor_line = 3`, `tag = "v1.3.0-set"`. Update `health.json` version/codename to match.
- **MAJOR bump** (2.0.0): all codenames reset to index 0 → Anubis.
- Loose files at the root: run `sweep` before committing to keep the root clean.

---

## Dev Commands

```bash
npm run dev                           # Hot-reload (Vite + Electron + Rust sidecar)
npm run build                         # Production build (Electron + sidecar)

npm run --prefix frontend dev         # Frontend only (CSS/HTML — invoke() calls fail without sidecar)
npm run --prefix frontend build       # Vite build only

cd src-tauri && cargo check           # Fast type-check
cd src-tauri && cargo clippy          # Lint
cd src-tauri && cargo build           # Debug build (~2min first time due to mlua vendored)
cd src-tauri && cargo test --lib      # Unit tests (75 tests)
cd src-tauri && cargo test --tests    # Integration tests (config, memory, bridge)
# Windows note: `cargo test --workspace --all-targets` may hit PDB limit (LNK1318).
# Use `cargo test --lib` or individual `--test <name>` instead. Debug info is
# line-tables-only in dev profile to keep PDB size manageable.

./install.sh                          # SteamOS deploy → ~/Applications/neurodeck/
./launch_gamescope.sh                 # Run in gamescope 1280×800 (Steam Deck Game Mode)
.\package_release.ps1                 # Windows MSI packaging
```
