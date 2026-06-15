#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"
steamdeck_require_linux

binary=""
while [[ ${#STEAMDECK_ARGS[@]} -gt 0 ]]; do
  case "${STEAMDECK_ARGS[0]}" in
    --binary) binary="${STEAMDECK_ARGS[1]:-}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:2}") ;;
    *) binary="${STEAMDECK_ARGS[0]}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:1}") ;;
  esac
done

if [[ -z "$binary" ]]; then
  binary="$(steamdeck_launcher_target)" || binary="$NEURODECK_INSTALL_BIN_DIR/neurodeck"
fi

# Allow Electron executableName override: fall back to lowercase neurodeck
if [[ ! -e "$binary" ]]; then
  fallback_binary="${binary%/*}/neurodeck"
  if [[ -e "$fallback_binary" ]]; then
    binary="$fallback_binary"
  fi
fi

# Artifact upload/download may strip the executable bit; restore it.
if [[ -f "$binary" && ! -x "$binary" ]]; then
  chmod +x "$binary" || true
fi

[[ -x "$binary" ]] || { steamdeck_write_report "validate-runtime" "blocked" "Launcher not found or not executable." "$binary"; exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"; }

log_file="$REPORT_ROOT/validate-runtime.log"
cmd=("$binary" --self-test --steam-deck --exit-after-self-test)
if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]] && command -v xvfb-run >/dev/null 2>&1; then
  cmd=(xvfb-run -a "${cmd[@]}")
fi

set +e
"${cmd[@]}" >"$log_file" 2>&1
rc=$?
set -e

status="pass"
summary="Runtime self-test passed."
if [[ "$rc" -ne 0 ]]; then
  status="blocked"
  summary="Runtime self-test failed."
fi

steamdeck_write_report "validate-runtime" "$status" "$summary" "$log_file"
exit $([[ "$rc" -eq 0 ]] && echo "$STEAMDECK_EXIT_SUCCESS" || echo "$STEAMDECK_EXIT_RUNTIME_FAILURE")
