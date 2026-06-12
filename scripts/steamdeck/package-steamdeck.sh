#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"

target="all"
while [[ ${#STEAMDECK_ARGS[@]} -gt 0 ]]; do
  case "${STEAMDECK_ARGS[0]}" in
    --target) target="${STEAMDECK_ARGS[1]:-all}"; STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:2}") ;;
    *) STEAMDECK_ARGS=("${STEAMDECK_ARGS[@]:1}") ;;
  esac
done

version="$(node -p "require(process.argv[1]).version" "$PROJECT_ROOT/package.json")"
commit="$(git rev-parse --short HEAD 2>/dev/null || echo workspace)"
build_date="$(steamdeck_timestamp)"

steamdeck_run bash "$SCRIPT_DIR/check-feature-dependencies.sh"

node - "$MANIFEST_DIR/runtime-manifest.json" "$version" "$commit" "$build_date" <<'NODE'
const fs = require("fs");
const [file, version, commit, buildDate] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
manifest.version = version;
manifest.buildId = `${version}-${commit}`;
manifest.commit = commit;
manifest.buildDate = buildDate;
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
NODE

if [[ "$target" == "all" || "$target" == "linux" ]]; then
  steamdeck_require_linux
  steamdeck_run mkdir -p "$PROJECT_ROOT/dist/steamdeck"
  steamdeck_run npm run frontend:build
  steamdeck_run npm run sidecar:build
  steamdeck_run npm run build:main
  steamdeck_run npx electron-builder --config electron-builder.yml --projectDir . --linux

  linux_portable_dir="$PROJECT_ROOT/dist/steamdeck/neurodeck_${version}_linux_portable"
  steamdeck_run rm -rf "$linux_portable_dir"
  steamdeck_run mkdir -p "$linux_portable_dir/app" "$linux_portable_dir/scripts/steamdeck" "$linux_portable_dir/packaging/steamdeck"
  steamdeck_run cp -R "$PROJECT_ROOT/dist-electron/linux-unpacked/." "$linux_portable_dir/app/"
  steamdeck_run cp "$SCRIPT_DIR"/*.sh "$linux_portable_dir/scripts/steamdeck/"
  steamdeck_run cp "$MANIFEST_DIR"/*.json "$linux_portable_dir/packaging/steamdeck/"
  steamdeck_run cp "$MANIFEST_DIR"/checksums.sha256 "$linux_portable_dir/packaging/steamdeck/"
  steamdeck_run cp "$MANIFEST_DIR"/README_STEAM_DECK_INSTALL.md "$linux_portable_dir/"
  steamdeck_run tar -czf "$PROJECT_ROOT/dist/steamdeck/neurodeck_${version}_linux_portable.tar.gz" -C "$PROJECT_ROOT/dist/steamdeck" "neurodeck_${version}_linux_portable"
fi

if [[ "$target" == "all" || "$target" == "windows" ]]; then
  if [[ "${OS:-}" == "Windows_NT" || "$OSTYPE" == msys* || "$OSTYPE" == cygwin* ]]; then
    steamdeck_run npm run frontend:build
    steamdeck_run npm run sidecar:build
    steamdeck_run npm run build:main
    steamdeck_run npx electron-builder --config electron-builder.yml --projectDir . --win
  fi
fi

(
  cd "$PROJECT_ROOT"
  mkdir -p "$MANIFEST_DIR"
  find dist -maxdepth 3 -type f \( -name '*.AppImage' -o -name '*.exe' -o -name '*.zip' -o -name '*.tar.gz' -o -name '*.json' \) -print0 2>/dev/null \
    | xargs -0 sha256sum > "$MANIFEST_DIR/checksums.sha256" 2>/dev/null || true
)

steamdeck_write_report "package-steamdeck" "pass" "Steam Deck package staging complete." "$PROJECT_ROOT/dist/steamdeck"
