#!/usr/bin/env bash
# Fetch the three brand families as woff2 into ./files/
# Requires: curl. Run from the fonts/ directory.
set -euo pipefail
mkdir -p files
cd files

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# Google Fonts css2 endpoint serves woff2 when given a modern UA.
# We grab each family's CSS, extract the woff2 URLs, and download them.
fetch () {
  local name="$1" url="$2"
  echo "-> $name"
  curl -sL -A "$UA" "$url" \
    | grep -oE "https://[^)]+\.woff2" \
    | sort -u \
    | while read -r f; do
        out="$(echo "$name" | tr '[:upper:] ' '[:lower:]-')-$(basename "$f")"
        curl -sL -A "$UA" "$f" -o "$out"
        echo "  $out"
      done
}

fetch "Orbitron"       "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
fetch "ShareTechMono"  "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
fetch "Exo2"           "https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600&display=swap"

echo "Done. woff2 files are in fonts/files/"
echo "Note: confirm fonts.css @font-face src paths match the downloaded filenames."
