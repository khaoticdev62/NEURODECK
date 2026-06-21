# Story 14.5: Document the system and cross-link it from CLAUDE.md

Status: pending

## Story

As a Developer (or future Claude Code session) discovering this repo for the first time,
I want PromptFlow documented and discoverable from `CLAUDE.md`,
so that this epic's three rounds of mistaken-identity investigation (assume it's lost → find a prompt-pack-only zip → find the real tool already in `docs/`) never has to happen again.

## Acceptance Criteria

1. `CLAUDE.md`'s "Deeper Docs" table gains a row pointing at `docs/prompt-system/README.md` (the tool's own documentation, not duplicated), plus a one-line mention of the in-app Prompt Lab pack and the `npm run prompt-pack:load` shortcut.
2. `docs/PRODUCTION_PROMPT_PACK_HANDOFF.md` accurately reflects the final, correct understanding (canonical tool at `docs/prompt-system/`, root scratch folder retired, in-app pack + npm shortcut as complementary surfaces) — not the earlier, superseded framing from before the real tool was found.
3. The relationship between the user's global `~/.claude/CLAUDE.md` audit mega-prompt and `docs/prompt-system/prompts/01_codebase_audit_refinement.md` is noted as a finding (likely the same lineage, given near-identical structure and rules) without editing the global file.

## Tasks / Subtasks

- [ ] Add the `CLAUDE.md` Deeper Docs row.
- [ ] Rewrite `docs/PRODUCTION_PROMPT_PACK_HANDOFF.md` to reflect the corrected, final state of this epic.
- [ ] Record the global-CLAUDE.md lineage observation.

## Dev Notes

- Keep this additive/orienting — `docs/prompt-system/README.md` and its own `docs/` subfolder already document the tool thoroughly; this story's job is making it findable from the top, not rewriting it.

## Dev Agent Record
### Agent Model Used
[unassigned]
