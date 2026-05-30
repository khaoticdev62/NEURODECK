#!/bin/bash
# =============================================================================
# NEURODECK AppImage Diagnostic Script              scripts/shell/debug_appimage.sh
# =============================================================================
#
# Use this script to diagnose why NEURODECK AppImage won't launch on Steam Deck.
# Run from a terminal:
#   bash debug_appimage.sh /path/to/neurodeck.AppImage
#
# =============================================================================

set -euo pipefail

APPIMAGE="${1:-.}"
COLORS_CYAN='\033[0;36m'
COLORS_GREEN='\033[0;32m'
COLORS_RED='\033[0;31m'
COLORS_YELLOW='\033[1;33m'
COLORS_NC='\033[0m'

log_step() { echo -e "${COLORS_CYAN}[→]${COLORS_NC} $1"; }
log_ok()   { echo -e "${COLORS_GREEN}[✓]${COLORS_NC} $1"; }
log_err()  { echo -e "${COLORS_RED}[✗]${COLORS_NC} $1"; }
log_warn() { echo -e "${COLORS_YELLOW}[!]${COLORS_NC} $1"; }

echo ""
echo -e "${COLORS_CYAN}  ╔══════════════════════════════════════════╗${COLORS_NC}"
echo -e "${COLORS_CYAN}  ║  NEURODECK AppImage Diagnostics          ║${COLORS_NC}"
echo -e "${COLORS_CYAN}  ╚══════════════════════════════════════════╝${COLORS_NC}"
echo ""

# ── Check if file exists ───────────────────────────────────────────────────
if [ ! -f "$APPIMAGE" ]; then
    log_err "File not found: $APPIMAGE"
    exit 1
fi

log_ok "AppImage found: $APPIMAGE"

# ── Check permissions ───────────────────────────────────────────────────────
log_step "Checking file permissions..."
if [ -x "$APPIMAGE" ]; then
    log_ok "AppImage is executable"
else
    log_warn "AppImage is NOT executable — fixing..."
    chmod +x "$APPIMAGE"
    log_ok "Made executable: chmod +x $APPIMAGE"
fi

# ── Check file type ───────────────────────────────────────────────────────
log_step "Checking file type..."
FILE_INFO=$(file "$APPIMAGE")
if echo "$FILE_INFO" | grep -q "ELF\|executable"; then
    log_ok "Valid AppImage/ELF binary: $FILE_INFO"
else
    log_err "File is not an executable: $FILE_INFO"
    exit 1
fi

# ── Check FUSE ───────────────────────────────────────────────────────────
log_step "Checking FUSE support..."
if [ -c /dev/fuse ]; then
    log_ok "FUSE device available (/dev/fuse)"
elif modprobe fuse 2>/dev/null; then
    log_ok "FUSE kernel module available"
else
    log_warn "FUSE not available — using --appimage-extract-and-run"
fi

# ── Check WebKit runtime ───────────────────────────────────────────────────
log_step "Checking WebKit2GTK runtime..."
if command -v pacman &>/dev/null; then
    if pacman -Q webkit2gtk 2>/dev/null; then
        log_ok "webkit2gtk installed"
    else
        log_err "webkit2gtk NOT installed (required for Tauri apps)"
        log_step "Fix: sudo pacman -S webkit2gtk"
        exit 1
    fi
else
    log_warn "pacman not found — assuming WebKit is present"
fi

# ── Check required libraries ───────────────────────────────────────────────
log_step "Checking required libraries..."
REQUIRED_LIBS=(
    "libwebkit2gtk-4.1.so"
    "libgtk-3.so"
    "libglib-2.0.so"
    "libssl.so"
)

MISSING_LIBS=()
for lib in "${REQUIRED_LIBS[@]}"; do
    if ! ldconfig -p | grep -q "$lib"; then
        MISSING_LIBS+=("$lib")
    fi
done

if [ ${#MISSING_LIBS[@]} -eq 0 ]; then
    log_ok "All required libraries present"
else
    log_err "Missing libraries: ${MISSING_LIBS[*]}"
    log_step "Installing missing packages..."
    sudo pacman -S --needed webkit2gtk glib2 gtk3 openssl 2>/dev/null || true
fi

# ── Test AppImage extract mode ───────────────────────────────────────────
log_step "Testing AppImage extraction mode..."
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

export APPIMAGE_EXTRACT_AND_RUN=1
if "$APPIMAGE" --version 2>/dev/null | grep -q "tauri"; then
    log_ok "AppImage --version works (extract-and-run mode)"
else
    log_warn "AppImage --version check failed (but may still work)"
fi

# ── Environment variables ───────────────────────────────────────────────────
log_step "Recommended environment variables:"
echo "  export WEBKIT_DISABLE_DMABUF_RENDERER=1"
echo "  export WEBKIT_DISABLE_COMPOSITING_MODE=1"
echo "  export GDK_SCALE=1"
echo "  export APPIMAGE_EXTRACT_AND_RUN=1"
echo ""

# ── Final test ───────────────────────────────────────────────────────────
log_step "Attempting to launch AppImage (may fail — this is just a test)..."
echo ""
WEBKIT_DISABLE_DMABUF_RENDERER=1 \
    WEBKIT_DISABLE_COMPOSITING_MODE=1 \
    GDK_SCALE=1 \
    APPIMAGE_EXTRACT_AND_RUN=1 \
    timeout 3 "$APPIMAGE" &>/dev/null || true

log_ok "Diagnostic complete."
echo ""
echo -e "${COLORS_CYAN}  ──────────────────────────────────────${COLORS_NC}"
echo "  If the app still doesn't launch, try:"
echo "  1. Run: ldd $APPIMAGE 2>&1 | grep 'not found'"
echo "  2. Check: $APPIMAGE --appimage-extract-and-run 2>&1 | head -50"
echo "  3. Post logs to: https://github.com/khaoticdev62/NEURODECK/issues"
echo ""
