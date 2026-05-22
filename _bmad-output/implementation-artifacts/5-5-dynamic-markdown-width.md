# Story 5.5: Dynamic Markdown Width

Status: done

## Story

As a Developer or User,
I want markdown rendering to adapt to viewport width,
so that content fits perfectly on screen without horizontal scrolling or awkward wrapping.

## Acceptance Criteria

1. Markdown rendering uses the current viewport width instead of hardcoded 80.
2. Resizing the window re-renders the markdown with the new width.

## Tasks / Subtasks

- [x] Update `renderMarkdown` to accept a width parameter (AC: 1)
- [x] Pass `m.layout.Viewport.Width` (or calculated width) to `renderMarkdown` (AC: 1)
- [x] Ensure `WindowSizeMsg` triggers a re-render with the new width (AC: 2)

## Dev Notes

- Glamour's `WithWordWrap` option should be updated dynamically.
- We might need to recreate the `TermRenderer` on resize or use a different approach if recreating is too slow.

## Dev Agent Record
### Agent Model Used
Antigravity
