# 27. Project Context Manager

**Category:** F — Memory  
**Complexity:** Tier 2  
**Status:** Exists (`features/project/ProjectView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Connect a project folder or workspace as AI context — index files, manage what's included, and send relevant content to the AI.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Project Context                       [─] [□] [×]      │
├──────┬──────────────────────────────────────────────┬─────────────────────────┤
│ Nav  │  [LEFT — PROJECT PANEL]                      │  [RIGHT — FILE TREE]   │
│ Rail │                                              │                         │
│      │  Current Project                             │  ┌───────────────────┐  │
│      │  /home/user/projects/neurodeck               │  │ 📁 src/            │  │
│      │  [Change Project →]                          │  │  📁 react/         │  │
│      │                                              │  │   📄 App.tsx  ✓    │  │
│      │  ─────────────────────────────────────────  │  │   📄 state.ts  ✓   │  │
│      │  Indexing Status                             │  │  📁 components/    │  │
│      │  🟢 Indexed  ·  247 files  ·  Updated 2m ago│  │   📄 ...           │  │
│      │  [↺ Re-index]                                │  │ 📁 docs/          │  │
│      │                                              │  │  📄 CLAUDE.md  ✓  │  │
│      │  ─────────────────────────────────────────  │  └───────────────────┘  │
│      │  Include / Exclude Rules                     │                         │
│      │  ✓ Include: src/, docs/                      │  [Select All]           │
│      │  ✗ Exclude: node_modules/, .git/             │  [Deselect All]         │
│      │  [Edit rules…]                               │  [Add to Context →]     │
│      │                                              │                         │
│      │  ─────────────────────────────────────────  │  Selected: 12 files     │
│      │  Context Usage                               │  ≈ 24k tokens           │
│      │  24k / 128k tokens used by project           │                         │
│      │                                              │                         │
│      │  [Send to Chat →]  [Clear Project]           │                         │
├──────┴──────────────────────────────────────────────┴─────────────────────────┤
│ ControllerHintBar · [A] Select  [B] Back  [X] Send to Chat  [Y] Re-index     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Left Panel | `Panel` | Project path, indexing status, include/exclude rules, context usage | Sticky left 40% |
| Right Panel | File tree | Checkbox tree of project files | Scrollable; checkboxes for include/exclude |

---

## Primary Action

**Label:** Send to Chat →  
**Outcome:** Selected files sent as context attachments to Workspace chat; navigates to Workspace

---

## Secondary Actions

- **Change Project →** — opens directory picker
- **↺ Re-index** — re-runs `window.neurodeck.docs.indexDirectory(path)`
- **Edit rules…** — opens `ConfirmDialog`-style modal with glob pattern include/exclude editor
- **Add to Context →** — adds selected files to current session context without navigating
- **Clear Project** — `ConfirmDialog` → removes project connection (not files)

---

## States

### No Project Connected
- Left panel: `EmptyState`: "No project connected. Add a folder to use it as AI context."
- Action: "Connect Project Folder"

### Indexing
- Status: `StatusChip` pulse "Indexing…"
- File count increments live (WebSocket `docs:indexed` events)
- Re-index button shows spinner

### Indexed
- Green status, file count, "Updated [time]"

### Index Failed
- `ErrorState`: "Indexing failed — [reason]"
- Retry button

### Permission Required
- `EmptyState` with `ShieldAlert`: "File system access required"
- "Grant Permission" link

### File Too Large
- `Badge` tone `warning` on file tree item: "Too large (>10MB)"
- Item unchecked; tooltip explains

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.docs` | `indexDirectory(path)`, `getIndexedDocs()`, `getContextStats()` |
| `window.neurodeck.projects` | `get()`, `set(path)`, `clear()`, `getIncludeRules()`, `setIncludeRules()` |

---

## Accessibility Notes

- File tree checkboxes: `role="tree"` / `role="treeitem"` / `aria-checked`
- Indeterminate state (partial folder selection): `aria-checked="mixed"`
- Context usage: `aria-label="Project context using 24k of 128k tokens"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/project/ProjectView.tsx` (exists)

**Directory picker:** Use Electron's `dialog.showOpenDialog({ properties: ['openDirectory'] })` via `window.neurodeck.system.openDirectoryPicker()`.

**File tree:** Recursive render with `useReducer` for checkbox state. Store checked state as `Set<string>` of file paths.
