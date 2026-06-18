# 01. Boot Screen

**Category:** A — Startup  
**Complexity:** Tier 1  
**Status:** Exists (inline `App.tsx` boot-loader transient, no dedicated feature view)  
**Shell:** Full-Screen Override — no nav rail, no title bar, no shell chrome

---

## Purpose

Initialize NEURODECK and verify all critical systems before the app shell appears.

---

## Primary User Goal

Confirm the app is healthy and reach the main workspace as fast as possible.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                                                                                │
│                         ┌───────────────────────────┐                         │
│                         │   [WORDMARK ZONE]          │                         │
│                         │   NEURODECK                │                         │
│                         │   v1.8.0 · Ptah            │                         │
│                         └───────────────────────────┘                         │
│                                                                                │
│                    ┌─────────────────────────────────────┐                    │
│                    │  [STARTUP CHECKLIST ZONE]            │                   │
│                    │  ✓ IPC Bridge              Ready     │                   │
│                    │  ✓ Model Runtime            Ready    │                   │
│                    │  ✓ Storage Layer            Ready    │                   │
│                    │  ✓ Security Preload         Ready    │                   │
│                    │  ◌ Plugin Registry       Loading…    │                   │
│                    └─────────────────────────────────────┘                    │
│                                                                                │
│                    [PROGRESS BAR — animated, full width of checklist zone]    │
│                                                                                │
│               [Continue →]    [Safe Mode]    [Open Diagnostics]               │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Wordmark | Custom markup | NEURODECK logotype, version + codename pill | Centered; no interaction |
| Startup Checklist | Custom list + `StatusChip` | 5 system checks with icon + label + status | Each item animates in on completion |
| Progress Bar | `<progress>` / animated `div` | 0–100% across all checks | Respect `prefers-reduced-motion` — instant jump instead of animate |
| Action Zone | `Button` row | Continue, Safe Mode, Open Diagnostics | Hidden until all checks complete or a failure is detected |

---

## Primary Action

**Label:** Continue →  
**IPC:** None — triggers `dispatch({ type: "set-onboarding", mode: "none" })` and removes boot overlay from DOM  
**Outcome:** Boot overlay fades out; app shell becomes interactive

---

## Secondary Actions

- **Safe Mode** — visible only when ≥1 check fails; dispatch `{ type: "enter-safe-mode" }` then continue
- **Open Diagnostics** — visible only when ≥1 check fails; dispatch `{ type: "set-view", view: "diagnostics" }` then continue

---

## Startup Checks (in order)

| # | Check | IPC / Source | Pass | Warn | Fail |
|---|-------|-------------|------|------|------|
| 1 | IPC Bridge | Poll `GET /health` (3 retries, 2s apart) | ✓ Ready | Slow response | No response |
| 2 | Model Runtime | `window.neurodeck.models.getRuntimeStatus()` | ✓ Ready | No default model | Runtime crash |
| 3 | Storage Layer | `window.neurodeck.system.getStorageStatus()` | ✓ Ready | Low space (<500MB) | Read-only mount |
| 4 | Security Preload | `window.neurodeck.security.getPreloadStatus()` | ✓ Ready | Non-critical warning | CSP violation |
| 5 | Plugin Registry | `window.neurodeck.plugins.list()` | ✓ Ready | Plugin error (non-blocking) | Fatal Lua error |

---

## States

### Starting
- Wordmark fades in (300ms ease-out)
- Checklist items appear sequentially as each check resolves
- Progress bar animates proportionally
- Action zone hidden

### Success (all checks pass)
- All checklist items show green ✓ `StatusChip` tone `success`
- Progress bar reaches 100%
- "Continue →" button fades in
- Auto-advances after 800ms if no user interaction

### Warning (non-critical failures)
- Affected items show amber `StatusChip` tone `warning`
- "Continue →" button still available
- Warning badge on "Open Diagnostics" button showing count

### Failed (critical failure)
- Affected items show red `StatusChip` tone `error`
- "Continue →" disabled or replaced with "Continue Anyway" (danger variant)
- "Safe Mode" and "Open Diagnostics" highlighted
- Error description line appears below failed item

### Safe Mode Available
- All three action buttons visible
- "Safe Mode" button variant `secondary` with `ShieldAlert` icon

### Recovery Available
- Appears when IPC bridge fails after retries
- Additional "Retry" link under failed IPC check item

---

## IPC Dependencies

| Connector | Commands Used | Event / Stream |
|-----------|--------------|---------------|
| `GET /health` | Polled directly (not via bridge) | — |
| `window.neurodeck.models` | `getRuntimeStatus()` | — |
| `window.neurodeck.system` | `getStorageStatus()` | — |
| `window.neurodeck.security` | `getPreloadStatus()` | — |
| `window.neurodeck.plugins` | `list()` | — |

---

## Controller Navigation

- **A (confirm):** Activate "Continue →" once visible
- **B:** No-op (cannot back out of boot)
- **D-pad:** No navigation (linear checklist, no interactive items)
- **Hint bar:** `[A] Continue` (shown only when Continue is available)

---

## Keyboard / Mouse Fallback

- **Enter / Space:** Activate focused action button
- **Tab:** Cycle through visible action buttons
- No other keyboard interactions during boot

---

## Accessibility Notes

- `role="status"` with `aria-live="polite"` on checklist container — each check result announced to screen reader
- `aria-label="System startup progress"` on progress bar
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemax="100"`
- `prefers-reduced-motion`: Remove checklist sequential animation; show all items immediately; jump progress to completion

---

## Developer Implementation Notes

**Path:** `frontend/src/react/app/BootLoader.tsx` — currently inline in `App.tsx`; should be extracted

**Reuse:**
- `StatusChip` for each check result (tones: `success`, `warning`, `error`, neutral spinner)
- `Button` for action zone
- CSS: `animate-fade-in` for wordmark, `animate-slide-up` for checklist items

**State:** `useBootSequence()` hook — runs checks sequentially, returns `{ checks, progress, allPassed, hasCritical }`

**Auto-advance logic:**
```typescript
useEffect(() => {
  if (allPassed) {
    const t = setTimeout(() => onContinue(), 800)
    return () => clearTimeout(t)
  }
}, [allPassed])
```

**Reduced motion:**
```typescript
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
// if true: show all checks simultaneously, skip progress animation
```

**Do NOT add this as a nav view.** It renders as a full-DOM overlay (`position: fixed; inset: 0; z-index: 9999`) and is removed after `onContinue()`.
