# Story 5.1: Theme Engine

Status: done

## Story

As a User,
I want to switch between different color themes,
so that I can customize the terminal's appearance to my liking or mood.

## Acceptance Criteria

1. UI supports at least two predefined themes (e.g., Default/Cyan and Matrix/Green).
2. User can switch themes via a shortcut or command (e.g., Ctrl+T).
3. Theme settings (colors) are applied to the viewport border, status bar, and input field.

## Tasks / Subtasks

- [x] Define Theme struct and a set of predefined themes in code or config (AC: 1)
- [x] Add a shortcut or command to cycle/select themes (AC: 2)
- [x] Update UI components to use colors from the active theme (AC: 3)

## Dev Notes

- The app currently uses `cfg.Theme.PrimaryColor` during initialization.
- We need to ensure that switching themes updates the LipGloss styles dynamically across all components (Viewport, Input, StatusBar).

## Dev Agent Record
### Agent Model Used
Antigravity
