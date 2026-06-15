#!/usr/bin/env bash
# Install Git hooks for KFMS preflight and agent-commit-guard.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$HOOK_DIR"

install_hook() {
  local name="$1"
  local content="$2"
  local target="$HOOK_DIR/$name"

  echo "$content" > "$target"
  chmod +x "$target"
  echo "Installed hook: $target"
}

PRECOMMIT='#!/bin/sh
# KFMS pre-commit hook
bash "$(git rev-parse --show-toplevel)/scripts/git/preflight.sh" || {
  code=$?
  if [ "$code" -eq 1 ]; then
    echo "Commit blocked by preflight."
    exit 1
  fi
  # Warnings (exit 2) allow the commit.
}
'

PREPUSH='#!/bin/sh
# KFMS pre-push hook
bash "$(git rev-parse --show-toplevel)/scripts/git/agent-commit-guard.sh" || exit 1
'

install_hook "pre-commit" "$PRECOMMIT"
install_hook "pre-push" "$PREPUSH"

echo "KFMS Git hooks installed. Remove them from .git/hooks/ to uninstall."
