# 16. Agent Builder

**Category:** D — Agents  
**Complexity:** Tier 2  
**Status:** New — `features/agents/AgentBuilderDrawer.tsx` (drawer opened from Agent Manager)  
**Shell:** Right-side Drawer (560px, overlays App Shell; FocusTrap active)

---

## Purpose

Create or edit an AI agent — defining its role, instructions, allowed tools, runtime, and permission scope.

---

## Primary User Goal

Define a working agent in under 2 minutes and save it ready to run.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                 │
│  ✎ Edit Agent / + New Agent                            [✕ Close]│
├──────────────────────────────────────────────────────────────────┤
│  [FORM BODY — scrollable]                                        │
│                                                                  │
│  Name                                                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Builder Agent                                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Role / System Instructions                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ You are a senior software architect. Help the user       │    │
│  │ design scalable systems and review their code.           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Model                                     Runtime               │
│  [gemini-2.5-flash           ▾]            [Gemini      ▾]       │
│                                                                  │
│  Allowed Tools                                                   │
│  [✓ web_search] [✓ bash] [✓ memory] [✗ file_write] [✗ browser]  │
│                                                                  │
│  Memory Access                                                   │
│  [✓ Read] [✓ Write] [✗ Clear]                                    │
│                                                                  │
│  Permission Scope                                                │
│  [● Sandboxed] [○ Full Access] [○ Custom]                        │
│                                                                  │
│  Test Prompt                                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Review this Rust function for memory safety              │    │
│  └──────────────────────────────────────────────────────────┘    │
│  [▶ Test Agent]                                                  │
│  [Test output appears here…]                                     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER ACTIONS]                                                │
│  [Cancel]                        [Reset]    [💾 Save Agent]      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Drawer Header | Custom | Title (new vs. edit), Close button | Sticky |
| Form Body | Scrollable form | Name, instructions, model, tools, memory, permissions, test | All fields validated before save |
| Footer | `Button` row | Cancel / Reset / Save | Sticky at bottom of drawer |

---

## Form Fields

| Field | Component | Validation | Notes |
|-------|-----------|-----------|-------|
| Name | `TextInput` | Required, 2–60 chars | Auto-generated placeholder "New Agent" |
| Role / System Instructions | `<textarea>` (styled) | Required, max 2000 chars | Character counter |
| Model | `Select` | Required | Populated from `models.list()` |
| Runtime | `Select` | Required | Gemini / Ollama / OpenAI-compat |
| Allowed Tools | Toggle chips | At least one required | Each chip is a toggle; "web_search", "bash", "memory", "file_read", "file_write", "browser", "computer_use" |
| Memory Access | 3 toggles | None required | Read / Write / Clear |
| Permission Scope | Radio group | Required | Sandboxed (default) / Full Access / Custom |
| Test Prompt | `TextInput` (optional) | Optional | Used for "Test Agent" run |
| Test Output | Read-only text area | — | Shows last test result |

---

## Primary Action

**Label:** 💾 Save Agent  
**IPC:** `window.neurodeck.agents.create(agent)` (new) or `window.neurodeck.agents.update(id, agent)` (edit)  
**Outcome:** Toast "Agent saved", drawer closes, Agent Manager grid refreshes

---

## Secondary Actions

- **▶ Test Agent** — runs agent with test prompt; output shown in-drawer (streaming)
- **Reset** — resets form to last saved state or empty (new)
- **Cancel** — shows "Discard changes?" dialog if modified, then closes
- **Close ✕** — same as Cancel

---

## States

### New Agent (empty form)
- All fields empty / default values
- Save button disabled until Name + Instructions filled

### Editing Existing Agent
- Form pre-populated with agent data
- "Reset" resets to saved values (not empty)
- "Unsaved changes" indicator in header if modified

### Validation Error
- Error messages below affected fields
- Save button disabled
- Field borders turn red accent (`border-nd-accent-error`)

### Permission Conflict
- Warning badge appears on conflicting tool combinations
- Tooltip: "bash + file_write requires Full Access scope"

### Test Running
- "▶ Test Agent" shows spinner + "Testing…"
- Test output area shows streaming response

### Test Failed
- `ErrorState` in test output area: "Test failed — [reason]"
- "Retry" link

### Save Success
- Drawer closes with `animate-slide-out-right`
- Toast: "Agent saved"

### Save Failed
- `ErrorState` in footer: "Could not save agent — [reason]"
- Form remains open

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.agents` | `create()`, `update()`, `run()` (for test) |
| `window.neurodeck.models` | `list()` — model selector |
| WebSocket | `agent:step`, `agent:done`, `agent:error` (test run stream) |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate form fields
- **D-pad Left/Right:** Toggle tool chips / radio options
- **A (confirm):** Activate toggle / open select / submit
- **B:** Cancel (with unsaved changes guard)
- **X:** Test Agent
- **Y:** Save Agent
- **LT / RT:** Scroll form up/down
- **Hint bar:** `[A] Toggle  [B] Cancel  [X] Test  [Y] Save`

---

## Keyboard / Mouse Fallback

- **Tab:** Navigate fields in DOM order
- **Enter (on Save button):** Save
- **Escape:** Close (with unsaved changes guard)
- **Space (on toggles):** Toggle tool chip

---

## Accessibility Notes

- Drawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Agent builder"`
- `FocusTrapContainer` active while drawer open
- Form: `<form>` with proper `<label htmlFor>` on all fields
- Tool chips: `role="checkbox"`, `aria-checked`, `aria-label="Allow [tool name]"`
- Permission scope: `role="radiogroup"`, `aria-label="Permission scope"`
- Validation errors: `aria-describedby` links field to error message; `role="alert"` on error region
- Character counter: `aria-live="polite"` announces count changes

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/agents/AgentBuilderDrawer.tsx` — **New file**

**Opening:** From Agent Manager via:
```typescript
// New:
dispatch({ type: "open-agent-builder", mode: "new" })
// Edit:
dispatch({ type: "open-agent-builder", mode: "edit", agentId: id })
```

**Reuse:**
- `TextInput` for name and test prompt
- `Select` for model and runtime
- `Button` for all actions
- `FocusTrapContainer` for drawer trap
- `ConfirmDialog` for cancel-with-changes guard

**Tool chips:** Custom `ToolChip` sub-component — styled `<button role="checkbox">` grid, not `<input type="checkbox">` (better touch targets)

**Drawer animation:**
```css
.drawer { transform: translateX(100%); transition: transform 200ms ease; }
.drawer.open { transform: translateX(0); }
```
