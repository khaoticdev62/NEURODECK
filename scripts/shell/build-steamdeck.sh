#!/bin/bash
# =============================================================================
# NEURODECK Steam Deck Build Orchestrator
# scripts/shell/build-steamdeck.sh
# =============================================================================
#
# Builds the complete Electron + Rust sidecar package for Steam Deck.
# Run this on Linux (native, WSL2, or CI).
#
# Output:
#   dist-electron/neurodeck_${version}_steamdeck_amd64.AppImage
#   dist-electron/neurodeck_${version}_amd64.deb
#   dist/NEURODECK-${version}-SteamDeck.tar.gz  (distribution package)
#
# Requirements:
#   - Node.js 20+, npm
#   - Rust 1.92.0+ with x86_64-unknown-linux-gnu target
#   - libgtk-3-dev, libnss3, libasound2 (for Electron native deps)
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

print_step() { echo -e "${CYAN}[->]${NC} $1"; }
print_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[!] $1${NC}"; }
print_err()  { echo -e "${RED}[X] $1${NC}" >&2; exit 1; }
print_info() { echo -e "${DIM}    $1${NC}"; }

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║  NEURODECK Steam Deck Builder                        ║${NC}"
echo -e "${CYAN}  ║  Electron + Rust Sidecar  ·  Khaotic Labs            ║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── OS guard ───────────────────────────────────────────────────────────────────
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_warn "This script is designed for Linux. Current OS: $OSTYPE"
    print_warn "For Windows builds, run: npm run build"
    print_warn "Cross-compilation from Windows to Linux is not supported."
    exit 1
fi

# ── Version ────────────────────────────────────────────────────────────────────
VERSION=$(grep '"version"' "$PROJECT_ROOT/package.json" | head -1 | sed 's/.*": "\(.*\)".*/\1/')
print_info "Version      : $VERSION"
print_info "Project root : $PROJECT_ROOT"
echo ""

# ── Dependency checks ──────────────────────────────────────────────────────────
print_step "Checking dependencies..."

command -v node >/dev/null 2>&1 || print_err "Node.js not found. Install Node 20+ first."
command -v npm >/dev/null 2>&1 || print_err "npm not found."
command -v cargo >/dev/null 2>&1 || print_err "Rust/Cargo not found. Install rustup first."

NODE_VER=$(node --version | sed 's/v//;s/\..*//')
if [[ "$NODE_VER" -lt 20 ]]; then
    print_err "Node.js $NODE_VER is too old. Need v20+."
fi

RUST_VER=$(rustc --version | awk '{print $2}')
print_ok "Node $(node --version) | npm $(npm --version) | Rust $RUST_VER"

# ── Install JS deps ────────────────────────────────────────────────────────────
cd "$PROJECT_ROOT"
if [[ ! -d "node_modules" ]]; then
    print_step "Installing Node dependencies..."
    npm install
fi
if [[ ! -d "frontend/node_modules" ]]; then
    print_step "Installing frontend dependencies..."
    npm -w frontend install
fi
print_ok "Dependencies ready"

# ── Build frontend ─────────────────────────────────────────────────────────────
print_step "Building frontend (Vite production)..."
npm run frontend:build
print_ok "Frontend built → frontend/dist/"

# ── Build Rust sidecar ─────────────────────────────────────────────────────────
print_step "Building Rust sidecar (x86_64-linux, release)..."
cd "$PROJECT_ROOT/src-tauri"
cargo build --release --target x86_64-unknown-linux-gnu
print_ok "Sidecar built → target/release/app"

# ── Build Electron AppImage ────────────────────────────────────────────────────
print_step "Building Electron Linux packages (AppImage + deb)..."
cd "$PROJECT_ROOT"

# electron-builder needs to find electron in the right place.
# We run from the project root so it resolves paths correctly.
npx electron-builder --config electron-builder.yml --projectDir . --linux
print_ok "Electron packages built → dist-electron/"

# ── Verify outputs ─────────────────────────────────────────────────────────────
APPIMAGE=$(find "$PROJECT_ROOT/dist-electron" -maxdepth 1 -name "*.AppImage" | head -1)
DEB=$(find "$PROJECT_ROOT/dist-electron" -maxdepth 1 -name "*.deb" | head -1)

if [[ -z "$APPIMAGE" ]]; then
    print_err "AppImage not found in dist-electron/"
fi

SIZE_MB=$(du -m "$APPIMAGE" | cut -f1)
print_ok "AppImage: $APPIMAGE (${SIZE_MB} MB)"
if [[ -n "$DEB" ]]; then
    DEB_SIZE=$(du -m "$DEB" | cut -f1)
    print_ok "Deb:      $DEB (${DEB_SIZE} MB)"
fi

# ── Create distribution tarball ────────────────────────────────────────────────
print_step "Creating Steam Deck distribution package..."
DIST_DIR="$PROJECT_ROOT/dist"
mkdir -p "$DIST_DIR"

PKG_NAME="NEURODECK-${VERSION}-SteamDeck"
PKG_DIR="$DIST_DIR/$PKG_NAME"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"

cp "$APPIMAGE" "$PKG_DIR/neurodeck.AppImage"
cp "$PROJECT_ROOT/install.sh" "$PKG_DIR/install.sh"
cp "$PROJECT_ROOT/launch_gamescope.sh" "$PKG_DIR/launch_gamescope.sh"
chmod +x "$PKG_DIR/neurodeck.AppImage"
chmod +x "$PKG_DIR/install.sh"
chmod +x "$PKG_DIR/launch_gamescope.sh"

# Create a README for Steam Deck users
cat > "$PKG_DIR/README-SteamDeck.txt" << EOF
NEURODECK v${VERSION} — Steam Deck Edition
============================================

QUICK START (Desktop Mode)
--------------------------
1. Copy this folder to your Steam Deck (e.g. ~/Downloads/NEURODECK/)
2. Open Konsole (terminal) in that folder
3. Run: bash install.sh
4. The installer will create a desktop entry and launch wrapper

STEAM GAME MODE
---------------
1. In Desktop Mode, open Steam
2. Library → Add a Game → Add a Non-Steam Game
3. Browse to: ~/Applications/neurodeck/launch_gamescope.sh
4. Rename it to "NEURODECK" and click Add
5. Switch to Game Mode — NEURODECK is ready!

LAUNCH OPTIONS
--------------
- Desktop Mode:    ~/Applications/neurodeck/neurodeck-launch.sh
- Gamescope:       ~/Applications/neurodeck/launch_gamescope.sh
- Direct AppImage: ./neurodeck.AppImage

TROUBLESHOOTING
---------------
- If the AppImage won't launch: APPIMAGE_EXTRACT_AND_RUN=1 ./neurodeck.AppImage
- To see logs: ./neurodeck.AppImage --enable-logging
- Config file: ~/.config/neurodeck/llm-term.toml
- For support: https://github.com/khaoticdev62/NEURODECK/issues

WHAT'S INCLUDED
---------------
- neurodeck.AppImage     : Self-contained Electron app + Rust sidecar
- install.sh             : One-command installer
- launch_gamescope.sh    : Gamescope launcher for Game Mode
- README-SteamDeck.txt   : This file

Enjoy your AI terminal OS!
— Khaotic Labs
EOF

TAR_PATH="$DIST_DIR/${PKG_NAME}.tar.gz"
tar -czf "$TAR_PATH" -C "$DIST_DIR" "$PKG_NAME"
print_ok "Distribution package → $TAR_PATH"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║  Steam Deck Build Complete  ✓                        ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Artifacts:"
print_info "  AppImage : $APPIMAGE"
print_info "  Package  : $TAR_PATH"
echo ""
