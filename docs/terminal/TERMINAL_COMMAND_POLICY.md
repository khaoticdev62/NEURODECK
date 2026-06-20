# Terminal Command Policy

## Scope

This document defines the command-safety policy for the NEURODECK terminal. It describes classification levels, the frontend and backend classifiers, the confirmation gate, injection hardening, and known bypass risks.

## Safety Levels

Commands are classified into one of five levels:

| Level       | Meaning                                                       | UI Behavior                                   |
| ----------- | ------------------------------------------------------------- | --------------------------------------------- |
| `safe`      | Read-only or well-known benign commands                       | Execute immediately.                          |
| `confirm`   | Potentially destructive but common (e.g., `rm`, `docker run`) | Show confirmation modal.                      |
| `dangerous` | Highly destructive or system-wide                             | Show warning modal; require explicit confirm. |
| `blocked`   | Known dangerous patterns (e.g., pipe-to-shell from curl)      | Refuse and mark pane as blocked.              |
| `unknown`   | Does not match any pattern                                    | Treat as `confirm` by default.                |

## Frontend Classifier

`src/shared/terminal/terminalCommandPolicy.ts` contains the primary classifier used by the terminal UI.

It matches against:

- **Safe prefixes**: `ls`, `cd`, `pwd`, `cat`, `echo`, `grep`, `find`, `git status`, `git log`, etc.
- **Confirm patterns**: `rm`, `cp`, `mv`, `docker run`, `kubectl apply`, `npm install`, etc.
- **Dangerous patterns**: `dd`, `mkfs`, `fdisk`, `format`, etc.
- **Blocked patterns**: `curl ... | sh`, `wget ... | bash`, backticks in pipes, command substitution piped to shell, etc.

## Backend Classifier

`src-tauri/src/terminal.rs::classify_terminal_command()` mirrors a similar rule set in Rust. It is exposed as a bridge command but is **not currently invoked by the terminal UI**.

## Injection Hardening

`src-tauri/src/security.rs::validate_terminal_command()` blocks:

- Command substitution (`$(...)`)
- Backtick execution
- IFS injection
- Pipe-to-shell patterns
- Newline chaining
- Dangerous substrings when `NEURODECK_ALLOW_UNSAFE_EXEC` is unset

This validator is used by `execute_command_sync` and the Lua `execute()` sandbox. It is **not** used by `pty_write`.

## Confirmation Flow

`TerminalScreen.tsx` handles user input before it reaches the PTY:

1. User presses Enter.
2. `classifyTerminalCommand()` is called.
3. If `blocked`, the command is refused and the pane state becomes `"blocked"`.
4. If `dangerous` or `confirm`, `TerminalSafetyConfirmModal.tsx` is opened.
5. If the user confirms, the command bytes are sent via `pty_write`.
6. If the user cancels, focus returns to xterm.

## History Redaction

Command history stored in the frontend is redacted by `terminalUtils.ts::redactCommandHistory()` for patterns matching:

- `password`, `token`, `secret`, `key`
- Bearer tokens
- API keys

## Operational Notes

- The policy is conservative: anything unrecognized is treated as `confirm`.
- Users can cancel a confirmation and edit the command before retrying.
- A pane in the `"blocked"` state can be restarted via the session manager.

## Known Gaps

| Gap                                                       | Risk                                                                                   | Recommended Fix                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Terminal UI does not call backend classifier              | The frontend and backend policies can drift.                                           | Use backend `classify_terminal_command` as the authoritative check before `pty_write`.                            |
| `validate_terminal_command` is not applied to `pty_write` | A compromised renderer can bypass the frontend policy by calling `pty_write` directly. | Run `validate_terminal_command` on the bytes sent to `pty_write`, or reject writes that contain blocked patterns. |
| Profile safety flags are ignored                          | Per-profile `readOnlyMode` and `allowDestructiveCommands` are not honored.             | Enforce profile flags in the classification step or remove them from the schema.                                  |
