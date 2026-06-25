import { useContext } from 'react'
import { LockContext, type LockContextValue } from './lockContext'

export function useLockState(): LockContextValue {
  const context = useContext(LockContext)
  if (!context) throw new Error('useLockState must be used within a LockProvider')
  return context
}
