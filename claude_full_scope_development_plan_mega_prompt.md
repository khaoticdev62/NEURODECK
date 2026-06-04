# NEURODECK — Master Epics, Stories & Code Hygiene Development Plan

## 1. Project Context & Current Architecture
NEURODECK is an Electron desktop app with a Rust sidecar (`axum` bridge server running on `localhost:9477`) that turns a Steam Deck into an AI-powered terminal OS.
- **Frontend**: Single Page HTML/CSS/JS application (Monolithic `frontend/src/main.js` and sub-modules) communicating via `neurobridge.js` to the Rust bridge sidecar.
- **Backend**: Rust sidecar managing PTY terminal processes, vector database (RAG), Whisper STT audio captures, and secure keychain integrations.
- **Verification Gates**: Fallow static analyses (0 code duplicates, 0 dead-code warnings) and Playwright E2E integration tests.

---

## 2. Epic & User Story Roadmap

### EPIC-001: First-Time User Onboarding & Diagnostics
**Objective**: Guide first-time users through entering API keys, selecting AI personas, choosing UI themes, and running system diagnostic checks.
- **US-1.1: First-Run Detection & Welcoming UI**
  - **Acceptance Criteria**: Check if `get_gemini_api_key` is empty. If empty and `neurodeck_onboarding_complete` is not set, block the main workspace and display a cyberpunk-themed typing animation welcome slide.
  - **Technical Tasks**: Read keychain config state on startup; route to `#onboarding-modal` overlay.
- **US-1.2: Secure API Key Entry & Handshake**
  - **Acceptance Criteria**: Provide password-masked text inputs for the Gemini API key. Include a "Verify Connection" button that runs `test_llm_connection` and logs output. Store the verified key in the OS Keychain.
  - **Technical Tasks**: Hook input to backend `save_gemini_api_key` and verify through Axum endpoint.
- **US-1.3: Persona & Theme Selection Carousel**
  - **Acceptance Criteria**: Present a carousel of 9 default personas and 4 core themes. Clicking a theme instantly updates the CSS color variables in the DOM.
  - **Technical Tasks**: Update `theme` preferences in `localStorage` and trigger global theme redraw.
- **US-1.4: System Capability Diagnostics Checklist**
  - **Acceptance Criteria**: Execute a multi-threaded diagnostic pipeline covering: PTY shell access, Gemini API network connectivity, Keychain accessibility, Audio/Microphone devices, SSH binaries, and TTS engines. Display status badges (`SUCCESS` / `ERROR`) for each.
  - **Technical Tasks**: Invoke backend `run_onboarding_diagnostics` and render outcomes with unique IDs for accessibility tests.

### EPIC-002: Repository & Database Restructuring
**Objective**: Consolidate loose files, clean up legacy directories, and move user data persistence from temporary storage to the proper OS directories.
- **US-2.1: localStorage to Disk Migration**
  - **Acceptance Criteria**: Auto-migrate user custom themes, SSH, and FTP/SFTP connection profiles from `localStorage` to `%APPDATA%\neurodeck` (Windows) or `~/.config/neurodeck` (Linux) on startup.
  - **Technical Tasks**: Write JSON configuration helpers in Rust; run frontend migration script on first boot and purge old keys.
- **US-2.2: Hardened Config Path Resolution**
  - **Acceptance Criteria**: Resolve configuration in priority order: (1) `$NEURODECK_CONFIG_PATH` env var, (2) user config folder, (3) dev fallback `../llm-term.toml`.
  - **Technical Tasks**: Refactor `paths.rs` and audit all file-read calls.

### EPIC-003: Tauri-to-Electron Container Migration (Complete & Verified)
**Objective**: Replace the Tauri runtime with an Electron 36 shell container, routing all IPC commands through fetch POST requests and WebSocket event streams.
- **US-3.1: Neurobridge Routing Integration**
  - **Acceptance Criteria**: Intercept and route all `invoke()` and `listen()` commands through `neurobridge.js` using HTTP client fetch loops and WebSocket handlers. Fall back to `window.__TAURI__` when running under Playwright mock environments to support E2E tests.
  - **Technical Tasks**: Implement conditional mock checks in `neurobridge.js`. Remove Tauri library imports from frontend dependencies.

### EPIC-004: Fallow Quality & Static Analysis Hygiene (Ongoing Gate)
**Objective**: Maintain zero code duplicates and clean dependency trees across the JavaScript and Rust modules.
- **US-4.1: Code Duplication Eradication**
  - **Acceptance Criteria**: Fallow duplication scan must report exactly `0 duplicate clone groups`.
  - **Technical Tasks**: Consolidate form getters, settings search tabs, haptic test suites, and PTY manager instantiation loops.
- **US-4.2: Dependency Cleansing**
  - **Acceptance Criteria**: `npx fallow dead-code` must return no warnings. Package files must not declare unused dependencies.

### EPIC-005: Trust, Provenance & Citations (Bastet v1.6)
**Objective**: Provide visibility into AI reasoning, factual source citations, and local sandbox boundaries.
- **US-5.1: RAG Attribution UI**
  - **Acceptance Criteria**: For every command response generated via RAG, render a collapsible drawer showing exactly which local memory document chunks or web citations influenced the answer.
  - **Technical Tasks**: Append metadata (document ID, similarity score, chunk snippet) to `send_command` return payloads and render in Chat.
- **US-5.2: Sandboxed Browser Memory Vectorization**
  - **Acceptance Criteria**: Add a "Save to Memory" button in the sandboxed browser. Clicking it downloads the page content, generates vector embeddings, and writes it to the local memory database.
  - **Technical Tasks**: Run page scraper through headless browser commands, call `generate_embedding`, and write to vector JSON.

### EPIC-006: Security Hardening & Rate Limiting
**Objective**: Mitigate brute-force attacks and prevent injection vulnerabilities.
- **US-6.1: Rate Limiting & API Throttling**
  - **Acceptance Criteria**: Enforce token-bucket rate limiting on the bridge server for external/LAN-facing WebSocket and HTTP endpoints (e.g. remote control APIs, MCP servers).
  - **Technical Tasks**: Integrate rate-limiting middleware in `src-tauri/src/bridge.rs`.
- **US-6.2: Output Sanitization & Path Redaction**
  - **Acceptance Criteria**: Redact local filesystem paths from frontend error messages. Escape user-controlled inputs in dynamic HTML preview containers.
  - **Technical Tasks**: Implement `sanitize_error_for_frontend` in `security.rs`; inject CSP meta tags and strip scripts in the Canvas preview `srcdoc`.

### EPIC-007: Hermes Lua Extension Framework
**Objective**: Enable developers to register custom shell commands and hook into system events.
- **US-7.1: Pluggable Adapter Pipeline**
  - **Acceptance Criteria**: Register CLI, Node, and Web adapters dynamically. Load and execute scripts in the Lua sandboxed environment.
  - **Technical Tasks**: Bundle `plugins/hermes.lua` and support Gopher-Lua bindings.

### EPIC-008: Mobile Companion App & Remote APIs
**Objective**: Implement native mobile companion views and push notifications for background agent status.
- **US-8.1: Mobile Approval Interface**
  - **Acceptance Criteria**: Receive and display permission requests from the desktop Agent for computer use or local command executions.
  - **Technical Tasks**: Build companion client views using WebSocket notifications and secure pairing PIN exchanges.

---

## 3. Fallow Auditing & Code Review Integration Ledger
Every code change must pass through the Fallow verification gates:
1. **Deduplication Check**: Run `npx fallow dupes --format compact` after edits. Any detected clone groups must be refactored before staging.
2. **Dead-Code Scan**: Run `npx fallow dead-code` to verify all imports resolve and no unreachable variables remain.
3. **Dependency Check**: Audit `package.json` against `node_modules` to ensure zero unlisted dependencies are imported.
4. **Code Review Protocol**: Align any modified file with safety conventions. Mutex locks must never use raw `.unwrap()`. Inputs passed to shell commands must be strictly sanitized via regex whitelists.

---

## 4. Verification & Testing Strategy
- **Unit Tests**:
  - Run frontend test suite: `npm -w frontend run test` (Vitest + happy-dom).
  - Run backend unit tests: `cargo test --lib`.
- **E2E Integration Tests**:
  - Run full suite: `npx playwright test` inside `e2e/` (verify all tabs, command palette, and quick switcher).
  - Fix any accessibility failures by appending appropriate ARIA tags and focus indicators to interactive divs.
