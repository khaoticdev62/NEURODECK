#!/usr/bin/env bash
# =============================================================================
# khaotic-init.sh — KFMS v1.0 Repository Bootstrap & Hygiene Utility
#
# Usage:
#   ./scripts/kfms/khaotic-init.sh sweep        — move loose root files to .loose/inbox/
#   ./scripts/kfms/khaotic-init.sh stamp        — regenerate infra/meta/meta.json build block
#   ./scripts/kfms/khaotic-init.sh sync         — regenerate derived KFMS artifacts from meta.json
#   ./scripts/kfms/khaotic-init.sh validate     — validate meta.json and derived artifact consistency
#   ./scripts/kfms/khaotic-init.sh status       — print current KFMS health summary
#   ./scripts/kfms/khaotic-init.sh release-plan — delegate to native Windows release runner when available
#   ./scripts/kfms/khaotic-init.sh build [args] — build release installers via scripts/powershell/build.ps1
#                                                  args: -Target win|appimage|all  -SkipGate  -CleanBuild
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

resolve_powershell() {
  if command -v powershell.exe &>/dev/null; then
    echo "powershell.exe"
  elif command -v powershell &>/dev/null; then
    echo "powershell"
  elif command -v pwsh &>/dev/null; then
    echo "pwsh"
  else
    return 1
  fi
}

is_wsl_shell() {
  [[ -n "${WSL_INTEROP:-}" ]] || [[ -n "${WSL_DISTRO_NAME:-}" ]] || grep -qi microsoft /proc/version 2>/dev/null
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
    -not -name "install.sh" \
    -not -name "launch_gamescope.sh" \
    -not -name "package_release.ps1" \
    -not -name "epics.md" \
    -not -name "gemini.md" \
    -not -name "GEMINI.md" \
    -not -name "AGENTS.md" \
    -not -name "LICENSE" \
    -not -name "deny.toml" \
    -not -name "rustfmt.toml" \
    -not -name ".editorconfig" \
    -not -name ".env.example" \
    -not -name ".prettierignore" \
    -not -name ".prettierrc" \
    -not -name "clippy.toml" \
    -not -name "neurodeck_win_release.zip" \
    -not -name "neurodeck_installer.exe" \
    -not -name "neurodeck_1.3.0_amd64.AppImage" \
    -not -name "pyproject.toml" \
    -not -name "uv.lock" \
    -not -name ".fallowrc.json" \
    -not -name "electron-builder.yml" \
    -not -name "tsconfig.json" \
    -not -name "vitest.config.ts" \
    -not -name "ui-checkpoints.json" \
    -not -name "NEURODECK_DEEP_COSMETIC_UI_ENHANCEMENT_AAAA_PASS_PROMPT.md" \
    -not -name "NEURODECK_E2E_UI_UX_Audit_Cleanup_Refactor_Prompt.md" \
    -not -name "NEURODECK_Onboarding_Wizard_Upgrade_PRD.md" \
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

# ---------------------------------------------------------------------------
# Essential root files — never swept into .loose/
# These are project manifests and tracked source files.
# ---------------------------------------------------------------------------
PRESERVE=(
  ".gitignore"
  ".gitattributes"
  "README.md"
  "CLAUDE.md"
  "ROADMAP.md"
  "Cargo.toml"
  "Cargo.lock"
  "package.json"
  "package-lock.json"
  "llm-term.toml"
  "install.sh"
  "launch_gamescope.sh"
  "electron-builder.yml"
  ".fallowrc.json"
  "package_release.ps1"
  "epics.md"
  "GEMINI.md"
  "gemini.md"
  "AGENTS.md"
  "pyproject.toml"
  "uv.lock"
  "rustfmt.toml"
  "deny.toml"
  ".editorconfig"
  ".env.example"
  ".prettierignore"
  ".prettierrc"
  "LICENSE"
  "clippy.toml"
  "tsconfig.json"
  "vitest.config.ts"
  "ui-checkpoints.json"
  "NEURODECK_DEEP_COSMETIC_UI_ENHANCEMENT_AAAA_PASS_PROMPT.md"
  "NEURODECK_E2E_UI_UX_Audit_Cleanup_Refactor_Prompt.md"
  "NEURODECK_Onboarding_Wizard_Upgrade_PRD.md"
  "neurodeck_win_release.zip"
  "neurodeck_installer.exe"
  "neurodeck_1.3.0_amd64.AppImage"
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
  local dry_run=false
  for arg in "$@"; do
    [[ "$arg" == "--dry-run" ]] && dry_run=true
  done

  if $dry_run; then
    info "KFMS sweep (dry-run) — scanning for loose root-level files..."
  else
    info "Running KFMS sweep — scanning for loose root-level files..."
    mkdir -p "$ROOT/.loose/inbox"
  fi

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

    if $dry_run; then
      info "  would sweep → .loose/inbox/$name"
    else
      # Move to .loose/inbox/
      local dest="$ROOT/.loose/inbox/$name"
      # Avoid overwrite collision — append timestamp suffix
      if [[ -e "$dest" ]]; then
        dest="$ROOT/.loose/inbox/${name%.}_$(date -u +%s).bak"
      fi

      mv "$entry" "$dest"
      warn "  swept → .loose/inbox/$name"
    fi
    (( moved++ )) || true

  done < <(find "$ROOT" -maxdepth 1 -not -name ".*" -not -path "$ROOT" -print0 | sort -z)

  # Also sweep hidden loose files (not hidden dirs we preserve)
  while IFS= read -r -d '' entry; do
    local name
    name="$(basename "$entry")"
    [[ -d "$entry" ]] && continue
    # Skip .git, .gitignore, .gitattributes
    [[ "$name" == ".gitignore" || "$name" == ".gitattributes" || "$name" == ".git" ]] && continue

    # Skip preserved filenames
    local preserve=false
    for pf in "${PRESERVE[@]}"; do
      [[ "$name" == "$pf" ]] && preserve=true && break
    done
    $preserve && { (( skipped++ )) || true; continue; }

    if $dry_run; then
      info "  would sweep (hidden) → .loose/inbox/$name"
    else
      mv "$entry" "$ROOT/.loose/inbox/$name" 2>/dev/null || true
      warn "  swept (hidden) → .loose/inbox/$name"
    fi
    (( moved++ )) || true
  done < <(find "$ROOT" -maxdepth 1 -name ".*" -not -name ".git" \
    -not -name ".github" -not -name ".loose" -not -name ".cursor" \
    -not -name ".playwright-mcp" -not -type d -print0 2>/dev/null | sort -z)

  if $dry_run; then
    ok "Dry-run complete. Would move: $moved  |  Would preserve/skip: $skipped"
  else
    ok "Sweep complete. Moved: $moved  |  Preserved/skipped: $skipped"
    ok "Loose files are in: .loose/inbox/ (git-ignored)"
  fi
}

# ---------------------------------------------------------------------------
# cmd: stamp
# Re-stamps the build block in infra/meta/meta.json with current git state.
# Does NOT change version, codename, or any governance fields.
# Security: only stamps sha, tag, timestamp, dirty — never credentials.
# ---------------------------------------------------------------------------
cmd_stamp() {
  local meta="$ROOT/infra/meta/meta.json"
  [[ -f "$meta" ]] || die "infra/meta/meta.json not found. Run: ./scripts/kfms/khaotic-init.sh init"

  info "Stamping build block in meta.json..."

  local sha dirty_flag git_tag built_at
  sha=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
  # Exclude KFMS-managed artifacts from the dirty check — they're updated by the
  # post-commit hook itself, so their presence in the working tree is expected.
  dirty_flag=false
  local non_kfms_changes
  non_kfms_changes=$(git -C "$ROOT" status --porcelain 2>/dev/null | \
    grep -v '^.. infra/meta/meta\.json$' | \
    grep -v '^.. infra/telemetry/health\.json$' | \
    grep -v '^.. infra/meta/CODENAME_REGISTRY\.md$' | \
    grep -v '^.. docs/IMPLEMENTATION_PLAN\.md$' || true)
  [[ -n "$non_kfms_changes" ]] && dirty_flag=true
  git_tag=$(git -C "$ROOT" tag --points-at HEAD 2>/dev/null | head -1 || echo "null")
  [[ -z "$git_tag" ]] && git_tag="null"
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

  # Always sync derived artifacts so health.json stamped_at_utc
  # stays consistent with meta.json built_at_utc. Without this,
  # running stamp in CI (without the post-commit hook chain) leaves
  # health.json stale and the subsequent validate step fails.
  cmd_sync
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
  local plan="$ROOT/docs/IMPLEMENTATION_PLAN.md"
  local py_bin=""
  local schema_valid=false
  local loose_zone_isolated=false
  local workspace_state

  [[ -f "$meta" ]] || die "infra/meta/meta.json not found."
  [[ -f "$registry" ]] || die "infra/meta/CODENAME_REGISTRY.md not found."
  [[ -f "$plan" ]] || die "docs/IMPLEMENTATION_PLAN.md not found."

  py_bin=$(resolve_python 2>/dev/null || true)
  [[ -n "$py_bin" ]] || die "python3 or python required for sync command."

  if KFMS_SKIP_RELEASE_PLAN_CHECK=1 cmd_validate >/dev/null 2>&1; then
    schema_valid=true
  fi
  [[ -d "$ROOT/.loose/inbox" ]] && [[ "$(count_loose_root_files)" == "0" ]] && loose_zone_isolated=true
  workspace_state=$(derive_workspace_state)

  info "Syncing derived KFMS artifacts from meta.json..."

  "$py_bin" - "$meta" "$health" "$registry" "$plan" "$schema_valid" "$loose_zone_isolated" "$workspace_state" <<'PYEOF'
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
existing_health = {}
if Path(health_path).exists():
    existing_health = json.loads(Path(health_path).read_text(encoding="utf-8-sig"))
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
if isinstance(existing_health.get("release_plan"), dict):
    health["release_plan"] = existing_health["release_plan"]
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
    ajv validate -s "$schema" -d "$meta" --spec=draft7 --strict=false && ok "meta.json passes schema validation." || \
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
import os

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
policy = gov.get("release_policy")
if not isinstance(policy, dict):
    errors.append("governance.release_policy must be present and structured")
else:
    if not isinstance(policy.get("go_threshold"), int):
        errors.append("governance.release_policy.go_threshold must be an integer")
    if not isinstance(policy.get("hold_threshold"), int):
        errors.append("governance.release_policy.hold_threshold must be an integer")
    if isinstance(policy.get("go_threshold"), int) and isinstance(policy.get("hold_threshold"), int):
        if policy["hold_threshold"] > policy["go_threshold"]:
            errors.append("governance.release_policy.hold_threshold must be <= go_threshold")
    penalties = policy.get("penalties")
    expected_penalties = ["metadata", "diff_hygiene", "workspace_state", "loose_root_files", "cargo_check", "cargo_test", "frontend_build"]
    if not isinstance(penalties, dict):
        errors.append("governance.release_policy.penalties must be an object")
    else:
        for key in expected_penalties:
            if key not in penalties or not isinstance(penalties.get(key), int):
                errors.append(f"governance.release_policy.penalties.{key} must be an integer")

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
    "$py_bin" - "$meta" "$ROOT/infra/telemetry/health.json" "$ROOT/infra/meta/CODENAME_REGISTRY.md" "$ROOT/docs/IMPLEMENTATION_PLAN.md" <<'PYEOF'
import json
import os
import sys
from pathlib import Path

meta_path, health_path, registry_path, plan_path = sys.argv[1:]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))

if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8-sig"))
    if health.get("version") != meta.get("version"):
        raise SystemExit("health.json version does not match meta.json")
    if health.get("codename") != meta.get("codename", {}).get("name"):
        raise SystemExit("health.json codename does not match meta.json")
    if health.get("tag") != meta.get("tag"):
        raise SystemExit("health.json tag does not match meta.json")
    if health.get("stamped_at_utc") != meta.get("build", {}).get("built_at_utc"):
        raise SystemExit("health.json stamped_at_utc does not match meta.json")
    if os.getenv("KFMS_SKIP_RELEASE_PLAN_CHECK") != "1" and health.get("release_plan"):
        policy = meta.get("studio", {}).get("governance", {}).get("release_policy")
        if health["release_plan"].get("policy") != policy:
            raise SystemExit("health.json release_plan policy does not match meta.json")

registry_text = Path(registry_path).read_text(encoding="utf-8")
expected_tag = meta.get("tag")
expected_codename = meta.get("codename", {}).get("name")
expected_version = meta.get("version")
expected_stamped_at = meta.get("build", {}).get("built_at_utc")
for expected in (expected_version, expected_codename, expected_tag, expected_stamped_at):
    if expected and expected not in registry_text:
        raise SystemExit(f"codename registry is not synced to meta.json: missing {expected}")

plan_text = Path(plan_path).read_text(encoding="utf-8")
for expected in (expected_version, expected_codename, expected_tag, expected_stamped_at):
    if expected and expected not in plan_text:
        raise SystemExit(f"implementation plan snapshot is not synced to meta.json: missing {expected}")
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
    local json_mode=false
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --json|-j) json_mode=true ;;
      esac
      shift || true
    done

    local ver codename tag dirty stamped workspace health_status release_decision release_score release_gates
    read -r ver codename tag dirty stamped workspace health_status < <("$py_bin" - "$meta" "$health" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, health_path = sys.argv[1:]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
health_status = "missing"
workspace = "unknown"
if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8-sig"))
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
    read -r release_decision release_score release_gates < <("$py_bin" - "$health" <<'PYEOF'
import json
import sys
from pathlib import Path

health_path = sys.argv[1]
release = {}
if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8-sig"))
    release = health.get("release_plan", {})
print(
    release.get("release_decision", "unknown"),
    release.get("readiness_score", "unknown"),
    release.get("gate_summary", "unknown"),
)
PYEOF
)
    if $json_mode; then
      "$py_bin" - "$meta" "$health" <<'PYEOF'
import json
import sys
from pathlib import Path

meta_path, health_path = sys.argv[1:3]
meta = json.loads(Path(meta_path).read_text(encoding="utf-8"))
health = {}
if Path(health_path).exists():
    health = json.loads(Path(health_path).read_text(encoding="utf-8-sig"))
summary = {
    "version": meta.get("version"),
    "codename": meta.get("codename", {}).get("name"),
    "tag": meta.get("tag"),
    "build": meta.get("build", {}),
    "status": health.get("status", "unknown"),
    "workspace_state": health.get("workspace_state", "unknown"),
    "release_plan": health.get("release_plan", {}),
    "checks": health.get("checks", {}),
}
print(json.dumps(summary, indent=2))
PYEOF
      return 0
    fi
    health_status="${health_status//$'\r'/}"
    workspace="${workspace//$'\r'/}"
    dirty="${dirty//$'\r'/}"
    release_decision="${release_decision//$'\r'/}"
    release_score="${release_score//$'\r'/}"
    release_gates="${release_gates//$'\r'/}"
    ok "meta.json  → v${ver:-?} | ${codename:-?} | ${tag:-?}"
    ok "build      → dirty=${dirty:-?} | workspace=${workspace:-?} | stamped=${stamped:-?}"
    if [[ "$health_status" == "healthy" ]]; then
      ok "health     → ${health_status}"
    else
      warn "health     → ${health_status}"
    fi
    if [[ "$release_decision" != "unknown" ]]; then
      ok "release    → ${release_decision} | score=${release_score} | gates=${release_gates}"
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
# cmd: release-plan
# Delegates to the native Windows PowerShell runner when available.
# ---------------------------------------------------------------------------
cmd_release_plan() {
  local ps_bin=""
  local ps_script="$ROOT/scripts/kfms/kfms-release-plan.ps1"
  local ps_script_arg="$ps_script"
  ps_bin=$(resolve_powershell 2>/dev/null || true)
  [[ -n "$ps_bin" ]] || die "PowerShell is required for release-plan. Run scripts/kfms/kfms-release-plan.ps1 from Windows PowerShell."
  [[ -f "$ps_script" ]] || die "scripts/kfms/kfms-release-plan.ps1 not found."

  if is_wsl_shell && command -v wslpath &>/dev/null; then
    ps_script_arg="$(wslpath -w "$ps_script")"
    if [[ "$ps_bin" == *".exe" || "$ps_bin" == *"/mnt/"* ]]; then
      die "release-plan requires a native Windows shell from WSL. Run: powershell -ExecutionPolicy Bypass -File scripts/kfms/kfms-release-plan.ps1"
    fi
  fi

  if [[ "$ps_bin" == "pwsh" ]]; then
    "$ps_bin" -NoProfile -ExecutionPolicy Bypass -File "$ps_script_arg" "$@"
  else
    "$ps_bin" -NoProfile -ExecutionPolicy Bypass -File "$ps_script_arg" "$@"
  fi
}

# ---------------------------------------------------------------------------
# cmd: build
# Delegates to scripts/powershell/build.ps1 — the unified release builder.
# Produces Windows NSIS installer + ZIP and/or Steam Deck AppImage.
#
# Usage:
#   ./scripts/kfms/khaotic-init.sh build
#   ./scripts/kfms/khaotic-init.sh build -Target win
#   ./scripts/kfms/khaotic-init.sh build -Target appimage
#   ./scripts/kfms/khaotic-init.sh build -SkipGate -CleanBuild -Verbose
#
# Requires PowerShell (Windows or WSL with powershell.exe bridged).
# The build.ps1 script auto-detects WSL for the AppImage target.
# ---------------------------------------------------------------------------
cmd_build() {
  local ps_bin=""
  local ps_script="$ROOT/scripts/powershell/build.ps1"
  local ps_script_arg="$ps_script"

  ps_bin=$(resolve_powershell 2>/dev/null || true)
  [[ -n "$ps_bin" ]] || die "PowerShell is required for build. Run scripts/powershell/build.ps1 from Windows PowerShell."
  [[ -f "$ps_script" ]] || die "scripts/powershell/build.ps1 not found. Verify the unified build orchestrator exists."

  # In WSL: convert to Windows path so PowerShell can resolve it
  if is_wsl_shell && command -v wslpath &>/dev/null; then
    ps_script_arg="$(wslpath -w "$ps_script")"
  fi

  info "Delegating to unified build orchestrator..."
  info "  Script: $ps_script"
  info "  Args:   $*"
  echo ""

  "$ps_bin" -NoProfile -ExecutionPolicy Bypass -File "$ps_script_arg" "$@"
  local exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    ok "Build complete. Artifacts in dist/"
  else
    die "Build failed with exit code $exit_code. Check .loose/inbox/build-logs/ for details."
  fi
}

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
CMD="${1:-help}"

case "$CMD" in
  sweep)        shift; cmd_sweep "$@"        ;;
  stamp)        cmd_stamp                   ;;
  sync)         cmd_sync                    ;;
  validate)     cmd_validate                ;;
  status)       shift; cmd_status "$@"      ;;
  release-plan) shift; cmd_release_plan "$@" ;;
  build)        shift; cmd_build "$@"       ;;
  *)
    echo ""
    echo "  Usage: ./scripts/kfms/khaotic-init.sh <command> [args]"
    echo ""
    echo "  Commands:"
    echo "    sweep [--dry-run]   Move loose root files to .loose/inbox/"
    echo "    stamp               Re-stamp build block in infra/meta/meta.json"
    echo "    sync                Regenerate derived KFMS artifacts from meta.json"
    echo "    validate            Validate meta.json against schema"
    echo "    status              Print KFMS health summary"
    echo "    release-plan        Run KFMS release gate (delegates to kfms-release-plan.ps1)"
    echo "    build [-Target win|appimage|all] [-SkipGate] [-CleanBuild] [-Verbose]"
    echo "                        Build release installers (delegates to build.ps1)"
    echo ""
    ;;
esac
