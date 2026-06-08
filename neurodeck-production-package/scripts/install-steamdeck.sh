#!/usr/bin/env bash
# NEURODECK Steam Deck Production Installer
# Usage: ./install-steamdeck.sh [/path/to/NEURODECK.AppImage]
#
# Detects the AppImage, validates it, installs to ~/Applications/neurodeck/,
# creates a config directory, writes a default config, and wires up Desktop/Game Mode launchers.

set -euo pipefail

# ─────────────────────────────────────────────────────────────────
# Colour helpers
# ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[ERR ]${NC} $*" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────
INSTALL_DIR="$HOME/Applications/neurodeck"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/neurodeck"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/neurodeck"
LOG_DIR="$DATA_DIR/logs"
DESKTOP_FILE="$HOME/.local/share/applications/neurodeck.desktop"
LAUNCHER="$HOME/.local/bin/neurodeck"
ENV_FILE="$CONFIG_DIR/.env"
TOML_FILE="$CONFIG_DIR/llm-term.toml"

echo "═══════════════════════════════════════════════════════════════"
echo "  NEURODECK — Steam Deck Production Installer"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# 1. Locate AppImage
# ─────────────────────────────────────────────────────────────────
APPIMAGE_SRC="${1:-}"
if [[ -z "$APPIMAGE_SRC" ]]; then
    # Search common locations
    for search_dir in "." "$HOME/Downloads" "$HOME/Desktop"; do
        FOUND=$(find "$search_dir" -maxdepth 1 -name "NEURODECK*.AppImage" 2>/dev/null | sort -V | tail -n 1)
        if [[ -n "$FOUND" ]]; then
            APPIMAGE_SRC="$FOUND"
            break
        fi
    done
fi

[[ -z "$APPIMAGE_SRC" ]] && fail "AppImage not found. Pass the path as an argument:\n  $0 /path/to/NEURODECK.AppImage\nOr build with: ./scripts/shell/build_appimage.sh"
[[ ! -f "$APPIMAGE_SRC" ]] && fail "File not found: $APPIMAGE_SRC"

# Validate it's a real AppImage (ELF or ISO9660)
if ! file "$APPIMAGE_SRC" | grep -qE 'ELF|ISO 9660'; then
    fail "Not a valid AppImage: $APPIMAGE_SRC"
fi

# Validate architecture (x86-64 only — Steam Deck LCD/OLED)
if file "$APPIMAGE_SRC" | grep -q 'ELF' && ! file "$APPIMAGE_SRC" | grep -q 'x86-64'; then
    fail "Wrong architecture. NEURODECK requires x86-64. Got: $(file "$APPIMAGE_SRC")"
fi

ok "AppImage located: $APPIMAGE_SRC"

# ─────────────────────────────────────────────────────────────────
# 2. Create directory layout
# ─────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR" "$CONFIG_DIR" "$DATA_DIR" "$LOG_DIR" "$HOME/.local/bin"
ok "Directories created"

# ─────────────────────────────────────────────────────────────────
# 3. Install AppImage
# ─────────────────────────────────────────────────────────────────
cp "$APPIMAGE_SRC" "$INSTALL_DIR/NEURODECK.AppImage"
chmod +x "$INSTALL_DIR/NEURODECK.AppImage"
ok "AppImage installed to $INSTALL_DIR/NEURODECK.AppImage"

# ─────────────────────────────────────────────────────────────────
# 4. Write default config (skip if already exists)
# ─────────────────────────────────────────────────────────────────
if [[ ! -f "$TOML_FILE" ]]; then
    cat > "$TOML_FILE" <<'TOML'
# NEURODECK configuration — edit this file to set your provider and preferences.
# Full reference: docs/USER_GUIDE.md

[llm]
provider = "gemini"
model = "gemini-2.0-flash"
# gemini_api_key is read from the GEMINI_API_KEY environment variable or OS keychain.
# Set it in ~/.config/neurodeck/.env (see post-install instructions below).

[ui]
theme = "cyberpunk"
persona = "neurodeck"

[privacy]
default_level = "standard"
auto_lock_minutes = 30
TOML
    ok "Default config written to $TOML_FILE"
else
    warn "Config already exists — skipping: $TOML_FILE"
fi

# ─────────────────────────────────────────────────────────────────
# 5. Write .env template (skip if already exists)
# ─────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    cat > "$ENV_FILE" <<'ENV'
# NEURODECK environment variables
# This file is sourced before launch. Keep it private (chmod 600).

# Required: your Gemini API key (get one at console.cloud.google.com)
# GEMINI_API_KEY=AIza...

# Optional: override the bridge port (default 9477)
# NEURODECK_PORT=9477

# Optional: skip all Lua plugin loading (safe mode)
# NEURODECK_SAFE_MODE=1
ENV
    chmod 600 "$ENV_FILE"
    ok "Environment template written to $ENV_FILE"
else
    warn ".env already exists — skipping: $ENV_FILE"
fi

# ─────────────────────────────────────────────────────────────────
# 6. Write unified launcher (Desktop + Game Mode)
# ─────────────────────────────────────────────────────────────────
cat > "$LAUNCHER" <<LAUNCHER_SCRIPT
#!/usr/bin/env bash
# NEURODECK launcher — sources .env then runs in gamescope (Game Mode) or directly (Desktop).
APPIMAGE="$INSTALL_DIR/NEURODECK.AppImage"
ENV_FILE="$ENV_FILE"
LOG_DIR="$LOG_DIR"

if [[ ! -f "\$APPIMAGE" ]]; then
    echo "Error: NEURODECK not installed. Run install-steamdeck.sh." >&2
    exit 1
fi

# Source env vars (GEMINI_API_KEY, NEURODECK_PORT, NEURODECK_SAFE_MODE)
[[ -f "\$ENV_FILE" ]] && set -a && source "\$ENV_FILE" && set +a

NEURODECK_PORT="\${NEURODECK_PORT:-9477}"
export NEURODECK_PORT

LOG_FILE="\$LOG_DIR/launch_\$(date +%Y%m%d).log"
mkdir -p "\$LOG_DIR"

if command -v gamescope &>/dev/null; then
    exec gamescope -W 1280 -H 800 -r 60 -f --force-grab-cursor -- "\$APPIMAGE" >> "\$LOG_FILE" 2>&1
else
    exec "\$APPIMAGE" >> "\$LOG_FILE" 2>&1
fi
LAUNCHER_SCRIPT
chmod +x "$LAUNCHER"
ok "Launcher written to $LAUNCHER"

# ─────────────────────────────────────────────────────────────────
# 7. Desktop entry
# ─────────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$DESKTOP_FILE")"
cat > "$DESKTOP_FILE" <<DESKTOP
[Desktop Entry]
Name=NEURODECK
Comment=AI-powered terminal OS for Steam Deck
Exec=$LAUNCHER
Icon=$INSTALL_DIR/icon.png
Type=Application
Categories=Development;Utility;
StartupWMClass=neurodeck
X-KDE-RunOnDiscreteGpu=true
DESKTOP
ok "Desktop entry written to $DESKTOP_FILE"

# Refresh desktop database if available
if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

# ─────────────────────────────────────────────────────────────────
# 8. Post-install instructions
# ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
ok "NEURODECK installed successfully!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Next step: set your Gemini API key"
echo "  Edit: $ENV_FILE"
echo "  Add:  GEMINI_API_KEY=AIza..."
echo ""
echo "  Launch (Desktop Mode): neurodeck"
echo "  Launch (Game Mode):    neurodeck   (gamescope auto-detected)"
echo ""
echo "  Add to Steam:"
echo "  1. Steam → Games → Add a Non-Steam Game"
echo "  2. Browse to: $LAUNCHER"
echo "  3. Set name: NEURODECK"
echo ""
echo "  Config dir:  $CONFIG_DIR"
echo "  Data dir:    $DATA_DIR"
echo "  Logs:        $LOG_DIR"
echo ""
