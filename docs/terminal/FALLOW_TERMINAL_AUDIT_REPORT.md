# Fallow Terminal Audit Report

## Scope

This report combines the automated Fallow gate with a terminal-focused manual source audit covering dead code, duplicate logic, unwired backend paths, and unsafe renderer imports.

## Audit Date

2026-06-19

## Automated Fallow Result

Fallow 2.98.0 was executed from the clean `docs/terminal-backend-runbooks` worktree after the runbook changes:

```text
fallow audit --format json
verdict: pass
dead_code_issues: 0
complexity_findings: 0
duplication_clone_groups: 0
elapsed_ms: 384
```

The gate is configured as `new-only`; Markdown-only documentation changes produce no analyzable changed-code files. The findings below are therefore the separate terminal-focused manual audit, not invented Fallow output.

## Files Audited

- `src/renderer/features/terminal/*`
- `src/renderer/styles/legacy.css`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/remote_control.rs`
- `src/shared/terminal/*`

## Findings

### 1. Dead UI paths

| File / Location                                                | Issue                                                | Recommendation                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `src/renderer/features/terminal/TerminalControllerHintBar.tsx` | Exported but never imported or rendered.             | Either render it inside `TerminalScreen` or delete it.                |
| `src/renderer/features/terminal/TerminalView.tsx`              | Re-exports `TerminalScreen` with no added behavior.  | Remove the alias and update imports to use `TerminalScreen` directly. |
| `src/renderer/styles/legacy.css` (`.autocomplete-status-bar`)  | Styles a non-existent autocomplete status component. | Delete the CSS block.                                                 |

### 2. Duplicate logic

| Duplication                         | Locations                                                                              | Recommendation                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `PaneRuntime` type                  | `terminalUtils.ts`, `TerminalViewport.tsx`, `TerminalDiagnosticsPanel.tsx`             | Move to `src/shared/terminal/terminalTypes.ts` and import everywhere.                                                                      |
| ANSI escape stripping               | `terminalUtils.ts::stripPromptArtifacts`, `TerminalViewport.tsx::stripAnsiForMatching` | Consolidate into a single `stripAnsi` utility in `terminalUtils.ts`.                                                                       |
| Command classification              | `src/shared/terminal/terminalCommandPolicy.ts` and `src-tauri/src/terminal.rs`         | Make the backend classifier authoritative and remove the frontend duplicate, or generate one from the other.                               |
| `pty_output` / `pty_exit` listeners | Both `TerminalScreen.tsx` and `TerminalViewport.tsx` subscribe                         | Decide ownership: let `TerminalViewport` own its session listener and pass events up, or centralize in `TerminalScreen`. Do not keep both. |

### 3. Unwired backend code

| Backend path                 | File                              | Issue                                                                                                       | Recommendation                                                |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `shell_autocomplete` command | `src-tauri/src/commands/mod.rs`   | Emits `shell_autocomplete_result` / `shell_autocomplete_error` events that no frontend consumer listens to. | Delete the command or implement an xterm ghost-text consumer. |
| `remote_pty` event           | `src-tauri/src/remote_control.rs` | Broadcasts a remote-pty input event with no handler that writes into a PTY session.                         | Add a backend handler or remove the event.                    |

### 4. Unsafe renderer imports

No Node.js, Electron privileged, or unsafe imports were found in `src/renderer/features/terminal/*`. The feature relies on:

- `xterm`
- `lucide-react`
- Local design-system primitives
- Bridge adapter

## Risk Summary

| Category                | Count | Severity |
| ----------------------- | ----- | -------- |
| Dead code               | 3     | Low      |
| Duplicate logic         | 4     | Medium   |
| Unwired backend paths   | 2     | Medium   |
| Unsafe renderer imports | 0     | N/A      |

## Recommended Action Plan

1. **Immediate cleanup**
   - Delete `TerminalView.tsx`.
   - Delete the `.autocomplete-status-bar` CSS block.
   - Either wire or delete `TerminalControllerHintBar.tsx`.

2. **Consolidation**
   - Move shared `PaneRuntime` and ANSI utilities to a single location.
   - Use the backend command classifier as the source of truth.

3. **Backend decisions**
   - Decide the fate of `shell_autocomplete` and `remote_pty`. Do not leave unwired code in production.

4. **Profile policy enforcement**
   - Enforce `envPolicy` and `safety` flags in `pty_spawn`, or remove the fields from the profile schema to avoid misleading declarations.

## Verification

After remediation:

- `TerminalControllerHintBar`, `TerminalView`, and the legacy autocomplete CSS are removed or actively rendered.
- Only one command classifier remains active.
- `shell_autocomplete` and `remote_pty` are either consumed or deleted.
- `npm run frontend:build` and `npm run frontend:typecheck` pass.
