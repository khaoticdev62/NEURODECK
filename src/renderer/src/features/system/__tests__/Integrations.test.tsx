import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelProvider, NdxBridge, RemoteHost } from '@shared/contracts'
import { Integrations } from '../Integrations'
import { renderWithProviders } from '../../../__tests__/testUtils'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = {
    workspaces: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    system: {
      checkFeatureAvailability: vi.fn().mockResolvedValue({ ok: true, data: { isAvailable: false } })
    },
    decky: {
      getStatus: vi.fn().mockResolvedValue({ ok: true, data: { available: true } })
    },
    ...partial
  } as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleProvider: ModelProvider = {
  id: 'openai',
  name: 'OpenAI',
  kind: 'cloud-openai-compatible',
  baseUrl: 'https://api.openai.com',
  hasApiKey: true,
  enabled: true,
  createdAt: 1
}

const sampleHost: RemoteHost = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Lab box',
  hostname: 'lab.local',
  port: 22,
  username: 'deck',
  authMethod: 'password',
  hasSecret: true,
  trustedFingerprint: null,
  trustedAt: null,
  createdAt: 1
}

describe('Integrations', () => {
  it('renders model providers and remote hosts from the real bridge', async () => {
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleProvider] })
      } as never,
      remoteHosts: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] })
      } as never,
      system: {
        checkFeatureAvailability: vi.fn().mockResolvedValue({ ok: true, data: { isAvailable: false } })
      } as never,
      decky: {
        getStatus: vi.fn().mockResolvedValue({ ok: true, data: { available: true } })
      } as never
    })

    renderWithProviders(<Integrations />)

    expect(await screen.findByText('Integrations')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('cloud-openai-compatible')).toBeInTheDocument()
    expect(screen.getByText('Lab box')).toBeInTheDocument()
    expect(screen.getByText('lab.local:22')).toBeInTheDocument()
  })

  it('shows unsupported categories with honest reasons', async () => {
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never,
      remoteHosts: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderWithProviders(<Integrations />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'No native Steam Deck input driver is implemented yet — a documented platform gap.'
        )
      ).toBeInTheDocument()
    })
    expect(screen.getByText('No cloud-storage adapter exists yet.')).toBeInTheDocument()
  })

  it('shows an error card when the model provider list fails', async () => {
    stubBridge({
      modelProviders: {
        list: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'model-list-failed',
            userMessage: 'Providers could not be loaded.',
            message: 'x',
            category: 'system'
          }
        })
      } as never,
      remoteHosts: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderWithProviders(<Integrations />)

    expect(await screen.findByText('Model providers unavailable')).toBeInTheDocument()
    expect(screen.getByText('Providers could not be loaded.')).toBeInTheDocument()
  })
})
