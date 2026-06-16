#!/usr/bin/env bash
# NEURODECK Steam Deck Game Mode Launcher
# Sources ~/.config/neurodeck/.env, then runs NEURODECK inside gamescope at 1280×800 fullscreen.
# Falls back to direct AppImage launch if gamescope is not available (Desktop Mode).

set -euo pipefail

APPIMAGE="$HOME/Applications/neurodeck/NEURODECK.AppImage"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/neurodeck"
ENV_FILE="$CONFIG_DIR/.env"
LOG_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/neurodeck/logs"

# ─────────────────────────────────────────────────────────────────
# 1. Validate AppImage exists
# ─────────────────────────────────────────────────────────────────
if [[ ! -f "$APPIMAGE" ]]; then
    echo "[NEURODECK] AppImage not found: $APPIMAGE" >&2
    echo "[NEURODECK] Run the installer first:" >&2
    echo "  $(dirname "$0")/install-steamdeck.sh" >&2
    exit 1
fi

# ─────────────────────────────────────────────────────────────────
# 2. Load environment (GEMINI_API_KEY, NEURODECK_PORT, NEURODECK_SAFE_MODE)
# ─────────────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

export NEURODECK_PORT="${NEURODECK_PORT:-9477}"

# ─────────────────────────────────────────────────────────────────
# 3. Set up logging
# ─────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/launch_$(date +%Y%m%d_%H%M%S).log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] NEURODECK launch starting" >> "$LOG_FILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Port: $NEURODECK_PORT" >> "$LOG_FILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Safe mode: ${NEURODECK_SAFE_MODE:-off}" >> "$LOG_FILE"

# ─────────────────────────────────────────────────────────────────
# 4. Launch — gamescope if available (Game Mode), otherwise direct (Desktop Mode)
# ─────────────────────────────────────────────────────────────────
if command -v gamescope &>/dev/null; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Mode: gamescope 1280x800" >> "$LOG_FILE"
    exec gamescope \
        -W 1280 -H 800 \
        -r 60 \
        -f \
        --force-grab-cursor \
        -- "$APPIMAGE" >> "$LOG_FILE" 2>&1
else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Mode: direct (gamescope not found)" >> "$LOG_FILE"
    exec "$APPIMAGE" >> "$LOG_FILE" 2>&1
fi
