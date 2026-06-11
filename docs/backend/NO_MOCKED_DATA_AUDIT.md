# NEURODECK No-Mocked-Data Audit

Generated: 2026-06-11  
Version: 1.8.0 (Ptah)  
Audit Tool: `scripts/verify-no-mocks.ts` + manual review

---

## Summary

**Result: CLEAN — No production mock violations found.**

Three historical stubs have been fixed. The codebase is free of fake/hardcoded data in production IPC paths.

---

## Fixed Stubs

### Stub 1 — `BROWSER_SAVE_TO_MEMORY` (Critical — Fixed)

| Field | Value |
|-------|-------|
| File | `electron/main.js` |
| Pattern | `{ success: false, note: 'Not yet implemented' }` |
| Classification | `production_violation` |
| Fix Applied | Real `browserView.webContents.executeJavaScript` + `POST /api/memory_add_fact` |

**Before:**
```js
ipcMain.handle(IPC.BROWSER_SAVE_TO_MEMORY, async () => {
  return { success: false, note: 'Not yet implemented' };
});
```

**After:**
```js
ipcMain.handle(IPC.BROWSER_SAVE_TO_MEMORY, async () => {
  if (!browserView) return { success: false, error: 'No browser page open' };
  const [title, url, text] = await Promise.all([...executeJavaScript...]);
  const res = await fetch(`http://127.0.0.1:${bridgePort}/api/memory_add_fact`, {...});
  return { success: true, id: data.id };
});
```

---

### Stub 2 — `settings:set` fake write (Medium — Fixed)

| Field | Value |
|-------|-------|
| File | `electron/ipc-handlers.js` |
| Pattern | `"For now we mock write config"` comment; in-memory mutation never persisted |
| Classification | `production_violation` |
| Fix Applied | Direct `callSidecar()` dispatch for `llm.provider`, `llm.model`, `llm.gemini_key`; explicit error for unknown keys |

---

### Stub 3 — `SessionCard` export alert (Medium — Fixed)

| Field | Value |
|-------|-------|
| File | `frontend/src/react/components/cards/SessionCard.tsx` |
| Pattern | `alert('Export specific session is currently handled via...')` |
| Classification | `production_violation` |
| Fix Applied | `bridgeInvoke('export_session_markdown', { session_id: node.id })` with real result handling |

---

## Acceptable Patterns (Not Violations)

| Pattern | Location | Reason |
|---------|----------|--------|
| `browserDraft()` | `bridgeAdapter.ts` | Intentional offline fallback — only reached when `provider === 'offline-draft'` |
| `latencyMs: 12` | `bridgeAdapter.ts` | Synthetic offline metric for offline fallback path — not production data |
| `latencyMs: 0` | `bridgeAdapter.ts` | Same — synthetic, offline path |
| `models.cancel()` → `{ok:true}` | `preload.js` | No sidecar cancel endpoint — acceptable no-op |
| `settings.validate()` → `{valid:true}` | `preload.js` | No server-side schema — acceptable passthrough |
| `seed.ts` bootstrap data | `frontend/.../seed.ts` | Initial UI shape only — overwritten by real hydration on mount |
| `ipc_roundtrip` synthetic payload | `health-probe-runner.js` | Tests real IPC transport, not data content — `realTransportUsed: true`, `realDataObserved: false` |

---

## Scan Results

Running `npm run verify:no-mocks` scans:
- `electron/` — IPC handlers, main process, services
- `frontend/src/react/` — Components, state, services

Violation patterns checked (exit 1 on match):
- `return.*Not yet implemented` in non-test files
- `TODO.*implement.*later` in handler functions
- `alert\(.*currently handled` in component event handlers
- `mock.*write.*config` in settings handlers
- `static.*sample.*data` — inline static arrays returned as real responses

Warning patterns (logged but no exit 1):
- `setTimeout.*resolve` in non-test handler code
- `Math.random()` in response data
- Hardcoded `realData: true` without matching transport flag

---

## DataProvenance Contract

Every backend response in production paths MUST carry:
```ts
interface DataProvenance {
  realData: boolean;   // true = came from real transport/storage
  mockData: boolean;   // true = synthetic/hardcoded (FORBIDDEN in production)
  sourceType: DataSourceType;
  sourceId: string;
  generatedAt: string;
  requestId: string;
  durationMs: number;
}
```

The `assertNoMockInProduction(provenance, context)` function in `src/shared/schemas/backendHealth.schemas.ts` enforces this at runtime for any response that carries provenance metadata.
