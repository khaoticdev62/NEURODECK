# 38. Browser / Web Tools

**Category:** H — Network  
**Complexity:** Tier 3  
**Status:** Exists (`features/browser/BrowserView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Headless Chrome browser with AI-assisted navigation, tab management, citation capture, and memory saving.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Browser                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [BROWSER TAB STRIP]                                                   │
│ Rail │  [Tab: docs.rust-lang.org ×] [Tab: github.com ×]   [+ New Tab]        │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [URL BAR]                                                              │
│      │  [←] [→] [↺]  https://docs.rust-lang.org/book/  [🔖] [AI]            │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [BROWSER CANVAS — screenshot/preview]                                  │
│      │                                                                         │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │                                                                  │   │
│      │  │  [Rendered page screenshot — refreshed on navigate]             │   │
│      │  │                                                                  │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │                                                                         │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [AI ACTION BAR]                                                        │
│      │  [📋 Capture Citation] [🧠 Save to Memory] [💬 Chat about this page]   │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Navigate  [B] Back  [X] Search  [Y] Save to Memory   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Tab Strip | `BrowserTabStrip.tsx` | Chrome session tabs | `role="tablist"` |
| URL Bar | Custom input | URL input + nav controls | `role="search"` for URL input |
| Browser Canvas | `<img>` or `<canvas>` | Screenshot from headless Chrome | Refreshed after each navigate |
| AI Action Bar | 3 `Button` components | Citation / Memory / Chat | Pinned to bottom |

---

## Primary Action

**Label:** Navigate (Enter in URL bar)  
**IPC:** `window.neurodeck.browser.navigate(sessionId, url)`  
**Outcome:** Headless Chrome navigates; screenshot updates in canvas

---

## Secondary Actions

- **← / → / ↺** — `browser_navigate_session` back/forward/reload
- **📋 Capture Citation** — `window.neurodeck.browser.getCitation(sessionId)` → copies formatted citation to clipboard
- **🧠 Save to Memory** — `window.neurodeck.browser.saveToMemory(sessionId)` → adds page summary + URL to Memory DB
- **💬 Chat about this page** — passes page content to Workspace chat

---

## States

### No Session Open
- Canvas: `EmptyState` "Open a URL to start browsing"
- URL bar focused, placeholder "https://"

### Loading (navigating)
- Canvas: spinner overlay on screenshot

### Page Loaded
- Screenshot renders; AI action bar enabled

### Navigation Error
- Canvas: `ErrorState` "Could not load page — [reason]"

### IPC Disconnected
- `ErrorState` "Browser backend unavailable — headless Chrome not running"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.browser` | `openSession()`, `navigate(id, url)`, `click(id, x, y)`, `fill(id, sel, text)`, `evaluate(id, js)`, `getCitation(id)`, `saveToMemory(id)`, `closeSession(id)` |

---

## Accessibility Notes

- URL bar: `role="combobox"` for URL autocomplete suggestions
- Browser canvas is a screenshot (not accessible DOM) — provide `aria-label="Browser page preview"` on the canvas container
- AI actions bar: `role="toolbar"` / `aria-label="AI browser tools"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/browser/BrowserView.tsx` (exists)

All browser session functions in `commands/browser.rs` are synchronous and must be called via `spawn_blocking`. Session state stored in `AppState.browser_sessions`.
