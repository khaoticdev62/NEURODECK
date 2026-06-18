# 61. About / System Info

**Category:** J — Settings  
**Complexity:** Tier 1  
**Status:** New (`features/system/AboutView.tsx`)  
**Shell:** Modal dialog or Full App Shell

---

## Purpose

Display app version, build info, system specs, runtime status, and legal/license information.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [MODAL HEADER]                                                  │
│  About NEURODECK                                      [✕]        │
├──────────────────────────────────────────────────────────────────┤
│  [BRAND ZONE]                                                    │
│                                                                  │
│  [NEURODECK logo]                                               │
│  NEURODECK                                                      │
│  v1.8.0-ptah  ·  Build 614d313  ·  2026-06-17                  │
│  AI-Powered Terminal OS for Steam Deck                          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  [SYSTEM INFO]                                                   │
│                                                                  │
│  OS           Windows 11 Pro 26200                              │
│  Electron     33.x.x                                            │
│  Chromium     126.x.x.x                                         │
│  Node.js      22.x.x                                            │
│  Rust Backend v1.92.0 (stable)                                  │
│  Platform     x86_64-pc-windows-msvc                            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  [RUNTIME STATUS]                                                │
│                                                                  │
│  IPC Bridge    🟢 localhost:9477                                │
│  Model Runtime 🟢 Gemini 2.5 Flash (online)                    │
│  Lua Engine    🟢 5 plugins loaded                             │
│  PTY Manager   🟢 1 active session                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  [LINKS]                                                         │
│  [📄 Licenses]  [🐛 Report Bug]  [📋 Copy Build Info]          │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                        │
│  [Close]                                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** 📋 Copy Build Info  
**Outcome:** Copies formatted build info to clipboard; Toast "Build info copied"

---

## Secondary Actions

- **📄 Licenses** — opens scrollable third-party license list (modal-within-modal or new overlay)
- **🐛 Report Bug** — `window.neurodeck.system.openExternal("https://github.com/khaoticdev62/neurodeck/issues/new")`
- **Close** — closes modal

---

## States

### Runtime Check Pending
- Status rows show `Skeleton` while checking

### Component Offline
- 🔴 status on offline components; tooltip explains impact

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getVersionInfo()`, `getSystemHealth()`, `openExternal(url)` |

---

## Accessibility Notes

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-label="About NEURODECK"`, `FocusTrapContainer`
- Version text: wrapped in `<time>` for the build date
- Status indicators: `aria-label="[component]: [status]"` on each status row

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/system/AboutView.tsx` — **New file**

Version info from `infra/meta/meta.json` via `getVersionInfo()`. Runtime status from `getSystemHealth()` (same endpoint as Diagnostics). Build SHA is the git short hash stamped by KFMS `khaotic-init.sh stamp`.
