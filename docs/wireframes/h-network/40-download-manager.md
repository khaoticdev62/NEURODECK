# 40. Download Manager

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** New (`features/browser/DownloadManager.tsx`)  
**Shell:** Side drawer from Browser view

---

## Purpose

Track file downloads initiated from the Browser and manage their local paths.

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                 │
│  Downloads                              [✕]      │
├──────────────────────────────────────────────────┤
│  [IN-PROGRESS]                                   │
│                                                  │
│  📦 cargo-1.82.0-x86_64.tar.gz                  │
│     ████████████░░░░░░  62% · 24.1 MB / 38 MB   │
│     [Pause]  [Cancel]                            │
│                                                  │
│  ─────────────────────────────────────────────── │
│  [COMPLETED]                                     │
│                                                  │
│  ✓ rustup-init.sh                  8 KB · 2m ago │
│     [Open]  [Show in Files]  [Copy Path]         │
│                                                  │
│  ✓ neurodeck-docs.pdf             2.3 MB · 1h ago │
│     [Open]  [Show in Files]  [Copy Path]         │
│                                                  │
│  ✗ large-model.gguf (cancelled)              3h ago │
│     [Retry]  [Remove]                            │
│                                                  │
├──────────────────────────────────────────────────┤
│  [FOOTER]                                        │
│  [Clear Completed]           Save to: ~/Downloads │
└──────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Open (per completed download)  
**IPC:** `window.neurodeck.system.openFile(path)`  
**Outcome:** Opens file with system default application

---

## Secondary Actions

- **Show in Files** — `window.neurodeck.system.revealInExplorer(path)`
- **Copy Path** — copies path to clipboard; clears after 60s
- **Pause / Resume** — `window.neurodeck.browser.pauseDownload(id)` / `resumeDownload(id)`
- **Cancel** — `window.neurodeck.browser.cancelDownload(id)`
- **Retry** — re-initiates download from last URL
- **Clear Completed** — removes all ✓ entries from list (no IPC, local state only)

---

## States

### Empty
- `EmptyState`: "No downloads yet. Files from the Browser will appear here."

### Active Downloads
- Progress bars with pause/cancel

### All Complete
- List of completed files only; "Clear Completed" active

---

## IPC Dependencies

| Connector | Commands / Events |
|-----------|-----------------|
| `window.neurodeck.browser` | `listDownloads()`, `pauseDownload(id)`, `resumeDownload(id)`, `cancelDownload(id)` |
| `window.neurodeck.system` | `openFile(path)`, `revealInExplorer(path)` |
| WebSocket | `download:progress { id, bytes, total }`, `download:complete { id, path }`, `download:error { id, reason }` |

---

## Accessibility Notes

- Progress bars: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label="Downloading [filename]: [percent]%"`
- Completed: `aria-label="[filename] — downloaded [size]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/browser/DownloadManager.tsx` — **New drawer component**

Downloads tracked via `download:*` WebSocket events. Frontend maintains `downloadState[]` in local state. Completed downloads persist in `localStorage("nd:completed-downloads")` until cleared.
