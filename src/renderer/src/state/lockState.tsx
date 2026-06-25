import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAiSafety } from '../ai-safety/useAiSafety'
import { getLockStatus, verifyLockPin } from '../services/ipc/lockClient'
import { LockContext, type LockContextValue } from './lockContext'

/**
 * ND-002 Lock Screen engagement state. Scoped to a single local PIN (see
 * `shared/contracts/lock.ts`) — locking is a renderer-level full-screen
 * gate (`ShellLayout` swaps its content for `LockScreen` while `isLocked`),
 * not a separate OS-level session lock. Engaging the lock also calls the
 * real, existing `ActionQueue.emergencyStop()` (the same mechanism ND-054
 * Emergency Stop uses) so pending/queued tool actions can't silently
 * execute while no one can see the screen — already-running actions still
 * complete, matching Emergency Stop's own documented behavior. Unlocking
 * does not auto-resume the queue, for the same reason Emergency Stop
 * doesn't auto-resume itself: resuming is a deliberate action a user takes
 * from the Execution Timeline, not an automatic side effect of dismissing
 * a screen.
 */
export function LockProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { queue } = useAiSafety()
  const [pinConfigured, setPinConfigured] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedAt, setLockedAt] = useState<number | null>(null)

  const refreshStatus = useCallback(async () => {
    const result = await getLockStatus()
    if (result.ok) setPinConfigured(result.data.enabled)
  }, [])

  // Direct `.then()` rather than `void refreshStatus()` — calling an
  // indirect async callback that itself calls setState trips
  // `react-hooks/set-state-in-effect`; the same pattern FocusEngineProvider
  // already uses for its own once-on-mount IPC read.
  useEffect(() => {
    let active = true
    getLockStatus().then((result) => {
      if (active && result.ok) setPinConfigured(result.data.enabled)
    })
    return () => {
      active = false
    }
  }, [])

  const lock = useCallback(() => {
    if (!pinConfigured) return
    queue.emergencyStop()
    setLockedAt(Date.now())
    setIsLocked(true)
  }, [pinConfigured, queue])

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const result = await verifyLockPin({ pin })
    const valid = result.ok && result.data.valid
    if (valid) setIsLocked(false)
    return valid
  }, [])

  const value = useMemo<LockContextValue>(
    () => ({ pinConfigured, refreshStatus, isLocked, lockedAt, lock, unlock }),
    [pinConfigured, refreshStatus, isLocked, lockedAt, lock, unlock]
  )

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>
}
