import type {
  LockStatus,
  NdxResult,
  RemoveLockPinRequest,
  SetLockPinRequest,
  VerifyLockPinRequest,
  VerifyLockPinResult
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

/**
 * `bridge.lock?.<method>?.()` rather than the usual `bridge.lock.<method>()`:
 * `LockProvider` calls `getLockStatus()` unconditionally on every app mount
 * (not just on a Lock-specific screen), so any existing test that stubs
 * `window.ndx` without a `lock` namespace would otherwise crash on an
 * unrelated screen — the same failure mode `onPowerStateEvent` hit earlier.
 */
export async function getLockStatus(): Promise<NdxResult<LockStatus>> {
  const bridge = getNdxBridge()
  if (!bridge?.lock) return bridgeUnavailableError()
  return bridge.lock.getStatus()
}

export async function setLockPin(request: SetLockPinRequest): Promise<NdxResult<LockStatus>> {
  const bridge = getNdxBridge()
  if (!bridge?.lock) return bridgeUnavailableError()
  return bridge.lock.setPin(request)
}

export async function removeLockPin(request: RemoveLockPinRequest): Promise<NdxResult<LockStatus>> {
  const bridge = getNdxBridge()
  if (!bridge?.lock) return bridgeUnavailableError()
  return bridge.lock.removePin(request)
}

export async function verifyLockPin(
  request: VerifyLockPinRequest
): Promise<NdxResult<VerifyLockPinResult>> {
  const bridge = getNdxBridge()
  if (!bridge?.lock) return bridgeUnavailableError()
  return bridge.lock.verifyPin(request)
}
