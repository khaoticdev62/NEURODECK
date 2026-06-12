# NEURODECK Self-Healing Connection Plan

## 1. Goals

- Detect broken provider/model/runtime connections automatically.
- Record every failure, retry, and recovery action with evidence.
- Never silently fallback to mock data or remote providers without permission.
- Surface honest status to the user.
- Stop recovery when further attempts are unsafe.

## 2. Failure Types

| Failure | Detection | Recovery Actions |
|---|---|---|
| Provider offline | Health probe timeout/refused | Retry, failover, downgrade |
| Provider timeout | Request timeout | Retry with backoff, failover |
| Model missing | Model not in discovered list | Reload model, switch model |
| Model unloaded | Tiny prompt returns 404 | Reload model |
| Runtime crashed | Process not running / connection reset | Restart if configured, failover |
| Local server not running | `offline` state | User action or safe restart |
| Network error | DNS/TCP failure | Retry, failover to local |
| Auth expired | 401/403 | Mark `auth_failed`, stop |
| Rate limited | 429 | Backoff, failover |
| Stream interrupted | EOF mid-stream | Retry request, failover |
| IPC failure | Electron IPC error | Reconnect bridge |
| Storage failure | DB write error | Degraded mode, log evidence |
| Agent selected incompatible model | Policy check | Switch to compatible model |
| Deck memory pressure | Memory > threshold | Downgrade to smaller model |
| Deck thermal/battery pressure | Performance mode | Downgrade or pause |

## 3. Recovery Policy

### Limits

| Limit | Value |
|---|---|
| Max immediate retries | 1 |
| Max recovery attempts per provider per 10 min | 3 |
| Max provider restarts per session | 2 |
| Max model reload attempts per model per session | 2 |
| Max failover chain length | 3 |
| Backoff delays | 500ms, 1500ms, 5000ms |

### Stop Conditions

Recovery must stop for:
- `auth_failed`
- `missing_credentials`
- `unsupported_model`
- `user_cancelled`
- `dangerous_restart_required`
- `repeated_oom`
- `repeated_crash`

## 4. Recovery Sequence

1. **Detect** failure from provider health or chat stream error.
2. **Classify** failure type.
3. **Record** diagnostics evidence.
4. **Check** if recovery allowed by policy.
5. **Retry** once with backoff if safe.
6. **Re-run** provider health probe.
7. **Reload** model if supported.
8. **Restart** provider only if configured and safe.
9. **Fail over** to compatible provider/model if allowed.
10. **Downgrade** to smaller Steam Deck-safe model if allowed.
11. **Preserve** user message/session state.
12. **Surface** honest status to UI.
13. **Export** recovery evidence.

## 5. Failover Rules

Allowed only when:
- User enabled failover in settings.
- Target provider is healthy.
- Target model is compatible with selected agent.
- Target model is Steam Deck-safe or user opted into heavy mode.
- No privacy boundary violated.
- User message/session preserved.
- Diagnostics records route change.

Failover order:
1. Same provider, same model retry.
2. Same provider, smaller compatible model.
3. Same provider, default Deck-safe model.
4. Alternate local provider, compatible model.
5. Remote provider if `allowRemoteFallback` enabled.
6. Blocked with clear user action.

## 6. Privacy Rules

- Never silently send local-private prompts to remote provider unless `allowRemoteFallback` is true.
- `Sealed` privacy records never leave local runtime.

## 7. Evidence Export

All recovery events are stored in `recoveryEventStore` and exported to:
- `reports/models/self-healing-evidence.json`
- UI diagnostics panel
