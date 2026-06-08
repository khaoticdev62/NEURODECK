#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/Applications/NEURODECK"
DATA_DIR="$HOME/.local/share/neurodeck"
DESKTOP_FILE="$HOME/.local/share/applications/neurodeck.desktop"

mkdir -p "$APP_DIR" "$DATA_DIR/logs" "$DATA_DIR/exports" "$DATA_DIR/plugins" "$DATA_DIR/backups"

echo "Copy NEURODECK.AppImage into $APP_DIR before running production install steps."
echo "Creating desktop launcher..."

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=NEURODECK
Exec=$APP_DIR/launch-neurodeck.sh
Icon=$APP_DIR/neurodeck.png
Type=Application
Categories=Utility;Development;
EOF

chmod +x "$DESKTOP_FILE" || true

echo "NEURODECK Steam Deck install scaffold complete."
