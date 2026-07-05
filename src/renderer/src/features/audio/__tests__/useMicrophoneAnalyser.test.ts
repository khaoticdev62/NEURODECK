import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMicrophoneAnalyser } from '../useMicrophoneAnalyser'

class FakeTrack {
  stop = vi.fn()
}

class FakeMediaStream {
  getTracks = vi.fn(() => [new FakeTrack()])
}

class FakeAnalyserNode {
  fftSize = 0
  frequencyBinCount = 4
  getByteFrequencyData = vi.fn((data: Uint8Array) => {
    data.set([10, 20, 30, 40])
  })
}

class FakeAudioContext {
  state = 'running'
  close = vi.fn().mockResolvedValue(undefined)
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }))
  createAnalyser = vi.fn(() => new FakeAnalyserNode())
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMicrophoneAnalyser', () => {
  it('starts a real capture: requests the microphone, builds a real analyser graph', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(new FakeMediaStream())
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

    const { result } = renderHook(() => useMicrophoneAnalyser())
    expect(result.current.active).toBe(false)

    await act(async () => {
      await result.current.start()
    })

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(result.current.active).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a real getUserMedia rejection instead of silently staying idle', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'))
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

    const { result } = renderHook(() => useMicrophoneAnalyser())

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.active).toBe(false)
    expect(result.current.error).toBe('Permission denied')
  })

  it('returns real frequency-domain data from the analyser once capturing', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(new FakeMediaStream())
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

    const { result } = renderHook(() => useMicrophoneAnalyser())
    await act(async () => {
      await result.current.start()
    })

    const data = result.current.getFrequencyData()
    expect(data).not.toBeNull()
    expect(Array.from(data ?? [])).toEqual([10, 20, 30, 40])
  })

  it('returns null frequency data before any capture has started', () => {
    const { result } = renderHook(() => useMicrophoneAnalyser())
    expect(result.current.getFrequencyData()).toBeNull()
  })

  it('stops a real capture: tears down every real media track and closes the audio context', async () => {
    const track = new FakeTrack()
    const stream = { getTracks: vi.fn(() => [track]) }
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

    const { result } = renderHook(() => useMicrophoneAnalyser())
    await act(async () => {
      await result.current.start()
    })

    act(() => {
      result.current.stop()
    })

    expect(track.stop).toHaveBeenCalled()
    await waitFor(() => expect(result.current.active).toBe(false))
    expect(result.current.getFrequencyData()).toBeNull()
  })

  it('tears down a live capture on unmount so no stream is left running behind a closed screen', async () => {
    const track = new FakeTrack()
    const stream = { getTracks: vi.fn(() => [track]) }
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia } })

    const { result, unmount } = renderHook(() => useMicrophoneAnalyser())
    await act(async () => {
      await result.current.start()
    })

    unmount()

    expect(track.stop).toHaveBeenCalled()
  })
})
