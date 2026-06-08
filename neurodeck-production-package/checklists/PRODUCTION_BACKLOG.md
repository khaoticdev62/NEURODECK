# NEURODECK Production Backlog

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08
>
> Epic/story tracker with current status. This is the canonical backlog.

---

## Epic 1 — Foundation Shell

| Story | Description | Status |
|---|---|---|
| 1.1 | Electron main process bootstrap + window management | ✅ |
| 1.2 | Rust sidecar bridge server (axum HTTP + WebSocket) | ✅ |
| 1.3 | SQLite boot with WAL mode and migrations | ✅ |
| 1.4 | Runtime ping / health check endpoint | ✅ |
| 1.5 | Theme system (9 built-in + custom editor) | ✅ |
| 1.6 | Diagnostics panel (JPE Manual UI + health checks) | ✅ |
| 1.7 | Boot sequence (cinematic overlay + real system stats) | ✅ |
| 1.8 | Onboarding wizard (first-time user flow) | ✅ |

---

## Epic 2 — Chat Workspace

| Story | Description | Status |
|---|---|---|
| 2.1 | Message timeline with markdown rendering | ✅ |
| 2.2 | Provider runtime (Gemini streaming SSE) | ✅ |
| 2.3 | Ollama local provider support | ✅ |
| 2.4 | HuggingFace + OpenAI-compatible providers | ✅ |
| 2.5 | Kimi provider support | ✅ |
| 2.6 | Vision support (Gemini, Ollama, HF, OpenAI) | ✅ |
| 2.7 | Session management (save/load/delete/new) | ✅ |
| 2.8 | Draft recovery (unsent prompt preservation) | ✅ |
| 2.9 | Credential vault (OS keychain via keyring 4.x) | ✅ |
| 2.10 | RAG memory injection (top-3 relevant records) | ✅ |
| 2.11 | Chat welcome screen (6 feature-card starters) | ✅ |

---

## Epic 3 — Intelligence Layer

| Story | Description | Status |
|---|---|---|
| 3.1 | Memory system (vector DB, cosine similarity) | ✅ |
| 3.2 | Project knowledge spaces | ✅ |
| 3.3 | Context packs (named collections, scoped RAG) | ✅ |
| 3.4 | Universal search (FTS5 across all data) | ✅ |
| 3.5 | Privacy levels (standard/private/sensitive/sealed) | ✅ |
| 3.6 | Workspace intelligence dashboard | ✅ |
| 3.7 | Model context builder (persona + game + RAG) | ✅ |
| 3.8 | Research mode (browser citations) | ✅ |
| 3.9 | Knowledge export/import | ✅ |
| 3.10 | Local document RAG (`index_directory`) | ✅ |
| 3.11 | Knowledge graph visualization (D3.js) | ✅ |

---

## Epic 4 — Automation

| Story | Description | Status |
|---|---|---|
| 4.1 | Agent Permission Registry (9 capabilities, deny-by-default) | ✅ |
| 4.2 | Bridge Dispatch Repair (workflow + scheduler + orchestrator commands) | ✅ |
| 4.3 | Workflow Execution Engine (9 node types, headless execution) | ✅ |
| 4.4 | Plugin Permission Gating (bootstrap + runtime checks) | ✅ |
| 4.5 | Visual workflow builder (node editor, drag-drop, `.ndwf`) | ✅ |
| 4.6 | Task scheduler (cron-style, workflow triggering) | ✅ |
| 4.7 | Multi-agent orchestrator (task decomposition, parallel execution) | ✅ |
| 4.8 | Agent runtime (5-step ReAct loop, pre-flight check) | ✅ |

---

## Epic 5 — Plugins

| Story | Description | Status |
|---|---|---|
| 5.1 | Lua 5.4 runtime (mlua vendored) | ✅ |
| 5.2 | Plugin auto-load from `plugins/` directory | ✅ |
| 5.3 | Lua globals (print, execute, registerCommand, registerHook, setPersona) | ✅ |
| 5.4 | Plugin manager UI (list, toggle, install, reload) | ✅ |
| 5.5 | Marketplace foundation (GitHub registry fetch) | ✅ |
| 5.6 | Plugin QA gate (path traversal, syntax check, GitHub-only) | ✅ |
| 5.7 | Hermes 3 native integration | ✅ |

---

## Epic 6 — Release Hardening

| Story | Description | Status |
|---|---|---|
| 6.1 | Windows NSIS installer | ✅ |
| 6.2 | Windows portable ZIP | ✅ |
| 6.3 | Linux AppImage | ✅ |
| 6.4 | Steam Deck AppImage + deploy script | ✅ |
| 6.5 | Steam Deck launcher (gamescope wrapper) | ✅ |
| 6.6 | Support bundle generation | ✅ |
| 6.7 | Crash recovery (config self-heal, session restore) | ✅ |
| 6.8 | KFMS version governance (meta.json, codename registry, health.json) | ✅ |
| 6.9 | PromptFlow integration (Production Code Prompt System) | ✅ |
| 6.10 | Production Package (this package — SSoT) | 🔄 |

---

## Deferred / Future

| Epic | Description | Target |
|---|---|---|
| Epic 7 | Mobile Companion App (iOS/Android) | v1.9.x |
| Epic 8 | WebSocket/CRDT collaboration hardening | v1.9.x |
| Epic 9 | HuggingFace GGUF model browser/downloader | v1.9.x |
| Epic 10 | Multi-device encrypted sync | v2.0.x |
| Epic 11 | Plugin marketplace v2 (purchases, ratings, verified) | v2.0.x |
| Epic 12 | Advanced agent orchestration (sub-agents, parallel tools) | v2.0.x |

---

## Sprint Velocity

| Period | Stories Completed | Test Count |
|---|---|---|
| v1.2.x (Ra) | 12 | 75 |
| v1.3.x (Isis) | 15 | 82 |
| v1.4.x (Osiris) | 8 | 85 |
| v1.5.x (Horus) | 10 | 90 |
| v1.6.x (Bastet) | 6 | 95 |
| v1.8.x (Ptah) | 7 | 111 |
