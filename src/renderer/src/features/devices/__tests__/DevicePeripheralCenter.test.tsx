import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { DevicePeripheralCenter } from '../DevicePeripheralCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('DevicePeripheralCenter', () => {
  it('renders real inventory records and capability states', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
      } as never
    })

    render(<DevicePeripheralCenter />)

    expect(await screen.findByText('Device and Peripheral Center')).toBeInTheDocument()
    expect(screen.getByText('wlan0')).toBeInTheDocument()
    expect(screen.getByText(/Storage/)).toBeInTheDocument()
    expect(screen.getByText('bluetooth')).toBeInTheDocument()
    expect(screen.getByText('No real Bluetooth adapter probe exists.')).toBeInTheDocument()
  })

  it('shows an honest empty state when no real devices are observed', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...sampleReport, deviceCount: 0, connectedCount: 0, categories: [], devices: [] }
        })
      } as never
    })

    render(<DevicePeripheralCenter />)

    expect(await screen.findByText('No devices detected')).toBeInTheDocument()
  })

  it('refreshes the inventory through IPC', async () => {
    const inventory = vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
    stubBridge({ devices: { inventory } as never })
    const user = userEvent.setup()

    render(<DevicePeripheralCenter />)
    await screen.findByText('Device and Peripheral Center')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(inventory).toHaveBeenCalledTimes(2)
  })
})

const sampleReport: DeviceInventoryReport = {
  collectedAt: Date.now(),
  deviceCount: 2,
  connectedCount: 2,
  categories: ['network-adapter', 'storage'],
  devices: [
    {
      id: 'network:wlan0',
      category: 'network-adapter',
      name: 'wlan0',
      type: 'Network adapter',
      connected: true,
      capabilityStatus: 'available',
      driverBackend: 'node:os',
      permissions: [],
      health: 'healthy',
      lastEventAt: Date.now(),
      source: 'system-metrics',
      detail: '1 address - IPv4'
    },
    {
      id: 'storage:/',
      category: 'storage',
      name: '/',
      type: 'Mounted storage',
      connected: true,
      capabilityStatus: 'available',
      driverBackend: 'fs.statfs',
      permissions: [],
      health: 'healthy',
      lastEventAt: Date.now(),
      source: 'system-metrics',
      detail: '40.0% used'
    }
  ],
  capabilities: [
    {
      id: 'bluetooth',
      status: 'unsupported',
      reason: 'No real Bluetooth adapter probe exists.',
      lastCheckedAt: Date.now()
    },
    {
      id: 'microphone',
      status: 'unsupported',
      reason: 'No real audio-input device enumeration is implemented yet.',
      lastCheckedAt: Date.now()
    }
  ],
  hotPlug: {
    available: false,
    reason: 'No real OS hot-plug watcher is implemented yet.'
  }
}
