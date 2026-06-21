# Story 14.1: Confirm docs/prompt-system as canonical and retire the stale root scratch folder

Status: pending

## Story

As a Developer who almost spent this whole epic rebuilding a tool that already existed,
I want the root-level `production_code_prompt_system/` folder gone and `docs/prompt-system/` confirmed as the one real, canonical copy of PromptFlow,
so that nobody re-investigates this dead end a fourth time.

## Acceptance Criteria

1. `docs/prompt-system/` is confirmed to be a complete, working, git-tracked PromptFlow installation: full CLI (`init`/`doctor`/`list-prompts`/`inspect-repo`/`run`/`step`/`resume`/`report`/`export`/`clean`), all 5 providers (`manual`/`anthropic`/`gemini`/`ollama`/`openai`), a full test suite, and its own docs (`README.md`, `docs/{SETUP,CONFIGURATION,PROVIDERS,WORKFLOWS,SAFETY,TROUBLESHOOTING}.md`) — verified by actually installing it (`uv venv` + `uv pip install -e ".[dev]"`) and running `promptflow doctor` to a clean "All checks passed" result, not by file-listing alone.
2. The root-level `production_code_prompt_system/` folder (and the sibling `production_code_prompt_system.zip`) is deleted. Its `prompts/*.md` content was confirmed byte-identical to `docs/prompt-system/prompts/*.md` before deletion — nothing unique was lost.
3. `.gitignore`'s now-meaningless `production_code_prompt_system/` rule (its own comment said the source had already moved to `docs/` — this folder was always just leftover venv/cache debris from before that move) is removed.
4. This story's finding is recorded so a future audit doesn't repeat the investigation: an earlier pass at this epic assumed the root folder's missing engine source meant the *entire* PromptFlow tool needed to be rebuilt from scratch (including a new Anthropic-API provider), before discovering first a recovered prompt-pack-only zip, and only then the real, complete, already-committed implementation at `docs/prompt-system/`. See `docs/PRODUCTION_PROMPT_PACK_HANDOFF.md`.

## Tasks / Subtasks

- [ ] Install `docs/prompt-system` with `uv` and run `promptflow doctor`/`list-prompts` to confirm it's genuinely functional, not just present.
- [ ] Diff `production_code_prompt_system/prompts/` against `docs/prompt-system/prompts/` to confirm no unique content before deleting.
- [ ] Delete `production_code_prompt_system/` and `production_code_prompt_system.zip`.
- [ ] Remove the obsolete `.gitignore` rule.
- [ ] Write `docs/PRODUCTION_PROMPT_PACK_HANDOFF.md` recording the investigation trail and the corrected understanding.

## Dev Notes

- This story exists specifically because of how often this epic's framing changed before landing on the truth. Three sequential investigations were needed: (1) initial false assumption — the root folder's missing source meant the whole tool was lost and needed full reconstruction; (2) correction — a sibling zip revealed the missing piece was actually just the static prompt pack, not engine code, because the design was misread as a broken automation pipeline rather than a paste-into-an-AI-tool library; (3) final correction — `docs/prompt-system/.gitignore`'s own comment ("Python venv and caches left behind after source moved to docs/") was the answer the whole time, and a real, complete, working CLI was sitting one directory up, fully committed, the entire session.
- The lesson for future audits of "missing" code in this repo: check `.gitignore` comments near the affected path, and check sibling/parent directories for a `docs/` or similarly-named relocation before assuming source is unrecoverable.

## Dev Agent Record
### Agent Model Used
[unassigned]
