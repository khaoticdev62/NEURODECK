#!/usr/bin/env bash
# Create a UI checkpoint: build, tag, and record metadata for rollback.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

FORCE=0
NAME=""
DESCRIPTION=""

usage() {
  echo "Usage: $0 [--force] [--name <name>] [--description <desc>]"
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --name) NAME="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
CURRENT_SHA="$(git rev-parse HEAD)"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"

if [ -z "$NAME" ]; then
  SAFE_BRANCH="$(echo "$CURRENT_BRANCH" | sed 's/[^a-zA-Z0-9_-]/-/g')"
  NAME="auto-${SAFE_BRANCH}-${TIMESTAMP}"
fi

TAG="ui-checkpoint-${NAME}"

# Branch validation
if [ "$FORCE" -eq 0 ]; then
  if [[ "$CURRENT_BRANCH" =~ ^(ui|feature|agent)/.+$ ]]; then
    echo "✅ Branch '$CURRENT_BRANCH' is allowed for UI checkpoints."
  elif [[ "$CURRENT_BRANCH" =~ ^(master|main)$ ]]; then
    echo "❌ UI checkpoints should not be created directly on $CURRENT_BRANCH."
    echo "   Create a ui/* or feature/* branch, or use --force."
    exit 1
  else
    echo "❌ Branch '$CURRENT_BRANCH' is not a recognized UI/feature branch."
    echo "   Allowed prefixes: ui/, feature/, agent/ (or use --force)."
    exit 1
  fi
fi

# Build
echo "Building frontend..."
npm run frontend:build

echo "Building main process..."
npm run build:main

# Compute build hash
BUILD_HASH="$(find frontend/dist electron/dist -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')"

# Create tag
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "❌ Tag $TAG already exists. Use a different --name."
  exit 1
fi

git tag -a "$TAG" -m "UI checkpoint: $NAME
Branch: $CURRENT_BRANCH
SHA: $CURRENT_SHA
Description: ${DESCRIPTION:-<none>}"

echo "✅ Created tag $TAG"

# Update manifest
MANIFEST="ui-checkpoints.json"
[ -f "$MANIFEST" ] || echo '[]' > "$MANIFEST"

node - "$MANIFEST" "$TAG" "$CURRENT_SHA" "$CURRENT_BRANCH" "$TIMESTAMP" "$DESCRIPTION" "$BUILD_HASH" <<'EOF'
const fs = require('fs');
const [file, tag, sha, branch, timestamp, description, buildHash] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = {
  tag,
  sha,
  branch,
  timestamp,
  description: description || '',
  protectedPaths: [
    'frontend/src/**/*.css',
    'frontend/src/**/*.tsx',
    'frontend/src/**/*.ts',
    'electron/**/*.css',
    'electron/**/*.js',
    'frontend/public/**/*'
  ],
  buildHash,
  rolledBack: false
};
data.push(entry);
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`Updated ${file}`);
EOF

echo ""
echo "UI checkpoint created: $TAG"
echo "  SHA: $CURRENT_SHA"
echo "  Branch: $CURRENT_BRANCH"
echo "  Build hash: $BUILD_HASH"
echo ""
echo "Rollback commands:"
echo "  npm run rollback:ui:preview $TAG"
echo "  npm run rollback:ui:apply $TAG"
