# 06. Dashboard

**Category:** B — Shell  
**Complexity:** Tier 2  
**Status:** Partial — no dedicated `DashboardView.tsx`; stats exist in SecondaryRail and ExecutionView  
**Shell:** Full App Shell

---

## Purpose

Act as the operational home base — showing app health, session state, active AI resources, and quick-launch options in one glance.

---

## Primary User Goal

Resume the last session or quickly assess the app's state and jump to the right feature.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Dashboard                             [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HERO ZONE — Resume Last Workspace]                                   │
│ Rail │  ┌─────────────────────────────────────────────────────────────────┐   │
│      │  │  📋 "Research session" · gemini-2.5-flash · 12 messages        │   │
│      │  │  Last active 2h ago                          [Resume →]        │   │
│      │  └─────────────────────────────────────────────────────────────────┘   │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [STATS ROW — 4 metric cards]                                          │
│      │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│      │  │ Models   │  │ Agents   │  │ Memory   │  │ Plugins  │              │
│      │  │    3     │  │    2     │  │  47 items│  │    5     │              │
│      │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [TWO-COLUMN ZONE]                                                     │
│      │  ┌───────────────────────────────┐  ┌───────────────────────────────┐ │
│      │  │ RECENT SESSIONS               │  │ SYSTEM READINESS              │ │
│      │  │ • Session A · 3h ago          │  │ ✓ IPC Bridge      Ready       │ │
│      │  │ • Session B · yesterday       │  │ ✓ Model Runtime   Ready       │ │
│      │  │ • Session C · 2 days ago      │  │ ✓ Storage         Healthy     │ │
│      │  │ [View all sessions →]         │  │ ✓ Plugins         5 active    │ │
│      │  └───────────────────────────────┘  │ ⚠ Memory          Near limit  │ │
│      │                                      │ [Open Diagnostics →]          │ │
│      │                                      └───────────────────────────────┘ │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [QUICK ACTIONS ROW]                                                   │
│      │  [New Session]  [New Agent]  [Open Terminal]  [Import Context]         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Resume  [B] Back  [X] New Session  [Y] Quick Actions  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Hero | `Panel` variant `elevated` | Last session title, model, message count, time, Resume button | Hidden if no sessions exist |
| Stats Row | `MetricCard` × 4 | Models / Agents / Memory items / Plugins | Click each → navigate to respective view |
| Recent Sessions | `Panel` + list | Last 3 sessions with timestamps | "View all →" → SessionsView |
| System Readiness | `Panel` + checklist | IPC/model/storage/plugin/memory status | `StatusChip` per item; "Open Diagnostics →" |
| Quick Actions | `Button` row | New Session, New Agent, Open Terminal, Import Context | Icon buttons with labels |

---

## Primary Action

**Label:** Resume →  
**IPC:** `window.neurodeck.sessions.getLast()` on mount → dispatches `set-view: workspace` + loads session  
**Outcome:** Returns user to last active chat session

---

## Secondary Actions

- **New Session** — clears workspace state, navigates to workspace
- **New Agent** — navigates to agents view with create drawer open
- **Open Terminal** — navigates to terminal view
- **Import Context** — navigates to project view
- **View all sessions →** — navigates to sessions view
- **Open Diagnostics →** — navigates to diagnostics view
- **MetricCard clicks** — navigate to relevant feature views

---

## States

### Ready
Full dashboard as shown above.

### Needs Setup (fresh install, no sessions)
- Hero zone replaced with `EmptyState`:
  - Icon: `Rocket`
  - Title: "Ready to launch"
  - Description: "Start a session or run the Quick Start Hub."
  - Action: `Button` → Quick Start Hub
- Recent Sessions panel: `EmptyState` compact ("No sessions yet")

### Offline
- System Readiness: all IPC-dependent checks show `warning`
- Hero: "Offline mode active — session history unavailable"
- Stats: show cached values with "Last updated" timestamp

### IPC Degraded
- `ErrorState` banner at top with "Retry Connection"
- Stats row shows `—` placeholders
- Recent Sessions: "Could not load sessions"

### Safe Mode
- Yellow banner: "⚠ Safe Mode active — plugins and agents disabled"
- Agent count MetricCard shows `—`
- Quick Actions: "New Agent" disabled

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sessions` | `getLast()`, `list({ limit: 3 })` |
| `window.neurodeck.models` | `list()` → count |
| `window.neurodeck.agents` | `list()` → count |
| `window.neurodeck.memory` | `getStats()` → item count, usage |
| `window.neurodeck.plugins` | `list()` → count |
| `window.neurodeck.diagnostics` | `getHealthSummary()` |

---

## Controller Navigation

- **D-pad Up/Down:** Move between zones (Hero → Stats → Two-column → Quick Actions)
- **D-pad Left/Right:** Within Stats row (MetricCard focus), within Quick Actions row
- **A (confirm):** Activate focused item (Resume hero, MetricCard link, Quick Action button)
- **B:** Back to previously active view
- **X:** New Session
- **Y:** Focus Quick Actions row
- **Hint bar:** `[A] Resume  [B] Back  [X] New Session  [Y] Quick Actions`

---

## Keyboard / Mouse Fallback

- **Tab:** Moves through Hero CTA → MetricCards → Session list items → Readiness links → Quick Actions
- **Enter / Space:** Activate focused element
- **Arrow keys:** Navigate within card rows (roving tabindex)

---

## Accessibility Notes

- `<main>` landmark wraps all dashboard content
- Hero `Panel`: `aria-label="Resume last session: [session name]"`
- MetricCards: `role="link"` or `<a>` wrapped, `aria-label="[count] [label], click to view"`
- System Readiness checklist: `role="list"` / `role="listitem"`, status items use `aria-label="[check]: [status]"`
- Live region: `aria-live="polite"` on stats row — updates when data loads

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/dashboard/DashboardView.tsx` — **New file**

**Reuse:**
- `MetricCard` (already exists in primitives)
- `Panel` for each content zone
- `EmptyState` (variant `default`) for no-sessions hero replacement
- `StatusChip` for readiness checklist
- `Button` for quick actions

**Data loading:**
```typescript
const [data, setData] = useState<DashboardData | null>(null)
useEffect(() => {
  Promise.all([
    bridge.sessions.getLast(),
    bridge.sessions.list({ limit: 3 }),
    bridge.models.list(),
    bridge.agents.list(),
    bridge.memory.getStats(),
    bridge.plugins.list(),
    bridge.diagnostics.getHealthSummary(),
  ]).then(([lastSession, sessions, models, agents, memStats, plugins, health]) => {
    setData({ lastSession, sessions, models, agents, memStats, plugins, health })
  })
}, [])
```

**Nav registration:** Add to `PrimarySidebar` as the first item in Mission Control section (or as the default view replacing workspace on first launch).
