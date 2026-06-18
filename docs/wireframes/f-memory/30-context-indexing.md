# 30. Context Indexing Screen

**Category:** F — Memory  
**Complexity:** Tier 1  
**Status:** New — Progress overlay/panel in Project Context view  
**Shell:** Modal or inline panel within Project Context

---

## Purpose

Show real-time progress when NEURODECK indexes a project folder for AI context.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────┐
│  Indexing Project Context                                │
│  /home/user/projects/neurodeck                           │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [PROGRESS BAR]                                          │
│  ████████████████████████░░░░░░░░   173 / 247 files     │
│                                                          │
│  Current file:                                           │
│  src/react/features/browser/BrowserView.tsx              │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│  Included    173 files                                   │
│  Excluded    12 files (node_modules, .git)               │
│  Errors      1 file (permission denied)                  │
│                                                          │
│  [Errors — 1]                                            │
│  ✗ src-tauri/target/ — Permission denied                 │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│  [Pause]  [Cancel]                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Progress Bar | `<progress>` + file count | Determinate progress | `aria-valuenow` updated every 0.5s |
| Current File | `<p>` | Path of file being indexed | Truncated to last 60 chars |
| Stats | 3 count rows | Included / Excluded / Errors | Updated live |
| Error List | Collapsed list | Files that failed indexing | Auto-expands if errors > 0 |

---

## States

### Queued
- Progress at 0%; "Starting…"

### Indexing (active)
- Progress updates live; file name cycles

### Complete
- Progress 100%
- "✓ Indexing complete — 247 files indexed"
- "Done" button closes panel / modal

### Partial Failure
- Progress reaches 100% but errors > 0
- "Indexing complete with [N] errors. These files were skipped."
- "Done" button available

### Cancelled
- Progress freezes
- "Indexing cancelled. [N] files indexed so far."
- "Re-index" button

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|------------------|
| `window.neurodeck.docs` | `indexDirectory(path)` starts indexing |
| WebSocket | `docs:indexed` event → `{ file, included, excluded, total }` |
| `window.neurodeck.docs` | `cancelIndexing()` — Pause/Cancel |

---

## Accessibility Notes

- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label="Indexing [N] of [total] files"`
- Current file: `aria-live="off"` (too frequent to announce every file; announce on major milestones)
- Completion: `aria-live="polite"` announces "Indexing complete"
- Errors: `role="list"`, announced when errors > 0

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/project/ContextIndexingPanel.tsx` — **New file**, shown inline in ProjectView or as Modal

**Listen for progress:**
```typescript
listen("docs:indexed", ({ file, includedCount, excludedCount, totalCount, error }) => {
  setProgress({ file, included: includedCount, excluded: excludedCount, total: totalCount })
  if (error) setErrors(prev => [...prev, { file, error }])
})
```

**Determinate progress:** `includedCount / totalCount * 100` — requires backend to send total at start of indexing.
