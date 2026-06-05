# NEURODECK Architecture

## Overview

NEURODECK is an AI-native terminal OS for Steam Deck. It combines an Electron 36 frontend with a Rust sidecar (axum bridge server) to deliver LLM chat, PTY shell, SSH, browser, canvas coding, vector memory, and Lua plugin runtime — all in a single 1280×800 fullscreen window.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│  Electron Main Process                  │
│  ├─ Spawns Rust sidecar (neurodeck.exe) │
│  ├─ Registers neurodeck://app protocol  │
│  └─ Manages BrowserWindow lifecycle     │
├─────────────────────────────────────────┤
│  Frontend (Chromium/WebView)            │
│  ├─ Vanilla JS SPA (no framework)       │
│  ├─ neurobridge.js → HTTP/WebSocket     │
│  ├─ Vite 8 build system                 │
│  └─ Monaco Editor, xterm.js, D3.js      │
├─────────────────────────────────────────┤
│  Rust Sidecar (localhost:9477)          │
│  ├─ axum HTTP router (/api/{command})   │
│  ├─ WebSocket broadcaster (events)      │
│  ├─ 295 commands implemented            │
│  └─ mlua 5.4 plugin runtime             │
└─────────────────────────────────────────┘
```

## Module Boundaries

### Frontend (`frontend/src/`)
| Module | Responsibility |
|--------|---------------|
| `main.js` | App boot, theme, navigation, onboarding, global event bus (~13K lines) |
| `chat.js` | LLM chat, streaming, RAG, attachments, session management |
| `neurobridge.js` | HTTP fetch + WebSocket client (Tauri IPC replacement) |
| `canvas.js` | Monaco editor, preview, run, collab, AI edit |
| `terminal.js` | xterm.js PTY, SSH/SFTP/FTP profiles |
| `settings.js` | Settings modal, LLM config, themes, personas |
| `agent.js` | Autonomous agent loop, tool execution, orchestrator |
| `memory.js` | Vector memory search, RAG graph view |
| `icons.js` | SVG icon factory |

### Backend (`src-tauri/src/`)
| Module | Responsibility |
|--------|---------------|
| `bridge.rs` | axum HTTP server, WS broadcaster, command dispatch |
| `commands/` | 295 Tauri-style commands organized by domain |
| `security.rs` | Rate limiting, path redaction, input validation |
| `memory.rs` | Cosine-similarity vector DB (JSON persistence) |
| `lua.rs` | mlua runtime: `print`, `execute`, `registerCommand`, `registerHook` |
| `pty_manager.rs` | portable-pty sessions (multi-session support) |
| `providers.rs` | LLM provider factory (Gemini, Ollama, OpenAI-compat) |

### Infrastructure (`infrastructure/`)
| Module | Responsibility |
|--------|---------------|
| `secrets.rs` | OS keychain integration (keyring 4.x) |
| `oauth.rs` | Google OAuth2 device flow |
| `warpinator.rs` | Warpinator-compatible gRPC server (LAN transfer) |

## Dependency Direction

```
Frontend (JS) → neurobridge.js → HTTP/WS → Bridge (Rust)
                                     ↓
                    Commands → Domain logic → Infrastructure
```

- **Frontend** never imports Rust directly (all via HTTP/WS).
- **Commands** never import frontend.
- **Domain modules** (memory, pty, providers) are consumed by commands.
- **Infrastructure** implements platform services consumed by domain.

## Unsafe Edit Zones

| Zone | Risk |
|------|------|
| `src-tauri/src/bridge.rs` | Command dispatch table — adding commands requires registration here and in `commands/mod.rs` |
| `frontend/src/main.js` | Global event bus, theme system, navigation — high blast radius |
| `frontend/src/app.css` | `#view-*` ID selectors — specificity trap (never add `display:flex`) |
| `infra/meta/meta.json` | KFMS metadata — only modify via `khaotic-init.sh` |
| `scripts/kfms/khaotic-init.sh` | KFMS hooks — recursive amend risk |
| `.git/hooks/post-commit` | KFMS automation — disabling breaks metadata sync |

## Public Contracts

### HTTP API
- `POST /api/{command}` — JSON body → JSON response
- `GET /ws` — WebSocket event stream (backend → frontend)

### Plugin API (Lua)
- `registerCommand(name, func)` — Adds `/name` slash command
- `registerHook(event, func)` — Hooks: `onMessage`, `onAIResponse`
- `execute(cmd)` — Validated shell execution
- `print(...)` — Streams to frontend console

### Config Keys (`llm-term.toml`)
- `[llm] provider`, `model`, `api_key`, `google_client_id`
- `[stt] whisper_model_path`
- `[theme] accent_color`, `background`

## Build Pipeline

```bash
npm run build        # Vite frontend → cargo release → electron-builder
npm run dev          # Dev autokill → sidecar build → electron dev
npm run rust:test    # cargo test --workspace
npm run frontend:test # Vitest
```
