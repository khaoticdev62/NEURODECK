import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ModelRouteDecision, NdxBridge } from '@shared/contracts'
import { RoutingProfiles } from '../RoutingProfiles'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const decision: ModelRouteDecision = {
  providerId: 'provider-1',
  providerName: 'Local Ollama',
  modelId: 'llama3.1',
  local: true,
  profileId: 'balanced',
  reasons: ['Local endpoint reachable'],
  measured: {
    memoryUsedPercent: 42.2,
    batteryPercent: 81,
    temperatureCelsius: 55.4
  }
}

describe('RoutingProfiles', () => {
  it('previews a route through the real typed IPC client', async () => {
    const route = vi.fn().mockResolvedValue({ ok: true, data: decision })
    stubBridge({ modelProviders: { route } as never })

    const user = userEvent.setup()
    render(<RoutingProfiles />)

    await user.click(screen.getByRole('button', { name: 'Preview route' }))

    expect(route).toHaveBeenCalledWith({
      profileId: 'balanced',
      workspacePrivate: false,
      temperature: 0.2,
      maxTokens: 2048
    })
    expect(await screen.findByText('llama3.1')).toBeInTheDocument()
    expect(screen.getByText('Local endpoint reachable')).toBeInTheDocument()
  })

  it('sets private workspace routing only for the private profile', async () => {
    const route = vi.fn().mockResolvedValue({ ok: true, data: decision })
    stubBridge({ modelProviders: { route } as never })

    const user = userEvent.setup()
    render(<RoutingProfiles />)

    await user.click(screen.getByRole('button', { name: /Private Workspace/ }))
    await user.click(screen.getByRole('button', { name: 'Preview route' }))

    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'private-workspace',
        workspacePrivate: true
      })
    )
  })

  it('shows the real model routing error', async () => {
    stubBridge({
      modelProviders: {
        route: vi.fn().mockResolvedValue({
          ok: false,
          error: { userMessage: 'No reachable model provider.' }
        })
      } as never
    })

    const user = userEvent.setup()
    render(<RoutingProfiles />)

    await user.click(screen.getByRole('button', { name: 'Preview route' }))

    expect(await screen.findByText('No route available')).toBeInTheDocument()
    expect(screen.getByText('No reachable model provider.')).toBeInTheDocument()
  })
})
