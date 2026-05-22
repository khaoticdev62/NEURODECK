# Story 10.1: Add a help screen or command list

Status: done

## Story

As a User,
I want to see a list of available commands and shortcuts,
so that I can easily learn how to use the terminal.

## Acceptance Criteria

1. Implement a command (e.g., `/help`) that displays a list of available commands.
2. The list should include built-in commands and registered Lua commands.
3. Display keyboard shortcuts as well.

## Tasks / Subtasks

- [x] Add `/help` command handler in `app_wails.go` (ported from main.go).
- [x] Retrieve registered commands from `luaRunner`.
- [x] Display the help message in the chat.

## Dev Notes

- We can use `m.luaRunner.Commands` to get registered commands!
- And we can hardcode the built-in commands and shortcuts.

## Dev Agent Record
### Agent Model Used
Antigravity
