# 60. Update Center

**Category:** J — Settings  
**Complexity:** Tier 1  
**Status:** New (`features/system/UpdateCenterView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Check for, download, and install NEURODECK application updates, and view update history.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Updates                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Update Center                                                          │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  [CURRENT VERSION]                                                      │
│      │  NEURODECK v1.8.0-ptah                                                 │
│      │  Released 2026-06-10  ·  Codename: Ptah                               │
│      │  Last checked: 2 minutes ago                                            │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [UPDATE STATUS]                                                        │
│      │                                                                         │
│      │  🟢 You are up to date.                                                │
│      │  [Check for Updates]                                                    │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [UPDATE SETTINGS]                                                      │
│      │  Auto-check for updates                              [Toggle: On]      │
│      │  Auto-install updates                               [Toggle: Off]      │
│      │  Update channel    [Stable ▼]   (Stable / Beta / Nightly)              │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [UPDATE HISTORY]                                                       │
│      │  v1.8.0 — 2026-06-10 — Sprint 2-6 AAAA hardening [View notes →]      │
│      │  v1.7.0 — 2026-05-22 — Sprint 2-5 AAAA release   [View notes →]      │
│      │                                                                         │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Check  [B] Back  [X] View History  [Y] Settings      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Check for Updates  
**IPC:** `window.neurodeck.system.checkForUpdates()`  
**Outcome:** Polls GitHub releases API; shows "Update available" or "Up to date"

---

## Secondary Actions

- **Download & Install** (when update available) — `window.neurodeck.system.downloadAndInstall(version)`
- **View notes →** — navigates to Release Notes (screen 71) for that version
- **Channel change** — `window.neurodeck.system.saveSetting("update_channel", channel)`
- **Auto-install toggle** — `ConfirmDialog` if enabling: "Auto-install will restart the app when an update is ready."

---

## States

### Checking
- "Check for Updates" button shows spinner "Checking…"

### Update Available
- `Banner` tone `info`: "v1.9.0-thoth is available — released 2026-07-01"
- "Download & Install" button appears

### Downloading
- Progress bar "Downloading update… 34%"

### Installing / Restarting
- "Installing update… The app will restart momentarily."

### Up To Date
- 🟢 "You are up to date" as shown

### Check Failed
- `ErrorState`: "Could not check for updates — check your internet connection"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `checkForUpdates()`, `getVersionInfo()`, `downloadAndInstall(version)`, `saveSetting(key, val)`, `getUpdateHistory()` |

---

## Accessibility Notes

- Update available banner: `role="alert"` + `aria-live="assertive"`
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-label="Downloading update"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/system/UpdateCenterView.tsx` — **New file**

Version info comes from KFMS `infra/meta/meta.json`. Updates checked against GitHub releases API. Download uses Electron's `autoUpdater` if available, or direct download + shell installer otherwise.
