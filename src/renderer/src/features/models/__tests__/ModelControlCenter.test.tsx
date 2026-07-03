import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelProvider, NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { ModelControlCenter } from '../ModelControlCenter'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(<ModelControlCenter />)
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

describe('ModelControlCenter', () => {
  it('shows the real empty state when no providers are connected', async () => {
    stubBridge({
      modelProviders: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    renderScreen()
    expect(await screen.findByText('No providers connected')).toBeInTheDocument()
  })

  it('lists a real provider', async () => {
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleProvider] })
      } as never
    })
    renderScreen()

    expect(await screen.findByText('Local Ollama')).toBeInTheDocument()
    expect(screen.getByText(/http:\/\/localhost:11434\/v1/)).toBeInTheDocument()
  })

  it('adds a provider via the real IPC call', async () => {
    const add = vi.fn().mockResolvedValue({ ok: true, data: sampleProvider })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [sampleProvider] })
    stubBridge({ modelProviders: { list, add } as never })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('No providers connected')

    await user.click(screen.getByRole('button', { name: 'Add provider' }))
    await user.type(screen.getByPlaceholderText('Provider name'), 'Local Ollama')
    await user.type(
      screen.getByPlaceholderText('Base URL (e.g. http://localhost:11434/v1)'),
      'http://localhost:11434/v1'
    )
    await user.click(screen.getByRole('button', { name: 'Add provider' }))

    expect(add).toHaveBeenCalledWith({
      name: 'Local Ollama',
      kind: 'local-openai-compatible',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: undefined
    })
    expect(await screen.findByText('Local Ollama')).toBeInTheDocument()
  })

  it('tests a real connection and shows the real result message', async () => {
    const testConnection = vi.fn().mockResolvedValue({
      ok: true,
      data: { ok: true, message: 'Connected. 2 models reported.', models: [] }
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

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(testConnection).toHaveBeenCalledWith({ providerId: 'p1' })
    expect(await screen.findByText('Connected. 2 models reported.')).toBeInTheDocument()
  })

  it('removes a provider via the real IPC call', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleProvider] }),
        remove
      } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Local Ollama')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(remove).toHaveBeenCalledWith({ providerId: 'p1' })
    expect(await screen.findByText('No providers connected')).toBeInTheDocument()
  })
})
