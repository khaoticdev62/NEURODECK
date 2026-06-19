# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Operating Rules

- Work as a senior application engineer: keep changes small, typed, consistent, and covered by proportionate verification.
- Explain architecture, security, and business tradeoffs in Just Plain English (JPE). Prefer lean, deterministic solutions over framework or service bloat.
- Treat every boundary as untrusted. Preserve Electron isolation, bridge validation, secret redaction, filesystem containment, and least-privilege behavior.
- Execute one coherent sprint item at a time. Establish a passing baseline, implement the smallest complete change, verify it, then continue.
- UI changes must match project screenshots at 1280×800 and use canonical design tokens/components. Wire every control through existing UI state, controller, accessibility, and bridge systems.
- Never hide a regression with snapshot updates, broad suppressions, or unrelated rewrites. Document intentional static-analysis exceptions beside the affected symbol with a concrete rationale.
- After a major verified update, use a policy-compliant branch, run `npm run preflight`, and upload the scoped commit to GitHub. Never push directly to `master`, `main`, or `release/*`.

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
- **Vite dev standalone** (`npm run --prefix frontend dev` or `npm run frontend:dev`) works for React/CSS iteration but all `bridgeAdapter.invoke()` calls will fail — the bridge server is not running. To test real commands, use `npm run dev` (starts Electron + sidecar). `npm run dev:no-sidecar` starts Electron against an already-running sidecar.
- **Lua auto-loads on startup**: every `.lua` file in `plugins/` is loaded at app init via `lua.rs`. A syntax error in any plugin silently suppresses that plugin — check the terminal console for `[Lua Error]` lines. Use `NEURODECK_SAFE_MODE=1` to boot without any plugins.
- **Rust version is pinned to 1.92.0** in `Cargo.toml`. The `mlua` crate with `vendored` feature compiles Lua 5.4 from source — first build takes 2–3 minutes.
- **FTP downloads stream to disk**: `ftp_download_file` uses `retr()` + `std::io::copy` instead of `retr_as_buffer`. A `max_download_size_mb` config gate (default 500 MB) rejects oversized transfers before they start. Progress events fire every 1 MB.
- **`ELECTRON_RUN_AS_NODE` env var breaks Electron launch**: Some IDEs (Cursor, Antigravity) set this variable. If present, Electron runs as Node.js and `require('electron').app` is `undefined`. The `electron/scripts/dev-launcher.js` wrapper explicitly removes this variable before spawning Electron. Use `npm run dev` from the project root.
- **Pure Electron architecture**: The Rust sidecar is 100% Tauri-free. All backend↔frontend communication flows through the bridge server (`bridge.rs`) on `localhost:9477` — HTTP POST for commands, WebSocket for events. There are no Tauri dependencies in `Cargo.toml` and no `tauri.conf.json`.
- **DeckCode input daemon works in bridge mode**: `run_bridge_server()` loads `deckcode-controller-profile.schema.json` and starts the `gilrs` gamepad polling loop. Input events are resolved through `DeckCodeResolver` and dispatched via `WsBroadcaster.emit("deckcode-action", action_id)` to the frontend. The daemon only starts if the schema file is present.

---

## Design System (v7)

The NEURODECK Design System is fully wired into the React frontend and blended with the canonical **NEURODECK Design Tokens + Component Library v1.0** package.

### Location
- Source of truth: `src/renderer/design-system/`
- Canonical unified tokens: `src/renderer/design-system/tokens/tokens.css`
- Canonical token JSON: `src/renderer/design-system/tokens.json`
- Legacy split tokens: `src/renderer/design-system/tokens/{colors,fonts,spacing,typography}.css`
- v1.0 theme modifiers: `src/renderer/design-system/themes/{blacksite,tactical-glass,high-contrast,colorblind-safe}.css`
- Components: `src/renderer/design-system/components/{core,feedback,systems}/`
- Workstation UI kit: `src/renderer/design-system/ui-kits/workstation/`
- Blended component registry: `src/renderer/design-system/component-registry.json`
- Barrel export: `src/renderer/design-system/index.ts`

### Integration rules
- **DS tokens are canonical.** `src/renderer/index.css` imports the unified DS token file (`tokens/tokens.css`) and the v1.0 theme modifiers. The runtime theme injector in `src/renderer/theme/cssVariableInjector.ts` emits the full DS token namespace (`--nd-*`) so every theme participates.
- **Default theme is Tactical Glass Ultra.** `ThemeProvider` defaults to `tactical_glass_ultra` so the v1.0 Tactical Glass theme is visible out of the box (cyan-tinted glass borders `#68F1FF`, brighter accent, translucent surfaces).
- **v1.0 theme classes are applied to the body.** `ThemeProvider` maps active theme IDs to the bundled v1.0 CSS theme classes (`theme-blacksite`, `theme-tactical-glass`, `theme-high-contrast`, `theme-colorblind-safe`). JS-injected variables remain authoritative; the CSS classes provide a fallback layer and make the v1.0 theme files active.
- **Tailwind exposes v1.0 semantic aliases.** `frontend/tailwind.config.js` extends the theme with `surface`, `text`, `accent`, and `border` color aliases mapped to the `--nd-*` variables, plus v1.0 font sizes, radius, elevation, and motion tokens. Prefer `bg-surface-primary`, `text-text-primary`, `border-border-subtle`, `shadow-card`, etc.
- **Production build validates the design system first.** The root `npm run build` now runs `node scripts/validate-design-system.js` before bundling. It checks that `tokens.json`, `tokens/tokens.css`, the four v1.0 theme files, `component-registry.json`, and the `index.css` imports all exist and contain the expected token categories/variables.
- **Existing primitives delegate to DS.** Files in `src/renderer/components/primitives/` are adapters that preserve the legacy prop API while using DS token classes and DS components internally. Backups live in `src/renderer/components/primitives/_legacy/`.
- **System cards delegate to DS.** Files in `src/renderer/components/cards/` use DS `Panel`, `Badge`, `Button`, `IconButton`, `StatusChip`, `Modal`, and `TextInput`. Backups live in `src/renderer/components/cards/_legacy/`.
- **App shell now uses the v6 workspace layout.** `src/renderer/components/layout/NeurodeckShell.tsx` composes v6-style `TitleBar`, `PrimarySidebar`, and `SecondaryRail` with the live app state. The DS workstation `StatusBar`/`NavRail`/`ControllerHints` are no longer used by the shell; `ChatWorkspace` and `InputConsole` remain for the chat view.
- **Legacy `_legacy/` directories are excluded from TypeScript** via `tsconfig.json` (`"exclude": ["src/**/_legacy"]`).

### Adding or modifying components
1. Add new DS components under `src/renderer/design-system/components/`.
2. Export them from `src/renderer/design-system/index.ts`.
3. If a component replaces an existing primitive or card, update the adapter in `src/renderer/components/primitives/` or `src/renderer/components/cards/` while keeping the public prop interface unchanged.
4. Do not redefine `--nd-*` CSS variables inconsistently; extend `tokens/tokens.css` or the runtime injector instead.
5. When adding a new theme, create a CSS modifier in `src/renderer/design-system/themes/` and add the theme-ID-to-class mapping in `src/renderer/theme/cssVariableInjector.ts`.

---

## Architecture Map

### IPC Flow
```
src/renderer/App.tsx
  └─ bridgeAdapter.invoke("command_name", { args })  ──►  POST /api/{cmd}
  └─ bridgeAdapter.listen("event_name", handler)     ◄──  WebSocket  ◄──  WsBroadcaster.emit()
                                                                   (Rust sidecar localhost:9477)
```
All streaming (LLM tokens, PTY output, agent steps, canvas exec output) goes through WebSocket events. All request/response goes through HTTP POST to the bridge server.

The React UI talks to the bridge through `src/renderer/services/bridgeAdapter.ts`, not through Electron IPC. `bridgeAdapter` exposes typed `invoke<T>()` and `listen()` helpers, wraps errors in `BridgeError` with stable codes (`invalid_json`, `rate_limited`, `command_not_found`, `command_timeout`, `command_error`), and applies retry/backoff for safe read commands. Non-streaming commands enforce a 30-second HTTP timeout (300 seconds for file transfers/support bundles; no timeout for streaming commands).

### Frontend Architecture
The frontend is a **React 19 + TypeScript** Vite app (`src/renderer/main.tsx` → `src/renderer/App.tsx`). The legacy vanilla-JS `frontend/src/main.js` has been removed; the few remaining shared helpers live in `src/shared/`. Feature views are co-located under `src/renderer/features/` and lazy-loaded in `App.tsx` (only the workspace/chat view is eager). Global state is managed by `src/renderer/state/useNeuroDeckState.ts`.

### The One Big File Problem
`lib.rs` owns `AppState`, the bridge server bootstrap, and module re-exports. The Tauri `run()` entry point and `generate_handler![]` have been removed. Command bodies, personas, themes, game detection, path utilities, and provider factories have been extracted to submodules. When adding a new feature, look for the existing pattern first before adding a new state struct — `AppState` is a grab-bag of `Arc<Mutex<T>>` fields.

`commands/mod.rs` remains the single bridge dispatch table (~5,400 lines). New commands are defined in a `src/` module and wired into the dispatch table; keep handlers short and delegate to module functions to avoid inflating the table further.

### Module Responsibilities
| Module | What It Owns |
|---|---|
| `lib.rs` | `AppState`, bridge server bootstrap, module re-exports |
| `models.rs` | `Theme`, `CustomPersona`, `PERSONAS`, `THEMES` |
| `config.rs` | TOML config parsing/validation and runtime config structs |
| `game.rs` | Game detection: `detect_game`, `steam_library_paths`, `game_exe_map`, `get_game_details` |
| `paths.rs` | `get_config_path`, `user_config_dir`, `user_bin_dir`, `get_home_dir`, `load_env_file` |
| `providers.rs` | `create_provider`, `provider_from_agent`, `default_agents` |
| `llm.rs` | `GeminiProvider`, `OllamaProvider`, HuggingFace, Kimi, OpenAI-compat providers; `generate_embedding()` for RAG |
| `lua.rs` | mlua runtime; globals: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona` |
| `pty_manager.rs` / `terminal.rs` | PTY sessions via `portable-pty`; `terminal.rs` owns higher-level terminal command handlers and diagnostics |
| `memory.rs` | Cosine-similarity vector DB; SQLite-backed with in-memory cache for fast search |
| `projects.rs` | Project Knowledge Spaces CRUD; associates sessions and memory with projects |
| `search.rs` | Universal Search engine using FTS5 `search_index` across messages, memory, and projects |
| `context_packs.rs` | Context Packs CRUD + memory association; scoped RAG filter by `pack_id` |
| `privacy.rs` | Privacy levels (`Standard`/`Private`/`Sensitive`/`Sealed`), `UnlockState`, `PrivacyFilter` for RAG/search/export gating |
| `dashboard.rs` | Workspace Intelligence Dashboard stats aggregation (sessions, messages, memory, privacy breakdown) |
| `db/` | SQLite persistence layer: `DbPool`, migrations runner, schema definitions |
| `ftp.rs` / `sftp.rs` | FTP/SFTP list/download/upload via `suppaftp`/`ssh2`; all sync ops wrapped in `spawn_blocking` |
| `tunnel.rs` | TCP loopback tunnel for SteamOS Game Mode → Desktop Mode bridge |
| `transfer.rs` | LAN P2P file transfer + Warpinator gRPC server; uses mDNS/mdns-sd peer discovery |
| `canvas_collab.rs` | TCP live canvas collaboration — host binds a port, join connects to peer |
| `deckcode/` | DeckCode input orchestration: schema parsing, raw input loop, bindings mapping, frontend IPC dispatch |
| `mcp.rs` | Model Context Protocol server (HTTP/JSON-RPC 2.0) on `127.0.0.1:{port}` (default 13337); tool whitelist |
| `orchestrator.rs` | Multi-agent pipeline/orchestrator: `Pipeline`, `AgentTask`, `OrchestratorPlan`, `execute_pipeline` |
| `scheduler.rs` | Cron-based scheduled tasks via `tokio-cron-scheduler`; persists to `data/scheduler/tasks.json` |
| `permissions.rs` | Capability/permission registry (`Capability`, permission profiles, agent→profile mapping) |
| `security.rs` | Agent workspace sandboxing, permission checks, security reports |
| `self_heal.rs` | Boot health recovery, automatic repair workflows |
| `sync.rs` | Cross-device sync for memory/sessions via configurable API base URL |
| `storage.rs` | Disk-backed key/value storage helpers |
| `torrent.rs` | BitTorrent metadata/magnet handling |
| `promptdrive.rs` | Prompt presets library CRUD |
| `model_registry.rs` / `hf_model_mgr.rs` / `ollama_mgr.rs` | Model discovery, HuggingFace/Ollama model management |
| `npm_packages.rs` | Frontend package manager integration for plugin/dependency installs |
| `audio_recorder.rs` / `whisper.rs` | Voice STT capture and Whisper-based transcription |
| `computer_use.rs` | Desktop automation: mouse, keyboard, screenshot, OCR |
| `lsp.rs` | Language Server Protocol client integration |
| `error.rs` / `bridge.rs` | Typed `BridgeError` and bridge server/telemetry |
| `doc_indexer.rs` | Document indexing pipeline for RAG |
| `workflow.rs` / `workflow_engine.rs` | 9 node types, template substitution, `eval_condition` with `preprocess_expr()` pre-pass |
| `plugin_mgr.rs` | Plugin lifecycle: load, toggle, install from URL, hot-reload, QA gate; `audit_log_path()` is `pub` |
| `remote_control.rs` | UDP remote control server — `start_remote_server_bridge()` / `stop_remote_server_bridge()` — ACTIVE in bridge |
| `commands/system.rs` | `generate_support_bundle` (redacted diagnostic archive), `get_system_health`, `get_bridge_telemetry`, `redact_line` |
| `commands/agent.rs` | Agent execution, streaming code execution (`exec_code_stream`) |
| `commands/academy.rs` | Academy learning progress, portfolio, mentor queries |
| `commands/api_lab.rs` | HTTP API client, collections, cURL import |
| `commands/cli_maker.rs` | Custom CLI commands/hooks definitions |
| `commands/git.rs` | Git repo discovery, status, commits, branches, diff |
| `commands/browser.rs` | Headless browser automation, citations, sessions |
| `commands/ide.rs` | IDE/workspace file operations |
| `commands/session.rs` | Session save/fork/export/delete |
| `commands/config.rs` | Runtime config get/set |

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
- Frontend: `src/renderer/features/canvas/CanvasView.tsx` calls `bridgeAdapter.invoke("exec_code_stream", { code, lang })`
- Supported languages: `python`, `bash`, `powershell`, `javascript`/`js` (passed to `exec_code_stream`)
- Backend: `commands/mod.rs` dispatches to `commands/agent.rs` `exec_code_stream()`
- Output streams via `canvas_exec_line` WebSocket events; completion via `canvas_exec_done`
- 120-second timeout enforced server-side
- Lua scripts go through `execute_lua` (separate path with `runLuaScript()` confirmation gate)
- HTML/CSS/other langs render in the preview iframe (no exec path)

### CSS Specificity Trap (legacy `app.css`)
In the legacy CSS, ID selectors (`#view-*`) have specificity 100, which beats `.view-content.active` (specificity 20). **Never add `display: flex` or `display: block` to `#view-*` ID rules** — it will permanently override the `.view-content { display: none }` hide rule and break any remaining static tab switching. The React app mounts views as components, so this trap mainly matters for the residual `app.css` chrome and any embedded HTML previews.

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
- **Windows GPU/network sandbox workaround** — on `win32`, `electron/main.js` appends `disable-gpu-sandbox`, `disable-network-service-sandbox`, `disable-features=IsolateOrigins,site-per-process,SpareRendererForSitePerProcess`, `disable-background-timer-throttling`, and `disable-renderer-backgrounding` before `app.whenReady()`. The same flags are passed by `electron/scripts/dev-launcher.js` and `e2e/support/electron-fixture.ts`. This prevents the long-running dev smoke-test crashes (`GPU process exited unexpectedly: exit_code=143` / `Network service crashed`) while keeping the renderer sandbox enabled.

---

## Rules

- **Every new backend command** must be: (1) defined in a `src/` module, (2) added to the bridge dispatch table in `commands/mod.rs`. The bridge server handles all routing via HTTP POST + WebSocket.
- **`start_remote_server` and `stop_remote_server` are ACTIVE commands** in the bridge (`commands/mod.rs` lines ~4941, ~4952) — they call `remote_control::start_remote_server_bridge()` / `stop_remote_server_bridge()`. They are NOT stubs. Only `set_kiosk_mode` is intentionally bridge-unavailable.
- **New Project/Search commands**: `create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`, `set_session_project`, `set_memory_project`, `get_project_sessions`, `get_project_memory`, `universal_search`.
- **New Context Pack commands**: `create_pack`, `list_packs`, `get_pack`, `update_pack`, `delete_pack`, `set_memory_pack`, `get_pack_memory`.
- **New Privacy commands**: `set_memory_privacy`, `unlock_sealed_records`, `lock_all_sealed`.
- **New Dashboard command**: `get_dashboard_stats`.
- **Permission commands**: `list_permission_profiles` (returns `profiles`, `default_profile_id`, `agent_profile_map`), `get_agent_permission_profile`, `set_agent_permission_profile`. The registry supports an `agent_profile_map` so individual agents can be assigned to specific profiles; it falls back to `default_profile_id` only when no mapping exists.
- **Observability commands**: `generate_support_bundle` (redacted archive), `get_system_health` (structured JSON with status/provider/model/memory_doc_count/plugin_count/kfms_version/issues and telemetry summary), `get_bridge_telemetry` (per-command counters + latency percentiles + summary), `reset_bridge_telemetry`.
- **Academy commands**: `academy_get_progress`, `academy_save_progress`, `academy_list_portfolio`, `academy_save_portfolio_entry`, `academy_complete_lab`, `academy_mentor_query`.
- **API Lab commands**: `api_request`, `api_save_collection`, `api_load_collection`, `api_delete_collection`, `api_list_collections`, `api_generate_request`, `api_curl_import`.
- **CLI Maker commands**: `cli_list_commands`, `cli_create_command`, `cli_update_command`, `cli_delete_command`, `cli_run_command`, `cli_list_hooks`, `cli_toggle_hook`, `cli_export_lua`, `cli_import_lua`, `cli_maker_save_plugin`, `cli_maker_export`.
- **Git commands**: `git_list_repos`, `git_add_repo`, `git_remove_repo`, `git_init`, `git_open_repo`, `git_clone`, `git_status`, `git_stage`, `git_unstage`, `git_discard`, `git_commit`, `git_log`, `git_branch_list`, `git_branch_create`, `git_branch_checkout`, `git_branch_delete`, `git_diff`, `git_pull`, `git_push`, `git_fetch`, `git_remote_list`, `git_remote_add`, `git_remote_remove`, `git_generate_commit_message`, `git_generate_ssh_key`, `git_ssh_public_keys`, `git_credential_get/store/delete`.
- **IDE / Workspace commands**: `list_workspace_files`, `read_workspace_file`, `write_workspace_file`, `create_workspace_file`, `delete_workspace_file`, `rename_workspace_file`.
- **Session commands**: `list_sessions`, `get_session`, `delete_session`, `fork_session`, `export_session_markdown`, `export_session_content`.
- **Orchestrator commands**: `start_orchestrated_task`, `get_orchestration_status`, `stop_orchestration`.
- **Scheduler commands**: `list_scheduled_tasks`, `add_scheduled_task`, `delete_scheduled_task`, `toggle_scheduled_task`, `run_task_now`.
- **MCP commands**: `get_mcp_status`, `get_mcp_tool_whitelist`, `set_mcp_tool_whitelist`, `start_mcp_server`, `stop_mcp_server`.
- **Do not use `std::sync::Mutex` across `.await` points** in bridge command handlers — `MutexGuard` is not `Send` and will break axum's `Handler` trait. Use `tokio::sync::Mutex` or rely on `SqlitePool`'s internal thread-safety.
- **CSS changes**: the React build imports `src/renderer/index.css`, which loads the DS tokens. For legacy `app.css` edits, run `npm run --prefix frontend build` — the Vite dev server hot-reloads CSS but Electron's WebView doesn't always pick up the change without a rebuild. For Tailwind class changes, just rebuild.
- **Persona/theme additions**: personas are `HashMap` entries in the `PERSONAS` lazy_static in `models.rs`; themes are `THEMES`. Add entries there, then update the `get_personas` / `get_themes` command return format and the React settings UI (`src/renderer/features/settings/`) to match.
- **New PTY sessions**: always call `pty_kill` for the session ID before `pty_spawn` with the same ID. Double-spawning the same ID creates a resource leak (the old reader thread keeps running).
- **FTP/SSH backend**: use `tokio::task::spawn_blocking` for all `suppaftp` and `std::net::TcpStream` calls — they are synchronous and will block the async executor if called directly.
- **Window size**: all new views must fit within 1280×800. The flex column layout in `.view-container` is `position: absolute; top: 0; left: 0; width: 100%; height: 100%`. Use `overflow: hidden` on view roots and scroll internally.

---

## Hard Constraints / Anti-Patterns

- **Do not add `display: flex` to `#view-*` ID rules in app.css** — kills legacy tab switching (see CSS Specificity Trap above). The React app handles view visibility via component mounting, but the legacy `app.css` rules still apply to any remaining static chrome.
- **Do not call `pty_spawn` without a preceding `pty_kill`** for the same session ID.
- **Do not load the full FTP file into a `Vec<u8>` for files that could be large** — `retr_as_buffer` is for small files only. Stream to disk for anything user-selectable.
- **Do not use `unwrap()` in command handlers** — panics crash the backend process and the frontend gets a blank error. Use `map_err(|e| e.to_string())?`.
- **Do not modify React component JSX by searching for partial strings** — use AST-aware replacements or full component rewrites. For generated HTML inside legacy helpers, match a full containing element to avoid ambiguous edits.
- **Adding npm packages is allowed but gated** — the frontend is now a standard React + Tailwind + Vite app with `package.json` dependencies. New runtime dependencies must be justified, kept small, and added to the workspace root (`npm -w frontend install <pkg>`). Do not add heavy bundled libraries for trivial UI tasks.
- **Never hardcode the config file path** as just `"llm-term.toml"` — always use the path-resolution logic in `paths.rs`/`lib.rs` that checks env var and OS config dir first.
- **Never expose secrets through the bridge** — `generate_support_bundle` uses `redact_line()` to scrub API keys, Bearer tokens, and password lines. Any new diagnostic command must follow the same pattern.
- **Do not add `display: none` inside Electron `webRequest.onHeadersReceived`** — it runs on every response including the bridge's HTTP/WS traffic. Only inject `Content-Security-Policy`; do not modify response bodies.
- **Do not call `Notification.permission` in the Electron main process** — that is a Web API. Use `Notification.isSupported()` instead (Electron's class).
- **Do not use inline `style="..."` attributes for static styling** — all visual styles must use Tailwind classes or CSS classes from the design-token system. Inline styles are reserved for dynamic values controlled by JavaScript (e.g., `display:none` toggles, `width:0%` progress bars).
- **Do not use magic `z-index` values in CSS** — always use the `--z-*` token scale defined in `:root`. The scale ranges from `--z-behind` (-1) through `--z-toast-peak` (30000) and is documented in `app.css` / `tokens.css`.
- **Do not set `will-change` statically in CSS** — it must be added dynamically via JavaScript before animations and removed after to avoid GPU memory waste. Use React refs or the `useWillChange` hook pattern for animations.
- **All new modals/overlays must trap focus** — use `src/renderer/components/primitives/FocusTrapContainer.tsx` (which wraps `focus-trap.js`) or an equivalent accessible focus-management pattern. This ensures keyboard and gamepad navigation stays trapped.
- **All interactive controls must have a minimum 40×40px hit target** on primary UI chrome (tabs, sidebar toggles, top-nav buttons). Use `min-width` / `min-height` so layout is not disrupted.

### Duplicate / clone cleanup workflow

- Run a fresh semantic Fallow scan before and after large refactors so duplication work is driven by evidence, not guesses.
- Prefer extracting local helpers, shared render tables, and token maps over rewriting behavior-heavy logic.
- Leave user-owned config files alone unless the user explicitly asks for them; in this repo, `llm-term.toml` is treated as user state.
- After structural UI or shared helper changes, verify with `npm run frontend:typecheck` and `npm run frontend:test` before considering the pass complete.

---

## GitOps, CI/CD, and UI Rollback

NEURODECK uses a branch-protected, PR-only GitOps model. All contributors (human and agent) must follow it.

### Branch Policy

- Primary branch: `master` (existing convention). `main` is treated as an optional mirror.
- Direct pushes to `master`, `main`, or `release/*` are blocked by `.github/workflows/branch-policy.yml`.
- Allowed branch prefixes: `agent/`, `feature/`, `ui/`, `bugfix/`, `hotfix/`, `docs/`, `kfms/`, `release/`.
- PR titles must start with `[UI]`, `[AGENT]`, `[CI]`, `[HOTFIX]`, `[BUGFIX]`, `[FEATURE]`, `[DOCS]`, `[KFMS]`, or `[RELEASE]`.

### Local Preflight

Run before every commit/push:

```bash
npm run preflight
```

This checks branch name, staged paths, secrets, and KFMS metadata in <30 seconds.

### UI Checkpoints

Before a large UI pass, create a checkpoint:

```bash
npm run checkpoint:ui -- --name phase-3-aaaa --description "Baseline before Phase 3 UI pass"
```

This builds, tags (`ui-checkpoint-phase-3-aaaa`), and appends metadata to `ui-checkpoints.json`.

To inspect or apply a rollback:

```bash
npm run rollback:ui:list
npm run rollback:ui:preview ui-checkpoint-phase-3-aaaa
npm run rollback:ui:apply ui-checkpoint-phase-3-aaaa
```

Rollbacks only touch tracked UI source/build files; user data in `~/.config/neurodeck/` is never modified.

### Agent PRs

Agent-driven PRs must include an `## Agent report` section (see `.github/PULL_REQUEST_TEMPLATE.md`) and must not modify protected paths such as `.github/workflows/*`, `infra/meta/meta.json`, `infra/telemetry/health.json`, or lockfiles without explicit human approval.

### Emergency Release Rollback

If a published release must be retracted, use the **Emergency Rollback** GitHub Actions workflow. It creates a `rollback/<tag>` branch, updates `health.json` to `rolled-back`, and drafts a rollback release for human review.

See:
- `docs/AGENT-GITOPS.md` for full agent rules.
- `docs/UI-ROLLBACK.md` for the UI checkpoint system.
- `docs/CI-CD-PIPELINE.md` for workflow documentation.

---

## Repository Structure

The project follows the structure documented in `neurodeck-production-package/docs/07_CI_CD_Setup.md`. Key locations:

| Directory | What Lives Here |
|---|---|
| `src/` | Shared TypeScript contracts, schemas, registries, and types used by frontend and backend |
| `src/shared/contracts/` | IPC/bridge contracts (agent, chat, errors, providers, sessions, backend health) |
| `src/shared/terminal/` | Terminal contracts, profiles, safety types, controller map |
| `src/shared/theme/` | Theme registry, design tokens, motion/accessibility profiles |
| `src-tauri/src/` | Rust backend — ~5,400-line dispatch table in `commands/mod.rs`, all modules |
| `src-tauri/src/commands/` | Bridge command implementations (agent, browser, git, system, session...) |
| `src-tauri/src/db/migrations/` | SQLite schema evolution (001, 002, 003...) |
| `src-tauri/tests/` | Rust integration tests |
| `frontend/src/` | React 19 + TypeScript frontend — `main.tsx`, `react/App.tsx`, `react/features/`, `design-system/` |
| `src/renderer/` | React app root, feature views, components, state, services, hooks, theme |
| `src/renderer/services/bridgeAdapter.ts` | Typed bridge client: `invoke<T>()`, `listen()`, `BridgeError`, retry/backoff |
| `src/renderer/design-system/` | Canonical design tokens, themes, and components |
| `src/shared/` | Shared TypeScript types and contracts used by both frontend and backend |
| `electron/` | Electron main process + preload script |
| `infrastructure/` | Rust workspace crate — secrets, OAuth, Warpinator |
| `plugins/` | Lua plugins auto-loaded at startup |
| `assets/` | Static assets — brand, steam-grid, steam_input, deckcode schemas |
| `docs/` | All documentation — epics, roadmaps, architecture, user guide |
| `neurodeck-production-package/` | **North star** — PRD, SDS, release gates, backlog, CI templates |
| `production_code_prompt_system/` | PromptFlow CLI + 15 production prompts |
| `scripts/` | Build & utility scripts — `brand/`, `dev/`, `git/`, `git-hooks/`, `kfms/`, `perf/`, `powershell/`, `release/`, `report/`, `shell/`, `steamdeck/`, `ui/`, `verify/` |
| `scripts/dev/` | Development utilities (CSS, JS, JSON, Lua, Python helpers) |
| `scripts/verify/` | TypeScript verification scripts for architecture, security, IPC, wiring, real-data |
| `scripts/ui/` | UI checkpoint/rollback scripts |
| `e2e/` | Playwright E2E tests (~390 tests) |
| `tests/` | Shared test fixtures (config, memory, plugins) + Vitest contract/integration/unit tests |
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
| Architecture overview | `docs/ARCHITECTURE.md` |
| Bridge server protocol & telemetry | `docs/BRIDGE_SERVER.md` |
| Electron/React migration handoff | `docs/ELECTRON_MIGRATION_HANDOFF.md` |
| Developer handoff guide | `docs/DEVELOPER_HANDOFF.md` |
| Plugin development guide | `docs/PLUGIN_DEV_GUIDE.md` |
| Fallow quality gates | `docs/FALLOW_GATES.md` |
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

- **Canvas Python/Bash/JS run IS fully implemented** — `exec_code_stream` dispatches via `commands/agent.rs`, streams stdout via `canvas_exec_line` WebSocket events, and enforces a 120s timeout. The React Canvas view calls `bridgeAdapter.invoke("exec_code_stream", { code, lang })` via `src/renderer/features/canvas/CanvasView.tsx`. HTML/CSS render in the preview iframe (no exec). Lua uses the separate `execute_lua` path.

- **`send_command` vs `execute_command_stream`** — there are two different LLM invocation paths. `execute_command_stream` is the older streaming path. `send_command` is the newer, fuller path with RAG injection, game context, persona, and memory storage. Always use `send_command` for new features.

- **Voice STT uses cpal on Windows/macOS**: `audio_recorder.rs` captures 16kHz mono WAV via `cpal` + `hound`, then feeds it to `whisper.cpp` CLI. Linux still prefers `arecord` but falls back to `cpal` if unavailable. The Whisper model path is configurable in `llm-term.toml` `[stt]` section.

- **The 📊 context drawer / TelemetryWidget** is wired and populated via `get_context_stats` — shows provider, model, RAM, memory record count, and session info. The toggle button slides the drawer open from the right side of the chat input bar in `src/renderer/components/workspace/TelemetryWidget.tsx`.

- **BMAD personas are Lua-registered, not hardcoded** — `/john`, `/sally`, etc. call `setPersona()` via `plugins/bmad.lua`. If the Lua plugin fails to load, those commands silently disappear. The 9 built-in personas (including the BMAD ones) are hardcoded in `models.rs`'s `PERSONAS` lazy_static as a fallback.

- **Radial menu uses backtick for keyboard, L2 for gamepad** — but L2 only works if the Steam Input `.vdf` profile is active. In desktop mode without Steam running, only the backtick shortcut works. The React `ControllerHintBar` (`src/renderer/components/layout/ControllerHintBar.tsx`) renders the current radial segments; the legacy `RADIAL_SEGMENTS` array is gone.

- **`pty_spawn` now accepts an `args: Option<Vec<String>>` parameter** — this was added to support SSH sessions. All existing callers pass `args: null` or omit the field.

- **Prompt Lab view** (`src/renderer/features/prompt-lab/PromptLabView.tsx`) exposes AIDA/SCQA/PASTOR/CoT/ToT/PAS/Role+Constraints formulas, a template gallery, and a JPE explanation pane backed by `generate_jpe_explanation` (calls the active LLM). The Lua plugin `plugins/promptgen.lua` registers `/promptlab`, `/promptgen <task>`, and `/formula <name> <task>` shell commands.

- **Cinematic boot screen** is now a React component rendered by `App.tsx` during initial data loading. It calls `list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, and `get_context_stats` during startup to show real system state. It fades out and is removed from the DOM after completion — it does NOT block app initialization.

- **Onboarding wizard** is a React modal (`src/renderer/components/onboarding/OnboardingModal.tsx`) shown to first-time users; calls `run_onboarding_diagnostics` to check PTY/network/keychain health. Dismissed state is persisted in `localStorage("neurodeck_onboarding_complete")`.

- **Warpinator gRPC** runs on port `42000` inside `transfer.rs`'s `init_transfer_service`. Requires protobuf compilation — `infrastructure/build.rs` uses `protoc-bin-vendored` to avoid a system protoc dependency.

- **`EventEmitter` trait**: `bridge.rs` defines an `EventEmitter` trait implemented by `WsBroadcaster`. All emit-only modules (`canvas_collab.rs`, `transfer.rs`, `lsp.rs`) are generic over `E: EventEmitter`, enabling the bridge server to emit events via WebSocket.

- **Disk persistence migration**: SSH/FTP/SFTP profiles and custom themes are persisted to `data/profiles/` and `data/themes/` under the OS config directory. On first boot, the React frontend migration effect moves any legacy `localStorage` data to disk and deletes the old keys.

- **DeckCode multi-language code snippets** — `deckcode-action` events received on the frontend with the `insert_snippet:` prefix are dynamically injected into the active textarea or Monaco editor, automatically parsing `${cursor}` placeholders to adjust the cursor selection.

- **`workflow_engine.rs` condition evaluator** — `eval_condition` runs a `preprocess_expr()` pre-pass before scanning for operators. This pre-pass resolves `input.len()`, `input.contains("x")`, and bare `input` tokens to their actual values so that comparisons like `input.len() > 10` work numerically rather than lexicographically. Without the pre-pass, `"input.len()"` as a string is lexicographically greater than `"10"` (`'i' > '1'`), causing false positives.

- **Support bundle redaction** — `generate_support_bundle` in `commands/system.rs` uses `redact_line()` which scrubs: lines containing `AIza` (Gemini keys), `GOCSPX-` (OAuth tokens), `Bearer ` prefixes, and `password=` patterns. Keys appear as `[SET]` or `[keychain or unset]` in the output. Never log raw credentials in any new diagnostic command.

- **Plugin QA gate** (`.github/workflows/plugin-qa.yml`): runs on `plugins/**` changes. A Python static analysis script checks: `@name`, `@version`, `@author` annotations present; file size ≤ 512 KB; 8 blocked Lua API patterns absent (`os.execute`, `io.popen`, `dofile`, `loadfile`, `loadstring`, `package.loadlib`, `require("ffi")`, `debug.*`). CI fails if any plugin fails QA.

- **PTY restart delay** — `restartTerminalSession` includes a 150ms delay between `pty_kill` and `pty_spawn`. The old reader thread needs time to exit after its master fd closes; without the delay both threads briefly co-exist and emit duplicate `pty_output` events on the same session ID.

- **MCP server** (`mcp.rs`) implements Model Context Protocol 2024-11 over HTTP/JSON-RPC 2.0 on `127.0.0.1:{port}` (default `13337`). Tools are whitelisted; defaults are `neurodeck_chat`, `get_status`, `memory_add_fact`, `memory_list_all`, `memory_search`. Exposing `read_file`, `write_file`, `run_shell`, `run_code`, or `run_lua` requires explicit user opt-in via Settings.

- **Orchestrator** (`orchestrator.rs`) runs multi-agent pipelines (`Pipeline` of `PipelineNode`s) and hierarchical plans (`OrchestratorPlan` of `AgentTask`s). Pipelines are saved to disk; execution respects the active agent and `inputs` edges for context flow.

- **Scheduler** (`scheduler.rs`) uses `tokio-cron-scheduler` to run `ScheduledTask` entries. Tasks are persisted to `data/scheduler/tasks.json` under the OS config dir. Each task has a cron expression, goal, and enabled flag; missed runs fire on startup.

- **Bridge telemetry** is live: every bridge command is timed and counted. `get_bridge_telemetry` returns per-command counters, latency percentiles, and a summary; `reset_bridge_telemetry` clears counters. Telemetry is in-memory only (resets on sidecar restart).

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

All active workflows:

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
| `branch-policy.yml` | PR / push | Enforces branch naming and direct-push protection |
| `accessibility.yml` | PR + push master | axe-core accessibility checks |
| `visual-regression.yml` | PR + push master | Playwright visual regression (informational) |
| `ui-checkpoint-gate.yml` | PR | Validates UI checkpoint metadata and rollback integrity |
| `emergency-rollback.yml` | workflow_dispatch | Publishes a rollback release for a broken tag |
| `release-manifest.yml` | release | Generates and attaches release manifest artifacts |
| `model-support-report.yml` | workflow_dispatch | Probes provider/model compatibility matrix |
| `chromatic.yml` | push master | Chromatic visual review / Storybook |
| `nightly.yml` | schedule | Nightly build + long-running tests |

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

npm run --prefix frontend dev         # Frontend only (React/CSS — bridgeAdapter.invoke() calls fail without sidecar)
npm run --prefix frontend build       # Vite build only

cd src-tauri && cargo check           # Fast type-check
cd src-tauri && cargo clippy          # Lint
cd src-tauri && cargo build           # Debug build (~2min first time due to mlua vendored)
cd src-tauri && cargo test --lib      # Unit tests (140+ tests)
cd src-tauri && cargo test --tests    # Integration tests (10 tests)
# Windows note: `cargo test --workspace --all-targets` may hit PDB limit (LNK1318).
# Use `cargo test --lib` or individual `--test <name>` instead.

# Frontend tests
npm run frontend:test                 # Runs the frontend workspace Vitest suite natively
# The root command delegates through npm workspaces so Windows does not cross
# into WSL and attempt to load Linux-native Rolldown bindings.

# KFMS
./scripts/kfms/khaotic-init.sh stamp     # Re-stamp build block after changes
./scripts/kfms/khaotic-init.sh status    # Print release score and gate summary
./scripts/kfms/khaotic-init.sh sweep     # Move loose root files to .loose/inbox/

# Verification gates (TypeScript)
npm run verify:wiring                 # IPC wiring sanity check
npm run verify:ipc                    # IPC channel contracts
npm run verify:all                    # no-mocks + security + real-data + contracts
npm run production:cleanup-gate       # no-tauri / no-dead-code / no-prod-mocks / replacements / boundaries
npm run production:chat-gate          # AI chat real-data gate
npm run production:ide-gate           # IDE real-data gate

# Storybook / Design System
npm run storybook                     # Storybook dev server on :6006
npm run build-storybook               # Static Storybook build
npm run chromatic                     # Chromatic visual review

./install.sh                          # SteamOS deploy → ~/Applications/neurodeck/
./launch_gamescope.sh                 # Run in gamescope 1280×800 (Steam Deck Game Mode)
.\package_release.ps1                 # Windows NSIS packaging
```
