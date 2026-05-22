# Story 6.2: Cross-Platform Command Execution

Status: in-progress

## Story

As a User,
I want the terminal to execute commands correctly on both Windows and Linux (SteamOS),
so that I can use it on my development machine and on my Steam Deck.

## Acceptance Criteria

1. Detect the operating system at runtime.
2. Use `cmd.exe /c` on Windows and `sh -c` (or `bash -c`) on Linux.
3. Verify that commands execute successfully on both platforms.

## Tasks / Subtasks

- [x] Implement OS detection and conditional shell selection (AC: 1, 2)
- [x] Verify execution on Windows (AC: 3)
- [ ] Verify execution on Linux (Steam Deck) (AC: 3)

## Dev Notes

- We can use `runtime.GOOS` to detect the OS.
- On Windows: `exec.Command("cmd.exe", "/c", cmdStr)`
- On Linux: `exec.Command("sh", "-c", cmdStr)`

## Dev Agent Record
### Agent Model Used
Antigravity
