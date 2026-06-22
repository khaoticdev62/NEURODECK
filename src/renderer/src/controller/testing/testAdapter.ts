import type {
  ControllerAction,
  ControllerActionListener,
  ControllerActionPhase,
  ControllerAdapter
} from '../adapters/controllerAction'

/**
 * Test-mode event injection (mega-prompt §9.2). Lets test code and the
 * focus-debug overlay drive the same action stream real adapters use,
 * without a physical device or DOM key events.
 */
export class TestAdapter implements ControllerAdapter {
  readonly id = 'test'

  private emit: ControllerActionListener | null = null

  start(emit: ControllerActionListener): void {
    this.emit = emit
  }

  stop(): void {
    this.emit = null
  }

  inject(action: ControllerAction, phase: ControllerActionPhase = 'press'): void {
    this.emit?.({ action, phase, sourceId: this.id, timestamp: performance.now() })
  }
}
