# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

NEURODECK is a Tauri v2 desktop app that turns a Steam Deck into an AI-powered terminal OS — LLM chat, live code canvas, PTY shell, autonomous agent, vector memory, and gamepad-native navigation in one 1280×800 fullscreen window.

---

## Non-Obvious Tooling & Quirks

- **Two config files exist**: `llm-term.toml` at the project root AND `src-tauri/llm-term.toml`. The Rust binary reads `src-tauri/llm-term.toml` during `cargo run` / `tauri dev` (working dir is `src-tauri/`). The root copy is what the installer deploys. Always edit both or let `config.rs` path logic handle it.
- **`GEMINI_API_KEY` must be set as an env var** before `npm run tauri dev`. If absent, the binary silently falls back to Ollama with no user-visible error.
- **Vite dev standalone** (`npm run --prefix frontend dev`) works but all `invoke()` calls hit the mock IPC shim at the top of `main.js` (lines ~130–225). All new Tauri commands must be added to both the real handler in `lib.rs` AND the mock shim.
- **Lua auto-loads on startup**: every `.lua` file in `plugins/` is loaded at app init via `lua.rs`. A syntax error in any plugin silently suppresses that plugin — check the terminal console for `[Lua Error]` lines.
- **Rust version is pinned to 1.77.2** in `Cargo.toml`. The `mlua` crate with `vendored` feature compiles Lua 5.4 from source — first build takes 2–3 minutes.
- **suppaftp 6.x `retr_as_buffer`** returns `Cursor<Vec<u8>>` and loads the entire file into RAM. Don't use it for files > 100MB.

---

## Architecture Map

### IPC Flow
```
frontend/src/main.js
  └─ invoke("command_name", { args })  ──►  src-tauri/src/lib.rs  (Tauri command)
  └─ listen("event_name", handler)     ◄──  app_handle.emit("event", payload)
```
All streaming (LLM tokens, PTY output, agent steps) goes through `emit()`. All request/response goes through `invoke()`.

### The One Big File Problem
`lib.rs` (~1600 lines) owns everything: command handlers, app state structs, persona definitions, theme palettes, game detection, voice I/O, and the agent loop. When adding a new feature, look for the existing pattern first before adding a new state struct — `AppState` is a grab-bag of `Arc<Mutex<T>>` fields.

`main.js` (~4300 lines) is similarly monolithic by design (no framework). Feature sections are delimited by `// ===` banner comments. New features go at the end of their section, not at the bottom of the file.

### Module Responsibilities
| Module | What It Owns |
|---|---|
| `lib.rs` | All `#[tauri::command]` handlers, `AppState`, themes, personas, game detection, voice I/O, agent loop |
| `llm.rs` | `GeminiProvider` (streaming SSE) and `OllamaProvider` (local); `generate_embedding()` for RAG |
| `lua.rs` | mlua runtime; globals: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona` |
| `pty_manager.rs` | PTY sessions via `portable-pty`; `HashMap<String, PtySession>` keyed by session ID; supports multiple sessions |
| `memory.rs` | Cosine-similarity vector DB; persists to `data/memory/chat_history.json` |
| `ftp.rs` | FTP list/download/upload via `suppaftp`; all sync ops wrapped in `spawn_blocking` |
| `tunnel.rs` | TCP loopback tunnel for SteamOS Game Mode → Desktop Mode bridge |
| `transfer.rs` | LAN P2P file transfer + Warpinator gRPC server; uses mDNS/mdns-sd peer discovery |
| `canvas_collab.rs` | TCP live canvas collaboration — host binds a port, join connects to peer |

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
Memory context injection is live in `send_command` (lib.rs ~line 1030): every user message generates an embedding via `provider.generate_embedding()`, searches the vector DB for top-3 relevant records, and prepends them to the LLM context. This requires the Gemini API key to be set — if Ollama is active, embedding generation may fail silently and RAG is skipped.

### PTY Session Routing
`pty_output` and `pty_exit` events carry a session `id` field. Multiple PTY sessions can coexist in `PtyState.sessions`. The main terminal uses `ptySessionId = "main_pty_session"`. The SSH tab creates sessions named `ssh_session_<timestamp>`. Both are routed in the same `listen("pty_output", ...)` handler by ID.

### CSS Specificity Trap (was live bug)
ID selectors (`#view-*`) have specificity 100, which beats `.view-content.active` (specificity 20). **Never add `display: flex` or `display: block` to `#view-*` ID rules** — it will permanently override the `.view-content { display: none }` hide rule and break tab switching. Use `flex-direction`, `overflow`, `background` on ID rules only.

---

## Rules

- **Every new Tauri command** must be: (1) defined with `#[tauri::command]` in a `src/` module, (2) added to `generate_handler![]` in `lib.rs`, (3) added to the mock IPC switch in `main.js`. Skip any step and it silently fails in browser dev mode.
- **CSS changes**: run `npm run --prefix frontend build` after edits to `app.css` — the Vite dev server hot-reloads CSS but Tauri's WebView doesn't always pick up the change without a rebuild.
- **Persona/theme additions**: personas are `HashMap` entries in the `PERSONAS` lazy_static in `lib.rs`; themes are `THEMES`. Add entries there, then update the `get_personas` / `get_themes` command return format to match what the settings modal JS expects.
- **New PTY sessions**: always call `pty_kill` for the session ID before `pty_spawn` with the same ID. Double-spawning the same ID creates a resource leak (the old reader thread keeps running).
- **FTP/SSH backend**: use `tokio::task::spawn_blocking` for all `suppaftp` and `std::net::TcpStream` calls — they are synchronous and will block the async executor if called directly.
- **Window size**: all new views must fit within 1280×800. The flex column layout in `.view-container` is `position: absolute; top: 0; left: 0; width: 100%; height: 100%`. Use `overflow: hidden` on view roots and scroll internally.

---

## Hard Constraints / Anti-Patterns

- **Do not add `display: flex` to `#view-*` ID rules in app.css** — kills tab switching (see CSS Specificity Trap above).
- **Do not call `pty_spawn` without a preceding `pty_kill`** for the same session ID.
- **Do not load the full FTP file into a `Vec<u8>` for files that could be large** — `retr_as_buffer` is for small files only. Stream to disk for anything user-selectable.
- **Do not use `unwrap()` in Tauri command handlers** — panics crash the backend process and the frontend gets a blank error. Use `map_err(|e| e.to_string())?`.
- **Do not modify `main.js` HTML template strings by searching for partial strings** — the template is one massive string literal. Always match a full containing element to avoid ambiguous edits.
- **Do not add npm packages** — the frontend is intentionally zero-dependency except for `xterm.js`, `marked.js`, and Tauri's JS API (all CDN or vendored). Adding a bundled npm package will bloat the Tauri WebView bundle.
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

- **The config path `../llm-term.toml` fallback** was added because the binary's working directory during `tauri dev` is `src-tauri/`, not the project root. Four copies of `llm-term.toml` exist across the project (`root`, `src-tauri/`, `assets/`, `dist/`). Only `src-tauri/llm-term.toml` is read at runtime. This is load-bearing — don't remove the path check.

- **`google_client_id` must be set in `llm-term.toml`** under `[llm]` for the OAuth Gemini sign-in flow to work. `start_oauth_flow` reads it from `AppState.config.llm.google_client_id` and returns an error if empty. Register a client at console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs (TV/Device type).

- **Canvas Python/Bash "run" does nothing** — the Run button for non-HTML canvas languages shows a "run hint" message but does not execute code. The Agent tab is what actually runs Python/Bash. This is intentional-ish but confusing — it's flagged in `ANTIGRAVITY_HANDOFF.md` as a must-fix.

- **`send_command` vs `execute_command_stream`** — there are two different LLM invocation paths. `execute_command_stream` is the older streaming path. `send_command` is the newer, fuller path with RAG injection, game context, persona, and memory storage. Always use `send_command` for new features.

- **Voice STT returns raw audio via `arecord`** — the `stop_recording` command returns transcribed text, but the transcription quality depends on whether `espeak`/`arecord` are installed. On Windows, `start_recording` returns a mock string. The STT path does NOT currently use Whisper or any AI model — it's system-tool-limited.

- **The 📊 context drawer toggle exists but the drawer has no content** — the `inspectDrawer` container is wired to the toggle button but no data is injected into it. It looks like a collapsed empty panel. Populating it is listed as Priority 3 in `ANTIGRAVITY_HANDOFF.md`.

- **BMAD personas are Lua-registered, not hardcoded** — `/john`, `/sally`, etc. call `setPersona()` via `plugins/bmad.lua`. If the Lua plugin fails to load, those commands silently disappear. The 9 built-in personas (including the BMAD ones) are also hardcoded in `lib.rs`'s `PERSONAS` map as a fallback.

- **Radial menu uses backtick for keyboard, L2 for gamepad** — but L2 only works if the Steam Input `.vdf` profile is active. In desktop mode without Steam running, only the backtick shortcut works. The radial menu segments are hardcoded to the original 8 views — the new SSH tab is not in the radial menu yet.

- **`pty_spawn` now accepts an `args: Option<Vec<String>>` parameter** — this was added to support SSH sessions. All existing callers pass `args: null` or omit the field. The mock IPC shim does not need updating for this since it ignores extra args.

- **Prompt Lab tab** (`#view-prompt-lab`) was added by the Google Antigravity automated sprint. It exposes AIDA/SCQA/PASTOR/CoT/ToT/PAS/Role+Constraints formulas, a template gallery, and a JPE explanation pane backed by `generate_jpe_explanation` (calls the active LLM). The Lua plugin `plugins/promptgen.lua` registers `/promptlab`, `/promptgen <task>`, and `/formula <name> <task>` shell commands.

- **Cinematic boot screen** (`#boot-overlay`) runs as an IIFE at the bottom of `main.js`. It calls `list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, and `get_context_stats` during startup to show real system state. It fades out and is removed from the DOM after completion — it does NOT block app initialization.

- **Onboarding wizard** (`#onboarding-modal`) shown to first-time users; calls `run_onboarding_diagnostics` to check PTY/network/keychain health. Dismissed state is persisted in `localStorage("onboardingDone")`.

- **Warpinator gRPC** runs on port `42000` inside `transfer.rs`'s `init_transfer_service`. The `STermWarpinatorCallbacks` struct wires the gRPC callbacks to `AppState` and `app_handle.emit()`. Requires protobuf compilation — `infrastructure/build.rs` uses `protoc-bin-vendored` to avoid a system protoc dependency.

---

## Dev Commands

```bash
npm run tauri dev                     # Hot-reload (Vite + Rust)
npm run build                         # Production build

npm run --prefix frontend dev         # Frontend only (uses mock IPC)
npm run --prefix frontend build       # Vite build only

cd src-tauri && cargo check           # Fast type-check
cd src-tauri && cargo clippy          # Lint
cd src-tauri && cargo build           # Debug build (~2min first time due to mlua vendored)

./install.sh                          # SteamOS deploy → ~/Applications/neurodeck/
./launch_gamescope.sh                 # Run in gamescope 1280×800 (Steam Deck Game Mode)
.\package_release.ps1                 # Windows MSI packaging
```
