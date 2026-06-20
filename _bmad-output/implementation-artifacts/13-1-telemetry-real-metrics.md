# Story 13.1: Wire real telemetry metrics into the diagnostics dashboard

Status: pending

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

- [ ] CPU %: Add a new Tauri command (e.g. `get_cpu_usage`) or extend `get_memory_usage` in `src-tauri/src/commands/mod.rs` (~line 3368) to also return `cpu_pct`, using `sysinfo::System::new_all()` + `refresh_cpu()` + `process(pid).cpu_usage()` (process-scoped) or `global_cpu_usage()` (system-wide) — decide and document which scope is more useful for the dashboard.
- [ ] CPU %: Update `src/renderer/services/bridge/domains/diagnostics.ts` `memoryUsage()` (or add a new method) to surface the new field, and update `TelemetryDashboardTab.tsx` line 104 to consume it instead of the literal `0`.
- [ ] Tokens/sec: Identify (or add) an instrumentation point inside each provider's `stream_response` in `src-tauri/src/llm.rs` (Gemini, Ollama, Hugging Face, Kimi, OpenAI-compatible — 5 implementations at lines ~186, ~603, ~893, ~1227, ~1642) to count tokens/chunks emitted and elapsed time.
- [ ] Tokens/sec: Decide on a transport mechanism — either accumulate in `AppState` and expose via a poll command, or `app_handle.emit("telemetry:update", ...)` during streaming — and implement it.
- [ ] Tokens/sec: Update `TelemetryDashboardTab.tsx` line 107 to consume the real value.
- [ ] IPC throughput: Instrument `src-tauri/src/bridge.rs` to track bytes sent/received over a rolling window (e.g. last 1s), exposed via a new command or the `telemetry:update` event.
- [ ] IPC throughput: Update `TelemetryDashboardTab.tsx` line 108 to consume the real value.
- [ ] Model load time: Identify the model manager / provider initialization path (provider construction in `llm.rs`, or wherever `set_config`/provider-switch happens) and wrap it with a timer; persist the last measured load time in `AppState`.
- [ ] Model load time: Expose via command or event; update `TelemetryDashboardTab.tsx` line 109 to consume the real value.
- [ ] Decide and implement the no-data fallback UI state ("—") for each of the 4 metrics, mirroring the existing `apiLatencyMs` zero-connection fallback pattern (lines ~95-101).
- [ ] Remove now-stale `// TODO:` comments at lines 104, 107, 108, 109 once each is wired.
- [ ] Manual verification: open the Diagnostics view, trigger an LLM completion and a few IPC round-trips, confirm all 4 metrics move off zero/placeholder.

## Dev Notes

- Reuse the existing `sysinfo = "0.33"` dependency already declared in `src-tauri/Cargo.toml` (line 59) — do not add a new crate for CPU metrics.
- The frontend already has a `listenBridge("telemetry:update", ...)` subscription wired up and waiting (`TelemetryDashboardTab.tsx` lines 121-132) — evaluate whether to drive metrics through this event channel (push model) vs. extending the existing 3-second `fetchSnapshot` poll (pull model, line 119) before implementing, to avoid having two competing data paths.
- Token/sec measurement needs a clear definition: is it tokens-per-second averaged over the whole response, or a live/instantaneous rate? Pick one and document the choice in code comments, since the dashboard sparkline implies a time series.
- IPC throughput direction (frontend→backend vs. backend→frontend vs. both combined) is undefined in the current code — make an explicit decision and note it in the command's doc comment.

## Dev Agent Record
### Agent Model Used
[unassigned]
