# 19. Automation / Task Runner

**Category:** D — Agents  
**Complexity:** Tier 2  
**Status:** Exists (`features/scheduler/SchedulerView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Create and manage repeatable AI workflows, scheduled jobs, and local automations triggered by time or event.

---

## Primary User Goal

Create a recurring automation or run a one-shot task without manual setup each time.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Automation                            [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]  Automation          [Search…]  [+ Create Automation]        │
│ Rail ├──────────────────────────────────────────────────────────────────────────┤
│      │  [TABS]  [Scheduled]  [Manual]  [Event-based]  [Run History]           │
│      ├──────────────────────────────────────────────────────────────────────────┤
│      │  [AUTOMATION LIST — scrollable]                                        │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  ⏰ Daily Code Review                                Enabled ●   │  │
│      │  │  Runs at 09:00 every day · Last run: today 09:00                 │  │
│      │  │  Action: Agent "Builder" · Prompt: "Review open PRs"             │  │
│      │  │  [▶ Run Now]  [Edit]  [Disable]  [Delete]                        │  │
│      │  │  Last run: ✓ Completed · Next run: tomorrow 09:00                │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  ⚡ On-demand: Summarize session                      Manual     │  │
│      │  │  Action: AI prompt · "Summarize this session in 5 bullets"       │  │
│      │  │  [▶ Run Now]  [Edit]  [Delete]                                   │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Run  [B] Back  [X] Edit  [Y] Create                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Automation Types

| Type | Trigger | Examples |
|------|---------|---------|
| Scheduled | Cron expression | Daily digest, weekly review |
| Manual | Run Now button | On-demand summarize, export |
| Event-based | App event | On session start, on error, on model change |

---

## Primary Action

**Label:** ▶ Run Now  
**IPC:** `window.neurodeck.scheduler.runJob(id)`  
**Outcome:** Automation executes; Run History tab gains entry; Toast when complete

---

## Secondary Actions

- **+ Create Automation** — opens create wizard (3 steps: trigger → action → permissions)
- **Edit** — opens edit wizard pre-filled
- **Disable/Enable** — toggle active state
- **Delete** — `ConfirmDialog`
- **Run History tab** — shows past run log per automation

---

## States

### No Automations
- `EmptyState` (variant `deck`): icon `Clock`, title "No automations yet", action "Create Automation"

### Running
- Card shows `StatusChip` pulse "Running"
- "Run Now" disabled during run

### Completed
- Toast + last run updated to "Completed [time]"

### Failed
- `StatusChip` tone `error` "Failed"
- "View error" link → Run History

### Permission Required
- `Badge` on card "Permission required"
- Run Now disabled until permission granted

### Connector Unavailable
- Card shows `Badge` tone `error` if connected agent/model unavailable

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.scheduler` | `list()`, `create(job)`, `update(id, job)`, `delete(id)`, `runJob(id)`, `disable(id)`, `enable(id)`, `getHistory(id)` |

---

## Accessibility Notes

- `StatusChip` pulse: `aria-label="Running"` not just visual pulse
- Run Now: `aria-label="Run automation: [name]"`
- Enable/Disable toggle: `role="switch"`, `aria-checked`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/scheduler/SchedulerView.tsx` (exists — rename/extend to AutomationView)

**Cron jobs** stored in `user_config_dir()/data/jobs.json` and rehydrated on startup via `tokio-cron-scheduler`.

**Create wizard:** 3-step `Modal` (size `lg`): Step 1 — trigger type + cron/event picker; Step 2 — action selector (agent/prompt/Lua); Step 3 — permissions + name.
