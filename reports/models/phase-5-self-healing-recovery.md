# Phase 5 — Self-Healing Connection Recovery Engine

## Status

**Complete.** Recovery evaluation engine, attempt tracking, and event logging are implemented and green.

## What was built

| File | Responsibility |
|---|---|
| `src-tauri/src/services/models/model_recovery_service.rs` | Evaluates recovery actions after a provider/model failure, enforces policy limits, and records recovery events. |
| `src-tauri/src/services/models/mod.rs` | Re-exports recovery helpers. |
| `src-tauri/src/commands/mod.rs` | New bridge commands: `evaluate_recovery`, `record_recovery_event`, `get_recovery_event_log`. |

## Recovery policy

Implemented limits from `docs/models/SELF_HEALING_CONNECTION_PLAN.md`:

- Max immediate retries: **1**
- Max recovery attempts per provider per 10 min: **3**
- Max provider restarts per session: **2**
- Max model reload attempts per model per session: **2**
- Max failover chain length: **3**
- Backoff delays: 500ms, 1500ms, 5000ms (delays are surfaced to caller; execution is caller-driven)

Stop conditions: `auth_failed`, `blocked`, `missing_binary`, and provider-level attempt exhaustion stop automatic recovery.

## Recovery decision order

1. **Stop** if unrecoverable state or provider attempt budget exhausted.
2. **Retry** once if the runtime supports request retry.
3. **Reload model** if state is `missing_model` / `degraded` and reload is supported.
4. **Restart provider** if offline/crashed/error and restart is configured.
5. **Failover provider** to a healthy connected runtime with the best compatible local model.
6. **Downgrade model** to a smaller installed model on the same runtime.
7. **Stop** if nothing is safe.

## Evidence store

Recovery events are appended to `reports/models/self-healing-evidence.json` (or `NEURODECK_REPORTS_DIR/models/self-healing-evidence.json` if set). The log is capped at 500 events.

## Bridge commands

- `evaluate_recovery` — `{ runtimeId, modelId?, state, agentId? }` → returns `RecoveryEvaluation` with `action`, `targetRuntimeId`, `targetModelId`, `reason`, `allowed`, `evidence`.
- `record_recovery_event` — `{ runtimeId, modelId?, state, action, allowed, reason }` → records event with generated id/timestamp.
- `get_recovery_event_log` — returns recorded events.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --lib` ✅ — 132 tests passed (3 new recovery tests)
- `npm run verify:model-support` ✅
- `npm run verify:no-production-mocks` ✅
- `npm run frontend:build` ✅

## Notes / next steps for Phase 6

- Integrate `evaluate_recovery` into the chat streaming path so failures trigger recovery automatically.
- Add agent-policy filtering to failover/downgrade targets (respect `minimumCompatibilityTier`, `blockedModelFamilies`, `allowRemoteFallback`).
- Surface recovery events in the UI diagnostics panel.
