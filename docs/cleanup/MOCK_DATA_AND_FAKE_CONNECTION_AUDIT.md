# Mock Data & Fake Connection Audit

This audit documents and justifies all mock/stub patterns and fallback states retained in the NEURODECK production codebase.

## Approved Mocks and Fallbacks

### 1. `offline-draft` Fallback State
- **Location**: `frontend/src/bridgeAdapter.ts`
- **Pattern**: Hardcoded mock responses for system health, diagnostics, and config when the bridge is completely unreachable.
- **Justification**: Prevents the frontend from crashing or hanging on startup if the Rust sidecar fails to initialize or is blocked by local firewalls. It allows the UI to render an informative offline notification screen.

### 2. Preload no-op stubs
- **Location**: `electron/preload.js`
- **Pattern**:
  - `models.cancel: () => Promise.resolve({ ok: true })`
  - `settings.validate: (key, value) => Promise.resolve({ valid: true })`
- **Justification**:
  - `models.cancel`: Real cancelation is managed asynchronously via WebSocket connection aborts, so a synchronous preload endpoint is a safe no-op.
  - `settings.validate`: Formal schema validation is executed during `settings.set` in the main process. Preload validation acts as a pass-through shim for legacy renderer code.

### 3. `window._mockCollabActive` Flag
- **Location**: `frontend/src/canvas.js` & `frontend/src/main.js`
- **Pattern**: Setting `window._mockCollabActive` dynamically to signal status.
- **Justification**: An internal developer/QA test aid that allows checking workspace collaboration states without spawning a multi-peer network locally. It is explicitly commented in code with `// APPROVED_MOCK_FALLBACK`.

## Non-Approved Mocks (Scanned by Gates)
Any stub returning `"Not yet implemented"`, mock data variables (e.g., `demoData`, `sampleData`) in production paths, or imports from testing directories in production files will trigger a failure in `verify-no-production-mocks.ts`.
