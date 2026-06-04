#!/bin/bash

# =============================================================================
# NEURODECK Installation Script for SteamOS / Linux
# Version: 1.8.0 (Electron Edition)
# =============================================================================

set -e

NEURODECK_VERSION="1.8.0"
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

print_step "Locating NEURODECK binary or AppImage..."

BINARY_SRC=""
APPIMAGE_SRC=""

# ── 1. Check for AppImage in script dir or Downloads ────────────────────────
for candidate in \
    "$SCRIPT_DIR"/neurodeck_*.AppImage \
    "$SCRIPT_DIR/neurodeck.AppImage" \
    "$HOME/Downloads"/neurodeck_*.AppImage \
    "$HOME/Downloads/neurodeck.AppImage"
do
    if [ -f "$candidate" ]; then
        APPIMAGE_SRC="$candidate"
        print_ok "Found AppImage: $APPIMAGE_SRC"
        break
    fi
done

# ── 2. Check for pre-built raw binary ───────────────────────────────────────
if [ -z "$APPIMAGE_SRC" ]; then
    for candidate in \
        "$SCRIPT_DIR/neurodeck" \
        "$SCRIPT_DIR/src-tauri/target/release/neurodeck" \
        "$SCRIPT_DIR/src-tauri/target/release/app"
    do
        if [ -f "$candidate" ]; then
            BINARY_SRC="$candidate"
            print_ok "Found binary: $BINARY_SRC"
            break
        fi
    done
fi

# ── 3. Try to build from source as last resort ──────────────────────────────
if [ -z "$APPIMAGE_SRC" ] && [ -z "$BINARY_SRC" ]; then
    if command -v cargo &> /dev/null && command -v npm &> /dev/null; then
        print_step "No binary found — building from source (this takes ~5 minutes)..."
        cd "$SCRIPT_DIR"
        npm install
        npm run build
        for candidate in \
            "$SCRIPT_DIR/dist-electron/neurodeck_"*"_steamdeck_amd64.AppImage" \
            "$SCRIPT_DIR/dist-electron/"*.AppImage
        do
            if [ -f "$candidate" ]; then
                APPIMAGE_SRC="$candidate"
                break
            fi
        done
        # Fallback to raw binary if no AppImage was produced
        if [ -z "$APPIMAGE_SRC" ]; then
            for candidate in \
                "$SCRIPT_DIR/target/release/neurodeck" \
                "$SCRIPT_DIR/target/release/app"
            do
                if [ -f "$candidate" ]; then
                    BINARY_SRC="$candidate"
                    break
                fi
            done
        fi
    fi
fi

if [ -z "$APPIMAGE_SRC" ] && [ -z "$BINARY_SRC" ]; then
    print_step "Could not find a local binary. Attempting to fetch the latest release from GitHub..."
    
    LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/khaoticdev62/NEURODECK/releases/latest" | grep "browser_download_url.*amd64\.AppImage" | cut -d '"' -f 4 | head -n 1)
    
    if [ -n "$LATEST_RELEASE_URL" ]; then
        print_ok "Found latest release: $LATEST_RELEASE_URL"
        print_step "Downloading AppImage (this may take a moment)..."
        TEMP_APPIMAGE="/tmp/neurodeck_latest.AppImage"
        if curl -L "$LATEST_RELEASE_URL" -o "$TEMP_APPIMAGE"; then
            APPIMAGE_SRC="$TEMP_APPIMAGE"
            print_ok "Download complete."
        else
            print_err "Failed to download the AppImage."
        fi
    else
        print_warn "Could not resolve the latest AppImage URL from GitHub API."
    fi
fi

if [ -z "$APPIMAGE_SRC" ] && [ -z "$BINARY_SRC" ]; then
    print_err "Installation failed: No local binary, and auto-download failed."
    print_err ""
    print_err "Options:"
    print_err "  1. Download neurodeck_${NEURODECK_VERSION}_steamdeck_amd64.AppImage from"
    print_err "     https://github.com/khaoticdev62/NEURODECK/releases/latest"
    print_err "     and place it in the same folder as install.sh"
    print_err "  2. Build from source manually: npm run build"
    exit 1
fi

# ── 4. Install: AppImage path ────────────────────────────────────────────────
if [ -n "$APPIMAGE_SRC" ]; then
    # Always mark executable — SteamOS strips the bit on download
    chmod +x "$APPIMAGE_SRC"

    # Copy AppImage to install dir
    cp "$APPIMAGE_SRC" "$INSTALL_DIR/neurodeck.AppImage"
    chmod +x "$INSTALL_DIR/neurodeck.AppImage"

    # On SteamOS, always use extract-and-run for maximum compatibility.
    # FUSE is unreliable in the SteamOS sandbox.
    echo '#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
[ -f "$HOME/.config/neurodeck/env" ] && source "$HOME/.config/neurodeck/env"

# Steam Deck / Gamescope runtime optimizations
export APPIMAGE_EXTRACT_AND_RUN=1
export ELECTRON_DISABLE_GPU=0
export ELECTRON_ENABLE_LOGGING=0

# Gamescope Wayland support — fallback to X11 if no Wayland display
if [ -z "$WAYLAND_DISPLAY" ]; then
    export GDK_BACKEND=x11
fi

if [ -f "$SCRIPT_DIR/neurodeck.AppImage" ]; then
    exec "$SCRIPT_DIR/neurodeck.AppImage" "$@"
else
    echo "[ERROR] AppImage not found at $SCRIPT_DIR/neurodeck.AppImage"
    exit 1
fi' > "$INSTALL_DIR/neurodeck-launch.sh"
    print_ok "AppImage installed (extract-and-run mode, no FUSE needed)"

    chmod +x "$INSTALL_DIR/neurodeck-launch.sh"
    print_ok "AppImage installed to $INSTALL_DIR/neurodeck.AppImage"

# ── 5. Install: raw binary path ──────────────────────────────────────────────
else
    cp "$BINARY_SRC" "$INSTALL_DIR/neurodeck"
    chmod +x "$INSTALL_DIR/neurodeck"
    print_ok "Binary installed to $INSTALL_DIR/neurodeck"
fi

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

# Note: Electron AppImage bundles Chromium — no system WebKit/GTK install needed.
# SteamOS has read-only root filesystem, so sudo pacman -S would fail anyway.

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

# --- Create/update launch wrapper (AppImage path was already written above) ---
# Only overwrite for raw-binary installs; AppImage installs write the wrapper earlier.
if [ -z "$APPIMAGE_SRC" ]; then
    cat > "$INSTALL_DIR/neurodeck-launch.sh" << 'EOF'
#!/bin/bash
# NEURODECK Launch Wrapper — sources env and starts the app
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

[ -f "$HOME/.config/neurodeck/env" ] && source "$HOME/.config/neurodeck/env"

# Steam Deck / Electron runtime settings
export ELECTRON_DISABLE_GPU=0
export ELECTRON_ENABLE_LOGGING=0

cd "$SCRIPT_DIR"

if command -v gamescope &> /dev/null; then
    exec gamescope -W 1280 -H 800 -f -- "$SCRIPT_DIR/neurodeck"
else
    exec "$SCRIPT_DIR/neurodeck"
fi
EOF
    chmod +x "$INSTALL_DIR/neurodeck-launch.sh"
fi
print_ok "Launch wrapper ready: $INSTALL_DIR/neurodeck-launch.sh"

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
echo "  Troubleshooting:"
echo "    If NEURODECK doesn't launch, open a terminal and run:"
echo "      bash $INSTALL_DIR/neurodeck-launch.sh"
echo ""
echo "    This will show any error messages. Common fixes:"
echo "    • Missing FUSE (for AppImage): sudo pacman -S fuse2"
echo "    • Or use extract-and-run mode: APPIMAGE_EXTRACT_AND_RUN=1 ./neurodeck.AppImage"
echo "    • Permissions: chmod +x $INSTALL_DIR/neurodeck.AppImage"
echo ""
