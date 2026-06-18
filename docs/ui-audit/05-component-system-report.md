# Phase 6 — Component System Refinement Report

_Audit date: 2026-06-15 | Branch: ui/npm-onboarding-installer | Primitives audited: 23_

---

## Primitive Inventory

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Badge | `Badge.tsx` | ✓ CLEAN | Display only — tone variants, size variants |
| Button | `Button.tsx` | ✓ CLEAN | `type="button"` default, loading state, icon slot, `aria-disabled` |
| ConfirmDialog | `ConfirmDialog.tsx` | ✓ CLEAN | Delegates to DSConfirmDialog with focus trap |
| DeckButtonHint | `DeckButtonHint.tsx` | ✓ CLEAN | Controller hint chips — intentionally visible to AT (Steam Deck + a11y) |
| Divider | `Divider.tsx` | ✓ CLEAN | Decorative separator |
| EmptyState | `EmptyState.tsx` | ✓ CLEAN | Semantic `<h3>`, `aria-hidden` on icon, compact/full variants |
| ErrorState | `ErrorState.tsx` | ✓ CLEAN | Retry callback, error message, semantic heading |
| FocusTrapContainer | `FocusTrapContainer.tsx` | ✓ CLEAN | `FocusTrap` class, Escape handler, focus restore on deactivate |
| FormSection | `FormSection.tsx` | ✓ CLEAN | `<fieldset>` + `<legend>` for grouped controls, required asterisk, `htmlFor` in FormRow |
| IconButton | `IconButton.tsx` | ✓ CLEAN | Requires explicit children — consumers always add `aria-label` |
| LoadingState | `LoadingState.tsx` | ✓ CLEAN | `role="status"`, `aria-label`, spinner is `aria-hidden`, `motion-reduce:animate-none` |
| MetricCard | `MetricCard.tsx` | ✓ CLEAN | Display only — `aria-label` on card for screen reader context |
| Modal | `Modal.tsx` | ✓ CLEAN | Delegates to DSModal with `trap={true}`, `closable={true}` |
| Panel | `Panel.tsx` | ✓ CLEAN | Extended with `HTMLAttributes` spread for `role`/`aria-label` passthrough |
| PlaceholderView | `PlaceholderView.tsx` | ✓ DEV-ONLY | Only in tests — not imported in any production view |
| Select | `Select.tsx` | ✓ CLEAN | Auto-generates `id` from `label` prop, accepts explicit `id`, `aria-describedby` for errors |
| Skeleton | `Skeleton.tsx` | **FIXED** | Added `aria-hidden="true"` to shimmer divs |
| StatusChip | `StatusChip.tsx` | ✓ CLEAN | Display only — tone + pulse variants |
| Tabs | `Tabs.tsx` | ✓ CLEAN | Full ARIA tab pattern: `role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls/labelledby`, arrow key navigation, `tabIndex` roving |
| TextInput | `TextInput.tsx` | ✓ CLEAN | Label/id pairing, `aria-describedby` for errors, `aria-required` |
| Toast | `Toast.tsx` | ✓ CLEAN | Container: `role="region"` + `aria-live="polite"` + `aria-atomic="false"`, items: `role="status"`, auto-dismiss, max 5 at once |
| Toggle | `Toggle.tsx` | ✓ CLEAN | Required `label` prop — delegates to DSToggle |
| Tooltip | `Tooltip.tsx` | **FIXED** | Added `useId` + `id` on tooltip element + `aria-describedby` injection via `cloneElement` |

---

## Fixes Applied This Phase

### 1. Tooltip — `aria-describedby` association

**Before**: Tooltip had `role="tooltip"` but no `id` and no `aria-describedby` on the trigger — screen readers couldn't find or announce the tooltip content.

**After**: Uses `useId()` to generate a unique `id`, adds it to the tooltip `<span>`, and injects `aria-describedby={tipId}` onto the child trigger via `cloneElement`. Screen readers now announce tooltip content when the trigger receives focus.

```tsx
const tipId = useId();
// tooltip: <span id={tipId} role="tooltip">
// trigger: cloneElement(child, { 'aria-describedby': tipId })
```

### 2. Skeleton — `aria-hidden="true"`

**Before**: Skeleton shimmer divs were empty animated elements that screen readers would attempt to traverse, finding nothing meaningful.

**After**: `aria-hidden="true"` on each skeleton div. Screen readers skip them; semantic context is provided by the parent `LoadingState` component or `aria-busy` on the data container.

---

## Missing Primitives Assessment

The plan identified two candidates: `Drawer` and `Table`.

### Drawer — NOT NEEDED
After auditing all 45 views, no screen uses a slide-out drawer pattern that isn't already handled by `Modal` (with `closeOnBackdrop`) or inline panel layouts. Adding a Drawer primitive would add complexity without a current consumer. Defer until a use case emerges.

### Table — NOT NEEDED
All list views (Sessions, Plugins, Diagnostics, Scheduler) use card/row patterns, not HTML tables. A Table primitive would require existing views to be refactored with no visual improvement. Defer until tabular data is added.

### ListRow — CANDIDATE (low priority)
OrchestratorView's workflow list and a few other views use a `<div>` container + `Button` + `IconButton` pattern for list rows. A `ListRow` primitive would standardize this but represents a low-value refactor. Not blocking any screen or feature.

---

## Primitive System Verdict

**23 primitives audited — 2 fixed, 21 confirmed clean.**

The primitive library is production-ready. All critical accessibility patterns (focus trapping, ARIA roles, keyboard navigation, screen reader announcements) are correctly implemented. The two fixes were low-severity gaps that improve screen reader compatibility without changing visual behavior.

**Status: COMPLETE — 2 fixes applied, no new primitives required.**
