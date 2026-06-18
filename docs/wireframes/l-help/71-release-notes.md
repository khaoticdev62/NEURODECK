# 71. Release Notes

**Category:** L — Help  
**Complexity:** Tier 1  
**Status:** New (`features/system/ReleaseNotesView.tsx`)  
**Shell:** Modal or Full App Shell

---

## Purpose

Display formatted release notes for the current and previous NEURODECK versions.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────┐
│  [MODAL HEADER]                                              │
│  Release Notes                                    [✕]        │
├──────────────────────────────────────────────────────────────┤
│  [VERSION SELECTOR]                                          │
│  [v1.8.0-ptah ▼]                                            │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  [RELEASE NOTES CONTENT]                                     │
│                                                              │
│  v1.8.0-ptah — 2026-06-17                                   │
│  Sprint 2-6 AAAA Hardening & Design Polish                  │
│                                                              │
│  ✨ What's New                                               │
│  • Full AAAA accessibility audit pass (WCAG AAA)            │
│  • React 18 migration + TypeScript strict mode              │
│  • 77-screen wireframe documentation                        │
│  • Theme Editor drawer + Wallpaper Manager                  │
│                                                              │
│  🛠 Improvements                                             │
│  • IPC bridge stability fixes                               │
│  • PTY session restart race condition resolved              │
│  • Memory DB cosine similarity performance                  │
│                                                              │
│  🐛 Bug Fixes                                               │
│  • CSS specificity trap in #view-* ID rules fixed           │
│  • FTP buffer memory leak for files > 100MB                 │
│                                                              │
│  ⚠ Breaking Changes                                          │
│  • Tauri compat stubs removed from new commands             │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  [📋 Copy Link]  [↓ Download Changelog]                     │
├──────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                    │
│  [Close]                                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Close  
**Outcome:** Modal closes; user returns to previous screen

---

## Secondary Actions

- **Version selector** — switch to view release notes for previous versions
- **📋 Copy Link** — copies release URL for sharing
- **↓ Download Changelog** — downloads full `CHANGELOG.md`

---

## States

### Current Version (on launch)
- Defaults to current installed version

### Older Version Selected
- Content refreshes; header shows selected version

### Notes Not Available (pre-GA versions)
- "Release notes not available for this version."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getReleaseNotes(version)`, `listVersionHistory()` |

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="Release Notes"`, `FocusTrapContainer`
- Content: `role="document"` with standard heading hierarchy
- Version selector: `role="combobox"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/system/ReleaseNotesView.tsx` — **New file**

Release notes loaded from bundled `CHANGELOG.md` parsed by version header. Versions parsed as `## v[semver]-[codename] — [date]` sections. If a GitHub releases API is available, supplement with remote notes for versions not bundled.
