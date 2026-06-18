# 68. Viewfinder Tutorial (In-App Spotlight)

**Category:** L — Help  
**Complexity:** Tier 2  
**Status:** New — App-level overlay system  
**Shell:** Overlay on top of any view

---

## Purpose

Step-by-step in-context spotlight tutorial that highlights UI elements and explains them without leaving the app.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [BACKDROP — semi-transparent overlay covers non-spotlighted area]            │
│                                                                                │
│      ┌─────────────────────────┐                                               │
│      │  [SPOTLIGHTED ELEMENT]  │  ← Highlighted with bright ring               │
│      │  e.g. Prompt Input      │                                               │
│      └─────────────────────────┘                                               │
│                                                                                │
│      ┌─────────────────────────────────────────────────────────┐              │
│      │  [STEP BUBBLE]                                          │              │
│      │  Step 3 of 8                                           │              │
│      │                                                         │              │
│      │  This is the Prompt Input                              │              │
│      │  Type your message here and press Enter to send        │              │
│      │  it to the AI. Use Shift+Enter for a new line.        │              │
│      │                                                         │              │
│      │  [← Back]  [Skip Tutorial]  [Next →]                   │              │
│      └─────────────────────────────────────────────────────────┘              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Bubble Positioning Rules

- Bubble positions below, above, left, or right of spotlighted element — auto-calculated to stay in viewport
- On Steam Deck: bubble prefers bottom half of screen (avoids top notch area)
- Bubble never covers the spotlighted element

---

## Primary Action

**Label:** Next →  
**Outcome:** Advance to next tutorial step; backdrop re-positions to next element

---

## Secondary Actions

- **← Back** — return to previous step
- **Skip Tutorial** — `ConfirmDialog`: "Skip the tutorial? You can restart it from Help at any time." → exits overlay
- **Keyboard**: `Right Arrow` / `Space` → Next; `Left Arrow` → Back; `Escape` → Skip

---

## Tutorial Definitions

Each tutorial is a JSON object with steps:
```json
{
  "id": "workspace-intro",
  "name": "Workspace Introduction",
  "steps": [
    { "target": "[data-tutorial='nav-rail']", "title": "Navigation", "body": "..." },
    { "target": "[data-tutorial='prompt-input']", "title": "Prompt Input", "body": "..." }
  ]
}
```

`data-tutorial` attributes on elements act as stable anchors.

---

## States

### Element Not Visible
- If target element not in current view: tutorial auto-navigates to the correct view first

### Tour Complete
- Final step: "You're ready!" with [Finish] button
- `localStorage("nd:completed-tutorials")` updated

### Already Completed
- "Restart tutorial?" prompt when launching a completed tour

---

## IPC Dependencies

None — tutorial system is purely frontend. Tutorials defined in `assets/tutorials/*.json`.

---

## Accessibility Notes

- Backdrop: `aria-hidden="true"` (decorative)
- Spotlight ring: CSS outline on target element; does NOT use `aria-hidden`
- Step bubble: `role="dialog"`, `aria-modal="false"` (user can still tab to spotlighted element), `aria-label="Tutorial: [step title]"`
- Focus placed on bubble "Next" button on each step change
- `prefers-reduced-motion`: disable backdrop fade animation, disable position transition

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/tutorial/TutorialOverlay.tsx` — **New file**

Spotlight effect: CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` on the target element creates a natural cutout. Uses `getBoundingClientRect()` to track element position and reposition on scroll/resize. Tutorials auto-launch on first feature use if not yet completed.
