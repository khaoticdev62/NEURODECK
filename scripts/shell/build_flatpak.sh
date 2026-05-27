#!/bin/bash
# =============================================================================
# NEURODECK Flatpak Build Script
# Builds a self-contained .flatpak bundle for Linux / SteamOS distribution.
#
# Requirements (run on SteamOS / Linux):
#   flatpak install flathub org.freedesktop.Platform//23.08
#   flatpak install flathub org.freedesktop.Sdk//23.08
#   flatpak install flathub org.freedesktop.Sdk.Extension.rust-stable//23.08
#   flatpak install flathub org.freedesktop.Sdk.Extension.node20//23.08
#   flatpak install flathub org.flatpak.Builder
#
# Usage:
#   chmod +x build_flatpak.sh
#   ./build_flatpak.sh
#
# Output:
#   neurodeck.flatpak   -- installable bundle
#
# Install the bundle:
#   flatpak install --user neurodeck.flatpak
#
# Run:
#   flatpak run com.neurodeck.app
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ID="com.neurodeck.app"
MANIFEST="$SCRIPT_DIR/flatpak/$APP_ID.yml"
BUILD_DIR="$SCRIPT_DIR/.flatpak-build"
REPO_DIR="$SCRIPT_DIR/.flatpak-repo"
BUNDLE="$SCRIPT_DIR/neurodeck.flatpak"

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
echo "  NEURODECK Flatpak Builder"
echo "  ========================="
echo -e "${NC}"

# --- Check flatpak-builder ---
print_step "Checking build tools..."
if ! command -v flatpak-builder &>/dev/null; then
    if flatpak run org.flatpak.Builder --version &>/dev/null; then
        BUILDER="flatpak run org.flatpak.Builder"
        print_ok "Using flatpak run org.flatpak.Builder"
    else
        print_err "flatpak-builder not found. Install with:
  flatpak install flathub org.flatpak.Builder
  or: sudo pacman -S flatpak-builder  (Arch/SteamOS)"
    fi
else
    BUILDER="flatpak-builder"
    print_ok "flatpak-builder found at $(command -v flatpak-builder)"
fi

# --- Check required runtimes ---
print_step "Checking required Flatpak runtimes..."
MISSING=()
for component in \
    "org.freedesktop.Platform//23.08" \
    "org.freedesktop.Sdk//23.08" \
    "org.freedesktop.Sdk.Extension.rust-stable//23.08" \
    "org.freedesktop.Sdk.Extension.node20//23.08"
do
    if ! flatpak info "$component" &>/dev/null; then
        MISSING+=("$component")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    print_warn "Missing Flatpak components. Installing..."
    flatpak install --user -y flathub "${MISSING[@]}" || \
        print_err "Failed to install runtimes. Run manually:
  flatpak install --user flathub ${MISSING[*]}"
fi
print_ok "All runtimes present"

# --- Clean previous build ---
print_step "Cleaning previous build directories..."
rm -rf "$BUILD_DIR" "$REPO_DIR"
print_ok "Clean"

# --- Build ---
print_step "Building NEURODECK Flatpak (this will take 5-15 minutes)..."
print_warn "Cargo will download crates during build — network required."
echo ""

$BUILDER \
    --force-clean \
    --user \
    --install-deps-from=flathub \
    --repo="$REPO_DIR" \
    "$BUILD_DIR" \
    "$MANIFEST"

print_ok "Build complete"

# --- Export bundle ---
print_step "Exporting .flatpak bundle..."
flatpak build-bundle \
    "$REPO_DIR" \
    "$BUNDLE" \
    "$APP_ID"

BUNDLE_MB=$(du -m "$BUNDLE" | cut -f1)
print_ok "Bundle created: $BUNDLE ($BUNDLE_MB MB)"

echo ""
echo -e "${GREEN}=== Flatpak Build Complete ===${NC}"
echo ""
echo "  Bundle:  $BUNDLE"
echo ""
echo "  Install (current user):"
echo "    flatpak install --user $BUNDLE"
echo ""
echo "  Run:"
echo "    flatpak run $APP_ID"
echo ""
echo "  Add to Steam Game Mode:"
echo "    1. Desktop Mode -> Steam -> Add Non-Steam Game"
echo "    2. Browse to this script and add:"
echo "       /usr/bin/flatpak"
echo "       Launch Options: run $APP_ID"
echo "    3. Switch to Game Mode and launch from library"
echo ""
