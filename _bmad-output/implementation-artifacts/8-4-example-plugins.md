# Story 8.4: Create Example Plugins

Status: done

## Story

As a Developer,
I want to create example plugins,
so that users can learn how to use the plugin system.

## Acceptance Criteria

1. Create a few example plugins in the `plugins` directory.
2. The plugins should demonstrate command registration and hooks.
3. Document the plugins and how to use them.

## Tasks / Subtasks

- [x] Create `plugins/ip_lookup.lua` (registers a command to get IP info).
- [x] Create `plugins/auto_responder.lua` (uses hook to respond to specific keywords).
- [x] Update documentation.

## Dev Notes

- `ip_lookup.lua` can use `curl` or `wget` via `execute`!
- `auto_responder.lua` can listen for "help" or similar and print info!

## Dev Agent Record
### Agent Model Used
Antigravity
