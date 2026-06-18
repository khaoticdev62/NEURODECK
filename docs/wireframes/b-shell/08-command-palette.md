# 08. Command Palette

**Category:** B — Shell  
**Complexity:** Tier 2  
**Status:** Exists (`components/command/CommandPalette.tsx` overlay)  
**Shell:** Full-Screen Overlay (z-40)

---

## Purpose

Run app commands, navigate to views, and execute agent/session/model actions quickly via keyboard or controller.

---

## Primary User Goal

Execute an action without using the mouse — type or search, find the command, run it.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [DIMMED BACKDROP]                                                             │
│                                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐     │
│   │  [COMMAND INPUT]                                                    │     │
│   │  > Type a command or search…                            [✕ Esc]    │     │
│   ├─────────────────────────────────────────────────────────────────────┤     │
│   │  [RESULT LIST — scrollable, max 10 visible]                         │     │
│   │                                                                     │     │
│   │  Recent                                                             │     │
│   │  ─────────────────────────────────────────────────                  │     │
│   │  ▶ Go to Terminal                               Ctrl+5              │     │
│   │  ▶ New Session                                  Ctrl+N              │     │
│   │                                                                     │     │
│   │  Navigation                                                         │     │
│   │  ─────────────────────────────────────────────────                  │     │
│   │  ▶ Go to Workspace                              1                   │     │
│   │  ▶ Go to Agents                                 3                   │     │
│   │  ▶ Go to Settings                               Ctrl+,              │     │
│   │                                                                     │     │
│   │  Session                                                            │     │
│   │  ─────────────────────────────────────────────────                  │     │
│   │  ▶ New Session                                                      │     │
│   │  ▶ Export Current Session                                           │     │
│   │                                                                     │     │
│   ├─────────────────────────────────────────────────────────────────────┤     │
│   │  [A] Run  [B] Close  [↑↓] Navigate  [LB/RB] Category               │     │
│   └─────────────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Command Input | `TextInput` autofocused | Prefix `>`, placeholder text, clear (Esc) | Filters command list in real-time |
| Result List | Grouped list | Commands grouped by category, shortcut labels | Keyboard-navigable, 10 items visible, scrollable |
| Footer | Hint row | `[A] Run  [B] Close  [↑↓] Navigate  [LB/RB] Category` | `DeckButtonHint` in deck mode |

---

## Command Categories

| Category | Example Commands |
|----------|----------------|
| Recent | Last 5 executed commands (persisted in localStorage) |
| Navigation | Go to [view name] |
| Session | New Session, Export Session, Load Session, Delete Session |
| Agent | Create Agent, Run Agent, Stop Agent |
| Model | Switch Model, Check Model Health, Import Model |
| Terminal | New Terminal Session, Clear Terminal, Run Command |
| Settings | Open Settings, Set Theme, Toggle Deck Mode, Set Persona |
| Memory | Search Memory, Pin Memory, Clear Memory |
| Diagnostics | Run Health Check, Export Logs, Open Diagnostics |

---

## Primary Action

**Label:** [Enter] or [A] on focused command  
**Outcome:** Executes command; closes palette; shows toast on completion if relevant

---

## Secondary Actions

- **Category filter (LB/RB):** Cycle through command categories
- **Esc:** Close palette, restore focus

---

## States

### Empty (no input)
- Show "Recent commands" group (up to 5)
- Show all categories collapsed with first 2 items each

### Typing
- Fuzzy-filter across all commands in real-time
- Match on title, keywords, shortcut

### Results Found
- Matched commands shown, grouped by category
- First result auto-selected

### No Results
- "No commands matching '[query]'" message
- Suggestion: "Try different keywords"

### Command Running
- Palette closes; toast shows "[Command name] running…"
- Some commands show inline progress (e.g., model import)

### Permission Required
- Command shows lock icon
- Tooltip on hover: "Requires [permission]"
- Activating shows `ConfirmDialog` explaining permission

### Command Failed
- Toast tone `error`: "[Command name] failed — [short reason]"

---

## IPC Dependencies

Command palette is primarily **local** — command registry is static client-side. Only command execution triggers IPC calls (which vary per command).

| Connector | Usage |
|-----------|-------|
| Various | Depends on command executed |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate command items
- **LB / RB:** Previous / next category (jumps to first item in category)
- **A (confirm):** Execute focused command
- **B:** Close palette
- **Hint bar:** `[A] Run  [B] Close  [↑↓] Navigate  [LB/RB] Category`

---

## Keyboard / Mouse Fallback

- **↑ / ↓:** Navigate commands
- **Enter:** Execute focused command
- **Escape:** Close palette
- **Tab:** Move between input and results (input should retain primary focus)

---

## Accessibility Notes

- `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`
- `FocusTrapContainer` active
- Input: `role="combobox"`, `aria-autocomplete="list"`, `aria-controls="command-list"`
- List: `role="listbox"`, items `role="option"`, `aria-selected` on focused
- Group headers: `role="group"`, `aria-label="[Category]"`
- Live region: `aria-live="polite"` on result count

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/command/CommandPalette.tsx` (exists)

**Command registry:** `frontend/src/react/app/palette-commands.ts` — static array of `PaletteCommand` objects with `{ id, title, category, keywords, shortcut, action }`

**Recent commands:** `localStorage("neurodeck:recent-commands")` — string array of command IDs, max 5

**Fuzzy search:** Client-side filter using simple substring match on `title` + `keywords`; no external library needed

**Trigger:** `state.commandOpen === true` → mounted in `AppOverlays`; `dispatch({ type: "toggle-command", open: false })` on close

**Shortcut display:** Format as `Ctrl+K`, `⌘+K`, or `LB+RB` based on `state.deckMode`
