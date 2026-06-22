import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, TerminalExitEvent } from '@shared/contracts'
import { AiSafetyProvider } from '../../../ai-safety/AiSafetyProvider'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { UniversalTerminal } from '../UniversalTerminal'

vi.mock('../TerminalViewport', () => ({
  TerminalViewport: ({ session }: { session: { id: string } }) => (
    <div>Terminal viewport {session.id}</div>
  )
}))

const workspace = {
  id: 'w1',
  name: 'project',
  rootPath: '/workspace/project',
  createdAt: 1
}

function workspaceValue(active: boolean): WorkspaceContextValue {
  return {
    workspaces: active ? [workspace] : [],
    activeWorkspaceId: active ? workspace.id : null,
    activeWorkspace: active ? workspace : null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }
}

function renderTerminal(active = true): ReturnType<typeof render> {
  return render(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <AiSafetyProvider>
          <WorkspaceContext.Provider value={workspaceValue(active)}>
            <UniversalTerminal />
          </WorkspaceContext.Provider>
        </AiSafetyProvider>
      </FocusEngineProvider>
    </ToastProvider>
  )
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload injects
  delete window.ndx
})

describe('UniversalTerminal', () => {
  it('requires an active workspace', () => {
    renderTerminal(false)
    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('creates, selects, and terminates a real terminal session', async () => {
    let exitListener: ((event: TerminalExitEvent) => void) | undefined
    const session = {
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: 'w1',
      shell: 'bash',
      cwd: '/workspace/project',
      pid: 123,
      cols: 100,
      rows: 30,
      createdAt: 1,
      status: 'running' as const,
      exitCode: null
    }
    const create = vi.fn().mockResolvedValue({ ok: true, data: session })
    const terminate = vi.fn().mockResolvedValue({ ok: true, data: null })
    window.ndx = {
      git: {
        status: vi.fn().mockResolvedValue({
          ok: true,
          data: { isRepository: true, branch: 'main', ahead: 0, behind: 0, changes: [] }
        })
      } as never,
      terminal: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create,
        terminate,
        onExit: vi.fn((listener) => {
          exitListener = listener
          return vi.fn()
        })
      } as never
    } as Partial<NdxBridge> as NdxBridge

    const user = userEvent.setup()
    renderTerminal()
    await screen.findByText('No terminal sessions')
    expect(screen.getByText('Branch main')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ New session' }))

    expect(create).toHaveBeenCalledWith({ workspaceId: 'w1', cols: 100, rows: 30 })
    expect(await screen.findByText(`Terminal viewport ${session.id}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terminate' }))
    expect(terminate).not.toHaveBeenCalled()
    expect(
      screen.getByText('Running foreground processes in this terminal will be stopped.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terminate session' }))
    expect(terminate).toHaveBeenCalledWith({ sessionId: session.id })

    act(() => {
      exitListener?.({ session: { ...session, status: 'exited', exitCode: 0 } })
    })
    expect(screen.getByText('Exited 0')).toBeInTheDocument()
  })
})
