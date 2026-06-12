#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

windows_artifact=""
while [[ ${#STEAMDECK_ARGS[@]} -gt 0 ]]; do
  case "${STEAMDECK_ARGS[0]}" in
    --windows-artifact) windows_artifact="${STEAMDECK_ARGS[1]:-}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:2}") ;;
    *) windows_artifact="${STEAMDECK_ARGS[0]}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:1}") ;;
  esac
done

if [[ -z "$windows_artifact" ]]; then
  windows_artifact="$PROJECT_ROOT/dist-electron/win-unpacked"
fi

[[ -d "$windows_artifact" || -f "$windows_artifact" ]] || { steamdeck_write_report "validate-proton" "blocked" "Windows artifact missing." "$windows_artifact"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }

steam_root="${HOME}/.local/share/Steam"
compat_tools_root="$steam_root/steamapps/common"
proton_script="$(find "$compat_tools_root" -path "*Proton*/proton" 2>/dev/null | sort | tail -n 1 || true)"
steam_binary="$(command -v steam || true)"

if [[ -z "$steam_binary" || -z "$proton_script" ]]; then
  steamdeck_write_report "validate-proton" "not_available" "Steam or Proton not available." "steam=${steam_binary:-missing} proton=${proton_script:-missing}"
  exit "$STEAMDECK_EXIT_WARNING"
fi

compatdata_dir="${XDG_DATA_HOME:-$HOME/.local/share}/neurodeck/proton-compatdata"
steamdeck_require_writable_dir "$compatdata_dir"

exe_candidate="$windows_artifact/NEURODECK.exe"
if [[ ! -f "$exe_candidate" ]]; then
  exe_candidate="$(find "$windows_artifact" -maxdepth 3 -iname '*.exe' | head -n 1 || true)"
fi
[[ -f "$exe_candidate" ]] || { steamdeck_write_report "validate-proton" "blocked" "Windows executable missing." "$windows_artifact"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }

log_file="$REPORT_ROOT/validate-proton.log"
set +e
STEAM_COMPAT_CLIENT_INSTALL_PATH="$steam_root" \
STEAM_COMPAT_DATA_PATH="$compatdata_dir" \
timeout 120 "$proton_script" run "$exe_candidate" >"$log_file" 2>&1
rc=$?
set -e

if [[ "$rc" -eq 0 || "$rc" -eq 124 ]]; then
  steamdeck_write_report "validate-proton" "pass" "Proton launch attempted." "$log_file"
  exit "$STEAMDECK_EXIT_SUCCESS"
fi

steamdeck_write_report "validate-proton" "warning" "Proton launch returned a non-zero status." "$log_file"
exit "$STEAMDECK_EXIT_PROTON_FAILURE"
