# Terminal Diagnostics Plan

## Scope

This document describes how NEURODECK diagnoses the terminal subsystem at boot, at runtime, and on demand. It covers environment probing, profile detection, the diagnostics panel, onboarding diagnostics, and support-bundle redaction.

## Diagnostic Commands

The backend exposes the following terminal-related diagnostic commands:

| Command                      | File                               | Purpose                                                                                     |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `get_terminal_environment`   | `src-tauri/src/commands/mod.rs`    | Probes installed shells and tools, returns profile availability.                            |
| `get_terminal_diagnostics`   | `src-tauri/src/commands/mod.rs`    | Returns session count, active sessions, environment, and safety level.                      |
| `get_system_health`          | `src-tauri/src/commands/system.rs` | Structured system health including provider, model, memory count, plugin count, and issues. |
| `run_onboarding_diagnostics` | `src-tauri/src/commands/system.rs` | Six-check diagnostic run used during first-run onboarding.                                  |
| `generate_support_bundle`    | `src-tauri/src/commands/system.rs` | Redacted diagnostic archive.                                                                |

## Environment Probing

`detect_terminal_environment()` probes for the following binaries:

```
bash, zsh, fish, sh, WSL, powershell, pwsh, cmd, git,
node, npm, python3, cargo, go, lua, openvpn, wireguard, wg-quick, nmcli, fallow
```

Each binary is resolved through the platform `PATH`. The result is returned as a map of tool names to availability status.

## Profile Detection

`detect_terminal_profiles()` evaluates the 25 canonical profiles defined in `src/shared/terminal/terminalProfiles.ts`. For each profile it reports:

| Field             | Meaning                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `shellAvailable`  | Whether the configured shell binary exists.                           |
| `shellStatus`     | `"available"`, `"missing_shell_binary"`, or `"unsupported_platform"`. |
| `detectedPath`    | Absolute path to the resolved shell, if found.                        |
| `productionReady` | Whether the profile can be used on this device.                       |

## Diagnostics Panel

The frontend diagnostics panel (`src/renderer/features/terminal/TerminalDiagnosticsPanel.tsx`) renders:

- Active session count
- Platform and default shell
- The first warning, if any
- Up to the first 8 environment probes

`TerminalScreen.tsx` calls `refreshDiagnostics()` to keep the panel current.

## PTY Spawn Timeout and Session Lifetime

`src-tauri/src/pty_manager.rs` enforces two independent lifecycle guards:

- `SPAWN_TIMEOUT_SECS` is **15 seconds**. Shell creation runs on a dedicated thread and the caller waits with `recv_timeout()`. A timeout returns an explicit `Shell spawn timed out` error, and the session is not inserted into `PtyState.sessions`.
- `MAX_SESSION_LIFETIME_SECS` is **7,200 seconds (2 hours)**. A watchdog wakes every 60 seconds, removes expired sessions, and closes their writer/master handles so reader threads can exit.

The current watchdog is an absolute session-lifetime cap, not an activity-based idle timer. Operators diagnosing an unexpected session closure should compare the session `created_at`/`spawned_at` values to the two-hour limit. A future idle policy must track last input/output activity separately rather than relabeling this lifetime guard.

When a shell cannot start, verify the requested binary and working directory before retrying. On Windows, a cold WSL launch can consume most of the timeout; use a native PowerShell or Command Prompt profile to distinguish WSL startup latency from a PTY failure.

## Onboarding Diagnostics

During first-run onboarding, `run_onboarding_diagnostics()` checks:

1. PTY `openpty` capability
2. Network reachability (Gemini/Google)
3. Keychain access
4. Audio capture (`arecord`/`pactl` on Linux, PnP on Windows)
5. SSH availability
6. Text-to-speech availability

Failures are surfaced in the onboarding slide but do not block completion.

## Support Bundle Redaction

`generate_support_bundle` collects system health, logs, and config. Before writing the archive, `redact_line()` scrubs:

- Gemini API keys
- OAuth secrets
- Bearer tokens
- Generic password/secret TOML lines
- Home/Windows paths from error strings

This ensures support bundles can be shared without leaking credentials.

## Operational Procedures

### Run terminal diagnostics

1. Open **Settings** → **Diagnostics** or open the **Terminal** view and show the diagnostics side panel.
2. Click **Refresh** to re-run environment probes.
3. Review missing tools and warnings.

### Generate a support bundle

Use the bridge command or settings UI:

```bash
# Via the Rust CLI / bridge
generate_support_bundle
```

Inspect the produced archive to confirm no secrets remain before sharing.

## Known Gaps

| Gap                                                               | Impact                                                               | Recommended Fix                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `get_terminal_diagnostics` hardcodes `safetyLevel: "safe"`        | Misleading safety signal.                                            | Compute safety level from active profile policies or command classifier. |
| `activeSessionCount` equals `sessionCount` regardless of activity | Inaccurate active-session metric.                                    | Track last-read/write timestamp and count sessions with recent I/O.      |
| `LogsView.tsx` falls back to `generateMockLogs()`                 | Fake log entries, including a PTY spawn line, can mislead operators. | Replace fallback with an empty/error state and a retry button.           |
