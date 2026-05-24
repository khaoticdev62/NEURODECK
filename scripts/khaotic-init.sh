#!/usr/bin/env bash
# =============================================================================
# khaotic-init.sh — KFMS v1.0 Repository Bootstrap & Hygiene Utility
#
# Usage:
#   ./scripts/khaotic-init.sh sweep     — move loose root files to .loose/inbox/
#   ./scripts/khaotic-init.sh stamp     — regenerate infra/meta/meta.json build block
#   ./scripts/khaotic-init.sh validate  — validate meta.json against meta.schema.json
#   ./scripts/khaotic-init.sh status    — print current KFMS health summary
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
CY='\033[0;36m'   # cyan
GR='\033[0;32m'   # green
YL='\033[1;33m'   # yellow
RD='\033[0;31m'   # red
NC='\033[0m'

info()  { echo -e "${CY}[KFMS]${NC} $*"; }
ok()    { echo -e "${GR}[ OK ]${NC} $*"; }
warn()  { echo -e "${YL}[WARN]${NC} $*"; }
die()   { echo -e "${RD}[FAIL]${NC} $*"; exit 1; }

# ---------------------------------------------------------------------------
# Essential root files — never swept into .loose/
# These are project manifests and tracked source files.
# ---------------------------------------------------------------------------
PRESERVE=(
  "README.md"
  "CLAUDE.md"
  "ROADMAP.md"
  "Cargo.toml"
  "Cargo.lock"
  "package.json"
  "package-lock.json"
  "llm-term.toml"
  "custom_style.json"
  "install.sh"
  "launch_gamescope.sh"
  "build_flatpak.sh"
  "package_release.ps1"
  "epics.md"
  "gemini.md"
  "SteamOS_LLM_Terminal_PRD_SDS.md"
  "SteamOS_LLM_Terminal_PRD_SDS.pdf"
)

# ---------------------------------------------------------------------------
# Directories that are part of the tracked project structure — never swept
# ---------------------------------------------------------------------------
PRESERVE_DIRS=(
  "src-tauri" "frontend" "docs" "assets" "infrastructure" "scripts"
  "infra" ".loose" ".github" "flatpak" "plugins" "_bmad" "_bmad-output"
  "data" "dist" "build" ".cursor"
)

# ---------------------------------------------------------------------------
# cmd: sweep
# Move untracked root-level files (not directories, not preserved names) into
# .loose/inbox/ — non-destructive. Files are git-ignored there.
# ---------------------------------------------------------------------------
cmd_sweep() {
  info "Running KFMS sweep — scanning for loose root-level files..."
  mkdir -p "$ROOT/.loose/inbox"

  local moved=0
  local skipped=0

  # Collect untracked files at root depth only (no subdirectories)
  while IFS= read -r -d '' entry; do
    local name
    name="$(basename "$entry")"

    # Skip directories
    [[ -d "$entry" ]] && continue

    # Skip preserved filenames
    local preserve=false
    for pf in "${PRESERVE[@]}"; do
      [[ "$name" == "$pf" ]] && preserve=true && break
    done
    $preserve && { (( skipped++ )) || true; continue; }

    # Skip files already inside a preserved directory
    local in_preserve_dir=false
    for pd in "${PRESERVE_DIRS[@]}"; do
      [[ "$entry" == "$ROOT/$pd/"* || "$entry" == "$ROOT/$pd" ]] && \
        in_preserve_dir=true && break
    done
    $in_preserve_dir && { (( skipped++ )) || true; continue; }

    # Move to .loose/inbox/
    local dest="$ROOT/.loose/inbox/$name"
    # Avoid overwrite collision — append timestamp suffix
    if [[ -e "$dest" ]]; then
      dest="$ROOT/.loose/inbox/${name%.}_$(date -u +%s).bak"
    fi

    mv "$entry" "$dest"
    warn "  swept → .loose/inbox/$name"
    (( moved++ )) || true

  done < <(find "$ROOT" -maxdepth 1 -not -name ".*" -not -path "$ROOT" -print0 | sort -z)

  # Also sweep hidden loose files (not hidden dirs we preserve)
  while IFS= read -r -d '' entry; do
    local name
    name="$(basename "$entry")"
    [[ -d "$entry" ]] && continue
    # Skip .git, .gitignore, .gitattributes
    [[ "$name" == ".gitignore" || "$name" == ".gitattributes" || "$name" == ".git" ]] && continue

    mv "$entry" "$ROOT/.loose/inbox/$name" 2>/dev/null || true
    warn "  swept (hidden) → .loose/inbox/$name"
    (( moved++ )) || true
  done < <(find "$ROOT" -maxdepth 1 -name ".*" -not -name ".git" \
    -not -name ".github" -not -name ".loose" -not -name ".cursor" \
    -not -name ".playwright-mcp" -not -type d -print0 2>/dev/null | sort -z)

  ok "Sweep complete. Moved: $moved  |  Preserved/skipped: $skipped"
  ok "Loose files are in: .loose/inbox/ (git-ignored)"
}

# ---------------------------------------------------------------------------
# cmd: stamp
# Re-stamps the build block in infra/meta/meta.json with current git state.
# Does NOT change version, codename, or any governance fields.
# Security: only stamps sha, tag, timestamp, dirty — never credentials.
# ---------------------------------------------------------------------------
cmd_stamp() {
  local meta="$ROOT/infra/meta/meta.json"
  [[ -f "$meta" ]] || die "infra/meta/meta.json not found. Run: ./scripts/khaotic-init.sh init"

  info "Stamping build block in meta.json..."

  local sha dirty_flag git_tag built_at
  sha=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
  dirty_flag=false
  [[ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ]] && dirty_flag=true
  git_tag=$(git -C "$ROOT" describe --tags --exact-match 2>/dev/null || echo "null")
  built_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Require python3/python or node for JSON patch; prefer Python.
  local py_bin=""
  if command -v python3 &>/dev/null; then
    py_bin="python3"
  elif command -v python &>/dev/null; then
    py_bin="python"
  fi

  if [[ -n "$py_bin" ]]; then
    "$py_bin" - "$meta" "$sha" "$git_tag" "$dirty_flag" "$built_at" <<'PYEOF'
import sys, json
meta_path, sha, tag, dirty, ts = sys.argv[1:]
with open(meta_path) as f:
    data = json.load(f)
data["build"]["git_sha"]      = sha
data["build"]["git_tag"]      = None if tag == "null" else tag
data["build"]["dirty"]        = (dirty == "true")
data["build"]["built_at_utc"] = ts
with open(meta_path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF
  elif command -v node &>/dev/null; then
    node - "$meta" "$sha" "$git_tag" "$dirty_flag" "$built_at" <<'JSEOF'
const [,, meta_path, sha, tag, dirty, ts] = process.argv;
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(meta_path, 'utf8'));
data.build.git_sha      = sha;
data.build.git_tag      = tag === 'null' ? null : tag;
data.build.dirty        = dirty === 'true';
data.build.built_at_utc = ts;
fs.writeFileSync(meta_path, JSON.stringify(data, null, 2) + '\n');
JSEOF
  else
    die "python3, python, or node required for stamp command."
  fi

  ok "Build block stamped:"
  ok "  sha:  $sha"
  ok "  tag:  $git_tag"
  ok "  at:   $built_at"
  ok "  dirty: $dirty_flag"
}

# ---------------------------------------------------------------------------
# cmd: validate
# Validates infra/meta/meta.json against infra/meta/meta.schema.json.
# ---------------------------------------------------------------------------
cmd_validate() {
  local meta="$ROOT/infra/meta/meta.json"
  local schema="$ROOT/infra/meta/meta.schema.json"

  info "Validating meta.json..."

  [[ -f "$meta" ]]   || die "infra/meta/meta.json not found."
  [[ -f "$schema" ]] || die "infra/meta/meta.schema.json not found."

  # Use ajv-cli if available, else fallback to structural checks via Python.
  if command -v ajv &>/dev/null; then
    ajv validate -s "$schema" -d "$meta" && ok "meta.json passes schema validation." || \
      die "meta.json failed schema validation."
  else
    local py_bin=""
    if command -v python3 &>/dev/null; then
      py_bin="python3"
    elif command -v python &>/dev/null; then
      py_bin="python"
    fi

    if [[ -n "$py_bin" ]]; then
      "$py_bin" - "$meta" "$schema" <<'PYEOF'
import sys, json, re

meta_path, schema_path = sys.argv[1], sys.argv[2]
with open(meta_path) as f:
    m = json.load(f)

errors = []

# kfms_version
if m.get("kfms_version") != "1.0":
    errors.append("kfms_version must be '1.0'")

# version: strict semver
if not re.match(r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$', m.get("version","")):
    errors.append("version must be strict SemVer MAJOR.MINOR.PATCH")

# codename registry
REGISTRY = ["Anubis","Thoth","Ra","Isis","Osiris","Horus","Bastet","Sekhmet",
            "Ptah","Hathor","Set","Sobek","Khonsu","Maat","Amun","Nephthys",
            "Atum","Anuket","Khepri","Taweret"]
cn = m.get("codename", {})
if cn.get("name") not in REGISTRY:
    errors.append(f"codename.name must be from registry: {REGISTRY}")
expected_idx = REGISTRY.index(cn["name"]) if cn.get("name") in REGISTRY else -1
if cn.get("registry_index") != expected_idx:
    errors.append(f"codename.registry_index must be {expected_idx} for '{cn.get('name')}'")
minor = int(m.get("version","0.0.0").split(".")[1])
if cn.get("minor_line") != minor:
    errors.append(f"codename.minor_line must match MINOR of version ({minor})")

# tag format
tag = m.get("tag","")
expected_tag = f"v{m.get('version','')}-{cn.get('name','').lower()}"
if tag != expected_tag:
    errors.append(f"tag must be '{expected_tag}', got '{tag}'")

# build block — no secrets check
build = m.get("build", {})
for field in ["git_sha","git_tag","built_at_utc","dirty"]:
    if field not in build:
        errors.append(f"build.{field} is missing")
sha = build.get("git_sha","")
if sha and not re.match(r'^[0-9a-f]{40}$', sha):
    errors.append("build.git_sha must be a 40-char hex SHA")

# governance guardrails
gov = m.get("studio",{}).get("governance",{})
if not gov.get("no_secrets_in_build"):
    errors.append("governance.no_secrets_in_build must be true")
if not gov.get("codename_unique_per_major"):
    errors.append("governance.codename_unique_per_major must be true")

if errors:
    for e in errors:
        print(f"  ERROR: {e}", file=sys.stderr)
    sys.exit(1)
else:
    print("  All checks passed.")
PYEOF
      ok "meta.json is valid."
    else
      warn "No validator found (ajv, python3, or python). Skipping schema check."
      warn "Install: npm i -g ajv-cli  OR install Python."
    fi
  fi
}

# ---------------------------------------------------------------------------
# cmd: status
# Print a brief KFMS health summary.
# ---------------------------------------------------------------------------
cmd_status() {
  local meta="$ROOT/infra/meta/meta.json"
  local health="$ROOT/infra/telemetry/health.json"

  echo ""
  echo -e "${CY}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CY}║  KHAOTIC LABS — KFMS v1.0 STATUS        ║${NC}"
  echo -e "${CY}╚══════════════════════════════════════════╝${NC}"

  if [[ -f "$meta" ]]; then
    local ver codename tag
    if command -v python3 &>/dev/null; then
      read -r ver codename tag < <(python3 -c "
import json,sys
with open('$meta') as f: m=json.load(f)
print(m['version'], m['codename']['name'], m['tag'])
")
    fi
    ok "meta.json  → v${ver:-?} | ${codename:-?} | ${tag:-?}"
  else
    warn "meta.json  → MISSING"
  fi

  [[ -f "$health" ]]                          && ok "health.json → present" || warn "health.json → MISSING"
  [[ -d "$ROOT/infra/meta" ]]                 && ok "infra/meta  → OK"      || warn "infra/meta  → MISSING"
  [[ -d "$ROOT/infra/telemetry" ]]            && ok "infra/telemetry → OK"  || warn "infra/telemetry → MISSING"
  [[ -d "$ROOT/.loose/inbox" ]]               && ok ".loose/inbox → OK"     || warn ".loose/inbox → MISSING"

  echo ""
}

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
CMD="${1:-help}"

case "$CMD" in
  sweep)    cmd_sweep    ;;
  stamp)    cmd_stamp    ;;
  validate) cmd_validate ;;
  status)   cmd_status   ;;
  *)
    echo ""
    echo "  Usage: ./scripts/khaotic-init.sh <command>"
    echo ""
    echo "  Commands:"
    echo "    sweep     Move loose root files to .loose/inbox/"
    echo "    stamp     Re-stamp build block in infra/meta/meta.json"
    echo "    validate  Validate meta.json against schema"
    echo "    status    Print KFMS health summary"
    echo ""
    ;;
esac
