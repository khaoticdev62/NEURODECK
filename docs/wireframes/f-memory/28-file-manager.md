# 28. File Manager / Context Files

**Category:** F — Memory  
**Complexity:** Tier 2  
**Status:** Partial (`features/ide/IDEView.tsx` file tree sidebar)  
**Shell:** Full App Shell or Panel in IDE/Project views

---

## Purpose

View and manage files used as AI context — browse the workspace, preview content, and pin or remove files from context.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Files                                 [─] [□] [×]      │
├──────┬───────────────────────┬──────────────────────────────────────────────────┤
│ Nav  │  [FILE TREE]          │  [PREVIEW PANEL]                               │
│ Rail │                       │                                                  │
│      │  [Search files…]      │  App.tsx                                        │
│      │                       │  ─────────────────────────────────────────────  │
│      │  📁 src/              │  typescript · 247 lines · 12.4 KB               │
│      │   📁 react/           │  Last modified: 2h ago                          │
│      │    📄 App.tsx  📌     │  ─────────────────────────────────────────────  │
│      │    📄 state.ts        │  ```typescript                                  │
│      │   📁 components/      │  import React from "react"                      │
│      │    📄 Modal.tsx       │  import { useNeuroDeckState }...                │
│      │  📁 docs/             │  ```                                            │
│      │   📄 CLAUDE.md        │  (truncated at 100 lines)                      │
│      │  📁 src-tauri/        │  ─────────────────────────────────────────────  │
│      │   📄 lib.rs           │  [📌 Pin to context]  [➕ Add to context]      │
│      │                       │  [🔗 Open in IDE]  [📋 Copy path]              │
│      │  [Refresh]            │                                                  │
├──────┴───────────────────────┴──────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Preview  [B] Back  [X] Pin  [Y] Add to Context       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| File Tree | Recursive tree with icons | Project files + context pin indicators | 35% width left panel |
| Preview Panel | `Panel` | File metadata + syntax-highlighted preview + actions | 65% right panel |

---

## File Tree Icons

- 📁 — directory (expandable)
- 📄 — file (previewable)
- 📌 — file currently pinned to AI context
- ⚠ — file too large for context (>10MB)
- 🔒 — permission required to read

---

## Primary Action

**Label:** ➕ Add to Context  
**IPC:** `window.neurodeck.projects.addFileToContext(path)` → updates session context  
**Outcome:** File content included in next AI prompt as context; Toast "File added to context"

---

## Secondary Actions

- **📌 Pin to context** — makes file persistently included across sessions
- **🔗 Open in IDE** — navigates to IDE view with file open
- **📋 Copy path** — copies absolute path to clipboard
- **Refresh** — refreshes file tree
- **Search** — fuzzy search by filename

---

## States

### No Files (empty workspace)
- `EmptyState` in tree: "No project connected. Connect a folder in Project Context."

### File Selected / Preview
- Preview panel shows file content (syntax-highlighted, max 100 lines with "View full in IDE" link for larger files)

### Preview Unavailable
- `EmptyState` in preview: "Preview not available for this file type"
- Actions still available (add to context, open in IDE)

### Permission Required
- File tree item: 🔒 icon, click shows `EmptyState`: "File access denied"

### File Too Large
- ⚠ icon, click shows: "This file is too large to include in context (>10MB)"
- "Open in IDE" still available

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.ide` | `listFiles(path)`, `readFile(path)` |
| `window.neurodeck.projects` | `addFileToContext(path)`, `pinFile(path)`, `removeFromContext(path)` |

---

## Accessibility Notes

- File tree: `role="tree"` / `role="treeitem"` / `aria-expanded` on folders / `aria-selected` on focused item
- Preview panel: `aria-label="File preview: [filename]"`
- Pin indicator: `aria-label="[filename] is pinned to context"` on pin icon

---

## Developer Implementation Notes

**Path:** Extract file browser from `features/ide/IDEView.tsx` into `components/files/FileBrowser.tsx` (reusable) — used in both IDE and File Manager views.

**Preview:** Use `<pre>` with basic syntax token classes (no heavy library) for preview. Full Monaco editor only in IDE view.
