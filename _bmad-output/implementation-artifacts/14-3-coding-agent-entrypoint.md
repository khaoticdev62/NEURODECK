# Story 14.3: Lightweight coding-agent entry point (npm script) for quick prompt loading

Status: pending

## Story

As Claude Code (or a developer) working in this repo,
I want a zero-dependency way to print a specific specialist prompt by number or short name without installing Python,
so that loading "the security prompt" into the current session is a one-liner — complementary to, not a replacement for, the real PromptFlow CLI's full automated-run capability (Story 14.2).

## Acceptance Criteria

1. `npm run prompt-pack:load -- <number-or-name>` prints the full content of the matching `docs/prompt-system/prompts/NN_*.md` file.
2. No argument defaults to prompt `14` (AI Agent Orchestration); `release`/`certification`/`15` loads prompt `15` (Final Release Certification) — both also append `docs/prompt-system/QUICKSTART.md`'s recommended-usage text after the prompt content.
3. An unrecognized argument prints a clear error listing every valid stage number/filename and every short-name alias, then exits non-zero — never a silent no-op or crash.
4. The script reads from `docs/prompt-system/prompts/` (the canonical location) — not any other copy.

## Tasks / Subtasks

- [ ] Implement `scripts/promptpack/load-prompt.mjs` with the alias table, default/release special-casing, and error path.
- [ ] Wire `npm run prompt-pack:load` in `package.json`.
- [ ] Manually verify: no-arg default, `release` alias, `security` short name, stage number (`03`), and a bad input all behave per the AC above.

## Dev Notes

- This intentionally stays simple — it's a `cat`-with-aliases, not a second workflow engine. The real PromptFlow CLI (Story 14.2) already owns sequencing, state, redaction, and report generation; duplicating that here would just create two things to keep in sync.
- A project-local Claude Code "skill" mechanism (e.g. `.claude/skills/<name>/SKILL.md`) was investigated as a possible nicer entry point but no such convention was confirmed to exist or be supported in this repo/environment at the time of writing — the npm script is the documented, verifiable fallback. Revisit if a confirmed skill-authoring mechanism becomes available.

## Dev Agent Record
### Agent Model Used
[unassigned]
