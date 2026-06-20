# Terminal Profile System Plan

## Scope

This document describes the terminal profile system: canonical profile definitions, availability detection, frontend selection, fallback behavior, and the gap between declared policy and runtime enforcement.

## Profile Schema

Canonical profile definitions live in `src/shared/terminal/terminalProfiles.ts`. Each profile declares:

| Field group       | Fields                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell             | `shellPath`, `shellArgs`                                                                                                                                 |
| Platform          | `platform` (`linux`, `macos`, `windows`, `cross`)                                                                                                        |
| Working directory | `cwdStrategy` (`home`, `project`, `workspace`, `inherit`)                                                                                                |
| Environment       | `envPolicy` with `inheritSafeEnv`, `allowedEnvKeys`, `blockedEnvKeys`, `injectProjectEnv`                                                                |
| Safety            | `readOnlyMode`, `allowDestructiveCommands`, `requireConfirmationForDangerousCommands`, `allowNetworkCommands`, `allowPackageInstall`, `allowVpnCommands` |
| AI assist         | `autoExecuteAllowed`                                                                                                                                     |
| Metadata          | `productionReady`                                                                                                                                        |

There are **25 canonical profiles** covering bash, zsh, fish, PowerShell, pwsh, cmd, WSL, and specialized shells such as Python, Node, Cargo, and Lua REPLs.

## Availability Detection

Backend `detect_terminal_profiles()` in `src-tauri/src/terminal.rs` evaluates every canonical profile:

1. Resolves the configured shell binary through `resolve_command_path()`.
2. Checks platform compatibility.
3. Returns `TerminalProfileAvailability` with:
   - `shellAvailable`
   - `shellStatus`
   - `detectedPath`
   - `productionReady`

## Frontend Selection

`TerminalProfileSelector.tsx` groups profiles by platform and shows availability badges. Missing shells are surfaced as `missing_shell_binary`.

When a pane is created, `TerminalScreen.tsx` stores the selected `profileId` on the pane. If the profile's shell is later removed or unavailable, `fallbackShellForProfile()` picks a sensible default (`/bin/sh`, `cmd.exe`, etc.).

## cwd Strategy

| Strategy    | Behavior                                               |
| ----------- | ------------------------------------------------------ |
| `home`      | Spawn in the user's home directory.                    |
| `project`   | Spawn in the active project knowledge-space directory. |
| `workspace` | Spawn in the workspace root.                           |
| `inherit`   | Spawn in the directory of the spawning process.        |

The frontend passes the resolved `cwd` to `pty_spawn` at pane creation time.

## Operational Notes

- Profiles are purely declarative today; the backend does not reject a spawn based on profile policy.
- A pane's profile can be inspected in the diagnostics panel and in the session manager overlay.
- Profile changes take effect only for new panes; existing sessions keep their original shell.

## Known Gaps

| Policy / flag                             | Declared | Enforced               | Risk                                                                    |
| ----------------------------------------- | -------- | ---------------------- | ----------------------------------------------------------------------- |
| `envPolicy.allowedEnvKeys`                | Yes      | No                     | Sensitive or unrelated variables may leak into the shell.               |
| `envPolicy.blockedEnvKeys`                | Yes      | No                     | Keys such as `GEMINI_API_KEY` are declared blocked but still inherited. |
| `readOnlyMode`                            | Yes      | No                     | Destructive commands can still be typed.                                |
| `allowDestructiveCommands`                | Yes      | No                     | Profile intent is ignored by the command classifier.                    |
| `requireConfirmationForDangerousCommands` | Yes      | No                     | Confirmation is governed only by the global command policy.             |
| `autoExecuteAllowed`                      | Yes      | No (hardcoded `false`) | Even if changed, no code checks the flag.                               |

### Recommended fixes

1. In `pty_spawn`, apply `envPolicy` by filtering the inherited environment.
2. Either enforce per-profile `safety` flags in the command classifier or remove them from the schema to avoid misleading declarations.
3. Wire `aiAssist.autoExecuteAllowed` through the assistant suggestion flow, or remove the field.
