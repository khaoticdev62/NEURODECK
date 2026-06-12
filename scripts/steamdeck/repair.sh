#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

steamdeck_require_writable_dir "$NEURODECK_INSTALL_APP_DIR"
steamdeck_require_writable_dir "$NEURODECK_INSTALL_BIN_DIR"

bash "$SCRIPT_DIR/create-desktop-entry.sh" >/dev/null
bash "$SCRIPT_DIR/create-game-mode-shortcut.sh" >/dev/null
bash "$SCRIPT_DIR/validate-runtime.sh" >/dev/null || true

steamdeck_write_report "repair" "pass" "Repair completed." "Launchers and desktop entries regenerated."
