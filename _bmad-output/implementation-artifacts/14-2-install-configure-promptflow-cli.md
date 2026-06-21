# Story 14.2: Install and configure the real PromptFlow CLI against this repo

Status: pending

## Story

As a Developer who wants to actually run an audit,
I want `docs/prompt-system`'s PromptFlow CLI installed and configured with `target_repo` pointed at the NEURODECK repo root,
so that `promptflow run`/`promptflow inspect-repo` etc. work against this codebase, not just in isolation inside its own folder.

## Acceptance Criteria

1. `docs/prompt-system` has a local virtual environment installable via `uv venv && uv pip install -e ".[dev]"` (or `pip install -e ".[dev]"` if `uv` isn't available), with `promptflow doctor` reporting all checks passed.
2. A `promptflow.yaml` exists (copied from `promptflow.yaml.example`, both already gitignored per `docs/prompt-system/.gitignore`) with `target_repo` set so `promptflow inspect-repo`/`promptflow run` operate on the NEURODECK repo root, not just `docs/prompt-system/` itself.
3. `promptflow list-prompts` and `promptflow inspect-repo --repo <neurodeck-root>` both succeed and return sane output when run from `docs/prompt-system/`.
4. Provider API keys (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY`) are documented as environment variables the user sets themselves if they want a non-`manual` provider — never hardcoded or committed anywhere, consistent with this repo's existing secret-handling conventions (`GEMINI_API_KEY` env-var pattern, `infrastructure/secrets.rs` keychain pattern).

## Tasks / Subtasks

- [ ] Install the package and confirm `promptflow doctor` passes.
- [ ] Configure `promptflow.yaml`'s `target_repo` to point at the NEURODECK repo root (relative path from `docs/prompt-system/`, e.g. `../../`) so a real run actually audits the app, not the prompt-system tool's own small folder.
- [ ] Run `promptflow inspect-repo` and `promptflow list-prompts` against the configured target and confirm sane output.
- [ ] Document the provider env-var requirements in this story and in Story 14.5's documentation pass.

## Dev Notes

- This is local developer setup, not something to commit beyond the (already-gitignored) `promptflow.yaml`/`.venv`. Don't fight the existing `.gitignore` rules in `docs/prompt-system/.gitignore` — they already correctly exclude `promptflow.yaml`, `.venv/`, and `promptflow_runs/`.
- Verified working in this session: `uv venv .venv && uv pip install -e ".[dev]" --python .venv` followed by `.venv/Scripts/python -m promptflow doctor` (Windows) reports 6/6 checks passed.

## Dev Agent Record
### Agent Model Used
[unassigned]
