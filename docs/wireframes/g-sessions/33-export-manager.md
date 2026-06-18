# 33. Export Manager

**Category:** G — Sessions  
**Complexity:** Tier 1  
**Status:** Exists (`features/exports/ExportsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Browse, re-download, and manage exported session files previously generated from Session Browser.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Exports                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]                                                               │
│ Rail │  Exports                                    [+ New Export]              │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [Filter: All ▼]  [Format: All ▼]  [Sort: Newest ▼]                   │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [EXPORT LIST]                                                          │
│      │                                                                         │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 📄 Research on RAG pipelines.md      Markdown · 48KB · 2h ago   │   │
│      │  │ Research session · 47 messages       [↓ Download]  [🗑]         │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 📋 Rust debugging session.json       JSON · 212KB · yesterday   │   │
│      │  │ Debugging session · 89 messages      [↓ Download]  [🗑]         │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │                                                                         │
│      │  [PAGINATION]  Showing 2 of 14 exports  [Load more]                    │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Download  [B] Back  [X] Filter  [🗑] Delete           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ↓ Download  
**IPC:** `window.neurodeck.sessions.getExportFile(id)` → save to `Downloads/`  
**Outcome:** File saved; Toast "Export downloaded"

---

## Secondary Actions

- **+ New Export** — opens Session Browser with export intent flag set
- **Filter** — filter by source session, date range
- **Delete (🗑)** — `ConfirmDialog` → `window.neurodeck.sessions.deleteExport(id)`
- **Format filter** — MD / JSON / TXT chips

---

## States

### Empty
- `EmptyState` variant `action`: "No exports yet. Export a session from the Session Browser."
- Action: "Browse Sessions"

### Loading
- `Skeleton` rows × 4

### Export Ready
- List with download and delete actions as shown

### IPC Disconnected
- `ErrorState` "Backend Unavailable" with "Retry Connection"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sessions` | `listExports()`, `getExportFile(id)`, `deleteExport(id)` |

---

## Accessibility Notes

- Export cards: `role="listitem"`; download and delete are distinct `Button` elements with `aria-label`
- `ConfirmDialog` for delete traps focus; Cancel is default focus

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/exports/ExportsView.tsx` (exists)

Exports are stored in `user_config_dir()/exports/`. `listExports()` returns metadata only; `getExportFile(id)` streams the file content for download.
