# 34. Backup & Restore

**Category:** G — Sessions  
**Complexity:** Tier 2  
**Status:** New (`features/maintenance/BackupRestoreView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Create and restore full backups of all NEURODECK data (sessions, memory, settings, plugins, profiles).

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Backup & Restore                      [─] [□] [×]      │
├──────┬────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [TWO-PANEL LAYOUT]                                                    │
│ Rail │                                                                        │
│      │  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│      │  │  CREATE BACKUP                  │  │  RESTORE BACKUP              │ │
│      │  │                                 │  │                              │ │
│      │  │  Include in backup:             │  │  From file:                  │ │
│      │  │  ☑ Sessions (14)               │  │  [Browse… or drag here]      │ │
│      │  │  ☑ Memory (347 items)          │  │                              │ │
│      │  │  ☑ Settings                    │  │  — or —                      │ │
│      │  │  ☑ Profiles (3)               │  │                              │ │
│      │  │  ☑ Plugins (5)                │  │  Recent backups:             │ │
│      │  │  ☑ Themes (2)                 │  │  • neurodeck-2026-06-17.zip  │ │
│      │  │  ☐ Logs                        │  │    [↺ Restore this]          │ │
│      │  │                                 │  │  • neurodeck-2026-06-10.zip  │ │
│      │  │  Estimated size: ~24 MB         │  │    [↺ Restore this]          │ │
│      │  │                                 │  │                              │ │
│      │  │  [Create Backup]                │  │  [Restore from File…]        │ │
│      │  └─────────────────────────────────┘  └──────────────────────────────┘ │
├──────┴────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Create  [B] Back  [X] Browse  [Y] Restore            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Create Backup  
**IPC:** `window.neurodeck.system.createBackup({ include: [...] })`  
**Outcome:** Zip file saved to `Downloads/`; Toast "Backup created — neurodeck-[date].zip"

---

## Secondary Actions

- **Restore from File…** — file picker → `ConfirmDialog` ("Restore will overwrite current data. Continue?") → `window.neurodeck.system.restoreBackup(file)`
- **Restore this** — same flow for listed recent backups
- **Checkbox toggles** — toggle individual data domains

---

## States

### Creating Backup
- Replaces "Create Backup" button with progress bar (indeterminate); "Packing data…"

### Restore in Progress
- Full-screen overlay with progress + "Do not close the app during restore"

### Restore Complete
- Toast: "Restore complete. Restarting app…" → app reloads after 2s

### Error
- `ErrorState` with specific message ("Not enough disk space", "Invalid backup file", etc.)

### Empty Recent Backups
- "No previous backups found" in restore panel

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `createBackup(opts)`, `listBackups()`, `restoreBackup(file)` |

---

## Accessibility Notes

- Checkboxes use `<label>` + `<input type="checkbox">` — no ARIA checkbox role needed
- Restore `ConfirmDialog` uses `role="alertdialog"` with `aria-label="Confirm restore"`
- Restore progress: `aria-live="assertive"` + `role="progressbar"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/maintenance/BackupRestoreView.tsx` — **New file**

Backup zip is created server-side. Frontend only needs to trigger and track. File picker for restore uses `window.neurodeck.system.openFilePicker({ accept: '.zip' })`.
