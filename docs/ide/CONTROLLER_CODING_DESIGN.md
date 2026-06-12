# Controller Coding Design

## IDE Modes

| Mode | Trigger | Primary Purpose |
|---|---|---|
| `IDE_NAVIGATION` | Default when IDE is open | Browse files, switch tabs |
| `IDE_EDIT` | Start/Enter button | Type and edit code |
| `IDE_PREDICTION` | Auto-triggers when predictions available | Accept/cycle completions |
| `IDE_COMMAND` | Y button opens command wheel | Select and run commands |
| `IDE_SNIPPET` | L2 opens snippet wheel | Browse and insert snippets |

## Button Bindings by Mode

### IDE_PREDICTION
| Button | Action |
|---|---|
| A | `IDE_ACCEPT_COMPLETION` |
| B | `IDE_DISMISS_COMPLETION` |
| DPad Down | `IDE_NEXT_COMPLETION` |
| DPad Up | `IDE_PREV_COMPLETION` |

### IDE_EDIT
| Button | Action |
|---|---|
| Y | `IDE_OPEN_COMMAND_WHEEL` |
| X | `IDE_TOGGLE_PREDICTIVE_BAR` |
| L5 | `IDE_FORMAT_FILE` |
| R5 | `IDE_RUN_COMMAND` |
| L1 | `IDE_NEXT_DIAGNOSTIC` |
| A (hold) | `IDE_GO_TO_DEFINITION` |

### IDE_NAVIGATION
| Button | Action |
|---|---|
| L1 | `IDE_PREV_TAB` |
| R1 | `IDE_NEXT_TAB` |

### IDE_COMMAND / IDE_SNIPPET
| Button | Action |
|---|---|
| A | `IDE_CONFIRM_COMMAND` / `IDE_ACCEPT_SNIPPET` |
| B | `IDE_CANCEL_COMMAND` / `IDE_DISMISS_COMPLETION` |
| L1 / R1 | `IDE_PREV_PLACEHOLDER` / `IDE_NEXT_PLACEHOLDER` |

## Keyboard Fallbacks

All IDE actions have keyboard fallbacks for desktop/non-gamepad use. See
`action-registry.ts` `keyboardFallback` fields.

## Hint Bar

`ControllerHintBar.tsx` renders a 32px bar at the top of IDEView showing the
current mode bindings. Can be toggled via the HB button or hidden for more
screen space on 1280×800.
