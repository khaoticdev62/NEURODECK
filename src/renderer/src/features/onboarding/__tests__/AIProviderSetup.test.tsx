import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { renderWithProviders } from '../../../__tests__/testUtils'
import { AIProviderSetup } from '../AIProviderSetup'
import { WorkspaceDiscovery } from '../WorkspaceDiscovery'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return renderWithProviders(
    <Routes>
      <Route path="/onboarding/providers" element={<AIProviderSetup />} />
      <Route path="/onboarding/workspaces" element={<WorkspaceDiscovery />} />
    </Routes>,
    { initialEntries: ['/onboarding/providers'] }
  )
}

function makeBridge(
  options: { providers?: { id: string; kind: string; name: string }[] } = {}
): Partial<NdxBridge> {
  return {
    modelProviders: {
      list: vi.fn().mockResolvedValue({ ok: true, data: options.providers ?? [] }),
      add: vi.fn().mockResolvedValue({ ok: true, data: { id: 'p1', name: 'Test' } })
    } as never,
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      discover: vi.fn().mockResolvedValue({ ok: true, data: [] })
    } as never
  }
}

describe('AIProviderSetup', () => {
  it('renders all provider categories', () => {
    stubBridge(makeBridge())
    renderScreen()
    expect(screen.getByText('Local runtime')).toBeInTheDocument()
    expect(screen.getByText('OpenAI-compatible provider')).toBeInTheDocument()
    expect(screen.getByText('Cloud coding model')).toBeInTheDocument()
    expect(screen.getByText('Speech provider')).toBeInTheDocument()
    expect(screen.getByText('Vision provider')).toBeInTheDocument()
    expect(screen.getByText('Embedding provider')).toBeInTheDocument()
  })

  it('navigates to workspace discovery on Continue', async () => {
    stubBridge(makeBridge())
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText('Workspace Discovery')).toBeInTheDocument()
    })
  })

  it('navigates to workspace discovery on Skip for now', async () => {
    stubBridge(makeBridge())
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => {
      expect(screen.getByText('Workspace Discovery')).toBeInTheDocument()
    })
  })

  it('opens the configuration form for a supported category', async () => {
    stubBridge(makeBridge())
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Configure Local runtime' }))

    expect(screen.getByPlaceholderText('Provider name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('http://localhost:11434/v1')).toBeInTheDocument()
  })

  it('saves a local provider and refreshes the list', async () => {
    const add = vi.fn().mockResolvedValue({ ok: true, data: { id: 'p1', name: 'Ollama' } })
    stubBridge({
      modelProviders: {
        list: vi
          .fn()
          .mockResolvedValueOnce({ ok: true, data: [] })
          .mockResolvedValueOnce({
            ok: true,
            data: [
              { id: 'p1', name: 'Ollama', kind: 'ollama', baseUrl: 'http://localhost:11434/v1' }
            ]
          }),
        add
      } as never,
      workspaces: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        discover: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Configure Local runtime' }))
    await user.type(
      screen.getByPlaceholderText('http://localhost:11434/v1'),
      'http://localhost:11434/v1'
    )
    await user.click(screen.getByRole('button', { name: 'Save provider' }))

    await waitFor(() => {
      expect(add).toHaveBeenCalled()
    })
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ollama',
        baseUrl: 'http://localhost:11434/v1'
      })
    )
  })

  it('shows an explanation dialog for a category', async () => {
    stubBridge(makeBridge())
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Explain Local runtime' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Local runtime' })).toBeInTheDocument()
  })

  it('disables Configure for unsupported categories', () => {
    stubBridge(makeBridge())
    renderScreen()

    const configures = screen.getAllByRole('button', { name: /^Configure/ })
    // The first three categories are supported; the last three are not.
    expect(configures[3]).toBeDisabled()
    expect(configures[4]).toBeDisabled()
    expect(configures[5]).toBeDisabled()
  })
})
