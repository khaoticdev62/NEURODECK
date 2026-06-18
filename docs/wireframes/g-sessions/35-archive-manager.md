# 35. Archive Manager

**Category:** G — Sessions  
**Complexity:** Tier 1  
**Status:** Exists (`features/maintenance/MaintenanceView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Browse and restore archived sessions and exports. Permanently delete when no longer needed.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Archive                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]                                                               │
│ Rail │  Archive                                                                │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [Filter: All ▼]  [Type: All ▼]  14 archived items                    │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [ARCHIVE LIST]                                                         │
│      │                                                                         │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 📋 Old project planning          Session · Archived 30 days ago  │   │
│      │  │ 12 messages · 2026-05-18         [↺ Restore]  [🗑 Delete]        │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 📄 API design notes.md            Export · Archived 14 days ago  │   │
│      │  │ 34KB · Markdown                   [↓ Download]  [🗑 Delete]      │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │                                                                         │
│      │  [Delete All Archived]                              14 items · 8.2 MB  │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Restore  [B] Back  [X] Filter  [Y] Delete All        │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ↺ Restore  
**IPC:** `window.neurodeck.sessions.unarchive(id)`  
**Outcome:** Session moves back to Session Browser; Toast "Session restored"

---

## Secondary Actions

- **↓ Download** (exports only) — same as Export Manager download
- **🗑 Delete** — `ConfirmDialog` (critical) → permanent delete
- **Delete All Archived** — `ConfirmDialog` (critical): "Permanently delete all 14 archived items?"
- **Filter by Type** — Sessions / Exports / Both

---

## States

### Empty
- `EmptyState` variant `info`: "No archived items. Sessions can be archived from the Session Browser."

### Loading
- `Skeleton` × 3

### Populated
- List as shown above

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sessions` | `listArchived()`, `unarchive(id)`, `deleteArchived(id)`, `deleteAllArchived()` |

---

## Accessibility Notes

- Restore and Delete per item: `aria-label="Restore [session name]"` / `aria-label="Delete [session name]"`
- "Delete All" uses `role="alertdialog"` confirm dialog

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/maintenance/MaintenanceView.tsx` (exists — archive is one tab/section)

Archive list co-lives with Storage Manager in `MaintenanceView.tsx`. Consider extracting to tabs: "Archive" tab + "Storage" tab within the same view.
