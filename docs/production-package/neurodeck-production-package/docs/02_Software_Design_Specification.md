# NEURODECK Software Design Specification

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. System Context

NEURODECK is an Electron desktop application with a Rust sidecar backend. The frontend is vanilla JavaScript (no React, no framework). All backend↔frontend communication flows through an axum-based bridge server on `localhost:9477`.

```
┌─────────────┐     HTTP POST      ┌──────────────┐
│  Frontend   │ ◄──────────────► │ Bridge Server│
│  (Vanilla)  │     WebSocket      │   (axum)     │
└─────────────┘                    └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Rust Sidecar │
                                   │  (tokio)     │
                                   └──────────────┘
```

---

## 2. Module Boundaries

### 2.1 Frontend (`frontend/src/`)

| File | Lines | Responsibility |
|---|---|---|
| `main.js` | ~8,000 | App bootstrap, view switching, chat, terminal, canvas, settings, modals |
| `neurobridge.js` | ~200 | Drop-in replacement for Tauri API: `invoke()` → POST, `listen()` → WebSocket |
| `chat.js` | ~600 | Chat message rendering, markdown, streaming tokens, welcome screen |
| `canvas.js` | ~800 | Canvas editor, preview iframe, run button, AI edit modal |
| `memory.js` | ~400 | Memory tab UI, search, filter, pin, delete |
| `agent.js` | ~500 | Agent tab, ReAct loop UI, pre-flight permission check |
| `workflow_view.js` | ~1,000 | Node-graph editor, drag-drop, browser-side runner |
| `settings.js` | ~800 | Settings modal panels: LLM, Privacy, Plugins, LSP, Sync, Whisper |
| `radial.js` | ~150 | Radial menu component, 15 segments |
| `graph_view.js` | ~300 | D3.js force-directed memory graph |
| `ide_view.js` | ~400 | IDE tab, file explorer, Monaco editor, LSP client |
| `lsp_client.js` | ~400 | Frontend LSP client, completions, hover, diagnostics |
| `app.css` | ~9,000 | All styles. No framework CSS. Tactical Glass theme system. |

**Frontend rule:** No new npm packages. Only `xterm.js`, `marked.js`, `qrcode` are bundled.

### 2.2 Backend (`src-tauri/src/`)

| Module | Responsibility |
|---|---|
| `lib.rs` | AppState, `run()` (deprecated Tauri entry), module re-exports |
| `bridge.rs` | `run_bridge_server()`, axum routes, WsBroadcaster, plugin loading, scheduler startup |
| `commands/mod.rs` | Bridge dispatch table — ~5,400 lines, ~297 commands wired |
| `commands/session.rs` | `send_command` — RAG injection, memory storage, streaming |
| `commands/agent.rs` | `agent_exec_code`, `exec_code_stream`, `agent_step` |
| `commands/browser.rs` | Headless Chrome session management |
| `commands/system.rs` | `index_directory`, `memory_export`, `get_context_stats`, `llm_oneshot` |
| `commands/git.rs` | Full git2 bindings: status, diff, commit, branch, push, pull |
| `llm.rs` | LlmProvider trait, GeminiProvider, OllamaProvider, embedding generation, vision |
| `memory.rs` | Vector DB: store, search, export, import, cosine similarity |
| `pty_manager.rs` | PTY sessions: spawn, write, resize, kill, timeout, TTL watchdog |
| `scheduler.rs` | Cron jobs, task registration, workflow triggering |
| `workflow_engine.rs` | Parse workflow JSON, execute 9 node types, template substitution, conditions |
| `orchestrator.rs` | Multi-agent orchestration, generic EventEmitter |
| `permissions.rs` | Capability enum, PermissionProfile, PermissionRegistry, enforcement helpers |
| `lua.rs` | mlua runtime, globals, plugin loading |
| `plugin_mgr.rs` | Plugin discovery, toggle, install from URL, reload |
| `game.rs` | Steam ACF manifest scanner, process detection via sysinfo |
| `transfer.rs` | LAN P2P file transfer, Warpinator gRPC server |
| `canvas_collab.rs` | TCP LAN workspace collaboration, multi-peer relay |
| `computer_use.rs` | macOS (core-graphics) + Windows screenshot/mouse/keyboard |
| `sync.rs` | Encrypted cloud sync: AES-GCM via ring, device ID, conflict handling |
| `security.rs` | Input validation, path sanitization, error redaction, terminal blocklist |
| `ftp.rs` | suppaftp: list, download (stream to disk), upload, progress events |
| `tunnel.rs` | SteamOS LAN tunnel client/server |
| `whisper.rs` | whisper.cpp CLI wrapper, model download progress |
| `mcp.rs` | Model Context Protocol HTTP server on localhost:13337 |
| `lsp.rs` | LspManager: stdio JSON-RPC, multi-server lifecycle, diagnostics routing |
| `doc_indexer.rs` | Local document indexing: walkdir, chunk, embed, store |
| `dashboard.rs` | Workspace stats: sessions, messages, records, storage, provider health |
| `context_packs.rs` | Pack CRUD, set_memory_pack, get_pack_memory |
| `privacy.rs` | PrivacyLevel enum, PrivacyFilter, can_search/inject/snippet/export |
| `search.rs` | Universal FTS5 search across memory, sessions, projects, docs |
| `projects.rs` | Project knowledge spaces CRUD |
| `models.rs` | Theme, Persona, CustomPersona, PERSONAS, THEMES lazy_statics |
| `providers.rs` | `create_provider()`, `provider_from_agent()`, `default_agents()` |
| `paths.rs` | `get_config_path()`, `user_config_dir()`, `user_bin_dir()`, `get_home_dir()` |
| `config.rs` | `Config`, `LlmConfig`, `SecurityConfig`, `AgentConfig` |
| `storage.rs` | Session save/load as JSON |
| `db/` | SQLite migrations: `001_initial.sql`, `002_projects.sql`, `003_context_packs.sql` |

### 2.3 Infrastructure Crate (`infrastructure/`)

| Module | Responsibility |
|---|---|
| `secrets.rs` | OS keychain: save/get/delete Gemini API key, test_keychain_access |
| `oauth.rs` | Google OAuth2 Device Flow: request_device_code → poll_for_token |
| `warpinator.rs` | Warpinator-compatible gRPC server (tonic 0.11) |

---

## 3. Data Flow

### 3.1 Chat Request Flow
```
User types message → frontend POST /api/send_command
  → bridge.rs routes to commands/mod.rs
    → Permission check (Network capability)
    → Generate embedding for query
    → Search MemoryDB (optional pack_id filter)
    → PrivacyFilter::can_inject()
    → Build system prompt (persona + game context + RAG sources)
    → Call provider.generate() (streaming)
    → WsBroadcaster.emit("llm_token", token)
    → Store user message embedding (fire-and-forget)
    → Emit "rag_sources" provenance event
```

### 3.2 PTY Session Flow
```
User clicks "New Tab" → frontend POST /api/pty_spawn
  → pty_manager.rs spawns process
  → Reader thread emits "pty_output" per chunk
  → Frontend routes by session ID to correct xterm.js instance
  → Idle >2h → TTL watchdog emits "pty_exit" with reason "idle_timeout"
```

### 3.3 Workflow Execution Flow
```
Scheduler cron fires (or user clicks Run)
  → workflow_engine.rs::execute_workflow()
    → Parse workflow JSON
    → Find trigger node
    → DFS traversal: exec_node() per node
    → Template substitution ({{input}}, {{node:id}})
    → Condition evaluator routes true/false edges
    → Emit "workflow_node_start", "workflow_node_done"
    → Save run history to data/workflows/history/
    → Emit "workflow_complete"
```

---

## 4. IPC Contract

### 4.1 Command Format
```http
POST /api/{command_name}
Content-Type: application/json

{ "arg1": "value", "arg2": 123 }
```

### 4.2 WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `llm_token` | Backend→Frontend | `{ "token": "...", "session_id": "..." }` |
| `pty_output` | Backend→Frontend | `{ "id": "main_pty_session", "data": "..." }` |
| `pty_exit` | Backend→Frontend | `{ "id": "...", "reason": "exit" / "spawn_timeout" / "idle_timeout" }` |
| `agent_step` | Backend→Frontend | `{ "step": 1, "thought": "...", "action": "..." }` |
| `orchestrator_plan_ready` | Backend→Frontend | `{ "plan": [...] }` |
| `scheduled_task_started` | Backend→Frontend | `{ "id": "...", "name": "...", "goal": "..." }` |
| `workflow_started` | Backend→Frontend | `{ "name": "...", "triggered_by": "scheduler" }` |
| `workflow_node_start` | Backend→Frontend | `{ "node_id": "...", "node_type": "..." }` |
| `workflow_node_done` | Backend→Frontend | `{ "node_id": "...", "success": true, "output": "..." }` |
| `workflow_complete` | Backend→Frontend | `{ "workflow_name": "...", "success": true }` |
| `sync_progress` | Backend→Frontend | `{ "state": "collecting" / "pushing" / "pulling" / "merging" / "done" }` |
| `ftp_progress` | Backend→Frontend | `{ "id": "...", "bytes_sent": 0, "total": 1048576 }` |
| `rag_sources` | Backend→Frontend | `{ "sources": [{ "id": "...", "title": "...", "snippet": "..." }] }` |
| `canvas_collab_update` | Backend→Frontend | `{ "sender": "...", "type": "code" / "chat" / "presence" }` |

---

## 5. Database Schema

### 5.1 SQLite Tables

```sql
-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Memory records
CREATE TABLE memory_records (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding BLOB,
    metadata TEXT, -- JSON
    pack_id TEXT,
    privacy_level TEXT DEFAULT 'standard',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Context packs
CREATE TABLE context_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#10b981',
    privacy_level TEXT DEFAULT 'standard',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    privacy_level TEXT DEFAULT 'standard',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Search index (FTS5)
CREATE VIRTUAL TABLE search_index USING fts5(
    content,
    content_rowid=rowid
);
```

### 5.2 File-Based Persistence

| Data | Location |
|---|---|
| Vector DB records | `data/memory/chat_history.json` |
| Saved sessions | `data/sessions/` |
| Custom personas | `data/personas.json` |
| Custom themes | `data/themes/` |
| SSH/FTP/SFTP profiles | `data/profiles/` |
| Game notes | `data/game_notes/<app_id>.md` |
| Workflow history | `data/workflows/history/<name>/` |
| Scheduler tasks | `data/scheduler/tasks.json` |
| Config | `~/.config/neurodeck/llm-term.toml` |

---

## 6. Security Boundaries

| Boundary | Enforcement |
|---|---|
| Renderer→Main | Context isolation, explicit preload allowlist |
| Main→Rust | Localhost HTTP only, no Tauri IPC |
| Rust→Filesystem | Config path resolution, no arbitrary path access |
| Rust→Network | Permission-gated (Network capability) |
| Rust→Shell | Permission-gated (ShellExec capability), terminal blocklist |
| Rust→Plugins | Permission-gated (PluginLoad capability), syntax validation |
| Rust→Memory | PrivacyFilter gates search/inject/export |
| User→Sealed data | UnlockState required, auto-lock after 30min |

---

## 7. Performance Budget

| Metric | Budget | Current |
|---|---|---|
| Boot sequence | < 3s | ~2.5s |
| First paint | < 1s | ~0.8s |
| Chat first token | < 2s | Network-dependent |
| Memory search (1K) | < 500ms | ~200ms |
| PTY spawn | < 1s | ~300ms |
| Frontend build | < 2s | ~0.6s |
| Rust debug build | < 3min | ~2min |
| Bundle size (app) | < 200MB | ~150MB |

---

## 8. Error Handling Philosophy

- **Never `unwrap()` in command handlers** — panics crash the backend and the frontend gets a blank error. Use `map_err(|e| e.to_string())?`.
- **Mutex poison recovery** — Background threads use `lock().unwrap_or_else(|p| p.into_inner())` with logged recovery.
- **Frontend errors** — Display user-friendly messages in notification toasts, log full details to console.
- **Network failures** — Graceful fallback: Gemini → Ollama. Streaming errors emit `llm_error` event.
- **PTY failures** — Emit `pty_exit` with descriptive reason, clean up session from PtyState.
