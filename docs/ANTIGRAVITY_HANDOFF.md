# NEURODECK — Project Antigravity Handoff

> Codename **ANTIGRAVITY** — handoff document covering every must-have fix, unwired feature, and high-value enhancement that stands between the current codebase and a shippable, impressive v1 on Steam Deck.

---

## Quick State Summary

| Layer | Status |
|---|---|
| Chat + RAG | ✅ Wired end-to-end (memory injection confirmed in `send_command`) |
| Canvas (HTML/CSS/JS) | ✅ Live iframe preview works |
| Canvas (Python/Bash) | ⚠️ Shows "run hint" — NOT executed. Agent tab handles real exec |
| Terminal (PTY shell) | ✅ Works; shell switcher pills wired |
| SSH Tab | ✅ Spawns system `ssh` via PTY; password auth only |
| Share → LAN | ✅ P2P wired via `transfer.rs` |
| Share → FTP | ✅ Rust commands built; UI wired |
| Share → SFTP | ❌ Not implemented (ssh2 crate skipped due to OpenSSL cross-platform complexity) |
| Voice STT / TTS | ✅ Wired (`arecord` + `espeak`); quality is system-tool-limited |
| Memory UI | ✅ Full CRUD + search wired |
| Agent Loop | ✅ 5-step max; works with Gemini and Ollama |
| Radial Menu | ✅ L2 / backtick; 8 segments |
| Game Detection | ✅ ACF scanner + badge |
| BMAD Personas | ✅ 6 personas via Lua plugins |
| Config UI | ❌ No settings UI for API key, model selection, or Ollama URL |
| Context Drawer (📊) | ⚠️ Container exists, toggle wired — content not populated |
| Multiple PTY Sessions | ❌ Single session only |
| FTP Saved Connections | ❌ Not persisted (SSH profiles save to localStorage; FTP does not) |
| Plugin Manager UI | ❌ Manual file editing only |
| Custom Themes | ❌ 4 hardcoded themes; no user editor |

---

## MUST-HAVE: Blocking Fixes

These must ship before v1 is usable day-to-day on the Deck.

### 1. Config / API Key Settings UI
**Problem**: `GEMINI_API_KEY` is env-var only. There is no way to change the LLM provider, model name, or Ollama base URL from inside the app. Users editing `llm-term.toml` manually and restarting is not acceptable for a Deck Game Mode app.

**What to build**:
- Settings modal: **LLM Provider** section with provider toggle (Gemini / Ollama), model name input, Ollama URL input
- Gemini API Key field (write to `~/.config/neurodeck/env` and `std::env::set_var` at runtime)
- "Test Connection" button that calls a lightweight Tauri command → returns success/error
- Rust side: expose `set_config(key, value)` command that writes to the active `llm-term.toml` and hot-reloads without restart

**Files**: `config.rs`, `lib.rs` (add `set_config` command), settings modal HTML in `main.js`

---

### 2. Canvas — Python/Bash Execution
**Problem**: Canvas shows a "run hint" for non-HTML languages. The Run button does nothing for Python/Bash. Users expect execution.

**What to build**:
- For `python` and `bash`: Route the canvas Run button through `agent_exec_code` (already exists in `lib.rs`) — capture stdout and display in a split output pane below the editor
- For `markdown`: Render via `marked.js` in the preview pane (already works for HTML — extend the preview switch)
- The canvas split already has the iframe pane; replace it with a `<pre>` output div for non-HTML languages

**Files**: `main.js` (canvas run handler ~line 3392), no backend changes needed

---

### 3. Context Drawer (📊) — Populate with Live Data
**Problem**: The toggle button and container exist but the drawer is empty. This was shown prominently in the user guide as a core feature.

**What to build**: Populate with:
- **Active Model** — current provider + model name (read from `get_initial_state`)
- **Memory Status** — total records, last store timestamp (new lightweight `memory_stats` command)
- **Session Info** — message count, session ID, created timestamp
- **System** — RAM available (via Lua `execute("free -m")` or a dedicated Tauri command)
- **Active Persona** — current persona name

**Files**: `main.js` (drawer population after toggle), `lib.rs` (optional `memory_stats` command)

---

### 4. SSH — Key-Based Authentication
**Problem**: SSH tab only supports password auth. Steam Deck users SSH into local machines routinely; key-based auth is the expected path (especially since pasting passwords into a PTY is fragile).

**What to build**:
- Add **Auth Type** toggle in SSH sidebar: `Password | Key File`
- When Key File is selected: show a file path input for the private key
- Pass `-i /path/to/key` in the `args` array already supported by `pty_spawn`
- Saved profiles: add `auth_type` and `key_path` fields to the profile JSON

**Files**: `main.js` (SSH sidebar HTML + `connectSsh()` function), no backend changes needed (pty_spawn args already support it)

---

### 5. FTP — Persist Saved Connections
**Problem**: FTP connection form fields are ephemeral. SSH profiles save to `localStorage`; FTP has no equivalent.

**What to build**:
- Add a saved connections panel to the FTP sidebar (same pattern as SSH profiles)
- Serialize `{ name, host, port, user }` to `localStorage` key `ftpProfiles`
- Mirror in Settings modal alongside SSH Profiles section

**Files**: `main.js` (FTP sidebar section, ~FTP system block)

---

### 6. Share → SFTP File Browser
**Problem**: The planning spec called for SFTP alongside FTP. SFTP was deferred because `ssh2` crate requires OpenSSL on Windows dev builds.

**Solution path for cross-platform**:
- Use `openssh-sftp-client` crate (pure Rust async, no OpenSSL) OR
- Run `sftp` binary via `std::process::Command` with `-b -` batch mode and parse output — works everywhere system SSH is installed
- Recommended: batch-mode `sftp` subprocess approach (same pattern as SSH terminal). Ship after SSH key auth is done.

**Files**: New `sftp.rs` module or extend `ftp.rs`, add SFTP tab to Share inner tabs in `main.js`

---

## HIGH PRIORITY: Core Feature Gaps

### 7. Multiple PTY Sessions (Terminal Tabs)
Single `ptySessionId = "main_pty_session"` means one shell only. Power users need multiple.

**What to build**:
- Sub-tab bar within the Terminal view: `+ New Tab` button, tabs labeled by shell/index
- Each tab has its own `sessionId` (e.g. `pty_session_0`, `pty_session_1`)
- Each tab has its own xterm.js instance
- The existing `pty_output` / `pty_exit` event routing already dispatches by ID — just add routing for multiple instances
- Max 5 concurrent sessions to cap resource use

**Files**: `main.js` (terminal view section), `pty_manager.rs` (already supports multiple sessions in the HashMap)

---

### 8. Ollama Model Manager UI
Users on the Steam Deck can't `ollama pull llama3.2` from a terminal easily in Game Mode. NEURODECK should own this.

**What to build**:
- Settings section: **Ollama Models** — lists locally available models (`GET /api/tags` on the Ollama base URL)
- Pull new model: input + `POST /api/pull` with streaming progress (pipe to a progress bar)
- Delete model: `DELETE /api/delete`
- Switch active model: updates `llm-term.toml` and hot-reloads

**Files**: New Tauri command `ollama_list_models` / `ollama_pull_model` in `lib.rs` (or new `ollama_mgr.rs`), settings modal section in `main.js`

---

### 9. Plugin Manager UI
Plugins are just Lua files. Users don't know to drop files in `plugins/`. The UI should surface this.

**What to build**:
- New tab or Settings section: **Plugins** — lists all files in `plugins/`
- Toggle enable/disable (rename to `.disabled` to skip auto-load)
- Install from URL: download `.lua` file to `plugins/` directory
- "New Plugin" button: opens Canvas tab pre-loaded with the plugin template
- Live reload: call `reload_plugins` Tauri command (already have `execute_lua` — extend it)

**Files**: New `plugin_manager` Tauri command in `lib.rs`, new view in `main.js` or Settings section

---

### 10. Custom Persona Creator
The 9 built-in personas are hardcoded in `lib.rs`. No way to add a new one without editing Rust.

**What to build**:
- Settings section or dedicated modal: **My Personas** — name, emoji, system prompt textarea
- Serialize to `data/personas.json` and load at startup
- Expose via `get_personas` (already exists; extend it to merge hardcoded + custom)
- Delete custom personas; cannot delete built-in ones

**Files**: `lib.rs` (`get_personas`, `set_persona` commands + load from `data/personas.json`), settings modal

---

### 11. Game-Aware AI Mode
Game detection is wired but the detected game is only injected as a passive context note. It should actively change behavior.

**What to build**:
- When a game is detected, auto-inject a rich system prompt addition: game name, genre (lookup from SteamGridDB or local cache), common troubleshooting context
- Game-specific persona mode: switch to a "Gaming Assistant" persona with game-context awareness
- Badge in status bar already exists; clicking the badge should open a "Game Context Panel" overlay showing what was injected

**Files**: `lib.rs` (`send_command` — enhance game context injection logic), `main.js` (game badge click handler)

---

### 12. Drag-and-Drop File Upload to FTP
The FTP sidebar has a local path text input for uploads. The HTML `share-dropzone` pattern exists in the LAN panel but not in FTP.

**What to build**:
- Add a drop zone to the FTP sidebar (same `.share-dropzone` component reused)
- On drop: populate the local path field automatically
- Wire through the existing `ftp_upload_file` Tauri command
- Bonus: show a progress bar (FTP upload is blocking in current impl — consider streaming progress via events)

**Files**: `main.js` (FTP sidebar drag-drop handlers), `ftp.rs` (add progress events via `app_handle.emit`)

---

## COOL / DIFFERENTIATING FEATURES

These are what make NEURODECK memorable. Prioritize after the blockers.

### 13. AI Terminal Autocomplete
Hold `Tab` in the PTY terminal → send the current command buffer to the LLM → get a completion suggestion in ghost text. Like GitHub Copilot for the shell.

**Architecture**:
- `xterm.js` custom key handler intercepts Tab when there's a non-empty command buffer
- Debounced `invoke("shell_autocomplete", { buffer })` → returns suggested completion
- Render as dim ghost text using xterm.js's custom renderer or overlay div
- Accept with Tab again, dismiss with Escape

**New Tauri command**: `shell_autocomplete(buffer: String) -> Result<String>` — just a focused `send_command` variant with a shell-autocomplete system prompt

---

### 14. Screenshot → Chat (OCR Bridge)
Steam Deck `Steam+R` takes a screenshot. NEURODECK should be able to read it.

**Architecture**:
- New "Attach Screenshot" button in chat input bar
- Calls `invoke("read_last_screenshot")` → finds the most recent file in `~/Pictures/screenshots/` (or Steam screenshot dir)
- Encode as base64 → pass to Gemini Vision API (already using Gemini; just needs multipart request in `llm.rs`)
- Renders as an inline thumbnail in the chat message

**Files**: `lib.rs` (new `read_last_screenshot` + extend `send_command` for image payload), `llm.rs` (`GeminiProvider` — add vision request path), `main.js` (attach button + thumbnail rendering)

---

### 15. AI-Powered Shell History Search
`Ctrl+H` in the terminal → fuzzy-search shell history with AI ranking. Type in natural language ("the docker command I ran last week") and get ranked results.

**Architecture**:
- New keyboard shortcut in terminal view: `Ctrl+H` opens history search overlay
- Read `~/.bash_history` or `~/.zsh_history` via a Tauri command
- Send history + natural language query to LLM with a structured ranking prompt
- Display ranked results list; Enter to paste selected command into PTY

---

### 16. NEURODECK as MCP Server
Expose all Tauri commands as Model Context Protocol tools so any MCP-compatible client (Claude Desktop, Continue, etc.) can invoke them.

**Architecture**:
- New `mcp.rs` module: starts an HTTP server (via `axum` or `warp`) on `localhost:13337` when enabled
- Implements `tools/list` and `tools/call` MCP endpoints
- Maps each `#[tauri::command]` to an MCP tool definition
- Toggle in Settings; port configurable in `llm-term.toml`

**Value**: Makes NEURODECK the "operating system" that AI assistants outside the app can control.

---

### 17. Whisper.cpp Integration (Offline STT)
Current STT uses `arecord` to capture audio and (presumably) sends it to an external service. For an air-gapped Steam Deck, offline transcription is critical.

**Architecture**:
- Add `whisper-rs` crate (Rust bindings for whisper.cpp)
- Bundle the `ggml-base.en.bin` model in `assets/`
- New Tauri command: `transcribe_audio(wav_path: String) -> String` — synchronous, runs in `spawn_blocking`
- Replace the existing `stop_recording` path to pipe through local Whisper before returning text

---

### 18. Local Document RAG
Let users point NEURODECK at a folder (e.g., `~/Documents`, `~/notes/`) and index it into the vector DB so the AI can reference their own files.

**Architecture**:
- New Tauri command: `index_directory(path: String)` — walks dir, reads text files, generates embeddings, stores in `memory.rs`
- Separate namespace in the vector DB for "documents" vs. "chat history" (add a `namespace` field to `MemoryRecord`)
- Settings section: **Personal Knowledge Base** — folder picker, index button, document count, clear button

---

### 19. Live Code Collaboration via LAN Share
Two NEURODECK instances on the same network share a Canvas session. Both see each other's edits in real time.

**Architecture**:
- Extend `transfer.rs` with a WebSocket-style message channel between peers
- Canvas editor `oninput` → debounce → `invoke("canvas_sync_broadcast", { code, lang })` → peer receives via `canvas_sync` event → updates their editor
- Basic last-write-wins conflict resolution
- "Invite to Collaborate" button in Canvas toolbar

---

### 20. Game Session Notes
When a game is detected, automatically create/open a notes file named by `app_id`. All chat in that session is tagged to the game. Persists across restarts.

**Architecture**:
- When `get_game_context` returns a game, create `data/game_notes/<app_id>.json` if it doesn't exist
- Sidebar shows a "Game Notes" section when a game is detected
- All messages in the session get `game_app_id` metadata in the vector DB
- Filter in Memory tab: `#game:730` to search only notes from a specific game

---

### 21. Steam Deck D-Pad Tab Navigation Enhancements
Current D-pad cycles all 9 tabs linearly. SSH and FTP panels have inner tabs that the D-pad can't reach.

**What to build**:
- D-pad left/right cycles outer nav tabs (current behavior)
- When inside Share tab: D-pad up/down cycles the inner tabs (LAN / FTP)
- When inside SSH tab: shoulder buttons (L1/R1 in Steam Input mapping) cycle SSH profile list
- Add these mappings to `steam_input.vdf`

---

### 22. Notification Center
Agent task completion, file transfer done, SSH connect/disconnect — these events happen silently. Users miss them when on a different tab.

**What to build**:
- Toast notification system: corner overlay, auto-dismiss after 4s, click to navigate to relevant tab
- Notification bell icon in top-nav right with unread count badge
- Notification history panel (last 20 events)
- Events to hook: `pty_exit`, file transfer complete, agent loop complete, FTP upload done, memory index complete

---

## Technical Debt / Known Issues

| Issue | Location | Notes |
|---|---|---|
| `lib.rs` is ~1600 lines | `lib.rs` | Mix of command handlers, state, themes. Split into `commands/`, `state/`, `themes/` sub-modules when it crosses 2000 lines |
| `main.js` is ~4200 lines | `main.js` | Single file is intentional (no framework) but risky. Consider splitting to `chat.js`, `terminal.js`, `ftp.js` etc. loaded as ES modules via Vite |
| Config path fragility | `lib.rs:1532` | Binary reads `../llm-term.toml` with fallback. Works but will break if working dir changes. Fix: use `tauri::api::path::app_config_dir()` |
| `pty_spawn` no timeout | `pty_manager.rs` | PTY sessions never time out. A hung SSH handshake will hold a thread indefinitely. Add `tokio::time::timeout` wrapping the spawn |
| FTP upload is blocking | `ftp.rs` | `ftp_upload_file` calls `spawn_blocking` but there's no progress event. Large files appear frozen. Emit `ftp_progress { id, bytes_sent, total }` events |
| Canvas bash/python "run" | `main.js` | Run button exists, does nothing for non-HTML. Misleading UX. Either wire it or hide the button for those languages |
| GEMINI_API_KEY env only | `lib.rs:1541` | API key is checked at startup once. If not set, provider silently falls back to Ollama. No user-visible error in the UI |
| suppaftp `retr_as_buffer` | `ftp.rs` | Loads entire file into RAM. Files > 500MB will OOM. Stream to disk via `retr` with a write callback for production |

---

## Dependency Watch

| Crate | Version | Note |
|---|---|---|
| `tauri` | 2.11.2 | Keep locked — Tauri 2.x minor versions have had breaking IPC changes |
| `mlua` | 0.9 | `lua54` + `vendored` features required. Upgrading to 0.10 changes the async API |
| `portable-pty` | 0.8 | No active development upstream. Watch for Windows 11 PTY regressions |
| `suppaftp` | 6.x | API stable but `retr_as_buffer` returns `Cursor<Vec<u8>>` — verify on suppaftp 6.5+ if upgrading |
| `xterm.js` | CDN loaded | Pin to a specific version in `index.html` for reproducible builds |

---

## Feature Priority Matrix

| Feature | Impact | Effort | Ship Order |
|---|---|---|---|
| Config/API Key UI (P1) | 🔴 Critical | Medium | 1 |
| Canvas Python/Bash exec (P2) | 🔴 Critical | Low | 2 |
| Context Drawer populate (P3) | 🟠 High | Low | 3 |
| SSH key-based auth (P4) | 🔴 Critical | Low | 4 |
| FTP saved connections (P5) | 🟠 High | Low | 5 |
| SFTP browser (P6) | 🟠 High | Medium | 6 |
| Multiple PTY sessions (P7) | 🟠 High | Medium | 7 |
| Ollama model manager (P8) | 🟠 High | Medium | 8 |
| Plugin Manager UI (P9) | 🟡 Medium | Medium | 9 |
| Custom persona creator (P10) | 🟡 Medium | Medium | 10 |
| Game-aware AI mode (P11) | 🟡 Medium | Low | 11 |
| AI terminal autocomplete (C13) | 🟢 Cool | Medium | 12 |
| Screenshot → Chat OCR (C14) | 🟢 Cool | High | 13 |
| Whisper.cpp offline STT (C17) | 🟢 Cool | High | 14 |
| NEURODECK as MCP server (C16) | 🟢 Cool | High | 15 |
| Local document RAG (C18) | 🟢 Cool | High | 16 |
