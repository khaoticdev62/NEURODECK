# Retained Legacy Files

This document catalogs legacy, interface compatibility, or fallback files intentionally retained in the NEURODECK codebase.

## Retained Source Files

### 1. `frontend/src/bridgeAdapter.ts`
- **Purpose**: Provides a unified state-sync and command-calling interface for React views. Also manages the fallback health/diagnostics state when the bridge is unavailable.
- **Why Retained**: Essential for backward compatibility with React-based UI components that expect a single, unified data access layer.

### 2. `frontend/src/neurobridge.js`
- **Purpose**: Provides client-side `invoke`, `listen`, and `emit` bindings mapped to local axum server HTTP and WS endpoints.
- **Why Retained**: Serves as the primary communication link between the vanilla JS systems and the Rust sidecar.

### 3. Preload stubs (`electron/preload.js`)
- **Purpose**: Stubs out `models.cancel` and `settings.validate`.
- **Why Retained**: Exposes standard methods to the renderer window context so legacy frontend components don't crash when invoking those operations.
