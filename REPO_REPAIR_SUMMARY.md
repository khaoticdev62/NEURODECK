# NEURODECK Repo Repair Summary

## Branch
`chore/repo-tree-repair`

## Rollback Tag
`repo-tree-pre-repair-20260615-225212`

## Starting Commit
`2426f3e0` — Merge pull request #52 from khaoticdev62/hotfix/post-merge-ci-fixes

## Ending Commit
See `git log --oneline chore/repo-tree-repair` for final SHA

---

## What Changed

### Phase 2 — Root-Level Documentation Cleanup (115 files moved)

Removed all floating documentation folders from the repo root. Folders with
spaces in their names and loose prompt .md files now live under `docs/`:

| Before | After |
|---|---|
| `NEURODECK Canonical Production PRD v1.0/` | `docs/prd/` |
| `NEURODECK Design Tokens + Component Library v1.0/` | `docs/design-tokens-v1/` |
| `NEURODECK Electron SDS v1.0/` | `docs/electron-sds-v1/` |
| `NEURODECK Full Screen Catalog v1.0/` | `docs/screen-catalog-v1/` |
| `neurodeck-production-package/` | `docs/production-package/` |
| `production_code_prompt_system/` (source) | `docs/prompt-system/` |
| `NEURODECK_DEEP_COSMETIC_UI_ENHANCEMENT_AAAA_PASS_PROMPT.md` | `docs/` |
| `NEURODECK_E2E_UI_UX_Audit_Cleanup_Refactor_Prompt.md` | `docs/` |
| `NEURODECK_Onboarding_Wizard_Upgrade_PRD.md` | `docs/` |

All moves done via `git mv` — history is fully preserved.

`production_code_prompt_system/` has a Python `.venv/` locked by Windows;
source files were moved, the folder (with venv artifacts) added to `.gitignore`.

### Phase 4 — Remove `_legacy/` Primitive Components (11 files deleted)

Confirmed zero imports via grep before deletion. Removed:

```
frontend/src/react/components/primitives/_legacy/
  Badge.tsx, Button.tsx, ConfirmDialog.tsx, IconButton.tsx, Modal.tsx,
  Panel.tsx, Select.tsx, StatusChip.tsx, TextInput.tsx, Toast.tsx, Toggle.tsx
```

The active component versions remain in `frontend/src/react/components/primitives/`.

### Phase 5 — Archive Dead Legacy JS Modules (41 files moved)

**Case A confirmed**: `frontend/index.html` loads only `main.tsx` (React entry).
None of the legacy flat JS files are imported by `main.tsx` or any React file.

Archived to `docs/legacy-js-archive/`:

```
agent.js, api_lab.js, canvas.js, chat.js, cli_maker.js, ctrl_prompt.js,
dashboard.js, git.js, graph_view.js, haptics.js, haptics.test.js, icons.js,
icons.test.js, ide_view.js, lsp_client.js, main.js, markdownWorker.ts,
memory.js, neurobridge.js, notifications.js, notifications.test.js,
orchestrator.js, palette-commands.js, promptdrive_helpers.js,
promptdrive_helpers.test.js, radial.js, remote_control_view.js, sanitize.test.js,
scheduler_view.js, settings.js, shortcuts.js, shortcuts.test.js, slash-commands.js,
state.js, state.test.js, style.css, terminal.js, terminal_gamepad.js, torrent.js,
workflow_view.js
```

`app.css` and `focus-trap.js` were initially archived but restored:
- `app.css` — imported by `frontend/src/react/index.css` via `@import "../app.css"`
- `focus-trap.js` — imported by `FocusTrapContainer.tsx` and the design-system Modal

### Phase 7 — Scripts Organization (65 files reorganized)

Moved all loose files from `scripts/` root into categorized subdirectories:

| Subdir | Contents |
|---|---|
| `scripts/verify/` | 45 `verify-*.ts` architecture/security/feature validators |
| `scripts/report/` | 7 `export-*.ts` readiness reports + `generate-backend-inventory-json.ts` |
| `scripts/brand/` | `generate-brand-assets.mjs`, `validate-brand-assets.mjs`, `validate-design-system.js` |
| `scripts/dev/` | `check-*.cjs`, `run-fallow-if-available.js`, `promptflow-run.*`, `strip_tauri.py` |

Updated all 62 `package.json` script references (verify:*, report:*, brand:*,
quality:fallow:*, check:*) to use new paths. Zero stale references remain.

---

## Design System Status

`frontend/src/design-system/` is NOT imported by any file in `frontend/src/react/`.
It is a standalone reference/spec artifact. The active React DS lives in
`frontend/src/react/components/primitives/`. No action taken — the design-system
folder serves as living documentation.

---

## Validation Results

| Check | Result |
|---|---|
| `npm run frontend:typecheck` | ✅ Pass |
| `npm run frontend:build` | ✅ Pass |
| `npm run rust:check` | ✅ Pass |
| `cd frontend && npx vitest run` | ✅ 52 files, 501 tests — all pass |

---

## Architecture Unchanged

The following were explicitly NOT restructured:
- `electron/` — Electron main process (well-organized, keep as-is)
- `frontend/src/react/` — Active React app (no renames)
- `src/` — TypeScript Electron services + preload (no renames)
- `src-tauri/` — Rust sidecar (no renames)
- All IPC channels (`electron/ipc-channels.js`) — verified consistent

---

## Files Changed Summary

| Category | Count |
|---|---|
| Root doc folders moved to docs/ | ~115 files |
| _legacy/ components deleted | 11 |
| Legacy JS modules archived | 41 |
| app.css, focus-trap.js restored (not dead) | 2 |
| scripts/ reorganized | 65 |
| package.json script paths updated | 62 refs |
| .gitignore additions | 1 entry |
| TOTAL git operations | ~234 |

---

## Known Risks / Follow-Up

1. **`docs/legacy-js-archive/`** — 41 legacy JS files archived for reference.
   These can be permanently deleted once the team confirms no historical lookup
   is needed. They contain no business logic active in the current app.

2. **`frontend/src/app.css`** — Still active (imported by `index.css`). Long-term,
   this CSS should be migrated into `frontend/src/react/index.css` or a dedicated
   design token CSS file, and `app.css` removed.

3. **`frontend/src/focus-trap.js`** — Vanilla JS class used by `FocusTrapContainer.tsx`.
   Could be converted to TypeScript and moved inside `frontend/src/react/utils/`.
   The import path in `FocusTrapContainer.tsx` and `design-system/Modal.tsx` would
   need updating.

4. **`frontend/src/design-system/`** — Standalone spec, zero imports from React app.
   Could be moved to `docs/design-system-spec/` in a future cleanup pass to fully
   eliminate the parallel component structure.

5. **`production_code_prompt_system/` folder** — Remains on disk (with `.venv/`)
   but is gitignored. Safe to manually delete if the Python environment is not needed.
