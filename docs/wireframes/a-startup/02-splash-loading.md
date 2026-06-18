# 02. Splash / Loading Screen

**Category:** A — Startup  
**Complexity:** Tier 1  
**Status:** Exists (`ViewLoader.tsx` + boot-loader transient; may need Splash extraction)  
**Shell:** Full-Screen Override — appears between boot completion and first view render

---

## Purpose

Bridge the gap between boot system checks and the first interactive view, giving the user visual feedback that the app is loading.

---

## Primary User Goal

See that NEURODECK is loading and reach the app within seconds.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                                                                                │
│                                                                                │
│                         ┌───────────────────┐                                 │
│                         │  [LOADING PANEL]  │                                 │
│                         │                   │                                 │
│                         │    ◎ NEURODECK    │                                 │
│                         │    ─────────────  │                                 │
│                         │  Loading plugins… │                                 │
│                         │  [════════░░░░░]  │                                 │
│                         │                   │                                 │
│                         └───────────────────┘                                 │
│                                                                                │
│                                                                                │
│                         Slow startup? → Open Diagnostics                      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Loading Panel | `Panel` variant `glass` | App icon, current task label, progress bar | Centered; 320px wide max |
| Slow Startup Link | `Button` variant `ghost` size `sm` | "Slow startup? Open Diagnostics" | Appears after 5s if not complete |

---

## Primary Action

None — this is a passive loading state. Auto-dismisses when startup data is loaded.

---

## Secondary Actions

- **Open Diagnostics** (ghost link, appears after 5s delay) — dispatches `{ type: "set-view", view: "diagnostics" }`

---

## Current Startup Task Labels (in order)

```
"Starting runtime…"
"Loading config…"
"Fetching personas…"
"Loading themes…"
"Indexing documents…"
"Checking context stats…"
"Initializing plugins…"
"Ready."
```

---

## States

### Loading
- Spinner / animated progress bar
- Current task label updates in-place (no flash — crossfade text)
- `prefers-reduced-motion`: static spinner only, no crossfade

### Slow Startup (> 5s)
- "Slow startup?" link appears with `animate-fade-in`
- No interruption to loading flow

### Startup Warning
- If a non-fatal error occurs mid-load, amber warning chip appears below task label
- Loading continues

### Startup Failed
- Progress stops, error message replaces task label
- "Open Diagnostics" button becomes primary
- "Continue Anyway" ghost button available

---

## IPC Dependencies

| Connector | Commands Used | Notes |
|-----------|--------------|-------|
| `window.neurodeck.plugins` | `list()` | Gets plugin count for display |
| `window.neurodeck.system` | `getConfig()`, `getContextStats()`, `getDocCount()` | Feeds startup data into state |
| `window.neurodeck.models` | `getPersonas()`, `getThemes()` | Loaded during splash |

These match the existing boot sequence in `App.tsx` (`list_plugins`, `get_config`, `get_personas`, `get_themes`, `get_doc_count`, `get_context_stats`).

---

## Controller Navigation

- **No active controller navigation.** Splash is passive.
- **A (confirm):** No-op
- **Hint bar:** Empty (no actions available)

---

## Keyboard / Mouse Fallback

- No keyboard interactions
- "Open Diagnostics" link is Tab-focusable once it appears

---

## Accessibility Notes

- `role="status"` with `aria-live="polite"` on task label — announces each task to screen reader
- `aria-label="NEURODECK is loading"` on loading panel
- Progress bar: `role="progressbar"` with `aria-valuenow` + `aria-valuemax="100"` if determinate; else `aria-valuenow` omitted
- `prefers-reduced-motion`: spinner replaces animated bar; task label changes are immediate

---

## Developer Implementation Notes

**Path:** `frontend/src/react/components/app/ViewLoader.tsx` — used as Suspense fallback; a dedicated `SplashScreen.tsx` may be warranted for the app-level splash vs. per-view loading

**Reuse:**
- `Panel` variant `glass` for centered card
- `Skeleton` or `<progress>` for progress bar
- `Button` variant `ghost` for diagnostics link

**Reduced motion guard:**
```css
@media (prefers-reduced-motion: reduce) {
  .splash-progress { animation: none; }
  .splash-task { transition: none; }
}
```

**Auto-dismiss:**
```typescript
// In App.tsx after all startup data loaded:
setSplashVisible(false)
// CSS: opacity 0 → display none after 200ms transition
```
