# NEURODECK Master Blueprint

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08
>
> This document is the canonical architecture blueprint for NEURODECK. It describes the system as it exists today and the principles that govern its evolution.

---

## Product Identity

| Field | Value |
|---|---|
| **Name** | NEURODECK |
| **Tagline** | AI-powered terminal OS for Steam Deck |
| **Primary target** | Steam Deck LCD/OLED, SteamOS Game Mode |
| **Secondary targets** | Linux desktop, Windows 10/11 |
| **Core design language** | Tactical Glass, controller-first, 1280×800 optimized |
| **Core architecture** | Electron 36 + Vanilla JS/Vite frontend + Rust sidecar (bridge mode) + SQLite |
| **Default philosophy** | Local-first, private-by-default, explicit permissions, user-owned data |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Renderer Process (Electron)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Vanilla JS ~8K lines (frontend/src/main.js)           │   │
│  │  ├─ Vite build → dist/                                  │   │
│  │  ├─ xterm.js (terminal)                                 │   │
│  │  ├─ marked.js (markdown)                                │   │
│  │  ├─ qrcode (sharing)                                    │   │
│  │  └─ Monaco editor (Canvas/IDE)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         ↑↓                                      │
│  neurobridge.js — HTTP POST + WebSocket                         │
│                         ↑↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Electron Main (electron/main.js)                       │   │
│  │  └─ Spawns Rust binary with --bridge flag               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓
                    localhost:9477 (axum)
┌─────────────────────────────────────────────────────────────────┐
│  Rust Sidecar (src-tauri/src/)                                  │
│  ├─ bridge.rs        — axum HTTP server, WebSocket broadcaster  │
│  ├─ lib.rs           — AppState, module re-exports              │
│  ├─ commands/mod.rs  — ~5,400-line bridge dispatch table        │
│  ├─ commands/        — session, agent, browser, system, git...  │
│  ├─ llm.rs           — GeminiProvider, OllamaProvider, embeddings│
│  ├─ memory.rs        — Vector DB (cosine similarity)            │
│  ├─ pty_manager.rs   — portable-pty multi-session               │
│  ├─ scheduler.rs     — tokio-cron-scheduler                     │
│  ├─ workflow_engine.rs — Node graph execution engine            │
│  ├─ orchestrator.rs  — Multi-agent task decomposition           │
│  ├─ permissions.rs   — Capability-based deny-by-default ACL     │
│  ├─ lua.rs           — mlua runtime (Lua 5.4)                   │
│  ├─ plugin_mgr.rs    — Plugin discovery, load, toggle           │
│  ├─ game.rs          — Steam ACF + process detection            │
│  ├─ transfer.rs      — LAN P2P + Warpinator gRPC                │
│  ├─ canvas_collab.rs — TCP LAN workspace collaboration          │
│  ├─ computer_use.rs  — Screenshot, mouse, keyboard (macOS/Win)  │
│  ├─ sync.rs          — Encrypted cloud sync (ring/AES-GCM)      │
│  ├─ security.rs      — Input validation, sanitization           │
│  ├─ ftp.rs           — suppaftp (streaming, progress events)    │
│  ├─ tunnel.rs        — SteamOS LAN tunnel                       │
│  ├─ whisper.rs       — whisper.cpp CLI wrapper                  │
│  ├─ mcp.rs           — MCP server on localhost:13337            │
│  ├─ lsp.rs           — LspManager (multi-language server)       │
│  ├─ doc_indexer.rs   — Local document RAG indexing              │
│  ├─ dashboard.rs     — Workspace stats aggregation              │
│  ├─ context_packs.rs — Pack CRUD + scoped RAG                 │
│  ├─ privacy.rs       — PrivacyFilter (4-tier levels)            │
│  ├─ search.rs        — Universal FTS5 search                    │
│  ├─ projects.rs      — Project knowledge spaces                 │
│  ├─ models.rs        — Theme, Persona, CustomPersona            │
│  ├─ providers.rs     — Provider factory                         │
│  ├─ paths.rs         — Config path resolution                   │
│  ├─ config.rs        — llm-term.toml schema                     │
│  ├─ storage.rs       — Session save/load                        │
│  └─ db/              — SQLite migrations (001–003+)             │
└─────────────────────────────────────────────────────────────────┘
                              ↑↓
┌─────────────────────────────────────────────────────────────────┐
│  Persistence Layer                                              │
│  ├─ SQLite (WAL mode) — sessions, messages, memory, packs...   │
│  ├─ data/memory/chat_history.json — Vector DB records          │
│  ├─ data/profiles/ — SSH/FTP/SFTP saved profiles               │
│  ├─ data/themes/ — Custom theme JSON files                     │
│  ├─ data/personas.json — Custom persona definitions            │
│  ├─ data/game_notes/<app_id>.md — Per-game notes               │
│  ├─ data/workflows/history/ — Workflow run history             │
│  ├─ data/scheduler/tasks.json — Cron task definitions          │
│  └─ ~/.config/neurodeck/llm-term.toml — Primary config file    │
└─────────────────────────────────────────────────────────────────┘
```

---

## IPC Contract

All frontend→backend communication flows through the bridge server:

- **Commands:** `POST /api/{command_name}` with JSON body → JSON response
- **Streaming:** `WebSocket` on `/ws` → `WsBroadcaster.emit(event, payload)`
- **Event types:** `llm_token`, `pty_output`, `pty_exit`, `agent_step`, `orchestrator_plan_ready`, `scheduled_task_started`, `workflow_node_start`, `workflow_node_done`, `workflow_complete`, `sync_progress`, `ftp_progress`, `canvas_collab_update`, `rag_sources`

**Key constraint:** Never use `std::sync::Mutex` across `.await` in bridge handlers. Use `tokio::sync::Mutex` or `Arc<SqlitePool>` directly.

---

## Module Responsibility Matrix

| Module | Lines | Responsibility |
|---|---|---|
| `commands/mod.rs` | ~5,400 | Bridge dispatch table — all HTTP command routing |
| `frontend/src/main.js` | ~8,000 | Single-file vanilla JS frontend (no framework) |
| `lib.rs` | ~764 | AppState, `run()`, bridge bootstrap, module re-exports |
| `llm.rs` | ~1,900 | Gemini/Ollama/HF/OpenAI-compat providers, embeddings, vision |
| `memory.rs` | ~400 | Cosine-similarity vector DB, persist/load |
| `pty_manager.rs` | ~300 | Multi-session PTY via portable-pty, spawn timeout, TTL watchdog |
| `scheduler.rs` | ~305 | tokio-cron-scheduler, workflow-triggering cron jobs |
| `workflow_engine.rs` | ~450 | 9-node workflow execution, template substitution, condition evaluator |
| `orchestrator.rs` | ~400 | Multi-agent task decomposition, generic EventEmitter |
| `permissions.rs` | ~250 | Capability enum, PermissionProfile, PermissionRegistry, enforcement |
| `bridge.rs` | ~585 | axum server, WsBroadcaster, plugin loading, scheduler startup |
| `game.rs` | ~200 | Steam ACF scanner, process detection (sysinfo) |
| `transfer.rs` | ~600 | LAN P2P file transfer, Warpinator gRPC server |
| `computer_use.rs` | ~400 | Screenshot, mouse, keyboard (macOS core-graphics, Windows) |
| `sync.rs` | ~300 | Encrypted cloud sync (ring AES-GCM) |

---

## State Management

`AppState` (in `lib.rs`) is the single source of backend truth:

```rust
pub struct AppState {
    pub config: Config,                    // llm-term.toml
    pub provider: Arc<dyn LlmProvider>,    // Active LLM provider
    pub mem_db: Option<Arc<MemoryDB>>,     // Vector memory
    pub messages: Vec<String>,             // Current session messages
    pub session_id: String,                // UUID for session
    pub custom_personas: Vec<CustomPersona>,
    pub active_persona: String,
    pub db: Option<Arc<SqlitePool>>,       // SQLite connection pool
}
```

Wrapped in `Arc<Mutex<AppState>>` for thread-safe shared access.

---

## Security Architecture

### Capability Model (Deny-by-Default)

9 capabilities gated by `PermissionProfile`:

| Capability | Commands Protected |
|---|---|
| `ShellExec` | `agent_exec_code`, `exec_code_stream` |
| `FileSystemRead` | File op nodes, plugin file access |
| `FileSystemWrite` | File op nodes, workspace writes |
| `Network` | `send_command` (LLM API calls) |
| `Browser` | `browser_*` commands |
| `Computer` | `computer_*` commands |
| `MemoryRead` | `memory_search`, `memory_list_all` |
| `MemoryWrite` | `memory_add_fact`, `browser_save_to_memory` |
| `PluginLoad` | `reload_plugins`, bootstrap plugin loading |

3 built-in profiles: Default, Restricted, Privileged.

### Other Security Measures

- Context isolation enabled (Electron)
- Node integration disabled in renderer
- No raw SQL IPC — all DB access via sqlx queries
- Provider credentials encrypted via OS keychain (keyring 4.x)
- Sealed memory excluded from search/export unless unlocked
- Support bundles redact API keys and paths
- Plugin APIs permission-gated
- Secret redaction in PromptFlow repo inspection

---

## Steam Deck Constraints

| Constraint | Rule |
|---|---|
| Resolution | 1280×800 fixed |
| Navigation | Controller-first (D-pad, L2 radial, A/B buttons) |
| Input | No mouse-only critical paths, no hover-only actions |
| Keyboard | Steam virtual keyboard must work |
| Modals | Must fit within viewport, FocusTrap required |
| CSS | Never add `display: flex` to `#view-*` ID rules (specificity trap) |
| Recovery | All flows must work in Game Mode without desktop access |

---

## Version History & KFMS

| Version | Codename | KFMS Minor | Status |
|---|---|---|---|
| v1.2.x | Ra | 2 | Released |
| v1.3.x | Isis | 3 | Released |
| v1.4.x | Osiris | 4 | Released |
| v1.5.x | Horus | 5 | Released |
| v1.6.x | Bastet | 6 | Released |
| v1.8.x | Ptah | 8 | Current |

KFMS files: `infra/meta/meta.json`, `infra/meta/CODENAME_REGISTRY.md`, `infra/telemetry/health.json`

---

## Final Release Gates (12 Gates)

1. **Product Gate** — All PRD features implemented and smoke-tested
2. **Engineering Gate** — `cargo check`, `cargo test --lib`, `npm run build` pass
3. **Security Gate** — Capability enforcement active, no secrets in logs, redaction verified
4. **Privacy Gate** — Privacy levels enforced, sealed memory encrypted, exports redacted
5. **Steam Deck Gate** — 1280×800 layout verified, controller nav works, Game Mode launch OK
6. **Accessibility Gate** — FocusTrap on all modals, ARIA attributes, keyboard shortcuts
7. **Performance Gate** — Boot < 3s, chat response < 2s, no PTY leaks, DB WAL healthy
8. **Persistence Gate** — Config persists, sessions restore, memory survives restart
9. **Installer Gate** — AppImage builds, NSIS installer works, Steam Deck deploy script OK
10. **Plugin Gate** — Lua plugins load, marketplace fetch works, reload doesn't crash
11. **Documentation Gate** — AGENTS.md current, README accurate, changelogs updated
12. **Support Gate** — Support bundle generates, diagnostics panel shows real data, logs accessible

---

## North Star Statement

> NEURODECK is the AI workstation that turns a Steam Deck into a portable development environment. Every feature must work offline-first, controller-first, and at 1280×800. No feature ships without passing the 12 release gates. No code ships without PromptFlow certification.
