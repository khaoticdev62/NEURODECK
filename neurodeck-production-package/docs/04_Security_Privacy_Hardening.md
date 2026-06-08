# NEURODECK Security & Privacy Hardening Specification

> **Version:** 1.8.0-ptah | **Date:** 2026-06-08

---

## 1. Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Malicious Lua plugin | Medium | High | Permission-gated PluginLoad, path traversal validation, syntax check |
| Agent executes harmful shell command | Medium | Critical | ShellExec capability check, terminal blocklist, approval UI for computer use |
| API key leakage in logs | Low | High | Secret redaction, keychain storage, support bundle redaction |
| Memory data exfiltration | Low | High | PrivacyFilter (4 tiers), sealed memory encrypted, exports redacted |
| Unauthorized remote access | Low | Critical | MCP Bearer token validation (ConstantTimeEq), localhost-only listeners |
| Cross-site scripting in Canvas | Medium | High | Sandboxed iframe, CSP rules, no inline eval |
| Dependency vulnerability | Medium | Medium | `cargo audit`, `npm audit`, Dependabot |
| Build tampering | Low | High | CI reproducible builds, checksums in SHA256SUMS.txt |

---

## 2. Security Architecture

### 2.1 Capability-Based Access Control

Deny-by-default model with 9 capabilities:

```rust
pub enum Capability {
    ShellExec,        // Execute shell/bash/python scripts
    FileSystemRead,   // Read files outside workspace
    FileSystemWrite,  // Write files outside workspace
    Network,          // HTTP requests, external APIs
    Browser,          // Headless browser navigation
    Computer,         // Desktop automation (mouse, keyboard, screenshot)
    MemoryRead,       // Search/query memory DB
    MemoryWrite,      // Store new memory records
    PluginLoad,       // Load and execute Lua plugins
}
```

**Enforcement points:**
- `agent_exec_code` / `exec_code_stream` → ShellExec
- `send_command` → Network
- `computer_*` → Computer
- `browser_*` → Browser
- `memory_add_fact` / `browser_save_to_memory` → MemoryWrite
- `memory_search` / `memory_list_all` → MemoryRead
- `reload_plugins` / bootstrap plugin load → PluginLoad

### 2.2 Electron Security

- `contextIsolation: true` — renderer cannot access Node.js APIs
- `nodeIntegration: false` — no `require()` in renderer
- Preload script uses explicit allowlist — only `invoke()` and `listen()` exposed
- No wildcard IPC forwarding
- CSP tightened to localhost specific ports (11434 for Ollama, 1420 for dev)

### 2.3 Data Protection

| Data Type | Protection |
|---|---|
| API keys | OS keychain (keyring 4.x), never in config file plaintext |
| Sealed memory | Excluded from search/export unless explicitly unlocked |
| Sensitive memory | User confirmation required before context injection |
| Support bundles | API keys redacted via regex, paths sanitized |
| Sync payloads | AES-GCM encryption (ring), random 16-byte salt, PBKDF2 100k iterations |
| Local documents | Indexed into vector DB but not uploaded anywhere |

### 2.4 Input Validation

- `security.rs::validate_script_payload()` — Blocks pipe-to-shell, backtick substitution, newline chaining
- `security.rs::sanitize_error_message()` — Redacts Windows paths, Unix paths, home directories
- Terminal blocklist: `;`, `&&`, `||`, `` ` ``, `$(`, `|`, `<(`, `>(`, `${`
- FTP path traversal pre-validation

---

## 3. Privacy Architecture

### 3.1 Four-Tier Privacy System

| Level | Search | Snippet | Context Inject | Export | Plugin |
|---|---|---|---|---|---|
| standard | yes | full | yes | yes | permission required |
| private | scoped | limited | confirmation | warning | denied default |
| sensitive | title only | no | confirmation | strong warning | denied |
| sealed | no | no | no | no | denied |

### 3.2 Unlock State

- `UnlockState` tracks which sealed buckets are unlocked
- Auto-lock after 30 minutes (configurable: `auto_lock_sealed_after_minutes`)
- `lock_all_sealed` command wipes unlock state

### 3.3 Local-Only Mode

- `local_only_mode: bool` in SecurityConfig
- When enabled: disables cloud sync, blocks remote providers, forces Ollama
- Toggle in Trust & Safety modal

---

## 4. Hardening Checklist

### Runtime
- [x] Capability enforcement active in all protected commands
- [x] Terminal blocklist prevents command chaining
- [x] Error messages sanitized before display
- [x] PTY spawn timeout (30s) prevents hung sessions
- [x] FTP max download size (500MB) prevents OOM
- [x] Plugin path traversal validation
- [x] MCP Bearer token validation (ConstantTimeEq)

### Build
- [x] CSP rules in Electron security policy
- [x] Context isolation enabled
- [x] Node integration disabled
- [x] No raw SQL IPC endpoints
- [x] Preload allowlist explicit

### Data
- [x] API keys in OS keychain, not config file
- [x] Sealed memory encrypted at rest
- [x] Support bundles redact secrets
- [x] Sync encryption with PBKDF2 + random salt
- [x] Privacy levels enforced in RAG, search, export

### Audit
- [x] `cargo audit` run weekly
- [x] `npm audit` run weekly
- [x] Dependabot enabled
- [x] PromptFlow security sequence run monthly
