# Terminal Self-Healing Plan

## Scope

This document describes the recovery mechanisms that keep the terminal subsystem healthy across boot, runtime, and per-pane failures.

## Boot Self-Healing

`src-tauri/src/self_heal.rs::boot_self_heal()` runs at application startup and performs the following repairs:

1. Ensures runtime directories exist:
   - `bin`
   - `data`
   - `logs`
   - `plugins`
   - `data/scheduler`
   - `data/memory`
2. Rebuilds a corrupt `llm-term.toml` from defaults.
3. Sanitizes invalid config values:
   - provider
   - models
   - device ID
   - whisper paths
4. Recovers corrupt personas JSON.
5. Recovers a corrupt memory DB by moving it to a timestamped backup and creating a fresh database.

## Runtime Maintenance

`src-tauri/src/bridge.rs` runs `maintain_runtime_layout()` every **45 seconds** to ensure the runtime directory structure remains intact.

## Pane Recovery

The frontend implements manual and automatic pane recovery:

### Automatic spawn on pane creation

`TerminalViewport.tsx` monitors pane state:

- When a pane is in state `created` or `recovering`, it calls `terminal.spawn()`.
- On success, the pane state moves to `running`.
- On failure, the pane state moves to `error` and an error overlay is shown.

### Manual restart

`TerminalScreen.tsx::restartPane()`:

1. Generates a new `pty_<timestamp>_<random>` session ID.
2. Resets the pane's output buffer.
3. Increments `recoveryCount`.
4. Triggers `TerminalViewport` to auto-spawn again.

## Error Overlay

When `pty_spawn` fails, the pane shows:

- A short error message.
- A **Restart** button that calls `restartPane()`.
- A **Close** button that removes the pane.

## Operational Procedures

### Recover from a stuck pane

1. Try pressing the controller `Y` button or clicking the pane to focus it.
2. If the pane is unresponsive, open the session manager and click **Restart**.
3. If the shell repeatedly fails to spawn, open **Settings → Diagnostics** and review `get_terminal_environment` for missing binaries.

### Recover from a corrupt memory DB

If the memory DB is corrupt, boot self-healing will back it up automatically. Check `data/memory/` for timestamped `.bak` files.

## Known Gaps

| Gap                                          | Impact                                               | Recommended Fix                                                                            |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| No automatic retry on `pty_spawn` failure    | Users must manually restart a failed pane.           | Add a limited retry loop (e.g., 3 attempts with backoff) before showing the error overlay. |
| No session rehydration after renderer reload | Reloading the app orphans existing `pty_*` sessions. | Persist session metadata and, on reload, either reconnect or kill orphaned sessions.       |
| TTL watchdog drops sessions silently         | Panes appear frozen after 2 hours of inactivity.     | Emit `pty_exit` with reason `"ttl_expired"` so the frontend can show a clear state.        |
