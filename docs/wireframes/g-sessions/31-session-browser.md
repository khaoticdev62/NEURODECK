# 31. Session Browser

**Category:** G — Sessions  
**Complexity:** Tier 2  
**Status:** Exists (`features/sessions/SessionsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Find, resume, organize, export, archive, or delete conversation sessions.

---

## Primary User Goal

Find a previous session and resume it without losing current context.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Sessions                              [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Sessions              [Search…]  [Sort ▾]  [Filter ▾]  [↓ Import]    │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [FILTER CHIPS — horizontal scroll]                                    │
│      │  [All]  [Today]  [This week]  [Archived]  [Tagged: RAG ✕]             │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [SESSION LIST — scrollable]                                           │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  📋 Research on RAG pipelines                         Today      │  │
│      │  │  47 messages · gemini-2.5-flash · Developer            2h ago    │  │
│      │  │  Tags: RAG, architecture                                          │  │
│      │  │  [Resume →]  [Export]  [Rename]  [Archive]  [Delete ✕]           │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                        │
│      │  ┌──────────────────────────────────────────────────────────────────┐  │
│      │  │  📋 Rust WebSocket debugging                        Yesterday    │  │
│      │  │  23 messages · gemini-2.5-flash · Developer            5h ago    │  │
│      │  │  [Resume →]  [Export]  [Rename]  [Archive]  [Delete ✕]           │  │
│      │  └──────────────────────────────────────────────────────────────────┘  │
│      │                                                                        │
│      │  [Load older sessions…]                                               │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Resume  [B] Back  [X] Export  [Y] Archive            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` | Title, search, sort/filter dropdowns, Import | Sticky |
| Filter Chips | Tab chip row | All / Today / This week / Archived / Active tags | Horizontal scroll on compact |
| Session List | Scrollable | `SessionCard` items | Sorted newest first by default |

---

## Session Card Structure

```
┌────────────────────────────────────────────────────────────┐
│  📋 [Session title / name]                    [Date group] │
│  [N messages] · [model] · [persona]           [time ago]   │
│  Tags: [tag chips]                                         │
│  ─────────────────────────────────────────────────────────  │
│  [Resume →]  [Export]  [Rename]  [Archive]  [Delete ✕]    │
└────────────────────────────────────────────────────────────┘
```

**Session title:** Auto-generated from first user message (truncated) or manual rename.

---

## Sort Options

- Newest first (default)
- Oldest first
- Most messages
- By model
- Alphabetical

---

## Primary Action

**Label:** Resume →  
**IPC:** `window.neurodeck.sessions.load(id)` → dispatches `set-view: workspace` + loads messages  
**Outcome:** Navigates to Workspace with session history loaded

---

## Secondary Actions

- **Export** — opens Export Manager (#33) pre-scoped to this session
- **Rename** — inline rename (TextInput replaces title, confirm with Enter)
- **Archive** — moves to Archived filter (hidden from All by default)
- **Delete ✕** — `ConfirmDialog` → `window.neurodeck.sessions.delete(id)`
- **↓ Import** — import a session JSON file
- **Filter chips** — narrow visible sessions
- **Search** — fuzzy match on session title + message content

---

## States

### No Sessions
- `EmptyState` (variant `deck`): icon `MessageSquare`, title "No sessions yet", description "Start a conversation in the Workspace to create your first session.", action "Go to Workspace"

### Search No Results
- `EmptyState` compact: "No sessions match '[query]'"

### Corrupt Session Recovery
- Session card shows `Badge` tone `error` "Corrupt"
- Resume button disabled
- "Recover →" button: attempts partial recovery and opens what's salvageable

### Export Running
- Export button shows spinner "Exporting…"
- Other actions on that card disabled

### Export Complete
- Toast: "Session exported" + "Open File" action

### Delete Confirmation
- `ConfirmDialog` (emphasis `default`): "Delete '[session name]'? This cannot be undone."
- Confirm/Cancel buttons

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sessions` | `list()`, `load(id)`, `delete(id)`, `rename(id, name)`, `archive(id)`, `export(id, format)`, `import(file)` |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate session cards
- **A (confirm):** Resume focused session
- **B:** Back to previous view
- **X:** Export focused session
- **Y:** Archive focused session
- **LB / RB:** Previous / next filter chip
- **LT / RT:** Scroll list
- **Hint bar:** `[A] Resume  [B] Back  [X] Export  [Y] Archive`

---

## Keyboard / Mouse Fallback

- **Tab:** Search → filter chips → session list items → action buttons
- **Arrow keys:** Navigate session list (vertical)
- **Enter:** Resume focused session
- **F2:** Rename focused session (inline edit)
- **Delete:** Delete focused session (with confirmation)

---

## Accessibility Notes

- Session list: `role="list"`, each card `role="listitem"`
- `SessionCard`: `aria-label="Session: [title], [N messages], [time ago]"`
- Resume button: `aria-label="Resume session: [title]"`
- Delete button: `aria-label="Delete session: [title]"`
- `ConfirmDialog`: `role="alertdialog"`, focus moves to "Cancel" by default (safer)
- Search: `aria-live="polite"` announces result count changes
- Inline rename: `aria-label="Rename session"`, commit with Enter, cancel with Escape

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/sessions/SessionsView.tsx` (exists)

**Reuse:**
- `SessionCard` primitive (exists)
- `EmptyState` for no-sessions and no-results
- `ConfirmDialog` for delete
- `Badge` for corrupt state
- `Panel` for layout

**Session list loading:**
```typescript
const sessions = await window.neurodeck.sessions.list({
  filter: activeFilter,   // "all" | "today" | "week" | "archived"
  sort: sortOrder,
  search: searchQuery,
  limit: 20,
  offset: page * 20,
})
```

**Inline rename:**
```typescript
// Replace title text with controlled TextInput
// onKeyDown: Enter → sessions.rename(id, newName) → revert to text
// onBlur: cancel (revert to original name)
```
