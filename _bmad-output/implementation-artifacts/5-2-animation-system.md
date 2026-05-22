# Story 5.2: Animation System

Status: done

## Story

As a User,
I want subtle animations in the UI,
so that the experience feels more dynamic and polished without being distracting.

## Acceptance Criteria

1. Implement at least one subtle animation (e.g., pulsing loader, smooth scroll, or blinking element).
2. The animation does not use complex Matrix or Glitch effects (per user request).
3. Performance remains good.

## Tasks / Subtasks

- [x] Define the type of subtle animation to implement (AC: 1)
- [x] Implement the animation using Bubble Tea ticks (AC: 1)
- [x] Verify performance (AC: 3)

## Dev Notes

- User requested "minus (Matrix/Glitch effects)".
- Implemented a **Pulsing Border** effect that triggers when the AI is generating a response.
- Each theme has a custom list of pulse colors to create a smooth breathing effect.

## Dev Agent Record
### Agent Model Used
Antigravity
