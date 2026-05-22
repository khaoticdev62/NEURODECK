# Story 5.3: Performance Optimization

Status: done

## Story

As a Developer or User,
I want the terminal to remain responsive even with long chat histories,
so that I can have extended sessions without lag.

## Acceptance Criteria

1. UI does not lag significantly when receiving new chunks even with >100 messages.
2. We implement a strategy to reduce markdown rendering overhead (e.g., rendering only the active message or caching).

## Tasks / Subtasks

- [x] Profile or measure rendering time with long history (AC: 1)
- [x] Implement an optimization strategy (e.g., partial rendering or caching) (AC: 2)
- [x] Verify responsiveness (AC: 1)

## Dev Notes

- Currently, we call `m.renderMarkdown` on the entire joined messages list every time a chunk arrives!
- This is an O(N) operation per chunk, leading to O(N^2) over a session.
- We can optimize by rendering chunks individually or caching the rendered output of previous messages!

## Dev Agent Record
### Agent Model Used
Antigravity
