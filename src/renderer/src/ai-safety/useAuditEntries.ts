import { useEffect, useState } from 'react'
import type { AuditEntry } from './AuditLog'
import { useAiSafety } from './useAiSafety'

/** Re-renders whenever a new audit entry is recorded. */
export function useAuditEntries(): AuditEntry[] {
  const { audit } = useAiSafety()
  const [entries, setEntries] = useState(() => audit.list())

  useEffect(() => audit.onChange(() => setEntries(audit.list())), [audit])

  return entries
}
