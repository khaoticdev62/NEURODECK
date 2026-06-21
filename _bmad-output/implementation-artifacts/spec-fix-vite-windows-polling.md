---
title: 'Fix Vite Windows Repository Polling Saturation'
type: 'bugfix'
created: '2026-06-20'
status: 'in-review'
baseline_commit: '1971762c6b655204bc1f704a36db1a2255f9fc0b'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/investigations/dev-runtime-slowness-investigation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On Windows, the Vite development server uses polling every 300 ms while its root is the entire repository. The process owning port 1420 consequently scans large generated trees such as the 21,702-file Rust `target/` directory, consuming approximately 429% CPU and 586 MB RAM and making the whole application unresponsive.

**Approach:** Make native file watching the default on Windows, retain polling only as an explicit environment-controlled fallback, and exclude generated/build/test artifact trees in both modes. Restart the frontend dev server and require measured idle CPU plus stable navigation before accepting the fix.

## Boundaries & Constraints

**Always:** Keep Vite rooted at the repository because `index.html`, `src/renderer`, and shared aliases depend on it; preserve HMR on `127.0.0.1:24678`; retain an opt-in polling fallback for environments where native watching fails; ignore only generated/output/cache paths; preserve production build behavior.

**Ask First:** Any dependency change, change to frontend source layout, change to HMR ports/protocol, or modification outside `frontend/vite.config.ts` and the scoped implementation artifacts.

**Never:** Hide source directories from the watcher; increase the polling interval as the sole fix; modify concurrent backend, metadata, story, or user configuration changes; claim the bridge permission failure is fixed by this sprint.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Default Windows dev | No polling environment override | Native watcher is used and generated trees are ignored | HMR remains operational for renderer source edits |
| Polling fallback | `VITE_USE_POLLING=true` | Polling runs with the configured interval but still ignores generated trees | Invalid/absent override falls back to native watching |
| Production build | `vite build` | Existing output and chunk behavior are unchanged | Build failure remains visible |
| Live verification | Idle server on port 1420 | CPU usage drops from multi-core saturation to near-idle and navigation completes | Failure blocks acceptance and triggers watcher-scope review |

</frozen-after-approval>

## Code Map

- `frontend/vite.config.ts` -- repository root, Vite server watcher, HMR, aliases and build configuration.
- `_bmad-output/implementation-artifacts/investigations/dev-runtime-slowness-investigation.md` -- measured baseline and causal evidence.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/vite.config.ts` -- introduce explicit generated-tree ignore patterns and make polling opt-in through `VITE_USE_POLLING` -- stop continuous repository-wide stat scanning while preserving a fallback.
- [x] Live dev runtime -- restart only the port-1420 Vite process, verify HTTP/navigation/HMR readiness, and repeat the five-second CPU/RAM sample -- prove the mechanical issue is removed.
- [x] Verification -- run frontend typecheck and production build -- ensure watcher changes do not affect application compilation.

**Acceptance Criteria:**
- Given the default Windows environment, when the Vite dev server idles for five seconds, then its CPU delta is below one CPU-second and its working set no longer grows continuously.
- Given a renderer source change, when Vite is running with native watching, then HMR detects it without polling the generated build trees.
- Given `VITE_USE_POLLING=true`, when Vite starts, then polling remains available but ignores Rust, Electron, distribution, coverage and test-result output.
- Given the existing frontend, when typecheck and production build run, then both pass without configuration regressions.

## Spec Change Log

## Design Notes

Use an explicit boolean environment check (`VITE_USE_POLLING === "true"`) rather than platform detection. Keep ignore patterns centralized and documented so future generated directories can be added without changing watcher semantics.

## Verification

**Commands:**
- `npm run frontend:typecheck` -- expected: no TypeScript/config errors.
- `npm run frontend:build` -- expected: production bundle succeeds.
- Five-second process sample for the PID owning port 1420 -- expected: CPU delta below one second and stable memory.
- HTTP request to `http://127.0.0.1:1420` -- expected: status 200 and stable page navigation.

**Results:**
- Typecheck passed.
- Production build passed (2,127 modules, 3.25 seconds).
- Vite PID 5004 consumed 0 CPU-seconds over five seconds; working set remained 145.6 MB. Baseline was 21.47 CPU-seconds and 586 MB.
- Frontend returned HTTP 200, browser navigation completed, and the HMR WebSocket listened on port 24678.
- Bridge port 9477 remains offline and is explicitly outside this sprint.
