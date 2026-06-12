#!/usr/bin/env bash

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"
steamdeck_init
steamdeck_parse_common_args "$@"

node - "$PROJECT_ROOT/frontend/src/react/features" "$MANIFEST_DIR/feature-dependencies.json" <<'NODE'
const fs = require("fs");
const path = require("path");

const [featuresDir, manifestPath] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const declared = manifest.features || {};
const missing = [];

for (const entry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const record = declared[entry.name];
  if (!record) {
    missing.push(entry.name);
    continue;
  }
  for (const key of ["dependencies", "runtimeChecks", "installerNotes", "validationRefs"]) {
    if (!Array.isArray(record[key]) || record[key].length === 0) {
      missing.push(`${entry.name}:${key}`);
    }
  }
}

if (missing.length) {
  process.stderr.write(`${missing.join("\n")}\n`);
  process.exit(1);
}
NODE
