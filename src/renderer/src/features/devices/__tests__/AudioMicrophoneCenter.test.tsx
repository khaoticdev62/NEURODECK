import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeviceInventoryReport, NdxBridge } from '@shared/contracts'
import { AudioMicrophoneCenter } from '../AudioMicrophoneCenter'

class FakeTrack {
  stop = vi.fn()
}

class FakeMediaStream {
  getTracks = vi.fn(() => [new FakeTrack()])
}

class FakeAnalyserNode {
  fftSize = 2048
  frequencyBinCount = 1024
  getByteFrequencyData = vi.fn()
}

class FakeAudioContext {
  state = 'running'
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }))
  createAnalyser = vi.fn(() => new FakeAnalyserNode())
  close = vi.fn().mockResolvedValue(undefined)
}

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    voice: {
      getMicrophoneStatus: vi.fn().mockResolvedValue({ ok: true, data: 'not-determined' })
    },
    ...partial
  } as NdxBridge
}

function renderAudio(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AudioMicrophoneCenter />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(new FakeMediaStream()) }
  })
  // jsdom doesn't implement canvas 2D rendering — a real browser/Electron
  // always does, so this is a test-environment stub, not app behavior.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: ''
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
  vi.restoreAllMocks()
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

  it('shows the real microphone permission status and lets the user grant it', async () => {
    const setMicrophoneGranted = vi.fn().mockResolvedValue({ ok: true, data: 'granted' })
    stubBridge({
      devices: { inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport }) } as never,
      voice: {
        getMicrophoneStatus: vi.fn().mockResolvedValue({ ok: true, data: 'not-determined' }),
        setMicrophoneGranted
      } as never
    })
    const user = userEvent.setup()

    renderAudio()
    await screen.findByText('Audio and Microphone Center')
    expect(await screen.findByText('not-determined')).toBeInTheDocument()
    expect(
      screen.getByText('Grant microphone permission above to test capture.')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Grant microphone access' }))

    expect(setMicrophoneGranted).toHaveBeenCalledWith({ granted: true })
    expect(await screen.findByText('granted')).toBeInTheDocument()
  })

  it('starts and stops a real microphone capture once permission is granted', async () => {
    stubBridge({
      devices: { inventory: vi.fn().mockResolvedValue({ ok: true, data: sampleReport }) } as never,
      voice: {
        getMicrophoneStatus: vi.fn().mockResolvedValue({ ok: true, data: 'granted' })
      } as never
    })
    const user = userEvent.setup()

    renderAudio()
    await screen.findByText('Audio and Microphone Center')
    const startButton = await screen.findByRole('button', { name: 'Start calibration' })

    await user.click(startButton)

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(await screen.findByRole('button', { name: 'Stop' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(await screen.findByRole('button', { name: 'Start calibration' })).toBeInTheDocument()
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
