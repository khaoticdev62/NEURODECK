# No Mock Terminal Data Audit

## Scope

This audit confirms whether the terminal runtime paths contain hardcoded mock, sample, dummy, or fixture data that could be mistaken for real production output.

## Files Audited

| Path                                             | Type                | Finding                                                                  |
| ------------------------------------------------ | ------------------- | ------------------------------------------------------------------------ |
| `src/renderer/features/terminal/*`               | Frontend runtime    | No hardcoded mock data.                                                  |
| `src-tauri/src/pty_manager.rs`                   | Backend runtime     | No hardcoded mock data.                                                  |
| `src-tauri/src/terminal.rs`                      | Backend runtime     | No hardcoded mock data.                                                  |
| `src/renderer/__tests__/mocks/bridgeAdapter.ts`  | Test-only mock      | Contains terminal method stubs; isolated to tests.                       |
| `src/renderer/features/diagnostics/LogsView.tsx` | Production fallback | `generateMockLogs()` returns fake log lines when real logs fail to load. |

## Methodology

The following terms were searched across the audited runtime files:

- `mock`
- `sample`
- `dummy`
- `fixture`
- `TODO`

Only the LogsView fallback contained production-code data generation.

## Findings

### Positive finding: terminal runtime is mock-free

The interactive terminal, PTY manager, and terminal diagnostics modules use real process I/O and real environment probes. There are no synthetic sessions, fake shell outputs, or placeholder tool-availability results in production code.

### Issue: fake log fallback includes a PTY line

`src/renderer/features/diagnostics/LogsView.tsx::generateMockLogs()` produces hardcoded log entries as a fallback when log loading fails. One of those entries is:

```
PTY session spawned: main_pty_session
```

This can mislead operators into believing a real PTY session exists when the log source is actually unavailable.

## Remediation

**Status:** Open — the terminal runtime is mock-free, but the diagnostics log fallback remains production-visible and requires a separate UI fix.

1. Remove `generateMockLogs()` from `LogsView.tsx`.
2. When log loading fails, display an error state with:
   - A clear message such as "Unable to load logs."
   - A **Retry** button that re-fetches logs.
   - Optionally, a button to open the log directory directly.

## Verification

After remediation, re-run the search terms above in the following directories:

- `src/renderer/features/terminal/`
- `src/renderer/features/diagnostics/`
- `src-tauri/src/pty_manager.rs`
- `src-tauri/src/terminal.rs`

No production file should contain mock-like log output.
