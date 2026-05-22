# Story 7.2: Expose Go Functions to Lua

Status: done

## Story

As a Developer,
I want to expose Go functions to the Lua runtime,
so that scripts can interact with the application and system.

## Acceptance Criteria

1. Expose a function to execute terminal commands from Lua.
2. Expose a function to read/write application state (if applicable).
3. Verify that a Lua script can call these functions.

## Tasks / Subtasks

- [x] Expose `runCommand` or equivalent to Lua.
- [x] Expose a function to log messages to the chat (via print override).
- [x] Add a test to verify that Lua can call these functions.

## Dev Notes

- We can use `L.SetGlobal("execute", L.NewFunction(...))` to expose a function.
- The function should take arguments from Lua and return values if needed.
- We should be careful about security when exposing command execution!

## Dev Agent Record
### Agent Model Used
Antigravity
