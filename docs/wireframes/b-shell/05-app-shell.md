# 05. Shared App Shell

**Category:** B — Shell  
**Complexity:** Tier 3 (power component)  
**Status:** Exists (`components/layout/` — TitleBar, PrimarySidebar, SecondaryRail, ControllerHintBar)  
**Shell:** IS the shell — this wireframe documents the container used by all other screens

---

## Purpose

Define the reusable layout frame shared by all Tier 2/3 screens — providing nav, context, status, and window controls in a consistent 1280×800 envelope.

---

## Primary User Goal

Navigate to any feature and see the current app status at a glance without leaving the current screen.

---

## Layout Zones (1280 × 800, Steam Deck canonical)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [TITLE BAR — 44px]                                                             │
│ ● ● ●  │  NEURODECK · [Session/Screen Title]  [⌕ Search] [Model●] [IPC●] [─][□][×] │
├──────┬──────────────────────────────────────────────────────┬─────────────────┤
│ NAV  │                                                      │ CONTEXT RAIL    │
│ RAIL │  [ACTIVE VIEW RENDERS HERE]                          │ (280px)         │
│      │                                                      │                 │
│ 72px │  All feature views mount in this zone               │ ┌─────────────┐ │
│      │  position: absolute; inset: 0                        │ │ Control     │ │
│ Icon │  overflow: hidden                                    │ │ Stack       │ │
│ +    │                                                      │ ├─────────────┤ │
│ Lbl  │                                                      │ │ Context     │ │
│      │                                                      │ │ Sources     │ │
│ (exp │                                                      │ ├─────────────┤ │
│ ands │                                                      │ │ Active      │ │
│ on   │                                                      │ │ Operators   │ │
│ hov/ │                                                      │ ├─────────────┤ │
│ pin) │                                                      │ │ Local       │ │
│      │                                                      │ │ State       │ │
│      │                                                      │ └─────────────┘ │
├──────┴──────────────────────────────────────────────────────┴─────────────────┤
│ [CONTROLLER HINT BAR — 44px — deck mode only]                                 │
│ [A] Confirm  [B] Back  [Y] Reload  [X] Search  [LB] Prev  [RB] Next  [☰] Menu│
└────────────────────────────────────────────────────────────────────────────────┘

OVERLAY SYSTEM (renders above shell, z-index layered):
  ┌──────────────────────────────────┐
  │  Command Palette (z-40)          │
  │  Notification Center (z-40)      │
  │  Settings Modal (z-40)           │
  │  Keyboard Shortcuts (z-40)       │
  │  Controller Prompt Dialog (z-40) │
  │  Toast Stack (z-50)              │
  └──────────────────────────────────┘
```

---

## Zone Descriptions

### Title Bar (44px, `TitleBar.tsx`)

| Slot | Content | Interaction |
|------|---------|------------|
| Left | Traffic light dots (decorative) → divider → NEURODECK wordmark + subtitle | Electron window drag region |
| Center | Current screen/session title (truncated) | Display only |
| Right | Global search trigger, Active model pill, IPC health pill, Offline indicator, Window controls (─ □ ×) | Clickable |

**Model pill:** `[●] gemini-2.5-flash` — colored dot (green = healthy, amber = degraded, red = error). Click → navigates to Models view.  
**IPC pill:** `[●] Bridge` — green/red. Click → navigates to Diagnostics view.  
**Offline badge:** Appears when `state.offlineMode === true`. Click → navigates to Privacy settings.

---

### Nav Rail (72px collapsed / 200px expanded, `PrimarySidebar.tsx`)

**Behavior:** Collapsed (icon-only) by default. Expands on hover (transient) or pin toggle (persistent). Expansion is animated (`transition: width 150ms ease`). Pin state persisted to `localStorage`.

**Navigation sections:**

| Section | Items |
|---------|-------|
| Mission Control | Chat/Workspace, Execution, Agents, Memory |
| Dev Tools | Canvas, Terminal, SSH, IDE, Git, API Lab, CLI Maker |
| Network | Browser, Tunnel, Share, Torrent, Remote |
| Knowledge | Project, Docs, Prompt Lab, Academy, Graph, Sessions |
| Automation | Scheduler, Orchestrator, Sync |
| System | Models, Offline/Cache, Plugins, Diagnostics, Settings, Fonts |
| Integrations | MCP Server |
| Security & Ops | Security, Themes, Exports, Maintenance, Recovery |

**Active item styling:** Left accent border (`border-l-2 border-nd-accent-primary`) + highlight bg.

**Footer:** Offline Ready badge + Settings icon button + Notifications icon button + Deck Mode toggle.

---

### Secondary Rail (280px, `SecondaryRail.tsx`)

**Optional** — visible by default on desktop, collapsible. Persistence: `localStorage("nd:rail-collapsed")`.

**Panels (stacked vertically, each collapsible internally):**

| Panel | Content |
|-------|---------|
| Control Stack | 4 mini-stats (Models, Agents, Pins, Plugins) + Context Used bar + Release Risks |
| Context Sources | Up to 4 pinned memory items with pin/unpin toggle |
| Active Operators | Agent list with status badges (thinking/complete/blocked/idle) |
| Local State | System status: Saved / Export / Diagnostics; current error display |

---

### Overlay System

All overlays render as absolutely-positioned layers with `FocusTrapContainer`. Escape closes the topmost overlay.

| Overlay | Z-index | Trigger |
|---------|---------|---------|
| Command Palette | 40 | `⌘` button in nav rail header / `Ctrl+Shift+K` |
| Settings Modal | 40 | Settings icon in nav footer / `Ctrl+,` |
| Notification Center | 40 | Notifications icon in nav footer |
| Keyboard Shortcuts | 40 | `Ctrl+/` |
| Controller Prompt | 40 | `L4` / `back+Y` on gamepad |
| Quick Switcher | 35 | `Ctrl+Tab` |
| Toast Stack | 50 | Programmatic via `useToast()` |

---

### Controller Hint Bar (44px, `ControllerHintBar.tsx`)

Visible only when `state.deckMode === true`. Contains 7 static global hints:

```
[A] Confirm   [B] Back   [Y] Reload   [X] Search   [LB] Prev Tab   [RB] Next Tab   [☰] Menu
```

Individual screens can extend these via a `useControllerHints()` hook that injects screen-specific hints.

---

## Shell States

### Ready
Standard shell — all zones visible and interactive.

### IPC Degraded
- IPC pill turns amber/red
- `ErrorState` banner can appear at top of active view
- Shell chrome remains functional

### Offline Mode
- Offline badge in title bar
- Nav items requiring IPC are dimmed (but still navigable)
- Tooltip: "Feature unavailable offline"

### Deck Mode Active
- `ControllerHintBar` becomes visible (slides up from bottom, 44px push)
- Nav rail stays icon-only (no hover expansion — use D-pad instead)
- All touch targets ≥ 44px enforced

### Safe Mode
- Yellow banner below title bar: "⚠ Safe Mode — plugins disabled"
- Nav items for Plugins/Lua grayed out with tooltip

---

## IPC Dependencies

| Connector | Usage |
|-----------|-------|
| `window.neurodeck.system` | `getConfig()` — initial state hydration |
| `window.neurodeck.models` | Model pill status |
| `/health` | IPC health pill — polled every 30s |

---

## Controller Navigation (Shell-Level)

- **Left stick / D-pad Up/Down:** Scroll active view or navigate sidebar items when sidebar focused
- **LB / RB:** Previous / next tab within tabbed views
- **Back + Y:** Open controller prompt / radial menu
- **Menu button:** Open command palette
- **L4:** Switch persona
- **R4:** Regenerate last AI response
- **L5:** Save session
- **R5:** New session

---

## Keyboard / Mouse Fallback (Shell-Level)

- **`Ctrl+Shift+K`:** Command palette
- **`Ctrl+,`:** Settings
- **`Ctrl+/`:** Keyboard shortcuts reference
- **`Ctrl+Tab`:** Quick view switcher
- **`1`–`8`, `0`, `D`:** Jump to views (mapped in seed.ts)
- **`Escape`:** Close topmost overlay

---

## Accessibility Notes

- Shell landmark structure: `<header>` (TitleBar), `<nav>` (PrimarySidebar), `<main>` (active view), `<aside>` (SecondaryRail), `<footer>` (ControllerHintBar)
- `aria-label="Main navigation"` on nav rail
- `aria-label="Context panel"` on secondary rail
- Active nav item: `aria-current="page"` on the current view's nav button
- Skip link: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` at top of DOM
- Overlays: `role="dialog"`, `aria-modal="true"`, `FocusTrapContainer` active

---

## Developer Implementation Notes

**Files:**
- `frontend/src/react/App.tsx` — shell composition, overlay mounting, startup
- `frontend/src/react/components/layout/TitleBar.tsx`
- `frontend/src/react/components/layout/PrimarySidebar.tsx`
- `frontend/src/react/components/layout/SecondaryRail.tsx`
- `frontend/src/react/components/layout/ControllerHintBar.tsx`
- `frontend/src/react/app/AppViewRouter.tsx` — lazy view mounting

**CSS Specificity Rule (critical — do not violate):**  
Never add `display: flex` or `display: block` to `#view-*` ID rules in `app.css`. ID selectors (specificity 100) beat `.view-content.active` (specificity 20) and break tab switching. Only use `flex-direction`, `overflow`, `background` on ID rules.

**Shell dimensions (custom properties):**
```css
--nd-shell-statusbar: 44px;   /* title bar */
--nd-shell-navrail: 72px;     /* collapsed sidebar */
--nd-sidebar-expanded: 200px; /* expanded sidebar */
--nd-shell-context: 280px;    /* secondary rail */
--nd-hint-bar: 44px;          /* controller hint bar */
```
