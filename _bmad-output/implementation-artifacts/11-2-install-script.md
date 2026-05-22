# Story 11.2: Create installation script for SteamOS

Status: done

## Story

As a Developer,
I want to create an installation script for SteamOS,
so that users can easily install and set up the terminal on their Steam Deck.

## Acceptance Criteria

1. Create a `bash` script (e.g., `install.sh`) that checks for Go.
2. It should build the binary (or use pre-built) and place it in a reasonable location.
3. Create necessary directories for sessions, exports, and memory.

## Tasks / Subtasks

- [x] Create `install.sh` in the root directory.
- [x] Update `install.sh` to support Wails (build or copy).
- [x] Create necessary directories in user's home folder.

## Dev Notes

- Since we are developing on Windows, we can't easily test it here!
- But we can write a standard bash script that should work on SteamOS (Arch Linux).
- SteamOS has a read-only root filesystem by default, so we should install things in the user's home directory! (`/home/deck`).

## Dev Agent Record
### Agent Model Used
Antigravity
