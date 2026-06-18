# 32. Session Detail

**Category:** G — Sessions  
**Complexity:** Tier 1  
**Status:** New — Drawer from Session Browser  
**Shell:** Right-side Drawer (520px)

---

## Purpose

Inspect a session's summary, model, persona, memory usage, and tools before opening or exporting.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                 │
│  📋 Research on RAG pipelines                  [▶ Resume] [✕]  │
├──────────────────────────────────────────────────────────────────┤
│  [SESSION SUMMARY ZONE]                                          │
│                                                                  │
│  47 messages · Started 2026-06-17 · Duration: ~45 min           │
│                                                                  │
│  Participants                                                    │
│  Model: gemini-2.5-flash                                        │
│  Persona: Developer                                             │
│                                                                  │
│  Resources Used                                                 │
│  Memory items: 8 referenced · 3 new facts saved                 │
│  Tools used: web_search (12), bash (3)                          │
│  Context: 94k / 128k tokens                                     │
│                                                                  │
│  Summary (AI-generated)                                         │
│  ─────────────────────────────────────────────────────────────  │
│  This session explored RAG pipeline architecture,               │
│  cosine similarity indexing, and Gemini SSE streaming           │
│  integration patterns.                                          │
│  [Regenerate summary]                                           │
│                                                                  │
│  Tags                                                           │
│  [RAG ✕] [architecture ✕] [+ Add]                              │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                        │
│  [↓ Export]  [Rename]  [Archive]            [🗑 Delete]         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** ▶ Resume  
**IPC:** `window.neurodeck.sessions.load(id)`  
**Outcome:** Session loaded in Workspace; drawer closes

---

## Secondary Actions

- **↓ Export** — `window.neurodeck.sessions.export(id, format)` — opens format picker first (MD/JSON/TXT)
- **Rename** — inline rename in header; Enter to confirm
- **Archive** — `window.neurodeck.sessions.archive(id)`; drawer closes
- **Delete (🗑)** — `ConfirmDialog` (emphasis `critical`)
- **Regenerate summary** — calls AI to re-summarize session content

---

## States

### Loaded
- All metadata shown as above

### Corrupt Session
- Header shows `Badge` tone `error` "Corrupt"
- Resume disabled
- "Attempt Recovery" button instead

### Missing Model
- `Badge` "Model unavailable" next to model name
- Resume shows `ConfirmDialog`: "The model this session used is unavailable. Resume anyway with current model?"

### Exporting
- Export button shows spinner "Exporting…"

### Delete Confirmation
- `ConfirmDialog` (emphasis `critical`): "Delete '[session name]'? All messages and context will be removed."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.sessions` | `get(id)`, `load(id)`, `export(id, format)`, `rename(id, name)`, `archive(id)`, `delete(id)` |

---

## Accessibility Notes

- Drawer: `role="dialog"`, `aria-label="Session detail: [session name]"`, `FocusTrapContainer`
- `ConfirmDialog` receives focus on open; Cancel is default-focused for safety
- Summary section: `aria-label="AI-generated session summary"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/sessions/SessionDetailDrawer.tsx` — **New file**

Opened from Session Browser item click via `dispatch({ type: "open-session-detail", sessionId })`.

**Format picker for export:**
Small inline row of `Button` variant `secondary` chips: [Markdown] [JSON] [Plain text] — selecting triggers export immediately.
