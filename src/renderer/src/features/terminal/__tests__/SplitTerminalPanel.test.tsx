import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { ToastProvider } from '../../../components/overlays/Toast'
import { SplitTerminalPanel } from '../SplitTerminalPanel'

vi.mock('../TerminalViewport', () => ({
  TerminalViewport: ({ session }: { session: { id: string } }) => (
    <div>Terminal viewport {session.id}</div>
  )
}))

const workspace = { id: 'w1', name: 'project', rootPath: '/workspace/project', createdAt: 1 }

function renderPanel(): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <SplitTerminalPanel workspace={workspace} />
      </FocusEngineProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('SplitTerminalPanel', () => {
  it('loads existing sessions into both panes by default', async () => {
    const sessionA = { id: 's1', workspaceId: 'w1', shell: 'bash', status: 'running' as const }
    const sessionB = { id: 's2', workspaceId: 'w1', shell: 'zsh', status: 'running' as const }
    window.ndx = {
      terminal: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [sessionA, sessionB] }),
        onExit: vi.fn(() => vi.fn())
      } as never
    } as Partial<NdxBridge> as NdxBridge

    renderPanel()

    expect(await screen.findByText('Terminal viewport s1')).toBeInTheDocument()
    expect(await screen.findByText('Terminal viewport s2')).toBeInTheDocument()
  })

  it('creates a new session into the requested pane via real IPC', async () => {
    const created = { id: 's3', workspaceId: 'w1', shell: 'bash', status: 'running' as const }
    const create = vi.fn().mockResolvedValue({ ok: true, data: created })
    window.ndx = {
      terminal: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create,
        onExit: vi.fn(() => vi.fn())
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const user = userEvent.setup()
    renderPanel()
    await screen.findByText('No session selected for Pane A.')

    const newButtons = screen.getAllByRole('button', { name: '+ New' })
    await user.click(newButtons[0])

    expect(create).toHaveBeenCalledWith({ workspaceId: 'w1', cols: 100, rows: 30 })
    expect(await screen.findByText('Terminal viewport s3')).toBeInTheDocument()
  })
})
