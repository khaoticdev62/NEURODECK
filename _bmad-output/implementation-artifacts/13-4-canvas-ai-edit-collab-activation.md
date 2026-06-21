# Story 13.4: Activate Canvas AI Edit and Collaboration buttons

Status: pending

## Story

As a User working in the Canvas view,
I want the AI Edit and Collaboration buttons to actually work instead of showing "coming soon",
so that I can use LLM-assisted editing and multi-peer collaboration that the backend already supports.

## Acceptance Criteria

1. The Canvas Collaboration button (`src/renderer/features/canvas/CanvasView.tsx` ~line 191, `id="canvas-collab-btn"`) no longer shows the "soon" badge or the `toast("Collaboration requires an active Workspace session", "info")` stub — clicking it opens a real collaboration flow (host/join) that calls the existing `canvas_collab_host` / `canvas_collab_join` Tauri commands (already implemented in `src-tauri/src/commands/mod.rs` ~lines 9022-9070, backed by `src-tauri/src/canvas_collab.rs`).
2. The collaboration flow surfaces session status using the existing `canvas_collab_status` command (~line 5659) and allows ending the session via `canvas_collab_stop` (~line 5674).
3. Canvas edits are broadcast to peers using the existing `canvas_collab_send` / `canvas_collab_broadcast` commands (~lines 5699, 5727) and incoming peer edits update the local editor on the `canvas_collab_event` emission (`canvas_collab.rs` lines 107, 130, 169, 277).
4. The Canvas AI Edit button (~line 177, `id="canvas-ai-edit-btn"`) no longer shows the "soon" badge or the `toast("AI Edit requires an active Workspace session", "info")` stub — clicking it sends the current canvas content + a user instruction to the active LLM provider and applies the returned edit to the canvas content.
5. AI Edit requires a real backend command (does not yet exist) that accepts canvas content + language + an editing instruction, and returns edited content — this command must be implemented as part of this story, not assumed to pre-exist.
6. Both buttons' `aria-label` and `title` attributes are updated to remove "coming soon" / "requires active session" language once functional.
7. Neither feature is gated behind a fake "Workspace session" concept that doesn't otherwise exist in the app — if session-scoping is genuinely required (e.g. collaboration needs a session ID to disambiguate multiple canvases), that concept must be real and visible elsewhere in the UI, not an undocumented blocker invented only to justify the stub.

## Tasks / Subtasks

- [ ] Audit `CanvasView.tsx` lines 165-200 to confirm there is no existing real "Workspace session" gating concept elsewhere in the codebase that the original stub copy was referring to — if one exists, document it; if not, remove that language entirely as it appears to be placeholder text.
- [ ] Collaboration: design a minimal UI (modal or panel) triggered by `canvas-collab-btn` offering "Host" (calls `canvas_collab_host(port)`) and "Join" (calls `canvas_collab_join(addr)`) actions, surfacing the returned port/peer info.
- [ ] Collaboration: wire `canvas_collab_status` polling or event-driven updates to show connection state (idle/host/guest, peer count) in the Canvas toolbar near the button.
- [ ] Collaboration: wire canvas editor `onChange`/`oninput` to call `canvas_collab_broadcast` (debounced) when an active session exists.
- [ ] Collaboration: subscribe to the `canvas_collab_event` event (emitted from `canvas_collab.rs`) on the frontend and apply incoming peer content updates to the canvas editor state.
- [ ] Collaboration: wire a "Stop/Leave" action to `canvas_collab_stop`.
- [ ] AI Edit: design the new backend command (e.g. `canvas_ai_edit(content: String, lang: String, instruction: String) -> Result<String, String>`) in `src-tauri/src/commands/mod.rs`, routing to the active `LlmProvider`'s non-streaming completion method with a system prompt instructing it to return only the edited code/content.
- [ ] AI Edit: register the new command in the Tauri invoke handler / `commands/mod.rs` dispatch table (follow the existing pattern used for other `canvas_*` commands).
- [ ] AI Edit: add the corresponding frontend bridge method in `src/renderer/services/bridge/domains/` (likely a `canvas.ts` domain file, or extend an existing one) and wire `canvas-ai-edit-btn`'s `onClick` to open a small instruction-input prompt, call the command, and replace/diff the canvas content with the result.
- [ ] Update `aria-label`/`title` text on both buttons and remove the `<span>...soon</span>` badge elements (lines ~184-186, ~198-200) once each is live.
- [ ] Manual verification: open two NEURODECK instances on the same LAN, host from one, join from the other, confirm live edit sync. Separately, verify AI Edit returns a sensible LLM-modified canvas result for at least HTML/CSS/JS and Python content.

## Dev Notes

- Collaboration backend is NOT a gap — `canvas_collab_host`, `canvas_collab_join`, `canvas_collab_status`, `canvas_collab_send`, `canvas_collab_broadcast`, `canvas_collab_stop` all already exist and are functional (confirmed by reading `commands/mod.rs` and `canvas_collab.rs`). This is corroborated by `ANTIGRAVITY_HANDOFF.md`'s "Live Canvas Collaboration (C19)" line, which already marks the backend as shipped. This story is frontend-only wiring for collaboration.
- AI Edit has no backend equivalent today — this is genuinely new backend work, not just UI wiring, despite both buttons having identical-looking stub code in the frontend. Do not assume symmetry between the two halves of this story.
- Consider whether AI Edit should show a diff/preview before applying the LLM's edit, versus applying it directly — a direct in-place replacement risks destroying user work if the LLM mangles the content. Recommend at minimum an undo-to-previous-content action.

## Dev Agent Record
### Agent Model Used
[unassigned]
