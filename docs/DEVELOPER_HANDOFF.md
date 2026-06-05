# Developer Handoff

## Getting Started (5 Minutes)

```bash
# 1. Clone
git clone https://github.com/khaoticdev62/NEURODECK.git
cd NEURODECK

# 2. Install
npm run setup

# 3. Set API key
export GEMINI_API_KEY="your-key"  # Linux/macOS
# $env:GEMINI_API_KEY="your-key"   # PowerShell

# 4. Verify
cargo check
npm run frontend:build

# 5. Run
npm run dev
```

## Project Layout

```
NEURODECK/
├── electron/           # Electron main + preload
├── frontend/           # Vite SPA (vanilla JS)
│   ├── src/            # Feature modules
│   └── dist/           # Build output
├── src-tauri/          # Rust workspace
│   ├── src/            # Backend commands + domain
│   └── Cargo.toml
├── infrastructure/     # Platform services crate
├── plugins/            # Lua plugins (auto-loaded)
├── docs/               # Documentation
├── scripts/            # Build + KFMS scripts
├── infra/meta/         # KFMS metadata
└── assets/             # Icons, themes, branding
```

## Key Commands

| Command | What it does | Time |
|---------|-------------|------|
| `npm run dev` | Full dev mode (Electron + Rust hot-reload) | ~3 min first |
| `npm run build` | Production build (NSIS/ZIP/AppImage) | ~5 min |
| `cargo check` | Fast Rust type-check | ~2 s |
| `cargo test --lib` | Rust unit tests | ~3 s |
| `npm run frontend:build` | Vite production build | ~1 s |
| `npm run ci` | Full KFMS CI gate | ~2 min |

## Adding a New Feature

1. **Backend command**:
   - Add `#[tauri::command]` in `src-tauri/src/commands/{domain}.rs`
   - Register in `src-tauri/src/commands/mod.rs` dispatch table
   - Add to `src-tauri/src/lib.rs` `generate_handler![]` (for Tauri mode)

2. **Bridge command** (Electron mode):
   - Same as above — bridge auto-discovers via dispatch table

3. **Frontend call**:
   - Use `invoke("command_name", { args })` via neurobridge.js
   - Listen for events with `listen("event_name", handler)`

4. **CSS**:
   - Never add `display: flex` to `#view-*` ID rules (specificity trap)
   - Run `npm run frontend:build` after CSS edits

5. **Tests**:
   - Rust: add `#[cfg(test)]` module in same file
   - Frontend: add `.test.js` alongside source

## Debugging

| Problem | Where to look |
|---------|--------------|
| Backend crash | Terminal console (Rust panics) |
| Frontend errors | DevTools Console (Ctrl+Shift+I) |
| Bridge not responding | `localhost:9477` health check |
| Lua plugin errors | Terminal console for `[Lua Error]` |
| KFMS issues | `./scripts/kfms/khaotic-init.sh status` |

## Release Process

1. Bump version in `package.json` and `Cargo.toml`
2. Run `./scripts/kfms/khaotic-init.sh stamp`
3. Run `npm run build`
4. Verify KFMS: `./scripts/kfms/khaotic-init.sh validate`
5. Push to origin
6. Tag release: `git tag v{version}-ptah`

## Contacts

- Maintainer: khaoticdev62@gmail.com
- Issues: https://github.com/khaoticdev62/NEURODECK/issues
