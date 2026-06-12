#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"

desktop_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
desktop_file="$desktop_dir/neurodeck-gamemode.desktop"
launcher="$NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode"
icon_path="$NEURODECK_INSTALL_APP_DIR/resources/assets/brand/icon.png"

steamdeck_require_writable_dir "$desktop_dir"

cat > "$desktop_file" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=NEURODECK (Game Mode)
Comment=AI terminal OS for Steam Deck Game Mode
Exec=$launcher
Icon=$icon_path
Terminal=false
Categories=Game;Development;Utility;
Keywords=AI;terminal;SteamDeck;GameMode;
StartupWMClass=NEURODECK
EOF

chmod +x "$desktop_file"
steamdeck_write_report "create-game-mode-shortcut" "pass" "Game Mode helper entry generated." "$desktop_file"
