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

if [[ -z "$artifact" && -z "$source_dir" ]]; then
  steamdeck_error "no install source provided"
  exit "$STEAMDECK_EXIT_MISSING_ARTIFACT"
fi

steamdeck_require_writable_dir "$NEURODECK_INSTALL_APP_DIR"
steamdeck_require_writable_dir "$NEURODECK_INSTALL_BIN_DIR"
steamdeck_require_writable_dir "$NEURODECK_INSTALL_PLUGIN_DIR"
steamdeck_require_writable_dir "$NEURODECK_CONFIG_DIR"
steamdeck_require_writable_dir "$NEURODECK_LOG_DIR"
steamdeck_require_writable_dir "$NEURODECK_CACHE_DIR"

if [[ ! -f "$NEURODECK_CONFIG_DIR/llm-term.toml" ]]; then
  cat > "$NEURODECK_CONFIG_DIR/llm-term.toml" <<'EOF'
[llm]
provider = "gemini"
model = "gemini-2.0-flash"

[ui]
theme = "cyberpunk"
persona = "neurodeck"
EOF
fi

if [[ ! -f "$NEURODECK_ENV_FILE" ]]; then
  cat > "$NEURODECK_ENV_FILE" <<'EOF'
# Optional runtime overrides
# GEMINI_API_KEY=
# NEURODECK_SAFE_MODE=1
# NEURODECK_PORT=9477
EOF
  chmod 600 "$NEURODECK_ENV_FILE"
fi

validate_args=()
if [[ -n "$artifact" ]]; then
  validate_args+=(--artifact "$artifact")
fi
if [[ -n "$source_dir" ]]; then
  validate_args+=(--source-dir "$source_dir")
fi
if [[ "$STEAMDECK_JSON" -eq 1 ]]; then
  validate_args+=(--json)
fi

bash "$SCRIPT_DIR/validate-installer.sh" "${validate_args[@]}" >/dev/null || {
  steamdeck_error "installer validation failed"
  exit "$STEAMDECK_EXIT_BLOCKED"
}

if [[ -n "$source_dir" ]]; then
  steamdeck_run cp -R "$source_dir"/. "$NEURODECK_INSTALL_APP_DIR/"
else
  steamdeck_run cp "$artifact" "$NEURODECK_INSTALL_APP_DIR/NEURODECK.AppImage"
  steamdeck_run chmod +x "$NEURODECK_INSTALL_APP_DIR/NEURODECK.AppImage"
fi

steamdeck_run cp "$MANIFEST_DIR"/*.json "$NEURODECK_INSTALL_APP_DIR/" 2>/dev/null || true
steamdeck_run cp "$MANIFEST_DIR"/checksums.sha256 "$NEURODECK_INSTALL_APP_DIR/" 2>/dev/null || true

cat > "$NEURODECK_INSTALL_BIN_DIR/neurodeck" <<EOF
#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="${NEURODECK_INSTALL_APP_DIR}"
ENV_FILE="${NEURODECK_ENV_FILE}"
LOG_DIR="${NEURODECK_LOG_DIR}"
mkdir -p "\$LOG_DIR"
[[ -f "\$ENV_FILE" ]] && set -a && source "\$ENV_FILE" && set +a
export APPIMAGE_EXTRACT_AND_RUN="\${APPIMAGE_EXTRACT_AND_RUN:-1}"
export NEURODECK_CONFIG_PATH="\${NEURODECK_CONFIG_PATH:-${NEURODECK_CONFIG_DIR}/llm-term.toml}"
if [[ -n "\${WAYLAND_DISPLAY:-}" || -n "\${GAMESCOPE_WAYLAND_DISPLAY:-}" ]]; then
  export GDK_BACKEND="\${GDK_BACKEND:-wayland,x11}"
else
  export GDK_BACKEND="\${GDK_BACKEND:-x11}"
fi
cd "\$APP_ROOT"
if [[ -x "\$APP_ROOT/NEURODECK.AppImage" ]]; then
  exec "\$APP_ROOT/NEURODECK.AppImage" "\$@" >> "\$LOG_DIR/launcher.log" 2>&1
fi
if [[ -x "\$APP_ROOT/NEURODECK" ]]; then
  exec "\$APP_ROOT/NEURODECK" "\$@" >> "\$LOG_DIR/launcher.log" 2>&1
fi
echo "NEURODECK launcher target missing in \$APP_ROOT" >&2
exit 1
EOF

cat > "$NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode" <<EOF
#!/usr/bin/env bash
set -euo pipefail
if command -v gamescope >/dev/null 2>&1; then
  exec gamescope -W 1280 -H 800 -f -- "${NEURODECK_INSTALL_BIN_DIR}/neurodeck" "\$@"
fi
exec "${NEURODECK_INSTALL_BIN_DIR}/neurodeck" "\$@"
EOF

steamdeck_run chmod +x "$NEURODECK_INSTALL_BIN_DIR/neurodeck" "$NEURODECK_INSTALL_BIN_DIR/neurodeck-gamemode"

entry_args=()
if [[ "$STEAMDECK_JSON" -eq 1 ]]; then
  entry_args+=(--json)
fi

bash "$SCRIPT_DIR/create-desktop-entry.sh" "${entry_args[@]}" >/dev/null
bash "$SCRIPT_DIR/create-game-mode-shortcut.sh" "${entry_args[@]}" >/dev/null

steamdeck_write_report "install" "pass" "NEURODECK installed." "App: $NEURODECK_INSTALL_APP_DIR | Launchers: $NEURODECK_INSTALL_BIN_DIR"
