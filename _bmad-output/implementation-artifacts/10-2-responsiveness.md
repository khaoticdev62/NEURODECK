# Story 10.2: Improve layout responsiveness

Status: done

## Story

As a User,
I want the terminal layout to respond gracefully to resizing,
so that I can use it in different window sizes or on the Steam Deck screen.

## Acceptance Criteria

1. Handle window resizing gracefully (CSS).
2. Ensure the viewport content scrolls smoothly.
3. Prevent layout breakage when the window is too small.

## Tasks / Subtasks

- [x] Use CSS Flexbox/Grid for responsive layout.
- [x] Improve scrolling behavior in `main.js` (smart scroll).
- [x] Verify with resizing.

## Dev Notes

- We already handle `tea.WindowSizeMsg` in some way, but we need to make sure the messages are re-rendered!
- Glamour rendering depends on the width, so we must re-render all messages when width changes!

## Dev Agent Record
### Agent Model Used
Antigravity
