import { createContext } from 'react'

export interface LockContextValue {
  /** Whether a PIN is currently configured (`lock.getStatus`'s `enabled`). */
  pinConfigured: boolean
  /** Re-reads `pinConfigured` after the PIN is set/changed/removed elsewhere (e.g. Privacy and Permissions). */
  refreshStatus: () => Promise<void>
  isLocked: boolean
  /** When the lock was last engaged — lets `LockScreen` honestly count only actions cancelled since then, not lump in unrelated earlier cancellations. */
  lockedAt: number | null
  /** Engages the lock — no-op if no PIN is configured (there would be no way to unlock again). */
  lock: () => void
  /** Verifies the PIN against the real main-process check; clears `isLocked` only on a real match. */
  unlock: (pin: string) => Promise<boolean>
}

export const LockContext = createContext<LockContextValue | null>(null)
