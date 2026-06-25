import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, RemoteHost, RemoteSession as RemoteSessionType } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToastProvider } from '../../../components/overlays/Toast'
import { RemoteModePanel } from '../RemoteModePanel'

vi.mock('../../remote/RemoteSessionViewport', () => ({
  RemoteSessionViewport: ({ session }: { session: RemoteSessionType }) => (
    <p>Viewport for {session.hostLabel}</p>
  )
}))

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function renderPanel(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <MemoryRouter>
          <RemoteModePanel />
        </MemoryRouter>
      </FocusEngineProvider>
    </ToastProvider>
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
  trustedFingerprint: 'SHA256:known',
  trustedAt: 1,
  createdAt: 1
}

const sampleSession: RemoteSessionType = {
  id: 'session-1',
  hostId: 'host-1',
  hostLabel: 'Homelab',
  status: 'running',
  cols: 100,
  rows: 30,
  createdAt: 10,
  exitCode: null,
  errorMessage: null
}

describe('RemoteModePanel', () => {
  it('shows an empty state with no hosts configured', async () => {
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    renderPanel()

    expect(await screen.findByText('No remote hosts')).toBeInTheDocument()
  })

  it('connects to a real selected host and renders the connected viewport', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: sampleSession })
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] }) } as never,
      remoteSessions: { create } as never
    })

    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: /Homelab/ }))

    expect(create).toHaveBeenCalledWith({ hostId: 'host-1', cols: 100, rows: 30 })
    expect(await screen.findByText('Viewport for Homelab')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('disconnects a real session via IPC', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: sampleSession })
    const terminate = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] }) } as never,
      remoteSessions: { create, terminate } as never
    })

    const user = userEvent.setup()
    renderPanel()
    await user.click(await screen.findByRole('button', { name: /Homelab/ }))
    await screen.findByText('Viewport for Homelab')

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(terminate).toHaveBeenCalledWith({ sessionId: 'session-1' })
    expect(await screen.findByRole('button', { name: /Homelab/ })).toBeInTheDocument()
  })
})
