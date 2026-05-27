# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For detailed release notes, see [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md).

---

## [Unreleased]

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

