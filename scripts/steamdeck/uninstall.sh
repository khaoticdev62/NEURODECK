#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

remove_data=0
for arg in "${STEAMDECK_ARGS[@]}"; do
  [[ "$arg" == "--remove-data" ]] && remove_data=1
done

steamdeck_run rm -rf "$NEURODECK_INSTALL_APP_DIR" "$NEURODECK_INSTALL_BIN_DIR"
steamdeck_run rm -f "${XDG_DATA_HOME:-$HOME/.local/share}/applications/neurodeck.desktop" "${XDG_DATA_HOME:-$HOME/.local/share}/applications/neurodeck-gamemode.desktop"

if [[ "$remove_data" -eq 1 ]]; then
  steamdeck_run rm -rf "$NEURODECK_CONFIG_DIR" "$NEURODECK_LOG_DIR" "$NEURODECK_CACHE_DIR" "$NEURODECK_INSTALL_PLUGIN_DIR"
fi

steamdeck_write_report "uninstall" "pass" "NEURODECK uninstalled." "Remove data: $remove_data"
