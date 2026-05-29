# Story 10.6: Universal Adapter Ecosystem

Status: done

## Story

As a Developer,
I want the Hermes framework to support multiple host environments,
so that plugins can run in CLI, Node, Tauri, Web, and Generic contexts seamlessly.

## Acceptance Criteria

1. Implement specific adapters for different execution environments.
2. Wire up the JSON-RPC/stdin bridge for cross-process communication.

## Tasks / Subtasks

- [x] Build CLI adapter.
- [x] Build Tauri adapter.
- [x] Build Node adapter.
- [x] Implement standard generic fallback adapter.

## Dev Notes

- Included in the Hermes MVP rollout.
- Wraps the `io.stdin` and `io.stdout` where appropriate for the environment.

## Dev Agent Record
### Agent Model Used
Antigravity
