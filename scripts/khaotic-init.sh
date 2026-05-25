#!/usr/bin/env bash
# =============================================================================
# khaotic-init.sh — KFMS v1.0 Repository Bootstrap & Hygiene Utility
#
# Usage:
#   ./scripts/khaotic-init.sh sweep     — move loose root files to .loose/inbox/
#   ./scripts/khaotic-init.sh stamp     — regenerate infra/meta/meta.json build block
#   ./scripts/khaotic-init.sh sync      — regenerate derived KFMS artifacts from meta.json
#   ./scripts/khaotic-init.sh validate  — validate meta.json and derived artifact consistency
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

resolve_python() {
  if command -v python3 &>/dev/null; then
    echo "python3"
  elif command -v python &>/dev/null; then
    echo "python"
  else
    return 1
  fi
}

count_loose_root_files() {
  local count
  count=$(find "$ROOT" -maxdepth 1 -type f \
    -not -name ".gitignore" \
    -not -name ".gitattributes" \
    -not -name "README.md" \
    -not -name "CLAUDE.md" \
    -not -name "ROADMAP.md" \
    -not -name "Cargo.toml" \
    -not -name "Cargo.lock" \
    -not -name "package.json" \
    -not -name "package-lock.json" \
    -not -name "llm-term.toml" \
    -not -name "custom_style.json" \
    -not -name "install.sh" \
    -not -name "launch_gamescope.sh" \
    -not -name "build_flatpak.sh" \
    -not -name "package_release.ps1" \
    -not -name "epics.md" \
    -not -name "gemini.md" \
    -not -name "SteamOS_LLM_Terminal_PRD_SDS.md" \
    -not -name "SteamOS_LLM_Terminal_PRD_SDS.pdf" \
    | wc -l | tr -d ' ')
  echo "${count:-0}"
}

derive_workspace_state() {
  local status_lines generated_only=true line path
  status_lines=$(git -C "$ROOT" status --porcelain 2>/dev/null || true)
  if [[ -z "$status_lines" ]]; then
    echo "clean"
    return 0
  fi

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    path="${line:3}"
    case "$path" in
      "infra/meta/meta.json"|"infra/telemetry/health.json"|"infra/meta/CODENAME_REGISTRY.md")
        ;;
      *)
        generated_only=false
        break
        ;;
    esac
  done <<< "$status_lines"

  if $generated_only; then
    echo "generated-only"
  else
    echo "manual-uncommitted"
  fi
}

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
  py_bin=$(resolve_python 2>/dev/null || true)

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
# cmd: sync
# Regenerates health.json and the current sections of CODENAME_REGISTRY.md from
# meta.json. meta.json remains the source of truth.
# ---------------------------------------------------------------------------
cmd_sync() {
  local meta="$ROOT/infra/meta/meta.json"
  local health="$ROOT/infra/telemetry/health.json"
  local registry="$ROOT/infra/meta/CODENAME_REGISTRY.md"
  local py_bin=""
  local schema_valid=false
  local loose_zone_isolated=false
  local workspace_state

  [[ -f "$meta" ]] || die "infra/meta/meta.json not found."
  [[ -f "$registry" ]] || die "infra/meta/CODENAME_REGISTRY.md not found."

  py_bin=$(resolve_python 2>/dev/null || true)
  [[ -n "$py_bin" ]] || die "python3 or python required for sync command."

  if cmd_validate >/dev/null 2>&1; then
    schema_valid=true
  fi
  [[ -d "$ROOT/.loose/inbox" ]] && [[ "$(count_loose_root_files)" == "0" ]] && loose_zone_isolated=true
  workspace_state=$(derive_workspace_state)

  info "Syncing derived KFMS artifacts from meta.json..."

  "$py_bin" - "$meta" "$health" "$registry" "$schema_valid" "$loose_zone_isolated" "$workspace_state" <<'PYEOF'
import json
import re
import sys
from pathlib import Path

meta_path, health_path, registry_path, schema_valid, loose_zone_isolated, workspace_state = sys.argv[1:]

REGISTRY = [
    "Anubis", "Thoth", "Ra", "Isis", "Osiris", "Horus", "Bastet", "Sekhmet",
    "Ptah", "Hathor", "Set", "Sobek", "Khonsu", "Maat", "Amun", "Nephthys",
    "Atum", "Anuket", "Khepri", "Taweret",
]

meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
version = meta["version"]
codename = meta["codename"]["name"]
minor = int(version.split(".")[1])
tag = meta["tag"]
build = meta.get("build", {})
stamped_at = build.get("built_at_utc")
dirty = bool(build.get("dirty"))

tag_format_correct = tag == f"v{version}-{codename.lower()}"
health = {
    "status": "healthy" if schema_valid == "true" and tag_format_correct else "degraded",
    "kfms_version": meta["kfms_version"],
    "project": meta["project"]["id"],
    "version": version,
    "codename": codename,
    "tag": tag,
    "workspace_state": workspace_state,
    "dirty_build": dirty,
    "stamped_at_utc": stamped_at,
    "checks": {
        "meta_json_present": True,
        "schema_valid": schema_valid == "true",
        "tag_format_correct": tag_format_correct,
        "loose_zone_isolated": loose_zone_isolated == "true",
        "no_secrets_in_build": bool(meta["studio"]["governance"].get("no_secrets_in_build")),
    },
}
Path(health_path).write_text(json.dumps(health, indent=2) + "\n", encoding="utf-8")

snapshot = (
    f"- Current version: `{version}`\n"
    f"- Current codename: `{codename}`\n"
    f"- Current tag: `{tag}`\n"
    f"- Current MINOR line: `{minor}`\n"
    f"- Source of truth: `infra/meta/meta.json`\n"
    f"- Last stamped build: `{stamped_at}`\n"
)

table_lines = [
    "| Index | Codename  | Status    | Assigned To           |",
    "|------:|-----------|-----------|----------------------|",
]
for idx, name in enumerate(REGISTRY):
    status = "active" if idx == minor else "available"
    assigned = f"v{version.split('.')[0]}.{idx}.x"
    if idx == minor:
        table_lines.append(f"| {idx:>5} | **{name}** | **{status}** | **{assigned} (current)** |")
    else:
        table_lines.append(f"| {idx:>5} | {name} | {status} | {assigned} |")
table = "\n".join(table_lines)

registry = Path(registry_path).read_text(encoding="utf-8")
registry = re.sub(
    r"<!-- KFMS:CURRENT_ASSIGNMENT:BEGIN -->.*?<!-- KFMS:CURRENT_ASSIGNMENT:END -->",
    "<!-- KFMS:CURRENT_ASSIGNMENT:BEGIN -->\n" + snapshot + "<!-- KFMS:CURRENT_ASSIGNMENT:END -->",
    registry,
    flags=re.S,
)
registry = re.sub(
    r"<!-- KFMS:REGISTRY_TABLE:BEGIN -->.*?<!-- KFMS:REGISTRY_TABLE:END -->",
    "<!-- KFMS:REGISTRY_TABLE:BEGIN -->\n" + table + "\n<!-- KFMS:REGISTRY_TABLE:END -->",
    registry,
    flags=re.S,
)
Path(registry_path).write_text(registry, encoding="utf-8")
PYEOF

  ok "Derived artifacts synced from meta.json."
  ok "  updated: infra/telemetry/health.json"
  ok "  updated: infra/meta/CODENAME_REGISTRY.md"
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

  local py_bin=""
  py_bin=$(resolve_python 2>/dev/null || true)
  if [[ -n "$py_bin" ]]; then
    "$py_bin" - "$meta" "$ROOT/infra/telemetry/health.json" "$ROOT/infra/meta/CODENAME_REGISTRY.md" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, health_path, registry_path = sys.argv[1:]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))

if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8"))
    if health.get("version") != meta.get("version"):
        raise SystemExit("health.json version does not match meta.json")
    if health.get("codename") != meta.get("codename", {}).get("name"):
        raise SystemExit("health.json codename does not match meta.json")

registry_text = Path(registry_path).read_text(encoding="utf-8")
expected_tag = meta.get("tag")
expected_codename = meta.get("codename", {}).get("name")
expected_version = meta.get("version")
for expected in (expected_version, expected_codename, expected_tag):
    if expected and expected not in registry_text:
        raise SystemExit(f"codename registry is not synced to meta.json: missing {expected}")
PYEOF
    ok "Derived KFMS artifacts are consistent."
  fi
}

# ---------------------------------------------------------------------------
# cmd: status
# Print a brief KFMS health summary.
# ---------------------------------------------------------------------------
cmd_status() {
  local meta="$ROOT/infra/meta/meta.json"
  local health="$ROOT/infra/telemetry/health.json"
  local py_bin=""
  py_bin=$(resolve_python 2>/dev/null || true)

  echo ""
  echo -e "${CY}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CY}║  KHAOTIC LABS — KFMS v1.0 STATUS        ║${NC}"
  echo -e "${CY}╚══════════════════════════════════════════╝${NC}"

  if [[ -f "$meta" && -n "$py_bin" ]]; then
    local ver codename tag dirty stamped workspace health_status
    read -r ver codename tag dirty stamped workspace health_status < <("$py_bin" - "$meta" "$health" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, health_path = sys.argv[1:]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
health_status = "missing"
workspace = "unknown"
if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8"))
    health_status = health.get("status", "unknown")
    workspace = health.get("workspace_state", "unknown")
print(
    meta["version"],
    meta["codename"]["name"],
    meta["tag"],
    str(meta.get("build", {}).get("dirty", False)).lower(),
    meta.get("build", {}).get("built_at_utc", "unknown"),
    workspace,
    health_status,
)
PYEOF
)
    health_status="${health_status//$'\r'/}"
    workspace="${workspace//$'\r'/}"
    dirty="${dirty//$'\r'/}"
    ok "meta.json  → v${ver:-?} | ${codename:-?} | ${tag:-?}"
    ok "build      → dirty=${dirty:-?} | workspace=${workspace:-?} | stamped=${stamped:-?}"
    if [[ "$health_status" == "healthy" ]]; then
      ok "health     → ${health_status}"
    else
      warn "health     → ${health_status}"
    fi
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
  sync)     cmd_sync     ;;
  validate) cmd_validate ;;
  status)   cmd_status   ;;
  *)
    echo ""
    echo "  Usage: ./scripts/khaotic-init.sh <command>"
    echo ""
    echo "  Commands:"
    echo "    sweep     Move loose root files to .loose/inbox/"
    echo "    stamp     Re-stamp build block in infra/meta/meta.json"
    echo "    sync      Regenerate derived KFMS artifacts from meta.json"
    echo "    validate  Validate meta.json against schema"
    echo "    status    Print KFMS health summary"
    echo ""
    ;;
esac
