# PromptDrive Handoff

Last updated: 2026-06-09

## Current Status

PromptDrive now has a production-grade vertical slice inside the existing NEURODECK bridge architecture. The implementation keeps renderer access behind `frontend/src/neurobridge.js` and does not add direct filesystem, process, or new IPC exposure.

## Completed Slice

- Built-in prompt packs load from `assets/prompt-packs/`.
- Backend PromptDrive support exists in `src-tauri/src/promptdrive.rs`.
- Bridge dispatch entries exist in `src-tauri/src/commands/mod.rs`.
- SQLite migration exists at `src-tauri/src/db/migrations/004_promptdrive.sql`.
- Prompt Lab now presents the PromptDrive Composer while preserving `#view-prompt-lab` routing.
- Composer supports pack/template selection, slots, validation, suggestions, preview, execute, save prompt, macro record, macro replay, and DeckCode hints.
- PromptDrive macro replay is constrained to safe actions only.
- Macro payloads are validated before persistence/replay.
- PromptDrive E2E smoke coverage exists at `e2e/tests/promptdrive.spec.ts`.
- PromptDrive visual baseline is updated at `e2e/tests/visual.spec.ts-snapshots/prompt-lab-1280x800-chromium-desktop-win32.png`.

## Verification Already Run

- `cargo test promptdrive --manifest-path src-tauri\Cargo.toml`
- `cargo check --manifest-path src-tauri\Cargo.toml`
- `npm.cmd run --prefix frontend test -- promptdrive_helpers`
- `npm.cmd --prefix e2e run test -- tests/promptdrive.spec.ts --project=chromium-desktop --reporter=list`
- `npm.cmd --prefix e2e run test -- tests/visual.spec.ts --project=chromium-desktop --grep "prompt-lab" --reporter=list`

## Recent Relevant Commits

- `a151221 fix: validate PromptDrive macro payloads`
- `d13b786 test: cover PromptDrive macro replay`
- `3288229 test: update PromptDrive visual baseline`
- `63a17ba feat: add PromptDrive composer slice`

## Remaining PromptDrive Work

1. Add bridge/API coverage for malformed PromptDrive payloads.
2. Add full macro delete/list E2E coverage.
3. Add controller-event E2E coverage for DeckCode mappings when Composer is active.
4. Run broader frontend/E2E suites after current unrelated workspace changes are settled.

## Follow-Up Completed After Initial Handoff

- Bridge dispatch failures now use structured JSON errors: `{ "error": { "code": "...", "message": "..." } }`.
- `frontend/src/neurobridge.js` preserves readable thrown errors while attaching `status`, `code`, and `details`.

## Current Caution

The worktree may contain unrelated package/Tailwind changes. Treat those as user-owned unless explicitly directed otherwise.
