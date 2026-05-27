# NEURODECK v1.3.0 Roadmap — Isis
**Theme:** Developer Control Layer  
**Target Date:** 2–3 sprints from baseline  
**Constraint:** Zero bloat. Every item must improve efficiency, reliability, or daily UX.

---

## Release Philosophy

v1.2.x (Ra) proved the core stack: AI chat, terminal, canvas, plugins, memory, and collaboration all work on a Steam Deck at 1280×800.  
**v1.3.0 (Isis) does not add new product surfaces.** It installs the control layer that makes the existing surfaces faster to navigate, safer to operate, and easier to maintain.

| In Scope | Out of Scope (defer to v1.4+/v2.0) |
|---|---|
| Navigation speed | Workflow Visual Builder |
| Code/editor hardening | Multi-Agent Orchestrator |
| Git integration | Mobile Companion App |
| Memory visualization | Cloud sync server deployment |
| Reliability fixes | Docker / WASM runtimes |
| Dev-velocity refactoring | Qdrant migration |

---

## P0 — Primary Release Blockers

These ship in v1.3.0 or the release does not cut.

### 1. Command Palette (`feature/sprint-4.3-command-palette`)
**Why:** 12 tabs + radial menu + gamepad nav is complete, but keyboard power users need sub-200ms access to any view, command, or plugin action.  
**Acceptance:**
- `Ctrl+K` (keyboard) and `L3 + R3` (gamepad) invoke palette from any view.
- Fuzzy search across views, Tauri commands, personas, themes, and registered plugin commands.
- No new state structs in `lib.rs` — reuse existing `get_personas`, `get_themes`, `list_plugins` data.
- 1280×800 overlay; does not break tab-switching CSS specificity rules.

### 2. Git Integration Panel (`feature/sprint-3.5-git`)
**Why:** The Canvas/IDE tab already has Monaco and file explorer. Without git status, diff, and commit, it is not an IDE.  
**Acceptance:**
- `git status`, `git diff`, `git add`, `git reset`, `git commit`, `git log` wired as Tauri commands.
- LLM-generated commit messages via existing `send_command` path (reuses RAG + persona context).
- Unsafe path handling audited — no shell injection via repository path.
- UI fits 1280×800 with two-pane layout (file list + diff view).

### 3. Knowledge Graph View (`feature/sprint-3.3-knowledge-graph`)
**Why:** The vector DB works but is invisible. A force-directed D3.js graph turns memory into a navigable map, which is the single most differentiated feature against generic chat clients.  
**Acceptance:**
- Nodes = memory records; edges = cosine similarity > threshold + shared session context.
- Click to jump to chat context; drag to pin/unpin.
- Lazy-rendered so 1000+ records do not block the main thread.
- Merge conflicts with current Canvas frontend resolved.

### 4. Monaco Editor Hardening (`feature/sprint-3.1` baseline)
**Why:** Monaco is already integrated but needs fallback and language coverage validation.  
**Acceptance:**
- CDN load failure falls back to textarea with syntax-highlighting class.
- Language mode switches correctly for HTML, CSS, JS, Python, Bash, Lua, Markdown.
- `Ctrl+Enter` run shortcut works in all languages.
- Collaboration sync reads from Monaco model, not DOM scraping.

---

## P1 — Efficiency & Reliability Wins

### 5. FTP Streaming + Progress Events
**Why:** `suppaftp::retr_as_buffer` loads the entire file into RAM. On a Steam Deck with 16 GB RAM, a 2 GB file transfer OOMs the backend and the UI appears frozen.  
**Fix:**
- Stream downloads to disk via `retr` with a write callback.
- Emit `ftp_download_progress { bytes_received, total_bytes }` every 256 KB.
- Same for upload: chunk reads from disk + `put_with_stream` if available, or chunked `put`.

### 6. `pty_spawn` Timeout
**Why:** Hung SSH handshakes leave a zombie reader thread and leak a PTY session slot.  
**Fix:**
- Wrap `pty_spawn` in `tokio::time::timeout(Duration::from_secs(30), ...)`.
- On timeout, auto-call `pty_kill` for the session ID and return a clean error string.

### 7. Config Path Resolution
**Why:** The `../llm-term.toml` fallback is load-bearing but fragile. It breaks if the binary is launched from an unexpected working directory.  
**Fix:**
- Primary: `tauri::api::path::app_config_dir()` + `/neurodeck/config.toml`.
- Migration: on first launch, copy existing `llm-term.toml` to the new canonical path.
- Deprecate the `../` fallback with a one-release warning log.

### 8. Canvas "Run" UX Fix
**Why:** The Run button for Python/Bash in Canvas shows a hint but does not execute code. Users file this as a bug every sprint.  
**Fix:**
- If language is Python/Bash/Lua and the Run button is clicked, route to the existing agent subprocess execution path (or `pty_execute`) and stream output to the Canvas output panel.
- Do not add a new execution runtime — reuse what exists.

---

## P2 — Technical Debt (Dev Velocity)

### 9. Modularize `lib.rs`
**Trigger:** Currently ~1600 lines. The project rule says split at 2000, but doing it now prevents velocity drag.  
**Scope:**
- `commands/` — all `#[tauri::command]` handlers grouped by domain (chat, terminal, files, system).
- `state/` — `AppState` and its sub-structs.
- `themes/` — `THEMES` and `PERSONAS` lazy_static maps.
- No behavior changes. Pure file moves + `pub use` re-exports.

### 10. Frontend ES Module Split
**Trigger:** `main.js` is ~7000 lines. The project rule says split at 8000.  
**Scope:**
- `views/chat.js`, `views/terminal.js`, `views/canvas.js`, `views/memory.js`, `views/agent.js`.
- `utils/navigation.js`, `utils/gamepad.js`, `utils/notifications.js`.
- Vite handles bundling; Tauri WebView sees a single output. No runtime changes.
- This is a refactor, not a framework migration — stay vanilla JS.

---

## Branch Reality Check

The sprint branches (`feature/sprint-3.3-knowledge-graph` through `feature/sprint-4.3-command-palette`) represent **older implementations** that were superseded by refactored code on `master`. An audit of `master` reveals:

| Feature | Branch Status | Master Reality |
|---|---|---|
| Knowledge Graph | BRANCH-COMPLETE | ✅ Complete — `graph_view.js`, `get_memory_graph_data`, Graph tab |
| Task Scheduler | BRANCH-COMPLETE | ✅ Complete — `scheduler.rs`, `scheduler::*` commands, Scheduler tab |
| Git Integration | BRANCH-COMPLETE | ✅ Complete — `commands/git.rs` (700 lines), 20+ commands, Git tab |
| Workflow Builder | BRANCH-COMPLETE | ✅ Complete — `workflow.rs`, `workflow::*` commands, Workflow tab |
| Command Palette | BRANCH-COMPLETE | ✅ Complete — palette overlay, `Ctrl+K`, fuzzy search |
| Multi-Agent Orchestrator | BRANCH-COMPLETE | ⚠️ **Partial** — backend commands wired, **frontend view missing** |

**Decision:** No branch merge required. The v1.3.0 release is built from `master` with hardening and gap-filling.

**Gating:**
- Workflow Builder ships fully exposed (it is already a registered tab).
- Multi-Agent Orchestrator backend commands are live but **no frontend tab exists yet**. Add the Orchestrator view as a v1.3.0 blocker or hide the commands until v1.4+.
- Legacy feature branches can be archived after release tagging.

---

## Definition of Done

- [ ] `cargo check` clean.
- [ ] `cargo clippy` warnings documented or fixed.
- [ ] `npm run --prefix frontend build` succeeds with `target: ["es2022", "chrome110", "safari15"]`.
- [ ] AppImage bundles on Linux/WSL (`npm run tauri build --bundles appimage`).
- [ ] Steam Deck 1280×800 layout validated for all new views.
- [ ] Gamepad navigation smoke test passes (L1/R1 tab cycle, radial menu, D-pad focus).
- [ ] KFMS stamp updated: version `1.3.0`, codename `Isis`, tag `v1.3.0-isis`.

---

## Deferred Items (with rationale)

| Feature | Rationale |
|---|---|
| **Workflow Visual Builder** | Rust commands ship hidden; full UX polish is v1.4+ scope. |
| **Multi-Agent Orchestrator** | Same — commands ship hidden. Orchestration is a v2.0 theme (Osiris). |
| **Mobile Companion App** | Requires cloud sync API to be production-stable first. v2.5+ (Horus). |
| **WebSocket/CRDT Collab** | LAN-first MVP works. Harden only if user conflict reports arise. |
| **Docker / WASM Runtimes** | Stretch goals. No user demand signal yet. |
| **Qdrant Vector DB** | Current JSON vector DB is <20ms for top-3. Migration is v2.0 data-layer work. |
| **Wake Word / VAD** | Voice is already functional with Whisper. Wake word is novelty, not efficiency. |

---

## Bottom Line

v1.3.0-Isis is a **control and consolidation release**.

- **No merge required** — 8 sprints of work are already on `master` in refactored form.
- **One gap to close** — Orchestrator needs a frontend view (or commands hidden until v1.4+).
- **Four fixes** remove operational pain (FTP streaming, PTY timeout, config paths, Canvas run).
- **Two refactors** pay down debt before it blocks velocity.
- **One feature ships dark** — Orchestrator UI deferred if it risks release schedule.

The result: a faster, safer, more maintainable NEURODECK that still fits in a 96 MB AppImage and boots in under 2 seconds.
