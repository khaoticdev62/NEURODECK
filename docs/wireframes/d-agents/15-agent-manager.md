# 15. Agent Manager

**Category:** D — Agents  
**Complexity:** Tier 3  
**Status:** Exists (`features/agents/AgentsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Create, manage, test, and monitor AI agents — reusable AI workers with defined roles, tool permissions, and runtime configurations.

---

## Primary User Goal

Find an existing agent or create a new one and start using it.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Agents                                [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Agents                              [Search…]  [+ New Agent]          │
│      ├──────────────┬──────────────────────────────────────────────────────────┤
│      │  [CATEGORY   │  [AGENT GRID]                                           │
│      │   FILTER]    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│      │              │  │ 🤖 Builder   │  │ 🔍 Analyst  │  │ 🛡 Security  │    │
│      │  All         │  │ Code gen     │  │ Data anal.  │  │ Vuln scan   │    │
│      │  Code        │  │ Active ●     │  │ Idle        │  │ Idle        │    │
│      │  Research    │  │ [Run][Edit]  │  │ [Run][Edit] │  │ [Run][Edit] │    │
│      │  Security    │  └─────────────┘  └─────────────┘  └─────────────┘    │
│      │  Automation  │                                                         │
│      │  Custom      │  ┌─────────────┐  ┌─────────────┐                     │
│      │              │  │ ✍ Writer    │  │ 🌐 Browser  │                     │
│      │  ──────────  │  │ Doc writer  │  │ Web agent   │                     │
│      │  [+ Import]  │  │ Idle        │  │ Blocked     │                     │
│      │              │  │ [Run][Edit] │  │ [View] ⚠    │                     │
│      │              │  └─────────────┘  └─────────────┘                     │
│      │              │                                                         │
│      │              │  [Run History — 3 recent runs]                          │
│      │              │  • Builder: Completed 2h ago   [Details →]              │
│      │              │  • Analyst: Failed 4h ago      [Details →]              │
├──────┴──────────────┴──────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Run  [B] Back  [X] Edit  [Y] Create  [LB/RB] Category │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` eyebrow + search | Title, search input, "New Agent" button | Sticky |
| Category Filter | Sidebar list | All / Code / Research / Security / Automation / Custom + Import | Sticky left panel |
| Agent Grid | `AgentCard` grid | All agents, filtered by category | 3-col at 1280px, 2-col at tablet |
| Run History | Compact list | Last 3 agent runs with status | Below grid; "View all →" navigates to run history |

---

## Agent Card Structure

```
┌──────────────────────────────────────┐
│  [Icon badge]  [Name]   [Status chip]│
│  [Role — 1 line]                     │
│  ─────────────────────────────────── │
│  Model: gemini-2.5-flash             │
│  Tools: bash, web_search, memory     │
│  ─────────────────────────────────── │
│  [▶ Run]     [✎ Edit]     [… More]  │
└──────────────────────────────────────┘
```

**Status chips:**
- `thinking` — amber pulse "Running"
- `complete` — green "Done"
- `blocked` — red "Blocked"
- `idle` — neutral "Ready"
- `disabled` — gray "Disabled"

---

## Primary Action

**Label:** ▶ Run  
**IPC:** `window.neurodeck.agents.run({ agentId, prompt? })`  
**Outcome:** Opens Agent Run Detail drawer (#17) with live run output

---

## Secondary Actions

- **+ New Agent** — opens Agent Builder (#16) as drawer or modal
- **✎ Edit** — opens Agent Builder with agent pre-loaded
- **… More** — dropdown: Duplicate, Export, Disable, Delete
- **Category filter** — filters grid in-place
- **Search** — filters by name, role, tools
- **Import** — imports agent JSON from file
- **[Details →]** in run history — opens Agent Run Detail (#17)

---

## States

### No Agents
- `EmptyState` (variant `deck`): icon `Bot`, title "No agents yet", description "Create your first agent to automate tasks.", action "Create Agent"

### Agent Disabled
- Card grayed out; `Badge` "Disabled"
- Edit button available; Run button disabled

### Permission Required
- Card shows amber badge "Permission required" on tool that needs permission
- Run button shows `ConfirmDialog` listing required permissions before running

### Tool Unavailable
- Specific tool chip on card shows `Badge` tone `error` "Unavailable"
- Run button disabled with tooltip: "[tool] is not available — check Diagnostics"

### Test Running
- Run button replaced with "Stop ■"
- `StatusChip` pulse "Running" on card
- Agent Run Detail drawer auto-opens

### Test Failed
- `StatusChip` tone `error` "Failed"
- Error message inline on card: "Last run: failed — [short reason]"
- "View Details" replaces Run button

---

## IPC Dependencies

| Connector | Commands Used | Events |
|-----------|--------------|--------|
| `window.neurodeck.agents` | `list()`, `run()`, `stop()`, `create()`, `update()`, `delete()`, `getRuns()` | `agent:start`, `agent:step`, `agent:done`, `agent:error` |

---

## Controller Navigation

- **D-pad Left/Right:** Navigate agent cards (grid)
- **D-pad Up/Down:** Navigate between category filter and grid rows
- **A (confirm):** Run focused agent
- **B:** Back to previous view
- **X:** Edit focused agent (opens Agent Builder)
- **Y:** Create new agent
- **LB / RB:** Previous / next category filter
- **Hint bar:** `[A] Run  [B] Back  [X] Edit  [Y] Create  [LB/RB] Category`

---

## Keyboard / Mouse Fallback

- **Tab:** Section filter → card grid → run history
- **Arrow keys:** Navigate grid (roving tabindex)
- **Enter:** Run focused agent
- **Ctrl+N:** New agent

---

## Accessibility Notes

- Card grid: `role="list"` / `role="listitem"` per card
- `AgentCard`: `aria-label="[Agent name], [status]"`
- Status chips: not color-only — include text label
- Run button: `aria-label="Run agent: [agent name]"`
- Disabled run button: `aria-disabled="true"` with tooltip explaining reason
- Run history: `role="list"`, live region `aria-live="polite"` for new run events

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/agents/AgentsView.tsx` (exists)

**Reuse:**
- `AgentCard` primitive (exists)
- `StatusChip` for agent status
- `EmptyState` for no-agents state
- `Panel` for category filter sidebar
- Agent Builder (#16) as inline drawer

**Run stream:**
```typescript
listen("agent:step", ({ agentId, step }) => updateRunState(agentId, step))
listen("agent:done", ({ agentId, result }) => finalizeRun(agentId, result))
listen("agent:error", ({ agentId, error }) => markFailed(agentId, error))
```
