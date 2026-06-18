# 46. Plugin Manager

**Category:** I — Customization  
**Complexity:** Tier 2  
**Status:** Exists (`features/plugins/PluginsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Browse, install, enable/disable, and remove NEURODECK plugins — both local Lua scripts and registry plugins.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Plugins                               [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  [HEADER]                                                               │
│ Rail │  Plugins                    [Search plugins…]  [+ Install from file]   │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [Filter: All ▼]  [Status: All ▼]                                      │
│      ├─────────────────────────────────────────────────────────────────────────┤
│      │  [INSTALLED PLUGINS]  5 plugins                                         │
│      │                                                                         │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 🔌 bmad.lua                      v1.2 · Active                  │   │
│      │  │ BMAD AI Personas — registers /john, /sally, /bmad personas      │   │
│      │  │                    [🟢 Enabled] [Details →] [Disable] [Remove]  │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │  ┌──────────────────────────────────────────────────────────────────┐   │
│      │  │ 🔌 promptgen.lua                 v1.0 · Active                  │   │
│      │  │ Prompt generator — /formula, /promptlab, /promptgen             │   │
│      │  │                    [🟢 Enabled] [Details →] [Disable] [Remove]  │   │
│      │  └──────────────────────────────────────────────────────────────────┘   │
│      │                                                                         │
│      │  ─────────────────────────────────────────────────────────────────────  │
│      │  [Reload All Plugins]                           [Browse Plugin Registry] │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Details  [B] Back  [X] Toggle  [Y] Install           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Details →  
**IPC:** `dispatch({ type: "open-plugin-detail", pluginId })`  
**Outcome:** Plugin Detail drawer (screen 47) opens

---

## Secondary Actions

- **Enable / Disable** — `window.neurodeck.plugins.toggle(id)` → reload plugin
- **Remove** — `ConfirmDialog` → `window.neurodeck.plugins.remove(id)`
- **Reload All Plugins** — `window.neurodeck.plugins.reloadAll()`
- **Install from file** — file picker → `window.neurodeck.plugins.installFromFile(path)`
- **Browse Plugin Registry** — `dispatch({ type: "set-view", view: "plugin-registry" })`

---

## States

### Loading
- `Skeleton` × 3

### Empty (no plugins)
- `EmptyState` variant `action`: "No plugins installed. Install a .lua plugin file to extend NEURODECK."
- Action: "Install Plugin"

### Plugin Load Error
- `Badge` tone `error` on plugin card: "Load failed"
- Details → shows `ErrorState` with Lua error message

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.plugins` | `list()`, `toggle(id)`, `remove(id)`, `reloadAll()`, `installFromFile(path)`, `installFromRegistry(id)` |

---

## Accessibility Notes

- Plugin cards: `role="listitem"`; Enable/Disable: `aria-label="Enable [plugin name]"` / `aria-label="Disable [plugin name]"`; `aria-pressed` on toggle state

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/plugins/PluginsView.tsx` (exists)

Plugin files live in `plugins/` directory at app root. `reloadAll()` calls `plugin_mgr::reload_plugins_bridge`. A syntax error in any `.lua` file silently suppresses that plugin — check `[Lua Error]` lines in terminal for diagnosis.
