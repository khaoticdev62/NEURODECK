import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, RecordingSource } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { DisplaySettingsProvider } from '../../../state/displaySettings'
import { PresentationModeProvider } from '../../../state/presentationMode'
import { RecordingProvider } from '../../../state/recording'
import { RecordingCenter } from '../RecordingCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

function testBlob(bytes: Uint8Array = new Uint8Array()): Blob {
  return {
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    size: bytes.byteLength,
    type: 'video/webm'
  } as Blob
}

class FakeTrack {
  stop = vi.fn()
}

class FakeMediaStream {
  getVideoTracks(): FakeTrack[] {
    return [new FakeTrack()]
  }
  getAudioTracks(): FakeTrack[] {
    return []
  }
  getTracks(): FakeTrack[] {
    return [new FakeTrack()]
  }
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  listeners = new Map<string, ((event: { data: Blob }) => void)[]>()
  constructor(
    public stream: unknown,
    public options: unknown
  ) {
    FakeMediaRecorder.instances.push(this)
  }
  start = vi.fn()
  stop = vi.fn(() => this.emit('stop', { data: testBlob() }))
  addEventListener(type: string, listener: (event: { data: Blob }) => void): void {
    const existing = this.listeners.get(type) ?? []
    existing.push(listener)
    this.listeners.set(type, existing)
  }
  emit(type: string, event: { data: Blob }): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

function renderCenter(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <DisplaySettingsProvider>
        <PresentationModeProvider>
          <RecordingProvider>
            <MemoryRouter>
              <RecordingCenter />
            </MemoryRouter>
          </RecordingProvider>
        </PresentationModeProvider>
      </DisplaySettingsProvider>
    </ToastProvider>
  )
}

const sampleSource: RecordingSource = {
  id: 'screen:0',
  name: 'Entire screen',
  type: 'screen',
  thumbnailDataUrl: 'data:image/png;base64,'
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
  FakeMediaRecorder.instances = []
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(new FakeMediaStream()) }
  })
})

describe('RecordingCenter', () => {
  it('lists real capture sources from the main process', async () => {
    stubBridge({
      recording: {
        listSources: vi.fn().mockResolvedValue({ ok: true, data: [sampleSource] }),
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderCenter()

    expect(await screen.findByRole('button', { name: 'Entire screen' })).toBeInTheDocument()
  })

  it('starts a real recording after selecting a source', async () => {
    const begin = vi.fn().mockResolvedValue({ ok: true, data: { recordingId: 'rec-1' } })
    stubBridge({
      recording: {
        listSources: vi.fn().mockResolvedValue({ ok: true, data: [sampleSource] }),
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        begin
      } as never
    })
    const user = userEvent.setup()

    renderCenter()
    await user.click(await screen.findByRole('button', { name: 'Entire screen' }))
    await user.click(screen.getByRole('button', { name: 'Start recording' }))

    expect(begin).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'screen:0', resolution: '1080p', frameRate: 30 })
    )
    expect(await screen.findByText(/Recording…/)).toBeInTheDocument()
  })

  it('shows an empty state when no recordings have been saved yet', async () => {
    stubBridge({
      recording: {
        listSources: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderCenter()

    expect(await screen.findByText('No recordings yet')).toBeInTheDocument()
  })
})
