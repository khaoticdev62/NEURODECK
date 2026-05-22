#!/bin/bash
# NEURODECK Launch Wrapper
# This script launches the application inside Alacritty with a specific config.

# Ensure we are in the correct directory (optional but recommended)
# cd "$(dirname "$0")/.."

# Launch Alacritty
alacritty --config-file ~/.config/alacritty/llm-term.toml -e ./neurodeck
