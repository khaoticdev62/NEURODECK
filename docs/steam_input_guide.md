# Steam Input Configuration Guide

This guide explains how to configure Steam Input for the SteamOS LLM Terminal (Neurodeck) to achieve a native-feeling controller experience on the Steam Deck.

## Recommended Mappings

To use the terminal without a keyboard, map the following Steam Deck controls to the corresponding keyboard keys in the Steam Controller Settings:

| Steam Deck Control | Keyboard Mapping | Action |
|---|---|---|
| **A** | `Enter` | Submit prompt |
| **B** | `Esc` | Cancel generation / Close |
| **X** | `Backspace` | Delete character |
| **Y** | `Space` | Insert space |
| **L1** | `Tab` | Switch focus |
| **R1** | `Shift+Tab` | Reverse focus switch |
| **L2** | `Ctrl+U` | Clear current line |
| **R2** | `Ctrl+V` | Paste from clipboard |
| **L4** | `Ctrl+P` | Cycle persona (Feature coming soon) |
| **R4** | `Ctrl+R` | Regenerate response (Feature coming soon) |
| **L5** | `Ctrl+S` | Save session |
| **R5** | `Ctrl+N` | New thread (Feature coming soon) |

## How to Apply in Steam

1. Add the `neurodeck` binary as a Non-Steam Game in Desktop Mode, or use the provided launch script.
2. Switch back to Game Mode.
3. Select **Neurodeck** and go to **Controller Settings**.
4. Edit the layout and map the buttons according to the table above.
5. You can also set up a **Radial Menu** on one of the trackpads to map shortcuts like `Ctrl+S`, `Ctrl+E`, etc., for quick access!

## Implemented Shortcuts in App

The application currently responds to:
- `Enter`: Submit prompt.
- `Ctrl+S`: Save session to `exports/`.
- `Ctrl+E`: Export session to markdown in `exports/`.
