#!/bin/bash
# launch_gamescope.sh - Helper script to run NEURODECK in SteamOS Game Mode under Gamescope
# Electron Edition v1.8.0

# Directory containing the binary
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Resolve binary (Electron AppImage, raw binary, or legacy names)
if [ -f "$DIR/neurodeck.AppImage" ]; then
    BINARY="$DIR/neurodeck.AppImage"
    APPIMAGE_MODE=1
elif [ -f "$DIR/neurodeck" ]; then
    BINARY="$DIR/neurodeck"
    APPIMAGE_MODE=0
elif [ -f "$DIR/app" ]; then
    BINARY="$DIR/app"
    APPIMAGE_MODE=0
else
    echo "Error: NEURODECK binary not found in $DIR"
    exit 1
fi

# Electron + Gamescope runtime settings
export ELECTRON_DISABLE_GPU=0
export ELECTRON_ENABLE_LOGGING=0
export APPIMAGE_EXTRACT_AND_RUN=1
export GDK_SCALE=1

# Gamescope exposes Wayland only with --expose-wayland flag.
# Without it, fall back GTK to X11/XWayland to avoid display issues.
if [ -z "$WAYLAND_DISPLAY" ]; then
    export GDK_BACKEND=x11
fi

echo "Launching NEURODECK via Gamescope..."

# Resolution 1280x800 is the native Steam Deck resolution, fullscreen mode
if command -v gamescope &> /dev/null; then
    gamescope -W 1280 -H 800 -f -- "$BINARY"
else
    echo "gamescope command not found. Launching binary directly..."
    "$BINARY"
fi
