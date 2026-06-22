import type { ControllerActionListener, ControllerAdapter } from './controllerAction'
import {
  createGamepadFrameState,
  processGamepadFrame,
  type GamepadFrameState
} from './gamepadPolling'
import { detectControllerKind, type ControllerKind } from '../mappings/controllerGlyphs'

export interface GamepadConnectionListener {
  onConnect?(index: number, kind: ControllerKind, id: string): void
  onDisconnect?(index: number): void
}

/**
 * Real browser Gamepad API adapter (mega-prompt §9.1). Supports any device
 * reporting the W3C "standard" mapping — this covers Steam Deck's built-in
 * controls, Xbox-compatible pads, DualSense, and generic Gamepad API devices
 * in one implementation, per spec. Polls via `requestAnimationFrame` and
 * delegates all actual press/hold/repeat/chord logic to the pure
 * `processGamepadFrame` function so this file stays a thin browser-API shim.
 */
export class GamepadAdapter implements ControllerAdapter {
  readonly id = 'gamepad'

  private frameStates = new Map<number, GamepadFrameState>()
  private rafHandle: number | null = null
  private connectionListener: GamepadConnectionListener | undefined
  private onConnected = (event: GamepadEvent): void => {
    const kind = detectControllerKind(event.gamepad.id)
    this.frameStates.set(event.gamepad.index, createGamepadFrameState())
    this.connectionListener?.onConnect?.(event.gamepad.index, kind, event.gamepad.id)
  }
  private onDisconnected = (event: GamepadEvent): void => {
    this.frameStates.delete(event.gamepad.index)
    this.connectionListener?.onDisconnect?.(event.gamepad.index)
  }

  constructor(listener?: GamepadConnectionListener) {
    this.connectionListener = listener
  }

  /** Real capability check (supplemental §3.7) — Electron/Chromium support it, but jsdom and some embedders don't. */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
  }

  start(emit: ControllerActionListener): void {
    window.addEventListener('gamepadconnected', this.onConnected)
    window.addEventListener('gamepaddisconnected', this.onDisconnected)

    if (!GamepadAdapter.isSupported()) return

    const tick = (): void => {
      const pads = navigator.getGamepads()
      for (const pad of pads) {
        if (!pad) continue
        const state = this.frameStates.get(pad.index) ?? createGamepadFrameState()
        const next = processGamepadFrame(
          { buttons: pad.buttons.map((b) => b.pressed), axes: pad.axes.slice() },
          state,
          performance.now(),
          `gamepad:${pad.index}`,
          emit
        )
        this.frameStates.set(pad.index, next)
      }
      this.rafHandle = requestAnimationFrame(tick)
    }
    this.rafHandle = requestAnimationFrame(tick)
  }

  stop(): void {
    window.removeEventListener('gamepadconnected', this.onConnected)
    window.removeEventListener('gamepaddisconnected', this.onDisconnected)
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle)
    this.rafHandle = null
    this.frameStates.clear()
  }
}
