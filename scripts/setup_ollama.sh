#!/bin/bash
# scripts/setup_ollama.sh
# Configures a non-root, user-level Ollama service and pre-pulls qwen2.5:0.5b for SteamOS.

set -e

INSTALL_DIR="${1:-$HOME/Applications/neurodeck}"
BIN_DIR="$INSTALL_DIR/bin"
OLLAMA_BIN="$BIN_DIR/ollama"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/ollama.service"
CONFIG_FILE="$INSTALL_DIR/llm-term.toml"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}[→] Starting Local LLM configuration for Steam Deck...${NC}"

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$SERVICE_DIR"

# Download Ollama if not present
if [ ! -f "$OLLAMA_BIN" ]; then
    echo -e "${CYAN}[→] Downloading standalone Ollama binary...${NC}"
    if command -v curl &> /dev/null; then
        curl -fsSL https://ollama.com/download/ollama-linux-amd64 -o "$OLLAMA_BIN"
    elif command -v wget &> /dev/null; then
        wget -q https://ollama.com/download/ollama-linux-amd64 -O "$OLLAMA_BIN"
    else
        echo -e "${RED}[✗] Neither curl nor wget found. Cannot download Ollama.${NC}"
        exit 1
    fi
    chmod +x "$OLLAMA_BIN"
    echo -e "${GREEN}[✓] Ollama binary installed to $OLLAMA_BIN${NC}"
else
    echo -e "${GREEN}[✓] Ollama binary already exists at $OLLAMA_BIN${NC}"
fi

# Write systemd user service
echo -e "${CYAN}[→] Configuring systemd user service...${NC}"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Ollama Service (Neurodeck Local LLM)
After=network.target

[Service]
ExecStart=$OLLAMA_BIN serve
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_ORIGINS=*"
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}[✓] systemd user service written to $SERVICE_FILE${NC}"

# Reload, enable and start service
echo -e "${CYAN}[→] Launching Ollama systemd user service...${NC}"
systemctl --user daemon-reload
systemctl --user enable ollama.service
systemctl --user restart ollama.service

# Poll service status
echo -e "${CYAN}[→] Waiting for Ollama service to bind on 127.0.0.1:11434...${NC}"
OLLAMA_RUNNING=false
for i in {1..30}; do
    if curl -s http://127.0.0.1:11434/api/tags &> /dev/null; then
        OLLAMA_RUNNING=true
        break
    fi
    sleep 1
done

if [ "$OLLAMA_RUNNING" = false ]; then
    echo -e "${RED}[✗] Ollama service failed to start within 30 seconds.${NC}"
    echo -e "${YELLOW}[!] You can check service logs with: journalctl --user -u ollama.service${NC}"
    exit 1
fi
echo -e "${GREEN}[✓] Ollama is active and listening!${NC}"

# Pull qwen2.5:0.5b model
echo -e "${CYAN}[→] Pre-pulling Steam Deck optimized model (qwen2.5:0.5b)...${NC}"
"$OLLAMA_BIN" pull qwen2.5:0.5b

# Update S-Term configuration to point to qwen2.5:0.5b
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${CYAN}[→] Updating llm-term.toml to set qwen2.5:0.5b as default...${NC}"
    # Replace default provider with ollama, model with qwen2.5:0.5b
    sed -i 's/default_provider = .*/default_provider = "ollama"/' "$CONFIG_FILE"
    sed -i 's/ollama_model = .*/ollama_model = "qwen2.5:0.5b"/' "$CONFIG_FILE"
    echo -e "${GREEN}[✓] Config file updated at $CONFIG_FILE${NC}"
fi

echo -e "${GREEN}[✓] Local LLM setup completed successfully!${NC}"
