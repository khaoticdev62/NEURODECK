# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

NEURODECK is an Electron desktop app with a Rust sidecar that turns a Steam Deck into an AI-powered terminal OS — LLM chat, live code canvas, PTY shell, autonomous agent, vector memory, and gamepad-native navigation in one 1280×800 fullscreen window.

---

## Non-Obvious Tooling & Quirks

- **Config path resolution**: `get_config_path()` resolves in this order:
  1. `$NEURODECK_CONFIG_PATH` env var (highest priority)
  2. Primary: `~/.config/neurodeck/llm-term.toml` (Linux), `%APPDATA%\neurodeck\llm-term.toml` (Windows), `~/Library/Application Support/neurodeck/llm-term.toml` (macOS)
  3. Dev fallbacks (only when `CARGO_MANIFEST_DIR` is set): `../llm-term.toml`, `./llm-term.toml`
  The root `llm-term.toml` is no longer read at runtime unless the env var points to it.
- **`GEMINI_API_KEY` must be set as an env var** before `npm run dev`. If absent, the binary silently falls back to Ollama with no user-visible error.
- **`NEURODECK_SAFE_MODE`**: if set (any value), the sidecar skips all Lua plugin loading at startup. The bridge logs `SAFE MODE active — plugin loading is disabled`. Use when a broken plugin prevents boot.
- **`NEURODECK_PORT`**: overrides the bridge port (default `9477`). Electron's `findFreePort()` auto-selects the next free port in `9477–9577` if the default is occupied and sets this env var before spawning the sidecar.
- **Vite dev standalone** (`npm run --prefix frontend dev`) works for CSS/HTML iteration but all `invoke()` calls will fail — the bridge server is not running. To test real commands, use `npm run dev` (starts Electron + sidecar).
- **Lua auto-loads on startup**: every `.lua` file in `plugins/` is loaded at app init via `lua.rs`. A syntax error in any plugin silently suppresses that plugin — check the terminal console for `[Lua Error]` lines. Use `NEURODECK_SAFE_MODE=1` to boot without any plugins.
- **Rust version is pinned to 1.92.0** in `Cargo.toml`. The `mlua` crate with `vendored` feature compiles Lua 5.4 from source — first build takes 2–3 minutes.
- **FTP downloads stream to disk**: `ftp_download_file` uses `retr()` + `std::io::copy` instead of `retr_as_buffer`. A `max_download_size_mb` config gate (default 500 MB) rejects oversized transfers before they start. Progress events fire every 1 MB.
- **`ELECTRON_RUN_AS_NODE` env var breaks Electron launch**: Some IDEs (Cursor, Antigravity) set this variable. If present, Electron runs as Node.js and `require('electron').app` is `undefined`. The `electron/scripts/dev-launcher.js` wrapper explicitly removes this variable before spawning Electron. Use `npm run dev` from the project root.
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
All streaming (LLM tokens, PTY output, agent steps, canvas exec output) goes through WebSocket events. All request/response goes through HTTP POST to the bridge server.

### The One Big File Problem
`lib.rs` owns `AppState`, the bridge server bootstrap, and module re-exports. The Tauri `run()` entry point and `generate_handler![]` have been removed. Command bodies, personas, themes, game detection, path utilities, and provider factories have been extracted to submodules. When adding a new feature, look for the existing pattern first before adding a new state struct — `AppState` is a grab-bag of `Arc<Mutex<T>>` fields.

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
| `dashboard.rs` | Workspace Intelligence Dashboard stats aggregation (sessions, messages, memory, privacy breakdown) |
| `db/` | SQLite persistence layer: `DbPool`, migrations runner, schema definitions |
| `ftp.rs` | FTP list/download/upload via `suppaftp`; all sync ops wrapped in `spawn_blocking` |
| `tunnel.rs` | TCP loopback tunnel for SteamOS Game Mode → Desktop Mode bridge |
| `transfer.rs` | LAN P2P file transfer + Warpinator gRPC server; uses mDNS/mdns-sd peer discovery |
| `canvas_collab.rs` | TCP live canvas collaboration — host binds a port, join connects to peer |
| `deckcode/` | DeckCode input orchestration: schema parsing, raw input loop, bindings mapping, frontend IPC dispatch |
| `commands/system.rs` | `generate_support_bundle` (redacted diagnostic archive), `get_system_health` (structured JSON health report), `redact_line` (heuristic secret scrubber) |
| `workflow_engine.rs` | 9 node types, template substitution, `eval_condition` with `preprocess_expr()` pre-pass |
| `plugin_mgr.rs` | Plugin lifecycle: load, toggle, install from URL, hot-reload, QA gate; `audit_log_path()` is `pub` |
| `remote_control.rs` | UDP remote control server — `start_remote_server_bridge()` / `stop_remote_server_bridge()` — ACTIVE in bridge |

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

**PTY spawn timeout**: `pty_spawn` wraps `command_builder.spawn()` in a `tokio::time::timeout` (default 30s). On timeout the child is killed, the session is removed from `PtyState`, and `pty_exit` emits `{"reason": "spawn_timeout"}`. A background TTL watchdog kills sessions idle >2 hours.

### Canvas Code Execution
Canvas Python/Bash/JavaScript execution is **fully implemented** end-to-end:
- Frontend: `canvas.js` `_cvRunStreamingExec()` calls `invoke("exec_code_stream", { code, lang })`
- Supported languages: `python`, `bash`, `powershell`, `javascript`/`js` (passed to `exec_code_stream`)
- Backend: `commands/mod.rs` line ~5101 dispatches to `commands/agent.rs` `exec_code_stream()`
- Output streams via `canvas_exec_line` WebSocket events; completion via `canvas_exec_done`
- 120-second timeout enforced server-side
- Lua scripts go through `execute_lua` (separate path with `runLuaScript()` confirmation gate)
- HTML/CSS/other langs render in the preview iframe (no exec path)

### CSS Specificity Trap (was live bug)
ID selectors (`#view-*`) have specificity 100, which beats `.view-content.active` (specificity 20). **Never add `display: flex` or `display: block` to `#view-*` ID rules** — it will permanently override the `.view-content { display: none }` hide rule and break tab switching. Use `flex-direction`, `overflow`, `background` on ID rules only.

### Electron Security Model
`electron/main.js` implements a hardened security posture:
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` on all windows
- `devTools` only enabled when `ELECTRON_DEV` is set
- **Content Security Policy** injected via `session.defaultSession.webRequest.onHeadersReceived`:
  `connect-src` is scoped to `127.0.0.1:${port}` and `ws://127.0.0.1:${port}` only; `frame-src 'none'`; `object-src 'none'`
- **`setPermissionRequestHandler`** + **`setPermissionCheckHandler`**: only `notifications` allowed; camera, microphone, geolocation denied
- **`will-navigate` allowlist**: only `neurodeck://` (and `http://localhost:1420` in dev mode) pass through; everything else is blocked and handed to `safeOpenExternal`
- **Dialog options sanitized**: `show-save-dialog` and `show-open-dialog` IPC handlers pass only allowlisted keys (title, defaultPath, filters, properties, etc.) — raw renderer objects are never forwarded
- **`neurodeck://` protocol**: path traversal protection via `path.relative()` check ensuring resolved file path stays inside `frontend/dist`
- **`set_kiosk_mode`** bridge command returns `"unavailable"` — kiosk is managed by `window.electronAPI.setKiosk()` from the preload, not the bridge

---

## Rules

- **Every new backend command** must be: (1) defined in a `src/` module, (2) added to the bridge dispatch table in `commands/mod.rs`. The bridge server handles all routing via HTTP POST + WebSocket.
- **`start_remote_server` and `stop_remote_server` are ACTIVE commands** in the bridge (`commands/mod.rs` lines ~4941, ~4952) — they call `remote_control::start_remote_server_bridge()` / `stop_remote_server_bridge()`. They are NOT stubs. Only `set_kiosk_mode` is intentionally bridge-unavailable.
- **New Project/Search commands**: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`, `set_session_project`, `set_memory_project`, `get_project_sessions`, `get_project_memory`, `universal_search`.
- **New Context Pack commands**: `create_pack`, `list_packs`, `get_pack`, `update_pack`, `delete_pack`, `set_memory_pack`, `get_pack_memory`.
- **New Privacy commands**: `set_memory_privacy`, `unlock_sealed_records`, `lock_all_sealed`.
- **New Dashboard command**: `get_dashboard_stats`.
- **Observability commands**: `generate_support_bundle` (redacted archive), `get_system_health` (structured JSON with status/provider/model/memory_doc_count/plugin_count/kfms_version/issues).
- **Do not use `std::sync::Mutex` across `.await` points** in bridge command handlers — `MutexGuard` is not `Send` and will break axum's `Handler` trait. Use `tokio::sync::Mutex` or rely on `SqlitePool`'s internal thread-safety.
- **CSS changes**: run `npm run --prefix frontend build` after edits to `app.css` — the Vite dev server hot-reloads CSS but Electron's WebView doesn't always pick up the change without a rebuild.
- **Persona/theme additions**: personas are `HashMap` entries in the `PERSONAS` lazy_static in `models.rs`; themes are `THEMES`. Add entries there, then update the `get_personas` / `get_themes` command return format to match what the settings modal JS expects.
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
- **Never hardcode the config file path** as just `"llm-term.toml"` — always use the path-resolution logic in `paths.rs`/`lib.rs` that checks env var and OS config dir first.
- **Never expose secrets through the bridge** — `generate_support_bundle` uses `redact_line()` to scrub API keys, Bearer tokens, and password lines. Any new diagnostic command must follow the same pattern.
- **Do not add `display: none` inside Electron `webRequest.onHeadersReceived`** — it runs on every response including the bridge's HTTP/WS traffic. Only inject `Content-Security-Policy`; do not modify response bodies.
- **Do not call `Notification.permission` in the Electron main process** — that is a Web API. Use `Notification.isSupported()` instead (Electron's class).

---

## Repository Structure

The project follows the structure documented in `neurodeck-production-package/docs/07_CI_CD_Setup.md`. Key locations:

| Directory | What Lives Here |
|---|---|
| `src-tauri/src/` | Rust backend — ~5,400-line dispatch table in `commands/mod.rs`, all modules |
| `src-tauri/src/commands/` | Bridge command implementations (agent, browser, git, system, session...) |
| `src-tauri/src/db/migrations/` | SQLite schema evolution (001, 002, 003...) |
| `src-tauri/tests/` | Rust integration tests |
| `frontend/src/` | Vanilla JS frontend — `main.js` (~8K lines), `app.css` (~9K lines) |
| `frontend/src/main.js` | App bootstrap, view switching, all UI logic (monolithic by design) |
| `electron/` | Electron main process + preload script |
| `infrastructure/` | Rust workspace crate — secrets, OAuth, Warpinator |
| `plugins/` | Lua plugins auto-loaded at startup |
| `assets/` | Static assets — brand, steam-grid, steam_input, deckcode schemas |
| `docs/` | All documentation — epics, roadmaps, architecture, user guide |
| `neurodeck-production-package/` | **North star** — PRD, SDS, release gates, backlog, CI templates |
| `production_code_prompt_system/` | PromptFlow CLI + 15 production prompts |
| `scripts/` | Build & utility scripts — `dev/`, `shell/`, `powershell/`, `kfms/`, `git-hooks/` |
| `scripts/dev/` | Development utilities (CSS, JS, JSON, Lua, Python helpers) |
| `e2e/` | Playwright E2E tests (~390 tests) |
| `tests/` | Shared test fixtures (config, memory, plugins) |
| `infra/` | KFMS metadata and telemetry |
| `aur/` | Arch Linux PKGBUILD |
| `flatpak/` | Flatpak manifest & build scripts |

**Do not create new top-level directories without updating `neurodeck-production-package/docs/07_CI_CD_Setup.md`.**

---

## Deeper Docs

> **Primary reference (north star):** `neurodeck-production-package/` — This is the single source of truth for architecture, specs, release gates, and backlog. All other docs are supplementary.

| Resource | Location |
|---|---|
| **Production Package (SSoT)** | `neurodeck-production-package/` — Architecture blueprint, PRD, SDS, release gates, backlog |
| Master blueprint (architecture, 12 release gates, KFMS) | `neurodeck-production-package/docs/00_NEURODECK_Master_PRD_SDS_Implementation_Blueprint.md` |
| Product PRD (feature definitions, acceptance criteria) | `neurodeck-production-package/docs/01_Product_PRD.md` |
| Software Design Spec (module map, IPC, data flow) | `neurodeck-production-package/docs/02_Software_Design_Specification.md` |
| Implementation Roadmap (sprint history, next work) | `neurodeck-production-package/docs/03_Implementation_Roadmap.md` |
| Security & Privacy Hardening | `neurodeck-production-package/docs/04_Security_Privacy_Hardening.md` |
| Steam Deck UX Release Gate | `neurodeck-production-package/docs/05_Steam_Deck_UX_Release_Gate.md` |
| QA & Testing Release Gates | `neurodeck-production-package/docs/06_QA_Testing_Release_Gates.md` |
| CI/CD & Repository Setup | `neurodeck-production-package/docs/07_Repository_CI_CD_Setup.md` |
| Plugin SDK & Workflow Engine | `neurodeck-production-package/docs/08_Plugin_Automation_Workflow_Spec.md` |
| Release Packaging & Observability | `neurodeck-production-package/docs/09_Release_Packaging_Observability.md` |
| Final Release Checklist | `neurodeck-production-package/checklists/FINAL_1_0_RELEASE_CHECKLIST.md` |
| Production Backlog | `neurodeck-production-package/checklists/PRODUCTION_BACKLOG.md` |
| Full feature backlog + priority matrix | `docs/ANTIGRAVITY_HANDOFF.md` |
| Project identity, sprint history, command registry | `docs/project-context.md` |
| Steam Deck Game Mode integration | `docs/gamescope_guide.md` |
| Steam Input controller mapping | `docs/steam_input_guide.md` |
| User-facing feature documentation | `docs/USER_GUIDE.md` |
| BMAD agent personas + sprint config | `_bmad/custom/config.toml` |
| Sprint artifacts | `_bmad-output/implementation-artifacts/` |

---

## Gotchas / Tribal Knowledge

- **The config path resolution order** is defined in `paths.rs` — env var → OS config dir → dev fallbacks. The primary path is now the OS config directory (`~/.config/neurodeck/llm-term.toml` on Linux). All writes go to the primary path.

- **`google_client_id` must be set in `llm-term.toml`** under `[llm]` for the OAuth Gemini sign-in flow to work. `start_oauth_flow` reads it from `AppState.config.llm.google_client_id` and returns an error if empty. Register a client at console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs (TV/Device type).

- **Canvas Python/Bash/JS run IS fully implemented** — `exec_code_stream` dispatches via `commands/agent.rs`, streams stdout via `canvas_exec_line` WebSocket events, and enforces a 120s timeout. The Run button in `canvas.js` calls `_cvRunStreamingExec()` for Python, Bash, PowerShell, and JavaScript. HTML/CSS render in the preview iframe (no exec). Lua uses the separate `execute_lua` path.

- **`send_command` vs `execute_command_stream`** — there are two different LLM invocation paths. `execute_command_stream` is the older streaming path. `send_command` is the newer, fuller path with RAG injection, game context, persona, and memory storage. Always use `send_command` for new features.

- **Voice STT uses cpal on Windows/macOS**: `audio_recorder.rs` captures 16kHz mono WAV via `cpal` + `hound`, then feeds it to `whisper.cpp` CLI. Linux still prefers `arecord` but falls back to `cpal` if unavailable. The Whisper model path is configurable in `llm-term.toml` `[stt]` section.

- **The 📊 context drawer** is wired and populated via `get_context_stats` — shows provider, model, RAM, memory record count, and session info. The toggle button slides the drawer open from the right side of the chat input bar.

- **BMAD personas are Lua-registered, not hardcoded** — `/john`, `/sally`, etc. call `setPersona()` via `plugins/bmad.lua`. If the Lua plugin fails to load, those commands silently disappear. The 9 built-in personas (including the BMAD ones) are hardcoded in `models.rs`'s `PERSONAS` lazy_static as a fallback.

- **Radial menu uses backtick for keyboard, L2 for gamepad** — but L2 only works if the Steam Input `.vdf` profile is active. In desktop mode without Steam running, only the backtick shortcut works. The `RADIAL_SEGMENTS` array in `main.js` has **12 entries** covering all tabs — Chat, Canvas, Terminal, SSH, Tunnel, Browser, Agent, Memory, Share, Remote, PromptLab, Docs.

- **`pty_spawn` now accepts an `args: Option<Vec<String>>` parameter** — this was added to support SSH sessions. All existing callers pass `args: null` or omit the field.

- **Prompt Lab tab** (`#view-prompt-lab`) exposes AIDA/SCQA/PASTOR/CoT/ToT/PAS/Role+Constraints formulas, a template gallery, and a JPE explanation pane backed by `generate_jpe_explanation` (calls the active LLM). The Lua plugin `plugins/promptgen.lua` registers `/promptlab`, `/promptgen <task>`, and `/formula <name> <task>` shell commands.

- **Cinematic boot screen** (`#boot-overlay`) runs as an IIFE at the bottom of `main.js`. It calls `list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, and `get_context_stats` during startup to show real system state. It fades out and is removed from the DOM after completion — it does NOT block app initialization.

- **Onboarding wizard** (`#onboarding-modal`) shown to first-time users; calls `run_onboarding_diagnostics` to check PTY/network/keychain health. Dismissed state is persisted in `localStorage("neurodeck_onboarding_complete")`.

- **Warpinator gRPC** runs on port `42000` inside `transfer.rs`'s `init_transfer_service`. Requires protobuf compilation — `infrastructure/build.rs` uses `protoc-bin-vendored` to avoid a system protoc dependency.

- **`EventEmitter` trait**: `bridge.rs` defines an `EventEmitter` trait implemented by `WsBroadcaster`. All emit-only modules (`canvas_collab.rs`, `transfer.rs`, `lsp.rs`) are generic over `E: EventEmitter`, enabling the bridge server to emit events via WebSocket.

- **Disk persistence migration**: SSH/FTP/SFTP profiles and custom themes are persisted to `data/profiles/` and `data/themes/` under the OS config directory. On first boot, a frontend migration IIFE moves any legacy `localStorage` data to disk and deletes the old keys.

- **DeckCode multi-language code snippets** — `deckcode-action` events received on the frontend with the `insert_snippet:` prefix are dynamically injected into the active `textarea` (IDE or Canvas editor), automatically parsing `${cursor}` placeholders to adjust the cursor selection.

- **`workflow_engine.rs` condition evaluator** — `eval_condition` runs a `preprocess_expr()` pre-pass before scanning for operators. This pre-pass resolves `input.len()`, `input.contains("x")`, and bare `input` tokens to their actual values so that comparisons like `input.len() > 10` work numerically rather than lexicographically. Without the pre-pass, `"input.len()"` as a string is lexicographically greater than `"10"` (`'i' > '1'`), causing false positives.

- **Support bundle redaction** — `generate_support_bundle` in `commands/system.rs` uses `redact_line()` which scrubs: lines containing `AIza` (Gemini keys), `GOCSPX-` (OAuth tokens), `Bearer ` prefixes, and `password=` patterns. Keys appear as `[SET]` or `[keychain or unset]` in the output. Never log raw credentials in any new diagnostic command.

- **Plugin QA gate** (`.github/workflows/plugin-qa.yml`): runs on `plugins/**` changes. A Python static analysis script checks: `@name`, `@version`, `@author` annotations present; file size ≤ 512 KB; 8 blocked Lua API patterns absent (`os.execute`, `io.popen`, `dofile`, `loadfile`, `loadstring`, `package.loadlib`, `require("ffi")`, `debug.*`). CI fails if any plugin fails QA.

- **PTY restart delay** — `restartTerminalSession` includes a 150ms delay between `pty_kill` and `pty_spawn`. The old reader thread needs time to exit after its master fd closes; without the delay both threads briefly co-exist and emit duplicate `pty_output` events on the same session ID.

---

## KFMS v1.0 — Khaotic Foundation Metadata Standard

Version governance for this project. One Egyptian god codename per MINOR version line.

### Codename Assignment
```
REGISTRY[MINOR] = codename
tag format      = v{semver}-{codename_lower}

current: v1.8.x → Ptah    (MINOR=8, index 8)
next:    v1.9.x → Thoth   (MINOR=9, index 9)
```

### Key Files
| File | Purpose |
|---|---|
| `infra/meta/meta.json` | Primary KFMS metadata — version, codename, build SHA, governance flags |
| `infra/meta/meta.schema.json` | JSON Schema draft-07 — CI enforces this on every `meta.json` change |
| `infra/meta/CODENAME_REGISTRY.md` | Full 20-god codename table with status and assignment |
| `infra/telemetry/health.json` | BMAD orchestration readiness — 5 boolean checks must all be `true`; also carries `release_plan` with GO/HOLD/NO-GO score |
| `scripts/kfms/khaotic-init.sh` | Bootstrap utility: `sweep` / `stamp` / `validate` / `status` / `sync` |

### KFMS CLI
```bash
./scripts/kfms/khaotic-init.sh sweep     # Move loose root files → .loose/inbox/ (non-destructive)
./scripts/kfms/khaotic-init.sh stamp     # Re-stamp build block (git SHA, tag, timestamp, dirty flag)
./scripts/kfms/khaotic-init.sh validate  # Validate meta.json structure + governance rules
./scripts/kfms/khaotic-init.sh status    # Print KFMS health summary + release score
./scripts/kfms/khaotic-init.sh sync      # Sync derived artifacts from meta.json without re-stamping
```

The post-commit hook in `.git/hooks/post-commit` runs `stamp` + `validate` + amends the commit with updated KFMS artifacts (`meta.json`, `health.json`, `CODENAME_REGISTRY.md`, `IMPLEMENTATION_PLAN.md`) automatically.

### Release Score
`health.json` carries a `release_plan.readiness_score` (0–100). GO threshold is 85. Gates:

| Gate | Weight | Pass condition |
|---|---|---|
| `hardening_check` | +30 | Security audit script exits 0 |
| `cargo_check` | +25 | `cargo check` exits 0 |
| `cargo_test` | +25 | `cargo test --lib` exits 0 |
| `frontend_build` | +20 | `npm run --prefix frontend build` exits 0 |
| `workspace_state: clean` | 0 penalty | No uncommitted changes |
| `workspace_state: manual-uncommitted` | −20 | Uncommitted changes present |
| `loose_root_files > 0` | −10 | Run `sweep` to move loose files |

### CI Workflows (`.github/workflows/`)

All 12 active workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR + push master | Main CI: check, lint, test, build |
| `ci-gate.yml` | PR | 6-gate production quality gate |
| `production-ci.yml` | push master | Simplified main-branch CI |
| `release-build.yml` | workflow_dispatch / tag | Multi-platform release (Windows NSIS + Linux AppImage) with sccache + mold |
| `production-release.yml` | workflow_dispatch | Production release automation |
| `steam-deck-validation.yml` | push master | AppImage runtime, glibc, gamepad, Vulkan/OpenGL, binary arch validation |
| `plugin-qa.yml` | `plugins/**` change | Lua QA: annotations, size ≤ 512 KB, 8 blocked API patterns |
| `validate-codename.yml` | `infra/meta/**` change | KFMS codename collision detection, registry alignment, tag format |
| `kfms-release.yml` | release tag push | Full KFMS validation on publish |
| `validate-meta-schema.yml` | `infra/meta/**` change | `meta.json` JSON Schema validation via `ajv-cli` |
| `verify-telemetry.yml` | `infra/meta/**` change | `health.json` integrity, 5-check truth, version/codename drift |
| `security.yml` | push master | `cargo-audit`, `cargo-deny`, `npm-audit`, CodeQL SAST, secret scanning |

### Rules When Bumping Versions
- **PATCH bump** (1.8.x): run `./scripts/kfms/khaotic-init.sh stamp` — codename and `meta.json` governance fields stay the same.
- **MINOR bump** (1.9.0): update `meta.json` with new version, `codename.name = "Thoth"`, `registry_index = 9`, `minor_line = 9`, `tag = "v1.9.0-thoth"`. Update `health.json` version/codename to match.
- **MAJOR bump** (2.0.0): all codenames reset to index 0 → Anubis.
- Loose files at the root: run `sweep` before committing to keep the root clean.

---

## Development Workflow — PromptFlow (Single Source of Truth)

All non-trivial development work on NEURODECK is driven through the **Production Code Prompt System** (`production_code_prompt_system/`). This is the canonical workflow for auditing, hardening, testing, refactoring, and certifying changes.

### Prerequisites

```bash
# PromptFlow is a Python package already present in the repo
pip install -e "./production_code_prompt_system[dev]"
# Or just run it in-place (requires typer, rich, pyyaml):
python -m promptflow --help
```

### Quick Commands

```bash
# List all 15 production prompts
npm run promptflow:list

# Inspect the repo (safe summary, no AI calls)
npm run promptflow:inspect

# Run a focused sequence (manual mode — copies prompt to clipboard/file)
npm run promptflow:audit         # Orchestration + Codebase Audit
npm run promptflow:security      # Security + Data Layer + Observability + Testing
npm run promptflow:refactor      # Audit + Test + Refactor + Architecture + Certify
npm run promptflow:frontend      # Frontend UX/Performance/Test/Docs
npm run promptflow:build         # Dependency + CI/CD + Docs
npm run promptflow:release       # Release Certification gate
npm run promptflow:full          # Complete 15-stage pipeline

# Custom NEURODECK sequences (defined in promptflow.yaml)
python -m promptflow run --sequence rust-only --provider manual
python -m promptflow run --sequence electron-only --provider manual
python -m promptflow run --sequence pre-release --provider manual
python -m promptflow run --sequence quick-check --provider manual

# Review the last run
npm run promptflow:report
npm run promptflow:export        # Zip the full run package
npm run promptflow:clean         # Keep last 5 runs
```

### Workflow Rules

1. **Before starting a new feature or refactor**: run `npm run promptflow:audit` to establish baseline state.
2. **Before any release**: run `npm run promptflow:release` — output must be `APPROVED` or `APPROVED WITH WARNINGS`.
3. **After security-sensitive changes**: run `npm run promptflow:security`.
4. **All prompts run in `report-only` mode by default** — they never auto-modify files. Apply patches manually after review.
5. **Use `--provider manual`** (default) to paste prompts into your AI tool, or switch to `openai` / `anthropic` / `gemini` / `ollama` for automatic execution.

### Run Output Location

```
production_code_prompt_system/promptflow_runs/
  2026-06-08_050419_audit-only/
    prompts/01_payload.md          # Full prompt + repo context
    prompts/14_payload.md          # Orchestration prompt
    reports/summary.md             # Consolidated findings
    reports/blockers.md            # Must-fix items
    reports/warnings.md            # Caution items
    reports/next_actions.md        # Recommended next steps
```

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
cd src-tauri && cargo test --lib      # Unit tests (111 tests)
cd src-tauri && cargo test --tests    # Integration tests (10 tests)
# Windows note: `cargo test --workspace --all-targets` may hit PDB limit (LNK1318).
# Use `cargo test --lib` or individual `--test <name>` instead.

# KFMS
./scripts/kfms/khaotic-init.sh stamp     # Re-stamp build block after changes
./scripts/kfms/khaotic-init.sh status    # Print release score and gate summary
./scripts/kfms/khaotic-init.sh sweep     # Move loose root files to .loose/inbox/

./install.sh                          # SteamOS deploy → ~/Applications/neurodeck/
./launch_gamescope.sh                 # Run in gamescope 1280×800 (Steam Deck Game Mode)
.\package_release.ps1                 # Windows NSIS packaging
```
