import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { GuidedTroubleshooter } from '../GuidedTroubleshooter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('GuidedTroubleshooter', () => {
  it('lists every supported issue with a Run diagnostic action', () => {
    stubBridge({})
    render(<GuidedTroubleshooter />)

    expect(screen.getByText('No network')).toBeInTheDocument()
    expect(screen.getByText('Model/provider unavailable')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Run diagnostic' })).toHaveLength(6)
  })

  it('runs a real diagnostic and shows its real result, never a fabricated pass', async () => {
    const runCheck = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        issueId: 'no-network',
        ranAt: Date.now(),
        steps: [{ label: 'Network interfaces', status: 'fail', detail: 'No interfaces detected.' }],
        overallStatus: 'fail',
        remediation: ['Check that the device is connected to a real network.']
      }
    })
    stubBridge({ troubleshooter: { runCheck } as never })
    const user = userEvent.setup()

    render(<GuidedTroubleshooter />)
    const buttons = screen.getAllByRole('button', { name: 'Run diagnostic' })
    await user.click(buttons[0])

    expect(runCheck).toHaveBeenCalledWith({ issueId: 'no-network' })
    expect(await screen.findByText('Overall: fail')).toBeInTheDocument()
    expect(screen.getByText(/No interfaces detected\./)).toBeInTheDocument()
    expect(
      screen.getByText('Check that the device is connected to a real network.')
    ).toBeInTheDocument()
  })

  it('checks the real browser Gamepad API for the controller issue, never IPC', async () => {
    stubBridge({})
    const getGamepadsMock = vi.fn().mockReturnValue([])
    Object.defineProperty(navigator, 'getGamepads', {
      value: getGamepadsMock,
      configurable: true
    })
    const user = userEvent.setup()

    render(<GuidedTroubleshooter />)
    await user.click(screen.getByRole('button', { name: 'Check controller' }))

    expect(getGamepadsMock).toHaveBeenCalled()
    expect(await screen.findByText(/No controller detected/)).toBeInTheDocument()
  })
})
