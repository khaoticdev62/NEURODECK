# Story 6.6: Game Detection & Context

Status: done

## Story

As a User,
I want the AI to know what game I am playing,
so that it can provide relevant tips and context without me telling it.

## Acceptance Criteria

1. Detect the currently running game (or Steam AppID) if possible.
2. Provide this information to the AI as context (e.g., in the system prompt or prepended to user prompt).
3. Fallback gracefully if no game is detected or if running on Windows.

## Tasks / Subtasks

- [x] Research reliable ways to detect running games on Steam Deck (SteamOS) (AC: 1)
- [x] Implement game detection logic (AC: 1)
- [x] Implement passing game context to the AI (AC: 2)
- [x] Implement Windows fallback / manual selection (AC: 3)

## Dev Notes

- This is exploratory. We need to find where SteamOS stores the current game state.
- Possible sources: Steam logs, `/proc` filesystem, or gamescope environment variables.
- On Windows, we can check running processes for `steam_app_...` or similar.

## Dev Agent Record
### Agent Model Used
Antigravity
