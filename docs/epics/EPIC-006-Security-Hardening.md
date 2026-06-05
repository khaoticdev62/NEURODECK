# Epic: Security Hardening & Rate Limiting

## Objective
Mitigate brute-force attacks and prevent injection vulnerabilities. Enforce rate limiting on external-facing endpoints and sanitize all user-controlled outputs before rendering.

## Background
NEURODECK exposes an HTTP+WebSocket bridge server on localhost and potentially LAN-facing remote control APIs. Without rate limiting, these endpoints are vulnerable to brute-force and DoS attacks. Additionally, user-controlled content (Canvas previews, error messages) must be sanitized to prevent XSS and information disclosure.

## User Stories

### Story 1: Rate Limiting & API Throttling (US-6.1)
**As a** security engineer,
**I want** token-bucket rate limiting on all external-facing bridge server endpoints,
**So that** brute-force and DoS attacks are mitigated.

- **Acceptance Criteria**:
  - Every HTTP API request (`POST /api/{command}`) checks the client IP against a token-bucket limiter.
  - Every WebSocket upgrade (`GET /ws`) checks the same limiter.
  - Exceeded requests return HTTP 429 "Too many requests. Please try again later."
  - The limiter uses per-IP token buckets with configurable capacity and refill rate.

### Story 2: Output Sanitization & Path Redaction (US-6.2)
**As a** user,
**I want** error messages that never leak my local filesystem paths,
**And** Canvas previews that cannot execute malicious scripts,
**So that** my privacy and security are protected.

- **Acceptance Criteria**:
  - `sanitize_error_for_frontend` strips Windows paths (`C:\...`), Unix paths (`/home/...`), and home directories (`~`) replacing them with `[REDACTED_PATH]`.
  - Canvas HTML preview injects a restrictive CSP meta tag (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';`).
  - Canvas HTML preview strips `<script>` tags and inline event handlers (`onerror=`, `onclick=`, etc.) via regex.
  - Canvas Markdown preview runs through `window.sanitizeHtml` before rendering.

## Implementation Status

### Backend (`src-tauri/src/security.rs`)
- `sanitize_error_for_frontend` — regex-based path redaction for Windows, Unix, and home dirs.
- `IpRateLimiter` — per-IP token bucket with `capacity` and `refill_rate`.
- `TokenBucket::check_and_consume` — refills tokens based on elapsed time, returns true if request allowed.
- Unit tests cover path redaction and rate limiter behavior.

### Backend (`src-tauri/src/bridge.rs`)
- `api_command` handler (line 175): checks `state.limiter.is_allowed(ip)` before dispatching.
- `ws_handler` (line 215): checks the same limiter before WebSocket upgrade.
- Configured with capacity=200, refill_rate=50.

### Frontend (`frontend/src/canvas.js`)
- `stripCanvasScripts(html)` — removes `<script>...</script>` and `on\w+=` attributes.
- `buildPreviewDoc(lang, code)` — injects restrictive CSP meta tag into all preview srcdocs.
- HTML previews: scripts stripped + CSP prepended.
- JS previews: wrapped in sandboxed HTML with CSP.
- Markdown previews: parsed via `marked.parse()` then sanitized via `window.sanitizeHtml`.

## Verification
- [x] `cargo check` succeeds
- [x] `cargo test --lib` passes (includes security module tests)
- [x] `npm run --prefix frontend build` succeeds
- [x] KFMS release status remains GO
