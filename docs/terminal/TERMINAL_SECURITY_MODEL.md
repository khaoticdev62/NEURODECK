# Terminal Security Model

## Scope

This document describes the security boundaries around the NEURODECK terminal: renderer isolation, PTY process privileges, permission gating, secret redaction, and workspace sandboxing for agent/canvas execution.

## Threat Model

The terminal is a high-risk surface because it lets users run arbitrary shell commands. The primary threats are:

1. **Renderer compromise**: Malicious code in the frontend tries to spawn shells or access secrets.
2. **Credential leakage**: Commands or logs contain API keys, passwords, or tokens.
3. **Accidental destructive commands**: Users run `rm -rf /` or pipe curl to bash.
4. **Agent/canvas escape**: Autonomous code tries to break out of its workspace.

## Renderer Isolation

The terminal feature (`src/renderer/features/terminal/*`) uses only standard renderer APIs:

- `xterm` for terminal rendering
- `lucide-react` for icons
- Local design-system primitives

It does **not** import:

- `child_process`
- `node-pty`
- Node `fs`
- `process.env`

All shell spawning happens in the Rust main process via the bridge. This means a renderer exploit cannot directly start a process; it must go through the bridge API.

## PTY Process Privileges

The PTY child process inherits the OS privileges of the NEURODECK application. It is **not** sandboxed further (no seccomp, no chroot, no separate user). This is by design for a developer tool, but it means the command policy is the main guardrail.

## Permission System

`src-tauri/src/permissions.rs` defines deny-by-default capability profiles. The `ShellExec` capability is required for:

- Agent code execution
- Canvas code execution
- Lua `execute()` calls

However, PTY sessions spawned by the user through the terminal UI are **not** currently gated by these profiles. Any user who can open the terminal can spawn a shell.

## Secret Redaction

Three layers of redaction protect credentials:

| Layer              | File                                                       | What it scrubs                                                                  |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Frontend history   | `src/renderer/features/terminal/terminalUtils.ts`          | Passwords, tokens, secrets, keys, Bearer tokens, API keys from command history. |
| Support bundle     | `src-tauri/src/commands/system.rs::redact_line()`          | Gemini keys, OAuth secrets, Bearer tokens, password/secret TOML lines.          |
| Error sanitization | `src-tauri/src/security.rs::sanitize_error_for_frontend()` | Home/Windows paths from error strings returned to the renderer.                 |

## Agent / Canvas Workspace Boundaries

For autonomous execution, `src-tauri/src/security.rs::validate_script_payload()` uses `tree-sitter` parsers to:

- Detect file-system escapes.
- Block network calls when not allowed.
- Restrict imports/modules to an allowlist.

This applies to agent scripts and canvas code execution, not to the interactive terminal.

## Operational Notes

- Never paste support-bundle contents into public channels without first verifying redaction.
- Keep the `NEURODECK_ALLOW_UNSAFE_EXEC` environment variable unset in production; setting it disables injection hardening for agent scripts.
- The terminal is intended for power users; the command policy is the primary safety net.

## Known Gaps

| Gap                                             | Risk                                                                      | Recommended Fix                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Permission profiles not applied to PTY sessions | Any user with terminal access can run arbitrary shell commands.           | Map terminal access to a capability profile or add a setting to require confirmation for shell spawn. |
| `envPolicy.blockedEnvKeys` not enforced         | Sensitive env vars such as `GEMINI_API_KEY` are inherited by shells.      | Filter environment variables in `pty_spawn` according to the active profile's `envPolicy`.            |
| Frontend classifier can be bypassed             | A compromised renderer can send dangerous bytes directly via `pty_write`. | Validate `pty_write` payloads on the backend before writing to the PTY master.                        |
| No secondary sandbox                            | A shell runs with full app privileges.                                    | Document this as accepted risk or evaluate OS-level sandboxing for the PTY child.                     |
