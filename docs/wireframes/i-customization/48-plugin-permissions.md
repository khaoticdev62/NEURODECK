# 48. Plugin Permissions

**Category:** I — Customization  
**Complexity:** Tier 1  
**Status:** New (`features/plugins/PluginPermissionsView.tsx`)  
**Shell:** Full App Shell or Drawer (480px)

---

## Purpose

Review and grant/revoke specific capability permissions for a Lua plugin — controlling what it can access within NEURODECK.

---

## Layout Zones

```
┌──────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                 │
│  Permissions — bmad.lua                [✕]       │
├──────────────────────────────────────────────────┤
│  [PERMISSIONS LIST]                              │
│                                                  │
│  Shell Capabilities                              │
│  ─────────────────────────────────────           │
│  ☑ registerCommand   Register slash commands     │
│  ☑ setPersona        Switch active persona       │
│  ☑ sendPrompt        Send prompts to LLM         │
│  ☐ execute           Run shell commands          │
│  ☐ print             Write to terminal output    │
│                                                  │
│  Memory & Data                                   │
│  ─────────────────────────────────────           │
│  ☐ readMemory        Read from memory DB         │
│  ☐ writeMemory       Write new memory items      │
│  ☐ deleteMemory      Delete memory items         │
│                                                  │
│  System Access                                   │
│  ─────────────────────────────────────           │
│  ☐ systemInfo        Read system metrics         │
│  ☐ networkAccess     Make outbound requests      │
│  ☐ fileSystem        Read/write project files    │
│                                                  │
├──────────────────────────────────────────────────┤
│  [FOOTER]                                        │
│  [Reset to Defaults]            [Save & Reload]  │
└──────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Save & Reload  
**IPC:** `window.neurodeck.plugins.setPermissions(id, grantedList)` → `plugins.reload(id)`  
**Outcome:** Plugin reloaded with new permission scope; Toast "Permissions updated"

---

## Secondary Actions

- **Reset to Defaults** — reverts to plugin's default requested permissions
- Checkbox toggles are instant in UI; apply on Save

---

## States

### Loading
- `Skeleton` × 3 permission rows

### No Permissions Requested
- `EmptyState` info: "This plugin does not declare any permission requirements."

### Unsaved Changes
- Footer "Save & Reload" button `variant="primary"` with subtle highlight indicator

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.plugins` | `getPermissions(id)`, `setPermissions(id, list)`, `reload(id)` |

---

## Accessibility Notes

- Checkboxes: `<label>` + `<input type="checkbox">` — no ARIA role needed
- Section headings: `<h3>` for each capability group
- Unsaved changes: `aria-live="polite"` announces "You have unsaved changes"

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/plugins/PluginPermissionsView.tsx` — **New file**

Permissions are scoped to Lua globals. Granting `execute` means the `execute` Lua global is registered for this plugin. Revoking it removes the global on next reload. Permissions persist in `user_config_dir()/data/plugin_permissions.json`.
