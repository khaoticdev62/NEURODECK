# Application Audit Map

## App Overview

NEURODECK is a Tauri v2 desktop application built for Steam Deck and desktop Linux/Windows. It combines an AI chat workspace, PTY terminal, canvas editor, agent execution loop, vector memory, plugin system, file/network tooling, and handheld-native navigation into a single fullscreen shell.

## Tech Stack

- Desktop runtime: Tauri v2
- Backend language: Rust 1.77.2
- Frontend: Vite + vanilla JavaScript
- UI terminal: `xterm.js`
- State helper pattern: shared frontend module state
- Scripting/runtime extension: Lua 5.4 via `mlua`
- AI providers: Gemini and Ollama
- Networking/file transfer: FTP, SFTP, LAN tunnel, P2P transfer, canvas collaboration
- Testing: Vitest for frontend, Rust unit tests, Playwright E2E
- Packaging: Windows MSI/NSIS, Linux AppImage

## Core Features

- AI chat with streaming responses
- Prompt and persona switching
- PTY terminal with multiple sessions
- Live code canvas with preview
- Autonomous agent execution loop
- Memory search, pinning, and fact storage
- Browser and remote-control tooling
- File transfer, FTP, SFTP, and tunnel support
- SSH session management
- PromptLab and command generation tools
- Plugin auto-loading and custom slash commands
- Mini IDE with multi-LSP support (rust-analyzer, pylsp, typescript-language-server, lua-language-server, clangd, gopls, bash-language-server)

## Routes

NEURODECK does not use HTTP page routing. Navigation is a tab/view system inside one fullscreen Tauri window.

Primary views:

- Chat
- Canvas
- Terminal
- SSH
- Tunnel
- Browser
- Agent
- Memory
- Share
- Remote
- PromptLab
- Docs
- Settings

## API Routes

Frontend-to-backend interaction uses Tauri IPC.

Request/response commands:

- `invoke("command_name", payload)`

Streaming/events:

- `app_handle.emit("event_name", payload)`

Notable backend command groups:

- Chat and LLM: `send_command`, `cancel_generation`, `execute_command_stream`
- Sessions and memory: `save_session`, `load_session_by_id`, `memory_list_all`, `memory_delete`, `memory_pin`
- Terminal and SSH: `pty_spawn`, `pty_write`, `pty_resize`, `pty_kill`
- Agent and canvas: `agent_step`, `agent_exec_code`, canvas collaboration commands
- File/network: FTP, SFTP, tunnel, transfer commands
- System: config, personas, themes, autocomplete, diagnostics, TTS/STT, security helpers

## Auth and Permission Boundaries

- Local desktop IPC is the primary trust boundary.
- Gemini API access depends on a locally configured API key.
- Sync and remote collaboration flows must treat remote data as untrusted.
- Lua plugins are trusted code loaded from the local `plugins/` directory.
- Shell/PTY execution is privileged and must validate arguments before execution.
- Network-facing helpers must not trust caller-supplied paths, hosts, or IDs.

## User Roles

- Local operator: primary end user on Steam Deck or desktop
- Power user: manages sessions, plugins, prompts, and models
- Collaborator: joins shared canvas or transfer workflows
- Developer/maintainer: edits plugins, config, and release metadata

## Settings and Preferences

- Provider selection
- Gemini, Ollama, and local model settings
- Theme and persona selection
- Voice/TTS and STT settings
- Haptics toggle
- Sync enablement and endpoint settings
- Custom personas and plugin toggles
- SSH, FTP, and transfer-related preferences

## Navigation System

- Single-window shell with tab switching
- Radial gamepad menu and keyboard shortcuts for quick tab access
- Settings modal and command palette overlays
- Context-driven focus changes for chat, terminal, canvas, and dialog surfaces

## Major Components

- `src-tauri/src/lib.rs` - command registration and shared state
- `src-tauri/src/commands/*` - feature-specific backend commands
- `src-tauri/src/lsp.rs` - LSP client manager (stdio JSON-RPC, multi-server lifecycle, diagnostics)
- `src-tauri/src/llm.rs` - provider implementations and streaming
- `src-tauri/src/lua.rs` - Lua runtime and plugin hooks
- `src-tauri/src/pty_manager.rs` - shell session lifecycle
- `src-tauri/src/memory.rs` - vector memory store
- `src-tauri/src/storage.rs` - session persistence
- `src-tauri/src/sync.rs` - sync workflow
- `src-tauri/src/transfer.rs` - LAN transfer workflow
- `frontend/src/main.js` - main UI composition and event wiring
- `frontend/src/state.js` - shared client state
- `frontend/src/shortcuts.js` - keyboard/gamepad shortcut definitions
- `frontend/src/haptics.js` - vibration feedback
- `frontend/src/ide_view.js` - Mini IDE view logic and LSP UI integration
- `frontend/src/lsp_client.js` - LSP client frontend (server config, document sync, completions, hover, diagnostics)

## Shared Libraries and Utilities

- `frontend/src/icons.js`
- `frontend/src/notifications.js`
- `frontend/src/focus-trap.js`
- `frontend/src/settings.js`
- `frontend/src/chat.js`
- `frontend/src/terminal.js`
- `frontend/src/canvas.js`
- `frontend/src/memory.js`
- `frontend/src/remote_control_view.js`
- `frontend/src/workflow_view.js`
- `frontend/src/scheduler_view.js`

## Data Models

- Config: `Config`, `LlmConfig`, `ThemeConfig`, `SyncConfig`
- Personas: built-in and custom persona records
- Sessions: chat transcripts, metadata, and export payloads
- Memory records: content + metadata + similarity scoring
- PTY sessions: session IDs, shell state, resize state
- Collaboration: workspace state, peers, presence, approvals
- Transfer records: peer info, status, progress
- Diagnostics: boot pipeline steps and health summaries

## External Integrations

- Google Gemini
- Ollama
- OS keychain
- Steam Deck / Steam Input
- FTP and SFTP servers
- LAN peers for transfer and collaboration
- Google OAuth device flow
- Optional speech tools and local system executables

## Security-Sensitive Flows

- Saving and reading API keys
- Executing shell or agent-generated commands
- Plugin loading at startup
- FTP/SFTP download and upload paths
- Sync encryption and conflict handling
- Canvas collaboration and remote control
- Browser automation / external process launching
- File-system reads of user-provided paths

## Accessibility-Sensitive Flows

- Keyboard and gamepad navigation
- Command palette and radial menu focus behavior
- Dialogs and settings forms
- Tab switching and active-state feedback
- Error and loading announcements in streamed views
- Steam Deck touch-target sizing and viewport fit

## Performance-Sensitive Screens

- Chat timeline
- Terminal sessions
- Canvas editor and preview
- Memory list
- Docs browser
- Settings modal
- Agent execution and streamed output
- Mini IDE with LSP completions and diagnostics (debounced change notifications, popup rendering)

## Current Risk Areas

- Version metadata drift between docs, runtime strings, and release markers
- Large single-file frontend entrypoint still carries the highest maintenance risk
- Native dependency installation on Windows can break frontend validation until dependencies are repaired
- Shell and network helpers remain the most security-sensitive code paths
- Modal-heavy UI requires continued focus and zoom testing at 1280×800 and 200% zoom
- Plugin and automation features depend on user-controlled local files and must stay tightly validated
