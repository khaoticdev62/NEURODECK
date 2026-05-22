# Story 8.2: Register Custom Commands

Status: done

## Story

As a User,
I want plugins to be able to register custom commands,
so that I can extend the terminal's capabilities.

## Acceptance Criteria

1. Expose a `registerCommand` function to Lua.
2. The function should take a command name and a Lua callback function.
3. When the user types the command in the chat, the callback should be executed.
4. Verify that a plugin can register a command and it works.

## Tasks / Subtasks

- [x] Expose `registerCommand` to Lua in `Runner`.
- [x] Store registered commands in a map in `Runner` or `model`.
- [x] Check input for registered commands in `SendCommand` (Wails).
- [x] Add a test plugin that registers a command.

## Dev Notes

- We can use a map in Go: `map[string]*lua.LFunction`!
- When the user types something, we check if it matches a key in the map!
- If it does, we call the Lua function!

## Dev Agent Record
### Agent Model Used
Antigravity
