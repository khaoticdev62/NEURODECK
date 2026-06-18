# 74. Feature Flags

**Category:** M — Developer  
**Complexity:** Tier 1  
**Status:** New (`features/developer/FeatureFlagsView.tsx`)  
**Shell:** Full App Shell

---

## Purpose

Enable and disable experimental NEURODECK features and developer-mode capabilities without reinstalling.

---

## Layout Zones

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ TitleBar — NEURODECK · Feature Flags                         [─] [□] [×]      │
├──────┬─────────────────────────────────────────────────────────────────────────┤
│ Nav  │  Feature Flags                                                          │
│ Rail │  ─────────────────────────────────────────────────────────────────────  │
│      │  ⚠ Experimental features may be unstable. Use with caution.            │
│      │                                                                         │
│      │  [DEVELOPER]                                                            │
│      │  developer_mode                                     [Toggle: Off]      │
│      │  Enables Dev Console, IPC Connector Map, and raw                       │
│      │  command testing. Restart required.                                    │
│      │                                                                         │
│      │  [EXPERIMENTAL FEATURES]                                                │
│      │  neural_focus_mode                                  [Toggle: Off]      │
│      │  Enables fullscreen focus mode with auto-hide UI.                      │
│      │                                                                         │
│      │  split_workspace                                    [Toggle: On]       │
│      │  Side-by-side workspace + terminal layout.                             │
│      │                                                                         │
│      │  context_indexer_v2                                 [Toggle: Off]      │
│      │  Experimental faster context indexer (beta).                          │
│      │                                                                         │
│      │  model_marketplace                                  [Toggle: Off]      │
│      │  Browse and install models from the catalog UI.                        │
│      │                                                                         │
│      │  [EARLY ACCESS]                                                         │
│      │  warpinator_v2                                      [Toggle: Off]      │
│      │  gRPC v2 Warpinator protocol (incompatible with v1 peers).             │
│      │                                                                         │
│      │  [Reset All to Defaults]                                               │
├──────┴─────────────────────────────────────────────────────────────────────────┤
│ ControllerHintBar · [A] Toggle  [B] Back  [Y] Reset All                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Primary Action

**Label:** Toggle (per flag)  
**IPC:** `window.neurodeck.system.setFeatureFlag(flagName, value)`  
**Outcome:** Flag saved; some flags require restart (marked with "Restart required")

---

## Secondary Actions

- **Reset All to Defaults** — `ConfirmDialog` → resets all flags to production defaults

---

## States

### Restart Required
- Flags with `restartRequired: true` show inline note "Restart required to take effect"
- After toggle: `Banner` tone `info` "Restart NEURODECK to apply changes. [Restart Now]"

### All Default
- "Reset All" button disabled

---

## IPC Dependencies

| Connector | Commands Used |
|-----------|--------------|
| `window.neurodeck.system` | `getFeatureFlags()`, `setFeatureFlag(name, val)`, `resetFeatureFlags()`, `restart()` |

---

## Accessibility Notes

- Toggles: `role="switch"`, `aria-checked`, `aria-label="[flag name]: [description]"`
- Restart banner: `role="alert"`, `aria-live="assertive"`

---

## Developer Implementation Notes

**Path:** `frontend/src/react/features/developer/FeatureFlagsView.tsx` — **New file**

Feature flags persisted in `localStorage("nd:feature-flags")` — client-only, no server persistence needed. Flag definitions (name, description, category, defaultValue, restartRequired) live in `assets/feature-flags.json`.

Flag reading: `const flags = useFeatureFlags()` hook that reads from localStorage + merges defaults.
