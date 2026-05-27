# Contributing to NEURODECK

Thanks for considering a contribution. Here's exactly what you need to know.

---

## Development Setup

```bash
# Clone
git clone https://github.com/khaoticdev62/NEURODECK.git
cd NEURODECK

# Install frontend deps
npm install --prefix frontend

# Run in dev mode (hot-reload)
npm run tauri dev
```

**Requirements:**
- Rust 1.77.2 (pinned — use `rustup override set 1.77.2`)
- Node 18+
- On Linux: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`

---

## Architecture Rules (read before touching code)

### Every new Tauri command needs 2 things
1. `#[tauri::command]` function in a `src/` module
2. Added to `generate_handler![]` in `lib.rs`

### CSS specificity trap
Never add `display: flex` or `display: block` to `#view-*` ID rules in `app.css`.
ID selectors (specificity 100) override `.view-content.active` (specificity 20) and break tab switching.

### No unwrap() in command handlers
Use `map_err(|e| e.to_string())?` — a panic kills the backend and the frontend gets a blank error.

### Config path
Never hardcode `"llm-term.toml"`. Use the path-resolution logic in `lib.rs` that checks `../llm-term.toml` first. Two copies of the config exist and both must be kept in sync.

---

## Verification before submitting

```bash
cd src-tauri && cargo check          # must be 0 errors
npm run --prefix frontend build      # must succeed
```

---

## Commit message format

```
type: short description (max 72 chars)

Optional longer explanation.

Co-Authored-By: Your Name <email>
```

Types: `feat`, `fix`, `refactor`, `docs`, `build`, `perf`, `test`

---

## Project structure quick-reference

```
src-tauri/src/
  lib.rs          — All Tauri command handlers (~1600 lines)
  llm.rs          — Gemini + Ollama providers
  lua.rs          — Lua runtime
  pty_manager.rs  — Terminal sessions
  memory.rs       — Vector memory / RAG
  transfer.rs     — LAN P2P + Warpinator gRPC
  canvas_collab.rs— Live canvas TCP collab

frontend/src/
  main.js         — Entire frontend (~11700 lines, vanilla JS)
  app.css         — Styles (~16300 lines)

infrastructure/
  src/secrets.rs  — OS keychain (keyring 4.x)
  src/oauth.rs    — Google OAuth2 device flow
  src/warpinator.rs — Warpinator gRPC service

plugins/          — Lua plugins (auto-loaded at startup)
docs/             — Documentation
```

---

## What we need help with

Check the [Issues](https://github.com/khaoticdev62/NEURODECK/issues) tab for items labeled `good first issue` or `help wanted`.

High-priority areas:
- Canvas Python/Bash execution (currently runs in Agent only)
- Context inspector drawer (wired but empty)
- SSH key-file authentication
- More Lua plugin examples
