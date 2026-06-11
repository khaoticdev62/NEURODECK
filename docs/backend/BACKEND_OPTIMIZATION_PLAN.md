# NEURODECK Backend Optimization Plan

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)

---

## Overview

This plan addresses performance bottlenecks identified in the backend architecture. All items are bounded to the current Electron + Rust sidecar stack. No architectural changes are proposed.

---

## Priority 1 — Sidecar Startup Latency

**Observation:** Electron polls `/health` every 300ms until the sidecar responds. Cold-start (Rust binary launch + axum bind + AppState init + Lua plugin load) takes 1.5–3s on fast hardware and 4–8s on SteamOS slow-flash storage.

**Optimization:**
- Parallelize Lua plugin loading (currently sequential). Use `tokio::spawn` per plugin file.
- Lazy-load `memory.rs` vector DB index (defer until first memory command, not at startup).
- Reduce health poll interval from 300ms to 150ms after first non-200 to detect ready faster without CPU spin.
- Estimated gain: 0.5–1.5s startup reduction.

**Risk:** Low — plugin load parallelism requires Arc clones of AppState, already done in other places.

---

## Priority 2 — IPC Round-Trip Overhead

**Observation:** Every `window.neurodeck.*` call serializes to JSON, passes through `contextBridge`, deserialized in main, re-serialized to HTTP, sent over loopback to sidecar, deserialized again. This is 4 serialization steps per call.

**Optimization:**
- Batch diagnostic and state-hydration calls at startup via a single `get_initial_state` sidecar command (already partially done in `useNeuroDeckState.ts`).
- Cache `get_config` in the main process for 5s to reduce cold reads during settings panel rendering.
- Estimated gain: 30–60ms per hydration sequence.

**Risk:** Low — caching config is safe as settings changes emit invalidation events.

---

## Priority 3 — Memory Search Latency

**Observation:** `memory_search` uses O(n) cosine-similarity scan over all stored facts. With >500 facts, this can exceed 100ms per RAG context injection, which runs on every `send_command`.

**Optimization:**
- Add a simple HNSW-style index (hnswlib via FFI or pure-Rust `hnsw_rs`) to accelerate nearest-neighbor search.
- Or: limit RAG search to the last 200 facts by creation date (recency window) as a cheaper alternative.
- Estimated gain: 50–200ms per `send_command` when memory > 200 facts.

**Risk:** Medium — HNSW adds a new crate dependency. Recency window approach is zero-dependency.

**Recommendation:** Implement recency window first (1-line change to `memory.rs`), then evaluate HNSW if 500+ facts becomes common.

---

## Priority 4 — Bridge Adapter Retry Storms

**Observation:** When the sidecar is restarting, all in-flight `bridgeInvoke` calls reject and some callers retry immediately, causing a brief request storm (5–15 concurrent health polls + retried commands).

**Optimization:**
- Add exponential backoff with jitter to `bridgeInvoke` retry logic: `min(baseMs * 2^attempt, 5000ms) + rand(0, 200)`.
- Add a global "sidecar down" flag in the bridge adapter that prevents new calls from queuing during known outage.
- Estimated gain: Eliminates request storm; faster recovery detection.

**Risk:** Low — purely defensive change.

---

## Priority 5 — LSP Diagnostics Noise

**Observation:** When multiple files are open in the IDE view, each keystroke triggers a `textDocument/didChange` notification and potentially a diagnostics response. With slow language servers, this creates diagnostic debounce failures.

**Optimization:**
- Debounce `textDocument/didChange` notifications to 300ms in `lsp-manager.js` (currently fires on every character).
- Cap diagnostic events at 100 items per file before forwarding to renderer.
- Estimated gain: Reduces LSP subprocess pressure by 60–80%.

**Risk:** Low — debounce is standard LSP client pattern.

---

## Deferred / Not Recommended

| Item | Reason Deferred |
|------|-----------------|
| SQLite for sessions | Filesystem JSON is adequate for current scale (<1000 sessions). Migration cost > benefit. |
| WASM LLM runtime | Cannot match sidecar latency for streaming inference. |
| Service worker offline cache | Not relevant for Electron environment. |
| GraphQL for IPC | Over-engineering for 250 IPC channels. REST-over-HTTP is correct here. |
