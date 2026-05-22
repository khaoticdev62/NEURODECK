# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: NEURODECK

A Tauri 2.x desktop application — an AI-powered terminal interface optimized for Steam Deck and general desktop use. The stack is **Rust backend + Vite/vanilla JS frontend**, communicating via Tauri IPC.

## Commands

### Development
```bash
npm run tauri dev          # Hot-reload dev (Vite frontend + Rust backend)
npm run build              # Production build (tauri build)
```

### Frontend only
```bash
npm run --prefix frontend dev      # Vite dev server standalone
npm run --prefix frontend build    # Vite build only
```

### Rust backend only
```bash
cd src-tauri && cargo build        # Debug build
cd src-tauri && cargo check        # Type-check without building
cd src-tauri && cargo clippy       # Lint
```

### Packaging
```bash
./install.sh                       # SteamOS/Linux install to ~/Applications/neurodeck/
./launch_gamescope.sh              # Steam Deck Game Mode (1280×800 via gamescope)
.\package_release.ps1              # Windows installer packaging
```

## Architecture

### IPC Pattern
Frontend (`frontend/src/main.js`) communicates with Rust backend (`src-tauri/src/lib.rs`) exclusively via Tauri's `invoke()` / `emit()` IPC:
- Frontend calls `invoke('command_name', { args })` for synchronous-style requests
- Backend emits events via `app_handle.emit(event, payload)` for streaming/async updates (chat output, terminal output)
- 23+ registered Tauri commands in `lib.rs` — all defined with `#[tauri::command]` and registered in `main.rs`

### Backend Modules (`src-tauri/src/`)
| Module | Responsibility |
|--------|---------------|
| `lib.rs` | Core state management, all Tauri command handlers, theme/persona definitions, voice I/O |
| `llm.rs` | LLM provider abstraction — `GeminiProvider` (streaming) and `OllamaProvider` (local) |
| `lua.rs` | Lua 5.4 runtime via mlua; registers globals (`print`, `execute`, `registerCommand`, `registerHook`); auto-loads `plugins/*.lua` |
| `pty_manager.rs` | Cross-platform PTY via portable-pty; spawns native shells (bash/sh/cmd/powershell) |
| `memory.rs` | Vector memory database for RAG/long-term context |
| `storage.rs` | Session persistence (save/load chat history as JSON in `data/`) |
| `config.rs` | Parses `llm-term.toml` (provider, model, Ollama URL) |
| `tunnel.rs` | Network tunneling for advanced features |
| `transfer.rs` | Streaming data transfer between modules and frontend |

### Frontend (`frontend/src/main.js`)
A single large vanilla JS file (~50KB) — no framework. Key responsibilities:
- Chat UI rendering with markdown via `marked.js`
- Terminal emulator via `xterm.js` + `xterm-addon-fit`
- Tauri event listeners for streaming LLM/terminal output
- Theme switching, persona cycling, session sidebar
- Web Audio API for TTS playback

### Configuration (`llm-term.toml`)
Runtime config at project root. Controls LLM provider (`gemini` or `ollama`), model names, and Ollama base URL. Read at startup by `config.rs`.

### Plugin System
Lua files in `plugins/` are auto-loaded on startup. Plugins can register:
- `/command` handlers via `registerCommand(name, fn)`
- Event hooks via `registerHook(event, fn)` — events: `onMessage`, `onAIResponse`

### Multi-Persona System
9 built-in personas defined in `lib.rs`. Cycled via `Ctrl+P` or `/persona <name>`. Multi-persona debates triggered by `/discuss <p1> <p2> <topic>` (4-turn roundtable).

### Themes
4 predefined themes (BLACKSITE, TERMINAL_GHOST, SYNTH_GRID, DECK_BLUE) with color palettes and pulse animations. Applied via CSS variables injected from Rust.

## Key Keyboard Shortcuts
`Enter` submit | `Shift+Enter` newline | `Ctrl+B` execute Lua | `Ctrl+S` save session | `Ctrl+L` load session | `Ctrl+N` new session | `Ctrl+P` next persona | `Ctrl+R` voice record | `Ctrl+M` mute TTS | `Ctrl+C` kill process | `Escape` cancel

## In-Chat Commands
`/help` | `/persona <name>` | `/discuss <p1> <p2> <topic>` | `@file:<path>` (attach file) | `/<plugin-command>`

## Target Platform
Primary: **Steam Deck** at 1280×800 (Game Mode via Gamescope). Also supports Windows and Linux desktop. Window is sized and styled for 1280×800 fullscreen — maintain this constraint when modifying UI.

## BMAD Framework

43 skills installed in `.agent/skills/`. Agent personas are active via `plugins/bmad.lua` — each registers a `/name` slash command calling `setPersona()` in `lua.rs`.

| Slash Command | Persona | Role |
|---|---|---|
| `/john` | John | Product Manager |
| `/sally` | Sally | UX Designer |
| `/winston` | Winston | System Architect |
| `/amelia` | Amelia | Senior Developer |
| `/paige` | Paige | Technical Writer |
| `/mary` | Mary | Business Analyst |

Project context loaded by all BMAD agents: `docs/project-context.md` — keep this file current as features are added.

Custom project overrides: `_bmad/custom/config.toml` — agent descriptors scoped to NEURODECK constraints.

Sprint artifacts: `_bmad-output/implementation-artifacts/` (stories) and `_bmad-output/planning-artifacts/` (epics, architecture docs).
