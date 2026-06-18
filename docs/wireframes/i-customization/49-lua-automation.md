# 49. Lua Automation

**Category:** I — Customization  
**Complexity:** Tier 2  
**Status:** New (`features/plugins/LuaScriptsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Write, test, and manage Lua automation scripts that run within NEURODECK's Lua runtime.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Lua Automation                        [─] [□] [×]      │
├──────┬──────────────────────────────────────────┬───────────────────────────────┤
│ Nav  │  [SCRIPT LIST]                           │  [EDITOR / OUTPUT]           │
│ Rail │                                          │                               │
│      │  [+ New Script]  [↺ Reload All]          │  hello_world.lua  [▶ Run]   │
│      │                                          │  ─────────────────────────── │
│      │  📄 bmad.lua         [Active ✓]          │  -- My automation script     │
│      │  📄 hello_world.lua  [Active ✓]          │  print("Hello, NEURODECK")   │
│      │  📄 scheduler_hook.lua  [Error ✗]        │                              │
│      │                                          │  ─────────────────────────── │
│      │                                          │  [OUTPUT]                    │
│      │                                          │  > Hello, NEURODECK          │
│      │                                          │  [Run at 09:17:42]           │
│      │                                          │                              │
│      │                                          │  [Clear Output]              │
├──────┴──────────────────────────────────────────┴───────────────────────────────┤
│ ControllerHintBar · [A] Run  [B] Back  [X] New Script  [Y] Reload            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Descriptions

| Zone | Component(s) | Content | Notes |
|------|-------------|---------|-------|
| Script List | Left panel 30% | All `.lua` files in `plugins/` | Status badges |
| Editor | Monaco (read-write mode) | Script source | Right panel 70% top |
| Output | `<pre>` | Lua stdout + errors | Right panel 70% bottom |

---

## Primary Action

**Label:** ▶ Run  
**IPC:** `window.neurodeck.plugins.runScript(id)` (confirms with `window.confirm` gate for execute-capable scripts)  
**Outcome:** Script executed; output appears in Output zone

---

## Secondary Actions

- **+ New Script** — creates new empty `.lua` file; opens in editor
- **↺ Reload All** — `window.neurodeck.plugins.reloadAll()`
- **Save** — `Ctrl+S` / save button; writes file via `window.neurodeck.ide.writeFile(path, content)`
- **Delete script** — `ConfirmDialog` → removes `.lua` file

---

## States

### Loading
- `Skeleton` for list; editor shows "Select a script"

### Error Script
- `Badge` tone `error` "Error"; clicking shows Lua error in Output zone

### Running
- Run button shows spinner

### Empty (no scripts)
- `EmptyState`: "No scripts yet. Create your first Lua automation."

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.plugins` | `list()`, `getSource(id)`, `runScript(id)`, `reloadAll()` |
| `window.neurodeck.ide` | `writeFile(path, content)`, `deleteFile(path)` |

---

## Accessibility Notes

- Script list: `role="list"` + `aria-label="Lua scripts"`
- Editor: Monaco provides `role="textbox"` natively
- Output: `role="log"`, `aria-live="polite"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/plugins/LuaScriptsView.tsx` — **New file**

Execute confirmation gate: AI-generated shell code in chat uses `window.confirm`. Apply same pattern here for scripts that use the `execute` Lua global. Scripts in `plugins/` directory auto-reload via `reloadAll()`.
