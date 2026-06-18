# 59. Storage Manager

**Category:** J — Settings  
**Complexity:** Tier 1  
**Status:** Partial (`features/maintenance/MaintenanceView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

View disk usage by data category and safely clear space by deleting old sessions, exports, logs, and model caches.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Storage                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Storage Manager                                  [↺ Refresh]          │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  Total data: 1.24 GB                                                    │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │                                                                         │
│      │  [USAGE BREAKDOWN]                                                      │
│      │                                                                         │
│      │  Sessions        ████████████████░░░░░  412 MB   [Manage →]           │
│      │  AI Models       ██████████████████░░░  598 MB   [Manage →]           │
│      │  Memory DB       ████░░░░░░░░░░░░░░░░░   87 MB   [Manage →]           │
│      │  Exports         ███░░░░░░░░░░░░░░░░░░   76 MB   [Manage →]           │
│      │  Logs            █░░░░░░░░░░░░░░░░░░░░   18 MB   [Clear ×]            │
│      │  Plugin Cache    █░░░░░░░░░░░░░░░░░░░░   12 MB   [Clear ×]            │
│      │  Sync Cache      ░░░░░░░░░░░░░░░░░░░░░    8 MB   [Clear ×]            │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [QUICK CLEAN]                                                          │
│      │  Clear logs older than 7 days                          [Clear]         │
│      │  Delete archived sessions older than 30 days           [Clear]         │
│      │  Clear model download cache                            [Clear]         │
│      │                                                                         │
│      │  [DANGER ZONE]                                                          │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [🗑 Delete All Data and Reset]                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Manage  [B] Back  [X] Clear All Logs  [Y] Refresh    │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Manage → (per category)  
**Outcome:** Navigates to relevant manager (Session Browser, Archive, Export Manager, etc.)

---

## Secondary Actions

- **Clear × (logs, cache)** — `ConfirmDialog` → `window.neurodeck.system.clearStorageCategory(category)`
- **Quick Clean** — 3 single-click clean actions with `ConfirmDialog`
- **🗑 Delete All Data and Reset** — `ConfirmDialog` (double-confirm, emphasis `critical`): "Delete ALL NEURODECK data? This cannot be undone." → triggers factory reset flow

---

## States

### Loading
- Bar fills and size labels show `Skeleton`

### Calculating
- "Calculating storage…" spinner while backend scans directories

### Low Disk Space
- `Banner` tone `warning`: "Disk space is low. Clear cached data to free space."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getStorageUsage()`, `clearStorageCategory(cat)`, `factoryReset()` |

---

## Accessibility Notes

- Usage bars: `role="meter"` / `aria-valuenow` / `aria-valuemax` / `aria-label="[category]: [size]"`
- Clear buttons: `aria-label="Clear [category] cache ([size])"`
- Danger zone: visually separated + `aria-label="Danger zone: Delete all data"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/maintenance/MaintenanceView.tsx` (exists — storage is a section)

`getStorageUsage()` scans `user_config_dir()` subdirectories. For AI Models, reads Ollama model storage path. Factory reset calls `factoryReset()` which deletes `user_config_dir()` content and re-runs onboarding wizard on next launch.
