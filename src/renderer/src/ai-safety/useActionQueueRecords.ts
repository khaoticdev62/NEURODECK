import { useEffect, useState } from 'react'
import type { HarnessActionRecord } from './contracts/plan'
import { useAiSafety } from './useAiSafety'

/** Re-renders whenever the action queue changes — submissions, approvals, completions, cancellations. */
export function useActionQueueRecords(): HarnessActionRecord[] {
  const { queue } = useAiSafety()
  const [records, setRecords] = useState(() => queue.list())

  useEffect(() => queue.onChange(() => setRecords(queue.list())), [queue])

  return records
}
