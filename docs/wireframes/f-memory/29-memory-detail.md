# 29. Memory Detail Screen

**Category:** F — Memory  
**Complexity:** Tier 1  
**Status:** New — Drawer from Memory Manager  
**Shell:** Right-side Drawer (480px)

---

## Purpose

Inspect a single memory item — its content, source, tags, usage history, and options to edit or delete.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                 │
│  🧠 Memory Detail                                   [📌] [✕]    │
├──────────────────────────────────────────────────────────────────┤
│  [CONTENT ZONE — scrollable]                                     │
│                                                                  │
│  Content                                                         │
│  ─────────────────────────────────────────────────────────────   │
│  "RAG uses cosine similarity to rank memory items by           │
│  relevance to the current prompt. Items with empty              │
│  embeddings are excluded from ranking."                         │
│                                                                  │
│  Metadata                                                        │
│  ─────────────────────────────────────────────────────────────   │
│  Created      2h ago (2026-06-17 14:23)                         │
│  Updated      Just now                                          │
│  Source       Research on RAG pipelines                          │
│  Tags         RAG, architecture, memory                          │
│  Pinned       📌 Yes                                             │
│  Embedding    ✓ Generated (128-dim)                             │
│  Used by      3 sessions                                         │
│                                                                  │
│  Tags                                                            │
│  ─────────────────────────────────────────────────────────────   │
│  [RAG ✕] [architecture ✕] [memory ✕]  [+ Add tag]              │
│                                                                  │
│  Used By Sessions                                               │
│  ─────────────────────────────────────────────────────────────   │
│  • Research session (2h ago) [Open →]                           │
│  • Rust debugging (yesterday) [Open →]                          │
│  • API design (3 days ago) [Open →]                             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                        │
│  [Edit Content]               [Delete Memory]                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Pin / Unpin (📌 in header)  
**IPC:** `window.neurodeck.memory.togglePin(id)`  
**Outcome:** Pin state toggled; icon changes; Toast "Memory pinned/unpinned"

---

## Secondary Actions

- **Edit Content** — replaces content with editable `textarea`; confirm with "Save" / cancel with "Discard"
- **Delete Memory** — `ConfirmDialog` (emphasis `critical`) → `window.neurodeck.memory.delete(id)` → drawer closes
- **Add tag** — inline tag input; Enter to add
- **Remove tag (✕)** — removes tag with confirmation (instant, undoable via Toast "Undo")
- **Open source session** — navigates to session; drawer closes

---

## States

### Loaded
- All metadata displayed as above

### Restricted (privacy mode)
- Content masked: `[Memory content — private mode active]`
- Edit and Delete disabled
- "Privacy mode active" note in footer

### Missing Source
- Source field: "Session deleted or unavailable"
- "Open →" link disabled

### Delete Confirmation
- `ConfirmDialog`: "Delete this memory? It will no longer be used in AI context."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.memory` | `get(id)`, `togglePin(id)`, `update(id, text)`, `delete(id)`, `addTag(id, tag)`, `removeTag(id, tag)` |

---

## Accessibility Notes

- Drawer: `role="dialog"`, `aria-modal="true"`, `aria-label="Memory detail"`
- `FocusTrapContainer` active
- Pin button: `aria-label="Pin memory" aria-pressed="[true/false]"`
- Tag remove buttons: `aria-label="Remove tag: [tag name]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/memory/MemoryDetailDrawer.tsx` — **New file**

Opened from Memory Manager item click via `dispatch({ type: "open-memory-detail", id })`.

**Inline edit:**
```typescript
const [editing, setEditing] = useState(false)
// When editing: textarea replaces content paragraph
// Save: memory.update(id, newText) → setEditing(false)
// Cancel: setEditing(false) (no save)
```
