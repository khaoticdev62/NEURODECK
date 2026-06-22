import type {
  ControllerAction,
  ControllerActionListener,
  ControllerAdapter
} from './controllerAction'
import { KEYBOARD_ACTION_MAP } from '../mappings/keyboardMapping'
import { HOLD_THRESHOLD_MS } from './gamepadPolling'

const REPEATABLE_ACTIONS = new Set<ControllerAction>([
  'nav.up',
  'nav.down',
  'nav.left',
  'nav.right',
  'tab.previous',
  'tab.next',
  'pane.previous',
  'pane.next'
])

/** confirm (Enter) and back (Escape) never conflict with text editing; every other mapped key does (e.g. typing "form" would otherwise fire `pin`/`inspect`/`commands`). */
const ALLOWED_WHILE_EDITING = new Set<ControllerAction>(['confirm', 'back'])

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

/**
 * Keyboard fallback adapter for development (mega-prompt §9.1). Discrete
 * browser keydown/keyup events make per-frame polling unnecessary; the OS's
 * own key-repeat rate is used for repeatable actions (nav/tab/pane), and a
 * single hold timer covers the spec's 700ms hold threshold for everything
 * else (confirm/back/assist/execute/...).
 */
export class KeyboardAdapter implements ControllerAdapter {
  readonly id = 'keyboard'

  private holdTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private emit: ControllerActionListener | null = null

  private onKeyDown = (event: KeyboardEvent): void => {
    const action = KEYBOARD_ACTION_MAP[event.code]
    if (!action || !this.emit) return
    if (isEditableTarget(event.target) && !ALLOWED_WHILE_EDITING.has(action)) return

    if (event.repeat) {
      if (REPEATABLE_ACTIONS.has(action)) {
        this.emit({ action, phase: 'press', sourceId: this.id, timestamp: performance.now() })
      }
      return
    }

    this.emit({ action, phase: 'press', sourceId: this.id, timestamp: performance.now() })

    if (!REPEATABLE_ACTIONS.has(action)) {
      const timer = setTimeout(() => {
        this.emit?.({ action, phase: 'hold', sourceId: this.id, timestamp: performance.now() })
      }, HOLD_THRESHOLD_MS)
      this.holdTimers.set(event.code, timer)
    }
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    const action = KEYBOARD_ACTION_MAP[event.code]
    if (!action || !this.emit) return
    if (isEditableTarget(event.target) && !ALLOWED_WHILE_EDITING.has(action)) return

    const timer = this.holdTimers.get(event.code)
    if (timer !== undefined) {
      clearTimeout(timer)
      this.holdTimers.delete(event.code)
    }

    this.emit({ action, phase: 'release', sourceId: this.id, timestamp: performance.now() })
  }

  start(emit: ControllerActionListener): void {
    this.emit = emit
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  stop(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.holdTimers.forEach((timer) => clearTimeout(timer))
    this.holdTimers.clear()
    this.emit = null
  }
}
