import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { LockProvider } from '../../../state/lockState'
import { useLockState } from '../../../state/useLockState'
import { LockScreen } from '../LockScreen'

function LockTrigger(): React.JSX.Element {
  const { lock, isLocked } = useLockState()
  return (
    <div>
      <span data-testid="lock-status">{isLocked ? 'locked' : 'unlocked'}</span>
      <button type="button" onClick={lock}>
        Engage lock
      </button>
      {isLocked && <LockScreen />}
    </div>
  )
}

function stubBridge(verifyPin: ReturnType<typeof vi.fn>): void {
  window.ndx = {
    lock: {
      getStatus: vi.fn().mockResolvedValue({ ok: true, data: { enabled: true } }),
      verifyPin
    },
    system: {
      collectMetrics: vi.fn().mockResolvedValue({
        ok: true,
        data: { battery: { available: false, source: 'test', reason: 'no battery' } }
      })
    }
  } as unknown as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(verifyPin: ReturnType<typeof vi.fn>): ReturnType<typeof render> {
  stubBridge(verifyPin)
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <AiSafetyProvider>
        <LockProvider>
          <LockTrigger />
        </LockProvider>
      </AiSafetyProvider>
    </FocusEngineProvider>
  )
}

describe('LockScreen', () => {
  it('engages on lock() and unlocks only with the real verified PIN', async () => {
    const verifyPin = vi.fn().mockResolvedValue({ ok: true, data: { valid: false } })
    const user = userEvent.setup()
    renderScreen(verifyPin)

    await waitFor(() => expect(screen.getByTestId('lock-status')).toHaveTextContent('unlocked'))
    await user.click(screen.getByRole('button', { name: 'Engage lock' }))
    expect(screen.getByTestId('lock-status')).toHaveTextContent('locked')
    expect(screen.getByText('NeuroDeck is locked')).toBeInTheDocument()

    for (const digit of ['1', '2', '3', '4']) {
      await user.click(screen.getByRole('button', { name: digit }))
    }
    verifyPin.mockResolvedValueOnce({ ok: true, data: { valid: false } })
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('Incorrect PIN.')).toBeInTheDocument()
    expect(screen.getByTestId('lock-status')).toHaveTextContent('locked')

    verifyPin.mockResolvedValueOnce({ ok: true, data: { valid: true } })
    for (const digit of ['1', '2', '3', '4']) {
      await user.click(screen.getByRole('button', { name: digit }))
    }
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    await waitFor(() => expect(screen.getByTestId('lock-status')).toHaveTextContent('unlocked'))
  })

  it('shows all ten shuffled PIN digits and a deferred account-authentication note', async () => {
    renderScreen(vi.fn())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Engage lock' }))

    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expect(screen.getByRole('button', { name: digit })).toBeInTheDocument()
    }
    expect(screen.getByText(/Account authentication: not available/)).toBeInTheDocument()
  })
})
