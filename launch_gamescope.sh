#!/bin/bash
# launch_gamescope.sh - Helper script to run NEURODECK in SteamOS Game Mode under Gamescope

# Directory containing the binary
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Resolve binary
if [ -f "$DIR/neurodeck" ]; then
    BINARY="$DIR/neurodeck"
elif [ -f "$DIR/app" ]; then
    BINARY="$DIR/app"
elif [ -f "$DIR/neurodeck.AppImage" ]; then
    BINARY="$DIR/neurodeck.AppImage"
else
    echo "Error: NEURODECK binary not found in $DIR"
    exit 1
fi

# WebKit & Tauri runtime optimizations for Steam Deck / Gamescope
export WEBKIT_DISABLE_DMABUF_RENDERER=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export APPIMAGE_EXTRACT_AND_RUN=1
export GDK_SCALE=1

echo "Launching NEURODECK via Gamescope..."

# Resolution 1280x800 is the native Steam Deck resolution, fullscreen mode
if command -v gamescope &> /dev/null; then
    gamescope -W 1280 -H 800 -f -- "$BINARY"
else
    echo "gamescope command not found. Launching binary directly..."
    "$BINARY"
fi
