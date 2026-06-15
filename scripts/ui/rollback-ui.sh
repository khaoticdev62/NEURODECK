#!/usr/bin/env bash
# Roll back UI changes to a recorded checkpoint.
# Safety: never touches ~/.config/neurodeck/ user data.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

MODE="${1:-soft}"
INPUT="${2:-}"

MANIFEST="ui-checkpoints.json"
usage() {
  echo "Usage:"
  echo "  $0 soft <tag|name>      Show diff stats (default, non-destructive)"
  echo "  $0 preview <tag|name>   Build checkpoint and compare outputs (non-destructive)"
  echo "  $0 apply <tag|name>     Reset protected paths to checkpoint and rebuild"
  echo "  $0 latest               Use the most recent non-rolled-back checkpoint"
  exit 1
}

if [ -z "$INPUT" ] && [ "$MODE" != "latest" ]; then
  usage
fi

if [ ! -f "$MANIFEST" ]; then
  echo "❌ $MANIFEST not found. Create a checkpoint first with: npm run checkpoint:ui"
  exit 1
fi

# Resolve tag
if [ "$MODE" = "latest" ] || [ "$INPUT" = "latest" ]; then
  TAG="$(node -e "
    const data = require('./$MANIFEST');
    const latest = data.filter(e => !e.rolledBack).pop();
    if (!latest) { console.error('No non-rolled-back checkpoints found.'); process.exit(1); }
    console.log(latest.tag);
  ")"
  MODE="${1:-soft}"
  if [ "$MODE" = "latest" ]; then MODE="soft"; fi
else
  TAG="$INPUT"
  # Allow passing checkpoint name without prefix
  if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    if git rev-parse "ui-checkpoint-$TAG" >/dev/null 2>&1; then
      TAG="ui-checkpoint-$TAG"
    fi
  fi
fi

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "❌ Checkpoint tag '$TAG' not found."
  exit 1
fi

SHA="$(git rev-parse "$TAG")"
echo "Resolved checkpoint: $TAG ($SHA)"

# Load protected paths from manifest
PROTECTED_PATHS="$(node -e "
  const data = require('./$MANIFEST');
  const entry = data.find(e => e.tag === '$TAG');
  if (!entry) { console.error('Checkpoint not recorded in $MANIFEST'); process.exit(1); }
  console.log((entry.protectedPaths || []).join('\\n'));
")"

case "$MODE" in
  soft)
    echo ""
    echo "Files that would be reset (diff $TAG..HEAD for protected paths):"
    echo "$PROTECTED_PATHS" | while read -r pattern; do
      [ -n "$pattern" ] && git diff "$TAG"..HEAD --stat -- "$pattern" || true
    done
    echo ""
    echo "This was a non-destructive preview. Run '$0 apply $TAG' to apply the rollback."
    ;;

  preview)
    echo ""
    echo "Building current state..."
    npm run frontend:build >/dev/null 2>&1
    npm run build:main >/dev/null 2>&1
    CURRENT_HASH="$(find frontend/dist electron/dist -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')"

    echo "Building checkpoint $TAG in temporary worktree..."
    WORKTREE="$(mktemp -d)"
    git worktree add --detach "$WORKTREE" "$TAG"
    (
      cd "$WORKTREE"
      npm ci >/dev/null 2>&1
      npm run frontend:build >/dev/null 2>&1
      npm run build:main >/dev/null 2>&1
    )
    CHECKPOINT_HASH="$(find "$WORKTREE/frontend/dist" "$WORKTREE/electron/dist" -type f -exec sha256sum {} \; 2>/dev/null | sort | sha256sum | awk '{print $1}')"
    git worktree remove "$WORKTREE" --force

    echo ""
    echo "Current build hash: $CURRENT_HASH"
    echo "Checkpoint hash:    $CHECKPOINT_HASH"
    if [ "$CURRENT_HASH" = "$CHECKPOINT_HASH" ]; then
      echo "✅ Build outputs are identical."
    else
      echo "⚠️ Build outputs differ. Applying rollback will reset protected paths and rebuild."
    fi
    ;;

  apply)
    echo ""
    echo "⚠️ This will reset protected UI paths to $TAG and rebuild."
    read -p "Continue? [y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "Aborted."
      exit 0
    fi

    # Stash current changes
    STASHED=0
    if ! git diff --quiet || ! git diff --cached --quiet; then
      git stash push -m "rollback-ui-stash-before-$TAG"
      STASHED=1
      echo "✅ Stashed current changes."
    fi

    # Reset protected paths
    echo "$PROTECTED_PATHS" | while read -r pattern; do
      if [ -n "$pattern" ]; then
        git checkout "$TAG" -- $pattern || true
      fi
    done

    echo "Rebuilding..."
    npm run frontend:build
    npm run build:main

    # Mark rolled back in manifest
    node - "$MANIFEST" "$TAG" <<'EOF'
const fs = require('fs');
const [file, tag] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const entry = data.find(e => e.tag === tag);
if (entry) entry.rolledBack = true;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
EOF

    echo ""
    echo "✅ UI rollback applied to $TAG."
    if [ "$STASHED" -eq 1 ]; then
      echo "To restore your previous work: git stash pop"
    fi
    ;;

  *)
    usage
    ;;
esac
