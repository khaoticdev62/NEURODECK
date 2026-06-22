import { ndxError, type NdxBridge, type NdxResult } from '@shared/contracts'

/**
 * Every IPC client function goes through this guard rather than calling
 * `window.ndx.*` directly — if the bridge is somehow missing (a malformed
 * preload load, or a test that forgot to stub it), callers get a real,
 * typed `NdxResult` error instead of a raw `TypeError: window.ndx is
 * undefined` crash.
 */
export function getNdxBridge(): NdxBridge | null {
  return typeof window !== 'undefined' && window.ndx ? window.ndx : null
}

export function bridgeUnavailableError(): NdxResult<never> {
  return {
    ok: false,
    error: ndxError(
      'system',
      'bridge-unavailable',
      'NeuroDeck lost its connection to the core service.'
    )
  }
}
