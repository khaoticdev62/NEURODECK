import type { ControllerAction } from '../adapters/controllerAction'

/**
 * Button-index -> action mapping for the W3C Gamepad API "standard" mapping,
 * which Steam Deck's built-in controls and Xbox/DualSense pads all report as
 * (wireframe §4.1 universal mapping, restricted to what the standard Gamepad
 * API can actually observe).
 *
 * Steam Deck's rear grip buttons (L4/L5/R4/R5), the Quick Access button, and
 * the Steam button are NOT exposed by the standard Gamepad API — only Steam
 * Input or a native adapter can read them (mega-prompt §9.1 lists both as
 * optional). Until that lands, `voice`/`keyboard`/`ai.actions`/`execute` are
 * reachable only via the keyboard fallback adapter — this is an honest gap,
 * not a missing mapping (supplemental §3.7: no false hardware assumptions).
 */
export const STANDARD_BUTTON_ACTION: Partial<Record<number, ControllerAction>> = {
  0: 'confirm', // A / Cross
  1: 'back', // B / Circle
  2: 'context', // X / Square
  3: 'assist', // Y / Triangle
  4: 'tab.previous', // LB
  5: 'tab.next', // RB
  6: 'pane.previous', // LT
  7: 'pane.next', // RT
  8: 'activity', // View / Select
  9: 'commands', // Menu / Start
  10: 'pin', // L3
  11: 'inspect', // R3
  12: 'nav.up', // D-pad up
  13: 'nav.down', // D-pad down
  14: 'nav.left', // D-pad left
  15: 'nav.right' // D-pad right
}

export interface ChordDefinition {
  /** Button indices that must all be held simultaneously. */
  buttons: number[]
  action: ControllerAction
}

/** Chorded controls reachable from standard-mapping buttons (wireframe §4.2). */
export const STANDARD_CHORDS: ChordDefinition[] = [
  { buttons: [4, 5], action: 'home' }, // LB + RB -> NeuroDeck Home
  { buttons: [6, 7], action: 'workspace.switcher' }, // LT + RT -> Workspace switcher
  { buttons: [9, 1], action: 'emergency.stop' } // Menu + B -> Emergency cancel
]

/** Left-stick axis index pair, used for accelerated directional navigation. */
export const LEFT_STICK_AXES = { x: 0, y: 1 } as const

export const STICK_DEAD_ZONE = 0.35
