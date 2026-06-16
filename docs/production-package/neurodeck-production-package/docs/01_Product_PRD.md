# NEURODECK Product Requirements Document

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Product Overview

NEURODECK is a local-first, controller-first AI workspace for Steam Deck, Linux, and Windows. It combines persistent chat, project knowledge, protected memory, context packs, universal search, research mode, safe automation, plugin extensibility, privacy controls, and production packaging into a single professional-grade AI workstation.

### Target Users
- Steam Deck owners who want to code/browse/AI-chat in Game Mode
- Linux developers who want an AI-integrated terminal
- Windows users who want a privacy-first AI client

### Core Value Proposition
> One fullscreen window. All your AI tools. No cloud dependency. Controller-native.

---

## 2. Feature Definitions

### Epic 1 — Foundation Shell
| Feature | Status | Description |
|---|---|---|
| Electron boot | ✅ | Main process spawns Rust sidecar, loads config, shows boot overlay |
| Rust sidecar boot | ✅ | Bridge server binds localhost:9477, starts scheduler, loads plugins |
| SQLite boot | ✅ | WAL mode, migrations run automatically, pool shared in AppState |
| Runtime ping | ✅ | Health check endpoint for frontend connectivity |
| Theme load | ✅ | 9 built-in themes + custom theme editor, persisted to disk |
| Diagnostics panel | ✅ | JPE Diagnostics & Manual UI with real-time health checks |

### Epic 2 — Chat Workspace
| Feature | Status | Description |
|---|---|---|
| Provider runtime | ✅ | Gemini (streaming SSE), Ollama (local), HuggingFace, OpenAI-compat, Kimi |
| Message timeline | ✅ | Markdown rendering, code blocks with copy, image thumbnails |
| Session lifecycle | ✅ | Save/load/delete/new sessions, auto-restore last session |
| Draft recovery | ✅ | Unsent prompt preserved across tab switches |
| Credential vault | ✅ | API keys stored in OS keychain (keyring 4.x) |
| RAG injection | ✅ | Top-3 relevant memory records injected per message |
| Vision support | ✅ | Gemini Vision, Ollama vision, HF vision, OpenAI vision |

### Epic 3 — Intelligence Layer
| Feature | Status | Description |
|---|---|---|
| Memory system | ✅ | Cosine-similarity vector DB, persist to JSON, embedding generation |
| Projects | ✅ | SQLite-backed project knowledge spaces |
| Context packs | ✅ | Named memory collections, RAG scoping by pack_id |
| Universal search | ✅ | FTS5 across memory, sessions, projects, docs |
| Privacy levels | ✅ | 4 tiers: standard / private / sensitive / sealed |
| Dashboard | ✅ | Workspace stats: sessions, messages, records, provider health, storage |
| Model context builder | ✅ | Active persona + game context + RAG sources injected |
| Research mode | ✅ | Browser citation surfaces, save-to-memory, copy citation |
| Knowledge archives | ✅ | Local document RAG via index_directory |

### Epic 4 — Automation
| Feature | Status | Description |
|---|---|---|
| Agent runtime | ✅ | 5-step ReAct loop, pre-flight permission check |
| Workflow engine | ✅ | 9 node types, template substitution, condition evaluator, headless execution |
| Permissions | ✅ | 9 capabilities, deny-by-default, 3 built-in profiles, frontend UI |
| Automation builder | ✅ | Visual node-graph editor, save/load/import/export `.ndwf` |
| Scheduler | ✅ | Cron-style task scheduling, workflow triggering via `workflow:{name}` prefix |
| Orchestrator | ✅ | Multi-agent task decomposition, parallel execution, status tracking |

### Epic 5 — Plugins
| Feature | Status | Description |
|---|---|---|
| SDK runtime | ✅ | Lua 5.4 via mlua, globals: print, execute, registerCommand, registerHook, setPersona |
| Plugin manager | ✅ | List, toggle, install from URL, new plugin, reload |
| Marketplace foundation | ✅ | GitHub-hosted registry fetch, install/uninstall with validation |
| Plugin QA gate | ✅ | Path traversal validation, GitHub-only downloads, Lua syntax check |

### Epic 6 — Release Hardening
| Feature | Status | Description |
|---|---|---|
| Packaging | ✅ | electron-builder NSIS (Windows), AppImage (Linux) |
| Installers | ✅ | Steam Deck deploy script, Windows MSI |
| Observability | ✅ | Support bundle generation, health.json, tracing |
| Recovery | ✅ | Config self-heal, session restore, boot diagnostics |
| Support bundles | ✅ | Redacted logs, system info, config snapshot |

---

## 3. Non-Functional Requirements

| NFR | Target | Verification |
|---|---|---|
| Boot time | < 3 seconds | Manual stopwatch on Steam Deck |
| Chat response latency | < 2s first token (Gemini) | Network-dependent, measured in UI |
| Memory search | < 500ms for 1K records | cargo test --lib benchmark |
| PTY spawn timeout | 30s default | pty_manager.rs timeout test |
| PTY idle TTL | 2 hours | Background watchdog kills idle sessions |
| Frontend build | < 1s (Vite dev), < 2s (prod) | npm run build timer |
| Rust debug build | ~2min first time | cargo build timer |
| Window size | 1280×800 fixed | CSS verification |
| Offline capability | Core chat works with Ollama | Disconnect network, verify |

---

## 4. Acceptance Criteria Template

Every feature must satisfy:
1. Backend command wired in bridge dispatch table (`commands/mod.rs`)
2. Frontend UI renders within 1280×800 without horizontal overflow
3. Controller navigation works (D-pad, A/B, L2 radial)
4. `cargo check` produces no new errors
5. `cargo test --lib` passes (or new tests added)
6. `npm run --prefix frontend build` succeeds
7. AGENTS.md updated if conventions changed
8. PromptFlow audit run completed for the feature area
