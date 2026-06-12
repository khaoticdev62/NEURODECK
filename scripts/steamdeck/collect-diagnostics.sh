#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"

bundle_dir="$REPORT_ROOT/diagnostics-$(date +%Y%m%d%H%M%S)"
mkdir -p "$bundle_dir"

{
  echo "timestamp=$(steamdeck_timestamp)"
  echo "platform=$(uname -a)"
  echo "launcher=$(steamdeck_launcher_target 2>/dev/null || echo missing)"
  echo "log_dir=$NEURODECK_LOG_DIR"
  echo "config_dir=$NEURODECK_CONFIG_DIR"
} > "$bundle_dir/summary.txt"

cp "$MANIFEST_DIR"/runtime-manifest.json "$bundle_dir/" 2>/dev/null || true
cp "$MANIFEST_DIR"/dependencies.json "$bundle_dir/" 2>/dev/null || true
cp "$MANIFEST_DIR"/feature-dependencies.json "$bundle_dir/" 2>/dev/null || true
cp "$MANIFEST_DIR"/file-manifest.json "$bundle_dir/" 2>/dev/null || true
cp "$MANIFEST_DIR"/checksums.sha256 "$bundle_dir/" 2>/dev/null || true
cp -R "$NEURODECK_LOG_DIR"/. "$bundle_dir/logs/" 2>/dev/null || true

steamdeck_write_report "collect-diagnostics" "pass" "Diagnostics bundle collected." "$bundle_dir"
