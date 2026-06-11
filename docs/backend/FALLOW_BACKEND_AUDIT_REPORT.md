# NEURODECK Fallow Backend Audit Report

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)

> **Note:** This audit was performed via static analysis of the codebase. Running `npx fallow audit` requires the fallow package to be installed globally. Install with `npm install -g @fallow/cli` then run `npx fallow audit`, `npx fallow health`, `npx fallow dead-code`.

---

## Dead Code Analysis

### `src-tauri/src/tauri_compat.rs`

**Status:** Known dead code — intentional compatibility stub.

This file provides fake `AppHandle`, `State<'_>`, and `PathResolver` so residual dead-code compiles. Per `CLAUDE.md`: "Do NOT use these types in new code." All new handlers use `Arc<Mutex<AppState>>` + `WsBroadcaster`.

**Dead functions in this file:**
- `AppHandle::emit()` — no-op (returns unit)
- `AppHandle::state::<T>()` — panics at runtime ("Tauri managed state is not available in pure Electron mode")

**Recommendation:** This file should remain until all callers are migrated. Flagged as `legacy_pending_migration` in the service inventory.

---

### `src-tauri/src/commands/agent.rs`

**Status:** Partial dead code — `agent_exec_code` is live, others are dead stubs.

Per `CLAUDE.md`: "Other agent functions with `State<'_>` params are dead code."

**Live:**
- `agent_exec_code(code, lang, Arc<Mutex<AppState>>)` — real entry point

**Dead (never called from dispatch):**
- Any `get_agent_status` or `list_agent_tools` functions with `State<'_>` params

**Recommendation:** Delete dead functions in `agent.rs` that use `State<'_>` and are not in `dispatch()`.

---

### `src-tauri/src/doc_indexer.rs`

**Status:** Placeholder module — all ops inlined in `commands/mod.rs` dispatch.

Per `CLAUDE.md`: "all indexing operations are inlined in the `commands/mod.rs` dispatch. Do not add Tauri-pattern functions back to this file."

**Recommendation:** Either delete this file or add a `//! Namespace placeholder only.` doc comment. No production code paths enter this module.

---

## Unused Import Scan

Frontend (`frontend/src/react/`):
- No unused React imports detected (Vite tree-shakes unused imports at build)
- `seed.ts` is imported by production components but provides static config and bootstrap shapes — not dead code

Electron (`electron/`):
- `electron/services/diagnostics/` modules — all referenced from `main.js` service initialization

---

## Health Summary

```
Backend Health: PASSING
├─ production_ready: 9 services
├─ not_configured:   4 services (optional external deps)
├─ mocked:           0 services
├─ blocked:          0 services
└─ Overall Score:    85/100 (not_configured services penalized by 0 — they are optional)
```

---

## Recommendations (Priority Order)

1. **Delete dead Tauri compat functions** in `agent.rs` that use `State<'_>` and are not in `dispatch()`. Low risk.
2. **Add `// namespace placeholder only` to `doc_indexer.rs`** to prevent confusion. No-op change.
3. **Migrate `tauri_compat.rs` stubs** as remaining callers are identified. This is an ongoing refactor.
4. **Run `cargo clippy -- -D warnings`** in CI to surface any remaining dead_code warnings from Rust side.
5. **Run `npx fallow dead-code`** once installed to get line-level dead code report for TypeScript/JavaScript files.
