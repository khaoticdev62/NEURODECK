#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

artifact=""
source_dir=""
while [[ ${#STEAMDECK_ARGS[@]} -gt 0 ]]; do
  case "${STEAMDECK_ARGS[0]}" in
    --artifact) artifact="${STEAMDECK_ARGS[1]:-}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:2}") ;;
    --source-dir) source_dir="${STEAMDECK_ARGS[1]:-}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:2}") ;;
    *) artifact="${STEAMDECK_ARGS[0]}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:1}") ;;
  esac
done

if [[ -z "$artifact" && -z "$source_dir" ]]; then
  artifact="$(steamdeck_find_artifact "${artifact:-}")" || true
fi

[[ -d "$MANIFEST_DIR" ]] || { steamdeck_write_report "validate-installer" "blocked" "Manifest directory missing." "$MANIFEST_DIR"; exit "$STEAMDECK_EXIT_BLOCKED"; }
[[ -f "$MANIFEST_DIR/runtime-manifest.json" ]] || { steamdeck_write_report "validate-installer" "blocked" "runtime-manifest.json missing." "$MANIFEST_DIR/runtime-manifest.json"; exit "$STEAMDECK_EXIT_BLOCKED"; }
[[ -f "$MANIFEST_DIR/feature-dependencies.json" ]] || { steamdeck_write_report "validate-installer" "blocked" "feature-dependencies.json missing." "$MANIFEST_DIR/feature-dependencies.json"; exit "$STEAMDECK_EXIT_BLOCKED"; }

if [[ -n "$artifact" ]]; then
  [[ -f "$artifact" ]] || { steamdeck_write_report "validate-installer" "blocked" "Artifact missing." "$artifact"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }
  if [[ "$artifact" == *.AppImage ]]; then
    file "$artifact" | grep -qi "ELF" || { steamdeck_write_report "validate-installer" "blocked" "Artifact is not an AppImage/ELF." "$artifact"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }
  fi
fi

if [[ -n "$source_dir" ]]; then
  [[ -d "$source_dir" ]] || { steamdeck_write_report "validate-installer" "blocked" "Portable source directory missing." "$source_dir"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }
fi

steamdeck_write_report "validate-installer" "pass" "Installer preflight passed." "artifact=${artifact:-none} source_dir=${source_dir:-none}"
