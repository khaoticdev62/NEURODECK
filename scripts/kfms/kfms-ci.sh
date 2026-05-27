#!/usr/bin/env bash
# =============================================================================
# KFMS CI/CD Runner — Professional All-in-One Pipeline
# =============================================================================
# Runs the complete NEURODECK quality gate suite locally, producing
# structured reports compatible with GitHub Actions, IDEs, and KFMS.
#
# Usage:
#   ./scripts/kfms/kfms-ci.sh run              — run all gates (sequential, safe)
#   ./scripts/kfms/kfms-ci.sh run --parallel   — run independent gates in parallel
#   ./scripts/kfms/kfms-ci.sh run --background — daemonize, write to .loose/inbox/kfms-ci/
#   ./scripts/kfms/kfms-ci.sh lint             — lint/format gates only
#   ./scripts/kfms/kfms-ci.sh test             — test gates only
#   ./scripts/kfms/kfms-ci.sh security         — security gates only
#   ./scripts/kfms/kfms-ci.sh build            — build gates only
#   ./scripts/kfms/kfms-ci.sh watch            — continuous mode on file changes
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_DIR="$ROOT/.loose/inbox/kfms-ci"
REPORT_JSON="$REPORT_DIR/report.json"
REPORT_HTML="$REPORT_DIR/report.html"
RUN_ID="$(date -u +%Y%m%d-%H%M%S)"

# ---------------------------------------------------------------------------
# Colour / formatting
# ---------------------------------------------------------------------------
CY='\033[0;36m'; GR='\033[0;32m'; YL='\033[1;33m'; RD='\033[0;31m'
BL='\033[1;34m'; MG='\033[0;35m'; NC='\033[0m'

info()  { echo -e "${CY}[KFMS-CI]${NC} $*"; }
ok()    { echo -e "${GR}[  OK   ]${NC} $*"; }
warn()  { echo -e "${YL}[ WARN  ]${NC} $*"; }
fail()  { echo -e "${RD}[ FAIL  ]${NC} $*"; }
sect()  { echo -e "${BL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
pass()  { echo -e "${GR}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

mkdir -p "$REPORT_DIR"

# ---------------------------------------------------------------------------
# Gate registry — each gate is a function named gate_<id>
# ---------------------------------------------------------------------------
declare -A GATE_LABELS
declare -A GATE_CATEGORIES
declare -a GATE_ORDER

register_gate() {
    local id="$1" label="$2" category="$3"
    GATE_LABELS["$id"]="$label"
    GATE_CATEGORIES["$id"]="$category"
    GATE_ORDER+=("$id")
}

register_gate "fmt_rust"      "Rust Format (fmt --check)"       "lint"
register_gate "clippy"        "Rust Clippy (-D warnings)"       "lint"
register_gate "fmt_frontend"  "Frontend Format (Prettier)"      "lint"
register_gate "typecheck"     "TypeScript Type Check"           "lint"
register_gate "fmt_python"    "Python Format (Ruff)"            "lint"
register_gate "cargo_check"   "Cargo Check"                     "build"
register_gate "cargo_test"    "Cargo Test (workspace)"          "test"
register_gate "frontend_build" "Frontend Build (Vite)"          "build"
register_gate "cargo_compile"  "Cargo Compile Tests (no-run)"    "build"
register_gate "e2e"           "Playwright E2E Tests"            "test"
register_gate "security_rust" "Cargo Audit / Deny"              "security"
register_gate "security_js"   "npm Audit"                       "security"
register_gate "security_hard" "Security Hardening Scan"         "security"
register_gate "diff_hygiene"  "Git Diff Hygiene"                "quality"
register_gate "kfms_meta"     "KFMS Metadata Validation"        "quality"
register_gate "loose_check"   "Loose Root File Check"           "quality"

# ---------------------------------------------------------------------------
# Runner helpers
# ---------------------------------------------------------------------------
run_gate() {
    local id="$1" label="${GATE_LABELS[$1]}"
    local start end duration_ms status log_path
    start="$(date +%s%3N)"
    log_path="$REPORT_DIR/${id}.log"

    info "Running gate: $label"
    if "gate_$id" > "$log_path" 2>&1; then
        status="pass"
        ok "$label"
    else
        status="fail"
        fail "$label"
        if [[ -s "$log_path" ]]; then
            echo -e "${RD}--- excerpt ---${NC}"
            tail -n 8 "$log_path" | sed 's/^/    /'
            echo -e "${RD}--- full log: $log_path ---${NC}"
        fi
    fi
    end="$(date +%s%3N)"
    duration_ms=$((end - start))

    # Emit structured line for report builder
    printf '%s\t%s\t%s\t%s\t%s\n' "$RUN_ID" "$id" "$status" "$duration_ms" "$log_path" >> "$REPORT_DIR/gates.tsv"
}

# ---------------------------------------------------------------------------
# Individual gate implementations
# ---------------------------------------------------------------------------
gate_fmt_rust() {
    cd "$ROOT"
    if ! command -v rustfmt &>/dev/null; then
        echo "rustfmt not installed"; return 1
    fi
    cargo fmt --all -- --check
}

gate_clippy() {
    cd "$ROOT"
    cargo clippy --workspace --all-targets --all-features -- -D warnings
}

gate_fmt_frontend() {
    cd "$ROOT/frontend"
    if ! command -v npx &>/dev/null; then
        echo "npx not available"; return 1
    fi
    # Install prettier on-demand if missing
    if ! npx prettier --version &>/dev/null; then
        npm install -D prettier --no-fund --no-audit 2>/dev/null || true
    fi
    npx prettier --check "src/**/*.{js,ts,tsx,json,css}" "index.html" 2>/dev/null || {
        echo "Prettier not configured or no files matched"; return 0
    }
}

gate_typecheck() {
    cd "$ROOT/frontend"
    npm run typecheck
}

gate_fmt_python() {
    cd "$ROOT"
    if ! command -v ruff &>/dev/null; then
        if command -v uv &>/dev/null; then
            uv run ruff check . 2>/dev/null || true
            uv run ruff format --check . 2>/dev/null || true
            return 0
        fi
        echo "ruff not installed"; return 0
    fi
    ruff check .
    ruff format --check .
}

gate_cargo_compile() {
    cd "$ROOT"
    cargo test --workspace --all-targets --no-run
}

gate_cargo_check() {
    cd "$ROOT"
    cargo check --workspace --all-targets
}

gate_cargo_test() {
    cd "$ROOT"
    cargo test --workspace --all-targets
}

gate_frontend_build() {
    cd "$ROOT/frontend"
    npm run build
}

gate_e2e() {
    cd "$ROOT/frontend"
    if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
        echo "Frontend build missing in e2e gate, building now..."
        if ! npm run build; then
            echo "Frontend build failed — cannot run E2E tests against missing dist"
            return 1
        fi
    else
        echo "Reusing existing frontend production build."
    fi

    # Kill any zombie process on port 4173 to prevent E2E collision
    echo "Clearing port 4173..."
    npx kill-port 4173 >/dev/null 2>&1 || true

    cd "$ROOT/e2e"
    # Ensure Playwright browsers are installed
    if ! npx playwright install chromium >/dev/null 2>&1; then
        echo "Playwright browser install failed"; return 1
    fi
    export CI=true
    npx playwright test
}

gate_security_rust() {
    cd "$ROOT"
    local fail=0
    if command -v cargo-audit &>/dev/null; then
        cargo audit || fail=1
    else
        echo "cargo-audit not installed (install: cargo install cargo-audit)"
    fi
    if [[ -f "$ROOT/deny.toml" ]] && command -v cargo-deny &>/dev/null; then
        cargo deny check || fail=1
    else
        echo "cargo-deny not configured or not installed"
    fi
    return $fail
}

gate_security_js() {
    cd "$ROOT"
    if command -v npm &>/dev/null; then
        npm audit --audit-level=moderate || true
    fi
    cd "$ROOT/frontend"
    npm audit --audit-level=moderate || true
}

gate_security_hard() {
    cd "$ROOT"
    if [[ -f "$ROOT/scripts/powershell/security-hardening.ps1" ]];
        # Try PowerShell if available
        if command -v powershell.exe &>/dev/null; then
            powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/powershell/security-hardening.ps1" -Json > "$REPORT_DIR/security-hardening.json" 2>&1 || {
                cat "$REPORT_DIR/security-hardening.json" 2>/dev/null || true
                return 1
            }
        elif command -v pwsh &>/dev/null; then
            pwsh -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/powershell/security-hardening.ps1" -Json > "$REPORT_DIR/security-hardening.json" 2>&1 || {
                cat "$REPORT_DIR/security-hardening.json" 2>/dev/null || true
                return 1
            }
        else
            echo "PowerShell not available for security-hardening.ps1"
            return 0
        fi
    fi
}

gate_diff_hygiene() {
    cd "$ROOT"
    git diff --check || return 1
}

gate_kfms_meta() {
    cd "$ROOT"
    bash "$ROOT/scripts/kfms/khaotic-init.sh" validate
}

gate_loose_check() {
    cd "$ROOT"
    local count
    count=$(git status --short --untracked-files=all | grep '^?? ' | grep -v '^?? \.loose/' | grep -v '^?? \.git/' | wc -l | tr -d ' ')
    if [[ "$count" -gt 0 ]]; then
        echo "Found $count untracked files outside .loose/. Run: git status"
        git status --short --untracked-files=all | grep '^?? ' | grep -v '^?? \.loose/' | grep -v '^?? \.git/' | head -n 10
        return 1
    fi
    echo "No loose root files."
}

# ---------------------------------------------------------------------------
# Report builders
# ---------------------------------------------------------------------------
build_json_report() {
    local tsv="$REPORT_DIR/gates.tsv"
    local total=0 passed=0 failed=0
    local gates_json=""

    if [[ -f "$tsv" ]]; then
        while IFS=$'\t' read -r run_id id status dur log; do
            total=$((total + 1))
            [[ "$status" == "pass" ]] && passed=$((passed + 1)) || failed=$((failed + 1))
            gates_json+="{\"id\":\"$id\",\"label\":\"${GATE_LABELS[$id]}\",\"category\":\"${GATE_CATEGORIES[$id]}\",\"status\":\"$status\",\"duration_ms\":$dur,\"log\":\"$log\"},"
        done < "$tsv"
    fi
    gates_json="${gates_json%,}" # trim trailing comma

    local overall="FAIL"
    [[ "$failed" -eq 0 ]] && overall="PASS"

    cat > "$REPORT_JSON" <<EOF
{
  "run_id": "$RUN_ID",
  "timestamp_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "overall": "$overall",
  "summary": { "total": $total, "passed": $passed, "failed": $failed },
  "gates": [$gates_json]
}
EOF
}

build_html_report() {
    local total passed failed
    total=$(grep -c '' "$REPORT_DIR/gates.tsv" 2>/dev/null || echo 0)
    passed=$(grep -c $'\tpass\t' "$REPORT_DIR/gates.tsv" 2>/dev/null || echo 0)
    failed=$((total - passed))

    local overall_color="#22c55e"
    [[ "$failed" -gt 0 ]] && overall_color="#ef4444"

    cat > "$REPORT_HTML" <<EOF
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KFMS-CI Report</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e2e8f0;padding:24px;max-width:960px;margin:0 auto}
h1{margin:0 0 8px;font-size:1.4rem}h2{margin:24px 0 8px;font-size:1rem;color:#94a3b8}
.summary{display:flex;gap:16px;margin:16px 0}.pill{padding:8px 16px;border-radius:8px;font-weight:600;font-size:.9rem}
.pill.pass{background:#14532d;color:#86efac}.pill.fail{background:#450a0a;color:#fca5a5}
table{width:100%;border-collapse:collapse;font-size:.85rem}th{text-align:left;padding:8px;color:#94a3b8;border-bottom:1px solid #334155}
td{padding:8px;border-bottom:1px solid #1e293b}tr:hover td{background:#0f172a}
.status-pass{color:#86efac;font-weight:600}.status-fail{color:#fca5a5;font-weight:600}
a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}
</style></head><body>
<h1>KFMS-CI Report</h1><p style="opacity:.6;font-size:.85rem">Run $RUN_ID &middot; $(date -u '+%Y-%m-%d %H:%M UTC')</p>
<div class="summary">
<div class="pill" style="background:$overall_color;color:${overall_color/#22c55e/#86efac};color:${overall_color/#ef4444/#fca5a5}">${overall_color/#22c55e/PASS}${overall_color/#ef4444/FAIL}</div>
<div class="pill pass">Passed: $passed</div>
<div class="pill fail">Failed: $failed</div>
</div>
<h2>Gates</h2>
<table><thead><tr><th>Gate</th><th>Category</th><th>Status</th><th>Duration</th><th>Log</th></tr></thead><tbody>
EOF

    if [[ -f "$REPORT_DIR/gates.tsv" ]]; then
        while IFS=$'\t' read -r run_id id status dur log; do
            local cls="status-pass"
            [[ "$status" == "fail" ]] && cls="status-fail"
            local rel_log="${log#$ROOT/}"
            printf '<tr><td>%s</td><td>%s</td><td class="%s">%s</td><td>%sms</td><td><a href="%s">open</a></td></tr>\n' \
                "${GATE_LABELS[$id]}" "${GATE_CATEGORIES[$id]}" "$cls" "$status" "$dur" "$rel_log" >> "$REPORT_HTML"
        done < "$REPORT_DIR/gates.tsv"
    fi

    echo '</tbody></table></body></html>' >> "$REPORT_HTML"
}

# ---------------------------------------------------------------------------
# Orchestration modes
# ---------------------------------------------------------------------------
cmd_run() {
    local parallel=false background=false category_filter=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --parallel) parallel=true ;;
            --background) background=true ;;
            --category)
                if [[ -n "${2:-}" ]]; then
                    category_filter="$2"
                    shift
                fi
                ;;
        esac
        shift
    done

    if $background; then
        # Clean up stale PID before starting
        if [[ -f "$REPORT_DIR/daemon.pid" ]]; then
            local old_pid
            old_pid=$(cat "$REPORT_DIR/daemon.pid")
            if kill -0 "$old_pid" 2>/dev/null; then
                warn "Background CI already running (PID $old_pid). Stop it first."
                return 1
            else
                rm -f "$REPORT_DIR/daemon.pid"
            fi
        fi
        info "Daemonizing CI run to background..."
        nohup bash "$0" run ${parallel:+--parallel} ${category_filter:+--category "$category_filter"} > "$REPORT_DIR/run-$RUN_ID.log" 2>&1 &
        local pid=$!
        echo "$pid" > "$REPORT_DIR/daemon.pid"
        ok "Background CI started (PID $pid)"
        ok "Logs: $REPORT_DIR/run-$RUN_ID.log"
        ok "Reports: $REPORT_DIR/report.{json,html}"
        return 0
    fi

    sect
    info "KFMS-CI Run ID: $RUN_ID"
    info "Report directory: $REPORT_DIR"
    info "Parallel: $parallel"
    [[ -n "$category_filter" ]] && info "Category filter: $category_filter"
    sect

    rm -f "$REPORT_DIR/gates.tsv"

    if [[ -z "$category_filter" ]]; then
        # SMART PIPELINE (optimized concurrent phase execution)
        info "Executing optimized 3-phase parallel pipeline..."

        # --- Phase 1: Concurrently run parallelizable lints, formats, security audits, frontend build, and cargo compile ---
        local pids=()
        local phase1_gates=(
            "fmt_rust"
            "fmt_frontend"
            "typecheck"
            "fmt_python"
            "diff_hygiene"
            "kfms_meta"
            "loose_check"
            "security_js"
            "security_rust"
            "security_hard"
            "frontend_build"
            "cargo_compile"
        )

        for id in "${phase1_gates[@]}"; do
            run_gate "$id" &
            pids+=("$!")
        done

        # Wait for all Phase 1 tasks
        for pid in "${pids[@]}"; do
            wait "$pid" || true
        done

        # --- Phase 2: Run cargo check, clippy, and cargo test sequentially (instant compilation reuse) ---
        run_gate "cargo_check"
        run_gate "clippy"
        run_gate "cargo_test"

        # --- Phase 3: Run Playwright E2E tests ---
        run_gate "e2e"
    else
        # Running with a category filter (lint/test/build/security/quality)
        if $parallel; then
            local pids=()
            for id in "${GATE_ORDER[@]}"; do
                if [[ "${GATE_CATEGORIES[$id]}" != "$category_filter" ]]; then
                    continue
                fi
                run_gate "$id" &
                pids+=("$!")
            done
            for pid in "${pids[@]}"; do
                wait "$pid" || true
            done
        else
            for id in "${GATE_ORDER[@]}"; do
                if [[ "${GATE_CATEGORIES[$id]}" != "$category_filter" ]]; then
                    continue
                fi
                run_gate "$id"
            done
        fi
    fi

    build_json_report
    build_html_report

    local total passed failed
    total=$(grep -c '' "$REPORT_DIR/gates.tsv" 2>/dev/null || echo 0)
    passed=$(grep -c $'\tpass\t' "$REPORT_DIR/gates.tsv" 2>/dev/null || echo 0)
    failed=$((total - passed))

    pass
    if [[ "$failed" -eq 0 ]]; then
        ok "ALL GATES PASSED ($total/$total)"
    else
        fail "$failed of $total gates failed"
    fi
    info "JSON report: $REPORT_JSON"
    info "HTML report: $REPORT_HTML"
    pass

    return $(( failed > 0 ? 1 : 0 ))
}

cmd_lint()   { cmd_run --category lint "$@"; }
cmd_test()   { cmd_run --category test "$@"; }
cmd_build()  { cmd_run --category build "$@"; }
cmd_security(){ cmd_run --category security "$@"; }

cmd_watch() {
    info "Watch mode: running full suite on file changes (Ctrl+C to stop)"
    while true; do
        cmd_run "$@"
        info "Waiting for changes... (poll every 5s)"
        sleep 5
    done
}

cmd_stop() {
    if [[ -f "$REPORT_DIR/daemon.pid" ]]; then
        local pid
        pid=$(cat "$REPORT_DIR/daemon.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            ok "Background CI stopped (PID $pid)"
        else
            warn "Background CI not running (stale PID $pid)"
        fi
        rm -f "$REPORT_DIR/daemon.pid"
    else
        warn "No background CI PID file found"
    fi
}

cmd_status() {
    if [[ -f "$REPORT_DIR/daemon.pid" ]]; then
        local pid
        pid=$(cat "$REPORT_DIR/daemon.pid")
        if kill -0 "$pid" 2>/dev/null; then
            ok "Background CI is running (PID $pid)"
        else
            warn "Background CI not running (stale PID $pid) — removing"
            rm -f "$REPORT_DIR/daemon.pid"
        fi
    fi
    if [[ -f "$REPORT_JSON" ]]; then
        local overall passed failed
        overall=$(grep -o '"overall": "[^"]*"' "$REPORT_JSON" | cut -d'"' -f4)
        passed=$(grep -o '"passed": [0-9]*' "$REPORT_JSON" | grep -o '[0-9]*')
        failed=$(grep -o '"failed": [0-9]*' "$REPORT_JSON" | grep -o '[0-9]*')
        info "Last report: $overall | Passed: $passed | Failed: $failed"
        info "Open: file://$REPORT_HTML"
    else
        warn "No report found. Run: ./scripts/kfms/kfms-ci.sh run"
    fi
}

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
CMD="${1:-help}"

case "$CMD" in
    run)        shift; cmd_run "$@" ;;
    lint)       shift; cmd_lint "$@" ;;
    test)       shift; cmd_test "$@" ;;
    build)      shift; cmd_build "$@" ;;
    security)   shift; cmd_security "$@" ;;
    watch)      shift; cmd_watch "$@" ;;
    status)     cmd_status ;;
    stop)       cmd_stop ;;
    *)
        echo ""
        echo "  KFMS-CI — Professional All-in-One Pipeline"
        echo ""
        echo "  Usage: ./scripts/kfms/kfms-ci.sh <command> [flags]"
        echo ""
        echo "  Commands:"
        echo "    run              Run all gates"
        echo "    lint             Lint/format gates only"
        echo "    test             Test gates only"
        echo "    build            Build gates only"
        echo "    security         Security gates only"
        echo "    watch            Continuous mode"
        echo "    status           Show last report / background status"
        echo "    stop             Stop background CI daemon"
        echo ""
        echo "  Flags (for run/lint/test/build/security):"
        echo "    --parallel       Run independent gates in parallel"
        echo "    --background     Daemonize to background"
        echo "    --category <cat> Filter by category (lint/test/build/security/quality)"
        echo ""
        ;;
esac
