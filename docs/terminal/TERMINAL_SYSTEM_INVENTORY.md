# Terminal System Inventory

## Current Surface

- Real PTY backend: `src-tauri/src/pty_manager.rs`
- Terminal service helpers: `src-tauri/src/terminal.rs`
- Bridge commands: `src-tauri/src/commands/mod.rs`
- Typed preload bridge: `frontend/src/react/services/bridgeAdapter.ts`
- Terminal workspace UI: `frontend/src/react/features/terminal/TerminalScreen.tsx`

## Status

| Area                        | Status           | Notes                                                                  |
| --------------------------- | ---------------- | ---------------------------------------------------------------------- |
| PTY spawn/write/resize/kill | production_ready | Real shell processes in Rust main process                              |
| Terminal renderer           | production_ready | xterm-backed pane viewport                                             |
| Command policy              | production_ready | Shared safety classifier and confirmation gate                         |
| Shell profiles              | production_ready | Shared profile registry and runtime availability probing               |
| Diagnostics                 | in_progress      | Reporting exists; deeper runtime probes can be expanded                |
| Self-healing                | in_progress      | Recovery state and restart flow exist; more failure modes can be added |
