import { Blob } from 'node:buffer'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { RecordingProvider } from '../recording'
import { useRecording } from '../useRecording'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

class FakeTrack {
  stop = vi.fn()
}

class FakeMediaStream {
  private videoTracks = [new FakeTrack()]
  private audioTracks: FakeTrack[]
  constructor(audioTracks: FakeTrack[] = []) {
    this.audioTracks = audioTracks
  }
  getVideoTracks(): FakeTrack[] {
    return this.videoTracks
  }
  getAudioTracks(): FakeTrack[] {
    return this.audioTracks
  }
  getTracks(): FakeTrack[] {
    return [...this.videoTracks, ...this.audioTracks]
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
  stop = vi.fn(() => {
    this.emit('stop', { data: new Blob([]) })
  })
  addEventListener(type: string, listener: (event: { data: Blob }) => void): void {
    const existing = this.listeners.get(type) ?? []
    existing.push(listener)
    this.listeners.set(type, existing)
  }
  emit(type: string, event: { data: Blob }): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

function ProbeButton(): React.JSX.Element {
  const { isRecording, startRecording, stopRecording } = useRecording()
  return (
    <div>
      <p data-testid="status">{isRecording ? 'recording' : 'idle'}</p>
      <button
        type="button"
        onClick={() =>
          void startRecording({
            sourceId: 'screen:0',
            includesMicrophone: false,
            resolution: '1080p',
            frameRate: 30
          })
        }
      >
        Start
      </button>
      <button type="button" onClick={() => void stopRecording()}>
        Stop
      </button>
    </div>
  )
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

describe('RecordingProvider', () => {
  it('starts a real recording session and sends each chunk to the main process as it arrives', async () => {
    const begin = vi.fn().mockResolvedValue({ ok: true, data: { recordingId: 'rec-1' } })
    const appendChunk = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({ recording: { begin, appendChunk } as never })
    const user = userEvent.setup()

    render(
      <RecordingProvider>
        <ProbeButton />
      </RecordingProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(begin).toHaveBeenCalledWith({
      sourceId: 'screen:0',
      includesMicrophone: false,
      resolution: '1080p',
      frameRate: 30
    })
    expect(await screen.findByText('recording')).toBeInTheDocument()

    const recorder = FakeMediaRecorder.instances[0]
    recorder.emit('dataavailable', { data: new Blob([new Uint8Array([1, 2, 3])]) })

    await vi.waitFor(() => expect(appendChunk).toHaveBeenCalled())
    expect(appendChunk.mock.calls[0][0].recordingId).toBe('rec-1')
  })

  it('stops a real session, finishes it through the IPC client, and stops every real media track', async () => {
    const begin = vi.fn().mockResolvedValue({ ok: true, data: { recordingId: 'rec-1' } })
    const appendChunk = vi.fn().mockResolvedValue({ ok: true, data: null })
    const finish = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 'rec-1',
        path: '/tmp/rec-1.webm',
        startedAt: Date.now(),
        completedAt: Date.now(),
        bytes: 1024,
        includesMicrophone: false,
        resolution: '1080p',
        frameRate: 30
      }
    })
    stubBridge({ recording: { begin, appendChunk, finish } as never })
    const user = userEvent.setup()

    render(
      <RecordingProvider>
        <ProbeButton />
      </RecordingProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await screen.findByText('recording')

    await user.click(screen.getByRole('button', { name: 'Stop' }))

    expect(finish).toHaveBeenCalledWith({ recordingId: 'rec-1' })
    expect(await screen.findByText('idle')).toBeInTheDocument()
  })
})
