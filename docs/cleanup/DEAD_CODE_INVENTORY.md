# Dead-Code Inventory

This inventory documents all the dead code, unused modules, and obsolete migration scripts that were purged from the NEURODECK codebase.

## Purged Rust Backend Modules & Functions

### 1. Tauri Compatibility Layer
- **File**: `src-tauri/src/tauri_compat.rs` (DELETED)
- **Description**: Stubs and shims representing `State<'a, T>`, `AppHandle`, `Window`, `PathResolver` to allow compiling Tauri-style signatures without the tauri crate.
- **Evidence**: Purged from module declarations in `src-tauri/src/lib.rs`.

### 2. Autocomplete Engine
- **File**: `src-tauri/src/autocomplete.rs` (DELETED)
- **Description**: Leftover autocomplete logic that has been replaced by the LSP (Language Server Protocol) service.
- **Evidence**: Removed from module tree.

### 3. Tauri Command Wrappers in Backend Modules
All functions that took Tauri parameter signatures like `State<'_, AppState>` or `AppHandle` and were not mapped in the real axum `dispatch()` table inside `src-tauri/src/commands/mod.rs` were removed:
- **`src-tauri/src/commands/system.rs`**: Removed ~2,500 lines of inactive diagnostics, stubs, and unused helper functions. Kept only live streaming, canvas discovery, system health, and support bundle functions.
- **`src-tauri/src/sync.rs`**: Purged tauri-specific sync command definitions.
- **`src-tauri/src/lsp.rs`**: Purged old wrapper functions.
- **`src-tauri/src/ollama_mgr.rs`**: Purged old wrapper functions.
- **`src-tauri/src/scheduler.rs`**: Purged old wrapper functions.
- **`src-tauri/src/transfer.rs`**: Purged old wrapper functions.

## Purged Frontend / Utility Scripts

The following scripts were used as one-time helpers during the Tauri-to-Electron transition. They are not referenced in `package.json` or any module, and have been deleted:
- `scripts/replace_batch1.js` through `scripts/replace_batch9.js` (DELETED)
- `scripts/replace_initBrowser.js` (DELETED)
- `scripts/replace_initManualModal.js` (DELETED)
- `scripts/replace_pollGamepads.js` (DELETED)
