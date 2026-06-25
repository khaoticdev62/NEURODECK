import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ScreenNarrator } from '../ScreenNarrator'

function renderNarrator(
  adapter: TestAdapter,
  children: React.ReactNode
): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[adapter]}>
        {children}
        <ScreenNarrator />
      </FocusEngineProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ScreenNarrator', () => {
  it('reads the current screen heading and alert text on the real "narrate.screen" action', () => {
    const speak = vi.fn()
    const cancel = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string
        constructor(text: string) {
          this.text = text
        }
      }
    )

    const adapter = new TestAdapter()
    renderNarrator(
      adapter,
      <main>
        <h1>Git Control Center</h1>
        <div role="alert">Push failed: remote rejected.</div>
      </main>
    )

    act(() => adapter.inject('narrate.screen', 'press'))

    expect(cancel).toHaveBeenCalledOnce()
    expect(speak).toHaveBeenCalledOnce()
    const utterance = speak.mock.calls[0][0] as { text: string }
    expect(utterance.text).toBe('Git Control Center. Push failed: remote rejected.')
  })

  it('falls back to the document title when there is no heading or alert', () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string
        constructor(text: string) {
          this.text = text
        }
      }
    )
    document.title = 'NeuroDeck OS'

    const adapter = new TestAdapter()
    renderNarrator(adapter, <main />)

    act(() => adapter.inject('narrate.screen', 'press'))

    const utterance = speak.mock.calls[0][0] as { text: string }
    expect(utterance.text).toBe('NeuroDeck OS')
  })

  it('shows a real warning toast instead of crashing when speech synthesis is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined)

    const adapter = new TestAdapter()
    renderNarrator(adapter, <main />)

    act(() => adapter.inject('narrate.screen', 'press'))

    expect(screen.getByText('Screen narration unavailable')).toBeInTheDocument()
  })
})
