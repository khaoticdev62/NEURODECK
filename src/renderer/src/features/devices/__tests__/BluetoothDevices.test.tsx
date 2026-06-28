import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { BluetoothDevices } from '../BluetoothDevices'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderBluetooth(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <BluetoothDevices />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('BluetoothDevices', () => {
  it('renders adapter capability status and known Bluetooth records', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
      } as never
    })

    renderBluetooth()

    expect(await screen.findByText('Bluetooth Devices')).toBeInTheDocument()
    expect(screen.getByText('Gamepad')).toBeInTheDocument()
    expect(screen.getByText('No real Bluetooth adapter probe exists.')).toBeInTheDocument()
    expect(screen.getByText('Pair')).toBeInTheDocument()
    expect(screen.getByText(/Pairing needs a real confirmation flow/)).toBeInTheDocument()
  })

  it('shows an honest empty state when no Bluetooth records exist', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...sampleReport, devices: [], deviceCount: 0, connectedCount: 0 }
        })
      } as never
    })

    renderBluetooth()

    expect(await screen.findByText('No Bluetooth devices in inventory')).toBeInTheDocument()
  })

  it('refreshes Bluetooth status through the shared inventory IPC', async () => {
    const inventory = vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
    stubBridge({ devices: { inventory } as never })
    const user = userEvent.setup()

    renderBluetooth()
    await screen.findByText('Bluetooth Devices')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(inventory).toHaveBeenCalledTimes(2)
  })
})

const sampleReport: DeviceInventoryReport = {
  collectedAt: Date.now(),
  deviceCount: 1,
  connectedCount: 1,
  categories: ['bluetooth-device'],
  devices: [
    {
      id: 'registered:gamepad',
      category: 'bluetooth-device',
      name: 'Gamepad',
      type: 'bluetooth',
      connected: true,
      capabilityStatus: 'unsupported',
      driverBackend: 'DeviceStore',
      permissions: ['bluetooth'],
      health: 'unsupported',
      lastEventAt: Date.now(),
      source: 'persisted-registry',
      detail: 'Vendor: Example'
    }
  ],
  capabilities: [
    {
      id: 'bluetooth',
      status: 'unsupported',
      reason: 'No real Bluetooth adapter probe exists.',
      lastCheckedAt: Date.now()
    }
  ],
  hotPlug: {
    available: false,
    reason: 'No real OS hot-plug watcher is implemented yet.'
  }
}
