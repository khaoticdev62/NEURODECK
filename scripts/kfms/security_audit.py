#!/usr/bin/env python3
"""
NEURODECK Security Audit & Remediation Script
=============================================
Scans the codebase for known security gaps, reports findings, and applies
safe, idempotent patches where possible.

Run with:
    python scripts/security_audit.py [--apply]

--apply    Apply automatic patches (default is report-only)
--fix-toml Regenerate llm-term.toml with randomized device_id
"""

import argparse
import random
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Finding:
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    file: str
    line: int
    message: str
    fixable: bool = False
    fix_applied: bool = False
    recommendation: str = ""


class SecurityAuditor:
    def __init__(self, root: Path):
        self.root = root
        self.findings: List[Finding] = []
        self.patched_files: set = set()

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------
    def _read(self, rel: str) -> str:
        path = self.root / rel
        if not path.exists():
            return ""
        return path.read_text(encoding="utf-8", errors="ignore")

    def _write(self, rel: str, content: str) -> None:
        (self.root / rel).write_text(content, encoding="utf-8")
        self.patched_files.add(rel)

    def _lines(self, rel: str) -> List[str]:
        return self._read(rel).splitlines()

    def _add(
        self,
        sev: str,
        cat: str,
        rel: str,
        line: int,
        msg: str,
        fixable: bool = False,
        rec: str = "",
    ):
        self.findings.append(Finding(sev, cat, rel, line, msg, fixable, False, rec))

    # ------------------------------------------------------------------
    # Checks
    # ------------------------------------------------------------------
    def check_csp(self, apply: bool):
        rel = "src-tauri/tauri.conf.json"
        if not (self.root / rel).exists():
            # Pure Electron build: CSP is injected via Electron webRequest.
            return
        text = self._read(rel)
        csp_match = re.search(r'"csp"\s*:\s*"([^"]+)"', text)
        if not csp_match:
            self._add("HIGH", "CSP", rel, 0, "CSP directive not found in tauri.conf.json", False)
            return
        csp = csp_match.group(1)
        issues = []
        if "img-src 'self' asset: data: blob: https:" in csp:
            issues.append("img-src allows any https: origin (tracking/exfiltration)")
        if "connect-src" in csp and "ws://localhost:*" in csp:
            issues.append("connect-src allows any localhost websocket (port scanning)")
        if "style-src 'self' 'unsafe-inline'" in csp:
            issues.append("style-src allows 'unsafe-inline' (CSS injection)")
        for iss in issues:
            self._add(
                "HIGH",
                "CSP",
                rel,
                39,
                iss,
                fixable=False,
                rec="Tighten img-src to specific domains; restrict connect-src; move styles to external CSS",
            )

    def check_browser_exec(self, apply: bool):
        rel = "src-tauri/src/commands/browser.rs"
        text = self._read(rel)
        if "pub fn browser_exec(" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub fn browser_exec(" in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "browser_exec accepts arbitrary JS and runs it in a webview via win.eval()",
                        fixable=False,
                        rec="Add user approval dialog, restrict to allow-listed JS snippets, or require signed payloads",
                    )
                    break
        if "pub fn browser_evaluate_js(" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub fn browser_evaluate_js(" in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "browser_evaluate_js feeds arbitrary JS to headless Chrome without per-action approval",
                        fixable=False,
                        rec="Require explicit user confirmation before each evaluate call",
                    )
                    break

    def check_shell_execution(self, apply: bool):
        rel = "src-tauri/src/commands/system.rs"
        text = self._read(rel)
        if "execute_command_stream" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub async fn execute_command_stream(" in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "execute_command_stream passes raw user input to /bin/sh -c without validation",
                        fixable=False,
                        rec="Add command allow-list, sandbox with seccomp/bubblewrap, or require user confirmation",
                    )
                    break

    def check_agent_exec_code(self, apply: bool):
        rel = "src-tauri/src/commands/agent.rs"
        text = self._read(rel)
        if "agent_exec_code" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub async fn agent_exec_code(" in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "agent_exec_code runs LLM-generated code with only a 30s timeout",
                        fixable=False,
                        rec="Add network namespace isolation, tmpfs sandbox, and mandatory user approval",
                    )
                    break

    def check_lua_execute(self, apply: bool):
        rel = "src-tauri/src/lua.rs"
        text = self._read(rel)
        if 'lua.globals().set("execute"' in text:
            for i, line in enumerate(self._lines(rel), 1):
                if 'lua.globals().set("execute"' in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "Lua plugins have unrestricted shell execution via execute()",
                        fixable=False,
                        rec="Implement plugin permission manifest (filesystem, network, shell caps)",
                    )
                    break

    def check_tunnel_rce(self, apply: bool):
        rel = "src-tauri/src/tunnel.rs"
        text = self._read(rel)
        if "TunnelRequest::RunCmd" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "TunnelRequest::RunCmd" in line:
                    self._add(
                        "CRITICAL",
                        "RCE",
                        rel,
                        i,
                        "Tunnel RunCmd allows unrestricted shell execution to any bearer of the token",
                        fixable=False,
                        rec="Replace RunCmd with a fixed allow-list of safe commands or remove it entirely",
                    )
                    break

    def check_remote_control_pin(self, apply: bool):
        rel = "src-tauri/src/remote_control.rs"
        text = self._read(rel)
        m = re.search(r'format!\("http://\{\}:\{\}/#pin=\{\}"', text)
        if m:
            for i, line in enumerate(self._lines(rel), 1):
                if "#pin=" in line:
                    self._add(
                        "CRITICAL",
                        "Secrets",
                        rel,
                        i,
                        "Remote control PIN exposed in URL fragment (logged in history, proxy logs, clipboard)",
                        fixable=False,
                        rec="Pass PIN via POST body or WebSocket handshake instead of URL fragment",
                    )
                    break

    def check_canvas_collab(self, apply: bool):
        rel = "src-tauri/src/canvas_collab.rs"
        text = self._read(rel)
        if "0.0.0.0" in text and "TcpListener::bind" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "0.0.0.0" in line:
                    self._add(
                        "CRITICAL",
                        "Network",
                        rel,
                        i,
                        "Canvas collaboration binds to 0.0.0.0 with no authentication",
                        fixable=False,
                        rec="Bind to 127.0.0.1 or require token handshake before relaying messages",
                    )
                    break

    def check_mcp_sandbox(self, apply: bool):
        rel = "src-tauri/src/mcp.rs"
        text = self._read(rel)
        if "sanitize_mcp_path" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "sanitize_mcp_path" in line:
                    self._add(
                        "CRITICAL",
                        "Path Traversal",
                        rel,
                        i,
                        "MCP path sandbox uses current_dir() as base — weak boundary",
                        fixable=False,
                        rec="Use a dedicated sandbox directory (e.g., ~/.config/neurodeck/mcp-sandbox)",
                    )
                    break

    def check_transfer_paths(self, apply: bool):
        rel = "src-tauri/src/transfer.rs"
        text = self._read(rel)
        if "start_file_transfer" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub async fn start_file_transfer(" in line:
                    self._add(
                        "CRITICAL",
                        "Data Exfiltration",
                        rel,
                        i,
                        "File transfer has no outgoing path validation — any readable file can be sent",
                        fixable=False,
                        rec="Restrict transfers to a user-approved allow-list of directories",
                    )
                    break

    def check_plugin_install(self, apply: bool):
        rel = "src-tauri/src/plugin_mgr.rs"
        text = self._read(rel)
        if "pub async fn install_plugin(" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub async fn install_plugin(" in line:
                    self._add(
                        "MEDIUM",
                        "Supply Chain",
                        rel,
                        i,
                        "Plugins can be installed from arbitrary HTTPS URLs without domain allow-list",
                        fixable=False,
                        rec="Maintain a registry of approved plugin domains or require signature verification",
                    )
                    break

    def check_sync_encryption(self, apply: bool):
        rel = "src-tauri/src/sync.rs"
        text = self._read(rel)
        if "derive_key" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "fn derive_key" in line:
                    self._add(
                        "HIGH",
                        "Crypto",
                        rel,
                        i,
                        "Sync encryption uses raw API token as key with no salt or KDF",
                        fixable=False,
                        rec="Replace with PBKDF2 or Argon2id with random salt stored alongside ciphertext",
                    )
                    break

    def check_sftp_password(self, apply: bool):
        rel = "src-tauri/src/sftp.rs"
        text = self._read(rel)
        if 'cmd.arg("-p").arg(password' in text:
            for i, line in enumerate(self._lines(rel), 1):
                if 'cmd.arg("-p").arg(password' in line:
                    self._add(
                        "HIGH",
                        "Secrets",
                        rel,
                        i,
                        "SFTP password passed as command-line arg to sshpass (visible in ps aux)",
                        fixable=False,
                        rec="Migrate to a native SSH library (libssh2, thrussh) instead of sshpass",
                    )
                    break

    def check_hardcoded_device_id(self, apply: bool):
        rel = "llm-term.toml"
        text = self._read(rel)
        m = re.search(r'device_id\s*=\s*"([^"]+)"', text)
        if m:
            val = m.group(1)
            if val and val != "GENERATE_ON_FIRST_RUN":
                line = text[: text.find(f'device_id = "{val}"')].count("\n") + 1
                self._add(
                    "MEDIUM",
                    "Fingerprinting",
                    rel,
                    line,
                    f"Hardcoded device_id detected ({val[:8]}...). All installs share the same ID.",
                    fixable=True,
                    rec="Replace with a randomly generated UUID",
                )
                if apply:
                    new_id = (
                        "".join(random.choices("abcdef0123456789", k=8))
                        + "-"
                        + "".join(random.choices("abcdef0123456789", k=4))
                        + "-"
                        + "".join(random.choices("abcdef0123456789", k=4))
                        + "-"
                        + "".join(random.choices("abcdef0123456789", k=4))
                        + "-"
                        + "".join(random.choices("abcdef0123456789", k=12))
                    )
                    new_text = text.replace(f'device_id = "{val}"', f'device_id = "{new_id}"')
                    self._write(rel, new_text)
                    self.findings[-1].fix_applied = True
                    print(f"[PATCHED] {rel}: Replaced hardcoded device_id with {new_id}")

    def check_save_profiles_themes(self, apply: bool):
        rel = "src-tauri/src/commands/config.rs"
        text = self._read(rel)
        if "pub fn save_custom_themes(data: String)" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub fn save_custom_themes(data: String)" in line:
                    self._add(
                        "HIGH",
                        "Input Validation",
                        rel,
                        i,
                        "save_custom_themes writes raw string without JSON validation",
                        fixable=False,
                        rec="Parse and validate as JSON before writing; reject non-object roots",
                    )
                    break
        if "pub fn save_profiles(key: String, data: String)" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "pub fn save_profiles(key: String, data: String)" in line:
                    self._add(
                        "HIGH",
                        "Input Validation",
                        rel,
                        i,
                        "save_profiles writes raw string without JSON validation",
                        fixable=False,
                        rec="Parse and validate as JSON before writing; sanitize key against traversal",
                    )
                    break

    def check_headless_chrome_flags(self, apply: bool):
        rel = "src-tauri/src/commands/browser.rs"
        text = self._read(rel)
        if "LaunchOptionsBuilder" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "LaunchOptionsBuilder" in line:
                    self._add(
                        "MEDIUM",
                        "Browser Hardening",
                        rel,
                        i,
                        "Headless Chrome launched with default flags — no explicit --disable-dev-shm-usage or proxy lockdown",
                        fixable=False,
                        rec="Explicitly set --disable-dev-shm-usage, --disable-gpu, and --proxy-server=direct://",
                    )
                    break

    def check_mcp_cors(self, apply: bool):
        rel = "src-tauri/src/mcp.rs"
        text = self._read(rel)
        if "Access-Control-Allow-Methods: POST, OPTIONS" in text:
            for i, line in enumerate(self._lines(rel), 1):
                if "Access-Control-Allow-Methods" in line:
                    self._add(
                        "MEDIUM",
                        "CORS",
                        rel,
                        i,
                        "MCP preflight lacks explicit Access-Control-Allow-Origin rejection",
                        fixable=False,
                        rec="Add 'Access-Control-Allow-Origin: null' or reject unknown origins explicitly",
                    )
                    break

    def check_remote_rate_limit(self, apply: bool):
        rel = "src-tauri/src/remote_control.rs"
        text = self._read(rel)
        if "Failed PIN attempts" in text or "lockout" in text.lower():
            for i, line in enumerate(self._lines(rel), 1):
                if "lockout" in line.lower() or "attempts" in line.lower():
                    self._add(
                        "MEDIUM",
                        "Rate Limiting",
                        rel,
                        i,
                        "Remote control has per-IP lockout but no global rate limit or exponential backoff",
                        fixable=False,
                        rec="Add global rate limit (e.g., 10 attempts/minute across all IPs) and exponential backoff",
                    )
                    break

    def check_innerhtml_sinks(self, apply: bool):
        """Scan frontend for any remaining dangerous innerHTML assignments."""
        frontend = self.root / "frontend" / "src"
        safe_patterns = [
            r'\.innerHTML\s*=\s*""',
            r"\.innerHTML\s*=\s*''",
            r"\.innerHTML\s*=\s*`[^${]*`$",  # static template literal, no interpolation
            r"\.innerHTML\s*=\s*createIcon\(",
            r'\.innerHTML\s*=\s*`<div\s+class="[^"]+">\s*[^<]*</div>`',
            r'\.innerHTML\s*=\s*"<div\s+class=',
            r"\.innerHTML\s*=\s*'<div\s+class=",
        ]
        for f in frontend.rglob("*.js"):
            rel = f.relative_to(self.root).as_posix()
            lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
            for i, line in enumerate(lines, 1):
                if (
                    ".innerHTML =" in line
                    and "sanitizeHtml" not in line
                    and "window.sanitizeHtml" not in line
                ):
                    stripped = line.strip()
                    if stripped.startswith("//") or stripped.startswith("*"):
                        continue
                    # Skip obviously safe patterns
                    if any(re.search(p, stripped) for p in safe_patterns):
                        continue
                    # Skip lines that only assign static trusted markup with no user variables
                    if (
                        re.search(r'\.innerHTML\s*=\s*[`\'"][^`\'"]*[`\'"];?\s*$', stripped)
                        and "${" not in stripped
                        and "' + " not in stripped
                        and '" + ' not in stripped
                    ):
                        continue
                    self._add(
                        "MEDIUM",
                        "XSS Sink",
                        rel,
                        i,
                        f"Potential unsanitized innerHTML assignment: {stripped[:80]}",
                        fixable=False,
                        rec="Replace with DOM API construction or sanitize via window.sanitizeHtml",
                    )

    def check_rust_unsafe(self, apply: bool):
        """Ensure no unsafe blocks were introduced."""
        src = self.root / "src-tauri" / "src"
        for f in src.rglob("*.rs"):
            rel = f.relative_to(self.root).as_posix()
            lines = f.read_text(encoding="utf-8", errors="ignore").splitlines()
            for i, line in enumerate(lines, 1):
                if "unsafe {" in line or "unsafe fn" in line:
                    self._add(
                        "LOW",
                        "Unsafe Rust",
                        rel,
                        i,
                        f"unsafe block/function found: {line.strip()[:80]}",
                        fixable=False,
                        rec="Verify unsafe usage is necessary and audited",
                    )

    # ------------------------------------------------------------------
    # Report generation
    # ------------------------------------------------------------------
    def run(self, apply: bool):
        print("=" * 70)
        print(" NEURODECK Security Audit")
        print("=" * 70)

        self.check_csp(apply)
        self.check_browser_exec(apply)
        self.check_shell_execution(apply)
        self.check_agent_exec_code(apply)
        self.check_lua_execute(apply)
        self.check_tunnel_rce(apply)
        self.check_remote_control_pin(apply)
        self.check_canvas_collab(apply)
        self.check_mcp_sandbox(apply)
        self.check_transfer_paths(apply)
        self.check_plugin_install(apply)
        self.check_sync_encryption(apply)
        self.check_sftp_password(apply)
        self.check_hardcoded_device_id(apply)
        self.check_save_profiles_themes(apply)
        self.check_headless_chrome_flags(apply)
        self.check_mcp_cors(apply)
        self.check_remote_rate_limit(apply)
        self.check_innerhtml_sinks(apply)
        self.check_rust_unsafe(apply)

        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        self.findings.sort(key=lambda f: (severity_order.get(f.severity, 99), f.file, f.line))

        print(f"\nTotal findings: {len(self.findings)}\n")

        current_sev = None
        for f in self.findings:
            if f.severity != current_sev:
                current_sev = f.severity
                print(f"\n{'─' * 70}")
                print(f" {current_sev} SEVERITY")
                print(f"{'─' * 70}")
            status = "[PATCHED]" if f.fix_applied else "[OPEN]"
            print(f"\n{status} {f.category} — {f.file}:{f.line}")
            print(f"    {f.message}")
            if f.recommendation:
                print(f"    → Recommendation: {f.recommendation}")

        print(f"\n{'=' * 70}")
        patched = [f for f in self.findings if f.fix_applied]
        open_findings = [f for f in self.findings if not f.fix_applied]
        print(f" Summary: {len(patched)} patched, {len(open_findings)} remain open")
        print(f"{'=' * 70}")

        if apply and self.patched_files:
            print("\nFiles modified:")
            for pf in sorted(self.patched_files):
                print(f"  - {pf}")

        # Exit with non-zero if any CRITICAL or HIGH findings remain open
        critical_high_open = any(
            f.severity in ("CRITICAL", "HIGH") and not f.fix_applied for f in self.findings
        )
        return 1 if critical_high_open else 0


def main():
    parser = argparse.ArgumentParser(description="NEURODECK Security Audit & Remediation")
    parser.add_argument("--apply", action="store_true", help="Apply automatic patches")
    parser.add_argument(
        "--fix-toml", action="store_true", help="Regenerate device_id in llm-term.toml"
    )
    args = parser.parse_args()

    auditor = SecurityAuditor(PROJECT_ROOT)
    code = auditor.run(args.apply)

    if args.fix_toml:
        rel = "llm-term.toml"
        path = PROJECT_ROOT / rel
        text = path.read_text(encoding="utf-8")
        m = re.search(r'device_id\s*=\s*"([^"]+)"', text)
        if m:
            old = m.group(1)
            new_id = (
                "".join(random.choices("abcdef0123456789", k=8))
                + "-"
                + "".join(random.choices("abcdef0123456789", k=4))
                + "-"
                + "".join(random.choices("abcdef0123456789", k=4))
                + "-"
                + "".join(random.choices("abcdef0123456789", k=4))
                + "-"
                + "".join(random.choices("abcdef0123456789", k=12))
            )
            new_text = text.replace(f'device_id = "{old}"', f'device_id = "{new_id}"')
            path.write_text(new_text, encoding="utf-8")
            print(f"\n[FIXED] {rel}: device_id regenerated ({old[:8]}... → {new_id[:8]}...)")

    sys.exit(code)


if __name__ == "__main__":
    main()
