/**
 * Semantic controller actions (mega-prompt §9.1). Feature code must never
 * bind to raw gamepad button indices or keyboard codes — only to these.
 */
export type ControllerAction =
  | 'confirm'
  | 'back'
  | 'context'
  | 'assist'
  | 'nav.up'
  | 'nav.down'
  | 'nav.left'
  | 'nav.right'
  | 'tab.previous'
  | 'tab.next'
  | 'pane.previous'
  | 'pane.next'
  | 'pin'
  | 'inspect'
  | 'activity'
  | 'commands'
  | 'voice'
  | 'keyboard'
  | 'ai.actions'
  | 'execute'
  | 'home'
  | 'workspace.switcher'
  | 'emergency.stop'
  | 'quick.access'
  | 'narrate.screen'

export type ControllerActionPhase = 'press' | 'hold' | 'release'

export interface ControllerActionEvent {
  action: ControllerAction
  phase: ControllerActionPhase
  /** Identifies which physical/virtual device produced this event. */
  sourceId: string
  timestamp: number
}

export type ControllerActionListener = (event: ControllerActionEvent) => void

/** Common interface every input adapter (gamepad, keyboard, test) implements. */
export interface ControllerAdapter {
  id: string
  start(emit: ControllerActionListener): void
  stop(): void
}
