import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTextToSpeech } from '../useTextToSpeech'

afterEach(() => {
  vi.unstubAllGlobals()
})

class FakeUtterance {
  text: string
  constructor(text: string) {
    this.text = text
  }
}

describe('useTextToSpeech', () => {
  it('reports available and speaks real text through window.speechSynthesis', () => {
    const speak = vi.fn()
    const cancel = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel })
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)

    const { result } = renderHook(() => useTextToSpeech())
    expect(result.current.available).toBe(true)

    result.current.speak('Hello world')

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(speak).toHaveBeenCalledTimes(1)
    expect(speak.mock.calls[0][0]).toBeInstanceOf(FakeUtterance)
  })

  it('does not speak empty or whitespace-only text', () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)

    const { result } = renderHook(() => useTextToSpeech())
    result.current.speak('   ')

    expect(speak).not.toHaveBeenCalled()
  })

  it('reports unavailable when the browser has no speech synthesis engine', () => {
    vi.stubGlobal('speechSynthesis', undefined)

    const { result } = renderHook(() => useTextToSpeech())

    expect(result.current.available).toBe(false)
  })

  it('cancel() is a no-op when unavailable rather than throwing', () => {
    vi.stubGlobal('speechSynthesis', undefined)

    const { result } = renderHook(() => useTextToSpeech())
    expect(() => result.current.cancel()).not.toThrow()
  })
})
