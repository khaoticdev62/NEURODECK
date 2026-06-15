#!/usr/bin/env bash
# Guard agent pushes: file-count limits, forbidden paths, and Co-authored-by trailers.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

AGENT_NAME="${AGENT_NAME:-}"
MAX_FILES="${AGENT_MAX_FILES:-35}"
ERRORS=0

fail() {
  echo "❌ $1"
  ERRORS=$((ERRORS + 1))
}

ok() {
  echo "✅ $1"
}

# Determine commit range being pushed.
# Pre-push receives refs on stdin: <local_ref> <local_sha> <remote_ref> <remote_sha>
if [ -t 0 ]; then
  # Not run as a hook; verify the last commit only.
  COMMIT_RANGE="HEAD~1..HEAD"
  echo "Running agent-commit-guard on last commit ($COMMIT_RANGE)."
else
  read -r LOCAL_REF LOCAL_SHA REMOTE_REF REMOTE_SHA
  if [ "$LOCAL_SHA" = "0000000000000000000000000000000000000000" ]; then
    echo "Deleting remote ref $REMOTE_REF — nothing to guard."
    exit 0
  fi
  if [ "$REMOTE_SHA" = "0000000000000000000000000000000000000000" ]; then
    COMMIT_RANGE="$LOCAL_SHA"
  else
    COMMIT_RANGE="$REMOTE_SHA..$LOCAL_SHA"
  fi
  echo "Guarding push $COMMIT_RANGE to $REMOTE_REF"
fi

# 1. Check each commit message for type prefix and justification tokens.
while IFS= read -r msg; do
  if echo "$msg" | grep -Eq '^(feat|fix|docs|style|refactor|test|chore|ci|kfms|agent):'; then
    ok "Commit message has type prefix."
  else
    fail "Commit message missing required type prefix: $msg"
  fi

done < <(git log --format='%s' "$COMMIT_RANGE")

# 2. File count check
FILE_COUNT="$(git diff-tree --no-commit-id --name-only -r "$COMMIT_RANGE" 2>/dev/null | sort -u | wc -l || echo 0)"
if [ "$FILE_COUNT" -gt "$MAX_FILES" ]; then
  # Allow if any commit in the range contains MASS-REFACTOR: or BREAKING:
  if git log --format='%B' "$COMMIT_RANGE" | grep -Eq '(MASS-REFACTOR|BREAKING):'; then
    ok "Large change ($FILE_COUNT files) allowed by MASS-REFACTOR/BREAKING token."
  else
    fail "Push touches $FILE_COUNT files (limit $MAX_FILES). Add MASS-REFACTOR: or BREAKING: with justification."
  fi
else
  ok "File count within limit ($FILE_COUNT <= $MAX_FILES)."
fi

# 3. Forbidden path check
FORBIDDEN_PATHS=(
  ".github/workflows/"
  "infra/meta/meta.json"
  "infra/telemetry/health.json"
  "electron-builder.yml"
  "flatpak/"
  "aur/"
)

while IFS= read -r file; do
  for pattern in "${FORBIDDEN_PATHS[@]}"; do
    if [[ "$file" == "$pattern"* ]] || [[ "$file" == "$pattern" ]]; then
      fail "Agent push touches protected path: $file (requires explicit human approval)"
      break
    fi
  done

  # Cargo.lock / package-lock.json allowed only if the sole purpose is a dependency bump.
  if [[ "$file" == "Cargo.lock" ]] || [[ "$file" == "package-lock.json" ]]; then
    if ! git log --format='%B' "$COMMIT_RANGE" | grep -Eq '(deps|dependency|bump)'; then
      fail "Lockfile change without dependency-bump justification: $file"
    fi
  fi
done < <(git diff-tree --no-commit-id --name-only -r "$COMMIT_RANGE" 2>/dev/null | sort -u)

# 4. Add Co-authored-by trailer if AGENT_NAME is set and not already present.
if [ -n "$AGENT_NAME" ]; then
  if ! git log --format='%B' "$COMMIT_RANGE" | grep -q "Co-authored-by: $AGENT_NAME"; then
    echo "ℹ️  Add 'Co-authored-by: $AGENT_NAME <agent@khaoticlabs.com>' to commit messages for traceability."
  fi
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Agent commit guard FAILED with $ERRORS error(s)."
  exit 1
fi

ok "Agent commit guard passed."
