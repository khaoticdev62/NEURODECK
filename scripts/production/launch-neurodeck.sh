#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/Applications/NEURODECK"
DATA_DIR="$HOME/.local/share/neurodeck"
LOG_DIR="$DATA_DIR/logs"

mkdir -p "$DATA_DIR" "$LOG_DIR"

export NEURODECK_DATA_DIR="$DATA_DIR"
export NEURODECK_LOG_DIR="$LOG_DIR"

cd "$APP_DIR"

exec "$APP_DIR/NEURODECK.AppImage" --no-sandbox "$@" >> "$LOG_DIR/launcher.log" 2>&1
