import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, RemoteHost, RemoteSession as RemoteSessionType } from '@shared/contracts'
import { RemoteSession } from '../RemoteSession'

vi.mock('../RemoteSessionViewport', () => ({
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

function renderRoute(initialEntry = '/remote/host-1'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/remote/:hostId" element={<RemoteSession />} />
        <Route path="/remote" element={<p>Remote list</p>} />
      </Routes>
    </MemoryRouter>
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

describe('RemoteSession', () => {
  it('creates a real remote session for the selected host', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: sampleSession })
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] }) } as never,
      remoteSessions: { create } as never
    })

    renderRoute()

    expect(await screen.findByText('Viewport for Homelab')).toBeInTheDocument()
    expect(screen.getByText(/Remote session · deck@192\.168\.1\.10/)).toBeInTheDocument()
    expect(create).toHaveBeenCalledWith({ hostId: 'host-1', cols: 100, rows: 30 })
  })

  it('disconnects the session and returns to the remote list', async () => {
    const terminate = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [sampleHost] }) } as never,
      remoteSessions: {
        create: vi.fn().mockResolvedValue({ ok: true, data: sampleSession }),
        terminate
      } as never
    })

    const user = userEvent.setup()
    renderRoute()
    await screen.findByText('Viewport for Homelab')

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(terminate).toHaveBeenCalledWith({ sessionId: 'session-1' })
    expect(await screen.findByText('Remote list')).toBeInTheDocument()
  })

  it('shows an honest missing-host state', async () => {
    stubBridge({
      remoteHosts: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })

    renderRoute()

    expect(await screen.findByText('Host not found')).toBeInTheDocument()
  })
})
