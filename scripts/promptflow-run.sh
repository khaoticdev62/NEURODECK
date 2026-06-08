#!/usr/bin/env bash
# PromptFlow wrapper for NEURODECK — Production Code Prompt System
# Usage: ./scripts/promptflow-run.sh <sequence> [provider]
# Sequences: audit, security, refactor, frontend, build, release, full

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEQUENCE="${1:-audit-only}"
PROVIDER="${2:-manual}"

cd "$PROJECT_ROOT"

# Map short names to full sequence names
declare -A SEQ_MAP=(
  [audit]="audit-only"
  [security]="security"
  [refactor]="refactor"
  [frontend]="frontend"
  [build]="build-repair"
  [release]="release-certification"
  [full]="full"
)

FULL_SEQ="${SEQ_MAP[$SEQUENCE]:-$SEQUENCE}"

echo "═══════════════════════════════════════════════════════════════"
echo "  NEURODECK PromptFlow — Sequence: $FULL_SEQ"
echo "  Provider: $PROVIDER"
echo "═══════════════════════════════════════════════════════════════"

python -m promptflow run --sequence "$FULL_SEQ" --provider "$PROVIDER"
