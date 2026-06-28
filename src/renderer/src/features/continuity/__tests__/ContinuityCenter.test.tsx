import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContinuityState, NdxBridge } from '@shared/contracts'
import { ContinuityCenter } from '../ContinuityCenter'

const state: ContinuityState = {
  safeModeActive: false,
  offlineQueue: [],
  powerEvents: [{ id: 'event-1', kind: 'suspend', occurredAt: 1_000 }],
  sessionSnapshot: { route: '/profiles', capturedAt: 2_000 }
}

function stubContinuity(overrides: Partial<NdxBridge['continuity']> = {}): void {
  window.ndx = {
    continuity: {
      getState: vi.fn().mockResolvedValue({ ok: true, data: state }),
      setSafeMode: vi.fn().mockResolvedValue({
        ok: true,
        data: { ...state, safeModeActive: true }
      }),
      recordPowerEvent: vi.fn(),
      saveSessionSnapshot: vi.fn(),
      ...overrides
    }
  } as Partial<NdxBridge> as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of preload global
  delete window.ndx
})

describe('ContinuityCenter', () => {
  it('renders connectivity, queue, session, and power event state', async () => {
    stubContinuity()
    render(<ContinuityCenter />)

    expect(await screen.findByText('Continuity and Offline')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('/profiles')).toBeInTheDocument()
    expect(screen.getByText(/suspend at/)).toBeInTheDocument()
  })

  it('toggles safe mode through the typed bridge', async () => {
    const setSafeMode = vi.fn().mockResolvedValue({
      ok: true,
      data: { ...state, safeModeActive: true }
    })
    stubContinuity({ setSafeMode })
    const user = userEvent.setup()
    render(<ContinuityCenter />)

    await screen.findByText('Continuity and Offline')
    await user.click(screen.getByRole('button', { name: 'Enable Safe Mode' }))

    expect(setSafeMode).toHaveBeenCalledWith({ active: true })
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })
})
