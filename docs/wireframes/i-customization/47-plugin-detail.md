# 47. Plugin Detail

**Category:** I — Customization  
**Complexity:** Tier 1  
**Status:** Partial — drawer inside PluginsView  
**Shell:** Drawer (520px) from Plugin Manager

---

## Purpose

Inspect a plugin's metadata, registered commands, hooks, permissions, and Lua source.

---

## Layout Zones

```
┌──────────────────────────────────────────────────────────────────┐
│  [DRAWER HEADER]                                                 │
│  🔌 bmad.lua                              [🟢 Enabled] [✕]      │
├──────────────────────────────────────────────────────────────────┤
│  [DETAIL TABS]                                                   │
│  [Overview] [Commands] [Hooks] [Permissions] [Source]            │
├──────────────────────────────────────────────────────────────────┤
│  === OVERVIEW TAB ===                                            │
│                                                                  │
│  BMAD AI Personas                                               │
│  Version 1.2 · by khaoticdev62                                  │
│  Loaded 2 minutes ago                                           │
│                                                                  │
│  Description                                                     │
│  Registers the BMAD persona suite — /john, /sally,              │
│  and 7 other specialist personas.                               │
│                                                                  │
│  Registered Commands                                            │
│  /john   /sally   /bmad   /researcher   /architect              │
│                                                                  │
│  Hooks                                                           │
│  on_message_send (1)                                             │
│  on_session_start (1)                                            │
│                                                                  │
│  Permissions Required                                            │
│  sendPrompt, setPersona, registerCommand                         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [FOOTER]                                                        │
│  [Disable]        [Edit Permissions]          [Remove Plugin]   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tabs

| Tab | Content |
|-----|---------|
| Overview | Metadata, registered commands, hooks, permissions |
| Commands | Full list of slash commands with descriptions |
| Hooks | Hook registrations with event types |
| Permissions | Granted/requested permission scopes |
| Source | Lua source code (read-only, monospace) |

---

## Primary Action

**Label:** Enable / Disable toggle  
**IPC:** `window.neurodeck.plugins.toggle(id)`

---

## Secondary Actions

- **Edit Permissions** — navigates to Plugin Permissions (screen 48) for this plugin
- **Remove Plugin** — `ConfirmDialog` (critical) → `window.neurodeck.plugins.remove(id)`

---

## States

### Load Error
- Source tab: shows Lua error output
- Overview tab: `ErrorState` "Plugin failed to load — see Source tab"

### Disabled Plugin
- Header badge: "Disabled"
- Commands/Hooks tabs: "Disabled — commands not active"

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.plugins` | `get(id)`, `toggle(id)`, `remove(id)`, `getSource(id)` |

---

## Accessibility Notes

- Drawer: `role="dialog"`, `aria-label="Plugin detail: [name]"`, `FocusTrapContainer`
- Tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"`
- Source tab: `<pre>` with `role="document"` and `aria-label="Plugin source code"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/plugins/PluginDetailDrawer.tsx` — **New file** (extract from PluginsView inline expand)

Source code loaded on tab switch, not on drawer open (lazy load).
