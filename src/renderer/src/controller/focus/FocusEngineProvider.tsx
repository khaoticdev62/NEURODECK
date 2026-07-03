import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput } from '../../components/overlays/toastContext'
import { getControllerSettings } from '../../services/ipc/controllerSettingsClient'
import type { ControllerAction, ControllerActionEvent } from '../adapters/controllerAction'
import { GamepadAdapter } from '../adapters/gamepadAdapter'
import { KeyboardAdapter } from '../adapters/keyboardAdapter'
import { HapticsService } from '../haptics/hapticsService'
import type { ControllerKind } from '../mappings/controllerGlyphs'
import { FocusEngineContext, type FocusEngineContextValue } from './FocusEngineContext'
import { FocusRegistry } from './FocusRegistry'

const DIRECTIONAL_ACTIONS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  'nav.up': 'up',
  'nav.down': 'down',
  'nav.left': 'left',
  'nav.right': 'right'
}

/** Actions resolved against the focused node rather than a global subscriber stack. */
const FOCUS_ROUTED_ACTIONS = new Set<ControllerAction>(['confirm', 'context', 'assist'])

export interface FocusEngineProviderProps {
  children: ReactNode
  /** Tests/Storybook can supply adapters that don't depend on real hardware/DOM events. */
  adapters?: { start(emit: (event: ControllerActionEvent) => void): void; stop(): void }[]
}

/**
 * Wires the real input adapters (mega-prompt §9) into the Spatial Focus
 * Engine registry (§10) and exposes both via context. This is the only
 * place adapters are instantiated — feature code must go through
 * `useFocusable`/`useFocusEngine`, never touch `GamepadAdapter`/`KeyboardAdapter`
 * directly.
 */
export function FocusEngineProvider({
  children,
  adapters
}: FocusEngineProviderProps): React.JSX.Element {
  const [registry] = useState(() => {
    const reg = new FocusRegistry()
    console.log('[DIAG] FocusEngineProvider: creating FocusRegistry', reg.instanceId)
    return reg
  })
  const [haptics] = useState(() => new HapticsService())
  const [controllerKind, setControllerKind] = useState<ControllerKind>('generic')
  const activeGamepadIndexRef = useRef<number | null>(null)
  const subscribersRef = useRef(new Map<ControllerAction, Array<() => void>>())
  const actionObserversRef = useRef(new Set<(event: ControllerActionEvent) => void>())
  const toastContext = useContext(ToastContext)
  const pushRef = useRef<(toast: ToastInput) => void>(() => undefined)
  const connectedGamepadsRef = useRef(new Set<number>())
  const everConnectedRef = useRef(false)

  useEffect(() => {
    pushRef.current = toastContext ? (toast) => void toastContext.push(toast) : () => undefined
  }, [toastContext])

  const subscribe = useMemo(
    () =>
      (action: ControllerAction, handler: () => void): (() => void) => {
        const stack = subscribersRef.current.get(action) ?? []
        stack.push(handler)
        subscribersRef.current.set(action, stack)
        return () => {
          const current = subscribersRef.current.get(action)
          if (!current) return
          const next = current.filter((entry) => entry !== handler)
          subscribersRef.current.set(action, next)
        }
      },
    []
  )

  const onAction = useMemo(
    () =>
      (listener: (event: ControllerActionEvent) => void): (() => void) => {
        actionObserversRef.current.add(listener)
        return () => actionObserversRef.current.delete(listener)
      },
    []
  )

  // Applies the real persisted haptics intensity (Epic 11 ND-043) once on
  // mount — a plain instance-method call on `haptics`, not React state, so
  // this doesn't trip `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let active = true
    getControllerSettings()
      .then((result) => {
        if (active && result.ok) haptics.setIntensity(result.data.hapticsIntensity)
      })
      .catch(() => {
        // No persisted setting available (e.g. bridge unavailable) — keep the in-memory default.
      })
    return () => {
      active = false
    }
  }, [haptics])

  useEffect(() => {
    const emit = (event: ControllerActionEvent): void => {
      actionObserversRef.current.forEach((listener) => listener(event))

      if (event.sourceId.startsWith('gamepad:')) {
        activeGamepadIndexRef.current = Number(event.sourceId.split(':')[1])
      }

      if (event.phase !== 'press') return

      const direction = DIRECTIONAL_ACTIONS[event.action]
      if (direction) {
        const moved = registry.move(direction)
        if (moved && activeGamepadIndexRef.current !== null) {
          void haptics.trigger(activeGamepadIndexRef.current, 'focusMovement')
        }
        return
      }

      if (FOCUS_ROUTED_ACTIONS.has(event.action)) {
        if (event.action === 'confirm') {
          registry.activate()
          if (activeGamepadIndexRef.current !== null) {
            void haptics.trigger(activeGamepadIndexRef.current, 'selection')
          }
        } else if (event.action === 'context') {
          registry.context()
        } else if (event.action === 'assist') {
          registry.assist()
        }
        return
      }

      const stack = subscribersRef.current.get(event.action)
      if (stack && stack.length > 0) stack[stack.length - 1]()
    }

    const activeAdapters = adapters ?? [
      new GamepadAdapter({
        onConnect: (index, kind) => {
          setControllerKind(kind)
          const isReconnect = everConnectedRef.current && connectedGamepadsRef.current.size === 0
          connectedGamepadsRef.current.add(index)
          everConnectedRef.current = true
          if (isReconnect) {
            pushRef.current({
              category: 'success',
              title: 'Controller reconnected',
              durationMs: 4000
            })
          }
        },
        onDisconnect: (index) => {
          connectedGamepadsRef.current.delete(index)
          if (everConnectedRef.current && connectedGamepadsRef.current.size === 0) {
            pushRef.current({
              category: 'warning',
              title: 'Controller disconnected',
              description: 'Use the keyboard to keep navigating, or reconnect your controller.'
            })
          }
        }
      }),
      new KeyboardAdapter()
    ]

    activeAdapters.forEach((adapter) => adapter.start(emit))
    return () => activeAdapters.forEach((adapter) => adapter.stop())
  }, [adapters, registry, haptics])

  const value: FocusEngineContextValue = useMemo(
    () => ({ registry, controllerKind, haptics, subscribe, onAction }),
    [registry, controllerKind, haptics, subscribe, onAction]
  )

  return <FocusEngineContext.Provider value={value}>{children}</FocusEngineContext.Provider>
}
