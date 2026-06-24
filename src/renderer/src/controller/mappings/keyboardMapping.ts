import type { ControllerAction } from '../adapters/controllerAction'

/**
 * Keyboard fallback for development (mega-prompt §9.1). Every semantic
 * action is reachable from a keyboard, including the ones gated behind
 * Steam Deck rear-grip buttons that the standard Gamepad API can't see
 * (see standardGamepadMapping.ts) — this is the only way to exercise
 * `voice`/`keyboard`/`ai.actions`/`execute` without Steam Input.
 */
export const KEYBOARD_ACTION_MAP: Record<string, ControllerAction> = {
  Enter: 'confirm',
  Escape: 'back',
  Tab: 'context',
  Backquote: 'assist',
  ArrowUp: 'nav.up',
  ArrowDown: 'nav.down',
  ArrowLeft: 'nav.left',
  ArrowRight: 'nav.right',
  KeyQ: 'tab.previous',
  KeyE: 'tab.next',
  PageUp: 'pane.previous',
  PageDown: 'pane.next',
  KeyF: 'pin',
  KeyR: 'inspect',
  KeyV: 'activity',
  KeyM: 'commands',
  Slash: 'voice',
  Backslash: 'keyboard',
  Semicolon: 'ai.actions',
  Quote: 'execute',
  Home: 'home',
  End: 'workspace.switcher',
  F1: 'emergency.stop',
  KeyO: 'quick.access'
}
