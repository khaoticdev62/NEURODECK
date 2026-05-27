#!/bin/bash

# =============================================================================
# NEURODECK Installation Script for SteamOS / Linux
# Version: 1.2.0
# =============================================================================

set -e

NEURODECK_VERSION="1.2.1"
INSTALL_DIR="$HOME/Applications/neurodeck"
DESKTOP_FILE="$HOME/.local/share/applications/neurodeck.desktop"
AUTOSTART_FILE="$HOME/.config/autostart/neurodeck.desktop"
NEURODECK_ENV_FILE="$HOME/.config/neurodeck/env"

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${CYAN}"
    echo "  _   _ _____ _   _ ____   ___  ____  _____ ____ _  __"
    echo " | \ | | ____| | | |  _ \ / _ \|  _ \| ____/ ___| |/ /"
    echo " |  \| |  _| | | | | |_) | | | | | | |  _|| |   | ' / "
    echo " | |\  | |___| |_| |  _ <| |_| | |_| | |__| |___| . \ "
    echo " |_| \_|_____|\___/|_| \_\\___/|____/|_____\____|_|\_\\"
    echo -e "${NC}"
    echo -e "${CYAN}  AI Terminal Interface — v${NEURODECK_VERSION}${NC}"
    echo "  =================================================="
    echo ""
}

print_step() { echo -e "${CYAN}[→]${NC} $1"; }
print_ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
print_err()  { echo -e "${RED}[✗]${NC} $1"; }

print_banner

# --- Detect distro ---
IS_STEAMOS=false
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if echo "$ID $ID_LIKE $NAME" | grep -qi "steamos\|arch"; then
        IS_STEAMOS=true
        print_ok "Detected SteamOS / Arch-based system"
    else
        print_warn "Running on: $NAME (not SteamOS — some features may differ)"
    fi
fi

# --- Create directories ---
print_step "Creating NEURODECK directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$INSTALL_DIR/sessions"
mkdir -p "$INSTALL_DIR/exports"
mkdir -p "$INSTALL_DIR/plugins"
mkdir -p "$INSTALL_DIR/scripts"
mkdir -p "$INSTALL_DIR/_bmad"
mkdir -p "$INSTALL_DIR/.agents"
mkdir -p "$INSTALL_DIR/data/memory"
mkdir -p "$HOME/.config/neurodeck"
print_ok "Directories created at $INSTALL_DIR"

# --- Locate and copy binary ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

print_step "Locating NEURODECK binary..."

BINARY_SRC=""
# Look for pre-built binary in common locations
for candidate in \
    "$SCRIPT_DIR/neurodeck" \
    "$SCRIPT_DIR/src-tauri/target/release/neurodeck" \
    "$SCRIPT_DIR/src-tauri/target/release/app"
do
    if [ -f "$candidate" ]; then
        BINARY_SRC="$candidate"
        break
    fi
done

if [ -z "$BINARY_SRC" ]; then
    # Try to build from source
    if command -v cargo &> /dev/null && command -v npm &> /dev/null; then
        print_step "No pre-built binary found — building from source..."
        cd "$SCRIPT_DIR"
        npm install --prefix frontend
        npx @tauri-apps/cli build
        for candidate in \
            "$SCRIPT_DIR/src-tauri/target/release/neurodeck" \
            "$SCRIPT_DIR/src-tauri/target/release/app"
        do
            if [ -f "$candidate" ]; then
                BINARY_SRC="$candidate"
                break
            fi
        done
    fi
fi

if [ -z "$BINARY_SRC" ]; then
    print_err "Could not find or build NEURODECK binary."
    print_err "Please build the project first: npm run tauri build"
    exit 1
fi

cp "$BINARY_SRC" "$INSTALL_DIR/neurodeck"
chmod +x "$INSTALL_DIR/neurodeck"
print_ok "Binary installed to $INSTALL_DIR/neurodeck"

# --- Copy configuration files ---
print_step "Copying configuration files..."

for f in llm-term.toml launch_gamescope.sh; do
    if [ -f "$SCRIPT_DIR/$f" ]; then
        cp "$SCRIPT_DIR/$f" "$INSTALL_DIR/$f"
    fi
done

# Copy custom_style.json
if [ -f "$SCRIPT_DIR/custom_style.json" ]; then
    cp "$SCRIPT_DIR/custom_style.json" "$INSTALL_DIR/custom_style.json"
elif [ -f "$SCRIPT_DIR/assets/custom_style.json" ]; then
    cp "$SCRIPT_DIR/assets/custom_style.json" "$INSTALL_DIR/custom_style.json"
fi

# Copy Steam Input gamepad profiles
if [ -f "$SCRIPT_DIR/neurodeck_gamepad.vdf" ]; then
    cp "$SCRIPT_DIR/neurodeck_gamepad.vdf" "$INSTALL_DIR/neurodeck_gamepad.vdf"
elif [ -f "$SCRIPT_DIR/assets/steam_input/neurodeck_gamepad.vdf" ]; then
    cp "$SCRIPT_DIR/assets/steam_input/neurodeck_gamepad.vdf" "$INSTALL_DIR/neurodeck_gamepad.vdf"
fi

if [ -f "$SCRIPT_DIR/steam_input.vdf" ]; then
    cp "$SCRIPT_DIR/steam_input.vdf" "$INSTALL_DIR/steam_input.vdf"
elif [ -f "$SCRIPT_DIR/assets/steam_input/steam_input.vdf" ]; then
    cp "$SCRIPT_DIR/assets/steam_input/steam_input.vdf" "$INSTALL_DIR/steam_input.vdf"
fi

# Copy scripts, plugins, and BMad directories
for dir in scripts plugins _bmad .agents; do
    if [ -d "$SCRIPT_DIR/$dir" ]; then
        cp -r "$SCRIPT_DIR/$dir/"* "$INSTALL_DIR/$dir/" 2>/dev/null || true
    fi
done

if [ -f "$INSTALL_DIR/launch_gamescope.sh" ]; then
    chmod +x "$INSTALL_DIR/launch_gamescope.sh"
fi
find "$INSTALL_DIR/scripts" -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
print_ok "Config files copied"

# --- Install voice / audio system dependencies (SteamOS/Arch) ---
if $IS_STEAMOS; then
    print_step "Installing voice and audio dependencies..."
    if command -v pacman &> /dev/null; then
        # arecord (alsa-utils) — required for microphone recording (Voice STT)
        # espeak-ng — required for text-to-speech (Voice TTS)
        # sshpass — required for SSH password authentication
        sudo pacman -S --needed --noconfirm alsa-utils espeak-ng sshpass 2>/dev/null || \
            print_warn "Could not install audio deps via pacman. Install manually: alsa-utils espeak-ng sshpass"
        print_ok "Audio/voice dependencies installed"
    else
        print_warn "pacman not found — install manually: arecord (alsa-utils), espeak-ng, sshpass"
    fi
fi

# --- Run Local LLM Setup (SteamOS/Linux specific) ---
if $IS_STEAMOS; then
    print_step "Configuring Local LLM (Ollama) service..."
    if [ -f "$INSTALL_DIR/scripts/setup_ollama.sh" ]; then
        bash "$INSTALL_DIR/scripts/setup_ollama.sh" "$INSTALL_DIR"
    fi

    print_step "Configuring SteamOS Desktop Tunnel daemon..."
    if [ -f "$INSTALL_DIR/scripts/setup_tunnel.sh" ]; then
        bash "$INSTALL_DIR/scripts/setup_tunnel.sh" "$INSTALL_DIR"
    fi
fi

# --- Gemini API key setup ---
print_step "Setting up API key..."
echo ""

EXISTING_KEY="${GEMINI_API_KEY:-}"
if [ -f "$NEURODECK_ENV_FILE" ]; then
    source "$NEURODECK_ENV_FILE" 2>/dev/null || true
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo -e "${YELLOW}  NEURODECK uses Gemini API for AI responses.${NC}"
    echo "  Get a free API key at: https://aistudio.google.com/apikey"
    echo ""
    read -r -p "  Enter your Gemini API key (or press Enter to skip): " api_key
    if [ -n "$api_key" ]; then
        mkdir -p "$(dirname "$NEURODECK_ENV_FILE")"
        echo "export GEMINI_API_KEY=\"$api_key\"" > "$NEURODECK_ENV_FILE"
        print_ok "API key saved to $NEURODECK_ENV_FILE"
    else
        print_warn "No API key provided. You can set GEMINI_API_KEY in your shell profile later."
        print_warn "Or configure Ollama in llm-term.toml for local LLM usage."
    fi
else
    print_ok "GEMINI_API_KEY already set — skipping"
fi

# --- Create launch wrapper that sources env ---
cat > "$INSTALL_DIR/neurodeck-launch.sh" << 'EOF'
#!/bin/bash
# NEURODECK Launch Wrapper — sources env and starts the app
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load saved API key if present
[ -f "$HOME/.config/neurodeck/env" ] && source "$HOME/.config/neurodeck/env"

cd "$SCRIPT_DIR"

if command -v gamescope &> /dev/null; then
    exec gamescope -W 1280 -H 800 -f -- "$SCRIPT_DIR/neurodeck"
else
    exec "$SCRIPT_DIR/neurodeck"
fi
EOF
chmod +x "$INSTALL_DIR/neurodeck-launch.sh"
print_ok "Launch wrapper created"

# --- Create .desktop file ---
print_step "Creating desktop entry..."
mkdir -p "$(dirname "$DESKTOP_FILE")"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=NEURODECK
Comment=AI Terminal Interface for Steam Deck
Exec=$INSTALL_DIR/neurodeck-launch.sh
Icon=$INSTALL_DIR/neurodeck
Terminal=false
Categories=Utility;Application;
Keywords=AI;terminal;LLM;chatbot;
StartupNotify=true
EOF
chmod +x "$DESKTOP_FILE"
print_ok "Desktop entry created: $DESKTOP_FILE"

# --- Update desktop database ---
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications/" 2>/dev/null || true
fi

# --- Steam shortcut hint for Game Mode ---
if $IS_STEAMOS; then
    echo ""
    echo -e "${CYAN}  ╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║         STEAM DECK GAME MODE SETUP              ║${NC}"
    echo -e "${CYAN}  ╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}  ║${NC} 1. Open Steam in Desktop Mode                   ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC} 2. Library → Add a Game → Add a Non-Steam Game  ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC} 3. Browse to:                                    ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC}    $INSTALL_DIR/neurodeck-launch.sh ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC} 4. Rename it to 'NEURODECK' and click Add        ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC} 5. Switch to Game Mode — NEURODECK is ready!     ${CYAN}║${NC}"
    echo -e "${CYAN}  ╚══════════════════════════════════════════════════╝${NC}"
fi

# --- Done ---
echo ""
print_ok "========================================"
print_ok "  NEURODECK v${NEURODECK_VERSION} installed successfully!"
print_ok "========================================"
echo ""
echo "  Run from terminal:   $INSTALL_DIR/neurodeck-launch.sh"
echo "  Run directly:        $INSTALL_DIR/neurodeck"
echo ""
echo "  Configuration:       $INSTALL_DIR/llm-term.toml"
echo "  Plugins:             $INSTALL_DIR/plugins/"
echo "  Sessions:            $INSTALL_DIR/sessions/"
echo ""
