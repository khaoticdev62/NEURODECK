# NEURODECK — Agent Guide

> AI coding agent context for the NEURODECK project. Read this first before making any changes.

---

## Project Overview

NEURODECK is an AI-powered terminal OS designed for Steam Deck (and general Linux/Windows). It wraps LLM chat, a live code canvas, multi-session PTY shell, SSH client, embedded browser, autonomous agent loop, LAN file transfer, voice STT/TTS, and a Lua plugin runtime into a single 1280×800 fullscreen window with gamepad-native navigation.

- **Version**: 1.2.1 (Codename: Ra)
- **Repository**: https://github.com/khaoticdev62/NEURODECK
- **License**: MIT
- **Primary Language**: English (all docs, comments, and commit messages)

### Architecture at a Glance

```
┌─────────────────────────────────────────────┐
│  Frontend (Vanilla JS + Vite + React islands)│  <- runs in WebView
│  • Single-page app, 12 view tabs            │
│  • Gamepad nav, command palette, settings   │
├─────────────────────────────────────────────┤
│  Tauri v2 (Rust)                            │  <- desktop bridge
│  • 56+ commands across 28 modules           │
│  • Plugin runtime (Lua 5.4 / mlua)          │
│  • PTY, SSH, FTP/SFTP, HTTP/WebSocket srv   │
├─────────────────────────────────────────────┤
│  Core / Infrastructure (Rust workspaces)    │
│  • Shared types, IPC bindings, gRPC, OAuth  │
│  • Secrets via keyring, Warpinator protocol │
└─────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Tech |
|-------|------|
| Desktop Framework | Tauri v2 (Rust 1.77.2+) |
| Frontend UI | Vanilla JavaScript (selective React 19 for chat virtualization) |
| Frontend State | Mutable global plain object (`state.js`); Zustand used only for chat messages |
| Terminal Emulation | xterm.js |
| Markdown Rendering | marked (in web worker) |
| AI Providers | Google Gemini (SSE streaming), Ollama (local) |
| Plugin Runtime | Lua 5.4 via `mlua` (vendored, send feature) |
| PTY / Shell | `portable-pty` |
| Networking | `reqwest`, `axum` (WS), `tokio`, `tonic` (gRPC) |
| mDNS Discovery | `mdns-sd` |
| Secrets | `keyring` |
| Headless Browser | `headless_chrome` |
| BitTorrent | `fx-torrent` |
| Crypto | `ring`, `base64` |

### Python Tooling (Asset Pipeline)

- **Manager**: `uv`
- **Packages**: `pillow` (brand asset generation)
- **Linter**: `ruff` (line-length 100, target py38)
- **Entry**: `nd-assets` CLI for generating icons/boot splash

---

## Project Structure

```
C:\Users\thecr\Desktop\S-Term  (project root)
├── Cargo.toml                  # Workspace manifest
├── package.json                # Root npm scripts & Tauri CLI
├── pyproject.toml              # Python tooling (uv/ruff)
│
├── src-tauri/                  # Main Tauri application
│   ├── Cargo.toml              # App crate deps
│   ├── tauri.conf.json         # Window, CSP, bundle, resources config
│   ├── capabilities/           # Tauri v2 permission descriptors
│   ├── src/
│   │   ├── main.rs             # Entrypoint (calls app_lib::run)
│   │   ├── lib.rs              # App bootstrap, themes, personas, handler reg
│   │   ├── commands/           # Tauri command modules (agent, browser, config, session, system)
│   │   ├── llm.rs              # LLM provider trait + Gemini/Ollama impls
│   │   ├── memory.rs           # Vector memory DB for RAG
│   │   ├── pty_manager.rs      # Multi-session PTY shell
│   │   ├── plugin_mgr.rs       # Lua plugin loader + marketplace
│   │   ├── computer_use.rs     # Autonomous agent loop (up to 5 steps)
│   │   ├── canvas_collab.rs    # LAN multi-peer canvas collaboration
│   │   ├── remote_control.rs   # iPhone remote via QR + WebSocket
│   │   ├── transfer.rs         # LAN P2P file transfer (mDNS + custom protocol)
│   │   ├── tunnel.rs           # SteamOS SSH tunnel helper
│   │   ├── ftp.rs / sftp.rs    # FTP/SFTP file browsers
│   │   ├── mcp.rs              # MCP HTTP server (localhost:13337)
│   │   ├── whisper.rs          # Whisper.cpp STT integration
│   │   ├── sync.rs             # Cross-device data sync
│   │   ├── doc_indexer.rs      # Local document RAG indexing
│   │   ├── autocomplete.rs     # Terminal LLM ghost-text autocomplete
│   │   ├── self_heal.rs        # Self-healing diagnostics
│   │   ├── torrent.rs          # BitTorrent support
│   │   ├── config.rs           # Typed config structs
│   │   ├── storage.rs          # Local JSON persistence
│   │   └── lua.rs              # Lua runtime bindings
│   └── icons/                  # App icons for bundling
│
├── core/                       # Shared Rust library
│   └── src/
│       ├── lib.rs              # Re-exports
│       └── ipc.rs              # Core IPC types + ts-rs bindings
│
├── infrastructure/             # Infra Rust library
│   ├── build.rs                # Protobuf code generation
│   └── src/
│       ├── lib.rs              # Re-exports
│       ├── secrets.rs          # Keyring-backed secret storage
│       ├── oauth.rs            # Google OAuth2 device flow
│       └── warpinator.rs       # Warpinator gRPC protocol
│
├── bootstrapper/               # Minimal crate (reserved for future boot logic)
│   └── src/
│       └── main.rs / Cargo.toml
│
├── frontend/                   # Vite-bundled SPA (vanilla JS + selective React)
│   ├── package.json            # Frontend-only deps
│   ├── tsconfig.json           # ES2021, React JSX, strict
│   ├── vite.config.ts          # Port 1420, esbuild minify in release
│   └── src/
│       ├── VirtualChat.tsx     # Main chat view (virtualized list)
│       ├── store.ts            # Zustand global state
│       ├── markdownWorker.ts   # Off-thread markdown parse
│       ├── app.css / style.css # Global styles
│       ├── components/         # React components (e.g., OAuthLogin)
│       └── bindings/           # ts-rs generated TypeScript types
│
├── e2e/                        # Playwright end-to-end tests
│   ├── playwright.config.ts    # Static server on 127.0.0.1:4173
│   ├── support/static-server.cjs  # Simple Node HTTP server for dist/
│   └── tests/
│       └── settings-shell.spec.ts  # UI shell & nav tests
│
├── plugins/                    # Preinstalled Lua plugins
│   ├── bmad.lua                # BMAD persona shortcuts (/john, /sally, …)
│   ├── promptgen.lua           # Prompt engineering formulas
│   ├── ip_lookup.lua           # IP geolocation command
│   └── auto_responder.lua      # Auto-reply hook demo
│
├── docs/                       # Project documentation
│   ├── USER_GUIDE.md
│   ├── PLUGIN_DEV_GUIDE.md
│   ├── NEURODECK_PRODUCT_SPEC.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── ANTIGRAVITY_HANDOFF.md  # Current sprint state & blocking fixes
│   ├── RELEASE_NOTES.md
│   └── screenshots/
│
├── infra/meta/                 # KFMS metadata
│   └── meta.json               # Version, codename, build stamp, release policy
│
├── assets/                     # Brand assets & bundled resources
├── themes/                     # User/custom theme storage
├── data/memory/                # Vector DB & conversation storage
├── flatpak/                    # Flatpak manifest for SteamOS
├── build/                      # Build artifacts
└── scripts/                    # Dev utilities (autokill, CSS tools, setup)
```

---

## Build & Development Commands

### Prerequisites

- **Node.js** >= 18, **npm** >= 9
- **Rust** >= 1.77.2 (stable toolchain)
- **uv** (for Python tooling)
- **protoc** (for gRPC code generation in `infrastructure/`)

### Install Dependencies

```bash
npm install          # Root + frontend workspace deps
uv sync              # Python tooling (optional, for asset generation)
```

### Development Loop

```bash
npm run dev          # Autokill stale listeners + tauri dev
npm run build        # Production Tauri build (frontend + Rust)
```

### Frontend-Only

```bash
npm run frontend:dev       # Vite dev server on :1420
npm run frontend:build     # Production frontend bundle -> frontend/dist
npm run frontend:typecheck # tsc --noEmit (both projects)
```

### Rust-Only

```bash
cargo check          # Fast type check
cargo clippy         # Lint
cargo build          # Debug build
cargo test           # Run unit tests (see test coverage below)
```

### Asset Generation

```bash
npm run assets       # Python script: generates icons, splash, boot art
# Or directly:
uv run nd-assets
```

### End-to-End Tests

```bash
cd e2e && npm test   # Builds frontend + runs Playwright against static server
```

The e2e suite mocks Tauri's `__TAURI_INTERNALS__.invoke` so tests run in a pure browser environment without a running Rust backend. This tests UI shell navigation, settings tabs, command palette, viewport sizing, and CSS hierarchy.

### Release / Deployment

- **GitHub Actions** (`.github/workflows/ci.yml`): triggered on `v*` tags. Builds for:
  - Windows → NSIS, MSI
  - Ubuntu → AppImage, Deb
  - macOS → DMG, App
- **Flatpak**: run `build_flatpak.sh` on SteamOS/Linux for `.flatpak` bundle.
- **Release notes**: auto-extracted from `docs/RELEASE_NOTES.md` first `## v…` block.

---

## Code Style & Conventions

### Rust

- Edition 2021 (src-tauri/infrastructure), 2024 (core, bootstrapper).
- Use `anyhow` for error propagation in commands; return `Result<T, String>` to frontend.
- Tauri commands are `async fn` and registered in `lib.rs` inside `generate_handler![]`.
- All new commands **must** be added to `generate_handler![]` in `lib.rs`.
- Prefer `tracing` over `log` for structured diagnostics.
- Unit tests live inline behind `#[cfg(test)]` in the same file.

### TypeScript / Frontend

- Strict mode enabled. `allowJs: true`, `checkJs: false`.
- Vanilla JavaScript with imperative DOM manipulation for most views.
- React used selectively: `VirtualChat.tsx` (chat virtualization) only.
- State management: mutable global plain object (`state.js`); Zustand (`store.ts`) used only for chat message list.
- DOM sanitization is mandatory for any HTML injected into chat (`sanitizeRenderedHtml` in `VirtualChat.tsx`).
- CSS: **never** add `display: flex` or `display: block` to `#view-*` ID rules. Views are shown/hidden via class toggles (`active`) on parent containers.
- Icons use `.nd-icon-svg` class hierarchy.

### Lua Plugins

- Single `.lua` file per plugin, placed in `plugins/`.
- Globals injected by runtime: `print`, `execute`, `registerCommand`, `registerHook`, `setPersona`.
- Commands must start with `/`. Hooks: `before_send`, `after_response`.
- Keep `execute()` calls under ~5 seconds (blocking subprocess).
- See `docs/PLUGIN_DEV_GUIDE.md` for full API reference.

### Commit Messages

Follow conventional style:
- `feat(ui): …`
- `fix(security): …`
- `chore(kfms): …`
Recent examples: `feat(ui): refine canvas toolbar actions`, `fix(security): harden plugin renderers`.

---

## Testing Strategy

### Rust Unit Tests

Located inline (`#[cfg(test)]`) in the following modules:
- `computer_use.rs`
- `config.rs`
- `llm.rs`
- `mcp.rs`
- `memory.rs`
- `plugin_mgr.rs`
- `self_heal.rs`
- `storage.rs`
- `sync.rs`

Run with `cargo test`.

### Playwright E2E

- **Target**: Static-built frontend (`frontend/dist`) served on `127.0.0.1:4173`.
- **Mocking**: Full Tauri backend is mocked via `page.addInitScript` injecting `window.__TAURI_INTERNALS__` and `window.__TAURI__`.
- **Coverage**: Settings shell, themed tab switching, command palette, all 12 primary nav tabs, viewport overflow on compact widths, centered layout on wide screens, canvas toolbar wrapping, notification center, prompt picker/history chrome.

### Manual Smoke Test

Before any release tag, run `npm run tauri dev` and verify:
1. Boot sequence completes without JS errors.
2. Chat sends/receives streaming responses.
3. Terminal spawns a PTY and accepts input.
4. Canvas runs code and shows preview.
5. Settings modal opens and persists changes across reload.

---

## Security Considerations

- **CSP** is strictly defined in `tauri.conf.json`. `script-src` is `'self'` only. `style-src` allows `'unsafe-inline'` and Google Fonts.
- **Capabilities**: Tauri v2 permission model via `src-tauri/capabilities/default.json` (currently `core:default`).
- **Secrets**: API keys and OAuth tokens stored via OS keyring (`keyring` crate), never in plain text files.
- **Plugin Sandbox**: Lua plugins run in a restricted `mlua` runtime. They can execute shell commands (via `execute`) but have no filesystem write access outside the sandbox.
- **Sanitization**: All user-generated HTML (chat messages, plugin output, markdown) is sanitized before DOM insertion. Disallowed tags (`script`, `iframe`, `object`, etc.) and dangerous attributes are stripped.
- **Recent Hardening**: A series of commits (latest on `main`) hardened CSP, added MCP bearer auth, fixed record path traversal, resolved OAuth race conditions, and sanitized dynamic renderer surfaces (plugin marketplace, chat replay, notification center, canvas editor).
- **No Secrets in Build**: The KFMS governance policy (`infra/meta/meta.json`) explicitly forbids embedding secrets in release artifacts.

---

## Configuration & Data Files

| File | Purpose |
|------|---------|
| `src-tauri/llm-term.toml` | Bundled default config (TOML) |
| `data/personas.json` | User-created custom personas |
| `data/game_notes/<app_id>.md` | Per-game session notes |
| `~/.config/neurodeck/env` | Persisted API key (platform-specific config dir) |
| `frontend/dist/` | Vite build output (served by Tauri in release) |
| `themes/` | Custom theme JSON files |

---

## Key Architectural Decisions

1. **Vanilla JS frontend with selective React**: The app bootstraps via vanilla JavaScript (`main.js`, ~8,800 lines). React is used selectively for the chat virtualization layer (`VirtualChat.tsx`) only. All other UI views, state, and DOM manipulation are imperative vanilla JS. `OAuthLogin.tsx` is dead code — OAuth UI is built via `innerHTML` in `main.js`. Treat the current code as source-of-truth.
2. **Single-Window Tauri App**: One main window (1280×800) plus a splash screen. No multi-window support.
3. **Streaming LLM via SSE**: Gemini uses Server-Sent Events; Ollama uses its streaming JSON API. Both implement the `LlmProvider` trait.
4. **Plugin Runtime in Same Process**: Lua runs inside the Tauri process (not sandboxed to a separate OS process). Malicious plugins could execute arbitrary shell commands—this is by design for power-user extensibility, but the marketplace registry is trusted.
5. **No Database Server**: Vector memory and chat history are persisted as local JSON / flat files. No SQLite or external DB.

---

## How to Add a New Tauri Command

1. Create the command function in the appropriate `src-tauri/src/commands/*.rs` file (or a new module).
2. Export it in `src-tauri/src/commands/mod.rs`.
3. Register it in `src-tauri/src/lib.rs` inside `generate_handler![…]`.
4. Add a TypeScript wrapper in `frontend/src/store.ts` or the relevant component.
5. Run `cargo check` and `npm run frontend:build`.
6. Write a Playwright test in `e2e/tests/` if the command drives UI state.
7. Update `docs/USER_GUIDE.md` or `docs/PLUGIN_DEV_GUIDE.md` if user-facing.

---

## Release Checklist (KFMS)

The project follows **Khaotic Feature Management System (KFMS)** governance:

- Version and codename tracked in `infra/meta/meta.json`.
- Codenames are unique per major version line (validated by CI).
- Tag format: `v{semver}-{codename_lower}` (e.g., `v1.2.1-ra`).
- Before tagging, ensure:
  1. `cargo check` passes.
  2. `cargo test` passes (or skipped coverage is documented).
  3. Frontend build succeeds.
  4. `git diff --check` clean.
  5. CSS does not violate `#view-*` display rule.
  6. KFMS post-commit hook stamps `infra/meta/meta.json`.
  7. Manual `npm run tauri dev` smoke test completed.

---

## Useful References

- `docs/ANTIGRAVITY_HANDOFF.md` — Current sprint state, shipped features, and blocking fixes.
- `docs/IMPLEMENTATION_PLAN.md` — Sprint roadmap and integration ledger.
- `docs/PLUGIN_DEV_GUIDE.md` — Full Lua plugin API.
- `docs/USER_GUIDE.md` — End-user documentation.
- `docs/RELEASE_NOTES.md` — Changelog consumed by CI.
- `src-tauri/tauri.conf.json` — Window, CSP, and bundle configuration.
- `infra/meta/meta.json` — KFMS version/codename/build metadata.
