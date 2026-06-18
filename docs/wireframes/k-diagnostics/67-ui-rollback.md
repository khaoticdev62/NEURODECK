# 67. UI Rollback

**Category:** K — Diagnostics  
**Complexity:** Tier 1  
**Status:** New (`features/recovery/UIRollbackView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Roll back the frontend to a previous bundled version when a UI update breaks functionality.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · UI Rollback                           [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  UI Rollback                                                            │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  [CURRENT VERSION]                                                      │
│      │  Active frontend build: v1.8.0 (2026-06-17)                            │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [AVAILABLE ROLLBACK TARGETS]                                           │
│      │                                                                         │
│      │  v1.7.0 — 2026-05-22 — "Sprint 2-5 AAAA release"                      │
│      │  Backend: v1.7.0  ·  Bundled: Yes                                      │
│      │  [↺ Roll Back to v1.7.0]                                               │
│      │                                                                         │
│      │  v1.6.0 — 2026-04-15 — "Rust bridge refactor"                          │
│      │  Backend: v1.6.0  ·  Bundled: Yes                                      │
│      │  [↺ Roll Back to v1.6.0]                                               │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  ⚠ Rolling back will also reload the backend if versions differ.       │
│      │    Your sessions and memory data are not affected.                     │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Roll Back  [B] Back                                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ↺ Roll Back to v[X.Y.Z]  
**IPC:** `window.neurodeck.system.rollbackUI(version)` → `system.restart()`  
**Outcome:** Frontend bundle swapped; app restarts with prior UI version

---

## Secondary Actions

- None (view is purely recovery-focused)

---

## States

### No Rollback Available
- `EmptyState` info: "No previous UI versions available. Only one build is bundled."

### Rolling Back
- Full-screen overlay: "Rolling back to v[X.Y.Z]… App will restart."

---

## Rollback Confirm Dialog

Before any rollback:
```
"Roll back to v[version]?
The current UI will be replaced. App will restart.
Sessions and memory data are preserved."
[Cancel]  [Roll Back]
```

`ConfirmDialog` with emphasis `caution` (not `critical` — data is safe).

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getRollbackTargets()`, `rollbackUI(version)`, `restart()` |

---

## Accessibility Notes

- Rollback buttons: `aria-label="Roll back UI to version [X.Y.Z] — released [date]"`
- `ConfirmDialog`: `role="alertdialog"`, Cancel is default focus

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/recovery/UIRollbackView.tsx` — **New file**

Bundled frontend builds are stored as zip archives in the Electron asar. Up to 2 previous versions bundled. `rollbackUI(version)` extracts the target bundle and restarts Electron pointing to it. Backend API version compatibility is checked before rollback — if frontend v1.7 requires backend v1.7 API, the backend is also rolled back.
