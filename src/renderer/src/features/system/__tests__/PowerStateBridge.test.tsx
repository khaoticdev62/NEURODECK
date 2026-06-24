import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { NdxBridge, PowerStateEvent } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { PowerStateBridge } from '../PowerStateBridge'

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

function mockPowerBridge(): (event: PowerStateEvent) => void {
  let listener: ((event: PowerStateEvent) => void) | null = null
  window.ndx = {
    power: {
      onStateEvent: (cb: (event: PowerStateEvent) => void) => {
        listener = cb
        return () => {
          listener = null
        }
      }
    } as never
  } as Partial<NdxBridge> as NdxBridge
  return (event) => listener?.(event)
}

describe('PowerStateBridge', () => {
  it('notifies on resume without a prior suspend', async () => {
    const emit = mockPowerBridge()
    render(
      <ToastProvider>
        <PowerStateBridge />
      </ToastProvider>
    )

    emit({ type: 'resume', timestamp: Date.now() })

    expect(await screen.findByText('Resumed from suspend')).toBeInTheDocument()
    expect(
      screen.getByText('Terminal sessions and live data may need a refresh.')
    ).toBeInTheDocument()
  })

  it('reports the suspended duration when resuming after a real suspend', async () => {
    const emit = mockPowerBridge()
    render(
      <ToastProvider>
        <PowerStateBridge />
      </ToastProvider>
    )

    const suspendedAt = Date.now()
    emit({ type: 'suspend', timestamp: suspendedAt })
    emit({ type: 'resume', timestamp: suspendedAt + 5 * 60 * 1000 })

    expect(await screen.findByText('Resumed from suspend')).toBeInTheDocument()
    expect(screen.getByText(/suspended for about 5 minutes/)).toBeInTheDocument()
  })

  it('does not show a toast for lock or unlock events', () => {
    const emit = mockPowerBridge()
    render(
      <ToastProvider>
        <PowerStateBridge />
      </ToastProvider>
    )

    emit({ type: 'lock-screen', timestamp: Date.now() })
    emit({ type: 'unlock-screen', timestamp: Date.now() })

    expect(screen.queryByText('Resumed from suspend')).not.toBeInTheDocument()
  })
})
