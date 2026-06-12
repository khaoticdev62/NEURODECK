#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

launcher="$NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode"
entry="${XDG_DATA_HOME:-$HOME/.local/share}/applications/neurodeck-gamemode.desktop"

[[ -x "$launcher" ]] || { steamdeck_write_report "validate-game-mode" "blocked" "Game Mode launcher missing." "$launcher"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }
[[ -f "$entry" ]] || { steamdeck_write_report "validate-game-mode" "warning" "Game Mode desktop entry missing." "$entry"; exit "$STEAMDECK_EXIT_WARNING"; }

details="Verified launcher and helper entry. Manual checklist: open Steam Desktop Mode, add $launcher as a Non-Steam Game, verify 1280x800 fullscreen launch and log output under $NEURODECK_LOG_DIR."
steamdeck_write_report "validate-game-mode" "partial" "Static Game Mode checks passed; Steam library mutation remains manual-safe." "$details"
exit "$STEAMDECK_EXIT_WARNING"
