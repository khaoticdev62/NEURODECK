#!/bin/bash
# Regenerate cargo-sources.json for offline Flatpak builds.
# Run this whenever Cargo.lock changes, then commit cargo-sources.json.
# Requires: pip install aiohttp tomlkit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v python3 &>/dev/null; then
    echo "python3 required but not found"
    exit 1
fi

TOOL="$SCRIPT_DIR/flatpak-cargo-generator.py"
if [ ! -f "$TOOL" ]; then
    echo "Downloading flatpak-cargo-generator.py from flatpak-builder-tools..."
    curl -sSfL \
        https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py \
        -o "$TOOL"
    chmod +x "$TOOL"
fi

echo "Generating cargo-sources.json from Cargo.lock..."
python3 "$TOOL" "$REPO_ROOT/src-tauri/Cargo.lock" -o "$SCRIPT_DIR/cargo-sources.json"

echo "✓ cargo-sources.json updated."
echo "Commit it alongside Cargo.lock changes:"
echo "  git add flatpak/cargo-sources.json src-tauri/Cargo.lock"
echo "  git commit -m 'chore: update cargo sources for flatpak offline builds'"
