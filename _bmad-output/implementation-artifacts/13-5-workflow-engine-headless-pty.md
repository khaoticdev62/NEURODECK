# Story 13.5: Wire headless PTY execution into the workflow engine

Status: pending

## Story

As a User running automated workflows (e.g. via cron-triggered or scheduled pipelines) without an active UI session,
I want "PTY Command" workflow nodes to actually execute the configured command,
so that headless/bridge-mode workflows produce real output instead of a placeholder string.

## Acceptance Criteria

1. The `"pty_cmd"` node handler in `src-tauri/src/workflow_engine.rs` (lines ~459-463) no longer returns the literal `format!("[PTY not available in headless mode] {}", cmd)` placeholder.
2. When running in headless/bridge mode, executing a `pty_cmd` node actually runs the configured `command` value and returns its real stdout/stderr output (or a structured success/failure result).
3. The implementation reuses the existing PTY infrastructure (`src-tauri/src/pty_manager.rs`, already used by the Terminal and SSH tabs) rather than introducing a second, parallel process-execution mechanism — OR, if a true interactive PTY is infeasible in headless mode, falls back to a non-interactive subprocess execution (e.g. `tokio::process::Command`) that still returns real output, with that distinction clearly documented.
4. Errors from command execution (non-zero exit, spawn failure, timeout) are surfaced as real `Err(...)` results from the node handler, not swallowed or replaced with another placeholder.
5. The workflow engine's existing node-execution timeout/cancellation behavior (if any exists for other node types) is applied consistently to `pty_cmd` nodes too.

## Tasks / Subtasks

- [ ] Read `src-tauri/src/pty_manager.rs` to determine whether its `HashMap`-keyed session model is reusable in a headless context (no `app_handle`/no frontend listening for `pty_output` events) or whether it's tightly coupled to UI event emission.
- [ ] Read `src-tauri/src/workflow_engine.rs` around lines 440-470 to understand the full node-execution dispatch (`"file_op"`, `"pty_cmd"`, `"memory"` branches) and how `bridge.rs`'s `EventEmitter` trait (already imported at line 10: `use crate::bridge::EventEmitter;`) is used elsewhere in this file — this may be the right abstraction to emit PTY output events even in headless mode.
- [ ] Decide: (a) spawn a real (non-interactive) PTY session via `pty_manager` and capture its output synchronously for the workflow node's purposes, or (b) use a simpler `tokio::process::Command::new(shell).arg("-c").arg(cmd).output()` subprocess call when no interactive terminal is actually needed by workflow automation. Recommend (b) for simplicity unless workflows are expected to need genuinely interactive PTY behavior (e.g. programs that detect TTY presence and change behavior).
- [ ] Implement the chosen approach in the `"pty_cmd"` branch, replacing the placeholder `Ok(format!(...))` with real command execution and either `Ok(stdout)` or `Err(stderr/error)`.
- [ ] Apply a reasonable execution timeout (check whether other workflow node types in this file already define one to reuse, e.g. for `"file_op"` or HTTP-calling nodes) to prevent a hung command from blocking the workflow pipeline indefinitely.
- [ ] Update the misleading comment at line 459-460 ("PTY command nodes require the PTY system which is not wired in bridge mode. Return a descriptive placeholder.") to describe the actual new behavior.
- [ ] Manual verification: build/export a workflow containing a PTY Command node (per `ANTIGRAVITY_HANDOFF.md`'s "Workflow Visual Builder (P0-2)" entry, the workflow builder already supports adding PTY Command nodes in the UI), run it via the existing bridge/headless execution path (`workflow_run`), and confirm real command output appears in the result instead of the placeholder string.

## Dev Notes

- This gap is specific to **headless/bridge mode** — confirm whether `pty_cmd` nodes already work correctly when a workflow is run from inside the normal UI session (with a live `app_handle`), since the comment implies the gap is bridge-mode-specific, not universal. If UI-mode execution is already real, this story should be scoped narrowly to closing the bridge-mode gap using the same approach, not duplicating already-working UI-mode logic.
- `EventEmitter` trait from `bridge.rs` is already imported in this file — likely the intended mechanism for emitting command output/progress in a way that works whether or not a UI is attached. Investigate before introducing a separate ad hoc output-capture mechanism.

## Dev Agent Record
### Agent Model Used
[unassigned]
