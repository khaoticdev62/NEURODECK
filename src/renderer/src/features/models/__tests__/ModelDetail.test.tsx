import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/testUtils'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelProvider, NdxBridge } from '@shared/contracts'
import { ModelDetail } from '../ModelDetail'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(providerId = 'p1'): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <Routes>
      <Route path="/models/:providerId" element={<ModelDetail />} />
    </Routes>,
    { initialEntries: [`/models/${providerId}`] }
  )
}

const sampleProvider: ModelProvider = {
  id: 'p1',
  name: 'Local Ollama',
  kind: 'local-openai-compatible',
  baseUrl: 'http://localhost:11434/v1',
  hasApiKey: false,
  enabled: true,
  createdAt: Date.now()
}

describe('ModelDetail', () => {
  it('shows a real error state when the provider no longer exists', async () => {
    stubBridge({
      modelProviders: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    renderScreen()
    expect(await screen.findByText('Provider not found')).toBeInTheDocument()
  })

  it('shows the real provider overview', async () => {
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleProvider] })
      } as never
    })
    renderScreen()

    expect(await screen.findByText('Local Ollama')).toBeInTheDocument()
    expect(screen.getByText(/No API key configured/)).toBeInTheDocument()
  })

  it('runs a real connection test and shows real discovered models', async () => {
    const testConnection = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        message: 'Connected. 1 model reported.',
        models: [{ id: 'llama3:8b', ownedBy: 'ollama' }]
      }
    })
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleProvider] }),
        testConnection
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Local Ollama')

    await user.click(screen.getByRole('button', { name: 'Probe provider' }))

    expect(testConnection).toHaveBeenCalledWith({ providerId: 'p1' })
    expect(await screen.findByText('Connected. 1 model reported.')).toBeInTheDocument()
    expect(screen.getByText(/llama3:8b/)).toBeInTheDocument()
  })
})
