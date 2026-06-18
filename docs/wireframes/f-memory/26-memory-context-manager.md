# 26. Memory / Context Manager

**Category:** F — Memory  
**Complexity:** Tier 3  
**Status:** Exists (`features/memory/MemoryView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Manage what NEURODECK remembers and uses as AI context — browsing, searching, pinning, and organizing memory facts and collections.

---

## Primary User Goal

Find a specific memory item or clean up irrelevant memories to improve AI response quality.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Memory                                [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER ZONE]                                                         │
│ Rail │  Memory                    [Search…]  [+ Add Fact]  [↓ Export]        │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [STATS ROW]                                                           │
│      │  47 items  ·  12 pinned  ·  Context usage: 8%  ·  [⚙ Privacy]        │
│      ├──────────────┬──────────────────────────────────────────────────────────┤
│      │  [FILTER     │  [MEMORY LIST — scrollable]                             │
│      │   SIDEBAR]   │                                                         │
│      │              │  ┌──────────────────────────────────────────────────┐   │
│      │  All items   │  │  📌 RAG uses cosine similarity for ranking        │   │
│      │  Pinned      │  │  From: Research session · 2h ago · Tagged: RAG   │   │
│      │  Session     │  │  [Unpin] [Edit] [Delete]         [→ Open session]│   │
│      │  Project     │  └──────────────────────────────────────────────────┘   │
│      │  Tagged      │                                                         │
│      │  ──────────  │  ┌──────────────────────────────────────────────────┐   │
│      │  Tags        │  │  🧠 Gemini SSE streaming uses EventSource API     │   │
│      │  • RAG (8)   │  │  From: Chat · yesterday · No tags                │   │
│      │  • Rust (12) │  │  [Pin] [Edit] [Delete]                           │   │
│      │  • API (5)   │  └──────────────────────────────────────────────────┘   │
│      │              │                                                         │
│      │  ──────────  │  [Load more…]                                          │
│      │  [Clear all] │                                                         │
│      │  (danger)    │                                                         │
├──────┴──────────────┴──────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Open  [B] Back  [X] Pin  [Y] Add Fact               │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Header | `Panel` | Title, search, Add Fact, Export | Sticky |
| Stats Row | Metric bar | Item count, pinned count, context usage %, privacy link | Single row |
| Filter Sidebar | Category list + tag list | All / Pinned / Session / Project / Tagged + tag cloud | Sticky; updates list in real-time |
| Memory List | Scrollable item list | Memory item cards | Infinite scroll or "Load more" |

---

## Memory Item Card

```
┌──────────────────────────────────────────────────────────┐
│  [📌 or 🧠]  [Memory text — 1–3 lines]                  │
│  From: [session name]  ·  [timestamp]  ·  [tags]         │
│  [Pin/Unpin]  [Edit]  [Delete]  [→ Open source]          │
└──────────────────────────────────────────────────────────┘
```

**Pinned items:** 📌 icon, highlighted border — always included in RAG context  
**Regular items:** 🧠 icon — included by cosine similarity search

**Note:** Items added via `memory_add_fact` have empty embedding vectors — they appear in the list but are excluded from similarity ranking (only pinned items guarantee inclusion).

---

## Primary Action

**Label:** + Add Fact  
**IPC:** `window.neurodeck.memory.addFact({ text, tags? })`  
**Outcome:** Inline modal for fact entry; new item appears at top of list; Toast "Fact saved"

---

## Secondary Actions

- **Search** — semantic search via `window.neurodeck.memory.search(query)` (returns by cosine similarity)
- **Pin / Unpin** — `window.neurodeck.memory.togglePin(id)` → affects RAG context
- **Edit** — opens inline edit for memory text
- **Delete** — `ConfirmDialog` → `window.neurodeck.memory.delete(id)`
- **Export** — exports all memory as JSON or markdown
- **Clear All** (danger) — `ConfirmDialog` with warning → `window.neurodeck.memory.clear()`
- **Privacy ⚙** — navigates to Privacy Center (#54) memory settings
- **→ Open source** — navigates to origin session

---

## States

### No Memory Yet
- `EmptyState` (variant `deck`): icon `Brain`, title "No memories saved", description "NEURODECK saves facts from your sessions to use as AI context.", action "Add First Fact"

### Search Results
- Header shows: "7 results for 'RAG'"
- Filter sidebar still functional
- "Clear search" × button in header

### Search No Results
- `EmptyState` compact: "No memories match '[query]'. Try a different term."

### Import Required
- If embedding model not configured, semantic search unavailable
- Banner: "Semantic search requires an embedding model. Configure in Settings → AI."

### Permission Restricted
- Privacy mode active banner: "Memory saving disabled in Privacy mode. Facts are read-only."
- Add Fact and Edit buttons disabled

### Memory Clear Warning
- `ConfirmDialog` (emphasis `critical`): "Delete all 47 memory items? This cannot be undone."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.memory` | `list()`, `search(query)`, `addFact(fact)`, `togglePin(id)`, `update(id, text)`, `delete(id)`, `clear()`, `export()`, `getStats()` |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate memory items
- **D-pad Left/Right:** Switch filter sidebar → memory list focus
- **A (confirm):** Open Memory Detail (#29) for focused item
- **B:** Back to previous view
- **X:** Pin/unpin focused item
- **Y:** Add new fact
- **LT / RT:** Scroll list
- **Hint bar:** `[A] Open  [B] Back  [X] Pin  [Y] Add Fact`

---

## Keyboard / Mouse Fallback

- **Tab:** Search → filter sidebar → memory list items
- **Arrow keys:** Navigate list
- **Enter:** Open memory detail
- **P:** Pin/unpin focused item (shortcut)
- **Delete:** Delete focused item (with confirmation)

---

## Accessibility Notes

- Memory list: `role="list"`, each item `role="listitem"`
- Item text: `<p>` or `<span>`, not a heading
- Pin button: `aria-label="Pin memory: [first 30 chars]"` or `"Unpin memory: ..."`
- Delete button: `aria-label="Delete memory: [text]"`
- Stats row: individual values have text labels, not visual-only
- Search: `aria-label="Search memories"`, `aria-live="polite"` on result count
- Empty/cleared confirmations: `ConfirmDialog` with `role="alertdialog"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/memory/MemoryView.tsx` (exists)

**Memory item data:**
```typescript
interface MemoryItem {
  id: string
  text: string
  tags: string[]
  pinned: boolean
  sourceSession?: string
  createdAt: number
  embedding: number[] // may be empty for manually-added facts
}
```

**Semantic search note:** `search()` filters items with `embedding.length === 0` before cosine ranking — they won't appear in search results even if they match. Pinned items with empty embeddings appear in the Pinned filter but not in search.

**Add Fact modal:** Small `Modal` (size `sm`) with `TextInput` for text + optional tags input. Calls `memory.addFact()` on submit.

**Edit inline:** Replaces item text with `TextInput` in-place; confirm with Enter or checkmark button; cancel with Escape.
