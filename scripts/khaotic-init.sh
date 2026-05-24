#!/usr/bin/env bash
# =============================================================================
# khaotic-init.sh — KFMS v1.0 Repository Bootstrap & Hygiene Utility
#
# Usage:
#   ./scripts/khaotic-init.sh sweep            — move loose root files to .loose/inbox/
#   ./scripts/khaotic-init.sh stamp            — regenerate infra/meta/meta.json build block
#   ./scripts/khaotic-init.sh sync             — regenerate derived KFMS artifacts from meta.json
#   ./scripts/khaotic-init.sh validate         — validate meta.json and derived artifact consistency
#   ./scripts/khaotic-init.sh status           — print current KFMS health summary
#   ./scripts/khaotic-init.sh doctor           — print release-readiness and blocker summary
#   ./scripts/khaotic-init.sh release-plan     — run release gates and print ship/no-ship summary
#   ./scripts/khaotic-init.sh bump patch       — bump PATCH and refresh derived artifacts
#   ./scripts/khaotic-init.sh bump minor       — bump MINOR/codename and refresh derived artifacts
#   ./scripts/khaotic-init.sh bump major       — bump MAJOR and reset codename line
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
META="$ROOT/infra/meta/meta.json"
SCHEMA="$ROOT/infra/meta/meta.schema.json"
HEALTH="$ROOT/infra/telemetry/health.json"
REGISTRY_MD="$ROOT/infra/meta/CODENAME_REGISTRY.md"
PLAN_MD="$ROOT/docs/IMPLEMENTATION_PLAN.md"

CY='\033[0;36m'
GR='\033[0;32m'
YL='\033[1;33m'
RD='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CY}[KFMS]${NC} $*"; }
ok()    { echo -e "${GR}[ OK ]${NC} $*"; }
warn()  { echo -e "${YL}[WARN]${NC} $*"; }
die()   { echo -e "${RD}[FAIL]${NC} $*"; exit 1; }

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

PRESERVE_DIRS=(
  "src-tauri" "frontend" "docs" "assets" "infrastructure" "scripts"
  "infra" ".loose" ".github" "flatpak" "plugins" "_bmad" "_bmad-output"
  "data" "dist" "build" ".cursor"
)

resolve_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
  elif command -v python >/dev/null 2>&1; then
    echo "python"
  else
    return 1
  fi
}

PY_BIN="$(resolve_python || true)"

require_python() {
  [[ -n "${PY_BIN:-}" ]] || die "python3 or python is required for KFMS commands."
}

resolve_command_path() {
  local tool="$1"
  local candidate=""
  if candidate="$(command -v "$tool" 2>/dev/null)"; then
    echo "$candidate"
    return 0
  fi
  if candidate="$(command -v "${tool}.exe" 2>/dev/null)"; then
    echo "$candidate"
    return 0
  fi
  if candidate="$(command -v "${tool}.cmd" 2>/dev/null)"; then
    echo "$candidate"
    return 0
  fi
  if command -v cmd.exe >/dev/null 2>&1; then
    candidate="$(cmd.exe /c where "$tool" 2>/dev/null | tr -d '\r' | head -n 1 || true)"
    if [[ -n "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  fi
  return 1
}

is_wsl_shell() {
  [[ -n "${WSL_INTEROP:-}" ]] || [[ -n "${WSL_DISTRO_NAME:-}" ]] || grep -qi microsoft /proc/version 2>/dev/null
}

is_windows_host_tool_path() {
  local tool_path="$1"
  [[ "$tool_path" == /mnt/* ]] || [[ "$tool_path" =~ \.(exe|cmd)$ ]]
}

run_release_gate() {
  local workdir="$1"
  local log_path="$2"
  local gate_cmd="$3"

  (
    cd "$workdir"
    eval "$gate_cmd"
  ) >"$log_path" 2>&1
}

count_loose_root_files() {
  local count
  count=$(find "$ROOT" -maxdepth 1 -type f \
    -not -name ".gitignore" \
    -not -name ".gitattributes" \
    -not -name ".git" \
    | wc -l | tr -d ' ')

  local preserved_count="${#PRESERVE[@]}"
  if [[ "$count" -lt "$preserved_count" ]]; then
    echo "0"
  else
    echo $((count - preserved_count))
  fi
}

derive_workspace_state() {
  local status_lines generated_only=true line path
  status_lines="$(git -C "$ROOT" status --porcelain 2>/dev/null || true)"
  if [[ -z "$status_lines" ]]; then
    echo "clean"
    return 0
  fi

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    path="${line:3}"
    case "$path" in
      "infra/meta/meta.json"|"infra/telemetry/health.json"|"infra/meta/CODENAME_REGISTRY.md"|"docs/IMPLEMENTATION_PLAN.md")
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

render_meta_field() {
  require_python
  "$PY_BIN" - "$META" "$1" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, field = sys.argv[1:]
data = json.loads(Path(meta_path).read_text(encoding="utf-8"))
value = data
for part in field.split("."):
    value = value[part]
print(value)
PYEOF
}

cmd_sweep() {
  info "Running KFMS sweep — scanning for loose root-level files..."
  mkdir -p "$ROOT/.loose/inbox"

  local moved=0
  local skipped=0

  while IFS= read -r -d '' entry; do
    local name preserve=false in_preserve_dir=false dest
    name="$(basename "$entry")"
    [[ -d "$entry" ]] && continue

    for pf in "${PRESERVE[@]}"; do
      [[ "$name" == "$pf" ]] && preserve=true && break
    done
    $preserve && { (( skipped++ )) || true; continue; }

    for pd in "${PRESERVE_DIRS[@]}"; do
      [[ "$entry" == "$ROOT/$pd/"* || "$entry" == "$ROOT/$pd" ]] && in_preserve_dir=true && break
    done
    $in_preserve_dir && { (( skipped++ )) || true; continue; }

    dest="$ROOT/.loose/inbox/$name"
    if [[ -e "$dest" ]]; then
      dest="$ROOT/.loose/inbox/${name%.}_$(date -u +%s).bak"
    fi

    mv "$entry" "$dest"
    warn "  swept → .loose/inbox/$name"
    (( moved++ )) || true
  done < <(find "$ROOT" -maxdepth 1 -not -name ".*" -not -path "$ROOT" -print0 | sort -z)

  while IFS= read -r -d '' entry; do
    local name
    name="$(basename "$entry")"
    [[ -d "$entry" ]] && continue
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

cmd_stamp() {
  [[ -f "$META" ]] || die "infra/meta/meta.json not found."
  require_python

  info "Stamping build block in meta.json..."

  local sha dirty_flag git_tag built_at
  sha="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")"
  dirty_flag=false
  [[ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ]] && dirty_flag=true
  git_tag="$(git -C "$ROOT" describe --tags --exact-match 2>/dev/null || echo "null")"
  built_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  "$PY_BIN" - "$META" "$sha" "$git_tag" "$dirty_flag" "$built_at" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, sha, tag, dirty, ts = sys.argv[1:]
data = json.loads(Path(meta_path).read_text(encoding="utf-8"))
data["build"]["git_sha"] = sha
data["build"]["git_tag"] = None if tag == "null" else tag
data["build"]["dirty"] = dirty == "true"
data["build"]["built_at_utc"] = ts
Path(meta_path).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PYEOF

  ok "Build block stamped:"
  ok "  sha:  $sha"
  ok "  tag:  $git_tag"
  ok "  at:   $built_at"
  ok "  dirty: $dirty_flag"
}

cmd_sync() {
  [[ -f "$META" ]] || die "infra/meta/meta.json not found."
  [[ -f "$REGISTRY_MD" ]] || die "infra/meta/CODENAME_REGISTRY.md not found."
  [[ -f "$PLAN_MD" ]] || die "docs/IMPLEMENTATION_PLAN.md not found."
  require_python

  local schema_valid=false
  local loose_zone_isolated=false
  local workspace_state

  if cmd_validate --schema-only >/dev/null 2>&1; then
    schema_valid=true
  fi
  [[ -d "$ROOT/.loose/inbox" ]] && [[ "$(count_loose_root_files)" == "0" ]] && loose_zone_isolated=true
  workspace_state="$(derive_workspace_state)"

  info "Syncing derived KFMS artifacts from meta.json..."

  "$PY_BIN" - "$META" "$HEALTH" "$REGISTRY_MD" "$PLAN_MD" "$schema_valid" "$loose_zone_isolated" "$workspace_state" <<'PYEOF'
import json
import re
import sys
from pathlib import Path

meta_path, health_path, registry_path, plan_path, schema_valid, loose_zone_isolated, workspace_state = sys.argv[1:]

REGISTRY = [
    "Anubis", "Thoth", "Ra", "Isis", "Osiris", "Horus", "Bastet", "Sekhmet",
    "Ptah", "Hathor", "Set", "Sobek", "Khonsu", "Maat", "Amun", "Nephthys",
    "Atum", "Anuket", "Khepri", "Taweret",
]

meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
version = meta["version"]
major, minor, patch = map(int, version.split("."))
codename = meta["codename"]["name"]
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
    "| Index | Codename | Status | Assigned To |",
    "|------:|----------|--------|-------------|",
]
for idx, name in enumerate(REGISTRY):
    status = "active" if idx == minor else "available"
    assigned = f"v{major}.{idx}.x"
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

plan_snapshot = (
    f"- Version: `{version}`\n"
    f"- Codename: `{codename}`\n"
    f"- Tag: `{tag}`\n"
    f"- Workspace state: `{workspace_state}`\n"
    f"- Last stamped build: `{stamped_at}`\n"
)
plan = Path(plan_path).read_text(encoding="utf-8")
plan = re.sub(
    r"<!-- KFMS:PLAN_SNAPSHOT:BEGIN -->.*?<!-- KFMS:PLAN_SNAPSHOT:END -->",
    "<!-- KFMS:PLAN_SNAPSHOT:BEGIN -->\n" + plan_snapshot + "<!-- KFMS:PLAN_SNAPSHOT:END -->",
    plan,
    flags=re.S,
)
Path(plan_path).write_text(plan, encoding="utf-8")
PYEOF

  ok "Derived artifacts synced from meta.json."
  ok "  updated: infra/telemetry/health.json"
  ok "  updated: infra/meta/CODENAME_REGISTRY.md"
  ok "  updated: docs/IMPLEMENTATION_PLAN.md"
}

cmd_validate() {
  local schema_only=false
  if [[ "${2:-}" == "--schema-only" || "${1:-}" == "--schema-only" ]]; then
    schema_only=true
  fi

  [[ -f "$META" ]] || die "infra/meta/meta.json not found."
  [[ -f "$SCHEMA" ]] || die "infra/meta/meta.schema.json not found."
  require_python

  info "Validating meta.json..."

  if command -v ajv >/dev/null 2>&1; then
    ajv validate -s "$SCHEMA" -d "$META" >/dev/null && ok "meta.json passes schema validation." || \
      die "meta.json failed schema validation."
  else
    "$PY_BIN" - "$META" <<'PYEOF'
import json
import re
import sys
from pathlib import Path

REGISTRY = [
    "Anubis","Thoth","Ra","Isis","Osiris","Horus","Bastet","Sekhmet",
    "Ptah","Hathor","Set","Sobek","Khonsu","Maat","Amun","Nephthys",
    "Atum","Anuket","Khepri","Taweret",
]

meta = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
errors = []
if meta.get("kfms_version") != "1.0":
    errors.append("kfms_version must be '1.0'")
if not re.match(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$", meta.get("version", "")):
    errors.append("version must be strict SemVer MAJOR.MINOR.PATCH")
cn = meta.get("codename", {})
if cn.get("name") not in REGISTRY:
    errors.append("codename.name must be from canonical registry")
else:
    idx = REGISTRY.index(cn["name"])
    if cn.get("registry_index") != idx:
        errors.append(f"codename.registry_index must be {idx}")
minor = int(meta.get("version", "0.0.0").split(".")[1])
if cn.get("minor_line") != minor:
    errors.append(f"codename.minor_line must match version minor ({minor})")
expected_tag = f"v{meta.get('version','')}-{cn.get('name','').lower()}"
if meta.get("tag") != expected_tag:
    errors.append(f"tag must be {expected_tag}")
build = meta.get("build", {})
for field in ("git_sha", "git_tag", "built_at_utc", "dirty"):
    if field not in build:
        errors.append(f"build.{field} is missing")
if build.get("git_sha") and not re.match(r"^[0-9a-f]{40}$", build["git_sha"]):
    errors.append("build.git_sha must be a 40-char hex SHA")
gov = meta.get("studio", {}).get("governance", {})
if not gov.get("no_secrets_in_build"):
    errors.append("governance.no_secrets_in_build must be true")
if not gov.get("codename_unique_per_major"):
    errors.append("governance.codename_unique_per_major must be true")

if errors:
    for error in errors:
        print(f"  ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)
print("  All checks passed.")
PYEOF
    ok "meta.json is valid."
  fi

  $schema_only && return 0

  "$PY_BIN" - "$META" "$HEALTH" "$REGISTRY_MD" "$PLAN_MD" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, health_path, registry_path, plan_path = sys.argv[1:]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
version = meta["version"]
codename = meta["codename"]["name"]
tag = meta["tag"]
stamped_at = meta.get("build", {}).get("built_at_utc")

if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8"))
    if health.get("version") != version:
        raise SystemExit("health.json version does not match meta.json")
    if health.get("codename") != codename:
        raise SystemExit("health.json codename does not match meta.json")
    if health.get("tag") != tag:
        raise SystemExit("health.json tag does not match meta.json")
    if health.get("stamped_at_utc") != stamped_at:
        raise SystemExit("health.json stamped_at_utc does not match meta.json")

registry_text = Path(registry_path).read_text(encoding="utf-8")
for expected in (version, codename, tag, stamped_at):
    if expected not in registry_text:
        raise SystemExit(f"codename registry is not synced to meta.json: missing {expected}")

plan_text = Path(plan_path).read_text(encoding="utf-8")
for expected in (version, codename, tag, stamped_at):
    if expected not in plan_text:
        raise SystemExit(f"implementation plan snapshot is not synced to meta.json: missing {expected}")
PYEOF
  ok "Derived KFMS artifacts are consistent."
}

cmd_status() {
  require_python
  echo ""
  echo -e "${CY}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CY}║  KHAOTIC LABS — KFMS v1.0 STATUS         ║${NC}"
  echo -e "${CY}╚══════════════════════════════════════════╝${NC}"

  if [[ -f "$META" ]]; then
    local ver codename tag dirty stamped workspace health_status
    read -r ver codename tag dirty stamped workspace health_status < <("$PY_BIN" - "$META" "$HEALTH" <<'PYEOF'
import json
import sys
from pathlib import Path

meta = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
health_status = "missing"
workspace = "unknown"
if Path(sys.argv[2]).exists():
    health = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
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

  [[ -f "$HEALTH" ]] && ok "health.json → present" || warn "health.json → MISSING"
  [[ -d "$ROOT/infra/meta" ]] && ok "infra/meta  → OK" || warn "infra/meta  → MISSING"
  [[ -d "$ROOT/infra/telemetry" ]] && ok "infra/telemetry → OK" || warn "infra/telemetry → MISSING"
  [[ -d "$ROOT/.loose/inbox" ]] && ok ".loose/inbox → OK" || warn ".loose/inbox → MISSING"
  echo ""
}

evaluate_release_readiness() {
  local validation_ok=true plan_snapshot_ok=true diff_check_ok=true
  local workspace_state loose_root_count score=100
  local blockers=()

  if ! cmd_validate >/dev/null 2>&1; then
    validation_ok=false
    blockers+=("KFMS metadata or derived artifact validation is failing.")
  fi
  if ! git -C "$ROOT" diff --check >/dev/null 2>&1; then
    diff_check_ok=false
    blockers+=("Whitespace or merge-marker issues exist in the working tree.")
  fi
  if [[ ! -f "$PLAN_MD" ]]; then
    plan_snapshot_ok=false
    blockers+=("Implementation plan is missing.")
  elif ! grep -q "KFMS:PLAN_SNAPSHOT:BEGIN" "$PLAN_MD"; then
    plan_snapshot_ok=false
    blockers+=("Implementation plan has no KFMS-generated snapshot marker.")
  fi

  workspace_state="$(derive_workspace_state)"
  loose_root_count="$(count_loose_root_files)"

  $validation_ok || score=$((score - 35))
  $plan_snapshot_ok || score=$((score - 15))
  [[ "$workspace_state" == "clean" ]] || score=$((score - 20))
  [[ "$loose_root_count" == "0" ]] || score=$((score - 10))
  $diff_check_ok || score=$((score - 20))
  (( score < 0 )) && score=0

  printf 'score=%s\n' "$score"
  printf 'validation_ok=%s\n' "$($validation_ok && echo true || echo false)"
  printf 'plan_snapshot_ok=%s\n' "$($plan_snapshot_ok && echo true || echo false)"
  printf 'diff_check_ok=%s\n' "$($diff_check_ok && echo true || echo false)"
  printf 'workspace_state=%s\n' "$workspace_state"
  printf 'loose_root_count=%s\n' "$loose_root_count"
  if [[ "${#blockers[@]}" -gt 0 ]]; then
    local blocker
    for blocker in "${blockers[@]}"; do
      printf 'blocker=%s\n' "$blocker"
    done
  fi
}

cmd_doctor() {
  require_python
  local score="" validation_ok="" plan_snapshot_ok="" workspace_state="" loose_root_count="" diff_check_ok=""
  local blockers=() line key value

  while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    case "$key" in
      score) score="$value" ;;
      validation_ok) validation_ok="$value" ;;
      plan_snapshot_ok) plan_snapshot_ok="$value" ;;
      diff_check_ok) diff_check_ok="$value" ;;
      workspace_state) workspace_state="$value" ;;
      loose_root_count) loose_root_count="$value" ;;
      blocker) blockers+=("$value") ;;
    esac
  done < <(evaluate_release_readiness)

  echo ""
  echo -e "${CY}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CY}║  KHAOTIC LABS — KFMS DOCTOR              ║${NC}"
  echo -e "${CY}╚══════════════════════════════════════════╝${NC}"
  if (( score >= 85 )); then
    ok "release readiness score → ${score}/100"
  elif (( score >= 60 )); then
    warn "release readiness score → ${score}/100"
  else
    die "release readiness score → ${score}/100"
  fi

  ok "meta + derived consistency → $( [[ "$validation_ok" == "true" ]] && echo pass || echo fail )"
  ok "workspace classification → ${workspace_state}"
  ok "loose root files → ${loose_root_count}"
  ok "implementation plan snapshot marker → $( [[ "$plan_snapshot_ok" == "true" ]] && echo present || echo missing )"
  ok "diff hygiene → $( [[ "$diff_check_ok" == "true" ]] && echo pass || echo fail )"

  if [[ "${#blockers[@]}" -gt 0 ]]; then
    echo ""
    warn "Top blockers:"
    local blocker
    for blocker in "${blockers[@]}"; do
      warn "  - $blocker"
    done
  fi
  echo ""
}

cmd_release_plan() {
  require_python
  local score="" validation_ok="" plan_snapshot_ok="" workspace_state="" loose_root_count="" diff_check_ok=""
  local blockers=() line key value release_state exit_code=0
  local cargo_check_status="skipped" cargo_test_status="skipped" frontend_build_status="skipped"
  local release_score_adjustment=0
  local logs_dir="$ROOT/.loose/inbox/kfms-release-logs"
  local cargo_bin="" npm_bin=""
  mkdir -p "$logs_dir"

  while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    case "$key" in
      score) score="$value" ;;
      validation_ok) validation_ok="$value" ;;
      plan_snapshot_ok) plan_snapshot_ok="$value" ;;
      diff_check_ok) diff_check_ok="$value" ;;
      workspace_state) workspace_state="$value" ;;
      loose_root_count) loose_root_count="$value" ;;
      blocker) blockers+=("$value") ;;
    esac
  done < <(evaluate_release_readiness)

  info "Running release gates..."

  if [[ -f "$ROOT/src-tauri/Cargo.toml" ]]; then
    cargo_bin="$(resolve_command_path cargo || true)"
    if [[ -n "$cargo_bin" ]]; then
      if is_wsl_shell && is_windows_host_tool_path "$cargo_bin"; then
        cargo_check_status="host-shell-required"
        cargo_test_status="host-shell-required"
        release_score_adjustment=$((release_score_adjustment - 30))
        blockers+=("cargo is only available as a Windows-host tool from this shell. Run release-plan from PowerShell to execute Rust gates.")
      else
        if run_release_gate "$ROOT/src-tauri" "$logs_dir/cargo-check.log" "\"$cargo_bin\" check"; then
          cargo_check_status="pass"
        else
          cargo_check_status="fail"
          release_score_adjustment=$((release_score_adjustment - 25))
          blockers+=("cargo check failed. See .loose/inbox/kfms-release-logs/cargo-check.log")
        fi

        if run_release_gate "$ROOT/src-tauri" "$logs_dir/cargo-test.log" "\"$cargo_bin\" test"; then
          cargo_test_status="pass"
        else
          cargo_test_status="fail"
          release_score_adjustment=$((release_score_adjustment - 25))
          blockers+=("cargo test failed. See .loose/inbox/kfms-release-logs/cargo-test.log")
        fi
      fi
    else
      cargo_check_status="missing-tool"
      cargo_test_status="missing-tool"
      release_score_adjustment=$((release_score_adjustment - 30))
      blockers+=("cargo is not installed, so Rust release gates could not run.")
    fi
  fi

  if [[ -f "$ROOT/frontend/package.json" ]]; then
    npm_bin="$(resolve_command_path npm || true)"
    if [[ -n "$npm_bin" ]]; then
      if is_wsl_shell && is_windows_host_tool_path "$npm_bin"; then
        frontend_build_status="host-shell-required"
        release_score_adjustment=$((release_score_adjustment - 20))
        blockers+=("npm is only available as a Windows-host tool from this shell. Run release-plan from PowerShell to execute the frontend build gate.")
      else
        if run_release_gate "$ROOT" "$logs_dir/frontend-build.log" "\"$npm_bin\" run --prefix frontend build"; then
          frontend_build_status="pass"
        else
          frontend_build_status="fail"
          release_score_adjustment=$((release_score_adjustment - 20))
          blockers+=("frontend build failed. See .loose/inbox/kfms-release-logs/frontend-build.log")
        fi
      fi
    else
      frontend_build_status="missing-tool"
      release_score_adjustment=$((release_score_adjustment - 20))
      blockers+=("npm is not installed, so the frontend release gate could not run.")
    fi
  fi

  score=$((score + release_score_adjustment))
  (( score < 0 )) && score=0

  if (( score >= 85 )) && [[ "$validation_ok" == "true" ]] && [[ "$plan_snapshot_ok" == "true" ]] && [[ "$diff_check_ok" == "true" ]] && [[ "$workspace_state" == "clean" ]] && [[ "$loose_root_count" == "0" ]] && [[ "$cargo_check_status" == "pass" ]] && [[ "$cargo_test_status" == "pass" ]] && [[ "$frontend_build_status" == "pass" ]]; then
    release_state="GO"
  elif (( score >= 60 )); then
    release_state="HOLD"
  else
    release_state="NO-GO"
  fi

  echo ""
  echo -e "${CY}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CY}║  KHAOTIC LABS — KFMS RELEASE PLAN        ║${NC}"
  echo -e "${CY}╚══════════════════════════════════════════╝${NC}"
  if [[ "$release_state" == "GO" ]]; then
    ok "release decision → ${release_state}"
  elif [[ "$release_state" == "HOLD" ]]; then
    warn "release decision → ${release_state}"
  else
    warn "release decision → ${release_state}"
    exit_code=1
  fi
  ok "readiness score  → ${score}/100"
  ok "metadata         → $( [[ "$validation_ok" == "true" ]] && echo aligned || echo blocked )"
  ok "plan snapshot    → $( [[ "$plan_snapshot_ok" == "true" ]] && echo present || echo missing )"
  ok "diff hygiene     → $( [[ "$diff_check_ok" == "true" ]] && echo pass || echo fail )"
  ok "workspace state  → ${workspace_state}"
  ok "loose root files → ${loose_root_count}"
  ok "cargo check      → ${cargo_check_status}"
  ok "cargo test       → ${cargo_test_status}"
  ok "frontend build   → ${frontend_build_status}"

  echo ""
  if [[ "${#blockers[@]}" -eq 0 ]]; then
    ok "top blockers     → none"
  else
    warn "top blockers:"
    local blocker
    for blocker in "${blockers[@]}"; do
      warn "  - $blocker"
    done
  fi
  echo ""
  return "$exit_code"
}

cmd_bump() {
  local kind="${1:-}"
  local dry_run=false
  [[ "${2:-}" == "--dry-run" ]] && dry_run=true
  [[ -n "$kind" && "$kind" != "--dry-run" ]] || die "Usage: ./scripts/khaotic-init.sh bump <patch|minor|major> [--dry-run]"
  require_python
  [[ -f "$META" ]] || die "infra/meta/meta.json not found."

  info "Bumping KFMS version: $kind"

  local next_version next_codename next_tag
  mapfile -t _kfms_bump_preview < <("$PY_BIN" - "$META" "$kind" <<'PYEOF'
import json
import sys
from pathlib import Path

REGISTRY = [
    "Anubis", "Thoth", "Ra", "Isis", "Osiris", "Horus", "Bastet", "Sekhmet",
    "Ptah", "Hathor", "Set", "Sobek", "Khonsu", "Maat", "Amun", "Nephthys",
    "Atum", "Anuket", "Khepri", "Taweret",
]

meta_path, kind = sys.argv[1:]
data = json.loads(Path(meta_path).read_text(encoding="utf-8"))
major, minor, patch = map(int, data["version"].split("."))

if kind == "patch":
    patch += 1
elif kind == "minor":
    minor += 1
    patch = 0
elif kind == "major":
    major += 1
    minor = 0
    patch = 0
else:
    raise SystemExit("bump kind must be patch, minor, or major")

if minor >= len(REGISTRY):
    raise SystemExit(f"minor line {minor} exceeds KFMS registry length")

codename = REGISTRY[minor]
version = f"{major}.{minor}.{patch}"
print(version)
print(codename)
print(f"v{version}-{codename.lower()}")
PYEOF
)

  next_version="${_kfms_bump_preview[0]:-}"
  next_codename="${_kfms_bump_preview[1]:-}"
  next_tag="${_kfms_bump_preview[2]:-}"

  if $dry_run; then
    ok "Dry run:"
    ok "  next version: $next_version"
    ok "  next codename: $next_codename"
    ok "  next tag: $next_tag"
    return 0
  fi

  "$PY_BIN" - "$META" "$next_version" "$next_codename" "$next_tag" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, version, codename, tag = sys.argv[1:]
data = json.loads(Path(meta_path).read_text(encoding="utf-8"))
_, minor, _ = map(int, version.split("."))
data["version"] = version
data["codename"]["name"] = codename
data["codename"]["minor_line"] = minor
data["codename"]["registry_index"] = minor
data["tag"] = tag
Path(meta_path).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PYEOF

  cmd_sync
  cmd_stamp
  cmd_sync
  cmd_validate

  ok "Version bump complete:"
  ok "  version: $(render_meta_field version)"
  ok "  codename: $(render_meta_field codename.name)"
  ok "  tag: $(render_meta_field tag)"
}

CMD="${1:-help}"

case "$CMD" in
  sweep)    cmd_sweep ;;
  stamp)    cmd_stamp ;;
  sync)     cmd_sync ;;
  validate) cmd_validate "${2:-}" ;;
  status)   cmd_status ;;
  doctor)   cmd_doctor ;;
  release-plan) cmd_release_plan ;;
  bump)     cmd_bump "${@:2}" ;;
  *)
    echo ""
    echo "  Usage: ./scripts/khaotic-init.sh <command>"
    echo ""
    echo "  Commands:"
    echo "    sweep           Move loose root files to .loose/inbox/"
    echo "    stamp           Re-stamp build block in infra/meta/meta.json"
    echo "    sync            Regenerate derived KFMS artifacts from meta.json"
    echo "    validate        Validate meta.json and derived artifacts"
    echo "    status          Print KFMS health summary"
    echo "    doctor          Print release-readiness and blocker summary"
    echo "    release-plan    Run build/test gates and print ship/no-ship decision"
    echo "    bump patch      Bump PATCH and refresh derived artifacts"
    echo "    bump minor      Bump MINOR/codename and refresh derived artifacts"
    echo "    bump major      Bump MAJOR and reset codename line"
    echo "    bump ... --dry-run  Preview the version/codename/tag transition"
    echo ""
    ;;
esac
