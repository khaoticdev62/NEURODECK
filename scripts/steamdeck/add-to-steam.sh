#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

steam_root="${HOME}/.local/share/Steam"
shortcuts_file="$(find "$steam_root/userdata" -path "*/config/shortcuts.vdf" 2>/dev/null | head -n 1 || true)"

if [[ -z "$shortcuts_file" ]]; then
  steamdeck_write_report "add-to-steam" "partial" "Steam shortcuts file not found." "Open Steam in Desktop Mode and add $NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode as a Non-Steam Game manually."
  exit "$STEAMDECK_EXIT_WARNING"
fi

backup="${shortcuts_file}.bak.$(date +%Y%m%d%H%M%S)"
steamdeck_run cp "$shortcuts_file" "$backup"
steamdeck_write_report "add-to-steam" "partial" "Backed up shortcuts.vdf but did not mutate it automatically." "Backup: $backup. Manual fallback: add $NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode in Steam Desktop Mode."
exit "$STEAMDECK_EXIT_WARNING"
