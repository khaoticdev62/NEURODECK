# Story 10.3: Add a "Loading" indicator for AI responses

Status: done

## Story

As a User,
I want to see a loading indicator when the AI is generating a response,
so that I know the system is working and didn't freeze.

## Acceptance Criteria

1. Display a spinner or text indicator when `m.isLoading` is true.
2. The indicator should disappear when the response starts streaming or finishes.
3. It should be placed in the status bar or as a special message in the chat.

## Tasks / Subtasks

- [x] Add a simple text indicator in the status bar.
- [x] Update `main.js` to show the indicator when waiting for response.
- [x] Verify by sending a message and watching the indicator.

## Dev Notes

- We can use `github.com/charmbracelet/bubbles/spinner` if we want a real spinner!
- Or we can just use a simple text indicator like `Thinking...` in the status bar!
- Let's start with a simple text indicator in the status bar as it's easier and fits the terminal aesthetic!

## Dev Agent Record
### Agent Model Used
Antigravity
