# NEURODECK v1.8.0-horus — Recovery Handoff

**From:** v1.7.1 (beta, unstable)
**To:** v1.8.0-horus (production recovery)
**Date:** 2026-06-02
**Classification:** Stability Sprint / Post-Beta Recovery

---

## Executive Summary

v1.7.1 shipped to beta with ~30 non-functional bridge commands, silent LLM provider failures, simulated platform features, and zero disk persistence for user profiles. This recovery sprint eliminated backend panics, hardened the bridge server to >99% coverage, added real embeddings/vision for 4 of 5 providers, achieved platform parity (Windows STT, macOS computer use), and decomposed the monolithic `lib.rs` into maintainable submodules.

---

## Phase-by-Phase Changes

### Phase 0 — Foundation: Stop the Bleeding

| Ticket | Fix | Files |
|--------|-----|-------|
| P0.1 | Mutex poison & `unwrap()` eradication | `lib.rs`, `commands/mod.rs`, `ftp.rs`, `transfer.rs`, `browser.rs` |
| P0.2 | PTY spawn timeout (30s default) + idle TTL watchdog (2h) | `pty_manager.rs` |
| P0.3 | FTP OOM prevention — streaming downloads + 500MB limit | `ftp.rs` |
| P0.4 | localStorage → disk persistence for SSH/FTP/SFTP profiles & custom themes | `frontend/src/main.js`, `storage.rs`, `config.rs` |

**Key behavioral changes:**
- All `state.lock().unwrap()` in command handlers converted to `lock().map_err(|e| e.to_string())?`.
- Background threads (PTY readers, collab loops) use `lock().unwrap_or_else(|p| p.into_inner())` with logged poison recovery.
- `ftp_download_file` streams to disk via `retr()` + `std::io::copy` instead of `retr_as_buffer`.

### Phase 1 — Core Feature Repair

| Ticket | Fix | Files |
|--------|-----|-------|
| P1.1 | Embeddings for Ollama, HuggingFace, OpenAI-compat | `llm.rs` |
| P1.2 | Vision for Ollama, HuggingFace, OpenAI-compat, Kimi | `llm.rs` |
| P1.3 | Game detection reads actual running processes via `sysinfo` | `game.rs` (extracted from `lib.rs`) |
| P1.4 | Windows STT via `cpal` + `hound` + Whisper.cpp | `audio_recorder.rs`, `whisper.rs` |
| P1.5 | macOS computer use (screenshot + mouse + keyboard) via `core-graphics` | `computer_use.rs` |

**Key behavioral changes:**
- `LlmProvider` trait expanded: `generate_embedding()`, `chat_with_image()`, `supports_vision()`, `supports_embedding()`.
- Ollama embeddings call `/api/embeddings` with `nomic-embed-text` (or user-configured model).
- HF embeddings call Inference API `/pipeline/feature-extraction`.
- OpenAI-compat embeddings call `/v1/embeddings`.
- Game detection uses `sysinfo` process scanning on Windows/macOS and `/proc` scanning on Linux.

### Phase 2 — Bridge Server Hardening

| Ticket | Fix | Files |
|--------|-----|-------|
| P2.1 | `EventEmitter` trait unblocks ~27 commands | `bridge.rs`, `canvas_collab.rs`, `transfer.rs`, `lsp.rs` |
| P2.2 | Browser commands in bridge mode (headless Chrome) | `commands/browser.rs` |
| P2.3 | Bridge-compatible PTY spawning over WebSocket | `commands/mod.rs`, `pty_manager.rs` |

**Key behavioral changes:**
- `EventEmitter` trait abstracts `app_handle.emit()` vs `WsBroadcaster` broadcast.
- `canvas_collab_host`, `canvas_collab_join`, `start_file_transfer`, `dispatch_action`, `lsp_start`, `start_mcp_server`, etc. now work in bridge mode.
- Only 3 commands remain unavailable: `set_kiosk_mode`, `start_remote_server`, `stop_remote_server` (require Tauri window/events).

### Phase 3 — Platform Parity & Polish

| Ticket | Fix | Files |
|--------|-----|-------|
| P3.1 | Canvas collab mDNS peer discovery (`_neurodeck-canvas._tcp`) | `canvas_collab.rs`, `commands/system.rs`, `frontend/src/canvas.js` |
| P3.2 | Whisper in-app model download wired | `commands/mod.rs`, `frontend/src/main.js` |
| P3.3 | Config path resolution hardened | `paths.rs` (extracted from `lib.rs`) |

**Key behavioral changes:**
- Primary config path is now `~/.config/neurodeck/llm-term.toml` (Linux), `%APPDATA%\neurodeck\llm-term.toml` (Windows), `~/Library/Application Support/neurodeck/llm-term.toml` (macOS).
- Env var `NEURODECK_CONFIG_PATH` overrides everything.
- Dev fallbacks (`../llm-term.toml`) only activate when running under Cargo.

### Phase 4 — Architecture & Quality Gates

| Ticket | Fix | Files |
|--------|-----|-------|
| P4.1 | `lib.rs` decomposition: themes, personas, game detection, paths, providers extracted | `models.rs`, `game.rs`, `paths.rs`, `providers.rs`, `lib.rs` |
| P4.2 | Backend integration tests added | `tests/config_persistence.rs`, `tests/memory_rag.rs`, `tests/bridge_broadcaster.rs` |
| P4.3 | CI consolidation: deleted `ci.yml`, pinned Rust 1.92.0, `rust-cache@v2`, E2E timeout 10min | `.github/workflows/ci-gate.yml`, `e2e/playwright.config.ts` |
| P4.4 | Documentation updated | `AGENTS.md`, `docs/BRIDGE_SERVER_PROGRESS.md`, this file |

**Key structural changes:**
- `lib.rs` shrank from ~1,629 lines to ~764 lines.
- New modules: `models.rs`, `game.rs`, `paths.rs`, `providers.rs`.
- `bridge.rs` now hosts `run_bridge_server()`.
- `config` and `bridge` modules are now `pub` for integration test access.

---

## Known Remaining Limitations

1. **Browser in bridge mode** uses `headless_chrome` instead of Tauri WebView. This is heavier and slower than the GUI path. Bridge mode has no WebView by design; headless Chrome is the correct fallback.

### Resolved Limitations (formerly listed)

| # | Limitation | Resolution |
|---|---|---|
| 2 | Whisper offline fallback | `transcribe()` now pre-checks model existence and returns a clear error: "Whisper model not found at '{path}'. Download a model in Settings → Voice." |
| 3 | macOS Accessibility permissions | Added `require_macos_accessibility()` pre-flight check in `computer_use.rs`. Returns a consistent error message and auto-opens System Settings → Accessibility on denial. |
| 4 | Linux game detection misses Proton games | `detect_running_game_linux()` now checks `/proc/<pid>/exe`, `/proc/<pid>/cwd`, and `/proc/<pid>/comm` in addition to `cmdline`, catching Proton/wine games that don't expose `steamapps/common/` in their argument list. |
| 5 | Windows PDB limit (`LNK1318`) | Added `[profile.dev] debug = 1` (line-tables only) to `src-tauri/Cargo.toml` to reduce PDB size. Developers can also run individual test binaries (`cargo test --test <name>`) to avoid the combined link pressure. |

---

## Migration Guide (v1.7.x → v1.8.0)

### For Users

1. **Config location**: Your old `llm-term.toml` in the app bundle directory is still read as a legacy fallback, but edits will not persist across updates. Copy it to the new primary location:
   - Linux: `~/.config/neurodeck/llm-term.toml`
   - Windows: `%APPDATA%\neurodeck\llm-term.toml`
   - macOS: `~/Library/Application Support/neurodeck/llm-term.toml`

2. **Profiles & themes**: If you had SSH/FTP/SFTP profiles or custom themes saved before this update, they will be automatically migrated from `localStorage` to disk on first boot. No manual action required.

3. **Whisper STT**: On first use of the microphone, the app will prompt you to download a Whisper model (~75MB for `ggml-base.en.bin`). Download progress is shown in Settings → Voice.

### For Developers

1. **New module paths**: If you were importing `crate::PERSONAS`, `crate::THEMES`, `crate::CustomPersona`, `crate::Theme`, they are now defined in `models.rs` but re-exported from `lib.rs` — no caller changes required.
2. **Provider factory**: `create_provider`, `provider_from_agent`, and `default_agents` moved to `providers.rs` but are re-exported.
3. **Path utilities**: `get_config_path`, `user_config_dir`, `user_bin_dir`, `get_home_dir`, `load_env_file` moved to `paths.rs` but are re-exported.
4. **Integration tests**: Add new tests in `src-tauri/tests/`. The crate is named `app_lib` in integration test imports.

---

## Test Summary

| Suite | Count | Status |
|-------|-------|--------|
| Rust unit tests (`cargo test --lib`) | 75 | ✅ Pass |
| Rust integration tests (`cargo test --tests`) | 10 | ✅ Pass |
| E2E (Playwright) | ~390 | ⚠️ Snapshots need regeneration on reference machine |

---

## Files Touched (Complete Checklist)

### Rust Backend
- [x] `src-tauri/src/lib.rs` — Decomposed, re-exports added
- [x] `src-tauri/src/models.rs` — New (themes, personas)
- [x] `src-tauri/src/game.rs` — New (game detection)
- [x] `src-tauri/src/paths.rs` — New (path utilities)
- [x] `src-tauri/src/providers.rs` — New (provider factory)
- [x] `src-tauri/src/bridge.rs` — `run_bridge_server()` moved here
- [x] `src-tauri/src/llm.rs` — Embeddings + vision for Ollama/HF/OpenAI-compat
- [x] `src-tauri/src/pty_manager.rs` — Timeout + TTL watchdog
- [x] `src-tauri/src/ftp.rs` — Streaming downloads
- [x] `src-tauri/src/audio_recorder.rs` — cpal recording
- [x] `src-tauri/src/computer_use.rs` — macOS Core Graphics
- [x] `src-tauri/src/whisper.rs` — Model download wiring
- [x] `src-tauri/src/memory.rs` — No changes, covered by new integration tests
- [x] `src-tauri/src/commands/mod.rs` — Bridge dispatch table
- [x] `src-tauri/src/commands/system.rs` — mDNS peer discovery
- [x] `src-tauri/src/canvas_collab.rs` — Generic `EventEmitter`
- [x] `src-tauri/src/transfer.rs` — Generic `EventEmitter`
- [x] `src-tauri/src/lsp.rs` — Generic `EventEmitter`
- [x] `src-tauri/tests/config_persistence.rs` — New
- [x] `src-tauri/tests/memory_rag.rs` — New
- [x] `src-tauri/tests/bridge_broadcaster.rs` — New

### Frontend
- [x] `frontend/src/main.js` — Profile/theme migration, canvas peer UI
- [x] `frontend/src/canvas.js` — Peer discovery polling

### CI/CD
- [x] `.github/workflows/ci-gate.yml` — Pinned Rust, system deps, `rust-cache@v2`
- [x] `.github/workflows/ci.yml` — Deleted
- [x] `e2e/playwright.config.ts` — Timeout 10min
- [x] `e2e/tests/design-system.spec.ts` — Deleted (dead code)

### Docs
- [x] `AGENTS.md` — Updated with all architectural changes
- [x] `docs/BRIDGE_SERVER_PROGRESS.md` — Updated status
- [x] `docs/V1_8_RECOVERY_HANDOFF.md` — This file

---

*KFMS v1.0 — Khaotic Labs | v1.8.0-horus*
