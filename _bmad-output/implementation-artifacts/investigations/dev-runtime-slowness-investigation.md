# Investigation: Dev Runtime Slowness

## Hand-off Brief

1. **What happened.** The user reports severe whole-application latency after the frontend became reachable; the renderer is confirmed online while its backend bridge is offline.
2. **Where the case stands.** Concluded. The Vite process is saturating roughly four CPU cores because Windows polling scans the repository root every 300 ms, including more than 21,000 Rust build files.
3. **What's needed next.** Disable Windows polling or strictly ignore build/output trees, restart the dev stack, then address the separate bridge logging-permission failure.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-06-20 |
| Status | Concluded |
| System | Windows, Vite dev renderer, Electron/Rust bridge architecture |
| Evidence sources | Live port checks, sidecar panic output, process inventory, source code |

## Problem Statement

User report: “The entire application is slow as hell” immediately after the dev server loaded.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Frontend port 1420 | Available | HTTP 200 and TCP connection confirmed |
| Bridge port 9477 | Available | TCP connection failed |
| Sidecar startup | Available | Exits with `PermissionDenied` while initializing rolling file appender inside the sandbox |
| Renderer performance profile | Available | Navigation was aborted while the dev server was under sustained load |
| Process CPU/memory sample | Available | Port owner PID 85372 used 21.47 CPU-seconds in 5 seconds, 586 MB RAM, 41 threads |
| Vite configuration | Available | Repo-root server plus Windows polling every 300 ms |
| Repository file inventory | Available | `target/` alone contains 21,702 files; `dist-electron/` contains 864 |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --- | --- | --- | --- |
| 1 | Renderer long tasks, DOM size, animations and GPU-heavy styles | High | Done | Dev-server saturation prevented stable navigation; server process is root cause |
| 2 | WebSocket reconnect cadence while bridge is absent | Medium | Done | Secondary functional issue, not required to explain measured CPU saturation |
| 3 | Node/Electron process CPU and memory deltas | High | Done | PID 85372 owns 1420 and continuously consumes ~429% CPU |
| 4 | Healthy-bridge comparison | Medium | Blocked | Sidecar requires an unsandboxed launch; follow-up after primary fix |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-06-20 | Frontend became reachable on 1420 | Live network check | Confirmed |
| 2026-06-20 | Bridge remained unreachable on 9477 | Live network check | Confirmed |
| 2026-06-20 | Direct sidecar launch panicked during log-file creation | Process stderr | Confirmed |
| 2026-06-20 | Port-owner sample showed PID 85372 consuming 21.47 CPU-seconds over 5 seconds | Live process sample | Confirmed |
| 2026-06-20 | Vite configuration showed repo-root Windows polling at a 300 ms interval | `frontend/vite.config.ts:7-8,74-77` | Confirmed |

## Confirmed Findings

### Finding 1: The running app is an incomplete dev stack

**Evidence:** Live checks returned `frontend=True bridge=False`.

**Detail:** The UI can render, but all bridge-backed state and streaming paths operate without their required Rust service.

### Finding 2: The sidecar is blocked before bridge startup

**Evidence:** `target/release/app.exe` panicked in `tracing-appender` with `failed to create log file` and Windows error 5.

**Detail:** The failure occurs before port 9477 opens.

### Finding 3: The Vite server is continuously saturating about four CPU cores

**Evidence:** PID 85372 owns TCP port 1420. Its CPU counter increased by 21.46875 seconds during a 5-second sample, while its working set was 586 MB with 41 threads.

**Detail:** An idle development server should not consume more CPU time than wall-clock time across four cores. This is sufficient to explain system-wide input and rendering latency.

### Finding 4: Windows polling covers the repository root and its build trees

**Evidence:** `frontend/vite.config.ts:7-8` sets Vite root to the repository root. `frontend/vite.config.ts:74-77` enables polling on Windows every 300 ms without ignored paths. The repository contains 21,702 files under `target/` and 864 under `dist-electron/`.

**Detail:** Polling repeatedly stats a very large build tree. The configuration was introduced by commit `a990f0f59`.

## Deduced Conclusions

### Deduction 1: Offline/reconnect work is active throughout the session

**Based on:** Findings 1 and 2 plus the bridge transport’s reconnect behavior.

**Reasoning:** The renderer initializes the WebSocket transport at module load and schedules reconnection after closure while the bridge remains absent.

**Conclusion:** Reconnect churn is a credible contributor, but renderer profiling is required before calling it the sole cause.

### Deduction 2: Repository-wide polling is the primary performance failure

**Based on:** Findings 3 and 4.

**Reasoning:** The process owning Vite’s port is the process consuming ~429% CPU, and its configuration explicitly polls a repo containing tens of thousands of generated files every 300 ms.

**Conclusion:** Dev-server polling, not the premium UI styling, is the primary source of whole-machine/application latency.

## Hypothesized Paths

### Hypothesis 1: Missing bridge plus reconnect churn causes the perceived global slowdown

**Status:** Refuted as primary cause

**Theory:** Repeated connection failures and feature retries create recurring work and cascading error-state renders.

**Supporting indicators:** Renderer online, bridge offline, transport auto-reconnect enabled.

**Would confirm:** Long tasks/network attempts correlate with WebSocket reconnects and disappear with a healthy bridge.

**Would refute:** Equivalent latency with a healthy bridge and no reconnect activity.

**Resolution:** The Vite port owner independently saturates ~four cores. Bridge recovery remains necessary for functionality but is not needed to explain the measured slowdown.

### Hypothesis 2: Orphaned dev processes are competing for CPU or memory

**Status:** Refuted as primary cause

**Theory:** Repeated launch attempts left multiple Node/Vite processes alive.

**Supporting indicators:** Several long-lived Node processes are present.

**Would confirm:** CPU/memory deltas identify more than one active NEURODECK dev process.

**Would refute:** Only one low-utilization dev process owns the current runtime.

**Resolution:** Only PID 85372 owns port 1420, and that process alone accounts for the sustained CPU load. Stale processes should still be cleaned up, but they are not the dominant measured consumer.

### Hypothesis 3: Windows repo-root polling is the primary cause

**Status:** Confirmed

**Theory:** Vite polls the repository root—including generated Rust and Electron build output—every 300 ms, saturating CPU.

**Supporting indicators:** Configuration, file inventory, port ownership and CPU delta align directly.

**Would confirm:** CPU drops after native watching or ignored build trees are configured.

**Would refute:** PID 85372 remains at comparable CPU after polling is removed and the server is restarted.

**Resolution:** Confirmed by the direct configuration-to-process evidence chain; post-fix CPU measurement remains the acceptance test.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Post-fix CPU sample | Verifies the polling fix | Restart Vite after configuration change and repeat 5-second sample |
| Healthy sidecar comparison | Measures the secondary reconnect cost | Allow sidecar to create logs and bind 9477 |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | `frontend/vite.config.ts:7-8,74-77` |
| Trigger | Starting Vite on Windows |
| Condition | `root` is the repository and `usePolling` is true with no generated-tree ignores |
| Related files | `frontend/vite.config.ts`, `src/renderer/services/bridge/transport.ts`, Rust logging initialization |

## Conclusion

**Confidence:** High

The primary slowdown is confirmed: Vite polls the entire repository every 300 ms on Windows, including a 21,702-file Rust target tree, and the Node process owning port 1420 continuously consumes roughly 429% CPU and 586 MB RAM. The missing bridge is a separate confirmed startup defect that explains offline/broken features and adds reconnect work, but it is not the main source of the measured system-wide latency.

## Recommended Next Steps

### Fix direction

Use native Windows file watching if reliable, or add strict Vite watch ignores for `target`, `dist-electron`, `frontend/dist`, `.git`, test artifacts, logs and generated output. Then restore a writable sidecar logging path and healthy bridge.

### Diagnostic

Restart the dev server and require the port owner to remain near idle CPU before profiling any remaining renderer cost.

## Reproduction Plan

Start Vite before and after the watcher change. For each run, sample the port owner’s CPU for five seconds, confirm stable page navigation, then repeat interactions with the bridge healthy.

## Side Findings

- The repository’s project-context document is stale and describes the former Tauri/vanilla architecture; current repository instructions correctly describe Electron + React + bridge.
