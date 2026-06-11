# NEURODECK Backend Verification Plan

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)

---

## Verification Architecture

The NEURODECK backend verification system has three layers:

1. **Static analysis** — Scans source for stub/mock patterns without requiring a running app
2. **Contract tests** — Shape validation tests run via Vitest; no sidecar needed
3. **Live probes** — Runtime health checks requiring the sidecar to be running

---

## Scripts

| Script | npm command | What it checks | Sidecar needed |
|--------|-------------|----------------|----------------|
| `scripts/verify-no-mocks.ts` | `npm run verify:no-mocks` | Production stubs in source files | No |
| `scripts/verify-backend-security.ts` | `npm run verify:security` | Renderer electron imports, eval usage, process.env leaks | No |
| `scripts/verify-real-data.ts` | `npm run verify:real-data` | Real wiring patterns in production code | No |
| `scripts/verify-backend.ts` | `npm run verify:backend` | Live probe all 9 backend services | Yes |
| `scripts/export-backend-readiness-report.ts` | `npm run verify:report` | Aggregate all reports → readiness score | No |

---

## Test Files

| Test File | Type | Sidecar needed |
|-----------|------|----------------|
| `tests/contract/backend-contracts.test.ts` | Contract | No |
| `tests/contract/ipc-contracts.test.ts` | Contract | No |
| `tests/contract/provider-contracts.test.ts` | Contract | No |
| `tests/contract/storage-contracts.test.ts` | Contract | No |
| `tests/contract/lsp-contracts.test.ts` | Contract | No |
| `tests/contract/plugin-contracts.test.ts` | Contract | No |
| `tests/integration/no-mocked-data.test.ts` | Integration | No |
| `tests/integration/backend-health.test.ts` | Integration | No |

---

## Running Verification

### Full static pass (CI-safe, no sidecar):
```bash
npm run verify:no-mocks
npm run verify:security
npm run verify:real-data
npm run test:backend:contracts
```

### Live probe pass (requires sidecar):
```bash
# Start sidecar first:
$env:GEMINI_API_KEY=your_key; $env:NEURODECK_PORT=9477; cargo run --manifest-path src-tauri/Cargo.toml

# In another terminal:
npm run verify:backend
npm run verify:report
```

### Full CI gate:
```bash
npm run verify:all
```

---

## Probe Descriptions

| Probe ID | What It Tests | Pass Criteria |
|----------|---------------|---------------|
| `sidecar-health` | GET /health | HTTP 200, body contains `ok: true` |
| `storage` | tmpfile write/read/checksum/delete | File content matches, checksum verified |
| `settings` | `get_config` sidecar call | Returns config object with `llm` key |
| `memory` | `memory_add_fact` + `memory_delete` | Fact round-trips; ID returned; delete succeeds |
| `sessions` | `list_sessions_meta` | Returns array (empty ok); no error |
| `ollama` | GET http://localhost:11434/api/tags | HTTP 200 with models array, or `not_configured` |
| `gemini` | `get_gemini_api_key` sidecar call | Key present and non-empty, or `not_configured` |
| `plugins` | `list_plugins` sidecar call | Returns plugin array; no error |
| `telemetry` | `os.platform()`, `os.totalmem()` | Real platform string; memory > 0 |

**Acceptable non-pass states:** `not_configured`, `offline` — these indicate missing optional deps, not failures.

**Gate blockers:** Any probe returning a status other than `production_ready`, `not_configured`, or `offline`.

---

## Evidence Storage

Probe results are saved to:
- `reports/backend/probe-run-{timestamp}.json` — Full probe evidence
- `reports/backend/mock-data-findings.json` — Mock scan results
- `reports/backend/security-scan.json` — Security scan results
- `reports/backend/real-data-verification.json` — Real-data check results
- `reports/backend/backend-readiness-report.json` — Final readiness score

---

## CI Integration

Add to `.github/workflows/production-ci.yml`:
```yaml
- name: Backend mock scan
  run: npm run verify:no-mocks

- name: Backend security scan
  run: npm run verify:security

- name: Backend real-data verification
  run: npm run verify:real-data

- name: Backend contract tests
  run: npm run test:backend:contracts
```

Live probe tests run in the full integration environment only (not in CI without sidecar).
