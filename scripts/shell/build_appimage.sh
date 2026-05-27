#!/bin/bash
# =============================================================================
# NEURODECK AppImage Build Script                  scripts/shell/build_appimage.sh
# =============================================================================
#
# Standalone usage (Linux / WSL):
#   chmod +x scripts/shell/build_appimage.sh
#   ./scripts/shell/build_appimage.sh
#
# Orchestrated usage (called from scripts/powershell/build.ps1):
#   The PowerShell orchestrator injects:
#     NEURODECK_SKIP_DEPS=1   → skip apt installation (deps already present)
#     CARGO_BUILD_JOBS=N      → parallel cargo jobs
#     DIST_OUT=/path/to/dist  → copy final AppImage here when done
#
# Requirements (Linux / WSL2):
#   curl, nodejs 20+, npm, rustup
#   libgtk-3-dev, libwebkit2gtk-4.1-dev, libappindicator3-dev,
#   librsvg2-dev, patchelf, pkg-config, libssl-dev, libasound2-dev,
#   protobuf-compiler
#
# Output:
#   src-tauri/target/release/bundle/appimage/<name>_<ver>_amd64.AppImage
#   $DIST_OUT/<name>_<ver>_steamdeck_amd64.AppImage  (if DIST_OUT is set)
# =============================================================================

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Tauri AppImage output lands in src-tauri/ or root target/ depending on config
BUNDLE_SEARCH_DIRS=(
    "$PROJECT_ROOT/src-tauri/target/release/bundle/appimage"
    "$PROJECT_ROOT/target/release/bundle/appimage"
)

# ── Env defaults ───────────────────────────────────────────────────────────────
SKIP_DEPS="${NEURODECK_SKIP_DEPS:-0}"
CARGO_JOBS="${CARGO_BUILD_JOBS:-$(nproc 2>/dev/null || echo 4)}"
DIST_OUT="${DIST_OUT:-}"

export CARGO_BUILD_JOBS="$CARGO_JOBS"

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
echo -e "${CYAN}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║  NEURODECK AppImage Builder              ║${NC}"
echo -e "${CYAN}  ║  Khaotic Labs  ·  KFMS v1.0              ║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════════╝${NC}"
echo ""

print_info "Project root : $PROJECT_ROOT"
print_info "Cargo jobs   : $CARGO_JOBS"
print_info "Skip deps    : $SKIP_DEPS"
print_info "Dist output  : ${DIST_OUT:-<not set, artifact stays in bundle dir>}"
echo ""

# ── OS guard ───────────────────────────────────────────────────────────────────
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_err "AppImage builds require Linux or WSL2. Current OS: $OSTYPE"
fi

# ── Step 1: Base system packages ───────────────────────────────────────────────
if [[ "$SKIP_DEPS" != "1" ]]; then
    print_step "Ensuring base build tools..."
    sudo -n apt-get update -qq 2>/dev/null || true
    sudo -n apt-get install -y -qq \
        curl ca-certificates gnupg build-essential git \
        > /dev/null 2>&1 || true
    print_ok "Base tools ready"
else
    print_ok "Dep install skipped (NEURODECK_SKIP_DEPS=1)"
fi

# ── Step 2: Node.js ────────────────────────────────────────────────────────────
print_step "Checking Node.js..."
if ! command -v node &>/dev/null; then
    print_warn "Node.js not found — installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi

NODE_VER_MAJOR=$(node --version | sed 's/v//;s/\..*//')
if [[ "$NODE_VER_MAJOR" -lt 20 ]]; then
    print_warn "Node $(node --version) is below v20 — upgrading..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi
print_ok "Node $(node --version)"

# ── Step 3: Rust / Cargo ───────────────────────────────────────────────────────
print_step "Checking Rust toolchain..."
# Source cargo env if installed but not on PATH
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"

if ! command -v cargo &>/dev/null; then
    print_warn "Rust not found — installing via rustup (non-interactive)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --default-toolchain stable --no-modify-path >/dev/null 2>&1
    source "$HOME/.cargo/env"
fi
export PATH="$HOME/.cargo/bin:$PATH"
print_ok "Cargo $(cargo --version | awk '{print $2}')"

# ── Step 4: GTK / WebKit system deps ──────────────────────────────────────────
if [[ "$SKIP_DEPS" != "1" ]]; then
    print_step "Checking GTK/WebKit system dependencies..."
    REQUIRED_PKGS=(
        libgtk-3-dev
        libwebkit2gtk-4.1-dev
        libappindicator3-dev
        librsvg2-dev
        patchelf
        pkg-config
        libssl-dev
        libasound2-dev
        protobuf-compiler
        file
        libayatana-appindicator3-dev
    )
    MISSING=()
    for pkg in "${REQUIRED_PKGS[@]}"; do
        dpkg -s "$pkg" &>/dev/null || MISSING+=("$pkg")
    done

    if [[ "${#MISSING[@]}" -gt 0 ]]; then
        print_warn "Installing missing packages: ${MISSING[*]}"
        sudo -n apt-get install -y "${MISSING[@]}" \
            || print_err "apt-get failed. Run as a user with passwordless sudo or pre-install deps."
    fi
    print_ok "System dependencies satisfied"
fi

# ── Step 5: Frontend npm ci ────────────────────────────────────────────────────
print_step "Installing JS dependencies (npm ci)..."
cd "$PROJECT_ROOT"
# CI install — respects package-lock.json exactly
npm ci --prefer-offline
print_ok "npm ci done"

# ── Step 6: Frontend Vite build ────────────────────────────────────────────────
print_step "Building frontend (Vite)..."
cd "$PROJECT_ROOT"
npm run --prefix frontend build
print_ok "Frontend built → frontend/dist"

# ── Step 7: Tauri AppImage compile ────────────────────────────────────────────
print_step "Compiling Tauri AppImage (Rust + bundler)..."
print_info "Using $CARGO_JOBS parallel jobs — first compile ~10-25 min"
cd "$PROJECT_ROOT"
RUSTFLAGS="-C target-cpu=native" npx tauri build --bundles appimage
print_ok "Tauri build finished"

# ── Step 8: Locate output ──────────────────────────────────────────────────────
APPIMAGE=""
for dir in "${BUNDLE_SEARCH_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        APPIMAGE=$(find "$dir" -maxdepth 1 -name "*.AppImage" | sort | tail -n1)
        [[ -n "$APPIMAGE" ]] && break
    fi
done

if [[ -z "$APPIMAGE" ]]; then
    print_err "AppImage not found in any expected bundle directory. Build may have failed silently."
fi

SIZE_MB=$(du -m "$APPIMAGE" | cut -f1)
print_ok "AppImage: $APPIMAGE (${SIZE_MB} MB)"

# ── Step 9: Copy to dist/ (if orchestrated) ────────────────────────────────────
if [[ -n "$DIST_OUT" ]]; then
    mkdir -p "$DIST_OUT"
    DEST="$DIST_OUT/$(basename "$APPIMAGE")"
    cp "$APPIMAGE" "$DEST"
    chmod +x "$DEST"
    print_ok "Copied → $DEST"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║  AppImage Build Complete  ✓              ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  File : $APPIMAGE"
echo "  Size : ${SIZE_MB} MB"
echo ""
echo "  Run directly:"
echo "    chmod +x $APPIMAGE"
echo "    $APPIMAGE"
echo ""
exit 0
