# Terminal Controller UX Plan

## Scope

This document describes the Steam Deck / gamepad controller workflow for the terminal feature. It maps physical buttons and deck-code actions to terminal behaviors, documents the current overlay system, and lists unimplemented actions.

## Controller Action Map

The canonical controller action constants are defined in `src/shared/terminal/terminalControllerMap.ts`.

`TerminalScreen.tsx` listens for `deckcode-action` events and implements the following mappings:

| Deck-code action | Terminal behavior                              |
| ---------------- | ---------------------------------------------- |
| `X`              | Open the terminal command palette.             |
| `L4`             | Toggle the AI assistant panel.                 |
| `VIEW`           | Toggle the session manager overlay.            |
| `MENU`           | Toggle the plugin panel overlay.               |
| `L1`             | Cycle to the previous tab.                     |
| `R1`             | Cycle to the next tab.                         |
| `L5`             | Split the current pane vertically.             |
| `R4`             | Run the first AI-generated command suggestion. |
| `B` / `cancel`   | Close the topmost overlay.                     |
| `Y`              | Focus the active xterm instance.               |

## Overlay Stack

The terminal uses a stack of focus-trapped overlays:

1. **Command palette** (`TerminalCommandPalette.tsx`) — quick actions and commands.
2. **Assistant panel** (`TerminalAssistantPanel.tsx`) — AI explanations and suggestions.
3. **Session manager** — tab/pane management.
4. **Plugin panel** — plugin actions relevant to the terminal context.

`B` or the cancel action dismisses the topmost overlay. `Y` returns focus to the terminal input so the user can resume typing.

## Focus Management

- Each overlay traps focus while open.
- When all overlays are closed, controller input is routed to the active xterm pane.
- The active pane is highlighted visually; inactive panes are dimmed slightly.

## Operational Notes

- Controller hints are not currently rendered. `TerminalControllerHintBar.tsx` exists but is **not imported or rendered** by `TerminalScreen`.
- The command palette supports both controller and keyboard activation.
- Splitting a pane creates a new `pty_*` session and focuses it automatically.

## Known Gaps

| Action                       | Declared in map  | Implemented in `TerminalScreen` |
| ---------------------------- | ---------------- | ------------------------------- |
| `L2` — scroll output up      | Yes              | No                              |
| `R2` — scroll output down    | Yes              | No                              |
| `R5` — run last safe command | Yes              | No                              |
| Hint bar                     | Component exists | Not rendered                    |

### Recommended fixes

1. Wire `L2`/`R2` to xterm's scroll-by-line API.
2. Store the last executed safe command per pane and map `R5` to replay it.
3. Either render `TerminalControllerHintBar` at the bottom of `TerminalScreen` or remove the dead component.
