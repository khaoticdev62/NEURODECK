# Phase 9 — Fake UI + Dead Element Resolution Report

_Audit date: 2026-06-15 | Branch: ui/npm-onboarding-installer_

---

## Summary

All confirmed fake UI patterns from the plan have been resolved. The codebase is clean of native browser dialogs, TODO comments in view files, dead legacy components, and unannounced disabled buttons. Two minor "coming soon" aria-label issues were fixed this phase.

---

## Resolved Issues

### FIXED-1: CanvasView.tsx — "coming soon" in aria-labels

**Before**:
```tsx
aria-label="AI edit (coming soon)"
aria-label="Collaborate (coming soon)"
```

**Problem**: Including availability status in `aria-label` is an anti-pattern. Screen readers announce the label directly — "AI edit coming soon button" is awkward. The disabled state already communicates unavailability.

**After**:
```tsx
aria-label="AI edit"
title="AI edit — coming in a future release"

aria-label="Collaborate"
title="Collaborate — coming in a future release"
```

**Rationale**: Features ARE implemented in `frontend/src/canvas.js` (legacy JS) — `canvas_collab_host`, `canvas_collab_join`, `canvas_ai_edit_apply` all exist. The React port has not yet migrated these features. `title` provides the tooltip for sighted users; the disabled state covers screen readers.

**File**: `frontend/src/react/features/canvas/CanvasView.tsx:148-163`

---

### CONFIRMED-DONE-1: PromptLabView.tsx — Gallery and AI Optimize buttons

Fixed in Phase 3 Tier 3. Both buttons have `disabled` + `title="... coming in a future release"`. No `aria-label` issues — labels describe the action cleanly.

### CONFIRMED-DONE-2: SessionCard.tsx — native `alert()` and `confirm()`

Fixed in Phase 2 (P0 code quality pass):
- `confirm()` removed → replaced with `<ConfirmDialog>` with proper state management
- `alert()` removed → replaced with inline `role="status"` aria-live status message

### CONFIRMED-DONE-3: _legacy/ folder

All three legacy files deleted in Phase 3:
- `components/cards/_legacy/SessionCard.tsx` — deleted
- `components/cards/_legacy/AgentCard.tsx` — deleted
- `components/cards/_legacy/ModelCard.tsx` — deleted

---

## Intentional Mock Data (Not Fake UI)

### Academy SOCConsoleView — MOCK_ALERTS
`frontend/src/react/features/academy/views/SOCConsoleView.tsx` uses `MOCK_ALERTS` from `academy/data/alerts.ts`. This is intentional — the SOC Console is a cybersecurity training simulator where students triage realistic-looking but synthetic security alerts. Mock data IS the feature.

### FontManagerView — SAMPLE_TEXT / MONO_SAMPLE
Font preview strings (`"NEURODECK v6 — Local AI, zero latency."` and `'fn main() { println!("Hello"); }'`) are intentional UI elements for demonstrating font rendering. Not fake.

### CanvasView — JavaScript starter template
`console.log("Hello from NEURODECK Canvas")` appears inside a JavaScript code template string (the default starter code for the Canvas JavaScript mode). This is user-facing content, not a debug log.

### DiagnosticsView — "Mock Fallback" badge
`ev.realTransportUsed ? "Real Call" : "Mock Fallback"` is a diagnostic tool feature that shows developers whether IPC calls went through the real bridge or fell back to mock responses. This is an intentional diagnostic indicator.

---

## Clean Scan Results

| Check | Result |
|-------|--------|
| `window.alert()` / `window.confirm()` in production `.tsx` | ✓ Zero |
| `// TODO` / `// FIXME` / `// HACK` in feature files | ✓ Zero |
| Disabled buttons without explanatory `title` | ✓ Zero (fixed) |
| `_legacy/` directory with dead files | ✓ Deleted (Phase 3) |
| Unlabeled `<input>` elements | ✓ Zero |
| Production `console.log` debug calls in view files | ✓ Zero |
| Hardcoded wrong brand hex (outside canvas/xterm) | ✓ Fixed (Phase 5) |

---

## Phase 9 Verdict

**Fake UI posture: CLEAN.**

All native browser dialogs replaced with design system components. No TODO comments in feature files. Legacy dead components deleted. The only "coming soon" items in the app are:
- `CanvasView.tsx`: AI edit and Collaborate buttons (disabled + titled, features exist in legacy JS)
- `PromptLabView.tsx`: Gallery and AI Optimize buttons (disabled + titled, features planned)

Both are correctly handled with disabled state + tooltip. Neither breaks accessibility or user trust.

**Status: COMPLETE — 1 fix applied (CanvasView aria-labels).**
