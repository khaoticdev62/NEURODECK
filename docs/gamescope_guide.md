# Gamescope Configuration for NEURODECK

To ensure NEURODECK launches correctly in fullscreen on the Steam Deck's Gaming Mode, use the following launch options in Steam.

## Launch Options

Add the following to the "Launch Options" field in the game's properties in Steam:

```bash
gamescope -W 1280 -H 800 -f -- %command%
```

## Explanation

- `-W 1280`: Sets the width to 1280 pixels (native resolution of Steam Deck).
- `-H 800`: Sets the height to 800 pixels.
- `-f`: Forces fullscreen.
- `-- %command%`: Placeholder for the actual command executed by Steam (e.g., your launch script).
