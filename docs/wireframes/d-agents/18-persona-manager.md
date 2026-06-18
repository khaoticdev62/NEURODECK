# 18. Persona Manager

**Category:** D — Agents  
**Complexity:** Tier 2  
**Status:** New — `features/personas/PersonaManagerView.tsx`  
**Shell:** Full App Shell

---

## Purpose

Manage AI personas — the role, tone, and system prompt that shapes how the AI responds in chat and agent contexts.

---

## Primary User Goal

Switch to, customize, or create a persona that fits the current task.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Personas                              [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Personas                                         [+ Create Persona]   │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [BUILT-IN PERSONAS — 3 col grid]                                      │
│      │  Built-in                                                               │
│      │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │
│      │  │ 🧑‍💻 Developer  │  │ 🏗 Architect   │  │ 🛡 Security   │              │
│      │  │ Active ●       │  │ Idle           │  │ Idle           │              │
│      │  │ [Activate]    │  │ [Activate]    │  │ [Activate]    │              │
│      │  └───────────────┘  └───────────────┘  └───────────────┘              │
│      │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │
│      │  │ 🔬 Researcher  │  │ ✍ Writer       │  │ 🎓 Educator   │              │
│      │  │ Idle           │  │ Idle           │  │ Idle           │              │
│      │  │ [Activate]    │  │ [Activate]    │  │ [Activate]    │              │
│      │  └───────────────┘  └───────────────┘  └───────────────┘              │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  Custom                                                                │
│      │  ┌───────────────┐  [No custom personas yet — Create one →]           │
│      │  │ 🤖 My Custom   │                                                    │
│      │  │ Idle           │                                                    │
│      │  │ [Activate][✎] │                                                    │
│      │  └───────────────┘                                                    │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [PREVIEW PANEL — active when persona card focused]                    │
│      │  Persona: Developer                                                    │
│      │  "You are a senior software engineer..."                               │
│      │  [Test: "Hello" →]  Response preview: "Hi! I'm ready to help..."      │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Activate  [B] Back  [X] Edit  [Y] Create             │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` eyebrow | Title + Create button | Sticky |
| Built-in Persona Grid | `Panel` × 6 cards | 6 built-in personas | Not editable; activatable only |
| Custom Persona Grid | `Panel` × N cards + `EmptyState` | User-created personas | Editable and deletable |
| Preview Panel | `Panel` | System prompt preview + test response | Updates on persona card focus |

---

## Built-in Personas (hardcoded in `lib.rs` PERSONAS map)

| ID | Name | Role summary |
|----|------|-------------|
| `developer` | Developer | Senior software engineer |
| `architect` | Architect | Systems architect |
| `security` | Security Analyst | Security and vulnerability expert |
| `researcher` | Researcher | Research and synthesis |
| `writer` | Writer | Technical and creative writing |
| `educator` | Educator | Teaching and explanation |

Plus BMAD personas registered via `plugins/bmad.lua`: John, Sally, etc.

---

## Persona Card Structure

```
┌─────────────────────────────────────┐
│  [Icon]  [Persona Name]  [Chip]     │
│  [Role summary — 1 line]            │
│  [Activate]  [Preview]  (custom:✎) │
└─────────────────────────────────────┘
```

**Chip states:**
- `Active ●` — green; this is the current persona in workspace
- `Default ◆` — marked as default startup persona
- `Idle` — neutral; available but not active
- `From plugin` — `Badge` variant `outline` "Plugin"

---

## Primary Action

**Label:** Activate  
**IPC:** `dispatch({ type: "set-persona", persona: id })` (client-side; bridge call may follow for Lua plugins)  
**Outcome:** Toast "Persona: [name] active", workspace chat header updates, next AI response uses new persona

---

## Secondary Actions

- **+ Create Persona** — opens persona edit modal (new)
- **✎ Edit** (custom only) — opens persona edit modal (edit mode)
- **Preview** — focuses preview panel with system prompt and test response
- **Set as Default** (… menu on cards) — marks persona as startup default
- **Assign to Workspace** (… menu) — pins persona to current session only
- **Delete** (custom only, … menu) — `ConfirmDialog` before delete

---

## States

### No Custom Personas
- Custom section: `EmptyState` compact: "No custom personas yet. Create one to tailor the AI's behavior."
- Built-in section still fully populated

### Persona Active
- Active card highlighted with cyan left border + `Badge` "Active ●"
- "Activate" becomes "Active ✓" (disabled)

### Editing Persona
- Modal opens over this view (not a new view)

### Validation Error
- Modal shows inline errors

### Save Success
- Modal closes; new/updated persona card appears in Custom grid
- Toast: "Persona saved"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getPersonas()` — load all personas including Lua-registered ones |
| `window.neurodeck.ai` | Test prompt in preview panel: `sendCommand({ prompt: "Hello", persona: id })` |

Built-in personas also defined in global state `PERSONAS` map from `lib.rs`; custom personas stored in `user_config_dir()/data/personas.json`.

---

## Persona Edit Modal Fields

| Field | Notes |
|-------|-------|
| Name | Required, 2–40 chars |
| Icon emoji | Optional picker |
| Role / System Prompt | Required textarea, max 2000 chars |
| Default persona | Toggle |
| Test prompt | Optional; "Test" button runs preview |

---

## Controller Navigation

- **D-pad Up/Down/Left/Right:** Navigate persona cards (grid)
- **A (confirm):** Activate focused persona
- **B:** Back to previous view
- **X:** Edit focused card (custom only; ghost action for built-in)
- **Y:** Create new persona
- **LB / RB:** Scroll preview panel / navigate between built-in and custom sections
- **Hint bar:** `[A] Activate  [B] Back  [X] Edit  [Y] Create`

---

## Keyboard / Mouse Fallback

- **Tab:** Header → built-in grid → custom grid → preview panel
- **Arrow keys:** Navigate within grid (roving tabindex)
- **Enter:** Activate focused persona
- **Escape:** Close modal if open

---

## Accessibility Notes

- Persona cards: `role="article"`, `aria-label="[Persona name] persona, [status]"`
- Active persona: `aria-current="true"` on card
- Preview panel: `aria-live="polite"` — updates when persona changes
- Test response: `aria-live="polite"` on test output area
- Edit modal: `role="dialog"`, `aria-modal="true"`, `FocusTrapContainer`
- Built-in personas: "Not editable" tooltip on ✎ icon for built-in cards

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/personas/PersonaManagerView.tsx` — **New file**

**Persona data flow:**
```typescript
// On mount:
const personas = await window.neurodeck.system.getPersonas()
// Returns: Array<{ id, name, icon, role, systemPrompt, isBuiltIn, isDefault }>

// Activate:
dispatch({ type: "set-persona", persona: id })
// + if Lua plugin: invoke setPersona(id) via bridge
```

**Custom persona storage:** `user_config_dir()/data/personas.json` — read/write via `window.neurodeck.system.saveConfig()` or dedicated persona API.

**Nav registration:** Add to `PrimarySidebar` under Mission Control section (between Agents and Memory).
