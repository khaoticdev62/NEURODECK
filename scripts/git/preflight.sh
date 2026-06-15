#!/usr/bin/env bash
# KFMS lightweight local preflight script.
# Runs in <30 seconds. Intended for pre-commit / pre-push hooks and agent verification.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

WARNINGS=0
ERRORS=0

warn() {
  echo "⚠️  $1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  echo "❌ $1"
  ERRORS=$((ERRORS + 1))
}

ok() {
  echo "✅ $1"
}

cd "$REPO_ROOT"

# 1. Branch name check
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'HEAD')"
if [[ "$CURRENT_BRANCH" =~ ^(master|main)$ ]]; then
  fail "Currently on protected branch '$CURRENT_BRANCH'. Create a feature/ui/bugfix branch before committing."
elif [[ "$CURRENT_BRANCH" =~ ^(agent|feature|ui|bugfix|hotfix|docs|kfms|release)/.+$ ]]; then
  ok "Branch name '$CURRENT_BRANCH' is allowed."
elif [ "$CURRENT_BRANCH" = "HEAD" ]; then
  warn "Detached HEAD state. Branch-name check skipped."
else
  fail "Branch name '$CURRENT_BRANCH' does not match allowed prefixes."
  echo "   Allowed: agent/, feature/, ui/, bugfix/, hotfix/, docs/, kfms/, release/"
fi

# 2. Dirty / staged state
if git diff --cached --quiet; then
  warn "No staged changes. Preflight only checks tracked, staged files."
else
  STAGED_COUNT="$(git diff --cached --name-only | wc -l)"
  ok "$STAGED_COUNT file(s) staged."
fi

# 3. Staged file count sanity
if [ -n "${STAGED_COUNT:-}" ] && [ "$STAGED_COUNT" -gt 50 ]; then
  fail "Too many staged files ($STAGED_COUNT). If this is intentional, include MASS-REFACTOR: in the commit message."
fi

# 4. Forbidden path guard
FORBIDDEN_PATTERNS=(
  '^node_modules/'
  '^\.env$'
  '\.log$'
  '^dist/'
  '^dist-electron/'
  '^\.fallow/cache'
  '^\.ruff_cache/'
  '\.pyc$'
  '\.pyo$'
  '__pycache__/'
)

if [ -n "${STAGED_COUNT:-}" ]; then
  while IFS= read -r file; do
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
      if echo "$file" | grep -Eq "$pattern"; then
        fail "Forbidden staged path matches '$pattern': $file"
        break
      fi
    done
  done < <(git diff --cached --name-only)
fi

# 5. Secret / high-entropy string scan in staged changes
if [ -n "${STAGED_COUNT:-}" ]; then
  if git diff --cached | grep -Ei '(ghp_[a-z0-9]{36}|github_pat_[a-z0-9_]{20,}|sk-[a-z0-9]{20,}|AIzaSy[a-z0-9_-]{33})' >/dev/null; then
    fail "Potential secret detected in staged changes. Use environment variables or OS keychain instead."
  else
    ok "No obvious secrets in staged changes."
  fi
fi

# 6. KFMS quick validate (metadata + schema only)
if [ -x "scripts/kfms/khaotic-init.sh" ]; then
  if bash scripts/kfms/khaotic-init.sh validate >/dev/null 2>&1; then
    ok "KFMS metadata validates."
  else
    fail "KFMS metadata validation failed. Run 'bash scripts/kfms/khaotic-init.sh validate' for details."
  fi
else
  warn "KFMS validator not found at scripts/kfms/khaotic-init.sh"
fi

# 7. Required manifests present
for f in infra/meta/meta.json infra/meta/meta.schema.json infra/telemetry/health.json; do
  if [ -f "$f" ]; then
    ok "Required manifest present: $f"
  else
    fail "Required manifest missing: $f"
  fi
done

# Summary
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "Preflight FAILED: $ERRORS error(s), $WARNINGS warning(s)."
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "Preflight PASSED with warnings: $WARNINGS warning(s)."
  exit 2
else
  echo "Preflight PASSED. Ready to commit / push."
  exit 0
fi
