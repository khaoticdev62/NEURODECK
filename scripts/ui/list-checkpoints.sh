#!/usr/bin/env bash
# Pretty-print recorded UI checkpoints.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

MANIFEST="ui-checkpoints.json"

if [ ! -f "$MANIFEST" ]; then
  echo "No UI checkpoints recorded yet."
  echo "Create one with: npm run checkpoint:ui"
  exit 0
fi

node - "$MANIFEST" <<'EOF'
const fs = require('fs');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (data.length === 0) {
  console.log('No UI checkpoints recorded yet.');
  process.exit(0);
}

console.log('| # | Tag | Branch | Timestamp | Rolled back | Rollback command |');
console.log('|---|-----|--------|-----------|-------------|------------------|');

data.forEach((entry, index) => {
  const tag = entry.tag;
  const branch = entry.branch || '-';
  const ts = entry.timestamp || '-';
  const rolled = entry.rolledBack ? 'Yes' : 'No';
  const cmd = `npm run rollback:ui:preview ${tag}`;
  console.log(`| ${index + 1} | ${tag} | ${branch} | ${ts} | ${rolled} | \`${cmd}\` |`);
});
EOF
