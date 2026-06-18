# 70. Feature Tour Library

**Category:** L — Help  
**Complexity:** Tier 1  
**Status:** New (`features/help/FeatureTourView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Browse and launch guided interactive tours for every major NEURODECK feature.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Feature Tours                         [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Feature Tours                                                          │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │                                                                         │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 🤖 AI Chat Basics                                               │   │
│      │  │ Learn to send messages, use personas, and manage sessions.      │   │
│      │  │ 5 steps  ·  ✓ Completed                        [↺ Replay]       │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 🎮 Steam Deck Navigation                                        │   │
│      │  │ Master controller shortcuts and the radial menu.               │   │
│      │  │ 8 steps  ·  Not started                        [▶ Start Tour]   │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 💾 Memory & Context                                             │   │
│      │  │ Add facts, pin memories, and send project files as AI context.  │   │
│      │  │ 6 steps  ·  Not started                        [▶ Start Tour]   │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 🤖 Agent Tasks                                                  │   │
│      │  │ Create and run autonomous AI agents.                           │   │
│      │  │ 7 steps  ·  Not started                        [▶ Start Tour]   │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │                                                                         │
│      │  [Reset All Tour Progress]                                             │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Start Tour  [B] Back  [X] Reset Progress             │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ▶ Start Tour  
**IPC:** `dispatch({ type: "start-tutorial", tourId })` → launches Viewfinder Tutorial overlay (screen 68)  
**Outcome:** Tutorial overlay appears; tour begins

---

## Secondary Actions

- **↺ Replay** — re-runs completed tour
- **Reset All Tour Progress** — `ConfirmDialog` → clears `localStorage("nd:completed-tutorials")`

---

## Tour Cards Content

Each card shows:
- Icon + name
- 1-sentence description
- Step count
- Status: "Not started" / "In progress (step N/M)" / "✓ Completed"
- CTA: [▶ Start Tour] / [↺ Resume] / [↺ Replay]

---

## States

### All Tours Complete
- Summary: "All tours complete! You're a NEURODECK expert." with confetti animation (respects reduced-motion)

### No Tours (config error)
- `EmptyState` "Feature tours are not available."

---

## IPC Dependencies

None — tours are client-side JSON assets. `localStorage("nd:completed-tutorials")` tracks completion.

---

## Accessibility Notes

- Tour cards: `role="listitem"`; CTA button `aria-label="Start [tour name] tour — [N] steps"`
- Status badges: `aria-label="Tour status: [completed/not started/in progress]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/help/FeatureTourView.tsx` — **New file**

Tours defined in `assets/tutorials/*.json`. Tour IDs match `localStorage` completion keys. Completion tracked per-tour in `localStorage("nd:completed-tutorials")` as a JSON array of completed tour IDs.
