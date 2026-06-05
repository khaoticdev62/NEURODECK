# Epic: Hermes Lua Extension Framework

## Objective
Enable developers to register custom shell commands and hook into system events via a pluggable adapter pipeline running inside the Lua sandboxed environment.

## Background
NEURODECK's Lua runtime (`mlua` with Lua 5.4) auto-loads every `.lua` file in `plugins/` at app startup. The Hermes Framework is a bundled plugin that provides a structured adapter pattern for bridging external tools (CLI, Node.js, Python, Web, Unity, Tauri) into the NEURODECK plugin ecosystem.

## User Stories

### Story 1: Pluggable Adapter Pipeline (US-7.1)
**As a** plugin developer,
**I want** to dynamically register CLI, Node, and Web adapters within the Lua sandbox,
**So that** I can integrate external tools without writing Rust code.

- **Acceptance Criteria**:
  - `plugins/hermes.lua` is bundled and auto-loaded at app startup.
  - Hermes provides adapter modules for: CLI, Node.js, Python, Web, Unity, Tauri, and Generic fallback.
  - Each adapter implements `detect`, `install`, `wire`, `doctor`, and `uninstall` lifecycle methods.
  - Adapters are resolved via `require("adapters.{name}")` inside the Lua sandbox.
  - Core utilities (`core.fs`, `core.path`, `core.manifest`, `core.result`, `core.templates`, etc.) are preloaded and available to all adapters.

## Implementation Status

### Plugin (`plugins/hermes.lua`)
- **1490 lines**, **79 functions**
- Self-contained: all `core.*` modules are preloaded via `package.preload`
- Adapters registered:
  | Adapter | ID | Detect | Install | Wire | Doctor | Uninstall |
  |---------|-----|--------|---------|------|--------|-----------|
  | CLI | `cli` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Node.js | `node` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Python | `python` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Web | `web` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Tauri | `tauri` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Unity | `unity` | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Generic | `generic` | ✅ | ✅ | ✅ | ✅ | ✅ |

### Lua Runtime (`src-tauri/src/lua.rs`)
- `LuaEngine::new()` creates the sandbox with:
  - `print(...)` → emits `command_stdout` events to frontend
  - `execute(cmd)` → runs validated shell commands
  - `registerCommand(name, func)` → registers slash commands
  - `registerHook(event, func)` → registers event hooks (`onMessage`, `onAIResponse`)
  - `setPersona(name)` → switches active persona
- `LuaEngine::load_plugins()` iterates `plugins/*.lua` and `run_script()` each file
- `plugins/hermes.lua` is loaded automatically on startup alongside other plugins

### Plugin Manager (`src-tauri/src/plugin_mgr.rs`)
- Marketplace install/uninstall commands
- Safe file name validation (rejects path traversal)
- GitHub-only download source restriction
- Unit tests cover safe filename extraction and unsafe name rejection

## Verification
- [x] `cargo check` succeeds
- [x] `cargo test --lib` passes (includes `plugin_mgr` tests)
- [x] `npm run --prefix frontend build` succeeds
- [x] KFMS release status remains GO
- [x] `plugins/hermes.lua` loads without `[Lua Error]` on startup
