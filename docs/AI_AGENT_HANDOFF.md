# AI Agent Handoff

This document is for AI coding agents (Claude, Kimi, Codex) working on NEURODECK.

## Context Sources

| Source | What it contains | Priority |
|--------|-----------------|----------|
| `AGENTS.md` (root) | Architecture, gotchas, anti-patterns | **Highest** |
| `docs/ARCHITECTURE.md` | Module map, contracts, dependency graph | High |
| `docs/SECURITY.md` | Threat model, env vars, policy | Medium |
| `docs/TESTING.md` | Test strategy, coverage gaps | Medium |
| `docs/epics/EPIC-00*.md` | Completed epic details | Reference |
| `_bmad/custom/config.toml` | BMAD sprint config | Reference |

## Critical Rules

### 1. Never modify these without extreme caution
- `scripts/kfms/khaotic-init.sh` — recursive amend risk
- `.git/hooks/post-commit` — disabling breaks KFMS
- `infra/meta/meta.json` — only modify via `khaotic-init.sh`
- `frontend/src/app.css` — `#view-*` ID specificity trap

### 2. Adding Commands (Most Common Task)
```rust
// 1. Define in src-tauri/src/commands/{domain}.rs
#[tauri::command]
async fn my_command(state: State<'_, AppState>, arg: String) -> Result<String, String> {
    // ...logic...
    Ok(result)
}

// 2. Register in src-tauri/src/commands/mod.rs dispatch table
"my_command" => Box::new(|state, payload| { ... }),

// 3. Frontend call
// const result = await invoke("my_command", { arg: "value" });
```

### 3. CSS Anti-Pattern
```css
/* NEVER DO THIS — kills tab switching */
#view-chat {
    display: flex; /* Specificity 100 beats .view-content.active (20) */
}

/* OK — specificity stays safe */
#view-chat {
    flex-direction: column;
    overflow: hidden;
}
```

### 4. PTY Session Lifecycle
```
pty_kill(id) → pty_spawn(id, cmd, args) → pty_output(id) → pty_exit(id)
```
Always `pty_kill` before `pty_spawn` with the same ID.

## Common Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| `unwrap()` in Tauri commands | Use `map_err(\|e\| e.to_string())?` |
| Hardcoding `"llm-term.toml"` | Use `get_config_path()` resolution |
| Loading large FTP files into memory | Stream to disk with `retr()` |
| Adding npm packages | Zero-dependency rule — use CDN/vendor |
| Mocking as final proof | Only for tiny isolation; real data required |
| Modifying main.js by partial string match | Match full element to avoid ambiguous edits |

## Tooling Commands

```bash
# Fast iteration
cargo check                          # Rust type-check
npm run frontend:build               # Vite build

# Quality gates
npm run quality:fallow:dead-code     # Must be 0
npm run quality:fallow:dupes         # Must be 0
npm run ci                           # Full KFMS gate

# Debugging
npm run dev                          # Full dev mode
# In DevTools: window.__neurobridge__ for bridge client
```

## Architecture Decision Log

| Decision | Why |
|----------|-----|
| Vanilla JS (no framework) | Predictable DOM, minimal bundle, zero npm bloat |
| axum bridge instead of Tauri IPC | Electron migration — HTTP/WS decouples frontend |
| Lua plugins over WASM | mlua is simpler, compiles to single binary |
| JSON vector DB over SQLite | Simpler, file-portable, fits current scale |
| Single `main.js` monolith | History — modular extraction ongoing |

## Extension Points

| Extension | How |
|-----------|-----|
| New LLM provider | Add provider struct in `providers.rs`, implement `LlmProvider` |
| New plugin command | Create `.lua` file in `plugins/`, use `registerCommand` |
| New view/tab | Add `#view-x` in HTML, route in main.js nav, add CSS (no `display:flex`) |
| New Canvas language | Register in `canvas.js` language map, add run handler |
| New PTY session type | Implement in `pty_manager.rs`, route via session ID prefix |

## When to Ask Human

- Version bumps (use KFMS scripts)
- Security policy changes
- CI/CD workflow modifications
- Database schema changes
- Breaking API changes
