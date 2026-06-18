# 77. Release Checklist

**Category:** N — Brand  
**Complexity:** Tier 1  
**Status:** New (`features/developer/ReleaseChecklistView.tsx`)  
**Shell:** Full App Shell (developer/internal tool)

---

## Purpose

Interactive pre-release checklist that verifies NEURODECK is ready to ship — pulling live data from the codebase, CI, and KFMS metadata.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Release Checklist                     [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Release Checklist — v1.8.0-ptah                                       │
│ Rail │  [↺ Refresh All]                        [↓ Export Report]              │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [BUILD & CI]                                                           │
│      │  ✓ App builds successfully                                              │
│      │  ✓ TypeScript: no errors                                               │
│      │  ✓ ESLint: 0 errors, 2 warnings                                        │
│      │  ✗ Tests: 3 failing (feature/canvas — see details)                     │
│      │                                                                         │
│      │  [SECURITY]                                                             │
│      │  ✓ API keys not in source code                                         │
│      │  ✓ No secrets in env vars                                              │
│      │  ✓ Dependency audit: 0 critical vulnerabilities                        │
│      │                                                                         │
│      │  [FUNCTIONALITY]                                                        │
│      │  ✓ Boot sequence completes                                             │
│      │  ✓ LLM chat working                                                    │
│      │  ✓ PTY terminal working                                                │
│      │  ✓ Memory save/recall working                                          │
│      │  ✓ Settings save/load working                                          │
│      │  ○ Steam Deck layout verified (manual)                                 │
│      │                                                                         │
│      │  [KFMS METADATA]                                                        │
│      │  ✓ meta.json version: 1.8.0                                            │
│      │  ✓ meta.json codename: Ptah                                            │
│      │  ✓ health.json: all 5 checks true                                      │
│      │  ✓ Codename registry indexed                                           │
│      │                                                                         │
│      │  [DOCS & CHANGELOG]                                                     │
│      │  ✓ CHANGELOG.md updated                                                │
│      │  ✓ README.md updated                                                   │
│      │  ○ Release notes approved (manual)                                     │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  Status: ⚠ 3 issues require attention before release.                  │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] View Details  [B] Back  [X] Refresh  [Y] Export      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Checklist Item Icons

- ✓ — automated check passed
- ✗ — automated check failed (blocking)
- ⚠ — warning (non-blocking)
- ○ — manual check required (no automation available)

---

## Primary Action

**Label:** ↺ Refresh All  
**IPC:** `window.neurodeck.diagnostics.runReleaseChecks()`  
**Outcome:** All automated checks re-run; results updated

---

## Secondary Actions

- **View Details** — expand/collapse each check for detailed output
- **↓ Export Report** — downloads markdown release report
- **Mark manual as done** — checkboxes for ○ items after manual verification

---

## States

### All Checks Passing
- Status: "✓ Ready to release v1.8.0-ptah"
- Green summary banner

### Blocking Failures
- Status: "⚠ [N] issues require attention before release."
- Red summary banner; failing items show [Fix →] links

### Loading
- `Skeleton` rows while checks run

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.diagnostics` | `runReleaseChecks()`, `getReleaseReport()` |
| `window.neurodeck.system` | `getVersionInfo()`, `getKFMSStatus()` |

---

## Accessibility Notes

- Checklist: `role="list"` / `role="listitem"`; check status: `aria-label="[check name]: [passed/failed/manual]"`
- Status summary: `role="status"` / `aria-live="polite"` after refresh

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/ReleaseChecklistView.tsx` — **New file**

Automated checks: build status from CI cache, TypeScript errors from LSP diagnostics, test results from last test run output, KFMS meta.json validation, secrets scan via regex patterns on source files (client-side, no upload). Manual checks tracked in `localStorage("nd:release-manual-checks")`.

KFMS stamp: run `./scripts/kfms/khaotic-init.sh validate` via terminal before exporting report. `getKFMSStatus()` reads `infra/meta/meta.json` and `infra/telemetry/health.json`.
