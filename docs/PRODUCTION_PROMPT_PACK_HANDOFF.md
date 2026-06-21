# PromptFlow / Production Code Prompt System — Handoff

> Epic 14: Production Code Prompt System — Activate PromptFlow. This epic went through three rounds of mistaken identity before landing on the truth. This doc records the final, correct state and the investigation trail so it's never re-walked.

---

## What This Actually Is

**`docs/prompt-system/`** is the canonical, complete, git-tracked **PromptFlow** project: a Python CLI tool (`promptflow`, installed via `pip`/`uv`) that runs a structured 15-stage audit/refinement/security/testing/release workflow against a codebase, plus the 15 specialist prompt files it's built around.

- Full CLI: `init`, `doctor`, `list-prompts`, `inspect-repo`, `run`, `step`, `resume`, `report`, `export`, `clean`.
- 5 provider backends: `manual` (no API key, default — write payload to a file, paste into any AI tool, paste the response back), `anthropic`, `openai`, `gemini`, `ollama`.
- Safety-first: report-only by default, secret redaction before anything leaves the machine, git checkpoint branches before patches, command allowlist with confirmation gates.
- Full test suite (`tests/test_*.py`, 11 files) and its own docs (`README.md`, `docs/{SETUP,CONFIGURATION,PROVIDERS,WORKFLOWS,SAFETY,TROUBLESHOOTING}.md`).
- Verified working in this session: `uv venv .venv && uv pip install -e ".[dev]" --python .venv` then `promptflow doctor` → **6/6 checks passed**.

The 15 specialist prompts (`docs/prompt-system/prompts/01_*.md` through `15_*.md`) are also independently useful as static "paste into your AI coding tool" mega-prompts:

| # | Prompt | Use It For |
|---:|---|---|
| 01 | Codebase Audit + Refinement | Broad repo audit, quality review, production-readiness discovery |
| 02 | Bug-Fix + Implementation | Fix confirmed bugs, crashes, failing tests, runtime errors |
| 03 | Security Hardening + OWASP | Secrets, auth, input validation, OWASP risks, frontend exposure |
| 04 | Testing Expansion + Regression Coverage | Unit, integration, E2E, regression, edge-case coverage |
| 05 | Performance + Efficiency Optimization | Speed, memory, bundle size, query efficiency, hot paths |
| 06 | Deep Codebase Refactor | God files, duplication, type safety, maintainability, cleanup |
| 07 | Architecture Recovery + Modularization | Broken structure, module boundaries, dependency direction |
| 08 | Dependency Hygiene + Build System Optimization | Package cleanup, lockfiles, scripts, build reliability |
| 09 | CI/CD + Release Engineering | GitHub Actions, build gates, artifacts, releases, rollback |
| 10 | Documentation + Developer Handoff | README, setup, architecture docs, troubleshooting, handoff |
| 11 | UX/UI + Accessibility Code Quality | Components, layout, accessibility, keyboard/controller navigation |
| 12 | Observability + Runtime Reliability | Logging, errors, retries, timeouts, health checks, incident readiness |
| 13 | Data Layer + API Contract Quality | APIs, schemas, DTOs, database access, migrations, contracts |
| 14 | AI Agent Orchestration + Repo Task Execution | Master controller — selects/sequences the other 13 |
| 15 | Final Production Readiness + Release Certification | Final go/no-go release gate |

The user's global `~/.claude/CLAUDE.md` "AAAA Codebase & Application Audit Report" mega-prompt reads as a derivative of prompt `01` (same "no fake commands/APIs/files" rules, same audit-category structure) — almost certainly the same lineage. Noted here as a finding; the global file was not edited.

---

## Three Rounds of Getting This Wrong (read this before touching this area again)

This folder structure caused real wasted effort. Recorded in full so it isn't repeated a fourth time:

1. **First assumption (wrong)**: a root-level `production_code_prompt_system/` folder contained only `promptflow.yaml`, `.mypy_cache`/`.ruff_cache` build caches, `src/promptflow.egg-info/` (a module-name manifest, no actual code), and a `promptflow_runs/` history with 14 runs — every one using the `manual` provider with an **empty** `responses/` directory (no run ever completed). This looked like a fully broken automation tool whose Python source (`cli.py`, `runner.py`, `providers/*.py`, etc.) was permanently lost. The first pass at this epic planned to **reconstruct the entire engine from scratch**, including a new Anthropic API provider — a multi-week-shaped plan for what turned out to be nothing.

2. **Second discovery (partial correction)**: a sibling `production_code_prompt_system.zip` at the repo root turned out to contain `prompts/01–15_*.md` plus `README.md`/`QUICKSTART.md`/`INDEX.md`/`MODULE_MAP.md` — the actual specialist prompt content, never extracted to where `promptflow.yaml`'s `prompt_pack: ./prompts` pointed. This reframed the system as "a static prompt library for pasting into an AI tool, not a broken pipeline" — much closer to true, but still missed something.

3. **Third discovery (the actual truth)**: `production_code_prompt_system/.gitignore`'s own comment said it plainly the whole time — *"Python venv and caches left behind after source moved to docs/"*. The real, complete, already-committed PromptFlow project was sitting at **`docs/prompt-system/`**, fully functional, the entire time. The root folder was 100% disposable leftover scratch (a local `pip install -e` working directory plus its accumulated, never-completed run history) from *before* the source was relocated.

**Resolution**: `production_code_prompt_system/` and `production_code_prompt_system.zip` were deleted (after diff-confirming `prompts/*.md` was byte-identical between the zip and `docs/prompt-system/prompts/` — nothing unique was lost). The now-meaningless `.gitignore` rule for that path was removed.

**Lesson for next time**: before assuming source is unrecoverable, (a) check `.gitignore` comments near the affected path, and (b) check sibling/parent directories — especially a `docs/` folder — for a relocation. Both clues were present and ignored on the first two passes.

---

## Epic 14 — Final Plan

| Story | What |
|---|---|
| 14.1 | Confirm `docs/prompt-system` as canonical (installed it, ran `doctor` → 6/6 passed); delete the stale root scratch folder + zip; remove the obsolete `.gitignore` rule |
| 14.2 | Configure `docs/prompt-system/promptflow.yaml`'s `target_repo` to point at the NEURODECK repo root so real audits run against the actual app |
| 14.3 | `npm run prompt-pack:load -- <number-or-name>` — zero-dependency quick-load of one prompt into a coding-agent session (no Python install needed), with `default`→14 and `release`→15 aliases |
| 14.4 | `assets/prompt-packs/production-code-prompt-system.json` — all 15 prompts wired into the in-app **Prompt Lab** tab via the existing PromptDrive system, generated from `docs/prompt-system/prompts/*.md` by `npm run prompt-pack:generate` |
| 14.5 | This doc + `CLAUDE.md` cross-link |

Story files: `_bmad-output/implementation-artifacts/14-1` through `14-5`.

---

## Two Complementary Surfaces (both kept deliberately)

These serve different purposes — neither replaces the other:

- **`docs/prompt-system`'s real CLI** (`promptflow run --sequence full`) — full automated audit runs: sequencing, state tracking, resumability, secret redaction, real LLM-provider dispatch, consolidated reports. Requires a Python install.
- **`npm run prompt-pack:load`** — zero-dependency, instant "print prompt N into my current Claude Code session" for ad-hoc use. No sequencing, no state, no provider calls — just the text.
- **In-app Prompt Lab tab** — browse/preview/copy/save any of the 15 prompts (plus the existing `core`/`coding.production` packs) without leaving the running NEURODECK app, via PromptDrive (`src-tauri/src/promptdrive.rs`). `coding.production.json`'s templates are small slot-driven micro-prompts; the new `production-code-prompt-system.json` pack is the opposite shape — large, mostly-fixed mega-prompts — added as a distinct, clearly-labeled pack rather than forced into the small-template style.

## Key Integration Point: PromptDrive

NEURODECK's in-app prompt-templating system ("PromptDrive") loads built-in packs from `assets/prompt-packs/*.json` (`core.json`, `coding.production.json`, and now `production-code-prompt-system.json`). Note: `coding.production.json`'s title, "Production Coding Pack," is a near-miss naming collision with "Production Code Prompt System" — it's a coincidence, not the same system, and was a contributing factor in the early confusion above.
