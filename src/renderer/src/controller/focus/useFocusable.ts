import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Direction, FocusRole } from './focusTypes'
import { useFocusEngine } from './useFocusEngine'

export interface UseFocusableOptions {
  id: string
  groupId: string
  role?: FocusRole
  priority?: number
  disabled?: boolean
  hidden?: boolean
  /** Registry picks this node as the group's initial target when nothing is focused yet. */
  initialFocus?: boolean
  explicitNeighbors?: Partial<Record<Direction, string>>
  fallbackId?: string
  onActivate: () => void
  onContext?: () => void
  onAssist?: () => void
}

export interface UseFocusableResult<T extends HTMLElement> {
  ref: (element: T | null) => void
  isFocused: boolean
}

/**
 * Registers a DOM element as a Spatial Focus Engine node (wireframe §5.1,
 * mega-prompt §10.1) for the lifetime of the component. Live-reads
 * `disabled`/`hidden`/`priority`/the callbacks from the latest render via a
 * ref, so the registry's view of the node stays current without forcing a
 * register/unregister cycle on every prop change — only mount/unmount
 * registers/unregisters.
 */
export function useFocusable<T extends HTMLElement>(
  options: UseFocusableOptions
): UseFocusableResult<T> {
  const { registry } = useFocusEngine()
  const optionsRef = useRef(options)
  // Writing to a ref during render is disallowed (react-hooks/refs) — sync
  // it in a layout effect instead, which still runs before the browser
  // paints, so register()'s getters never observe a stale value.
  useLayoutEffect(() => {
    optionsRef.current = options
  }, [options])
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const unsubscribe = registry.onFocusChange((id) => setIsFocused(id === optionsRef.current.id))
    return unsubscribe
  }, [registry])

  const ref = useCallback(
    (element: T | null) => {
      const { id } = optionsRef.current
      if (!element) {
        console.log('[DIAG] useFocusable: unregistering', id, 'from registry', registry.instanceId)
        registry.unregister(id)
        return
      }

      console.log('[DIAG] useFocusable: registering', id, 'to registry', registry.instanceId)
      registry.register({
        id,
        get groupId() {
          return optionsRef.current.groupId
        },
        get role() {
          return optionsRef.current.role ?? 'button'
        },
        get disabled() {
          return optionsRef.current.disabled ?? false
        },
        get hidden() {
          return optionsRef.current.hidden ?? false
        },
        get priority() {
          return optionsRef.current.priority ?? 0
        },
        get explicitNeighbors() {
          return optionsRef.current.explicitNeighbors
        },
        get fallbackId() {
          return optionsRef.current.fallbackId
        },
        getRect: () => element.getBoundingClientRect(),
        focusElement: () => element.focus(),
        onActivate: () => optionsRef.current.onActivate(),
        onContext: () => optionsRef.current.onContext?.(),
        onAssist: () => optionsRef.current.onAssist?.()
      })
    },
    [registry]
  )

  // Claiming initial focus is deferred to a passive effect rather than done
  // inline in the ref callback above: calling registry.focus() (which
  // synchronously fans out to every other registered node's setState via
  // notifyFocusChange) from inside the commit-phase ref-attachment of a
  // still-mounting sibling tree risks React re-entering the same commit and
  // tripping its "Maximum update depth exceeded" loop guard.
  useEffect(() => {
    if (optionsRef.current.initialFocus && registry.getCurrentId() === null) {
      registry.focus(optionsRef.current.id)
    }
  }, [registry])

  return { ref, isFocused }
}
