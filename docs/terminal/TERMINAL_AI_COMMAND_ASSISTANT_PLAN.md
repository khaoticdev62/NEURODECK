# Terminal AI Command Assistant Plan

## Scope

This document describes the AI command assistant that runs alongside the terminal. It covers the assistant panel, command explanation, local and AI-generated suggestions, safety filtering, and the currently unused backend autocomplete path.

## User Flow

1. The user types or runs a command in a terminal pane.
2. The user can:
   - Press the mapped controller button or click the assistant toggle to open `TerminalAssistantPanel.tsx`.
   - Select **Explain last command** to send the command context to the LLM.
   - View suggested next commands generated from local project context and/or the LLM.
3. Suggestions are filtered through the command safety classifier.
4. A blocked suggestion is never shown; dangerous/confirm suggestions trigger the confirmation modal if selected.
5. No suggestion is ever auto-executed; the user must press Enter or click Run.

## Assistant Panel

`TerminalAssistantPanel.tsx` renders:

- An explanation of the last command.
- A ranked list of suggested next commands.
- Metadata for each suggestion: source (local or AI), safety level, and a one-line description.

## Command Explanation

`TerminalScreen.tsx::explainLastCommand()`:

1. Captures the last executed command and its exit code.
2. Sends a prompt to `neurodeckApi.ai.chat()` asking for a concise explanation.
3. Streams the explanation into the assistant panel.

## Suggestion Sources

Suggestions come from two sources and are merged by `buildAssistantSuggestions()`:

### Local suggestions

`terminalUtils.ts::collectSuggestions()` inspects:

- `package.json` scripts (if a project is active).
- Detected tooling: Cargo, Python, Go, Fallow, PowerShell.
- Common shell aliases and builtins.

### AI suggestions

If the LLM is available, `neurodeckApi.ai.chat()` is asked for up to 5 shell commands relevant to the current context. The response is parsed into suggestion objects.

## Safety Filter

All suggestions are passed through `classifyTerminalCommand()` in `src/shared/terminal/terminalCommandPolicy.ts`. The classifier assigns one of:

- `safe`
- `confirm`
- `dangerous`
- `blocked`
- `unknown`

Blocked suggestions are discarded. `dangerous` and `confirm` suggestions are shown with a warning badge and require explicit confirmation before the bytes are sent to `pty_write`.

## Backend Autocomplete (Currently Unused)

`src-tauri/src/commands/mod.rs` defines a `shell_autocomplete` bridge command that streams:

- `shell_autocomplete_result`
- `shell_autocomplete_error`

The terminal UI does **not** subscribe to these events. The intended use was inline ghost-text or dropdown autocomplete inside xterm, but it was never wired.

## Operational Notes

- The assistant requires an active LLM provider. If the provider is offline, only local suggestions are shown.
- Explanation prompts are sent as regular chat messages; they are not stored as shell commands.
- Suggestion selection inserts the command text into the active pane's input but does not execute it until the user confirms.

## Known Gaps

| Gap                                             | Impact                                                  | Recommended Fix                                                                      |
| ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| No inline / ghost-text autocomplete             | Users do not get predictive command hints as they type. | Either wire `shell_autocomplete` events to xterm or remove the dead backend command. |
| Backend `shell_autocomplete` is dead code       | Maintenance burden and confusing contract.              | Delete the command or implement a frontend consumer.                                 |
| Safety classification runs only in the frontend | A compromised renderer could bypass filtering.          | Call the backend `classify_terminal_command` API before executing suggestions.       |
