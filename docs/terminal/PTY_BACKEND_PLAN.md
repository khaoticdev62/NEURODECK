# PTY Backend Plan

## Scope

This document describes the production PTY (pseudo-terminal) backend that powers NEURODECK's terminal panes. It covers session lifecycle, I/O routing, timeouts, cleanup, remote-control integration, and known operational gaps.

## Architecture Overview

The PTY backend is implemented in Rust and built on the [`portable-pty`](https://crates.io/crates/portable-pty) crate.

```
Renderer (xterm.js)
       |
       | WebSocket / HTTP bridge
       v
Bridge server (src-tauri/src/bridge.rs)
       |
       | pty_spawn / pty_write / pty_resize / pty_kill
       v
PtyState (src-tauri/src/pty_manager.rs)
       |
       | portable-pty
       v
Child shell process
```

Core responsibilities are split as follows:

| Component           | File                                               | Responsibility                           |
| ------------------- | -------------------------------------------------- | ---------------------------------------- |
| PTY session manager | `src-tauri/src/pty_manager.rs`                     | Spawn, write, resize, kill, TTL watchdog |
| Bridge dispatch     | `src-tauri/src/commands/mod.rs`                    | Route terminal bridge commands           |
| Session summary     | `src-tauri/src/terminal.rs`                        | Diagnostics and profile detection        |
| Frontend API        | `src/renderer/services/bridge/domains/terminal.ts` | Typed wrapper for bridge calls           |

## Session State

Session state is held in `PtyState`:

```rust
pub struct PtyState {
    sessions: HashMap<String, PtySession>,
    remote_tx: Option<broadcast::Sender<String>>,
}
```

- `sessions` maps a session ID to an active `PtySession`.
- `remote_tx` forwards raw PTY output to the remote-control UDP server when it is active.

`PtyState::new()` starts a background watchdog thread that removes sessions older than **2 hours**.

## Supported Commands

| Bridge command             | Behavior                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pty_spawn`                | Starts a new shell session for a given profile/session ID. Removes any pre-existing session with the same ID first. |
| `pty_write`                | Writes raw bytes to the session's PTY master and flushes.                                                           |
| `pty_resize`               | Updates the in-memory size and calls `master.resize()`.                                                             |
| `pty_kill`                 | Removes the session from the map; dropping `PtySession` closes the PTY.                                             |
| `get_terminal_sessions`    | Lists active sessions.                                                                                              |
| `get_terminal_environment` | Probes available shells and tools.                                                                                  |
| `get_terminal_diagnostics` | Returns session count, environment, and safety status.                                                              |

## Spawn Flow

1. `pty_spawn` receives a `session_id` and a `profile_id`.
2. `build_shell_candidates()` resolves a platform-aware fallback chain of shell binaries (bash, zsh, fish, PowerShell, pwsh, cmd, etc.).
3. `user_bin_dir()` and `npm_bin_dir()` are prepended to `PATH` so user-installed and npm-installed tools are discoverable.
4. `spawn_pty_with_timeout()` spawns the PTY in a dedicated thread with a **15-second timeout** (`SPAWN_TIMEOUT_SECS`).
5. On success, a reader thread is started:
   - Reads output from the PTY master.
   - Emits `pty_output` WebSocket events tagged with the session ID.
   - Forwards raw output to `remote_tx` if remote control is enabled.
   - On EOF, calls `child.wait()` and emits `pty_exit` with reason `"exited"`.
6. The session is inserted into `PtyState.sessions`.

## Session Replacement Rule

Before inserting a new session, `pty_spawn` removes any existing session with the same ID. Dropping the old `PtySession` closes its writer and master, which terminates the old reader thread. This prevents resource leaks from rapid respawns.

## I/O Routing

- **Input**: All user keystrokes from xterm are sent as raw bytes via `pty_write`.
- **Output**: The reader thread emits `pty_output` events carrying `{ id, output }`.
- **Lifecycle**: The reader thread emits `pty_exit` when the child process ends.
- **Remote control**: When the UDP remote-control server is active, raw PTY output is also broadcast on `remote_tx`.

## Timeouts and Cleanup

| Timeout       | Value      | Behavior                                                       |
| ------------- | ---------- | -------------------------------------------------------------- |
| Spawn timeout | 15 seconds | Fails the HTTP `pty_spawn` call if the shell cannot start.     |
| Session TTL   | 2 hours    | Background watchdog force-removes stale sessions.              |
| Kill          | Immediate  | `pty_kill` drops the session; the child process is terminated. |

## Operational Notes

- The default frontend session ID pattern is `pty_<timestamp>_<random>`. The legacy `main_pty_session` ID is no longer used by the React workspace.
- There is no separate `pty_input` command; input is always sent through `pty_write` as raw bytes.
- The `get_terminal_diagnostics` command can be used to inspect active sessions and environment probes from the settings/diagnostics panel.

## Known Gaps

| Gap                                          | Impact                                                           | Recommended Fix                                                               |
| -------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pty_exit` reason is always `"exited"`       | Operators cannot distinguish normal exit from spawn timeout.     | Emit `"spawn_timeout"` when `spawn_pty_with_timeout()` fails.                 |
| TTL watchdog drops sessions silently         | Frontend panes appear frozen because no `pty_exit` is emitted.   | Emit `pty_exit` with reason `"ttl_expired"` from the watchdog.                |
| `remote_pty` event has no backend consumer   | Remote-control terminal input is advertised but not implemented. | Add a handler that writes remote input into `pty_write`, or remove the event. |
| No session rehydration after renderer reload | Reloading the app orphans existing `pty_*` sessions.             | Persist session metadata and offer reconnect or auto-kill.                    |
