import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { RemovableStorageCenter } from '../RemovableStorageCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderStorage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <RemovableStorageCenter />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('RemovableStorageCenter', () => {
  it('renders known storage records and disabled storage controls', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
      } as never
    })

    renderStorage()

    expect(await screen.findByText('Removable Storage Center')).toBeInTheDocument()
    expect(screen.getByText('/run/media/deck/SDCARD')).toBeInTheDocument()
    expect(screen.getByText('Eject')).toBeInTheDocument()
    expect(screen.getByText(/Safe eject needs a real OS transaction/)).toBeInTheDocument()
  })

  it('shows an honest empty state when no storage records exist', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...sampleReport, devices: [], deviceCount: 0, connectedCount: 0 }
        })
      } as never
    })

    renderStorage()

    expect(await screen.findByText('No storage devices in inventory')).toBeInTheDocument()
  })

  it('refreshes storage status through shared inventory IPC', async () => {
    const inventory = vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
    stubBridge({ devices: { inventory } as never })
    const user = userEvent.setup()

    renderStorage()
    await screen.findByText('Removable Storage Center')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(inventory).toHaveBeenCalledTimes(2)
  })
})

const sampleReport: DeviceInventoryReport = {
  collectedAt: Date.now(),
  deviceCount: 1,
  connectedCount: 1,
  categories: ['storage'],
  devices: [
    {
      id: 'storage:/run/media/deck/SDCARD',
      category: 'storage',
      name: '/run/media/deck/SDCARD',
      type: 'Mounted storage',
      connected: true,
      capabilityStatus: 'available',
      driverBackend: 'fs.statfs',
      permissions: [],
      health: 'healthy',
      lastEventAt: Date.now(),
      source: 'system-metrics',
      detail: '25.0% used'
    }
  ],
  capabilities: [],
  hotPlug: {
    available: false,
    reason: 'No real OS hot-plug watcher is implemented yet.'
  }
}
