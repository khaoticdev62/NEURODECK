import { useEffect, useState } from 'react'
import type { FeatureState } from '@shared/contracts'
import { listFeatures } from '../../services/ipc/featureClient'

/**
 * Real Epic X1 Feature Registry consumer — fetches `FeatureRegistry`'s
 * computed visibility once per mount (capability checks aren't cheap
 * enough to poll continuously, and nothing currently changes them at
 * runtime) and exposes a lookup by feature id. `NavigationRail` is the
 * first real consumer; any later screen needing the same answer (e.g. a
 * future command palette) reuses this hook rather than recomputing
 * visibility itself.
 */
export function useFeatureVisibility(): Map<string, FeatureState> {
  const [states, setStates] = useState<Map<string, FeatureState>>(new Map())

  useEffect(() => {
    let active = true
    // A rejection here (e.g. a test stubbing only the bridge slices it
    // cares about, or a genuinely missing IPC method) must still fail
    // open rather than crash the whole shell — see this file's own "fails
    // open" contract on `NavigationRail`.
    void listFeatures()
      .then((result) => {
        if (!active || !result.ok) return
        setStates(new Map(result.data.map((state) => [state.descriptor.id, state])))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return states
}
