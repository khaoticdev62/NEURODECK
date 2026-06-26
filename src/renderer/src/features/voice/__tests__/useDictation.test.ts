import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDictation } from '../useDictation'

afterEach(() => {
  vi.unstubAllGlobals()
})

class FakeSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => {
    this.onend?.()
  })
}

function stubRecognition(): { getInstance: () => FakeSpeechRecognition } {
  let instance: FakeSpeechRecognition | undefined
  vi.stubGlobal(
    'webkitSpeechRecognition',
    class {
      constructor() {
        instance = new FakeSpeechRecognition()
        return instance
      }
    }
  )
  return {
    getInstance: () => {
      if (!instance) throw new Error('Recognition was never constructed.')
      return instance
    }
  }
}

describe('useDictation', () => {
  it('reports unavailable when no SpeechRecognition constructor exists', () => {
    const { result } = renderHook(() => useDictation())
    expect(result.current.available).toBe(false)
  })

  it('start() creates a real recognition session and begins listening', () => {
    stubRecognition()
    const { result } = renderHook(() => useDictation())

    expect(result.current.available).toBe(true)
    act(() => result.current.start())

    expect(result.current.listening).toBe(true)
  })

  it('produces a real transcript and real alternatives from a recognition result', () => {
    const stub = stubRecognition()
    const { result } = renderHook(() => useDictation())
    act(() => result.current.start())

    act(() => {
      const fakeResult = Object.assign(
        [
          { transcript: 'turn on the lights', confidence: 0.92 },
          { transcript: 'turn on the light', confidence: 0.61 }
        ],
        { isFinal: true }
      )
      stub.getInstance().onresult?.({ results: [fakeResult] })
    })

    expect(result.current.transcript).toBe('turn on the lights')
    expect(result.current.alternatives).toEqual([
      { transcript: 'turn on the light', confidence: 0.61 }
    ])
  })

  it('cancel() stops listening and discards the transcript so far', () => {
    const stub = stubRecognition()
    const { result } = renderHook(() => useDictation())
    act(() => result.current.start())
    act(() => {
      const fakeResult = Object.assign([{ transcript: 'hello', confidence: 0.9 }], {
        isFinal: true
      })
      stub.getInstance().onresult?.({ results: [fakeResult] })
    })

    act(() => result.current.cancel())

    expect(result.current.listening).toBe(false)
    expect(result.current.transcript).toBe('')
  })

  it('stop() stops listening without discarding the transcript', () => {
    const stub = stubRecognition()
    const { result } = renderHook(() => useDictation())
    act(() => result.current.start())
    act(() => {
      const fakeResult = Object.assign([{ transcript: 'hello', confidence: 0.9 }], {
        isFinal: true
      })
      stub.getInstance().onresult?.({ results: [fakeResult] })
    })
    act(() => result.current.stop())

    expect(result.current.listening).toBe(false)
    expect(result.current.transcript).toBe('hello')
  })

  it('start() is a no-op while already listening', () => {
    const stub = stubRecognition()
    const { result } = renderHook(() => useDictation())
    act(() => result.current.start())
    act(() => result.current.start())

    expect(stub.getInstance().start).toHaveBeenCalledTimes(1)
  })

  it('reports a real error from the recognition engine and stops listening', () => {
    const stub = stubRecognition()
    const { result } = renderHook(() => useDictation())
    act(() => result.current.start())

    act(() => stub.getInstance().onerror?.({ error: 'not-allowed' }))

    expect(result.current.error).toBe('not-allowed')
    expect(result.current.listening).toBe(false)
  })
})
