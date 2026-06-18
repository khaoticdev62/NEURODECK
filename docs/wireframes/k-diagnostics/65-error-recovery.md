# 65. Error Recovery

**Category:** K — Diagnostics  
**Complexity:** Tier 1  
**Status:** Exists (`features/recovery/RecoveryView.tsx`)  
**Shell:** Full App Shell (also appears as full-screen overlay on critical crash)

---

## Purpose

Help users recover from app or runtime errors with clear actions — retry, export logs, or enter safe mode.

---

## Primary User Goal

Understand what broke and get back to work as fast as possible.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Error Recovery                        [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │                                                                        │
│ Rail │         ┌─────────────────────────────────────────────────┐           │
│      │         │  [ERROR SUMMARY ZONE]                           │           │
│      │         │                                                 │           │
│      │         │  ⚠  Something went wrong                       │           │
│      │         │                                                 │           │
│      │         │  IPC bridge disconnected unexpectedly.          │           │
│      │         │  The backend process may have crashed.          │           │
│      │         │                                                 │           │
│      │         │  ▸ Technical Details                            │           │
│      │         │  [collapsed accordion — error code, stack]      │           │
│      │         │                                                 │           │
│      │         │  ─────────────────────────────────────────────  │           │
│      │         │  [ACTION ZONE]                                  │           │
│      │         │                                                 │           │
│      │         │  [↺ Retry]                                      │           │
│      │         │  [Open Diagnostics]                             │           │
│      │         │  [Export Logs]                                  │           │
│      │         │  [Enter Safe Mode]                              │           │
│      │         │  [Reset UI State]                               │           │
│      │         │                                                 │           │
│      │         └─────────────────────────────────────────────────┘           │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Retry  [B] Back  [X] Export Logs  [Y] Diagnostics    │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Error Summary | `Panel` + `ErrorState` | Error category icon, title, plain-English explanation | Uses safe user-facing message — no stack traces exposed by default |
| Technical Details | Accordion (collapsed) | Error code, truncated stack trace, timestamp | Only for users who explicitly expand |
| Action Zone | `Button` list (vertical stack) | Retry / Diagnostics / Export Logs / Safe Mode / Reset UI | Buttons ordered by likelihood of success |

---

## Error Categories and Messages

| Error Code | User Title | User Message | Actions shown |
|-----------|-----------|-------------|--------------|
| `ipc_disconnected` | Connection lost | "The backend process stopped responding." | Retry, Diagnostics, Export, Safe Mode |
| `model_crashed` | Model error | "The AI model encountered an error and stopped." | Retry, Switch Model, Diagnostics |
| `renderer_crash` | Display error | "A display error occurred in the app." | Reset UI, Reload App, Export Logs |
| `pty_failed` | Terminal error | "The terminal session could not be started." | Retry, Diagnostics |
| `storage_error` | Storage error | "NEURODECK could not read or write to disk." | Diagnostics, Export, Safe Mode |
| `plugin_fatal` | Plugin error | "A plugin caused an error and was disabled." | Reload Plugins, Diagnostics |
| `unknown` | Unexpected error | "An unexpected error occurred." | Retry, Diagnostics, Export, Safe Mode |

---

## Primary Action

**Label:** ↺ Retry  
**IPC:** Depends on error type — re-polls `/health`, retries last command, or reloads the failed subsystem  
**Outcome:** If bridge reconnects → dismisses error view; if still failed → error message updates with new attempt count

---

## Secondary Actions

- **Open Diagnostics** — navigates to `diagnostics` view
- **Export Logs** — `window.neurodeck.system.generateSupportBundle()` → toast with file path
- **Enter Safe Mode** — `dispatch({ type: "enter-safe-mode" })` → reloads with plugins/agents disabled
- **Reset UI State** — clears local React state, reloads view router without restarting backend
- **IPC Failure Explanation** (inline accordion) — explains what the IPC bridge is in plain English for non-technical users

---

## States

### Recoverable Error
- Retry button is primary (variant `primary`)
- Safe mode listed as secondary
- Accordion closed by default

### Critical Error (IPC fully down after retries)
- "Retry" shows attempt count: "Retry (attempt 3 of 5)"
- "Enter Safe Mode" elevated to secondary prominence
- Accordion auto-opens to show error code for copy-paste support

### Safe Mode Available
- Safe mode button highlighted with amber `Badge` "Recommended"

### Logs Exported
- Toast: "Logs exported to [path]" + "Open File" action

### Reset Confirmation
- "Reset UI State" shows `ConfirmDialog`: "This will clear all local display state. Continue?"
- Destructive but not data-loss

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `/health` | Retry polling |
| `window.neurodeck.system` | `generateSupportBundle()` |
| `window.neurodeck.diagnostics` | `getHealthSummary()` (for context) |

---

## Controller Navigation

- **D-pad Up/Down:** Navigate action buttons
- **A (confirm):** Activate focused action
- **B:** Navigate back (if previous view available)
- **X:** Export logs
- **Y:** Open diagnostics
- **Hint bar:** `[A] Retry  [B] Back  [X] Export  [Y] Diagnostics`

---

## Keyboard / Mouse Fallback

- **Tab:** Navigate through action buttons
- **Enter / Space:** Activate focused button
- **Escape:** Navigate back (or no-op if recovery is blocking)
- **Space (on accordion):** Toggle technical details

---

## Accessibility Notes

- Error summary: `role="alert"`, `aria-live="assertive"` — announced immediately
- Technical details accordion: `role="region"`, toggle button has `aria-expanded`
- Action buttons: clear, distinct `aria-label` on each
- Retry button: `aria-label="Retry [specific action]"` not just "Retry"
- Safe message policy: no stack traces, addresses, or file paths in default visible copy — only in collapsed technical details

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/recovery/RecoveryView.tsx` (exists)

**Error ingestion:** Recovery view receives `state.lastError: { code, message, context }` from global state. Set via `dispatch({ type: "set-error", error: {...} })`.

**Auto-navigate to recovery:** `ViewErrorBoundary` in `AppViewRouter.tsx` catches unhandled errors and dispatches `set-view: recovery` + `set-error`.

**Retry logic:**
```typescript
const [attempts, setAttempts] = useState(0)
const retry = async () => {
  setAttempts(a => a + 1)
  const healthy = await pollHealth()
  if (healthy) dispatch({ type: "clear-error" })
}
```

**User-safe message mapping:** Keep a `ERROR_MESSAGES` map (error code → { title, message, actions[] }) in a constants file. Never display raw error strings from Rust directly in the UI.
