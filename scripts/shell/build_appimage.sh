#!/bin/bash
# =============================================================================
# NEURODECK AppImage Build Script
# Builds an .AppImage bundle for Linux distribution via Tauri.
#
# Requirements (Linux / WSL):
#   curl, nodejs (20+), npm, rust, cargo
#   libgtk-3-dev, libwebkit2gtk-4.1-dev, libappindicator3-dev,
#   librsvg2-dev, patchelf, pkg-config, libssl-dev, libasound2-dev, protobuf-compiler
#
# Usage:
#   chmod +x build_appimage.sh
#   ./build_appimage.sh
#
# Output:
#   src-tauri/target/release/bundle/appimage/*.AppImage
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUNDLE_DIR="$PROJECT_ROOT/target/release/bundle/appimage"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() { echo -e "${CYAN}[->]${NC} $1"; }
print_ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
print_err()  { echo -e "${RED}[X]${NC} $1"; exit 1; }

echo -e "${CYAN}"
echo "  NEURODECK AppImage Builder"
echo "  =========================="
echo -e "${NC}"

# --- OS check ---
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_err "AppImage builds must run on Linux or WSL. Current OS: $OSTYPE"
fi

# --- Ensure base tools ---
print_step "Ensuring base tools (curl, ca-certificates, build-essential)..."
sudo -n apt-get update -qq || true
sudo -n apt-get install -y -qq curl ca-certificates gnupg build-essential git >/dev/null 2>&1 || true
print_ok "Base tools ready"

# --- Check / install Node ---
print_step "Checking Node.js..."
if ! command -v node &>/dev/null; then
    print_warn "Node.js not found. Installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi
NODE_VER=$(node --version | sed 's/v//;s/\..*//')
if [ "$NODE_VER" -lt 20 ]; then
    print_warn "Node.js too old. Upgrading to Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi
print_ok "Node $(node --version)"

# --- Check / install Rust ---
print_step "Checking Rust..."
if ! command -v cargo &>/dev/null; then
    print_warn "Rust not found. Installing via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable >/dev/null 2>&1
    source "$HOME/.cargo/env"
fi
print_ok "Cargo $(cargo --version | awk '{print $2}')"

# --- Check system deps ---
print_step "Checking system dependencies..."
MISSING_PKGS=()
for pkg in libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf pkg-config libssl-dev libasound2-dev protobuf-compiler; do
    if ! dpkg -s "$pkg" &>/dev/null 2>&1; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    print_warn "Missing packages: ${MISSING_PKGS[*]}"
    print_step "Installing via apt..."
    sudo -n apt-get install -y "${MISSING_PKGS[@]}" || print_err "Failed to install packages."
fi
print_ok "System dependencies ready"

# --- Install frontend deps ---
print_step "Installing frontend dependencies..."
cd "$PROJECT_ROOT"
npm ci
print_ok "Frontend deps installed"

# --- Build frontend ---
print_step "Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm run build
print_ok "Frontend build complete"

# --- Build Tauri AppImage ---
print_step "Building AppImage (this may take 10–20 minutes on first run)..."
cd "$PROJECT_ROOT"
# Ensure cargo bin is in PATH for this session
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --bundles appimage
print_ok "Build complete"

# --- Report output ---
APPIMAGE=$(find "$BUNDLE_DIR" -maxdepth 1 -name "*.AppImage" | head -n 1)
if [ -z "$APPIMAGE" ]; then
    print_err "AppImage not found in $BUNDLE_DIR"
fi

SIZE_MB=$(du -m "$APPIMAGE" | cut -f1)
print_ok "AppImage created: $APPIMAGE ($SIZE_MB MB)"

echo ""
echo -e "${GREEN}=== AppImage Build Complete ===${NC}"
echo ""
echo "  File:  $APPIMAGE"
echo "  Size:  $SIZE_MB MB"
echo ""
echo "  Run directly:"
echo "    chmod +x $APPIMAGE"
echo "    $APPIMAGE"
echo ""
