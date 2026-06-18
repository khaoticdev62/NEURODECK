# 04. Quick Start Hub

**Category:** A — Startup  
**Complexity:** Tier 2  
**Status:** New — `features/quickstart/QuickStartView.tsx`  
**Shell:** Full App Shell (nav rail + title bar)

---

## Purpose

Give users a fast, scannable entry point for common setup and launch actions on a fresh or partially-configured install.

---

## Primary User Goal

Find and complete the next setup step or jump directly into a feature without hunting through settings.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Quick Start                           [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Quick Start                                [Search cards…]            │
│      │  Get up and running fast.                                              │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [SETUP STATUS BANNER]  (shown only if not fully configured)           │
│      │  ⚠ 3 setup steps remaining     [View Checklist →]                     │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [CARD GRID ZONE]                                                      │
│      │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│      │  │ 🟢 Start AI     │  │ ⚠ Connect       │  │ ◌ Add API      │       │
│      │  │    Workspace    │  │   Local Model   │  │   Provider     │       │
│      │  │  [Open →]       │  │  [Setup →]      │  │  [Add →]       │       │
│      │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│      │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│      │  │ ◌ Add API Key  │  │ 🟢 Create Agent │  │ ◌ Choose       │       │
│      │  │  [Add →]        │  │  [Create →]     │  │   Persona      │       │
│      │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│      │  [… more cards …]                                                      │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Open  [B] Back  [LB/RB] Scroll  [Y] Filter           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` eyebrow + `TextInput` | Title, subtitle, search filter | Search filters cards in real-time |
| Setup Status Banner | `Badge` tone `warning` + `Button` | Remaining setup step count + link to checklist | Hidden when all critical steps complete |
| Card Grid | Grid `3-col → 2-col → 1-col` + Quick Start cards | 15 action cards | Responsive: 3 cols at 1280px, 2 at tablet |

---

## Quick Start Cards (15 total)

Each card:
```
┌─────────────────────────────────────────────┐
│  [Icon]  [Title]              [Status chip] │
│  [One-line purpose]                          │
│  Effort: Low / Medium          [Action →]   │
│  [Tutorial link — optional]                 │
└─────────────────────────────────────────────┘
```

| # | Title | Purpose | Status | Effort | Target view/action |
|---|-------|---------|--------|--------|--------------------|
| 1 | Start AI Workspace | Begin an AI conversation | Ready / Needs model | Low | `set-view: workspace` |
| 2 | Connect Local Model | Import a local GGUF/ONNX model | Ready / Not set | Medium | `set-view: models` |
| 3 | Add API Provider | Configure a remote AI provider | Ready / Not set | Low | `set-view: settings` → AI panel |
| 4 | Add API Key | Store an API key securely | Ready / Missing | Low | `set-view: security` |
| 5 | Create Agent | Build a custom AI agent | Ready | Medium | `set-view: agents` → create |
| 6 | Choose Persona | Select an AI persona | Active persona shown | Low | `set-view: settings` → AI |
| 7 | Import Session | Load a previous session | Ready / None | Low | `set-view: sessions` → import |
| 8 | Import Project Context | Connect a codebase or folder | Ready | Medium | `set-view: project` |
| 9 | Open Terminal | Run shell commands | Ready / Permission req | Low | `set-view: terminal` |
| 10 | Open Browser Tools | Use headless browser | Ready / Permission req | Low | `set-view: browser` |
| 11 | Configure Controls | Set up gamepad/keyboard | Ready / Default | Low | `set-view: settings` → Input |
| 12 | Run Diagnostics | Check app health | n/a | Low | `set-view: diagnostics` |
| 13 | Customize Theme | Apply a visual theme | Active theme shown | Low | `set-view: themes` |
| 14 | Install Plugin | Add a Lua extension | Ready / None installed | Medium | `set-view: plugins` |
| 15 | Set Privacy Mode | Configure offline/telemetry | Status shown | Low | `set-view: settings` → Privacy |

---

## Status Chip Logic Per Card

| Chip | Tone | Condition |
|------|------|-----------|
| Ready | `success` | Feature is configured and usable |
| Not configured | `warning` | Required config missing (model, API key) |
| Active: [value] | `info` | Shows current selection (persona, theme) |
| Permission required | `warning` | Feature needs OS permission |
| Not installed | neutral | Optional feature not yet set up |
| Connector required | `error` | IPC backend unavailable for this feature |

---

## Primary Action

**Label:** [Action →] on each card (Open / Setup / Add / Create / Configure)  
**IPC:** Varies per card (navigation + optional pre-flight IPC check)  
**Outcome:** Navigates to target view; card action triggers appropriate flow

---

## Secondary Actions

- **Search** — `TextInput` in header filters cards by title/keyword in real-time
- **View Checklist →** (banner) — opens Setup Checklist drawer
- **Tutorial link** on cards — navigates to `features/academy/AcademyView.tsx` with tour ID

---

## States

### Fresh Install
- Most cards show `warning` or neutral status
- Setup Status Banner visible with step count
- "Start AI Workspace" card shows `warning` ("No model configured")

### Partially Configured
- Some cards show `success`, some `warning`
- Banner count decreasing

### Ready (all critical steps complete)
- Banner hidden
- All critical cards show `success`
- Optional cards remain in their state

### Connector Required (IPC down)
- Cards requiring IPC show `error` chip
- Card action button disabled
- "Backend Unavailable" inline note on affected cards

### Permission Required
- Card shows `warning` chip "Permission Required"
- Action navigates to Settings with explanation

---

## IPC Dependencies

| Connector | Purpose |
|-----------|---------|
| `window.neurodeck.models` | Check if local model or provider configured |
| `window.neurodeck.security` | Check if API key saved |
| `window.neurodeck.plugins` | Get installed plugin count |
| `window.neurodeck.system` | Get current persona, theme |

Status for all cards is resolved on mount with a single `getQuickStartStatus()` call (or parallel checks).

---

## Controller Navigation

- **D-pad / Left stick:** Move focus between cards (grid navigation: left/right/up/down)
- **A (confirm):** Activate focused card's primary action
- **B:** Navigate to previous view
- **Y:** Toggle search filter input focus
- **LB / RB:** Scroll grid if overflows viewport
- **Hint bar:** `[A] Open  [B] Back  [Y] Search  [LB/RB] Scroll`

---

## Keyboard / Mouse Fallback

- **Tab:** Move through cards in DOM order (left-to-right, top-to-bottom)
- **Enter / Space:** Activate focused card
- **Arrow keys:** Grid navigation within card set (implement `roving tabindex`)
- **Escape:** Clear search filter if active, otherwise navigate back

---

## Accessibility Notes

- Card grid: `role="list"` / `role="listitem"` or CSS grid with proper semantics
- Each card: `role="article"` with `aria-label="[Card Title] — [status]"`
- Status chips: `aria-label="Status: [value]"` (not color-only)
- Search: `aria-label="Search quick start cards"`, `aria-controls="card-grid"`, `aria-live="polite"` on result count
- Cards with disabled actions: `aria-disabled="true"` on button, not `disabled` (maintains focusability)

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/quickstart/QuickStartView.tsx` — **New file**

**Reuse:**
- `Panel` for card layout
- `StatusChip` for per-card status
- `Button` size `sm` for card actions
- `Badge` tone `warning` for setup banner
- `EmptyState` if search returns no cards

**Card data:** Static config array, status resolved dynamically:
```typescript
const CARDS: QuickStartCard[] = [
  { id: "workspace", title: "Start AI Workspace", icon: MessageSquare, ... },
  ...
]
// Status resolved via:
const statuses = await resolveQuickStartStatuses(bridge)
```

**Nav registration:** Add to `PrimarySidebar` under "System" section or surface only during first-run flow.

**Effort labels:** Low = <1 min, Medium = 1–5 min (shown as plain text, not a scale widget)
