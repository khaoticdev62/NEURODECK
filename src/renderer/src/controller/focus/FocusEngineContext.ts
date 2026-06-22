import { createContext } from 'react'
import type { ControllerAction, ControllerActionEvent } from '../adapters/controllerAction'
import type { HapticsService } from '../haptics/hapticsService'
import type { ControllerKind } from '../mappings/controllerGlyphs'
import type { FocusRegistry } from './FocusRegistry'

export interface FocusEngineContextValue {
  registry: FocusRegistry
  controllerKind: ControllerKind
  haptics: HapticsService
  /**
   * Registers a handler for an action that isn't routed through a focused
   * node (e.g. `back`, `home`, `workspace.switcher`, `emergency.stop`).
   * Handlers form a stack per action — the most recently subscribed handler
   * runs first (e.g. an open modal's close-on-back takes priority over the
   * shell's default back behavior). Returns an unsubscribe function.
   */
  subscribe: (action: ControllerAction, handler: () => void) => () => void
  /**
   * Observes every raw action event regardless of phase or routing — for
   * "what did I just press" UI (controller calibration, the debug overlay)
   * rather than for triggering feature behavior. Returns an unsubscribe function.
   */
  onAction: (listener: (event: ControllerActionEvent) => void) => () => void
}

export const FocusEngineContext = createContext<FocusEngineContextValue | null>(null)
