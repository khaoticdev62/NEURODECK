# Story 8.3: Hook into Events

Status: done

## Story

As a Developer,
I want plugins to be able to hook into application events,
so that they can react to system changes and messages.

## Acceptance Criteria

1. Expose a `registerHook` function to Lua.
2. Support hooks like `onMessage` or `onAIResponse`.
3. Trigger these hooks at the appropriate times in the Go code.
4. Verify that a plugin can hook into an event and it works.

## Tasks / Subtasks

- [x] Expose `registerHook` to Lua in `Runner`.
- [x] Store hooks in a map of slices: `map[string][]*lua.LFunction`.
- [x] Call hooks in `app_wails.go` (ported from main.go).
- [x] Add a test plugin that uses a hook.

## Dev Notes

- Events can be: `onMessage` (when a message is added), `onAIResponse` (when AI completes).
- This allows plugins to modify messages or trigger actions automatically!

## Dev Agent Record
### Agent Model Used
Antigravity
