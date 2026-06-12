#!/usr/bin/env bash

set -euo pipefail

XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
launcher="$XDG_DATA_HOME/neurodeck/bin/neurodeck-gamemode"

if [[ -x "$launcher" ]]; then
  exec "$launcher" "$@"
fi

echo "NEURODECK Game Mode launcher is not installed yet. Run: bash ./install.sh" >&2
exit 1
