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

# ── Self-Healing: WSL native filesystem redirection ───────────────────────────
# Building inside a WSL directory mounted on Windows (e.g. /mnt/c/...) is 10x slower
# due to drvfs file system bridge overhead. We redirect the workspace to WSL ext4.
NATIVE_WORKSPACE="$HOME/neurodeck-build"
if [[ "$PROJECT_ROOT" == /mnt/* && "${ND_WSL_NATIVE:-0}" != "1" ]]; then
    print_step "Detected Windows mount ($PROJECT_ROOT). Building on /mnt/ is extremely slow."
    print_step "Redirecting build to WSL native ext4 filesystem at $NATIVE_WORKSPACE..."

    # Ensure rsync is installed for fast sync
    if ! command -v rsync &>/dev/null; then
        print_warn "rsync not found. Installing..."
        sudo -n apt-get update -qq && sudo -n apt-get install -y -qq rsync || true
    fi

    # Sync workspace (excluding large built items and VCS history)
    mkdir -p "$NATIVE_WORKSPACE"
    print_step "Syncing files (excluding target/ and node_modules/)..."
    rsync -a --delete \
        --exclude='target/' \
        --exclude='src-tauri/target/' \
        --exclude='node_modules/' \
        --exclude='frontend/node_modules/' \
        --exclude='dist/' \
        --exclude='.git/' \
        --exclude='.loose/' \
        "$PROJECT_ROOT/" "$NATIVE_WORKSPACE/"

    print_ok "Workspace synced successfully."
    print_step "Rerunning script natively in WSL..."

    export ND_WSL_NATIVE=1
    export ORIGINAL_PROJECT_ROOT="$PROJECT_ROOT"
    cd "$NATIVE_WORKSPACE"
    exec bash scripts/shell/build_appimage.sh "$@"
fi

# ── Self-Healing: Apt locks wait helper ────────────────────────────────────────
wait_for_apt_locks() {
    local count=0
    while fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/lib/dpkg/lock >/dev/null 2>&1; do
        if [ $count -eq 0 ]; then
            print_warn "Apt/Dpkg is locked by another process. Waiting for lock release..."
        fi
        sleep 2
        count=$((count+1))
        if [ $count -gt 30 ]; then
            print_warn "Apt lock timed out after 60s. Attempting to force release..."
            sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/lib/dpkg/lock
            sudo dpkg --configure -a
            break
        fi
    done
}

# ── Step 1: Base system packages ───────────────────────────────────────────────
if [[ "$SKIP_DEPS" != "1" ]]; then
    # Check if packages are already installed before running apt update/install
    BASE_PKGS=(curl ca-certificates gnupg build-essential git)
    MISSING_BASE=()
    for pkg in "${BASE_PKGS[@]}"; do
        dpkg -s "$pkg" &>/dev/null || MISSING_BASE+=("$pkg")
    done

    if [[ "${#MISSING_BASE[@]}" -gt 0 ]]; then
        print_step "Installing missing base tools: ${MISSING_BASE[*]}..."
        wait_for_apt_locks
        sudo -n apt-get update -qq 2>/dev/null || true
        sudo -n apt-get install -y -qq "${MISSING_BASE[@]}" >/dev/null 2>&1 || true
        print_ok "Base tools ready"
    else
        print_ok "Base tools already installed"
    fi
else
    print_ok "Dep install skipped (NEURODECK_SKIP_DEPS=1)"
fi

# ── Step 2: Node.js ────────────────────────────────────────────────────────────
print_step "Checking Node.js..."
if ! command -v node &>/dev/null; then
    print_warn "Node.js not found — installing Node 20..."
    wait_for_apt_locks
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi

NODE_VER_MAJOR=$(node --version | sed 's/v//;s/\..*//')
if [[ "$NODE_VER_MAJOR" -lt 20 ]]; then
    print_warn "Node $(node --version) is below v20 — upgrading..."
    wait_for_apt_locks
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -n bash - >/dev/null 2>&1
    sudo -n apt-get install -y -qq nodejs >/dev/null 2>&1
fi
print_ok "Node $(node --version)"

# ── Step 3: Rust / Cargo ───────────────────────────────────────────────────────
print_step "Checking Rust toolchain..."
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"

if ! command -v cargo &>/dev/null; then
    print_warn "Rust not found — installing via rustup..."
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
        print_warn "Installing missing dependencies: ${MISSING[*]}"
        wait_for_apt_locks
        sudo -n apt-get install -y "${MISSING[@]}" \
            || print_err "apt-get failed to install dependencies. Check locks."
    fi
    print_ok "System dependencies satisfied"
fi

# ── Step 5: JS Dependencies Caching ────────────────────────────────────────────
print_step "Checking JS dependencies..."
cd "$PROJECT_ROOT"
LOCK_HASH=""
if [[ -f "package-lock.json" ]]; then
    if command -v md5sum &>/dev/null; then
        LOCK_HASH=$(md5sum package-lock.json | awk '{print $1}')
    elif command -v shasum &>/dev/null; then
        LOCK_HASH=$(shasum -a 256 package-lock.json | awk '{print $1}')
    fi
fi

SKIP_NPM_CI=0
if [[ -d "node_modules" && -n "$LOCK_HASH" && -f ".package-lock.hash" ]]; then
    LAST_HASH=$(cat .package-lock.hash)
    if [[ "$LOCK_HASH" == "$LAST_HASH" ]]; then
        SKIP_NPM_CI=1
    fi
fi

if [[ "$SKIP_NPM_CI" == "1" ]]; then
    print_ok "JS dependencies up to date (cached)"
else
    print_step "Installing JS dependencies (npm ci)..."
    npm ci --prefer-offline
    if [[ -n "$LOCK_HASH" ]]; then
        echo "$LOCK_HASH" > .package-lock.hash
    fi
    print_ok "npm ci done"
fi

# ── Step 6: Compiling Tauri AppImage ──────────────────────────────────────────
# Note: We skip the manual "npm run frontend build" step here because Tauri's
# beforeBuildCommand in tauri.conf.json already triggers the Vite build!
print_step "Compiling Tauri AppImage (Rust + bundler)..."
print_info "Using $CARGO_JOBS parallel jobs"
RUSTFLAGS="-C target-cpu=native" npx @tauri-apps/cli build --bundles appimage
print_ok "Tauri build finished"

# ── Step 7: Locate output ──────────────────────────────────────────────────────
APPIMAGE=""
BUNDLE_SEARCH_DIRS=(
    "$PROJECT_ROOT/src-tauri/target/release/bundle/appimage"
    "$PROJECT_ROOT/target/release/bundle/appimage"
)

for dir in "${BUNDLE_SEARCH_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        APPIMAGE=$(find "$dir" -maxdepth 1 -name "*.AppImage" | sort | tail -n1)
        [[ -n "$APPIMAGE" ]] && break
    fi
done

if [[ -z "$APPIMAGE" ]]; then
    print_err "AppImage not found in bundle directories."
fi

SIZE_MB=$(du -m "$APPIMAGE" | cut -f1)
print_ok "AppImage generated: $APPIMAGE (${SIZE_MB} MB)"

# ── Step 8: Copy back to host and output dir ──────────────────────────────────
# Copy to orchestrated DIST_OUT
if [[ -n "$DIST_OUT" ]]; then
    mkdir -p "$DIST_OUT"
    DEST="$DIST_OUT/$(basename "$APPIMAGE")"
    cp "$APPIMAGE" "$DEST"
    chmod +x "$DEST"
    print_ok "Copied → $DEST"
fi

# If we ran natively in WSL redirected path, we must copy the generated AppImage
# back to the Windows host's bundle folder so that build.ps1 can find it there.
if [[ "${ND_WSL_NATIVE:-0}" == "1" && -n "${ORIGINAL_PROJECT_ROOT:-}" ]]; then
    HOST_BUNDLE_DIR="$ORIGINAL_PROJECT_ROOT/src-tauri/target/release/bundle/appimage"
    mkdir -p "$HOST_BUNDLE_DIR"
    cp "$APPIMAGE" "$HOST_BUNDLE_DIR/$(basename "$APPIMAGE")"
    print_ok "Copied back to host bundle path → $HOST_BUNDLE_DIR"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║  AppImage Build Complete  ✓              ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════╝${NC}"
echo ""
exit 0
