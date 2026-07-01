import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, RemoteHost } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { RemoteSystems } from '../RemoteSystems'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderScreen(): ReturnType<typeof render> {
  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <MemoryRouter>
        <RemoteSystems />
      </MemoryRouter>
    </FocusEngineProvider>
  )
}

const sampleHost: RemoteHost = {
  id: 'host-1',
  name: 'Homelab',
  hostname: '192.168.1.10',
  port: 22,
  username: 'deck',
  authMethod: 'password',
  hasSecret: true,
  createdAt: 1,
  trustedFingerprint: 'SHA256:known',
  trustedAt: 3
}

describe('RemoteSystems', () => {
  it('shows an honest empty state when no hosts exist', async () => {
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    renderScreen()

    expect(await screen.findByText('No remote hosts')).toBeInTheDocument()
  })

  it('lists remote hosts and tests reachability through IPC', async () => {
    const testConnection = vi.fn().mockResolvedValue({
      ok: true,
      data: { reachable: true, latencyMs: 42, fingerprint: 'SHA256:known', newlyTrusted: false }
    })
    stubBridge({
      remoteHosts: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] }),
        testConnection
      } as never
    })

    const user = userEvent.setup()
    renderScreen()

    expect(await screen.findByText('Homelab')).toBeInTheDocument()
    expect(screen.getByText(/deck@192\.168\.1\.10:22/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(testConnection).toHaveBeenCalledWith({ hostId: 'host-1' })
    expect(await screen.findByText('Reachable - 42ms')).toBeInTheDocument()
  })

  it('adds a password host through the typed bridge and refreshes the list', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [sampleHost] })
    const add = vi.fn().mockResolvedValue({ ok: true, data: sampleHost })
    stubBridge({
      remoteHosts: { list, add } as never
    })

    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('No remote hosts')

    await user.click(screen.getByRole('button', { name: 'Add host' }))
    await user.type(screen.getByPlaceholderText('Hostname or IP'), '192.168.1.10')
    await user.type(screen.getByPlaceholderText('Username'), 'deck')
    await user.type(screen.getByPlaceholderText('Password (stored encrypted)'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Add host' }))

    expect(add).toHaveBeenCalledWith({
      name: '192.168.1.10',
      hostname: '192.168.1.10',
      port: 22,
      username: 'deck',
      authMethod: 'password',
      secret: 'secret',
      privateKeyPath: undefined
    })
    expect(await screen.findByText('Homelab')).toBeInTheDocument()
  })
})
