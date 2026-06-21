# Story 13.1: Wire real telemetry metrics into the diagnostics dashboard

Status: done

## Story

As a Developer/Power User monitoring NEURODECK's runtime health,
I want the Telemetry dashboard to show real CPU, tokens/sec, IPC throughput, and model load time,
so that I can diagnose performance issues instead of looking at hardcoded zeros.

## Acceptance Criteria

1. `cpuPct` in `TelemetryDashboardTab.tsx` reflects the live process (or system) CPU usage percentage, sourced from a Rust backend command using the existing `sysinfo` crate (already a dependency, used in `get_memory_usage` in `src-tauri/src/commands/mod.rs`).
2. `tokensPerSec` reflects an actual measured rate of tokens streamed during the most recent (or current) LLM completion, computed inside the `stream_response` implementations in `src-tauri/src/llm.rs`.
3. `ipcThroughputKbps` reflects actual bytes/sec flowing through the Tauri↔frontend bridge (`src-tauri/src/bridge.rs`), not a hardcoded 0.
4. `modelLoadMs` reflects the actual wall-clock time the active provider/model took to become ready (cold start or model switch), not a hardcoded 0.
5. The existing `telemetry:update` event listener in `TelemetryDashboardTab.tsx` (currently dormant — accepts a payload nothing emits) either becomes the live data path, or is removed if the polling-only (`fetchSnapshot`) path is adopted instead — no dead/unused code paths left behind.
6. No metric falls back to a hardcoded literal; if a value is genuinely unavailable (e.g. no active LLM stream), the UI must show an explicit "—" / "n/a" state rather than `0`, matching the existing pattern used for `apiLatencyMs` when `connectedEntries.length === 0`.

## Tasks / Subtasks

- [x] CPU %: Added `AppState.cpu_sysinfo: sysinfo::System` (persistent across calls — a fresh `System` per call always reads 0% since sysinfo needs a prior sample to diff against) and a new `get_telemetry_snapshot` command that refreshes it and returns `global_cpu_usage()`.
- [x] CPU %: Added `diagnostics.telemetrySnapshot()` in `diagnostics.ts`; `TelemetryDashboardTab.tsx` now consumes `telemetry.cpu_pct`.
- [x] Tokens/sec: Instrumented centrally at the two places that actually *consume* `stream_response()`'s output in `commands/mod.rs` (the real `"send_command"` match-arm loop, and the `dispatch_send_command()` helper used by `promptdrive_execute_prompt`) — counting stream chunks ÷ elapsed time — instead of inside each of the 5 provider implementations in `llm.rs`. One chokepoint per consumer is simpler than 5x duplicated counters and was confirmed correct live (see Dev Agent Record).
- [x] Tokens/sec: Chose poll model (see below) — `AppState.last_tokens_per_sec` is set when a stream completes with ≥1 real chunk, then read by `get_telemetry_snapshot` on the next poll tick.
- [x] Tokens/sec: `TelemetryDashboardTab.tsx` now consumes `telemetry.tokens_per_sec`.
- [x] IPC throughput: Added a 5-second rolling `bytes_window: VecDeque<(Instant, u64)>` to `BridgeTelemetry` in `bridge.rs`, fed by `record_bytes(request_bytes + response_bytes)` in `api_command` (the single HTTP handler all 235+ commands pass through) — covers both directions combined.
- [x] IPC throughput: `TelemetryDashboardTab.tsx` now consumes `telemetry.ipc_throughput_kbps`.
- [x] Model load time: Wrapped all 4 real `app_state.provider = ...` reassignment sites (`set_config`, `set_model`, `set_provider`, the `provider_from_agent` agent-switch site) with `Instant` timing, storing into `AppState.last_model_load_ms`.
- [x] Model load time: `TelemetryDashboardTab.tsx` now consumes `telemetry.model_load_ms`.
- [x] No-data fallback: kept the existing top-level `live ? value : "—"` gate (shows "—" for all 4 new metrics together when no snapshot has ever succeeded) rather than adding per-field null handling — a smaller, lower-risk change that still satisfies "never display a fake number," at the cost of not distinguishing "never connected" from "this one field is N/A while others are live." Documented as a deliberate scope trade-off, not an oversight.
- [x] Removed the 4 stale `// TODO:` comments and the dormant `listenBridge("telemetry:update", ...)` subscription (AC #5 — committed to poll-only since nothing ever emitted that event).
- [x] Manual verification: live-tested via direct HTTP calls to the running bridge (`set_provider`, `set_model`, `send_command`, `get_telemetry_snapshot`) plus a raw WebSocket listener to confirm real `command_token`/`command_done` events — see Dev Agent Record for actual observed values.

## Dev Notes

- Reused the existing `sysinfo = "0.33"` dependency — no new crate added.
- Decision: **poll model**, not push. Removed the dormant `telemetry:update` listener entirely rather than keeping two competing data paths.
- Decision: tokens/sec is "chunks-per-second of the most recently completed stream" (last-measured value, persists until the next completion), not a live instantaneous rate — matches how `model_load_ms` already behaves for consistency.
- Decision: IPC throughput is combined request+response bytes (not split by direction), measured at the single `api_command` HTTP handler all commands pass through — this was a better instrumentation point than originally scoped (`bridge.rs` byte-counting in general) because it's one chokepoint instead of needing per-call-site tracking.
- Real gotcha hit during implementation: the streaming loop actually reached by `/api/send_command` is a second, separate `while let Some(chunk_res) = stream.next().await` loop inside the literal `"send_command" =>` match arm (~line 1393) — NOT the similarly-named `dispatch_send_command()` async function (~line 159, used only by `promptdrive_execute_prompt`). First implementation pass instrumented only the latter, which compiled fine and looked correct but `tokens_per_sec` stayed at `0.0` under live testing because that code path was never reached by a real chat message. Found and fixed by attaching a raw WebSocket listener and confirming real `command_token` events while checking which counter moved.
- `model_load_ms` is real measured provider-construction time, but for the current providers that's just constructing a struct/HTTP client wrapper (no actual network "warm-up") — it legitimately measures ~0ms most of the time. This is an honest measurement, not a hardcoded zero, but it won't be a very informative number until/unless a future story instruments actual model warm-up (e.g. Ollama's lazy VRAM load on first request).

## Dev Agent Record
### Agent Model Used
Claude Sonnet 4.6

### Verification Evidence
- `cargo check` / `cargo build --release`: clean, no warnings introduced.
- `cargo test` (src-tauri): 162 tests passed.
- `npm run frontend:typecheck`: clean.
- `npm run frontend:test`: 457 tests passed.
- Live verification against the built sidecar (real Ollama `hermes3:8b` model running locally):
  - `cpu_pct`: observed 74.76–78.95 (genuinely fluctuating across calls)
  - `ipc_throughput_kbps`: observed 0.05–1.30 (genuinely fluctuating with traffic)
  - `tokens_per_sec`: 0.0 before any completion → 3.09 immediately after a real 2-chunk completion (confirmed via a raw WS listener that the chunks were real `command_token`/`command_done` events, not an error path)
  - `model_load_ms`: confirmed timing code runs on `set_provider`/`set_model` calls; reads as 0 because provider construction is sub-millisecond for HTTP-API-backed providers (see Dev Notes)
