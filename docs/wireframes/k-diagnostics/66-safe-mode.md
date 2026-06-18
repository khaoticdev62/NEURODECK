# 66. Safe Mode

**Category:** K — Diagnostics  
**Complexity:** Tier 1  
**Status:** New — App-level full-screen overlay  
**Shell:** Full-screen override (no nav rail, no shell)

---

## Purpose

Provide a minimal, recovery-oriented UI when NEURODECK detects a critical startup failure or the user explicitly requests Safe Mode.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│                                                                                │
│                        ⚠  SAFE MODE                                           │
│                                                                                │
│              NEURODECK started in Safe Mode                                    │
│              Some features may be unavailable.                                 │
│                                                                                │
│  ─────────────────────────────────────────────────────────────────────────     │
│                                                                                │
│  Why Safe Mode?                                                                │
│  • Plugin "bad_plugin.lua" caused a startup crash                              │
│  • Lua runtime failed to initialize (error: stack overflow)                    │
│                                                                                │
│  ─────────────────────────────────────────────────────────────────────────     │
│                                                                                │
│  What's available in Safe Mode:                                               │
│  ✓ Terminal (no plugins)                                                       │
│  ✓ Settings (to disable plugins)                                               │
│  ✓ Diagnostics and Logs                                                        │
│  ✗ Agent, Models, Memory — offline                                             │
│                                                                                │
│  ─────────────────────────────────────────────────────────────────────────     │
│                                                                                │
│  [Disable All Plugins and Restart]         [Continue in Safe Mode]            │
│                                                                                │
│  [View Error Details]                    [Factory Reset…]                     │
│                                                                                │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Disable All Plugins and Restart  
**IPC:** `window.neurodeck.plugins.disableAll()` → `window.neurodeck.system.restart()`  
**Outcome:** All Lua plugins disabled; app restarts in normal mode

---

## Secondary Actions

- **Continue in Safe Mode** — dismisses overlay; nav rail shows minimal safe-mode-only views (Terminal, Settings, Diagnostics)
- **View Error Details** — expands collapsible with full Rust error traceback
- **Factory Reset…** — `ConfirmDialog` (double-confirm) → wipes all data, clears plugins, re-runs onboarding

---

## States

### Entry Conditions
Safe Mode is triggered when:
- IPC bridge fails to start
- Lua runtime crashes during plugin load
- Frontend detects > 3 consecutive startup failures
- User manually invokes via `--safe-mode` CLI flag

### Error Detail Expanded
- `<pre>` with monospace stack trace
- Syntax-highlighted Lua error if plugin-caused

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.plugins` | `disableAll()` |
| `window.neurodeck.system` | `restart()`, `getSafeModeReason()`, `factoryReset()` |

---

## Accessibility Notes

- Full-screen: `role="alertdialog"`, `aria-modal="true"`, `aria-label="NEURODECK Safe Mode"`, `aria-live="assertive"` on entry
- Focus lands on "Disable All Plugins and Restart" (safest recovery action)
- "View Error Details" toggle: `aria-expanded` on button

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/recovery/SafeModeScreen.tsx` — **New file** rendered at app root level (above all other views)

Safe Mode flag: passed from Electron main process via `process.argv.includes('--safe-mode')` or set in `localStorage("nd:safe-mode-reason")` when a startup crash is detected. `SafeModeScreen` renders when this flag is present, completely replacing the main app shell.
