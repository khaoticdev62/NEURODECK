# 69. Help / Docs Hub

**Category:** L — Help  
**Complexity:** Tier 2  
**Status:** Exists (`features/docs/DocsView.tsx` + `features/academy/AcademyView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Access all NEURODECK documentation, guides, tutorials, and feature tours from one searchable hub.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Help                                  [─] [□] [×]      │
├──────┬──────────────────────────────────────────┬───────────────────────────────┤
│ Nav  │  [LEFT — DOC TREE]                       │  [RIGHT — DOC VIEWER]        │
│ Rail │                                          │                               │
│      │  [Search help…]                          │  Getting Started              │
│      │                                          │  ─────────────────────────── │
│      │  📚 Getting Started                      │  Welcome to NEURODECK!        │
│      │   ├ Quick Start                          │                               │
│      │   ├ Installation                         │  NEURODECK is an AI-powered   │
│      │   └ First Session                        │  terminal OS designed for     │
│      │                                          │  Steam Deck and desktop...    │
│      │  🤖 AI & Chat                            │                               │
│      │   ├ Models                               │  [→ Next: Quick Start]        │
│      │   ├ Personas                             │                               │
│      │   └ Memory System                        │  ─────────────────────────── │
│      │                                          │  [📋 Copy Link]               │
│      │  💻 Terminal                             │                               │
│      │  🔌 Plugins & Lua                        │                               │
│      │  🎮 Steam Deck Guide                     │                               │
│      │  🔒 Security                             │                               │
│      │                                          │                               │
│      │  ─────────────────────────────────────── │                               │
│      │  [Feature Tours]  [Release Notes]        │                               │
├──────┴──────────────────────────────────────────┴───────────────────────────────┤
│ ControllerHintBar · [A] Open  [B] Back  [X] Search  [Y] Feature Tour          │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Select doc (tree item)  
**Outcome:** Doc content renders in right panel

---

## Secondary Actions

- **Search** — full-text search across all docs (`window.neurodeck.docs.searchDocs(query)`)
- **Feature Tours** — navigates to Feature Tour Library (screen 70)
- **Release Notes** — navigates to Release Notes (screen 71)
- **📋 Copy Link** — copies `neurodeck://docs/[docId]` deep link

---

## States

### Loading
- `Skeleton` in right panel while doc renders

### Search Results
- Tree collapses; matching snippets shown in results list

### Empty Search
- `EmptyState` in results: "No docs found for '[query]'"

### Doc Not Found
- `ErrorState` "Documentation not found" with "Back to Help home" action

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.docs` | `listDocs()`, `getDoc(id)`, `searchDocs(query)` |

---

## Accessibility Notes

- Doc tree: `role="tree"` / `role="treeitem"` / `aria-expanded`
- Doc viewer: `role="document"` with proper heading hierarchy (H1 for doc title, H2/H3 for sections)
- Search: `role="search"` region

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/docs/DocsView.tsx` (exists)

Docs are markdown files from `docs/` directory, indexed by `doc_indexer.rs`. `getDoc(id)` returns markdown content rendered client-side via `marked.js`. Deep link protocol `neurodeck://docs/[id]` is handled by Electron's `app.on('open-url')`.
