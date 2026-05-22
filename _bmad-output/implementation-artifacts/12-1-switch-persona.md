# Story 12.1: Allow switching personas via command

Status: done

## Story

As a User,
I want to switch AI personas using a command (e.g., `/persona <name>`),
so that I don't have to cycle through them with `Ctrl+P`.

## Acceptance Criteria

1. Implement `/persona <name>` command.
2. If the name matches an existing persona, switch to it.
3. If no name is provided, list available personas.
4. Update the status bar with the new persona name.

## Tasks / Subtasks

- [x] Add `/persona` command handler in `main.go`.
- [x] Implement logic to find persona by name.
- [x] Update status bar and display message.

## Dev Notes

- We already have `Ctrl+P` logic, we can reuse most of it!
- We need to access the `personas` list.

## Dev Agent Record
### Agent Model Used
Antigravity
