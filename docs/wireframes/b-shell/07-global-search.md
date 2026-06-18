# 07. Global Search Screen

**Category:** B — Shell  
**Complexity:** Tier 2  
**Status:** New — full-screen overlay (command palette handles commands; this handles content search)  
**Shell:** Full-Screen Overlay (z-40, over shell; not a nav view)

---

## Purpose

Search across sessions, memory, docs, agents, commands, files, and settings from one unified input.

---

## Primary User Goal

Find something fast — a session, a memory fact, a command, a file — and open it without navigating manually.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [DIMMED BACKDROP]                                                             │
│                                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐     │
│   │  [SEARCH INPUT ZONE]                                                │     │
│   │  🔍 Search everything…                                   [✕ Esc]   │     │
│   ├─────────────────────────────────────────────────────────────────────┤     │
│   │  [SCOPE FILTER CHIPS]                                               │     │
│   │  [All]  [Sessions]  [Memory]  [Commands]  [Docs]  [Files]          │     │
│   ├─────────────────────────────────────────────────────────────────────┤     │
│   │  [RESULTS ZONE — scrollable]                                        │     │
│   │                                                                     │     │
│   │  Sessions                                            [3 results]   │     │
│   │  ─────────────────────────────────────────────────────────────────  │     │
│   │  📋 Research on RAG pipelines       2h ago  [Open →]               │     │
│   │  📋 Rust WebSocket debugging        yesterday                       │     │
│   │                                                                     │     │
│   │  Memory                                              [7 results]   │     │
│   │  ─────────────────────────────────────────────────────────────────  │     │
│   │  🧠 RAG uses cosine similarity for vector search                   │     │
│   │  🧠 Gemini streaming uses SSE protocol                             │     │
│   │                                                                     │     │
│   │  Commands                                            [2 results]   │     │
│   │  ─────────────────────────────────────────────────────────────────  │     │
│   │  ⚡ /rag — Enable RAG mode                                         │     │
│   │                                                                     │     │
│   ├─────────────────────────────────────────────────────────────────────┤     │
│   │  [FOOTER]                                                           │     │
│   │  [↑↓] Navigate  [Enter] Open  [Tab] Switch scope  [Esc] Close      │     │
│   └─────────────────────────────────────────────────────────────────────┘     │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Search Input | `TextInput` autofocused | Placeholder "Search everything…", clear button | Debounced 200ms; `Ctrl+A` selects all |
| Scope Filters | `Tab` chip row | All / Sessions / Memory / Commands / Docs / Files / Plugins / Settings | Filters result groups shown |
| Results Zone | Grouped result list | Results grouped by type with section headers | Scrollable; max 80vh |
| Result Item | Custom row | Icon + title + metadata + action | Keyboard navigable |
| Footer | Hint row | Keyboard shortcuts display | Static; `DeckButtonHint` in deck mode |

---

## Result Types

| Type | Icon | Metadata shown | Open action |
|------|------|---------------|-------------|
| Session | `MessageSquare` | Last active timestamp | Navigate to workspace + load session |
| Memory item | `Brain` | Source session / tag | Navigate to memory detail |
| Command | `Zap` | Slash prefix, category | Execute command |
| Document | `FileText` | Path / index | Navigate to docs view + highlight |
| File | `File` | Workspace path | Navigate to IDE view + open file |
| Plugin | `Puzzle` | Version, status | Navigate to plugin detail |
| Setting | `Settings` | Section path | Open settings at panel/field |
| Agent | `Bot` | Status | Navigate to agents view + select |

---

## Primary Action

**Label:** [Enter] on focused result  
**IPC:** Varies by result type (session load, memory fetch, command execute, etc.)  
**Outcome:** Closes search overlay and navigates/executes

---

## Secondary Actions

- **Tab:** Cycle through scope filter chips
- **Scope filter click/select:** Narrows results to one category
- **Recent Searches:** Shown in results when input is empty (last 10 searches from localStorage)
- **Esc:** Close overlay, return focus to previous element

---

## States

### Empty Search (input blank)
- Show "Recent searches" group (if any)
- Show "Jump to" shortcuts: [Sessions] [Memory] [Terminal] [Settings]

### Typing (< 3 chars)
- "Type at least 3 characters to search…" hint below input

### Results Found
- Grouped by type, max 3 per group in "All" scope, all shown in filtered scope
- Result count per group in section header

### No Results
- `EmptyState` compact: icon `SearchX`, "No results for "[query]""
- Suggestion: "Try a broader term or switch scope"

### Index Unavailable
- `ErrorState` inline: "Search index unavailable"
- Only command search works (local)
- "Open Diagnostics" link

### Loading
- Skeleton rows replace result items during async fetch
- Input remains active

---

## IPC Dependencies

| Connector | Commands Used | Scope |
|-----------|--------------|-------|
| `window.neurodeck.sessions` | `search(query)` | Sessions |
| `window.neurodeck.memory` | `search(query)` | Memory |
| `window.neurodeck.docs` | `searchSemantic(query)` | Docs |
| `window.neurodeck.ide` | `searchFiles(query)` | Files |
| `window.neurodeck.plugins` | `list()` (filtered client-side) | Plugins |

Commands searched locally from static command registry. Settings searched from static nav map.

---

## Controller Navigation

- **D-pad Up/Down:** Navigate result items
- **D-pad Left/Right:** Switch scope filter chips
- **A (confirm):** Open focused result
- **B:** Close overlay
- **LB / RB:** Previous / next scope filter
- **Hint bar:** `[A] Open  [B] Close  [LB/RB] Scope`

---

## Keyboard / Mouse Fallback

- **↑ / ↓:** Navigate result items (roving tabindex or managed focus)
- **Tab:** Move to scope filter chips
- **Enter:** Open focused result
- **Escape:** Close overlay
- **Ctrl+Backspace:** Clear input

---

## Accessibility Notes

- `role="dialog"`, `aria-modal="true"`, `aria-label="Global search"`
- `FocusTrapContainer` wraps entire overlay
- Search input: `role="combobox"`, `aria-expanded="true"`, `aria-haspopup="listbox"`, `aria-controls="search-results"`
- Results: `role="listbox"` with `role="option"` per item; `aria-selected` on focused item
- Section headers: `role="group"`, `aria-label="[Type] results"`
- Live region: `aria-live="polite"` announces result count changes
- Focus: returns to trigger element on close

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/search/GlobalSearch.tsx` — **New file** (overlay, not a view)

**Trigger:**
- Title bar search button
- `Ctrl+Shift+F` / `Cmd+Shift+F`
- Separate from command palette (`Ctrl+Shift+K`)

**Reuse:**
- `FocusTrapContainer`
- `EmptyState` compact variant
- `ErrorState`
- `Skeleton` for loading rows
- Backdrop: `bg-black/50 backdrop-blur-sm` consistent with Modal

**Search implementation:**
```typescript
const [query, setQuery] = useState("")
const [scope, setScope] = useState<SearchScope>("all")
const results = useSearchResults(query, scope) // debounced, parallel fetches
```

**Recent searches:** Store in `localStorage("nd:recent-searches")` as string array, max 10.

**Mount:** Added to `AppOverlays` in `App.tsx`, gated by `state.searchOpen` boolean.
