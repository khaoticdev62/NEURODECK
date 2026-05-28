# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For detailed release notes, see [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md).

---

## [Unreleased]

---

## [1.3.0-Isis] — 2026-05-27

### Added
- **Universal Design/UI System Starter Kit**: Extracted and exported a standalone design/UI system starter template directly to `design-system/`. Includes `index.html`, `style.css`, `app.js`, `README.md`, and PDF spec sheet. Designed to be completely universal and CORS-friendly (removes ES module import requirements for `file://` protocol).
- **Secure User-Space CLI Path**: Automated directory verification and creation of `~/.config/neurodeck/bin` on startup (`self_heal.rs`). Integrated the custom path into interactive shell environments, one-off execution, and streaming runtimes (`pty_manager.rs`, `system.rs`).
- **Command Palette Expansion**: Registered "Open Knowledge Graph", "Open Scheduler", "Open Workflow Builder", and "Open IDE" to `COMMAND_PALETTE_ACTIONS` (`main.js`) to close navigation gaps.
- **Diagnostics & Self-Healing**: Enhanced boot diagnostics check and output path resolution options.
- **Premium Notification Overlay UI (Screen 6)**: High-fidelity AAAA-grade CSS overrides for the Notifications modal — glassmorphic card shell with `backdrop-filter: blur(16px)`, per-type left-border accent (cyan / green / amber / red) with matching glow shadows, hover lift animation, gradient text headers, and a kicker label above the title. Covers `.notif-modal-card`, `.notif-item`, `.notif-item-header`, and all severity variants.

### Fixed
- **FTP/SFTP Streaming & Progress**: Replaced memory buffers (`retr_as_buffer`) with disk streaming and implemented `ProgressReader` in Tauri uploads emitting updates every 64KB.
- **Canvas Run UX**: Fully wired Canvas run buttons to subprocess execution runtimes for Python, Bash, Node, and Lua.
- **PTY Session Guard**: Implemented robust timeout hooks for PTY thread spawns.

### Repository Hygiene
- Added missing `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `.env.example`, `.editorconfig`
- Synchronized version strings across all manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, `tauri.conf.json`)
- Fixed Rust edition mismatch in workspace crates (`core`, `bootstrapper`)
- Added tooling configs: `.prettierrc.json`, `rustfmt.toml`, `deny.toml`
- Fixed CI soft-fail gates (Prettier, Ruff)
- Archived unused frontend code (`VirtualChat.tsx`, `OAuthLogin.tsx`, `store.ts`, `bindings/`)
- Added frontend unit-test scaffolding (Vitest)
- Updated `CONTRIBUTING.md` with accurate line counts and removed stale mock-IPC references

---

## [1.2.2-Ra] — 2026-05-26

### Security
- MCP authentication with constant-time Bearer token comparison
- Canvas Collaboration binds to `127.0.0.1` only
- Sync KDF upgraded to PBKDF2-HMAC-SHA256 with 100k iterations
- Removed `exec_auth_token` execution capability token
- CSP localhost wildcards restricted to specific ports
- `get_status` MCP tool no longer exposes API key presence

See `docs/RELEASE_NOTES.md` for full details.

---

## [1.2.1-Ra] — 2026-05-24

### Fixed
- Model switcher modal functions exposed on `window` for inline onclick handlers

---

## [1.2.0-Ra] — 2026-05-22

### Added
- Initial Ra codename release
- Full Tauri v2 desktop app with 12 tabs
- LLM chat, Canvas, Terminal, SSH, Browser, Agent, Memory, Share, Remote, PromptLab, Docs, Git

