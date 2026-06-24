import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, UpdateStatus } from '@shared/contracts'
import { Updates } from '../Updates'
import { renderWithProviders } from '../../../__tests__/testUtils'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    ...partial
  } as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const unavailableStatus: UpdateStatus = {
  currentVersion: '0.0.0',
  latestVersion: null,
  channel: 'stable',
  updateAvailable: false,
  changelog: null,
  compatibility: null,
  checkEnabled: false,
  reason: 'No update feed is configured for this installation.'
}

describe('Updates', () => {
  it('renders current version and update sections', async () => {
    stubBridge({
      update: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: unavailableStatus }),
        check: vi.fn()
      } as never
    })

    renderWithProviders(<Updates />)

    expect(await screen.findByText('Updates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check for updates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download and apply' })).toBeDisabled()
  })

  it('reports that checking is disabled when no feed is configured', async () => {
    stubBridge({
      update: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: unavailableStatus }),
        check: vi.fn().mockResolvedValue({ ok: true, data: unavailableStatus })
      } as never
    })

    renderWithProviders(<Updates />)

    expect(await screen.findByText(/Update checking is disabled/)).toBeInTheDocument()
    expect(
      screen.getByText('No update feed is configured for this installation.')
    ).toBeInTheDocument()
  })

  it('keeps download/apply disabled even when an update is available', async () => {
    const availableStatus: UpdateStatus = {
      ...unavailableStatus,
      latestVersion: '0.1.0',
      updateAvailable: true,
      checkEnabled: true,
      changelog: 'New features.',
      compatibility: 'compatible',
      reason: 'An update is available.'
    }
    stubBridge({
      update: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: availableStatus }),
        check: vi.fn().mockResolvedValue({ ok: true, data: availableStatus })
      } as never
    })

    renderWithProviders(<Updates />)

    await waitFor(() => {
      expect(screen.getByText(/Latest: 0\.1\.0/)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Download and apply' })).toBeDisabled()
  })

  it('checks for updates when the button is activated', async () => {
    const user = userEvent.setup()
    const check = vi.fn().mockResolvedValue({ ok: true, data: unavailableStatus })
    stubBridge({
      update: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: unavailableStatus }),
        check
      } as never
    })

    renderWithProviders(<Updates />)
    await screen.findByText('Updates')
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))

    await waitFor(() => {
      expect(check).toHaveBeenCalledTimes(1)
    })
  })

  it('shows an error state when the status check fails', async () => {
    stubBridge({
      update: {
        getStatus: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'update-status-failed',
            userMessage: 'Update service unreachable.',
            message: 'x',
            category: 'system'
          }
        }),
        check: vi.fn()
      } as never
    })

    renderWithProviders(<Updates />)

    expect(await screen.findByText('Update service unreachable.')).toBeInTheDocument()
  })
})
