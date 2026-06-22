import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserTab, NdxBridge } from '@shared/contracts'
import { BrowserView } from '../BrowserView'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(tabId = 't1'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/browser/${tabId}`]}>
      <Routes>
        <Route path="/browser/:tabId" element={<BrowserView />} />
      </Routes>
    </MemoryRouter>
  )
}

const sampleTab: BrowserTab = {
  id: 't1',
  workspaceId: 'w1',
  url: 'https://example.com',
  title: 'Example',
  loading: false,
  canGoBack: true,
  canGoForward: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

function bridgeWithDefaults(overrides: Partial<NdxBridge['browserTabs']> = {}): void {
  stubBridge({
    browserTabs: {
      setActive: vi.fn().mockResolvedValue({ ok: true, data: sampleTab }),
      setBounds: vi.fn().mockResolvedValue({ ok: true, data: null }),
      onUpdate: vi.fn().mockReturnValue(() => undefined),
      ...overrides
    } as never
  })
}

describe('BrowserView', () => {
  it('activates the real tab and shows its real address/back-forward state', async () => {
    bridgeWithDefaults()
    renderScreen()

    expect(await screen.findByDisplayValue('https://example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
  })

  it('shows a real error state when activation fails', async () => {
    bridgeWithDefaults({
      setActive: vi.fn().mockResolvedValue({
        ok: false,
        error: { category: 'not-found', code: 'x', userMessage: 'Gone.' }
      })
    })
    renderScreen()

    expect(await screen.findByText('Tab not found')).toBeInTheDocument()
  })

  it('navigates via the real address bar on Enter', async () => {
    const navigate = vi.fn().mockResolvedValue({ ok: true, data: null })
    bridgeWithDefaults({ navigate })

    const user = userEvent.setup()
    renderScreen()
    const input = await screen.findByDisplayValue('https://example.com')

    await user.clear(input)
    await user.type(input, 'https://other.example{Enter}')

    expect(navigate).toHaveBeenCalledWith({ tabId: 't1', url: 'https://other.example' })
  })

  it('calls real back/forward/reload IPC', async () => {
    const goBack = vi.fn().mockResolvedValue({ ok: true, data: null })
    const reload = vi.fn().mockResolvedValue({ ok: true, data: null })
    bridgeWithDefaults({ goBack, reload })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByDisplayValue('https://example.com')

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Reload' }))

    expect(goBack).toHaveBeenCalledWith({ tabId: 't1' })
    expect(reload).toHaveBeenCalledWith({ tabId: 't1' })
  })
})
