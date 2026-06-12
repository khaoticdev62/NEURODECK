#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"

bash "$SCRIPT_DIR/install.sh" "${STEAMDECK_ARGS[@]}"
