# 39. Browser Tab Manager

**Category:** H — Network  
**Complexity:** Tier 1  
**Status:** Partial (`features/browser/components/BrowserTabStrip.tsx`)  
**Shell:** Drawer from Browser view

---

## Purpose

View, switch, and close all open headless browser sessions from one panel.

---

## Layout Zones

```
┌───────────────────────────────────────────────┐
│  [DRAWER HEADER]                              │
│  Browser Sessions                    [✕]      │
├───────────────────────────────────────────────┤
│  [SESSION LIST]                               │
│                                               │
│  🟢 docs.rust-lang.org                       │
│     The Rust Programming Language             │
│     Opened 12m ago                            │
│     [Switch] [Close]                          │
│                                               │
│  🟢 github.com/anthropics/claude-code        │
│     anthropics/claude-code: Claude Code       │
│     Opened 3m ago                             │
│     [Switch] [Close]                          │
│                                               │
│  🔴 (failed) stackoverflow.com               │
│     Navigation failed — timeout               │
│     [Retry] [Close]                           │
│                                               │
├───────────────────────────────────────────────┤
│  [FOOTER]                                     │
│  [Close All]            [+ Open New Tab]      │
└───────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Switch  
**IPC:** `dispatch({ type: "set-browser-active-session", sessionId })`  
**Outcome:** Browser view shows that session; drawer closes

---

## Secondary Actions

- **Close** — `window.neurodeck.browser.closeSession(id)` → removed from list
- **Retry** — re-navigates to last URL
- **Close All** — `ConfirmDialog` → closes all sessions
- **+ Open New Tab** — `window.neurodeck.browser.openSession()` → new session ID

---

## States

### No Sessions
- `EmptyState`: "No browser sessions. Open a URL in the Browser."

### Loading
- `Skeleton` × 2

### Active Sessions
- List as shown

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.browser` | `listSessions()`, `closeSession(id)`, `openSession()` |

---

## Accessibility Notes

- List: `role="list"` / `role="listitem"`
- Status indicators: `aria-label="Session active: [title]"` / `aria-label="Session failed: [url]"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/browser/BrowserTabManager.tsx` — **New drawer** triggered from BrowserView tab strip overflow button.

Session metadata (title, URL, status) is stored in `AppState.browser_sessions`. `listSessions()` returns `{ id, url, title, status }[]`.
