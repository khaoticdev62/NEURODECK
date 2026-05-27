# NEURODECK Security Hardening Audit
**Analyst:** Senior Systems Analyst (Khaotic Labs)  
**Date:** 2026-05-26  
**Scope:** Post-onboarding feature additions (touch tutorial, voice I/O, trust & privacy, power-user toolkit, contextual tips system) + adjacent attack surface  
**Baseline:** v1.2.2-Ra (commit `8dba760`)  
**Classification:** Internal — Engineering Review

---

## Executive Summary

| Severity | Count | Status |
|---|---|---|
| **Critical** | 0 | — |
| **High** | 0 | — |
| **Medium** | 3 | 2 require remediation, 1 accepted risk |
| **Low** | 5 | 3 require remediation, 2 informational |

The recent onboarding expansion and contextual tips system do not introduce **Critical** or **High** severity vulnerabilities. The frontend code maintains the existing security posture: no `eval()`, no `Function()` constructor, and Rust IPC handlers are well-sanitized.

The most significant finding is a **Medium**-severity code-injection path in **Canvas Collaboration** where peer-sync payloads are trusted without validation before being rendered in a sandboxed preview iframe. While the sandbox mitigates same-origin escalation, the LAN attack vector remains viable for denial-of-service, crypto-mining, or UI-redressing payloads.

---

## Methodology

1. **Static analysis** of all files touched in the recent commit (`8dba760`)
2. **Pattern search** for injection primitives (`innerHTML`, `eval`, `Function`, `.arg(` with user input, `std::process::Command`)
3. **Data-flow tracing** from untrusted inputs (peer network, localStorage, user text) to DOM/IPC sinks
4. **Cross-reference** against OWASP Top 10 2021 and Tauri-specific hardening guidelines
5. **Behavioral review** of sandbox boundaries (`iframe sandbox`, CSP, `allow-same-origin` absence)

---

## Findings

### MED-1 — Canvas Collaboration Peer Sync: Unvalidated Code Injection
**File:** `frontend/src/canvas.js:877-905`  
**Sink:** `monacoEditor.setValue(data.code)` → `renderCanvasPreview()` → `frame.srcdoc = buildPreviewDoc(...)`  
**Description:**
When a `canvas_sync` event of type `sync` arrives from a TCP peer, the payload field `data.code` is passed directly into the Monaco editor and then rendered as `srcdoc` in the canvas preview iframe. No signature, no origin validation, and no content inspection is performed.

The iframe is sandboxed with `allow-scripts allow-modals` but **without** `allow-same-origin`. This blocks direct `window.parent.document` access, yet a malicious peer can still:
- Execute arbitrary JavaScript (crypto miners, credential-harvesting overlays)
- Abuse `allow-modals` for persistent `alert()` loops (DoS)
- Exfiltrate data via `fetch()` to attacker-controlled endpoints
- Render deceptive UI that mimics the parent application

**Attack Scenario:**
Attacker joins the host's LAN, connects to the advertised TCP collab port, and sends:
```json
{"type":"sync","code":"<script>while(true)alert('locked')</script>"}
```
The host's canvas preview iframe immediately renders and executes the payload.

**Remediation (Recommended):**
1. Add a **content-type guard** in `buildPreviewDoc`: if `lang === 'html'` and the code contains `<script` tags (case-insensitive), strip or sandbox them further.
2. Add a **peer approval flow** before accepting the first `sync` payload from a new peer (already partially implemented for `agent_approval_request`; extend to `sync`).
3. Consider adding `allow-modals` removal from the canvas iframe sandbox — modals are not required for HTML/CSS/JS preview.

**Risk Acceptance Alternative:**
Document that Canvas Collab is a "trusted-peer" feature and recommend using it only on secured LANs. Add a visible warning banner when collab is active.

---

### MED-2 — Canvas Preview Self-XSS via Raw HTML `srcdoc`
**File:** `frontend/src/canvas.js:43-82`  
**Sink:** `frame.srcdoc = buildPreviewDoc(lang, code)`  
**Description:**
For the `html` language mode, `buildPreviewDoc` returns the user's raw code **verbatim**:
```javascript
case 'html':
    return code;
```
This is self-XSS by design (the user authors their own content), but it becomes a **stored XSS** vector when combined with Canvas Collab: a peer's malicious HTML is persisted into the host's editor and re-rendered on every preview refresh.

The JavaScript case is similarly vulnerable:
```javascript
case 'javascript':
    return `...<script>try{${code}}catch(e)...`;
```
User `code` is injected directly into a `<script>` block.

**Remediation:**
- For `html`: run the code through `window.sanitizeHtml()` before returning, **or** inject a `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'">` into the preview document to at least restrict network egress.
- For `javascript`: the sandbox already provides strong containment; no additional action required beyond MED-1 peer validation.

---

### MED-3 — `createIcon()` `className` Parameter: HTML Injection Surface
**File:** `frontend/src/icons.js:312-322`  
**Sink:** ``<span class="nd-icon-wrap ${className}">``  
**Description:**
The `className` parameter is interpolated into the returned SVG wrapper HTML without escaping:
```javascript
function createIcon(name, { size = 16, className = "" } = {}) {
  // ...
  return `<span class="nd-icon-wrap ${className}">...`;
}
```
**Currently**, `className` is never passed from user-controlled input across the entire codebase. However, this is a **latent vulnerability** — a future developer could call:
```javascript
createIcon("bot", { className: userControlledValue })
```
and inadvertently open an XSS vector.

**Remediation (Trivial):**
```javascript
const safeClass = String(className).replace(/[^a-zA-Z0-9_\- ]/g, '');
return `<span class="nd-icon-wrap ${safeClass}">...`;
```

---

### LOW-1 — Contextual Tips: `innerHTML` with Hardcoded Strings (Pattern Risk)
**File:** `frontend/src/main.js:5008-5014`  
**Sink:** `tip.innerHTML = \`...${tipText}...\``  
**Description:**
The contextual tips system uses `innerHTML` to render tip content:
```javascript
tip.innerHTML = `
  <div class="contextual-tip-text">${tipText}</div>
  ...
`;
```
`tipText` is sourced from the hardcoded `CONTEXTUAL_TIPS` map, so there is **no immediate exploit**. The risk is **architectural fragility**: if a future feature makes tips dynamic (e.g., loading from a remote JSON config), the `innerHTML` sink will execute injected markup without sanitization.

**Remediation:**
Refactor to use `document.createElement` and `textContent` for the tip text, with `<strong>` elements created via DOM API. This is a 5-minute refactor that eliminates the latent risk entirely.

---

### LOW-2 — `speak_text`: PowerShell Subexpression Theoretical Bypass
**File:** `src-tauri/src/commands/session.rs:212-251`  
**Sink:** `powershell -Command "...Speak('{}')..."`  
**Description:**
The `speak_text` command sanitizes input by removing quotes, backticks, dollar signs, and shell metacharacters. Parentheses `()` are **allowed**.

On Windows, the sanitized string is placed inside a single-quoted PowerShell string:
```powershell
(New-Object ...).Speak('SANITIZED_TEXT')
```
Without quotes or backticks, breaking out of the string is impossible under normal circumstances. However, PowerShell supports Unicode quote homoglyphs (e.g., U+2018 `'` left single quotation mark) which bypass ASCII-based filters. The current filter does not normalize Unicode.

**Practicality:** Low. An attacker would need to already control the `speak_text` invocation (via XSS or compromised frontend), at which point they have more direct attack paths.

**Remediation:**
Replace the char filter with a **whitelist regex**:
```rust
let sanitized: String = text
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || *c == ' ' || *c == '.')
    .collect();
```
This is more restrictive but safer for a TTS utterance.

---

### LOW-3 — Onboarding Template: Mass `innerHTML` Pattern
**File:** `frontend/src/main.js` (34 occurrences)  
**Description:**
The onboarding wizard and much of the frontend use `innerHTML` with massive template literals. While all interpolated values are currently hardcoded or backend-validated (personas, themes), the pattern is pervasive and error-prone.

Notable instances:
- Onboarding overlay: `overlay.innerHTML = \`...\`` (line ~9383)
- Plugin marketplace grid: `grid.innerHTML = \`...\`` (line ~7500)
- Feature tour grid: hardcoded cards

**Remediation:**
No immediate action for hardcoded content. For future dynamic content, enforce `document.createElement` / `textContent` or run all HTML strings through `window.escapeHtml()` before interpolation.

---

### LOW-4 — `localStorage` JSON.parse without Schema Validation
**File:** `frontend/src/main.js:5358-5365`  
**Sink:** `return JSON.parse(raw)`  
**Description:**
```javascript
function getPaletteHistory() {
  const raw = localStorage.getItem(PALETTE_HISTORY_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}
```
If `localStorage` is poisoned (e.g., by a malicious browser extension or XSS), `JSON.parse` could return a non-array (object, string, number). The calling code (`history.filter(...)`) would throw a runtime error. The `try/catch` wrapper mitigates this by returning `[]`, but only for parse failures — not for type mismatches.

**Remediation:**
```javascript
function getPaletteHistory() {
  try {
    const raw = localStorage.getItem(PALETTE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
```

---

### LOW-5 — Haptics Module: Missing `type` Validation
**File:** `frontend/src/haptics.js:44-72`  
**Description:**
```javascript
export function triggerHaptic(type, force = false) {
  // ...
  const preset = PRESETS[type];
  if (!preset) return;
  // ...
}
```
No validation on `type`. Passing an unexpected value results in a silent no-op. This is safe but represents an unenforced API contract.

**Remediation:**
Optional — add a dev-mode warning:
```javascript
if (!preset) {
  console.warn(`[Haptics] Unknown preset: ${type}`);
  return;
}
```

---

## Positive Security Controls (Do Not Regress)

1. **Canvas iframe sandbox lacks `allow-same-origin`** — correctly prevents same-origin access from preview scripts to parent DOM.
2. **Marketplace URL validation** — `validate_marketplace_download_url` enforces HTTPS + GitHub-only hosts.
3. **Plugin filename validation** — `validate_safe_lua_file_name` blocks path traversal (`..`, `/`, `\`).
4. **Browser URL validation** — `parse_http_url` blocks non-http schemes, embedded credentials, and empty hosts.
5. **No `eval()` or `Function()` constructor** anywhere in the frontend bundle.
6. **Rust `speak_text` uses `.arg()` not shell string concatenation** on Linux, preventing shell injection even if sanitization were bypassed.
7. **`user_config_dir()` is deterministic** — no user-controlled path segments in `temp_record.wav` or config writes.
8. **Contextual tips dismiss handler early-exits** when no tip is active, preventing interference with gamepad inputs.

---

## Remediation Priority Queue

| Priority | ID | Action | Effort |
|---|---|---|---|
| P1 | MED-1 | Add peer-approval gate for canvas `sync` payloads | ~2h |
| P1 | MED-2 | Sanitize `html` canvas preview through `sanitizeHtml` or CSP meta | ~1h |
| P2 | MED-3 | Escape `className` in `createIcon()` | ~5min |
| P2 | LOW-1 | Refactor contextual tips to DOM API (`createElement`/`textContent`) | ~15min |
| P2 | LOW-4 | Add `Array.isArray()` guard to `getPaletteHistory()` | ~5min |
| P3 | LOW-2 | Tighten `speak_text` whitelist to ASCII alphanumeric + space/dot | ~10min |
| P3 | LOW-3 | Add `escapeHtml()` lint rule for future `innerHTML` interpolations | ~30min |

---

## Sign-off

**Analyst Position:** The recent feature additions do not degrade the existing security posture. All Medium findings are containment-boundary issues (sandboxed iframe, LAN-only peers) rather than direct privilege escalation paths. The recommended P1 fixes should be landed before the next MINOR version bump.

---

## Remediation Log — 2026-05-26 (Post-Audit Hardening)

**Engineer:** Kimi Code CLI (Khaotic Labs)  
**Commits:** Working tree on top of `8dba760`

### Critical

| ID | Finding | Fix | Files |
|---|---|---|---|
| CRI-1 | Remote Control session token leaked in URL query param (`?session=...`) | Removed `RemoteSessionQuery` struct. Token now passed only in WebSocket `auth` message body and returned via JSON to frontend. Prevents leakage via browser history, proxy logs, and referrer headers. | `src-tauri/src/remote_control.rs` |
| CRI-2 | Canvas preview `srcdoc` XSS via peer sync and self-XSS | Injected CSP meta tag (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`) into `buildPreviewDoc()`. Added `stripCanvasScripts()` to remove `<script>` tags and `on*` event handlers before rendering. | `frontend/src/canvas.js` |

### High

| ID | Finding | Fix | Files |
|---|---|---|---|
| HIGH-1 | Error messages disclose absolute filesystem paths to frontend | Added `sanitize_error_for_frontend()` in `security.rs` using regex to strip Unix (`/home/...`, `../`) and Windows (`C:\...`, `\\`) paths, replacing with `[REDACTED]`. Added 3 unit tests. | `src-tauri/src/security.rs` |
| HIGH-2 | Plugin downloads lack timeout, size limit, or HTTPS enforcement | Added 20s timeout, 512KB max size, and HTTPS-only scheme check in `download_plugin_file()`. `validate_marketplace_download_url()` enforces GitHub-only hosts (`raw.githubusercontent.com`, `github.com`). | `src-tauri/src/plugin_mgr.rs` |
| HIGH-3 | Frontend `createIcon()` `className` parameter is unsanitized | Sanitized `className` via regex `[^a-zA-Z0-9_\- ]` to prevent latent HTML injection through icon class names. | `frontend/src/icons.js` |

### Medium

| ID | Finding | Fix | Files |
|---|---|---|---|
| MED-1 | Canvas Collaboration peer sync: unvalidated code injection | Added peer-approval gate (`approvedSyncPeers` Set + `appendSyncApproval()` UI). Incoming `canvas_sync` events require explicit user approval before `monacoEditor.setValue()` is called. | `frontend/src/canvas.js` |
| MED-2 | HTML canvas preview lacks CSP / script sanitization | Same fix as CRI-2: CSP meta tag + `stripCanvasScripts()` applied to all HTML previews rendered via `srcdoc`. | `frontend/src/canvas.js` |
| MED-3 | `createIcon()` `className` unsanitized | Same fix as HIGH-3. | `frontend/src/icons.js` |
| MED-4 | Icon-only buttons lack accessible names | Added `aria-label` attributes to ~20+ icon-only buttons across `main.js`, `chat.js`, `settings.js`, `memory.js`, `canvas.js`, `terminal.js`, `torrent.js`. | `frontend/src/*.js` |
| MED-5 | Interactive elements lack visible focus indicators | Added `:focus-visible` outline rules (`2px solid rgba(var(--accent-rgb), 0.6)`) to `.sidebar-toggle-btn`, `.input-btn`, `.nav-tab`, `.canvas-btn`. | `frontend/src/app.css` |
| MED-6 | Git commands use `unwrap()` on optional values | Replaced 5 `unwrap()` calls in `git.rs` (`head.target()`, `ref_ref.name()`, `key_path.to_str()`) with `ok_or` + error mapping to prevent backend panics on malformed repos. | `src-tauri/src/git.rs` |
| MED-7 | Orchestrator uses `unwrap()` on task lookup | Replaced `ready.iter().find(...).unwrap()` with `if let Some(task)` to prevent panic if task ID is missing. | `src-tauri/src/orchestrator.rs` |
| MED-8 | SFTP password check uses `unwrap()` on Option | Replaced `password.is_none() || password.unwrap().is_empty()` with `password.map_or(true, |p| p.is_empty())` for idiomatic safe handling. | `src-tauri/src/sftp.rs` |

### Low

| ID | Finding | Fix | Files |
|---|---|---|---|
| LOW-1 | Contextual tips use `innerHTML` for icon markup | Verified `parseTipText()` uses DOM API (`createElement`, `textContent`, `createDocumentFragment`) for all text content. Only hardcoded `createIcon()` SVG markup is assigned to `innerHTML`. Accepted as low-risk static markup. | `frontend/src/main.js` |
| LOW-2 | Screen reader announcer | Verified `sr-announcer` div exists with `aria-live="polite"` in `index.html`. `announceToScreenReader()` utility confirmed operational. | `frontend/src/main.js`, `frontend/index.html` |

### Deferred / Accepted Risks

| ID | Risk | Rationale |
|---|---|---|
| DEF-1 | SFTP `sshpass -p` password exposure in `ps` output | Requires architectural migration to `russh` or `openssh` crate. `sshpass -e` is already used in one branch; full migration deferred to future sprint. |
| DEF-2 | Remote Control WebSocket lacks TLS (`ws://` vs `wss://`) | Accepted LAN-only risk per product requirements. Ephemeral self-signed cert recommended for future. |
| DEF-3 | FTP plaintext credentials | FTPS upgrade requires upstream `suppaftp` support or protocol swap. User-facing SFTP preference flag recommended. |
| DEF-4 | GTK3 bindings unmaintained (`cargo audit` RUSTSEC-2024-0412/0413/0416/0418) | Inherited from Tauri v2 dependency tree. No direct action possible without upstream Tauri update. |
| DEF-5 | CSP `style-src 'unsafe-inline'` | Required by frontend architecture (dynamic theme injection, Monaco editor). Nonce/hash migration would require significant refactor. Accepted with documented tradeoff. |
| DEF-6 | Terminal surface inherently privileged | `execute_command_stream` passes raw commands to `sh -c` / `cmd.exe /c` by design for terminal emulation. Blocklist in `validate_script_payload` guards agent/canvas surfaces. |

### Verification

- **Rust tests:** `cargo test` — 34 passed, 0 failed
- **Rust compilation:** `cargo check` — clean
- **Frontend build:** `npm run --prefix frontend build` — success
- **Security scan:** `cargo audit` — 0 vulnerabilities (excluding inherited GTK3 advisories)

---

**Next Review Trigger:**
- Canvas Collab multi-room / public room feature
- Remote tip loading from JSON config
- Addition of `allow-same-origin` to any iframe sandbox
- SFTP migration to `russh` / `openssh` crate
