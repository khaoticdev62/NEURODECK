#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_TAURI="$PROJECT_ROOT/src-tauri"
TARGET_DIR="$SRC_TAURI/target/release"

echo "Building Rust sidecar..."
cd "$SRC_TAURI"
cargo build --release

BINARY_NAME="app"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    BINARY_NAME="app.exe"
fi

BINARY_PATH="$TARGET_DIR/$BINARY_NAME"
if [[ ! -f "$BINARY_PATH" ]]; then
    echo "Build failed: $BINARY_PATH not found"
    exit 1
fi

echo "Sidecar built successfully: $BINARY_PATH"
