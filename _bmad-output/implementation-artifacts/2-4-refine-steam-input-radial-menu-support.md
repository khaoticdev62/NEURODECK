# Story 2.4: Refine Steam Input / Radial Menu Support

Status: ready-for-dev

## Story

As a Steam Deck User,
I want native-feeling controls and radial menu support,
so that I can navigate and use the terminal easily without a keyboard.

## Acceptance Criteria

1. Terminal responds to Steam Input actions defined in the PRD.
2. Radial menu can trigger shortcuts like Ctrl+S, Ctrl+E.
3. Layout is accessible and legible in Gamescope fullscreen.

## Tasks / Subtasks

- [x] Define Steam Input action sets or recommended layout (AC: 1)
- [ ] Verify shortcuts can be triggered via mapped controller buttons (AC: 2) <!-- Requires physical device -->
- [ ] Test layout in Gamescope or simulated gamescope environment (AC: 3) <!-- Requires physical device -->

## Dev Notes

- Refer to PRD section 3.3 for Steam Input mappings.
- Ensure no hardcoded keys that conflict with default Steam Deck controller layouts.
- **Refinement**: Implemented `Esc` / `Ctrl+C` to cancel active generation without quitting the application, aligning with PRD Cancel Generation spec.

## Dev Agent Record
### Agent Model Used
Antigravity
