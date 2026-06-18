# 17. Agent Run Detail

**Category:** D — Agents  
**Complexity:** Tier 2  
**Status:** New — `features/agents/AgentRunDetail.tsx` (drawer or full view)  
**Shell:** Right-side Drawer (640px) or full view if accessed from Run History

---

## Purpose

Inspect a single agent run — inputs, tool calls, timeline, outputs, errors, memory changes — for debugging or review.

---

## Primary User Goal

Understand what the agent did and why, especially when a run failed.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                 │
│  Agent Run: Builder Agent — 12:34 today        [↺ Retry] [✕]   │
│  Status: ✓ Completed  ·  12 steps  ·  4.2s                     │
├──────────────────────────────────────────────────────────────────┤
│  [TABS]                                                          │
│  [Timeline]  [Inputs]  [Outputs]  [Tools]  [Memory]  [Errors]   │
├──────────────────────────────────────────────────────────────────┤
│  [TAB CONTENT — scrollable]                                      │
│                                                                  │
│  Timeline tab:                                                   │
│  ──  Start                                         12:34:00      │
│  ✓   Receive prompt: "Review this function"        12:34:01      │
│  ✓   web_search: "Rust memory safety patterns"    12:34:02      │
│  ✓   Analyze search results                        12:34:04      │
│  ✓   bash: "cargo clippy --all-targets"            12:34:05      │
│      Output: "warning: unused variable `x`…"                    │
│  ✓   Generate response                             12:34:09      │
│  ──  Done                                          12:34:10      │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                        │
│  [↺ Retry Run]                    [↓ Export]   [✕ Close]        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Drawer Header | Custom | Agent name, run timestamp, status chip, step count, duration, Retry + Close | Sticky |
| Tabs | `TabGroup` | Timeline / Inputs / Outputs / Tools / Memory / Errors | 6 tabs |
| Tab Content | Scrollable | Varies per tab | See below |

---

## Tab Content

### Timeline
- Vertical timeline of steps: start → each step → end
- Each step: icon (✓/✗/◌) + step type label + step description + timestamp
- Expandable rows: click step to see full input/output for that step
- Tool call steps show inline output preview

### Inputs
- Original prompt or task description
- Context provided (files, memory)
- Agent configuration at time of run (model, tools, permissions)

### Outputs
- Final generated response (markdown rendered)
- Code blocks with Copy button
- "Send to chat" button: injects output into Workspace input

### Tools
- Table: tool name, input params, output summary, status, latency
- Expandable rows for full tool I/O

### Memory
- Memory items read during run (with relevance score)
- Memory items written during run
- Memory items modified or deleted

### Errors
- Error list: step index, error type, message, stack (collapsed accordion)
- "No errors" EmptyState when clean run

---

## Primary Action

**Label:** ↺ Retry Run  
**IPC:** `window.neurodeck.agents.run({ agentId, prompt: inputs.prompt })`  
**Outcome:** Opens new run; replaces current detail view with new run (live)

---

## Secondary Actions

- **Tab navigation** — switch between run detail views
- **↓ Export** — exports run as JSON or markdown
- **Send to chat** (in Outputs tab) — injects output into Workspace
- **Step expand** (Timeline) — shows full I/O for a step
- **Close ✕** — closes drawer

---

## States

### Running (Live)
- Timeline shows steps in real-time as they complete
- "Stop ■" button instead of "Retry"
- Incomplete steps shown as `StatusChip` pulse "Running"

### Completed
- All steps show ✓
- Retry and Export available

### Failed
- Failed steps show ✗ with `StatusChip` tone `error`
- Errors tab auto-selected
- Error accordion auto-expanded for first error
- Retry prominent

### Cancelled
- Steps show — at cancellation point
- "Cancelled by user" note in timeline
- Retry available

### Permission Denied
- Failed step: "Tool call denied — permission not granted for [tool]"
- "Update agent permissions →" link in Errors tab

---

## IPC Dependencies

| Connector | Commands Used | Events |
|-----------|--------------|--------|
| `window.neurodeck.agents` | `getRun(runId)`, `run()`, `stop()`, `exportRun(runId)` | `agent:step`, `agent:done`, `agent:error` |

---

## Controller Navigation

- **D-pad Left/Right:** Switch tabs
- **D-pad Up/Down:** Navigate timeline steps / table rows
- **A (confirm):** Expand step / activate link
- **B:** Close drawer
- **X:** Export run
- **Y:** Retry run
- **LB / RB:** Previous / next tab
- **Hint bar:** `[A] Expand  [B] Close  [X] Export  [Y] Retry`

---

## Keyboard / Mouse Fallback

- **Tab:** Navigate tab strip → content rows
- **Arrow keys:** Navigate tabs (horizontal), rows (vertical)
- **Enter / Space:** Expand row / activate button
- **Escape:** Close drawer

---

## Accessibility Notes

- Drawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Agent run detail: [agent name]"`
- `FocusTrapContainer` active
- Timeline: `role="list"`, each step `role="listitem"`, expandable steps use `aria-expanded`
- Status chips: include text labels, not color-only
- Running state: `aria-live="polite"` on timeline — announces each new step
- Error tab: `aria-live="assertive"` if run is currently in error state

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/agents/AgentRunDetail.tsx` — **New file**

**Run data model:**
```typescript
interface AgentRun {
  id: string
  agentId: string
  agentName: string
  status: "running" | "completed" | "failed" | "cancelled"
  startedAt: number
  endedAt?: number
  stepCount: number
  durationMs?: number
  prompt: string
  output?: string
  steps: AgentStep[]
  errors: AgentError[]
  memoryReads: MemoryItem[]
  memoryWrites: MemoryItem[]
}
```

**Opening:** From Agent Manager run history or "Run" button live output → `dispatch({ type: "open-run-detail", runId })`

**Live updates:** Subscribe to `agent:step` events for the specific runId while status is "running"

**Reuse:**
- `Tabs` compound component
- `StatusChip`
- `EmptyState` for no-errors state
- `Panel` for tab content zones
