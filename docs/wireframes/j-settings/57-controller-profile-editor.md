# 57. Controller Profile Editor

**Category:** J — Settings  
**Complexity:** Tier 2  
**Status:** New (`features/settings/ControllerProfileView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Create and edit Steam Input / DeckCode controller button-binding profiles for NEURODECK navigation.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Controller Profiles                   [─] [□] [×]      │
├──────┬──────────────────────────────────────────┬───────────────────────────────┤
│ Nav  │  [LEFT — PROFILE LIST]                   │  [RIGHT — BINDING EDITOR]    │
│ Rail │                                          │                               │
│      │  [+ New Profile]                         │  Editing: Default Profile    │
│      │                                          │  ─────────────────────────── │
│      │  ✓ Default Profile  (Active)             │                               │
│      │  Game Mode Profile                       │  [STEAM DECK DIAGRAM]         │
│      │                                          │  Visual button map showing    │
│      │  [Duplicate] [Rename] [Delete]           │  L1/L2/L3/L4/L5              │
│      │                                          │  R1/R2/R3/R4/R5              │
│      │                                          │  A/B/X/Y, DPad, Sticks       │
│      │                                          │                               │
│      │                                          │  ─────────────────────────── │
│      │                                          │  [BINDING TABLE]              │
│      │                                          │  [A]     Confirm / Select    │
│      │                                          │  [B]     Back                 │
│      │                                          │  [X]     Search               │
│      │                                          │  [Y]     Reload               │
│      │                                          │  [L4]    Persona Switch       │
│      │                                          │  [R4]    Regenerate           │
│      │                                          │  [L5]    Save Session         │
│      │                                          │  [R5]    New Session          │
│      │                                          │  [LB]    Previous View        │
│      │                                          │  [RB]    Next View            │
│      │                                          │  [☰]     Radial Menu          │
│      │                                          │                               │
│      │                                          │  Click any binding to edit.   │
├──────┴──────────────────────────────────────────┴───────────────────────────────┤
│  [FOOTER]                                                                      │
│  [Reset to Defaults]                             [Activate Profile]  [Save]   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Activate Profile  
**IPC:** `window.neurodeck.system.activateControllerProfile(id)`  
**Outcome:** Profile active; controller hints bar updates to new bindings

---

## Secondary Actions

- **Save** — `window.neurodeck.system.saveControllerProfile(id, bindings)`
- **Reset to Defaults** — `ConfirmDialog` → restores 7 standard bindings
- **Duplicate** — creates copy of selected profile
- **Rename** — inline rename
- **Delete** — `ConfirmDialog` (cannot delete active profile)
- **Click binding row** — opens inline dropdown: available actions for that button

---

## States

### No Custom Profiles
- Left panel: only "Default Profile" shown

### Binding Being Edited
- Row expands with dropdown of assignable actions: navigate views, trigger commands, open drawers

### Unsaved Changes
- "Save" button highlighted; "Unsaved changes" indicator

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `listControllerProfiles()`, `saveControllerProfile(id, bindings)`, `activateControllerProfile(id)`, `resetControllerDefaults(id)` |

---

## Accessibility Notes

- Binding table: `role="grid"` / `role="row"` / `role="gridcell"`
- Edit dropdown: `role="combobox"` + `role="listbox"` for action selection
- Profile list: `role="list"`, active item has `aria-label="[name] — active"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/settings/ControllerProfileView.tsx` — **New file**

Bindings stored in `user_config_dir()/data/profiles/controller_[id].json`. Controller hints bar reads active profile bindings from `deckcode/resolver.rs`. Steam Input `.vdf` profile mapping is separate and lives in `docs/steam_input_guide.md` — this view manages app-level action bindings, not OS-level button remapping.
