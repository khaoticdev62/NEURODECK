#!/bin/bash
# scripts/setup_tunnel.sh
# Configures a non-root, user-level systemd daemon for the SteamOS Desktop Tunnel.

set -e

INSTALL_DIR="${1:-$HOME/Applications/neurodeck}"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/neurodeck-tunnel.service"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}[→] Starting SteamOS Desktop Tunnel configuration...${NC}"

# Create directories
mkdir -p "$SERVICE_DIR"

# Verify binary exists (or warn if not, it will be placed during installation)
NEURODECK_BIN="$INSTALL_DIR/neurodeck"
if [ ! -f "$NEURODECK_BIN" ]; then
    echo -e "${YELLOW}[!] Note: neurodeck binary not found yet at $NEURODECK_BIN. Service will be ready once installed.${NC}"
fi

# Write systemd user service
echo -e "${CYAN}[→] Configuring systemd user service: $SERVICE_FILE...${NC}"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=NEURODECK SteamOS Desktop Tunnel Daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$NEURODECK_BIN --tunnel
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}[✓] systemd user service written to $SERVICE_FILE${NC}"

# Reload, enable and start service
echo -e "${CYAN}[→] Launching tunnel systemd user service...${NC}"
systemctl --user daemon-reload
systemctl --user enable neurodeck-tunnel.service
systemctl --user restart neurodeck-tunnel.service

# Verify service is enabled/active
if systemctl --user is-active neurodeck-tunnel.service &>/dev/null; then
    echo -e "${GREEN}[✓] SteamOS Desktop Tunnel daemon is active and running in background!${NC}"
else
    echo -e "${YELLOW}[!] Tunnel daemon was enabled but is not active yet. It will run when the binary is installed.${NC}"
fi

echo -e "${GREEN}[✓] Tunnel auto-config completed successfully!${NC}"
