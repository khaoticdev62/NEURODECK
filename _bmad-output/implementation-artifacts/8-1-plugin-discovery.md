# Story 8.1: Plugin Discovery and Loading

Status: done

## Story

As a Developer,
I want to scan a directory for Lua files and load them on startup,
so that I can enable a plugin system.

## Acceptance Criteria

1. Create a `plugins` directory if it doesn't exist.
2. Scan the `plugins` directory for `.lua` files on application startup.
3. Load and execute each script in the Lua state.
4. Verify that plugins are loaded by printing a message or logging.

## Tasks / Subtasks

- [x] Create `plugins` directory.
- [x] Implement `LoadPlugins` function in `internal/lua` or a new `plugins` package.
- [x] Call `LoadPlugins` on startup in `app_wails.go` (ported from main.go).
- [x] Add a test plugin to verify it loads.

## Dev Notes

- We can use `os.ReadDir` to find files.
- We should create a shared Lua state or a new state for each plugin?
- If we use a shared state, plugins can interact with each other!
- Let's use a shared state for now, but be careful with global variables!

## Dev Agent Record
### Agent Model Used
Antigravity
