# Codebase Refinement Audit — NEURODECK

## Executive Summary
This report summarizes the codebase audit, refinement, and production-readiness status of the NEURODECK project. A complete Tauri-to-Electron migration has been executed successfully, moving the frontend container from Tauri v2 to Electron 36. 

A deep static analysis and refactoring cycle has been completed using Fallow. Outstanding issues including dead-code dependencies, unused files, and structural code duplication have been systematically resolved:
- **0 duplicate clone groups** (originally 56 clone groups).
- **0 dead-code or unlisted dependency warnings** (outdated Tauri package mocks and unlisted dependency calls resolved).
- The repository's version governance standard (KFMS v1.0) is active, fully verified, and currently tags version `v1.8.0-ptah` (Ptah) with clean workspace states.

---

## Detected Stack
- **Desktop Shell Container**: Electron 36.0.0 (Node.js v22). Separated main, preload, and dev launcher processes.
- **Frontend Layer**: Vanilla JavaScript (ES2022+), raw CSS, HTML. Hoisted in npm workspaces. Zero dependencies on heavy frameworks (React and Zustand completely deprecated and removed).
- **Bridge & IPC Bridge**: `frontend/src/neurobridge.js` acting as a drop-in replacement for the Tauri API, routing commands via HTTP fetch (POST) and WebSocket streams to the local sidecar.
- **Rust Sidecar / Backend**: Rust 1.92.0 with an Axum HTTP + WebSocket bridge server listening on localhost:9477.
- **Scripting Engine**: mlua with a vendored compilation of Lua 5.4.
- **Testing Suites**: Vitest 4.x for frontend unit testing, Playwright for E2E integration testing.
- **Build & Packaging**: `electron-builder` for multi-platform distribution (Windows MSI/ZIP, Linux AppImage/Deb, Steam Deck Game Mode GameScope targets).

---

## Verified Commands

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Build production artifact
```bash
npm run build
```

### Run tests
- **Frontend Unit Tests**:
```bash
cd frontend && npx vitest run
```
- **E2E Integration Tests**:
```bash
cd e2e && npx playwright test
```

### Run linter (Fallow Analysis)
- **Dead-code / Dependency Hygiene**:
```bash
npx fallow dead-code --format human
```
- **Code Duplication Scan**:
```bash
npx fallow dupes --format compact
```
- **Complexity and Maintainability Hotspots**:
```bash
npx fallow health --format human
```

---

## Project Map
```txt
Project Map
├── electron/
│   ├── main.js - Electron main process supervising the Rust sidecar lifecycle
│   ├── preload.js - Secure preload context bridge exposing NEURODECK_PORT
│   └── scripts/
│       └── dev-launcher.js - Launcher wrapping dev environment flags
├── frontend/
│   ├── vite.config.ts - Frontend bundling configurations
│   ├── vitest.config.ts - Unit test runner configuration
│   └── src/
│       ├── main.js - Monolithic UI view controller (~13k lines)
│       ├── neurobridge.js - IPC fetch and WebSocket communication client
│       ├── chat.js - Chat tab controller (includes RAG context injection updates)
│       ├── settings.js - Settings modal configuration inputs
│       ├── terminal.js - PTY and remote SSH/FTP/SFTP tab controller
│       ├── workflow_view.js - Workflow builder graphical canvas tab controller
│       ├── sanitize.test.js - Input sanitizer unit tests
│       └── notifications.test.js - Notification badge & container unit tests
├── src-tauri/
│   ├── Cargo.toml - Rust sidecar dependencies ( mlua, portable-pty, axum)
│   └── src/
│       ├── main.rs - Main entry point bootstrapping the Axum server
│       ├── bridge.rs - HTTP & WebSocket handlers for command routing
│       ├── paths.rs - HARDENED config resolution (~/.config/neurodeck/llm-term.toml)
│       └── deckcode/ - DeckCode gamepad input resolver system
├── infrastructure/
│   ├── Cargo.toml - Platform library dependencies (keyring 4.x, tonic 0.11)
│   └── src/
│       ├── secrets.rs - Keychain credential persistence integration
│       └── warpinator.rs - Warpinator-compatible gRPC local sharing server
├── infra/
│   └── meta/
│       ├── meta.json - KFMS v1.0 governance registry and git stamp configuration
│       └── CODENAME_REGISTRY.md - Version codename lookup index
└── scripts/
    ├── powershell/
    │   └── build.ps1 - Windows build script orchestrator
    └── shell/
        └── build-steamdeck.sh - Steam Deck application compiler
```

---

## Critical Findings
*None.* The Tauri-to-Electron transition has been fully completed. There are no remaining Tauri imports or dependencies active in the production JS code paths. 

---

## Correctness Findings
*None.* Static analysis via Fallow returns clean. The 78/78 unit tests and E2E integration test suites pass successfully.

---

## Security Findings
- **Keychain Storage**: Handled cleanly in `infrastructure/src/secrets.rs` utilizing the OS keyring (keyring 4.x credential deletion). No credentials or secrets are stored in plain text or local storage.
- **Electron Context Isolation**: Preload security is correctly implemented via context isolation. The only API exposed to the renderer is the dynamically-assigned `window.NEURODECK_PORT`.

---

## Performance & Complexity Findings
The Fallow `health` command identified the following maintainability hotspots and refactoring targets:
1. **Monolithic main.js file (13,269 LOC)**:
   - High complexity. Key targets for refactoring include extracting `pollGamepads` (Cognitive Complexity: 278) and `draw` (Cognitive Complexity: 124) loops into distinct, separate components.
2. **Tab controllers and Views**:
   - `frontend/src/settings.js` (2,744 LOC): Recommendation to extract `applySettings` (Cognitive: 46) and `toggleSettingsLlmGroups` (Cognitive: 36).
   - `frontend/src/chat.js` (2,629 LOC): Recommendation to extract anonymous stream handlers to reduce cognitive load.
   - `frontend/src/canvas.js` (1,148 LOC) and `frontend/src/workflow_view.js` (1,074 LOC): Recommendation to extract inline event listeners into reusable utility functions.

---

## Dependency Findings
- **Tauri cleanup complete**: `@tauri-apps/api` has been completely purged from the codebase.
- **Framework cleanup complete**: React and Zustand dependencies have been successfully removed from `frontend/package.json` to keep the bundled distribution lean and free of unused dependencies.

---

## Prioritized Implementation Plan

### Step 1: Stage and Push Governance Updates
- **Task**: Stage changes to package locks, Fallow ignores, and workspaces.
- **Status**: **COMPLETE**. All metadata, configurations, and scripts have been successfully pushed to `origin/master`.

### Step 2: Extract Gamepad Loops from main.js (Refactoring Opportunity)
- **Task**: Break down the massive `pollGamepads` and graphics `draw` loops out of `main.js` into separate modules (`frontend/src/gamepad.js` and `frontend/src/graphics.js`).
- **Status**: Planned (Fallow Health high priority target).

---

## Exact Code Changes
All code changes for Fallow deduplication and dependencies have already been successfully committed and pushed to git. 
- Mapped `.fallowrc.json` to ignore build output (`dist-electron/`) and dynamically-loaded scripts (`preload.js`, `dev-launcher.js`).
- Cleaned up Tauri mocking stubs in `frontend/vitest.setup.js`.
- Configured npm workspaces in `package.json` to avoid workspace warnings for the `electron/` directory.

---

## Verification Checklist
- [x] Run `npx fallow dead-code --format human` (Result: `✓ No issues found`).
- [x] Run `npx fallow dupes --format compact` (Result: `0 duplicate clone groups`).
- [x] Run `cd frontend && npx vitest run` (Result: `78 / 78 tests passed`).
- [x] Validate KFMS metadata state via `bash ./scripts/kfms/khaotic-init.sh status` (Result: `[ OK ]`).
