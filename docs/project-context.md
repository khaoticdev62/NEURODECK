# NEURODECK — Project Context

> This file is loaded automatically by every BMAD agent as foundational context.
> Keep it current as the project evolves.

---

## Project Identity

| Field | Value |
|---|---|
| **Name** | NEURODECK |
| **Type** | Tauri v2 Desktop Application |
| **Platform targets** | Steam Deck (primary, 1280×800), Windows, Linux |
| **Version** | 1.3.0 |
| **KFMS codename** | Isis |
| **Repo** | https://github.com/khaoticdev62/NEURODECK |
| **Dev** | khaoticdev |

---

## Purpose

NEURODECK is an AI-powered terminal and productivity interface designed for the Steam Deck in Game Mode. It combines an LLM chat interface, live code canvas, autonomous coding agent, PTY terminal, memory/RAG system, and gamepad-native navigation into a single unified desktop app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop runtime** | Tauri v2 (Rust + WebView2/WebKit) |
| **Backend language** | Rust (edition 2021, rust-version 1.77.2) |
| **Frontend** | Vite + Vanilla JavaScript (no framework) |
| **Scripting** | Lua 5.4 via `mlua` crate |
| **Terminal emulator** | `portable-pty` (Rust) + `xterm.js` (frontend) |
| **LLM providers** | Google Gemini (streaming, default) · Ollama (local) |
| **Memory / RAG** | Custom cosine-similarity vector DB (`memory.rs`) |
| **Build system** | `npm run tauri dev` / `npm run build` |
| **Packaging** | MSI + NSIS (Windows), AppImage (Linux) |

---

## Architecture

### IPC Pattern
Frontend (`frontend/src/main.js`) ↔ Rust backend (`src-tauri/src/lib.rs`) via Tauri IPC:
- `invoke('command_name', { args })` — synchronous-style requests
- `app_handle.emit(event, payload)` — streaming/async updates (chat, terminal output)

### Backend Modules

| Module | File | Responsibility |
|---|---|---|
| Core | `lib.rs` | All Tauri command handlers, state management, themes, personas, game detection |
| LLM | `llm.rs` | `GeminiProvider` (streaming SSE) and `OllamaProvider` (local), embedding generation |
| Lua | `lua.rs` | Lua 5.4 runtime; globals: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona` |
| PTY | `pty_manager.rs` | Cross-platform PTY via portable-pty; native shell sessions |
| Memory | `memory.rs` | Vector memory DB with cosine similarity search; persists to `data/memory/chat_history.json` |
| Storage | `storage.rs` | Session save/load as JSON in `sessions/` |
| Config | `config.rs` | Parses `llm-term.toml` at startup |
| Tunnel | `tunnel.rs` | SteamOS LAN tunneling |
| Transfer | `transfer.rs` | P2P file sharing over LAN |
| Sync | `sync.rs` | Encrypted cloud sync for memory records and saved chat sessions |
| Canvas Collaboration | `canvas_collab.rs` | Multi-peer LAN workspace transport for code, chat, presence, and approvals |

### Frontend Structure

Single-file vanilla JS (`frontend/src/main.js`, ~7000+ lines):
- Chat UI with markdown rendering via `marked.js`; welcome screen with 6 feature-card starters
- Terminal emulator via `xterm.js` + `xterm-addon-fit`; multi-session tab support (up to 5)
- Live Canvas (split: code editor + iframe preview); Python/Bash exec via `agent_exec_code`
- Autonomous Agent loop (LLM → exec → iterate, up to 5 steps)
- Memory UI (search, filter, pin, delete, add facts)
- Browser (sandboxed iframe with speed dial homepage, 8 bookmarks)
- LAN/SFTP/FTP file sharing + tunnel client + Remote Control server
- Docs / Knowledge Base (semantic search over indexed local documents)
- SSH tab (PTY + password/key auth + saved profiles)
- PromptLab (AIDA/SCQA/PASTOR/CoT/ToT formula templates)

Stylesheet: `frontend/src/app.css` (~9000+ lines), `frontend/src/style.css` (base reset)

---

## Features Implemented

### Sprint 1 — Game Detection
- Scans Steam ACF manifest files (`appmanifest_*.acf`) across all Steam library paths
- Linux: `/proc/*/cmdline` scanner for currently running games
- Windows: Steam registry + environment variable library paths
- Game badge in status bar; context injected into LLM system prompt

### Sprint 2 — Live Code Canvas (`🎨 Canvas` tab)
- Split pane: Monaco-style textarea editor (left) + sandboxed iframe preview (right)
- Languages: HTML, CSS, JavaScript (console.log capture), Markdown (CDN marked), Bash/Python (run-hint)
- Draggable divider; Ctrl+Enter to run; 600ms debounce live update
- "→ Canvas" button on chat code blocks loads code and switches to tab

### Sprint 3 — Autonomous Coding Agent (`🤖 Agent` tab)
- User describes task → LLM writes code → Rust executes in subprocess → output fed back → iterate
- Max 5 steps; JSON response format parsed from LLM; markdown fence stripping
- `agent_step` Tauri command: streams full LLM response with structured agent system prompt
- `agent_exec_code` Tauri command: spawns python/bash/node/powershell with 30s timeout
- Stop button; "→ Canvas" sends last code to Canvas view

### Sprint 4 — Memory UI (`🧠 Memory` tab)
- Browse all vector DB records with search + filter tabs (All / Pinned / User / AI / Facts)
- Pin/unpin records; delete individual records; add manually pinned facts
- Lazy load on tab activation; sorted pinned-first then newest-first
- Rust commands: `memory_list_all`, `memory_delete`, `memory_pin`, `memory_add_fact`

### Sprint 5 — Steam Input + Radial Menu
- **Radial Menu**: Hold L2 trigger → 8-segment circular overlay; left stick selects segment; release navigates
- 8 segments (clockwise from top): Chat, Canvas, Terminal, Tunnel, Browser, Agent, Memory, Share
- Keyboard shortcut: backtick `` ` `` toggles radial; arrow keys select; Enter navigates
- D-pad left/right cycles tabs when no slider/select is focused
- `assets/steam_input/steam_input.vdf` controller mapping file for Steam Deck Game Mode import

### Sprint 4.6 — Cloud Sync
- Encrypted sync module for memory records and saved chat sessions
- AES-GCM payload encryption via `ring`; sync server receives encrypted blobs only
- Commands: `start_sync`, `get_sync_status`, `sync_now`, `configure_sync`
- Settings Sync panel exposes opt-in toggles, API URL, device ID, last sync, pending count, and conflicts
- Emits `sync_progress` events for collecting, pushing, pulling, merging, and done states

### Sprint 4.3 — Browser Automation
- Embedded browser window controls for viewport navigation and JS execution
- Headless automation sessions via `headless_chrome` with session IDs
- Commands: `browser_open_session`, `browser_navigate_session`, `browser_get_content`, `browser_click`, `browser_fill`, `browser_screenshot`, `browser_evaluate_js`, `browser_close_session`
- Agent loop supports `action: "browser"` tool execution path

### Sprint 6.1 — Surface Elevation (Share & Tunnel)
- Share view: glass-pill inner tab strip, view header, eliminated all inline styles, `.tunnel-section` separators
- Tunnel view: `.tunnel-section` + `.input-row` CSS utility classes replace inline `style=""` attributes
- `project-context.md` synced to v1.2.1, 56 commands, full frontend feature list

### Security Hardening Update (v1.2.2-ra)
- **MCP Authentication (CRIT-2)** — Added Bearer token validation with ConstantTimeEq on HTTP tool calls.
- **Localhost Canvas Collab (CRIT-4)** — Bound Canvas Collab listener to localhost (127.0.0.1) only.
- **Sync Key Derivation Hardening (CRIT-5)** — Upgraded cross-device sync KDF to PBKDF2-HMAC-SHA256 (100k iterations, random 16-byte salt).
- **Execution Capability Token Removal (HIGH-1)** — Retired `exec_auth_token`, relying on Tauri IPC boundary.
- **CSP Port Hardening (MED-3)** — Tightened localhost CSP rules to specific required ports (11434, 1420).
- **MCP Info Disclosure Fix (MED-4)** — Refactored `get_status` MCP tool to avoid leaking key presence.

### Sprint 6.0 / 5.2 — UX Polish + Font System (v1.2.1-ra)
- Global font: Space Grotesk (body) + Syne (display) + JetBrains Mono (mono)
- Glass inputs, glow focus rings, code blocks, scrollbar, selection highlight
- 12-segment radial menu (all 12 tabs reachable), Docs tab added
- AppImage CI fixed (flatpak removed, apt deps completed), v1.2.1-ra tagged

### Sprint 5.1 — Real-Time Collaborative Workspaces
- Upgraded Canvas collaboration host mode from one peer to a multi-peer LAN room
- Workspace payload protocol now carries live code sync, shared chat, presence, invite metadata, and agent approval requests
- Commands: `canvas_collab_host`, `canvas_collab_join`, `canvas_collab_send`, `canvas_collab_broadcast`, `canvas_collab_status`, `canvas_collab_stop`
- Canvas Collab modal exposes workspace naming, invite JSON, peer count, presence, shared chat, and approval controls
- Host relays peer messages to other connected peers while each client ignores its own echoed payloads by sender ID

---

## Tauri Commands (56 registered across 28 modules)

See `docs/ANTIGRAVITY_HANDOFF.md` for full command registry. Key commands by module:

```
# Core / Chat / LLM
get_initial_state, send_command, cancel_generation, execute_command_stream,
get_personas, get_themes, set_persona, set_theme, get_config, set_config,
save_gemini_api_key, get_gemini_api_key, test_llm_connection,

# Sessions / Memory
save_session, load_latest_session, list_sessions, load_session_by_id,
delete_session, new_session, export_session_markdown,
memory_list_all, memory_delete, memory_pin, memory_add_fact, get_context_stats,

# Terminal / PTY
pty_spawn, pty_write, pty_resize, pty_kill,
start_recording, stop_recording, speak_text, execute_lua,

# Agent / Canvas
agent_step, agent_exec_code,
canvas_collab_host, canvas_collab_join, canvas_collab_send,
canvas_collab_broadcast, canvas_collab_status, canvas_collab_stop,

# Transfer / Network
start_file_transfer, respond_to_transfer, get_discovered_peers, get_active_transfers,
start_tunnel_server, stop_tunnel_server, send_tunnel_request,
ftp_connect, ftp_list, ftp_download, ftp_upload_file, ftp_disconnect,

# System / AI Features
open_external, get_game_context, get_game_notes, save_game_notes,
read_last_screenshot, shell_autocomplete, whisper_transcribe, index_directory,
get_doc_count, get_terminal_autocomplete,

# Ollama / Plugins / Keychain
ollama_list_models, ollama_pull_model, ollama_delete_model,
list_plugins, toggle_plugin, install_plugin, reload_plugins,
get_personas, save_custom_persona, delete_custom_persona,
start_sync, sync_now, get_sync_status, configure_sync,
start_mcp_server, stop_mcp_server, get_mcp_status
```

---

## Persona System

9 built-in personas in `lib.rs` (PERSONAS static):

| Name | Role | Notes |
|---|---|---|
| Default | General assistant | Base persona |
| Developer | Software developer | Code-focused, concise |
| Cyberpunk | Cyberpunk AI construct | Terminal lingo, edgy |
| **John** | Product Manager | BMAD agent |
| **Sally** | UX Designer | BMAD agent |
| **Winston** | System Architect | BMAD agent |
| **Amelia** | Senior Developer | BMAD agent |
| **Paige** | Technical Writer | BMAD agent |
| **Mary** | Business Analyst | BMAD agent |

BMAD personas are activated via Lua: `/john`, `/sally`, `/winston`, `/amelia`, `/paige`, `/mary`
Or via `Ctrl+P` to cycle, or the persona selector in the settings modal.

---

## Plugin System

Lua 5.4 files in `plugins/` auto-load on startup:
- `bmad.lua` — Registers `/john`…`/mary` slash commands, calls `setPersona()`
- `auto_responder.lua` — Auto-response hooks
- `ip_lookup.lua` — IP lookup utility command

Lua globals available to plugins:
- `print(...)` → streams to frontend via `command_stdout` event
- `execute(cmd)` → runs shell command, returns stdout+stderr
- `registerCommand(name, fn)` → registers `/name` slash command
- `registerHook(event, fn)` → hooks into `onMessage` / `onAIResponse`
- `setPersona(name)` → switches active LLM persona, emits `persona_changed`

---

## Configuration

### `llm-term.toml` (runtime, project root)
```toml
[llm]
default_provider = "gemini"        # or "ollama"
gemini_model = "gemini-1.5-flash"
ollama_model = "llama3"
ollama_base_url = "http://localhost:11434"
```

### Environment Variables
- `GEMINI_API_KEY` — Required for Gemini provider

---

## Key Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Submit chat |
| `Shift+Enter` | Newline in chat |
| `Ctrl+B` | Execute selected Lua |
| `Ctrl+S` | Save session |
| `Ctrl+L` | Load session |
| `Ctrl+N` | New session |
| `Ctrl+P` | Cycle persona |
| `Ctrl+R` | Voice record |
| `Ctrl+M` | Mute TTS |
| `Ctrl+C` | Kill process |
| `Escape` | Cancel |
| `` ` `` | Toggle radial gamepad menu |
| `Ctrl+Enter` | Run Canvas code |

---

## In-Chat Commands

`/help` · `/persona <name>` · `/discuss <p1> <p2> <topic>` · `@file:<path>` · `/<plugin-command>`
BMAD: `/john` · `/sally` · `/winston` · `/amelia` · `/paige` · `/mary`

---

## Development Commands

```bash
npm run tauri dev          # Hot-reload dev
npm run build              # Production build

# Frontend only
npm run --prefix frontend dev
npm run --prefix frontend build

# Rust only
cd src-tauri && cargo build
cd src-tauri && cargo check
cd src-tauri && cargo clippy
```

---

## Directory Layout

```
NEURODECK/
├── frontend/src/
│   ├── main.js          # All UI logic (~3700 lines)
│   ├── app.css          # Feature-specific styles (~2600 lines)
│   └── style.css        # Base reset
├── src-tauri/src/
│   ├── lib.rs           # All Tauri commands + state (~1600 lines)
│   ├── llm.rs           # LLM providers
│   ├── lua.rs           # Lua engine
│   ├── pty_manager.rs   # PTY sessions
│   ├── memory.rs        # Vector DB
│   ├── storage.rs       # Session persistence
│   ├── config.rs        # TOML config parser
│   ├── tunnel.rs        # LAN tunnel
│   └── transfer.rs      # P2P file transfer
├── plugins/             # Auto-loaded Lua plugins
├── docs/                # Project knowledge (this file lives here)
├── sessions/            # Saved chat sessions (JSON)
├── data/memory/         # Vector memory DB
├── _bmad/               # BMAD framework config
├── _bmad-output/        # BMAD generated artifacts
│   ├── planning-artifacts/
│   └── implementation-artifacts/
├── .agents/skills/      # 43 BMAD skills
├── assets/steam_input/  # Steam Deck controller mapping profiles (.vdf)
├── scripts/             # Build and utility scripts
└── llm-term.toml        # Runtime LLM config
```

---

## BMAD Workflow Status

| Phase | Status |
|---|---|
| Analysis (research, brief, PRFAQ) | Available — not started |
| Planning (PRD, UX spec) | Available — not started |
| Solutioning (architecture, epics) | In progress — see `_bmad-output/planning-artifacts/epics.md` |
| Implementation (stories, code, tests) | Active — see `_bmad-output/implementation-artifacts/` |
| QA / retrospective | Available |

Active sprint artifacts in `_bmad-output/implementation-artifacts/` — 30+ story files generated.

---

## Constraints

- Window locked to **1280×800** for Steam Deck Game Mode compatibility
- Maintain this constraint when modifying any UI layout or sizing
- LLM responses stream via SSE — never block the UI thread
- All user input from outside Tauri is sanitized (IPC args validated, session IDs checked for traversal)
