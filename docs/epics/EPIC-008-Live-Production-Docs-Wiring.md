# Epic: Live Production Documentation Wiring

## Objective

Eliminate documentation stubs so every production-critical feature has a complete, accurate, and discoverable doc that is either indexed by the in-app Docs Hub or consumed by a release-gate report script.

## Background

- NEURODECK ships an in-app Docs Hub (`DocsView.tsx`) that indexes the `./docs` folder.
- Release gates rely on report scripts that write `docs/terminal/TERMINAL_READINESS_REPORT.md`, `docs/browser-vpn/VPN_READINESS_REPORT.md`, etc.
- `AGENTS.md` and the production-package `manifest.json` reference `docs/production-package/*.md` paths that currently contain stubs while full versions live elsewhere.
- A scan of `docs/` found **392 project-owned markdown files**, of which **~25 are stubs**. The stubs cluster in Terminal runbooks, Browser/VPN runbooks, production-package root files, and the Docs Hub default index.
- Without this wiring, users and reviewers cannot trust readiness reports or find authoritative guidance for Terminal, VPN, and release-packaging features.

## Success Criteria

1. Zero stub files remain in the four target areas, or stubs are replaced with clear redirects to canonical full docs.
2. Report scripts that write readiness reports generate documents that pass a minimal content-length check and contain no placeholder language.
3. The in-app Docs Hub can display a curated top-level index of user-facing guides.
4. `AGENTS.md` and `docs/production-package/manifest.json` point to the correct canonical doc paths.

---

## Story 1: Wire Terminal Backend Runbooks

**Effort:** Large  
**Files:** `docs/terminal/TERMINAL_DIAGNOSTICS_PLAN.md`, `PTY_BACKEND_PLAN.md`, `TERMINAL_CONTROLLER_UX_PLAN.md`, `TERMINAL_PROFILE_SYSTEM_PLAN.md`, `TERMINAL_AI_COMMAND_ASSISTANT_PLAN.md`, `TERMINAL_SELF_HEALING_PLAN.md`, `TERMINAL_SECURITY_MODEL.md`, `TERMINAL_COMMAND_POLICY.md`, `NO_MOCK_TERMINAL_DATA_AUDIT.md`, `FALLOW_TERMINAL_AUDIT_REPORT.md`

**Objective**  
Convert terminal plan stubs into authoritative runbooks and audit reports.

**Acceptance Criteria**

- Each file has a H1 title, scope statement, and at least three sections of actionable detail.
- `TERMINAL_DIAGNOSTICS_PLAN.md` includes PTY spawn timeout, idle-kill TTL, and log-redaction procedures.
- `TERMINAL_COMMAND_POLICY.md` defines safe/dangerous command classification and confirmation gates.
- `NO_MOCK_TERMINAL_DATA_AUDIT.md` lists files audited, mock-data verdict, and remediation status.
- `FALLOW_TERMINAL_AUDIT_REPORT.md` contains an actual Fallow-generated dead-code/unsafe-import summary or is removed if no longer needed.

**Verification**

- Search for placeholder phrases in `docs/terminal/` stub files returns no matches.
- Report scripts that write `TERMINAL_READINESS_REPORT.md` continue to pass.

---

## Story 2: Wire Browser-VPN Backend Runbooks

**Effort:** Large  
**Files:** `docs/browser-vpn/VPN_DIAGNOSTICS_PLAN.md`, `VPN_SELF_HEALING_PLAN.md`, `VPN_KILL_SWITCH_PLAN.md`, `VPN_CONFIGURATION_TEMPLATES.md`, `VPN_SECURITY_MODEL.md`, `VPN_ARCHITECTURE.md`, `NO_MOCK_VPN_DATA_AUDIT.md`, `VPN_PROVIDER_SUPPORT_MATRIX.md`, `VPN_FEATURE_INVENTORY.md`, `FALLOW_VPN_AUDIT_REPORT.md`

**Objective**  
Convert browser-VPN plan stubs into authoritative runbooks and audit reports.

**Acceptance Criteria**

- `VPN_CONFIGURATION_TEMPLATES.md` contains working OpenVPN/WireGuard/proxy config snippets with placeholders explained.
- `VPN_KILL_SWITCH_PLAN.md` documents the state machine for blocking browser traffic when the tunnel drops.
- `VPN_PROVIDER_SUPPORT_MATRIX.md` is a completed table with protocol, auth, and kill-switch support per provider.
- `VPN_FEATURE_INVENTORY.md` lists implemented features and known gaps with owner/ETA.
- `NO_MOCK_VPN_DATA_AUDIT.md` and `FALLOW_VPN_AUDIT_REPORT.md` follow the same pattern as Story 1.

**Verification**

- Search for placeholder phrases in `docs/browser-vpn/` stub files returns no matches.
- `scripts/report/export-vpn-readiness-report.ts` produces a non-stub `VPN_READINESS_REPORT.md`.

---

## Story 3: Resolve Production-Package Root Stub Split

**Effort:** Medium  
**Files:** `docs/production-package/05_Steam_Deck_UX_Release_Gate.md`, `07_Repository_CI_CD_Setup.md`, `08_Plugin_Automation_Workflow_Spec.md`, `09_Release_Packaging_Observability.md`, plus `docs/production-package/neurodeck-production-package/docs/` full versions and `docs/production-package/manifest.json`

**Objective**  
Remove the root-stub vs packaged-full-doc confusion so canonical paths are authoritative.

**Acceptance Criteria**

- Each root stub either (a) is replaced with the full content from the corresponding `neurodeck-production-package/docs/` file, or (b) becomes a short redirect/front-matter file pointing to the canonical full doc.
- `docs/production-package/manifest.json` references the canonical paths actually used.
- `AGENTS.md` references the canonical paths actually used.
- No duplicate out-of-sync copies remain for the four affected docs.

**Verification**

- `npm run preflight` passes.
- `node scripts/brand/validate-design-system.js` still passes as a sanity check.

---

## Story 4: Curate In-App Docs Hub Default Index

**Effort:** Medium  
**Files:** `docs/DEFAULT_DOCS_INDEX.md` (new), `docs/USER_GUIDE.md`, `docs/TROUBLESHOOTING.md`, `docs/PLUGIN_DEV_GUIDE.md`, `docs/steam_input_guide.md`, `src/renderer/features/docs/DocsView.tsx`

**Objective**  
Make the Docs Hub useful out-of-the-box by shipping a curated, searchable index of user-facing guides.

**Acceptance Criteria**

- Create `docs/DEFAULT_DOCS_INDEX.md` containing a curated table of contents linking to user-facing guides.
- `DocsView.tsx` surfaces the default index when no search query is entered.
- The default index is included in release packaging (it lives under `./docs` and is not gitignored).
- Each linked guide has a stable H1 and an excerpt for search snippets.

**Verification**

- Launch the app, open Docs view, and confirm the default index renders.
- Search for a user-guide topic and confirm results appear.

---

## Story 5: Harden Readiness Report Generation

**Effort:** Medium  
**Files:** `scripts/report/export-terminal-readiness-report.ts`, `scripts/report/export-vpn-readiness-report.ts`, plus any related report scripts under `scripts/report/`

**Objective**  
Ensure report scripts never silently emit placeholder reports.

**Acceptance Criteria**

- Each report script validates that generated markdown exceeds a minimum content length (e.g., 1,000 bytes) and contains no placeholder phrases.
- On validation failure, the script exits non-zero and prints a clear error.
- Add a CI step or preflight gate that runs the report scripts and checks the output.

**Verification**

- Intentionally truncate a report template and confirm the script fails.
- `npm run preflight` includes the new gate.

---

## Story 6: Audit and Clean Duplicate Spec Packages

**Effort:** Small  
**Files:** `docs/spec-packages/`, `docs/design-tokens-v1/`, `docs/electron-sds-v1/`, `docs/screen-catalog-v1/`

**Objective**  
Remove duplicate spec copies that create stale-source risk.

**Acceptance Criteria**

- Identify which copy of each spec is canonical.
- Delete or archive the duplicate copies.
- Update any references to point to the canonical copy.

**Verification**

- `find docs -name "*.md"` shows no obvious duplicate filenames with identical content under different directories.
- `npm run frontend:build` still passes.

---

## Story 7: Remove Third-Party Venv Docs from Repo

**Effort:** Small  
**Files:** `docs/prompt-system/.venv/**/*.md`, `.gitignore`

**Objective**  
Keep package-manager artifacts out of tracked source.

**Acceptance Criteria**

- Add `docs/prompt-system/.venv/` to `.gitignore`.
- Delete the two `.md` files under `.venv` from the repo.

**Verification**

- `git status` no longer shows `.venv` docs as untracked.

---

## Out of Scope

- Rewriting the full production-package PRD/SDS blueprints; those already exist in `docs/production-package/neurodeck-production-package/docs/`.
- Adding new features to Terminal or VPN; this epic is about documenting and wiring what is already implemented.

## Notes

- The existing epic sequence ends at `EPIC-007`; this is `EPIC-008`.
- Keep each story in its own PR to avoid a single giant docs dump.
