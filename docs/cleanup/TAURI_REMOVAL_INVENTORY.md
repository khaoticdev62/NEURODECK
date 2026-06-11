# Tauri Removal Inventory

This document chronicles the complete purge of Tauri-related compatibility layers and stub structures.

## `src-tauri/src/tauri_compat.rs` Summary
The file `tauri_compat.rs` was a compatibility shim designed to keep Tauri commands compilable after Tauri's build dependency was removed from `Cargo.toml`. It defined the following stubs:
- `struct State<'a, T>`: Wrapper for global application state (`AppState`).
- `struct AppHandle`: Tauri handle mock.
- `struct Window`: Tauri window mock.
- `struct PathResolver`: Mocked configuration and data directory resolver.
- Tray and Menu types (`SystemTray`, `CustomMenuItem`, etc.) that were formerly used for OS menu integrations.

This file was **deleted** during this cleanup pass.

## Dead Functions Removed (State/AppHandle Signatures)
The following modules had their Tauri command signatures removed because they are completely bypassed by axum router calls inside `commands/mod.rs`:

| Module Path | Removed Function Name | Reason |
|---|---|---|
| `src-tauri/src/commands/system.rs` | `clean_temp_files` | Dead wrapper signature. |
| `src-tauri/src/commands/system.rs` | `set_kiosk_mode` | Bridge does not support kiosk mode via sidecar. Managed in Electron. |
| `src-tauri/src/commands/system.rs` | `trigger_haptic_feedback` | Unused on Electron backend. |
| `src-tauri/src/lsp.rs` | `lsp_start_server` | Bypassed. real IPC is `lsp:start-server`. |
| `src-tauri/src/ollama_mgr.rs` | `ollama_status` | Bypassed. |
| `src-tauri/src/scheduler.rs` | `scheduler_status` | Bypassed. |
| `src-tauri/src/transfer.rs` | `transfer_status` | Bypassed. |

## Compiler Validation
- **Command Run**: `cargo check --manifest-path src-tauri/Cargo.toml`
- **Status**: **PASSING**
- **Result**: No compilation errors. All occurrences of `tauri_compat` module declarations and imports have been deleted.
