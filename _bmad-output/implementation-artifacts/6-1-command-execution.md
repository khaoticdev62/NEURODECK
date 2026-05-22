# Story 6.1: Terminal Command Execution

Status: done

## Story

As a User,
I want the AI to be able to suggest terminal commands and for me to be able to execute them easily,
so that I can use the AI as a co-pilot for terminal tasks.

## Acceptance Criteria

1. Detect bash code blocks in AI responses (```bash ... ```).
2. Prompt the user for approval before executing any command.
3. Execute the command and capture stdout/stderr.
4. Feed the output back to the AI or display it in the chat.

## Tasks / Subtasks

- [x] Implement code block detection in AI responses (AC: 1)
- [x] Implement User Approval UI (e.g., Ctrl+X to execute) (AC: 2)
- [x] Implement command execution using `os/exec` (AC: 3)
- [x] Implement feeding output back to the session (AC: 4)

## Dev Notes

- We will use a parsing approach (regex on markdown code blocks) rather than native function calling to keep the provider interface simple and compatible with any backend.
- Security: NEVER execute commands without user approval!

## Dev Agent Record
### Agent Model Used
Antigravity
