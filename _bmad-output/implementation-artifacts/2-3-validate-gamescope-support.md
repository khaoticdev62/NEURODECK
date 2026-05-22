# Story 2.3: Validate gamescope support

Status: ready-for-dev

## Story

As a Developer or User,
I want to ensure the application runs correctly inside Gamescope,
so that it works flawlessly in SteamOS Game Mode.

## Acceptance Criteria

1. Application launches and renders correctly in Gamescope (resolution, scaling).
2. Input is captured correctly in Gamescope.
3. No visual artifacts or crashes specific to Gamescope environment.

## Tasks / Subtasks

- [ ] Test the application inside a Gamescope session (AC: 1) <!-- Requires physical device / user action -->
- [ ] Verify input handling (keyboard and simulated controller) (AC: 2) <!-- Requires physical device / user action -->
- [x] Document any issues or special launch parameters needed (AC: 3)

## Dev Notes

- Gamescope is the compositor used in SteamOS Game Mode.
- We might need to handle specific environment variables or window sizes.
- A sample Alacritty config is available at `assets/llm-term.toml`.

## Dev Agent Record
### Agent Model Used
Antigravity
