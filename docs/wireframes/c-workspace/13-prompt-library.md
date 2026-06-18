# 13. Prompt Library

**Category:** C — AI Workspace  
**Complexity:** Tier 2  
**Status:** Partial (`features/prompt-lab/PromptLabView.tsx` — CRUD split needed)  
**Shell:** Full App Shell

---

## Purpose

Save, organize, and reuse prompts across sessions — a personal library of effective prompt templates.

---

## Primary User Goal

Find a saved prompt and insert it into the current workspace chat.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Prompt Library                        [─] [□] [×]      │
├──────┬──────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]  Prompt Library          [Search…]  [+ New Prompt]           │
│ Rail ├──────────────┬───────────────────────────────────────────────────────────┤
│      │  [CATEGORIES]│  [PROMPT LIST — scrollable]                             │
│      │              │                                                          │
│      │  All         │  ┌──────────────────────────────────────────────────┐   │
│      │  Favorites ★ │  │  ★ Code Review Template                          │   │
│      │  Code        │  │  Review this code for security, performance,     │   │
│      │  Research    │  │  and correctness. Suggest improvements.          │   │
│      │  Writing     │  │  Tags: code, review  ·  Used 12 times            │   │
│      │  Analysis    │  │  [Insert →]  [Edit]  [Duplicate]  [Delete]       │   │
│      │  Custom      │  └──────────────────────────────────────────────────┘   │
│      │              │                                                          │
│      │  ──────────  │  ┌──────────────────────────────────────────────────┐   │
│      │  [Export all]│  │  Explain this concept simply                     │   │
│      │  [Import]    │  │  Explain [TOPIC] as if I'm new to programming.   │   │
│      │              │  │  Tags: education  ·  Used 3 times                │   │
│      │              │  │  [Insert →]  [Edit]  [Duplicate]  [Delete]       │   │
│      │              │  └──────────────────────────────────────────────────┘   │
├──────┴──────────────┴───────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Insert  [B] Back  [X] Edit  [Y] New Prompt            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` | Title, search, New Prompt button | Sticky |
| Categories | Sidebar list | All / Favorites / Code / Research / Writing / Analysis / Custom | Filter list in real-time |
| Prompt List | Scrollable card list | Prompt cards with preview, tags, usage count | |

---

## Prompt Card Structure

```
┌──────────────────────────────────────────────────────┐
│  [★]  [Prompt Title]                                 │
│  [First 2 lines of prompt text — truncated]          │
│  Tags: [chip] [chip]  ·  Used [N] times              │
│  [Insert →]  [Edit]  [Duplicate]  [Delete]           │
└──────────────────────────────────────────────────────┘
```

**★** — toggle favorite (fills on click)  
**`[TOPIC]`** — placeholder variables shown in distinct style; resolved in Prompt Builder (#14)

---

## Primary Action

**Label:** Insert →  
**IPC:** Client-side `dispatch({ type: "set-composer", value: promptText })`  
**Outcome:** Prompt text inserted into Workspace chat input; navigates to Workspace; Toast "Prompt inserted"

---

## Secondary Actions

- **+ New Prompt** — opens Prompt Builder (#14) with empty form
- **Edit** — opens Prompt Builder with prompt pre-loaded
- **Duplicate** — creates copy with "Copy of [name]"
- **Delete** — `ConfirmDialog` → delete
- **★ Favorite** — toggles; appears in Favorites filter
- **Export all** — exports library as JSON
- **Import** — imports JSON prompt library

---

## States

### No Saved Prompts
- `EmptyState` (variant `deck`): icon `BookOpen`, title "Your prompt library is empty", description "Save effective prompts here to reuse across sessions.", action "Create First Prompt"

### Search No Results
- `EmptyState` compact: "No prompts match '[query]'"

### Unsaved Changes (edit mode)
- `ConfirmDialog` on navigate away: "Unsaved changes to '[prompt name]'"

### Prompt Inserted
- Toast: "Prompt inserted into workspace"
- Workspace becomes active view

### Delete Confirmation
- `ConfirmDialog`: "Delete '[prompt name]'? This cannot be undone."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.promptDrive` | `list()`, `create(prompt)`, `update(id, prompt)`, `delete(id)`, `export()`, `import(file)` |

---

## Controller / Keyboard Navigation

- **D-pad Up/Down:** Navigate prompt cards
- **A:** Insert focused prompt
- **B:** Back
- **X:** Edit focused prompt
- **Y:** New prompt
- **Tab / Arrow:** Standard navigation

---

## Accessibility Notes

- List: `role="list"` / `role="listitem"` per card
- Insert: `aria-label="Insert prompt: [title]"`
- Favorite toggle: `role="checkbox"`, `aria-checked`, `aria-label="Favorite: [title]"`
- `[VARIABLE]` placeholders: `aria-label="Variable placeholder: TOPIC"` on highlighted spans

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/prompt-lab/PromptLibraryView.tsx` — extract from `PromptLabView.tsx`

**Storage:** `window.neurodeck.promptDrive` (bridge domain already exists)

**Insert flow:**
```typescript
const insert = (promptText: string) => {
  dispatch({ type: "set-composer", value: promptText })
  dispatch({ type: "set-view", view: "workspace" })
  toast("Prompt inserted into workspace")
}
```
