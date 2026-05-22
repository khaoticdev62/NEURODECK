# Story 7.3: Implement Lua Script Execution from Chat

Status: done

## Story

As a User,
I want to execute Lua scripts directly from the chat,
so that I can automate tasks and interact with the system.

## Acceptance Criteria

1. Detect ````lua ... ```` blocks in AI responses or user input.
2. Execute the Lua script using the `lua` package.
3. Display the output in the chat.
4. Support a command or shortcut to trigger execution (e.g., Ctrl+B).

## Tasks / Subtasks

- [x] Implement detection of ````lua ... ```` blocks.
- [x] Implement `Ctrl+B` shortcut to execute the pending Lua script (Ctrl+L was taken).
- [x] Connect `RunScript` with a real `executeCmd` implementation (using `runCommandSync`).
- [x] Display script output in the chat.

## Dev Notes

- We can use a similar approach to `Ctrl+X` for terminal commands.
- We should store `pendingLuaScript` in the model.
- We need to handle security: prompt the user before execution!

## Dev Agent Record
### Agent Model Used
Antigravity
