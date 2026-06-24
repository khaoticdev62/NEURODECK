import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../FocusEngineProvider'

function dispatchGamepadEvent(
  type: 'gamepadconnected' | 'gamepaddisconnected',
  index: number
): void {
  const event = new Event(type) as Event & { gamepad: { index: number; id: string } }
  event.gamepad = { index, id: `Test pad ${index}` }
  window.dispatchEvent(event)
}

describe('FocusEngineProvider real gamepad connection handling', () => {
  it('warns when the only connected controller disconnects', async () => {
    render(
      <ToastProvider>
        <FocusEngineProvider>
          <div>content</div>
        </FocusEngineProvider>
      </ToastProvider>
    )

    dispatchGamepadEvent('gamepadconnected', 0)
    dispatchGamepadEvent('gamepaddisconnected', 0)

    expect(await screen.findByText('Controller disconnected')).toBeInTheDocument()
  })

  it('confirms reconnection after a disconnect, but not on the first connect', async () => {
    render(
      <ToastProvider>
        <FocusEngineProvider>
          <div>content</div>
        </FocusEngineProvider>
      </ToastProvider>
    )

    dispatchGamepadEvent('gamepadconnected', 0)
    expect(screen.queryByText('Controller reconnected')).not.toBeInTheDocument()

    dispatchGamepadEvent('gamepaddisconnected', 0)
    await screen.findByText('Controller disconnected')

    dispatchGamepadEvent('gamepadconnected', 0)
    expect(await screen.findByText('Controller reconnected')).toBeInTheDocument()
  })

  it('does not warn while a second controller is still connected', async () => {
    render(
      <ToastProvider>
        <FocusEngineProvider>
          <div>content</div>
        </FocusEngineProvider>
      </ToastProvider>
    )

    dispatchGamepadEvent('gamepadconnected', 0)
    dispatchGamepadEvent('gamepadconnected', 1)
    dispatchGamepadEvent('gamepaddisconnected', 0)

    expect(screen.queryByText('Controller disconnected')).not.toBeInTheDocument()
  })
})
