#!/usr/bin/env bash

set -euo pipefail

STEAMDECK_EXIT_SUCCESS=0
STEAMDECK_EXIT_WARNING=1
STEAMDECK_EXIT_BLOCKED=2
STEAMDECK_EXIT_UNSUPPORTED_OS=3
STEAMDECK_EXIT_MISSING_ARTIFACT=4
STEAMDECK_EXIT_CHECKSUM_FAILURE=5
STEAMDECK_EXIT_PERMISSION_FAILURE=6
STEAMDECK_EXIT_RUNTIME_FAILURE=7
STEAMDECK_EXIT_PROTON_FAILURE=8

STEAMDECK_DRY_RUN=0
STEAMDECK_VERBOSE=0
STEAMDECK_JSON=0
STEAMDECK_ARGS=()

steamdeck_init() {
  local source_file="${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}"
  SCRIPT_DIR="$(cd "$(dirname "$source_file")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  PACKAGE_ROOT="$PROJECT_ROOT"
  MANIFEST_DIR="$PACKAGE_ROOT/packaging/steamdeck"
  REPORT_ROOT="${TMPDIR:-/tmp}/neurodeck-steamdeck-reports"

  XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
  XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
  XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
  XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"

  NEURODECK_INSTALL_APP_DIR="$XDG_DATA_HOME/neurodeck/app"
  NEURODECK_INSTALL_BIN_DIR="$XDG_DATA_HOME/neurodeck/bin"
  NEURODECK_INSTALL_PLUGIN_DIR="$XDG_DATA_HOME/neurodeck/plugins"
  NEURODECK_CONFIG_DIR="$XDG_CONFIG_HOME/neurodeck"
  NEURODECK_LOG_DIR="$XDG_STATE_HOME/neurodeck/logs"
  NEURODECK_CACHE_DIR="$XDG_CACHE_HOME/neurodeck"
  NEURODECK_ENV_FILE="$NEURODECK_CONFIG_DIR/env"

  mkdir -p "$REPORT_ROOT"
}

steamdeck_parse_common_args() {
  STEAMDECK_ARGS=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) STEAMDECK_DRY_RUN=1 ;;
      --verbose) STEAMDECK_VERBOSE=1 ;;
      --json) STEAMDECK_JSON=1 ;;
      *) STEAMDECK_ARGS+=("$1") ;;
    esac
    shift
  done
}

steamdeck_log() {
  local level="$1"
  shift
  if [[ "$STEAMDECK_JSON" -eq 1 && "$level" == "INFO" ]]; then
    return
  fi
  printf '[%s] %s\n' "$level" "$*" >&2
}

steamdeck_info() { steamdeck_log INFO "$@"; }
steamdeck_warn() { steamdeck_log WARN "$@"; }
steamdeck_error() { steamdeck_log ERROR "$@"; }

steamdeck_run() {
  if [[ "$STEAMDECK_DRY_RUN" -eq 1 ]]; then
    steamdeck_info "dry-run: $*"
    return 0
  fi
  if [[ "$STEAMDECK_VERBOSE" -eq 1 ]]; then
    steamdeck_info "run: $*"
  fi
  "$@"
}

steamdeck_require_linux() {
  if [[ "${OSTYPE:-}" != linux* ]]; then
    steamdeck_error "unsupported host OS: ${OSTYPE:-unknown}"
    exit "$STEAMDECK_EXIT_UNSUPPORTED_OS"
  fi
}

steamdeck_require_writable_dir() {
  local dir="$1"
  mkdir -p "$dir" 2>/dev/null || {
    steamdeck_error "cannot create directory: $dir"
    exit "$STEAMDECK_EXIT_PERMISSION_FAILURE"
  }
  local probe="$dir/.write-test.$$"
  : > "$probe" 2>/dev/null || {
    steamdeck_error "directory is not writable: $dir"
    exit "$STEAMDECK_EXIT_PERMISSION_FAILURE"
  }
  rm -f "$probe"
}

steamdeck_manifest_value() {
  local file="$1"
  local keypath="$2"
  node - "$file" "$keypath" <<'NODE'
const fs = require("fs");
const [file, keypath] = process.argv.slice(2);
let value = JSON.parse(fs.readFileSync(file, "utf8"));
for (const key of keypath.split(".")) {
  value = value[key];
}
if (typeof value === "object") {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
NODE
}

steamdeck_escape_json() {
  local value="${1//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  printf '%s' "$value"
}

steamdeck_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

steamdeck_write_report() {
  local stem="$1"
  local status="$2"
  local summary="$3"
  local details="$4"
  local report_dir="${5:-$REPORT_ROOT}"
  mkdir -p "$report_dir"

  local json_file="$report_dir/${stem}.json"
  local md_file="$report_dir/${stem}.md"

  cat > "$json_file" <<JSON
{
  "tool": "$(steamdeck_escape_json "$stem")",
  "status": "$(steamdeck_escape_json "$status")",
  "summary": "$(steamdeck_escape_json "$summary")",
  "details": "$(steamdeck_escape_json "$details")",
  "generatedAt": "$(steamdeck_timestamp)"
}
JSON

  cat > "$md_file" <<MD
# ${stem}

- Status: \`${status}\`
- Summary: ${summary}
- Details: ${details}
- Generated: $(steamdeck_timestamp)
MD

  if [[ "$STEAMDECK_JSON" -eq 1 ]]; then
    cat "$json_file"
  else
    steamdeck_info "report: $json_file"
    steamdeck_info "report: $md_file"
  fi
}

steamdeck_find_artifact() {
  local hint="${1:-}"
  if [[ -n "$hint" && -e "$hint" ]]; then
    printf '%s\n' "$hint"
    return 0
  fi

  local candidates=(
    "$PROJECT_ROOT/dist-electron/NEURODECK_"*.AppImage
    "$PROJECT_ROOT/dist-electron/neurodeck_"*.AppImage
    "$PROJECT_ROOT/dist/steamdeck/"*.AppImage
    "$PWD/"*.AppImage
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -e "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

steamdeck_launcher_target() {
  if [[ -x "$NEURODECK_INSTALL_BIN_DIR/neurodeck" ]]; then
    printf '%s\n' "$NEURODECK_INSTALL_BIN_DIR/neurodeck"
    return 0
  fi
  if [[ -x "$NEURODECK_INSTALL_APP_DIR/NEURODECK.AppImage" ]]; then
    printf '%s\n' "$NEURODECK_INSTALL_APP_DIR/NEURODECK.AppImage"
    return 0
  fi
  return 1
}
