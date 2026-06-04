# NEURODECK — Full-Scope Development Plan

## Project Context
- **Application name**: NEURODECK
- **Application purpose**: AI-native terminal OS for Steam Deck — Electron + Rust sidecar + Gemini
- **Target users**: Steam Deck users, developers, power users, and gamers seeking AI-terminal gamepad-native integration
- **Primary platforms**: Steam Deck (SteamOS), Windows, Linux
- **Application type**: DESKTOP_APP
- **Primary language**: JavaScript (ES2022+) / Rust (1.92.0)
- **Framework/runtime**: Electron 36 / Axum bridge server (localhost:9477)
- **Package manager**: npm (workspaces: frontend, electron) / Cargo
- **Database/storage**: Cosine-similarity vector DB (persists to `data/memory/chat_history.json`)
- **Authentication**: Google OAuth2 Device Flow (keyring keychain helper integration)
- **Deployment target**: Steam Deck / SteamOS Desktop mode, local desktop installer
- **Known constraints**: Zero-Tauri (fully migrated to Electron), Fallow duplicate count must remain at 0, no raw tauri invocations, must fit within 1280x800 window
- **Business goals**: Deliver a premium, gamepad-native AI terminal console environment with interactive canvas and local system/game integration
- **Technical goals**: 100% clean static analysis, zero code duplicates, robust IPC bridge security, and structured modular tab controls
- **Non-negotiables**: Zero-Tauri, Fallow 0 duplication clone groups, premium dark/glassmorphic styling, no raw localStorage credentials

---

## Verified Stack

| Area | Value | Evidence |
|---|---|---|
| Language | JavaScript (ES2022+) & Rust (1.92.0) | `package.json`, `Cargo.toml` |
| Runtime | Node.js v22 & Rust Executor (Tokio) | `.github/workflows/steam-deck-validation.yml` |
| Framework | Electron 36.0.0 & Axum (Rust Sidecar) | `electron/package.json`, `src-tauri/Cargo.toml` |
| Package Manager | npm (Workspaces: frontend, electron) & Cargo | `package.json`, `Cargo.toml` |
| Build Tool | `electron-builder` & Cargo Compiler | `electron-builder.yml`, `package.json` |
| Test Framework | Vitest 4.x & Playwright & Cargo test | `frontend/package.json`, `e2e/playwright.config.ts` |
| Database/Storage | Vector JSON DB (RAG) & Disk File Profiles | `src-tauri/src/memory.rs`, `src-tauri/src/paths.rs` |
| Auth | Google OAuth2 Device Flow & Keychain Creds | `infrastructure/src/oauth.rs`, `secrets.rs` |
| CI/CD | GitHub Actions | `.github/workflows/steam-deck-validation.yml` |
| Deployment | Local NSIS Installer, Linux AppImage, deb | `electron-builder.yml` |

---

## Product Scope

### In Scope
- Gamepad-native radial menu navigation (12 views: Chat, Canvas, Terminal, SSH, Tunnel, Browser, Agent, Memory, Share, Remote, PromptLab, Docs).
- Headless Chrome browser sessions run directly from the Rust sidecar in bridge mode.
- Local voice STT via `cpal` + Whisper.cpp model downloads.
- RAG context injection using local vector DB embeddings (Ollama, HF, OpenAI-compat, Gemini).
- LAN P2P file transfers and Warpinator gRPC local file sharing service.
- Visual canvas workflow builder and live scripting canvas.
- Multi-session PTY manager over WebSocket and remote SSH/FTP/SFTP tab integrations.

### Out of Scope
- Direct local LLM inference running on the Steam Deck CPU/GPU itself (runs via Ollama api server or cloud Gemini/HF API instead).
- Full custom Linux distribution (packaged as a desktop application running on SteamOS Desktop Mode / Game Mode).
- Direct Tauri command binding support (fully migrated to Axum localhost HTTP/WS bridge).

### Assumptions
- A local Ollama server is installed if the user requests fully local, offline RAG/inference.
- Steam Input is configured to translate gamepad inputs to key combos when running in Steam Game Mode.
- Electron is supported by the target operating systems (Linux/Windows/macOS).

### Constraints
- All interfaces must fit within a fixed 1280x800 resolution with scrollable sub-panels.
- Rust sidecar compilation uses `mlua` with the `vendored` feature (requires compiling Lua 5.4 from source).
- First-time compiles take 2-3 minutes due to Lua vendor compilation.

### Success Metrics
- **0 code duplicates** detected by Fallow.
- **0 dead-code or unresolved import warnings** in ES modules.
- **>95% unit test pass rate** on the frontend Vitest suite.
- **Fast PTY shell startup** (<200ms connection delay).

---

## Architecture Plan

### System Overview
```
                     +──────────────────────────────────────────+
                     |            Electron Container            |
                     |  +────────────────────────────────────+  |
                     |  |           Vite Frontend            |  |
                     |  |  [main.js] [chat.js] [terminal.js] |  |
                     |  +────────────────────────────────────+  |
                     +───▲─────────▲────────────────────────────+
                         │         │
                         │ HTTP    │ WebSocket
                         │ POST    │ WS_URL
                         ▼         ▼
                     +──────────────────────────────────────────+
                     |         Axum Bridge Server (Rust)        |
                     |           (localhost:9477)               |
                     |  +───────────────────+────────────────+  |
                     |  |   [bridge.rs]     | [pty_manager]  |  |
                     |  |   [llm.rs] (RAG)  | [game.rs]      |  |
                     |  +───────────────────+────────────────+  |
                     +──────────────────────────────────────────+
```

### Frontend Architecture
- **Single Page Monolith**: `frontend/src/main.js` manages view switching using CSS `.view-content.active` class hooks (maintaining `display: none` override boundaries).
- **Bridge Client**: `frontend/src/neurobridge.js` exports `invoke()`, `listen()`, and `emit()`. All legacy Tauri calls map directly here.
- **Xterm Instance**: Unified fit add-on configurations for PTY shells and SSH clients.

### Backend Architecture
- **Supervisor Loop**: Electron main process spawns the Rust sidecar compiler binary and restarts it on exit.
- **Axum Web Server**: Exposes API endpoints for post requests and a `/ws` WebSocket route for real-time events.
- **PTY Session Manager**: Session-safe `PtyState` wrapping a portable-pty instance with TTL cleanup watchdogs.

### Data Layer
- **Vector DB**: Cosine similarity JSON DB stored locally. Regenerates embeddings and queries matches during `send_command` operations.
- **Profiles**: Persisted on disk under target platform configs (`%APPDATA%` or `~/.config/neurodeck`).

---

## Epic Roadmap

| Epic ID | Epic Name | Goal | Priority | Release Phase |
|---|---|---|---|---|
| EPIC-001 | Onboarding & Diagnostics | Guide first-time users and run environment diagnostic scripts | High | v1.0.0 |
| EPIC-002 | Repo Restructuring | Consolidate directories and clean up duplicate structures | High | v1.1.0 |
| EPIC-003 | Tauri-to-Electron Migration | Fully transition from Tauri container to Electron 36 shell | Critical | v1.8.0 |
| EPIC-004 | Fallow Quality Hygiene | Deduplicate codebase and ensure clean dependency hygiene | High | v1.8.0 |

---

## Epics and User Stories

### EPIC-003: Tauri-to-Electron Migration

#### Goal
Replace the Tauri framework wrapper with an Electron container and build a local HTTP/WebSocket sidecar server.

#### User Stories
- **US-3.1**: As a developer, I want to routing IPC commands through fetch POST and WebSocket streams, so that I can eliminate Tauri library dependencies.
- **US-3.2**: As a package maintainer, I want to use `electron-builder` configuration, so that I can compile AppImages and executables for Windows and Linux.

#### Technical Tasks
- Implement Axum HTTP endpoint router in `src-tauri/src/bridge.rs`.
- Write `electron/main.js` sidecar supervisor logic.
- Replace Tauri bindings in 19 JavaScript modules with `neurobridge.js` fetch loops.

#### Test Requirements
- Playwright E2E tests validating tab switching and setting edits work without Tauri APIs.

#### Fallow Quality Gates
- `unlisted-dependencies` checks must run clean.
- `unused-files` checks must exclude electron preload scripts.

---

### EPIC-004: Fallow Quality Hygiene

#### Goal
Achieve zero code duplicates and clean dependency boundaries across the JS modules.

#### User Stories
- **US-4.1**: As a reviewer, I want code duplication clone groups to be eliminated, so that the codebase is highly maintainable.
- **US-4.2**: As a developer, I want unlisted or unused dependencies removed from package files, so that packaging sizes are minimized.

#### Technical Tasks
- Extract duplicated form input getters, profile delete/save loops, and haptic test assertion helpers.
- Purge `@tauri-apps/api` mocks from `frontend/vitest.setup.js`.
- Ignore build folders (`dist-electron/`) and preload scripts in `.fallowrc.json`.

#### Fallow Quality Gates
- `npx fallow dupes` must return `0 duplicate clone groups`.
- `npx fallow dead-code` must return `✓ No issues found`.

---

## Development Phases

### Phase 0: Discovery and Safety Baseline
- Verify compilation of Rust sidecar and JS build targets.
- Install Fallow CLI tooling and configure `.fallowrc.json` parameters.

### Phase 1: Foundation
- Align `package.json` workspaces.
- Remove deprecated libraries and test mocks.

### Phase 2: Refactoring and Deduplication
- Modularize PTY instantiations and profile controllers.
- Consolidate settings search operations.

### Phase 3: Verification and Release
- Rerun Vitest unit tests and Playwright E2E suites.
- Perform KFMS metadata validation (`khaotic-init.sh validate`).
- Update release tag `v1.8.0-ptah`.

---

## Real Production Test Strategy

### Unit Tests
- **Frontend**: Vitest tests run against a simulated DOM (`happy-dom`). They validate component behaviors such as state mutations, key shortcut validations, haptic dispatch debounce cycles, and notifications badge state updates.
- **Backend**: Rust cargo unit tests (`cargo test --lib`) verifying correct memory retrieval similarity computations, path resolution fallbacks, and themes serialization.

### Integration Tests
- **Bridge Server tests**: Rust integration tests executing local loopback HTTP calls against Axum endpoints to verify deserialization formats and response headers without active UI wrappers.

### E2E Tests
- **Playwright Test suite**: Executes real UI navigations in emulated viewport profiles. Tests validate modal window open states, input field saving, and mock connection profiles.

### Fallow Quality Gates
- **Pre-commit and CI Gate**:
  - `npx fallow dead-code --format human` -> Must yield `0 warnings`.
  - `npx fallow dupes --format compact` -> Must yield `0 duplicates`.

---

## Real Test Data Plan

### Data Sources
- **Configuration templates**: System tests use `promptflow.yaml.example` and standard fallback setups.
- **Local environment diagnostics**: Diagnostic suite loads actual system state properties (PTY capability, local folder access, system keychain APIs) to check release integrity.

---

## Risk Register

| Risk ID | Description | Impact | Mitigation |
|---|---|---|---|
| R-001 | Electron headless Chrome resource utilization | High | Implement strict timeout watchdogs on headless browser workers. |
| R-002 | Platform PTY terminal variations | Medium | Standardize on `portable-pty` crate abstraction. |
| R-003 | Vector database memory pressure | Medium | Cap embedding input strings and limit top-K RAG matches to 3. |

---

## Definitions

### Definition of Ready
- Ticket has explicit acceptance criteria.
- Target files and architecture impacts are documented.
- No blocker dependencies remain unresolved.

### Definition of Done
- Code passes Fallow dead-code and duplication checks (0 errors).
- All Vitest unit tests pass.
- Playwright integration tests pass.
- Version is stamped in metadata and pushed to origin.
