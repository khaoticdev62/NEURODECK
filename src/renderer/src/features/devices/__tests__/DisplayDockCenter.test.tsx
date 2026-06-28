import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { DisplayDockCenter } from '../DisplayDockCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderDisplay(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <DisplayDockCenter />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('DisplayDockCenter', () => {
  it('renders display capability and known display records', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
      } as never
    })

    renderDisplay()

    expect(await screen.findByText('Display and Dock Center')).toBeInTheDocument()
    expect(screen.getByText('USB-C display')).toBeInTheDocument()
    expect(screen.getByText('No real display enumeration exists.')).toBeInTheDocument()
    expect(screen.getByText('Arrange displays')).toBeInTheDocument()
  })

  it('shows an honest empty state when no display records exist', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...sampleReport, devices: [], deviceCount: 0, connectedCount: 0 }
        })
      } as never
    })

    renderDisplay()

    expect(await screen.findByText('No display or dock records')).toBeInTheDocument()
  })

  it('refreshes display status through shared inventory IPC', async () => {
    const inventory = vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
    stubBridge({ devices: { inventory } as never })
    const user = userEvent.setup()

    renderDisplay()
    await screen.findByText('Display and Dock Center')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(inventory).toHaveBeenCalledTimes(2)
  })
})

const sampleReport: DeviceInventoryReport = {
  collectedAt: Date.now(),
  deviceCount: 1,
  connectedCount: 1,
  categories: ['display'],
  devices: [
    {
      id: 'registered:display',
      category: 'display',
      name: 'USB-C display',
      type: 'display',
      connected: true,
      capabilityStatus: 'unsupported',
      driverBackend: 'DeviceStore',
      permissions: ['external-displays'],
      health: 'unsupported',
      lastEventAt: Date.now(),
      source: 'persisted-registry'
    }
  ],
  capabilities: [
    {
      id: 'external-displays',
      status: 'unsupported',
      reason: 'No real display enumeration exists.',
      lastCheckedAt: Date.now()
    }
  ],
  hotPlug: {
    available: false,
    reason: 'No real OS hot-plug watcher is implemented yet.'
  }
}
