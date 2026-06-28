import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { AudioMicrophoneCenter } from '../AudioMicrophoneCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function renderAudio(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AudioMicrophoneCenter />
    </MemoryRouter>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('AudioMicrophoneCenter', () => {
  it('renders microphone capability and known audio records', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
      } as never
    })

    renderAudio()

    expect(await screen.findByText('Audio and Microphone Center')).toBeInTheDocument()
    expect(screen.getByText('Built-in speakers')).toBeInTheDocument()
    expect(screen.getByText('USB microphone')).toBeInTheDocument()
    expect(screen.getByText('No real audio-input device enumeration exists.')).toBeInTheDocument()
    expect(screen.getByText('Select output')).toBeInTheDocument()
  })

  it('shows an honest empty state when no audio records exist', async () => {
    stubBridge({
      devices: {
        inventory: vi.fn().mockResolvedValue({
          ok: true,
          data: { ...sampleReport, devices: [], deviceCount: 0, connectedCount: 0 }
        })
      } as never
    })

    renderAudio()

    expect(await screen.findByText('No audio devices in inventory')).toBeInTheDocument()
  })

  it('refreshes audio status through shared inventory IPC', async () => {
    const inventory = vi.fn().mockResolvedValue({ ok: true, data: sampleReport })
    stubBridge({ devices: { inventory } as never })
    const user = userEvent.setup()

    renderAudio()
    await screen.findByText('Audio and Microphone Center')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(inventory).toHaveBeenCalledTimes(2)
  })
})

const sampleReport: DeviceInventoryReport = {
  collectedAt: Date.now(),
  deviceCount: 2,
  connectedCount: 2,
  categories: ['audio-output', 'microphone'],
  devices: [
    {
      id: 'registered:speakers',
      category: 'audio-output',
      name: 'Built-in speakers',
      type: 'audio',
      connected: true,
      capabilityStatus: 'not-declared',
      driverBackend: 'DeviceStore',
      permissions: [],
      health: 'healthy',
      lastEventAt: Date.now(),
      source: 'persisted-registry'
    },
    {
      id: 'registered:microphone',
      category: 'microphone',
      name: 'USB microphone',
      type: 'audio',
      connected: true,
      capabilityStatus: 'unsupported',
      driverBackend: 'DeviceStore',
      permissions: ['microphone'],
      health: 'unsupported',
      lastEventAt: Date.now(),
      source: 'persisted-registry'
    }
  ],
  capabilities: [
    {
      id: 'microphone',
      status: 'unsupported',
      reason: 'No real audio-input device enumeration exists.',
      lastCheckedAt: Date.now()
    }
  ],
  hotPlug: {
    available: false,
    reason: 'No real OS hot-plug watcher is implemented yet.'
  }
}
