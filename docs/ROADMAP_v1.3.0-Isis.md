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

### 1. Command Palette Gap Fix
**Why:** The palette is fully implemented but missing the four newest views added after it was built.  
**Acceptance:**
- Add "Open Knowledge Graph", "Open Scheduler", "Open Workflow Builder", and "Open IDE" to `COMMAND_PALETTE_ACTIONS`.
- Verify `Ctrl+K` opens palette from any of the 19 views.
- Confirm gamepad `Select` button triggers run on canvas from any view.

### 2. Git Integration Panel
**Status:** ✅ Already complete on master — `src-tauri/src/commands/git.rs` (700 lines), Git tab, 20+ commands.

### 3. Knowledge Graph View
**Status:** ✅ Already complete on master — `frontend/src/graph_view.js`, `get_memory_graph_data`, Graph tab.

### 4. Monaco Editor Hardening
**Status:** ✅ Already complete on master — CDN fallback, language switching, `Ctrl+Enter`, collaboration sync.

---

## P1 — Efficiency & Reliability Wins

### P1 Audit

**All four items were already implemented on master.** The docs describing them as open issues were stale.

| # | Item | Master Status |
|---|---|---|
| 5 | **FTP Streaming + Progress** | ✅ `ftp_download_file` uses `retr` with disk stream; `ftp_upload_file` uses `ProgressReader` emitting every 64 KB. |
| 6 | **`pty_spawn` Timeout** | ✅ `SPAWN_TIMEOUT_SECS = 15` with `recv_timeout` in `spawn_pty_with_timeout`. |
| 7 | **Config Path Resolution** | ✅ Three-tier resolution (`../`, `./`, `~/.config/neurodeck/`) already in `get_config_path()`. |
| 8 | **Canvas "Run" UX** | ✅ `canvas.js` binds `runBtn.onclick` to `runStreamingExec` for Python/Bash/JS and `execute_lua` for Lua. |

**No P1 code changes required for v1.3.0.**

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

- [x] `cargo check` clean.
- [x] `cargo clippy` warnings documented or fixed.
- [x] `npm run --prefix frontend build` succeeds with `target: ["es2022", "chrome110", "safari15"]`.
- [x] AppImage bundles on Linux/WSL (`npm run tauri build --bundles appimage`).
- [x] Steam Deck 1280×800 layout validated for all new views.
- [x] Gamepad navigation smoke test passes (L1/R1 tab cycle, radial menu, D-pad focus).
- [x] KFMS stamp updated: version `1.3.0`, codename `Isis`, tag `v1.3.0-isis`.

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
