# WIRING VERIFICATION PLAN

This document outlines the testing strategy, verification scripts, and automated gates used to guarantee that all IPC, API, and LSP connections are fully operational.

---

## 1. Verification Scripts

The verification system relies on five target scripts to validate the connection paths:

### A. Wiring Integrity (`verify-wiring.ts`)
* **Objective**: Ensure that every preload API maps to an allowed IPC channel and that every channel has a main-process handler.
* **Checks**:
  1. No duplicate channels in registry.
  2. Main process registry handles all declared channels.
  3. Preload layer calls match registry names.

### B. Language Server Protocol (`verify-lsp.ts`)
* **Objective**: Execute a real end-to-end LSP session on a test file.
* **Checks**:
  1. Spawns language server subprocess.
  2. Exchanges `initialize` / `initialized` handshake.
  3. Negotiation of capabilities.
  4. Opens a temp file, requests `hover`, and verifies response contents.
  5. Graceful shutdown.

### C. API Providers (`verify-api.ts`)
* **Objective**: Run health probes against all registered backend and external providers.
* **Checks**:
  1. Rust Sidecar HTTP bridge is responsive.
  2. Ollama provider list handles failure gracefully if Ollama is offline.
  3. Gemini authentication availability is correctly reported.

### D. Verification Runner (`verify-diagnostics.ts`)
* **Objective**: Run the entire connection matrix and output a health status.

---

## 2. Test Architecture

The tests are categorized as follows:

```
[Contract Tests]     → Checks preload signatures vs renderer client imports
[Integration Tests]  → Tests IPC handler roundtrip & storage read/write/delete
[E2E Tests]          → Playwright launching app and interacting with the Diagnostics UI
```

### Verification CLI Commands
* `npm run verify:wiring` - Runs `verify-wiring.ts` script.
* `npm run verify:lsp` - Runs `verify-lsp.ts` script.
* `npm run verify:api` - Runs `verify-api.ts` script.
* `npm run verify:diagnostics` - Runs `verify-diagnostics.ts` script.
* `npm run production:gate` - Aggregated gate running typechecks, linter, tests, and verification scripts.
